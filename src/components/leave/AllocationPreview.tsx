import { quantity } from '@/components/leave/presentation';
import { t, useLocale } from '@/i18n';
import type { LeaveAllocationResult } from '@/services/leave.service';
import '@/pages/leave/domain-workflows.css';

export function AllocationPreview({ result, error, onRetry }: {
  result: LeaveAllocationResult | null;
  error: boolean;
  onRetry: () => void;
}) {
  useLocale();
  return <div aria-live="polite" className="ph-workflow dw-allocation">
    <p className="dw-note">{t("Uses the recorded probation end date. Annual Leave starts from the following month; other eligible leave types receive their full default quota.")} </p>
    <p className="ph-callout dw-callout">{t("Existing balances and leave history are skipped. Used, pending, carried-forward days and adjustments stay unchanged.")} </p>
    {error ? <div role="alert" className="text-red-700">{t("Could not load allocation preview.")} <button type="button" onClick={onRetry} className="underline">{t("Try Again")}</button>
    </div> : !result ? <p role="status">{t("Loading allocation preview...")}</p> : <>
      <dl className="dw-allocation-summary">
        <div><dt>{t("New balances")}</dt><dd>{quantity(result.created)}</dd></div>
        <div><dt>{t("Days to allocate")}</dt><dd>{quantity(result.totalDaysGranted)}</dd></div>
      </dl>
      <dl className="dw-kv">
        <div><dt>{t("Year")}</dt><dd>{result.year}</dd></div>
        <div><dt>{t("Eligible employees")}</dt><dd>{quantity(result.employeesConsidered)}</dd></div>
        <div><dt>{t("Existing balances skipped")}</dt><dd>{quantity(result.skippedBalanceExists)}</dd></div>
        <div><dt>{t("Leave history skipped")}</dt><dd>{quantity(result.skippedHasLeaveHistory)}</dd></div>
        <div><dt>{t("No entitlement this year")}</dt><dd>{quantity(result.skippedNotEntitledThisYear)}</dd></div>
      </dl>
      {result.created === 0 && <p className="text-amber-800">{t("No new balances to allocate for this selection.")}</p>}
    </>}
  </div>;
}
