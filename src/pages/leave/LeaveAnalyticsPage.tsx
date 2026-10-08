import { quantity } from '@/components/leave/presentation';
import { t, useLocale, intlLocale } from '@/i18n';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { collectPages } from '@/services/master-data';
import api from '@/services/api';
import './leave-workspace.css';
import './leave-refresh.css';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { leaveService } from '../../services/leave.service';
import { companyService } from '../../services/company.service';
import { toNum } from '@/lib/utils';
import type { LeaveRequest, LeaveType, PaginatedResponse } from '@/types';

interface Company {
  id: number;
  name: string;
}

interface MonthlyData {
  month: string;
  requests: number;
  approved: number;
  rejected: number;
  days: number | null;
}

interface LeaveTypeStats {
  type: LeaveType;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  totalDays: number | null;
  percentage: number;
}

interface DepartmentStats {
  name: string;
  total: number;
  approved: number;
  averageDays: number | null;
}

// Missing recorded amounts make the aggregate unavailable; they are not zero days.
const recordedDays = (leaves: LeaveRequest[]): number | null => {
  const approved = leaves.filter(leave => leave.status === 'approved');
  if (approved.some(leave => leave.total_days == null || !Number.isFinite(toNum(leave.total_days, NaN)))) return null;
  return approved.reduce((sum, leave) => sum + toNum(leave.total_days), 0);
};

export function LeaveAnalyticsPage() {
  const locale = useLocale();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [optionError, setOptionError] = useState(false);
  const requestSequence = useRef(0);
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterPeriod, setFilterPeriod] = useState<string>('year');

  // Fetch leave types
  const fetchLeaveTypes = useCallback(async () => {
    try {
      const types = await collectPages(async (page, limit) =>
        (await api.get<PaginatedResponse<LeaveType>>('/leaves/types', { params: { page, limit } })).data);
      setLeaveTypes(types);
    } catch (error) {
      setOptionError(true);
      console.error('Failed to fetch leave types:', error);
    }
  }, []);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const rows = await collectPages((page, limit) => companyService.getAll({ page, limit }));
      setCompanies(rows);
    } catch (error) {
      setOptionError(true);
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  // Fetch all leaves for analytics
  const fetchLeaves = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setLoadError(false);
    try {
      const rows = await collectPages((page, limit) => leaveService.getAll({ page, limit,
        ...(filterCompany !== 'all' ? { company_id: Number(filterCompany) } : {}),
      }));
      if (sequence === requestSequence.current) setLeaves(rows);
    } catch {
      if (sequence !== requestSequence.current) return;
      setLeaves([]); setLoadError(true);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [filterCompany]);

  useEffect(() => {
    fetchCompanies();
    fetchLeaveTypes();
  }, [fetchCompanies, fetchLeaveTypes]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Filter leaves by year
  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      const leaveYear = new Date(leave.start_date).getFullYear().toString();
      const month = new Date(leave.start_date).getMonth();
      const quarter = Math.floor(month / 3) + 1;
      return leaveYear === filterYear && (filterPeriod === 'year' || filterPeriod === `q${quarter}`);
    });
  }, [leaves, filterYear, filterPeriod]);

  // Use recorded working days, including historical fractions; never infer them from dates.
  // Overall stats
  const overallStats = useMemo(() => {
    const total = filteredLeaves.length;
    const pending = filteredLeaves.filter(l => l.status === 'pending').length;
    const approved = filteredLeaves.filter(l => l.status === 'approved').length;
    const rejected = filteredLeaves.filter(l => l.status === 'rejected').length;
    const totalDays = recordedDays(filteredLeaves);
    const avgDays = totalDays === null ? null : approved > 0 ? (totalDays / approved).toFixed(1) : '0';
    const approvalRate = approved + rejected > 0 ? ((approved / (approved + rejected)) * 100).toFixed(1) : '0';

    // Previous-period comparison removed — was Math.random() mock shown as real metric.
    // To restore: fetch prior period leave count from API and compute real delta.

    return {
      total,
      pending,
      approved,
      rejected,
      totalDays,
      avgDays,
      approvalRate,
    };
  }, [filteredLeaves]);

  // Monthly breakdown
  const monthlyData = useMemo((): MonthlyData[] => {
    void locale; // Localized labels must refresh when language changes.
    const months = Array.from({ length: 12 }, (_, month) => new Date(2020, month, 1).toLocaleDateString(intlLocale(), { month: 'short' }));
    return months.map((month, index) => {
      const monthLeaves = filteredLeaves.filter(l => {
        const date = new Date(l.start_date);
        return date.getMonth() === index;
      });

      return {
        month,
        requests: monthLeaves.length,
        approved: monthLeaves.filter(l => l.status === 'approved').length,
        rejected: monthLeaves.filter(l => l.status === 'rejected').length,
        days: recordedDays(monthLeaves),
      };
    }).filter((_, index) => filterPeriod === 'year' || Math.floor(index / 3) + 1 === Number(filterPeriod.slice(1)));
  }, [filteredLeaves, filterPeriod, locale]);

  // Leave type statistics
  const leaveTypeStats = useMemo((): LeaveTypeStats[] => {
    void locale; // Localized labels must refresh when language changes.
    const types = new Map(leaveTypes.map(type => [type.id, type]));
    filteredLeaves.forEach(leave => {
      if (!types.has(leave.leave_type_id)) types.set(leave.leave_type_id, leave.leaveType ?? { id: leave.leave_type_id, name: t('Unspecified leave type'), default_days: 0, is_paid: false, is_active: false });
    });
    return [...types.values()].map(type => {
      const typeLeaves = filteredLeaves.filter(l => l.leave_type_id === type.id);
      const total = typeLeaves.length;
      const approved = typeLeaves.filter(l => l.status === 'approved').length;
      const pending = typeLeaves.filter(l => l.status === 'pending').length;
      const rejected = typeLeaves.filter(l => l.status === 'rejected').length;
      const totalDays = recordedDays(typeLeaves);
      const percentage = filteredLeaves.length > 0 ? (total / filteredLeaves.length) * 100 : 0;

      return {
        type,
        total,
        approved,
        pending,
        rejected,
        totalDays,
        percentage,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredLeaves, leaveTypes, locale]);

  // Department statistics
  const departmentStats = useMemo((): DepartmentStats[] => {
    void locale; // Localized labels must refresh when language changes.
    const deptMap = new Map<string, { total: number; approved: number; days: number | null }>();

    filteredLeaves.forEach(leave => {
      const deptName = leave.employee?.department?.name || t('Unknown');
      const existing = deptMap.get(deptName) || { total: 0, approved: 0, days: 0 };
      existing.total += 1;
      if (leave.status === 'approved') {
        existing.approved += 1;
        const days = recordedDays([leave]);
        existing.days = days === null || existing.days === null ? null : existing.days + days;
      }
      deptMap.set(deptName, existing);
    });

    return Array.from(deptMap.entries())
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        approved: stats.approved,
        averageDays: stats.days === null ? null : stats.approved > 0 ? parseFloat((stats.days / stats.approved).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLeaves, locale]);

  // Get max value for chart scaling
  const maxMonthlyRequests = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.requests), 1);
  }, [monthlyData]);

  const handleExport = () => {
    const data = {
      period: `${filterYear} / ${filterPeriod}`,
      company_id: filterCompany === 'all' ? null : Number(filterCompany),
      overall: overallStats,
      monthlyBreakdown: monthlyData,
      byLeaveType: leaveTypeStats.map(s => ({
        type: s.type.name,
        total: s.total,
        approved: s.approved,
        pending: s.pending,
        rejected: s.rejected,
        totalDays: s.totalDays,
      })),
      byDepartment: departmentStats,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_analytics_${filterYear}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("Export successful"));
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  return <OperationalWorkspace module="leave" title={t("Leave Analytics")} description={t("Request trends and recorded leave usage for your selected reporting period.")} className="lw-page"
    actions={<><button className="ow-button" onClick={fetchLeaves} disabled={loading}><RefreshCw size={16} />{t("Refresh")}</button><button className="ow-button" onClick={handleExport} disabled={loading || loadError}><Download size={16} />{t("Export report")}</button></>}
    filters={<><label className="ow-field">{t("Company")}<select aria-label={t("Company filter")} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}><option value="all">{t("All assigned companies")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label className="ow-field">{t("Year")}<select aria-label={t("Year filter")} value={filterYear} onChange={e => setFilterYear(e.target.value)}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label><label className="ow-field">{t("Period")}<select aria-label={t("Period filter")} value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}><option value="year">{t("Full year")}</option><option value="q1">{t("Q1 / Jan–Mar")}</option><option value="q2">{t("Q2 / Apr–Jun")}</option><option value="q3">{t("Q3 / Jul–Sep")}</option><option value="q4">{t("Q4 / Oct–Dec")}</option></select></label><button className="ow-button" onClick={() => { setFilterCompany('all'); setFilterYear(String(new Date().getFullYear())); setFilterPeriod('year'); }}>{t("Reset filters")}</button><details className="lw-help"><summary>{t("About this report")}</summary><p>{t("Requests are grouped by start date. Days use stored approved amounts, including historical fractions. A dash means a recorded amount is unavailable.")}</p></details></>}
    >
    {optionError && <p className="ow-feedback" role="alert">{t("Unable to load reporting options.")} <button onClick={() => { setOptionError(false); fetchCompanies(); fetchLeaveTypes(); }}>{t("Retry options")}</button></p>}
    {loading ? <div className="ow-register lw-empty" role="status"><Loader2 className="animate-spin" />{t("Loading report…")}</div> : loadError ? <div className="ow-register lw-empty" role="alert">{t("Unable to load leave analytics.")}<button className="ow-button" onClick={fetchLeaves}>{t("Retry report")}</button></div> : <>
      {!overallStats.total && <p className="ow-feedback">{t("No leave requests found for this period. Adjust the year or company.")}</p>}
      <section className="ow-register lw-trend">
        <header className="lw-report-heading"><div><h2>{t("Monthly requests")}</h2><p className="lw-note">{filterYear} / {filterPeriod === 'year' ? t("Full year") : filterPeriod.toUpperCase()}</p></div><div className="lw-report-totals"><span><strong>{quantity(overallStats.total)}</strong>{' '}{t("requests")}</span><span><strong data-leave-approved-days>{quantity(overallStats.totalDays ?? '\u2014')}</strong>{' '}{t("approved working days")}</span><span><strong>{quantity(overallStats.avgDays ?? '\u2014')}</strong>{' '}{t("days per approved request")}</span></div></header>
        <div className="lw-chart" role="img" aria-label={monthlyData.map(month => t('{month}: {count} requests', { month: month.month, count: month.requests })).join(', ')}>{monthlyData.map(month => <div key={month.month} className="lw-chart-month"><span>{quantity(month.requests)}</span><div className="lw-chart-track"><div style={{ height: `${month.requests / maxMonthlyRequests * 100}%` }} /></div><span>{month.month}</span></div>)}</div>
        <div className="lw-status-report"><dl>{[['Pending',overallStats.pending],['Approved',overallStats.approved],['Rejected',overallStats.rejected],['Other statuses',overallStats.total-overallStats.pending-overallStats.approved-overallStats.rejected]].map(([label,count]) => <div key={label}><dt>{t(String(label))}</dt><dd>{count}</dd></div>)}</dl><p className="lw-note">{t("Approval rate among decisions:")} <strong>{quantity(overallStats.approvalRate)}%</strong></p></div>
      </section>
      <div className="leave-report-breakdowns"><section className="ow-register lw-report-table"><div className="lw-register-tools"><h2>{t("Leave type breakdown")}</h2><span className="lw-note">{t("Days from approved requests")}</span></div><div className="lw-table-wrap"><table className="ow-table lw-records"><thead><tr><th>{t("Leave type")}</th><th>{t("Requests")}</th><th>{t("Approved")}</th><th>{t("Pending")}</th><th>{t("Rejected")}</th><th>{t("Working days")}</th></tr></thead><tbody>{leaveTypeStats.filter(stat => stat.total > 0).map(stat => <tr key={stat.type.id}><td data-label={t("Leave type")}><strong>{stat.type.name}</strong><span className="lw-sub">{stat.percentage.toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{t("% of requests")}</span></td><td data-label={t("Requests")}>{quantity(stat.total)}</td><td data-label={t("Approved")}>{quantity(stat.approved)}</td><td data-label={t("Pending")}>{quantity(stat.pending)}</td><td data-label={t("Rejected")}>{quantity(stat.rejected)}</td><td data-label={t("Working days")} className="lw-number">{quantity(stat.totalDays ?? '\u2014')}</td></tr>)}</tbody></table></div>{!filteredLeaves.length && <p className="lw-empty">{t("No type data for this period.")}</p>}</section>
      <section className="ow-register lw-report-table"><div className="lw-register-tools"><h2>{t("Department overview")}</h2><span className="lw-note">{t("Average days per approved request")}</span></div><div className="lw-table-wrap"><table className="ow-table lw-records"><thead><tr><th>{t("Department")}</th><th>{t("Requests")}</th><th>{t("Approved")}</th><th>{t("Average working days")}</th></tr></thead><tbody>{departmentStats.map(department => <tr key={department.name}><td data-label={t("Department")}><strong>{department.name}</strong></td><td data-label={t("Requests")}>{quantity(department.total)}</td><td data-label={t("Approved")}>{quantity(department.approved)}</td><td data-label={t("Average working days")} className="lw-number">{quantity(department.averageDays ?? '\u2014')}</td></tr>)}</tbody></table></div>{!departmentStats.length && <p className="lw-empty">{t("No department data for this period.")}</p>}</section></div>
    </>}
  </OperationalWorkspace>;
}
