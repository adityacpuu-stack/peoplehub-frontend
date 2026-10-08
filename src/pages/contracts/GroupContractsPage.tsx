import { enumLabel } from '@/pages/employees/enum-labels';
import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import './contracts.css';
import './contracts-refresh.css';
import { contractService, type GroupContractStatistics } from '@/services/contract.service';

// Format number helper
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat(intlLocale()).format(num);
};

// Format date helper
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Days until expiry helper
const daysUntil = (dateStr: string): number => {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export function GroupContractsPage() {
  useLocale();
  const [data, setData] = useState<GroupContractStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await contractService.getGroupStatistics();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) return <div className="ph-workflow ct-group-state" role="status">{t("Memuat ringkasan kontrak…")}</div>;
  if (error) return <div className="ph-workflow ct-group-state" role="alert"><AlertTriangle size={22} /><p>{error === 'Failed to fetch data' ? t(error) : error}</p><button className="ct-button" onClick={fetchData}><RefreshCw size={16} />{t("Retry")}</button></div>;
  if (!data) return null;

  const { summary, by_company, expiring_contracts, recent_contracts } = data;

  return <div className="ph-workflow ct-group-overview contracts-refresh">
    <header className="ph-page-header"><div><h1>{t("Contract Overview")}</h1><p>{t("Executive view - All companies contract management")}</p></div><div className="ph-actions"><span>{formatNumber(by_company.length)}{' '}{t("Companies")}</span><button className="ct-button" onClick={fetchData}><RefreshCw size={16} />{t("Refresh")}</button></div></header>
    <div className="ct-surface">
    <dl className="ct-group-summary" aria-label={t("Contract totals")}>
      <div><dt>{t("All Contracts")}</dt><dd>{formatNumber(summary.total_contracts)}</dd></div>
      <div><dt>{t("Active Contracts")}</dt><dd>{formatNumber(summary.active_contracts)}</dd></div>
      <div><dt>{t("Within 30 Days")}</dt><dd>{formatNumber(summary.expiring_30_days)}</dd></div>
      <div><dt>{t("Expired Contracts")}</dt><dd>{formatNumber(summary.expired_contracts)}</dd></div>
    </dl>
    {summary.expiring_30_days > 0 && <div className="ph-callout ct-expiry-notice"><div><h2>{t("Contracts Expiring Soon")}</h2><p>{formatNumber(summary.expiring_30_days)}{' '}{t("contracts expiring within 30 days,")} {formatNumber(summary.expiring_60_days)}{' '}{t("within 60 days,")} {formatNumber(summary.expiring_90_days)}{' '}{t("within 90 days.")}</p></div><Link to="/contracts" className="ct-button">{t("View All")}</Link></div>}
    <section className="ph-section"><div className="ct-section-heading"><div><h2>{t("Contract Overview by Company")}</h2><p>{t("Contract distribution across all subsidiaries")}</p></div><Link to="/contracts" className="ct-button">{t("Manage Contracts")}</Link></div>
      <div className="ct-type-summary">{([['permanent','Permanent (PKWTT)'],['contract','Contract (PKWT)'],['probation','Probation']] as const).map(([type,label]) => <div key={type}><span>{t(label)}</span><strong>{formatNumber(summary.by_type[type])}</strong><small>{summary.total_contracts > 0 ? Math.round((summary.by_type[type] / summary.total_contracts) * 100) : 0}%</small></div>)}</div>
      <div className="ph-table-scroll ct-group-table"><table><thead><tr><th>{t("Company")}</th><th>{t("Total")}</th><th>{t("Active")}</th><th>{t("Expiring (30d)")}</th><th>{t("Permanent")}</th><th>{t("Contract")}</th><th>{t("Probation")}</th></tr></thead><tbody>{by_company.map(company => <tr key={company.company_id}><th>{company.company_name}</th><td>{formatNumber(company.total)}</td><td>{formatNumber(company.active)}</td><td>{company.expiring_30_days > 0 ? formatNumber(company.expiring_30_days) : '-'}</td><td>{formatNumber(company.by_type.permanent)}</td><td>{formatNumber(company.by_type.contract)}</td><td>{formatNumber(company.by_type.probation)}</td></tr>)}</tbody></table></div>
    </section>
    <div className="ct-group-ledgers">
      <section className="ph-section"><div className="ct-section-heading"><div><h2>{t("Expiring Soon")}</h2><p>{t("Contracts expiring within 30 days")}</p></div><span>{formatNumber(expiring_contracts.length)}</span></div>
        {!expiring_contracts.length ? <p className="ct-group-empty">{t("No contracts expiring within 30 days")}</p> : <ul>{expiring_contracts.map(contract => <li key={contract.id}><div><strong>{contract.employee.name}</strong><p>{contract.employee.company?.name} · {enumLabel(contract.contract_type)}</p></div><div className="ct-ledger-value"><strong className={daysUntil(contract.end_date!) <= 7 ? 'ct-urgent' : ''}>{formatNumber(daysUntil(contract.end_date!))}{' '}{t("days")}</strong><p>{formatDate(contract.end_date!)}</p></div></li>)}</ul>}
      </section>
      <section className="ph-section"><div className="ct-section-heading"><div><h2>{t("Recent Contracts")}</h2><p>{t("Latest contract activities")}</p></div></div>
        {!recent_contracts.length ? <p className="ct-group-empty">{t("No recent contracts")}</p> : <ul>{recent_contracts.map(contract => <li key={contract.id}><div><strong>{contract.employee.name}</strong><p>{contract.employee.company?.name} · {enumLabel(contract.contract_type)}</p></div><div className="ct-ledger-value"><span className="ct-status" data-status={contract.status}>{enumLabel(contract.status)}</span><p>{formatDate(contract.created_at)}</p></div></li>)}</ul>}
      </section>
    </div>
    </div>
  </div>;
}
