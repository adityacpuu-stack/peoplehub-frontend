import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '@/services/dashboard.service';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';

interface PayrollSummary {
  current_period: { period: string; total_employees: number; total_gross: number; total_deductions: number; total_net: number } | null;
  pending_adjustments: number;
  pending_overtime: number;
}

export function FinanceDashboard() {
  useLocale();
  const user = useAuthStore(state => state.user);
  // Payroll totals need payroll.view; without it they are unavailable, not zero.
  const payrollAllowed = canAction(user, 'payroll.view');
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!payrollAllowed) return;
    let cancelled = false;
    dashboardService.getPayrollSummary()
      .then(data => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [reload, payrollAllowed]);

  const retry = () => { setSummary(null); setError(false); setReload(value => value + 1); };

  const period = summary?.current_period;
  return <ReportPage><ReportHeader>
<div className="report-heading"><h1 className="text-2xl font-bold text-gray-900">{t("Finance Dashboard")}</h1></div>

</ReportHeader>{!payrollAllowed ? <p className="bg-white rounded-md border p-5 text-gray-600" data-testid="payroll-unavailable">{t("Payroll figures unavailable")}. {t("Your access does not include payroll totals.")}</p>
      : error ? <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-md">{t("Ringkasan payroll belum berhasil dimuat.")} <button onClick={retry} className="underline">{t("Coba lagi")}</button></div>
      : !summary ? <p role="status">{t("Memuat ringkasan payroll...")}</p>
      : <>
        {period ? <><h2 className="font-semibold text-gray-700">{t("Periode")} {period.period}</h2><ReportSummary>{[['Karyawan', period.total_employees.toLocaleString(intlLocale())], ['Total gross', formatCurrency(period.total_gross)], ['Total potongan', formatCurrency(period.total_deductions)], ['Total take-home pay', formatCurrency(period.total_net)]].map(([label, value]) => <div key={label} className="report-metric"><p className="report-metric-label">{t(String(label))}</p><p className="report-metric-value">{value}</p></div>)}</ReportSummary></> : <p className="bg-white rounded-md border p-5 text-gray-600">{t("Belum ada payroll untuk periode berjalan.")}</p>}
        <p className="text-sm text-gray-600">{t("Penyesuaian menunggu:")} {(summary.pending_adjustments).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}{' '}{t("· Lembur menunggu:")} {(summary.pending_overtime).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</p>
      </>}{payrollAllowed && <Link to="/payroll" className="ph-button ph-button-primary inline-block rounded-lg px-4 py-2 font-medium">{t("Buka payroll")}</Link>}</ReportPage>;
}
