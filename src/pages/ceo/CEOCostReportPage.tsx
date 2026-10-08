import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Building2, AlertCircle, Calendar } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type GroupDashboard,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

export function CEOCostReportPage() {
  useLocale();
  const { user } = useAuthStore();
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userCompanyId = user?.employee?.company_id || undefined;
  const isGroupCEO = user?.roles?.includes('Group CEO') || user?.roles?.includes('Super Admin');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const companyId = isGroupCEO ? undefined : userCompanyId;
        const group = await dashboardService.getGroupOverview(companyId);
        setGroupData(group);
      } catch (err: any) {
        console.error('Failed to fetch cost data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userCompanyId, isGroupCEO]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Failed to load data")}</h3>
          <p className="text-gray-600 mb-4">{t(error)}</p>
          <button onClick={() => window.location.reload()} className="ph-button ph-button-primary px-4 py-2 rounded-lg">{t("Retry")} </button>
        </div>
      </div>
    );
  }

  // The whole report is payroll-based: when the server withholds payroll totals
  // (no payroll.view) show that, instead of a zero-cost report.
  if (groupData && groupData.payroll_summary == null) {
    return <ReportPage><ReportHeader>
      <div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Cost Analysis")}</h1><p className="text-xs md:text-sm mt-1">{t("Workforce cost breakdown")}</p></div>
    </ReportHeader><ReportSection><div data-testid="payroll-unavailable"><strong>{t("Payroll figures unavailable")}</strong><p className="text-sm text-gray-600">{t("Your access does not include payroll totals.")}</p></div></ReportSection></ReportPage>;
  }

  const payrollSummary = groupData?.payroll_summary || {
    total_monthly_payroll: 0,
    avg_salary: 0,
    by_company: [],
  };

  const companies = groupData?.companies || [];
  const _departmentDistribution = groupData?.department_distribution || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp ${insightFixed((value / 1000000000), 1)}${t('billion short')}`;
    }
    if (value >= 1000000) {
      return `Rp ${insightFixed((value / 1000000), 1)}${t('million short')}`;
    }
    return formatCurrency(value);
  };

  // Calculate total
  const totalPayroll = payrollSummary.total_monthly_payroll;
  const totalEmployees = companies.reduce((sum, c) => sum + c.employees, 0);
  const avgCostPerEmployee = totalEmployees > 0 ? totalPayroll / totalEmployees : 0;
  const annualProjection = totalPayroll * 12;

  // Cost by company for bar chart
  const costByCompany = payrollSummary.by_company.map((item) => ({
    name: item.company_name.length > 15 ? item.company_name.substring(0, 15) + '...' : item.company_name,
    total: item.total_payroll,
    employees: item.employee_count,
    avg: item.employee_count > 0 ? item.total_payroll / item.employee_count : 0,
  }));

  // Colors
  const _COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Cost Analysis")}</h1><p className="text-xs md:text-sm mt-1">{t("Workforce cost breakdown")}</p></div>
<div className="report-header-context"><div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' })}
              </span></div></div>
</ReportHeader>{/* KPIs */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatCompactCurrency(totalPayroll)}</p><p className="report-metric-label">{t("Monthly Payroll")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatCompactCurrency(annualProjection)}</p><p className="report-metric-label">{t("Annual Projection")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatCompactCurrency(avgCostPerEmployee)}</p><p className="report-metric-label">{t("Avg Cost/Employee")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatNumber(totalEmployees)}</p><p className="report-metric-label">{t("Total Workforce")}</p></div></ReportSummary>{/* Charts Row */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Cost by Company */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Cost by Company")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Total payroll distribution")}</p>
            </div>
          </div><div className="h-56 md:h-72">
            {costByCompany.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByCompany} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${insightFixed((value / 1000000000), 0)}${t('billion short')}`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? formatCompactCurrency(value) : ''}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name={t("Total Payroll")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No cost data available")} </div>
            )}
          </div></ReportSection>

        {/* Avg Cost per Employee by Company */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Avg Cost per Employee")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("By company comparison")}</p>
            </div>
          </div><div className="h-56 md:h-72">
            {costByCompany.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByCompany} layout="vertical" margin={{ top: 10, right: 10, left: 50, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${insightFixed((value / 1000000), 0)}${t('million short')}`}
                  />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#9ca3af" width={50} />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="avg" fill="#10b981" radius={[0, 4, 4, 0]} name={t("Avg/Employee")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No data available")} </div>
            )}
          </div></ReportSection>
      </div>{/* Cost Breakdown Table */}<ReportSection  className="overflow-hidden"><section  className="report-inline-note"><h3 className="text-base md:text-lg font-bold text-gray-900">{t("Detailed Cost Breakdown")}</h3><p className="text-xs text-gray-500 mt-1">{t("Payroll by company")}</p></section><div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500">{t("Company")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500">{t("Employees")}</th>
                <th className="text-right px-3 md:px-4 py-3 text-xs font-semibold text-gray-500">{t("Total Cost")}</th>
                <th className="text-right px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">{t("Avg/Employee")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">{t("Share")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrollSummary.by_company.length > 0 ? payrollSummary.by_company.map((item, index) => {
                const percentage = totalPayroll > 0 ? insightFixed(((item.total_payroll / totalPayroll) * 100), 1) : '0';
                const avgPerEmp = item.employee_count > 0 ? item.total_payroll / item.employee_count : 0;
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center report-avatar">
                          <Building2 className="h-4 w-4 text-[#65716b]" />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{item.company_name}</p>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center">
                      <span className="font-medium text-gray-900">{insightNumber(item.employee_count)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-right">
                      <span className="font-bold text-gray-900 text-sm">{formatCompactCurrency(item.total_payroll)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-right hidden md:table-cell">
                      <span className="text-gray-600 text-sm">{formatCompactCurrency(avgPerEmp)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{insightFixed(Number(percentage), 1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t("No cost data available")} </td>
                </tr>
              )}
            </tbody>
            {payrollSummary.by_company.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 md:px-6 py-4">
                    <span className="font-bold text-gray-900">{t("Total")}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center">
                    <span className="font-bold text-gray-900">{insightNumber(totalEmployees)}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-right">
                    <span className="font-bold text-indigo-600 text-sm">{formatCompactCurrency(totalPayroll)}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-right hidden md:table-cell">
                    <span className="font-medium text-gray-600 text-sm">{formatCompactCurrency(avgCostPerEmployee)}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden sm:table-cell">
                    <span className="text-xs font-bold text-green-600">100%</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table></div></ReportSection></ReportPage>
  );
}
