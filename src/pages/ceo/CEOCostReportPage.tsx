import { useEffect, useState } from 'react';
import {
  DollarSign,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Calculator,
  PiggyBank,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type GroupDashboard,
} from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

export function CEOCostReportPage() {
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const group = await dashboardService.getGroupOverview();
        setGroupData(group);
      } catch (err: any) {
        console.error('Failed to fetch cost data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const payrollSummary = groupData?.payroll_summary || {
    total_monthly_payroll: 0,
    avg_salary: 0,
    by_company: [],
  };

  const companies = groupData?.companies || [];
  const departmentDistribution = groupData?.department_distribution || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp ${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(1)}M`;
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
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cost-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cost-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Calculator className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Cost Analysis</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Workforce cost breakdown</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-xl text-xs md:text-sm text-white font-medium border border-white/10 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCompactCurrency(totalPayroll)}</p>
          <p className="text-xs text-gray-500">Monthly Payroll</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <PiggyBank className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCompactCurrency(annualProjection)}</p>
          <p className="text-xs text-gray-500">Annual Projection</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Calculator className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCompactCurrency(avgCostPerEmployee)}</p>
          <p className="text-xs text-gray-500">Avg Cost/Employee</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-lg md:text-2xl font-bold text-gray-900">{formatNumber(totalEmployees)}</p>
          <p className="text-xs text-gray-500">Total Workforce</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cost by Company */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Cost by Company</h3>
              <p className="text-xs text-gray-500 mt-1">Total payroll distribution</p>
            </div>
          </div>
          <div className="h-56 md:h-72">
            {costByCompany.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByCompany} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${(value / 1000000000).toFixed(0)}B`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCompactCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Payroll" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No cost data available
              </div>
            )}
          </div>
        </div>

        {/* Avg Cost per Employee by Company */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Avg Cost per Employee</h3>
              <p className="text-xs text-gray-500 mt-1">By company comparison</p>
            </div>
          </div>
          <div className="h-56 md:h-72">
            {costByCompany.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByCompany} layout="vertical" margin={{ top: 10, right: 10, left: 50, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#9ca3af" width={50} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="avg" fill="#10b981" radius={[0, 4, 4, 0]} name="Avg/Employee" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Detailed Cost Breakdown</h3>
          <p className="text-xs text-gray-500 mt-1">Payroll by company</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employees</th>
                <th className="text-right px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Cost</th>
                <th className="text-right px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Avg/Employee</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrollSummary.by_company.length > 0 ? payrollSummary.by_company.map((item, index) => {
                const percentage = totalPayroll > 0 ? ((item.total_payroll / totalPayroll) * 100).toFixed(1) : '0';
                const avgPerEmp = item.employee_count > 0 ? item.total_payroll / item.employee_count : 0;
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{item.company_name}</p>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center">
                      <span className="font-medium text-gray-900">{item.employee_count}</span>
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
                        <span className="text-xs font-medium text-gray-600">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No cost data available
                  </td>
                </tr>
              )}
            </tbody>
            {payrollSummary.by_company.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 md:px-6 py-4">
                    <span className="font-bold text-gray-900">Total</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center">
                    <span className="font-bold text-gray-900">{totalEmployees}</span>
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
          </table>
        </div>
      </div>
    </div>
  );
}
