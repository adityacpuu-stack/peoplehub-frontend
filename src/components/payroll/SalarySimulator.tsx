import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import axios from 'axios';
import { t, useLocale, intlLocale } from '@/i18n';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import {
  payrollService, SIMULATION_PTKP, type SalarySimulationResult, type SimulationApplyReason, type SimulationSalaryStatus,
} from '@/services/payroll.service';
import './salary-simulator.css';

// Shared Target THP -> basic salary simulator (employee Add/Edit and Payroll).
// Read-only: the backend runs the real payroll engine; this component never
// saves. Any input change invalidates the shown result and disables Apply.

const MAX_TARGET = 2_000_000_000;
const MAX_ALLOWANCE = 1_000_000_000;
const ALLOWANCE_KEYS = ['position', 'transport', 'meal', 'other'] as const;
type AllowanceKey = (typeof ALLOWANCE_KEYS)[number];
const ALLOWANCE_LABELS: Record<AllowanceKey, string> = {
  position: 'Position allowance', transport: 'Transport allowance', meal: 'Meal allowance',
  other: 'Other recurring allowances',
};
const REASON_LABELS: Record<SimulationApplyReason, string> = {
  standalone: 'Simulation only. Nothing is applied or saved from Payroll.',
  not_exact: 'The target cannot be reached exactly, so the result cannot be applied.',
  policy_rules_apply: 'Company payroll rules or an employee payroll preparation apply in this period; actual payroll would use them, not this calculation.',
  rules_unreadable: 'Stored payroll rules or allowance sources could not be read; check them before applying.',
  allowances_not_registered: 'The simulated allowances are not the approved allowances payroll would pay. Register them in Allowances first, or simulate with the approved allowances.',
  sources_pending: 'An allowance version is still waiting for approval.',
};

export interface SalarySimulatorApply {
  basic_salary: number;
  salary_status: SimulationSalaryStatus;
  ptkp_status: string;
}

export interface SalarySimulatorProps {
  open: boolean;
  onClose: () => void;
  mode: 'employee_form' | 'standalone';
  companyId: number | null;
  companyName?: string;
  /** Payroll period (YYYY-MM) whose company/employee rules are checked. */
  period: string;
  /** Edit employee only; enables approved contract allowances. */
  employeeId?: number;
  initialSalaryStatus?: string;
  initialPtkpStatus?: string;
  /** Apply is offered only when the form currency is IDR. */
  currencyIsIdr?: boolean;
  onApply?: (value: SalarySimulatorApply) => void;
}

const money = (value: number) => new Intl.NumberFormat(intlLocale(), {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(value);

/** Whole rupiah from text: blank stays invalid (it is not 0). */
function parseMoney(raw: string, max: number): { value?: number; error?: string } {
  const trimmed = raw.trim();
  if (trimmed === '') return { error: 'Required. Enter 0 if none.' };
  // Plain digits, or digits grouped by thousands ("10.000.000"); never decimals.
  if (!/^\d+$/.test(trimmed) && !/^\d{1,3}([.,\s]\d{3})+$/.test(trimmed)) return { error: 'Enter whole rupiah (digits only).' };
  const value = Number(trimmed.replace(/[.,\s]/g, ''));
  if (!Number.isSafeInteger(value) || value > max) return { error: 'Amount is above the simulation limit.' };
  return { value };
}

const errorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown; error?: { message?: unknown } } | undefined;
    const message = typeof data?.message === 'string' ? data.message : typeof data?.error?.message === 'string' ? data.error.message : null;
    if (message) return message;
  }
  return 'Simulation failed. Check the inputs and try again.';
};

export function SalarySimulator({
  open, onClose, mode, companyId, companyName, period, employeeId, initialSalaryStatus, initialPtkpStatus,
  currencyIsIdr = true, onApply,
}: SalarySimulatorProps) {
  useLocale();
  const [target, setTarget] = useState('');
  const [salaryStatus, setSalaryStatus] = useState<SimulationSalaryStatus>('new_gross');
  const [ptkp, setPtkp] = useState('');
  const [source, setSource] = useState<'manual' | 'employee_contract'>('manual');
  const [allowances, setAllowances] = useState<Record<AllowanceKey, string>>({ position: '0', transport: '0', meal: '0', other: '0' });
  const [result, setResult] = useState<SalarySimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);

  /** Drops the shown result and any request still in flight (no late result, error or toast). */
  const invalidate = useCallback(() => {
    request.current++;
    controller.current?.abort();
    controller.current = null;
    setResult(null); setError(null); setLoading(false);
  }, []);

  // Closing (open=false) invalidates immediately, so a reopen can never render
  // a previous result, even for one frame. Opening starts from the caller's
  // current form values.
  useEffect(() => {
    invalidate();
    if (!open) return;
    setTouched(false);
    setSalaryStatus(initialSalaryStatus === 'existing' ? 'existing' : 'new_gross');
    setPtkp((SIMULATION_PTKP as readonly string[]).includes(initialPtkpStatus ?? '') ? initialPtkpStatus! : '');
    setSource(employeeId ? 'employee_contract' : 'manual');
  }, [open, initialSalaryStatus, initialPtkpStatus, employeeId, invalidate]);

  // A different company, period, mode or currency makes any result stale.
  useEffect(() => { invalidate(); }, [companyId, period, mode, currencyIsIdr, invalidate]);

  // Unmount: drop any in-flight response.
  useEffect(() => () => { request.current++; controller.current?.abort(); }, []);

  /** Close from any control: invalidate first, then let the caller hide the modal. */
  const close = () => { invalidate(); onClose(); };

  const targetCheck = parseMoney(target, MAX_TARGET);
  const allowanceChecks = Object.fromEntries(ALLOWANCE_KEYS.map(key => [key, parseMoney(allowances[key], MAX_ALLOWANCE)])) as Record<AllowanceKey, ReturnType<typeof parseMoney>>;
  const usesContract = source === 'employee_contract';
  const valid = targetCheck.value !== undefined && ptkp !== '' && companyId !== null
    && (usesContract || ALLOWANCE_KEYS.every(key => allowanceChecks[key].value !== undefined));

  const calculate = async () => {
    setTouched(true);
    if (!valid || companyId === null) return;
    const id = ++request.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await payrollService.simulateSalary({
        company_id: companyId, context: mode, period, ...(employeeId ? { employee_id: employeeId } : {}),
        target_thp: targetCheck.value!, ptkp_status: ptkp, salary_status: salaryStatus, allowance_source: source,
        allowances: {
          position: allowanceChecks.position.value ?? 0, transport: allowanceChecks.transport.value ?? 0,
          meal: allowanceChecks.meal.value ?? 0, other: allowanceChecks.other.value ?? 0,
        },
      }, abort.signal);
      if (id !== request.current) return; // superseded, edited, closed or unmounted
      setResult(data);
    } catch (caught) {
      if (id !== request.current || axios.isCancel(caught)) return;
      setError(errorMessage(caught));
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  const onEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); void calculate(); }
  };

  const canApply = mode === 'employee_form' && !!onApply && !!result && result.apply.allowed && currencyIsIdr;
  const apply = () => {
    if (!canApply || !result) return;
    onApply!({ basic_salary: result.basic_salary, salary_status: result.salary_status, ptkp_status: result.ptkp_status });
    close();
  };

  if (!open) return null;
  const b = result?.breakdown;
  const companyPays = b?.pph21_paid_by === 'company';
  const rate = (value: number) => `${(value * 100).toLocaleString(intlLocale(), { maximumFractionDigits: 2 })}%`;

  return (
    <Modal isOpen onClose={close} title={t('Salary simulation')} size="xl" className="salary-sim-dialog"
      description={t('Find the full-month basic salary that gives a target take-home pay, using the current payroll engine.')}>
      <div className="salary-sim" data-testid="salary-simulator">
        <div className="salary-sim-inputs" onKeyDown={onEnter}>
          <p className="salary-sim-scope" data-testid="salary-sim-scope">
            {companyName && <>{t('Company')}: <strong>{companyName}</strong> · </>}{t('Payroll period')}: <strong className="salary-sim-nowrap">{period}</strong>
          </p>
          <label className="salary-sim-target">
            <span>{t('Target take-home pay (THP) per month')}</span>
            <input inputMode="numeric" autoFocus value={target} aria-invalid={touched && !!targetCheck.error}
              aria-describedby="salary-sim-target-error" data-testid="salary-sim-target"
              onChange={event => { setTarget(event.target.value); invalidate(); }} placeholder="10000000" />
            {touched && targetCheck.error && <small id="salary-sim-target-error" className="salary-sim-error">{t(targetCheck.error)}</small>}
          </label>
          <div className="salary-sim-pair">
            <label>
              <span>{t('Payroll status')}</span>
              <select value={salaryStatus} data-testid="salary-sim-status"
                onChange={event => { setSalaryStatus(event.target.value as SimulationSalaryStatus); invalidate(); }}>
                <option value="new_gross">{t('New (Gross)')}</option>
                <option value="existing">{t('Existing (Gross-up)')}</option>
              </select>
              <small className="salary-sim-help" data-testid="salary-sim-status-help">{salaryStatus === 'existing'
                ? t('Company bears PPh21 and employee BPJS; take-home pay equals basic plus allowances.')
                : t('Employee pays PPh21 and employee BPJS from gross pay.')}</small>
            </label>
            <label>
              <span>{t('PTKP status')}</span>
              <select value={ptkp} aria-invalid={touched && ptkp === ''} data-testid="salary-sim-ptkp"
                onChange={event => { setPtkp(event.target.value); invalidate(); }}>
                <option value="">{t('Select PTKP')}</option>
                {SIMULATION_PTKP.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
              {touched && ptkp === '' && <small className="salary-sim-error">{t('Select a supported PTKP status.')}</small>}
            </label>
          </div>
          {employeeId !== undefined && <fieldset className="salary-sim-source">
            <legend>{t('Fixed monthly allowances')}</legend>
            <label><input type="radio" name="salary-sim-source" checked={usesContract} data-testid="salary-sim-source-contract"
              onChange={() => { setSource('employee_contract'); invalidate(); }} /> {t('Approved recurring allowances of this employee')}</label>
            <label><input type="radio" name="salary-sim-source" checked={!usesContract} data-testid="salary-sim-source-manual"
              onChange={() => { setSource('manual'); invalidate(); }} /> {t('Enter amounts to simulate')}</label>
          </fieldset>}
          {!usesContract && <div className="salary-sim-allowances">
            {employeeId === undefined && <p className="salary-sim-label">{t('Fixed monthly allowances')}</p>}
            {ALLOWANCE_KEYS.map(key => <label key={key}>
              <span>{t(ALLOWANCE_LABELS[key])}</span>
              <input inputMode="numeric" value={allowances[key]} aria-invalid={touched && !!allowanceChecks[key].error}
                data-testid={`salary-sim-allowance-${key}`}
                onChange={event => { setAllowances(current => ({ ...current, [key]: event.target.value })); invalidate(); }} />
              {touched && allowanceChecks[key].error && <small className="salary-sim-error">{t(allowanceChecks[key].error!)}</small>}
            </label>)}
          </div>}
          <p className="salary-sim-note">{t('Full month only: overtime, monthly incentives, proration, loans and attendance deductions are not included and vary on actual payroll.')}</p>
          <button type="button" className="ph-button ph-button-primary" onClick={() => void calculate()} disabled={loading}
            data-testid="salary-sim-calculate">{loading ? t('Calculating…') : t('Calculate')}</button>
        </div>

        <div className="salary-sim-result" aria-live="polite">
          {error && <div className="salary-sim-alert" role="alert">
            {/* Stored as the source text and translated at render: known simulator
                errors have EN/ID catalog entries; unknown messages show unchanged. */}
            <p data-testid="salary-sim-error">{t(error)}</p>
            <button type="button" className="ph-button" onClick={() => void calculate()}>{t('Retry')}</button>
          </div>}
          {!result && !error && !loading && <p className="salary-sim-empty">{t('Enter a target and calculate. The result appears here.')}</p>}
          {loading && <p className="salary-sim-empty">{t('Calculating…')}</p>}
          {result && b && <>
            <div className="salary-sim-headline">
              <div>
                <span>{t('Basic salary (full month)')}</span>
                <strong data-testid="salary-sim-basic">{money(result.basic_salary)}</strong>
              </div>
              <div>
                <span>{t('Take-home pay')}</span>
                <strong data-testid="salary-sim-thp">{money(result.achieved_thp)}</strong>
              </div>
            </div>
            <p className={`salary-sim-status salary-sim-status-${result.status}`} data-testid="salary-sim-status-text">
              {result.status === 'exact'
                ? t('Exact: the target is reached.')
                : result.status === 'below_minimum'
                  ? t('Below the minimum: with these allowances the lowest achievable take-home pay is {amount}, at a basic salary of {basic}.',
                    { amount: money(result.achieved_thp), basic: money(result.basic_salary) })
                  : t('Nearest result, not exact.')}
              {result.difference !== 0 && <> {t('Difference')}: <span data-testid="salary-sim-difference">{result.difference > 0 ? '+' : ''}{money(result.difference)}</span></>}
            </p>
            <dl className="salary-sim-rows">
              <div><dt>{t('Basic salary')}</dt><dd>{money(b.basic_salary)}</dd></div>
              <div><dt>{t('Fixed allowances')}</dt><dd>{money(b.fixed_allowances)}</dd></div>
              <div className="salary-sim-subtotal"><dt>{t('Monthly cash before deductions')}</dt><dd>{money(b.gross_cash)}</dd></div>
              <div><dt>{t('PPh21')} ({b.ter_golongan} · {rate(b.ter_rate)})</dt>
                <dd>{companyPays ? <>{money(b.pph21)} <em>{t('paid by company')}</em></> : `−${money(b.pph21)}`}</dd></div>
              <div><dt>{t('Employee BPJS (JHT, JP, JKS)')}</dt>
                <dd>{b.bpjs_employee_paid_by === 'company' ? <>{money(b.bpjs_employee.total)} <em>{t('paid by company')}</em></> : `−${money(b.bpjs_employee.total)}`}</dd></div>
              <div className="salary-sim-subtotal"><dt>{t('Take-home pay')}</dt><dd>{money(b.take_home_pay)}</dd></div>
              <div className="salary-sim-muted"><dt>{t('Taxable base (DPP), not cash')}</dt><dd>{money(b.taxable_base_dpp)}</dd></div>
              <div className="salary-sim-muted"><dt>{t('Company BPJS')}</dt><dd>{money(b.bpjs_company.total)}</dd></div>
              <div className="salary-sim-muted"><dt>{t('Company cost')}</dt><dd>{money(b.company_cost)}</dd></div>
            </dl>
            {result.employee_context?.contract_income && usesContract && <p className="salary-sim-note">
              {t('Approved recurring allowances used: {amount}.', { amount: money(result.employee_context.contract_income.total) })}
              {result.employee_context.one_time_excluded > 0 && ` ${t('One-time allowances are excluded.')}`}
            </p>}
            {/* Scope warnings for BOTH modes: the simulation always uses the
                salary-status route (New Gross / Existing) and does not model a
                company automation policy or an employee payroll preparation. */}
            {result.scope.policy_rules_apply && <p className="salary-sim-warning" role="note" data-testid="salary-sim-warning-policy">
              {t('Company payroll automation or an employee payroll preparation applies in {period}. Actual payroll will use that policy, which this simulation does not model, so the actual result can differ.', { period: result.scope.period })}</p>}
            {result.scope.rules_unreadable && <p className="salary-sim-warning" role="note" data-testid="salary-sim-warning-unreadable">
              {t('Stored payroll rules or allowance sources for {period} could not be read; the actual result can differ. Check them first.', { period: result.scope.period })}</p>}
            {/* The simulator is a monthly TER estimate. December (and the month
                employment ends) is settled at generation from saved year-to-date payroll. */}
            {(result.scope.final_tax_period ?? result.scope.period.endsWith('-12')) && <p className="salary-sim-warning" role="note" data-testid="salary-sim-warning-final-period">
              {t('{period} is a final tax period: payroll settles the whole year with Pasal 17 from saved year-to-date payroll, so this monthly estimate is not the final tax or take-home pay.', { period: result.scope.period })}</p>}
            <p className="salary-sim-note" data-testid="salary-sim-estimate">{t('Monthly estimate with TER rates, not an annual settlement. In December or the month employment ends, the actual tax can differ.')}</p>
            <p className="salary-sim-note">{t('Calculated for {period} with the current payroll rates and the selected payroll status, PTKP and allowances.', { period: result.scope.period })}</p>
            {mode === 'employee_form' && <div className="salary-sim-apply" data-testid="salary-sim-apply-info">
              <p>{t('Apply fills Basic Salary, Payroll status and PTKP status in this form. The employee is not saved until you save the form. Allowances are not changed; register allowances in Allowances.')}</p>
              {!currencyIsIdr && <p className="salary-sim-error">{t('Apply is available only when the salary currency is IDR.')}</p>}
              {/* Policy/unreadable reasons are already shown as scope warnings above. */}
              {result.apply.reasons.filter(reason => reason !== 'policy_rules_apply' && reason !== 'rules_unreadable').map(reason => <p key={reason} className="salary-sim-error" data-testid={`salary-sim-reason-${reason}`}>{t(REASON_LABELS[reason])}</p>)}
            </div>}
          </>}
        </div>
      </div>
      <ModalFooter>
        <button type="button" className="ph-button" onClick={close} data-testid="salary-sim-close">{t('Close')}</button>
        {mode === 'employee_form' && <button type="button" className="ph-button ph-button-primary" disabled={!canApply}
          onClick={apply} data-testid="salary-sim-apply">{t('Apply to form')}</button>}
      </ModalFooter>
    </Modal>
  );
}
