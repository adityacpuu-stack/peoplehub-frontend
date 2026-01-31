import { useEffect, useState } from 'react';
import {
  DollarSign,
  Building2,
  Users,
  TrendingUp,
  Wallet,
  CreditCard,
  PiggyBank,
  AlertCircle,
  Calendar,
  Receipt,
  Briefcase,
  CheckCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
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
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import { payrollService, type Payroll } from '@/services/payroll.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16'];

interface DepartmentPayroll {
  name: string;
  totalPayroll: number;
  employeeCount: number;
  avgSalary: number;
  totalTax: number;
  totalBpjs: number;
}

interface MonthlyTrend {
  month: string;
  payroll: number;
  employees: number;
  avgSalary: number;
}

export function CEOFinancialOverviewPage() {
  const { user } = useAuthStore();
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Get user's company
  const userCompanyId = user?.employee?.company_id;
  const userCompanyName = 'Your Company';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [group, payrollRes] = await Promise.all([
          dashboardService.getGroupOverview(),
          payrollService.getAll({
            company_id: userCompanyId || undefined,
            period: selectedPeriod,
            limit: 1000,
          }),
        ]);

        setGroupData(group);
        setPayrolls(payrollRes.data || []);
      } catch (err: any) {
        console.error('Failed to fetch financial data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userCompanyId, selectedPeriod]);

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
      return `Rp ${(value / 1000000).toFixed(0)}M`;
    }
    return formatCurrency(value);
  };

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return { value, label };
  });

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

  // Get company data from groupData
  const _companyData = groupData?.companies?.find(c => c.id === userCompanyId);
  const _companyPayroll = groupData?.payroll_summary?.by_company?.find(
    (c: { company_name: string }) => c.company_name === userCompanyName
  );

  // Calculate totals from payrolls
  const totalGross = payrolls.reduce((sum, p) => sum + (Number(p.gross_salary) || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0);
  const totalTax = payrolls.reduce((sum, p) => sum + (Number(p.pph21) || 0), 0);
  const totalBpjsEmployee = payrolls.reduce((sum, p) => sum + (Number(p.bpjs_employee_total) || 0), 0);
  const totalBpjsCompany = payrolls.reduce((sum, p) => sum + (Number(p.bpjs_company_total) || 0), 0);
  const totalEmployees = payrolls.length;
  const avgSalary = totalEmployees > 0 ? totalGross / totalEmployees : 0;

  // Calculate department breakdown
  const departmentMap = new Map<string, DepartmentPayroll>();
  for (const payroll of payrolls) {
    const deptName = payroll.employee?.department?.name || 'Unassigned';
    if (!departmentMap.has(deptName)) {
      departmentMap.set(deptName, {
        name: deptName,
        totalPayroll: 0,
        employeeCount: 0,
        avgSalary: 0,
        totalTax: 0,
        totalBpjs: 0,
      });
    }
    const dept = departmentMap.get(deptName)!;
    dept.totalPayroll += Number(payroll.net_salary) || 0;
    dept.totalTax += Number(payroll.pph21) || 0;
    dept.totalBpjs += (Number(payroll.bpjs_employee_total) || 0) + (Number(payroll.bpjs_company_total) || 0);
    dept.employeeCount++;
  }

  // Calculate averages and convert to array
  const departmentPayrolls: DepartmentPayroll[] = [];
  departmentMap.forEach((dept) => {
    dept.avgSalary = dept.employeeCount > 0 ? dept.totalPayroll / dept.employeeCount : 0;
    departmentPayrolls.push(dept);
  });
  departmentPayrolls.sort((a, b) => b.totalPayroll - a.totalPayroll);

  // Pie chart data for department distribution
  const departmentDistribution = departmentPayrolls.slice(0, 6).map((dept, idx) => ({
    name: dept.name.length > 12 ? dept.name.substring(0, 12) + '...' : dept.name,
    fullName: dept.name,
    value: dept.totalPayroll,
    employees: dept.employeeCount,
    color: COLORS[idx % COLORS.length],
  }));

  // Calculate payroll status counts
  const statusCounts = {
    draft: payrolls.filter(p => p.status === 'draft' || p.status === 'processing').length,
    validated: payrolls.filter(p => p.status === 'validated').length,
    approved: payrolls.filter(p => p.status === 'submitted' || p.status === 'approved').length,
    paid: payrolls.filter(p => p.status === 'paid').length,
  };

  // Cost breakdown for chart
  const costBreakdown = [
    { name: 'Net Salary', value: totalNet, color: '#10b981' },
    { name: 'PPh 21', value: totalTax, color: '#ef4444' },
    { name: 'BPJS Employee', value: totalBpjsEmployee, color: '#f59e0b' },
    { name: 'BPJS Company', value: totalBpjsCompany, color: '#6366f1' },
  ].filter(item => item.value > 0);

  const totalCost = totalNet + totalTax + totalBpjsEmployee + totalBpjsCompany;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="financial-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#financial-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Financial Overview</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">{userCompanyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/60" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value} className="text-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
              Net
            </span>
          </div>
          <p className="text-lg md:text-xl font-bold text-gray-900">{formatCompactCurrency(totalNet)}</p>
          <p className="text-xs text-gray-500">Total Net Salary</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
              Gross
            </span>
          </div>
          <p className="text-lg md:text-xl font-bold text-gray-900">{formatCompactCurrency(totalGross)}</p>
          <p className="text-xs text-gray-500">Total Gross Salary</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Users className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{totalEmployees}</p>
          <p className="text-xs text-gray-500">Employees</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-lg md:text-xl font-bold text-gray-900">{formatCompactCurrency(avgSalary)}</p>
          <p className="text-xs text-gray-500">Average Salary</p>
        </div>
      </div>

      {/* Cost Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-red-600">PPh 21</span>
          </div>
          <p className="text-lg font-bold text-red-700">{formatCompactCurrency(totalTax)}</p>
          <p className="text-xs text-red-500">{totalCost > 0 ? ((totalTax / totalCost) * 100).toFixed(1) : 0}% of total</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">BPJS Employee</span>
          </div>
          <p className="text-lg font-bold text-amber-700">{formatCompactCurrency(totalBpjsEmployee)}</p>
          <p className="text-xs text-amber-500">{totalCost > 0 ? ((totalBpjsEmployee / totalCost) * 100).toFixed(1) : 0}% of total</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-medium text-indigo-600">BPJS Company</span>
          </div>
          <p className="text-lg font-bold text-indigo-700">{formatCompactCurrency(totalBpjsCompany)}</p>
          <p className="text-xs text-indigo-500">{totalCost > 0 ? ((totalBpjsCompany / totalCost) * 100).toFixed(1) : 0}% of total</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">Total Cost</span>
          </div>
          <p className="text-lg font-bold text-emerald-700">{formatCompactCurrency(totalCost)}</p>
          <p className="text-xs text-emerald-500">All components</p>
        </div>
      </div>

      {/* Payroll Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Payroll Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{statusCounts.draft}</p>
              <p className="text-xs text-gray-500">Draft</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
            <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-indigo-900">{statusCounts.validated}</p>
              <p className="text-xs text-indigo-600">Validated</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
            <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-900">{statusCounts.approved}</p>
              <p className="text-xs text-amber-600">Approved</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
            <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-900">{statusCounts.paid}</p>
              <p className="text-xs text-green-600">Paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Payroll by Department</h3>
              <p className="text-xs text-gray-500 mt-1">Distribution breakdown</p>
            </div>
          </div>
          {departmentDistribution.length > 0 ? (
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {departmentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => {
                      if (value === undefined) return '';
                      return formatCompactCurrency(value);
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullName;
                      }
                      return label;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No department data available
            </div>
          )}
        </div>

        {/* Cost Breakdown Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Cost Breakdown</h3>
              <p className="text-xs text-gray-500 mt-1">By component</p>
            </div>
          </div>
          {costBreakdown.length > 0 ? (
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCompactCurrency(value)}
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={80}
                  />
                  <Tooltip formatter={(value: number | undefined) => {
                    if (value === undefined) return '';
                    return formatCurrency(value);
                  }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Amount">
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No cost data available
            </div>
          )}
        </div>
      </div>

      {/* Department Payroll Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Payroll by Department</h3>
          <p className="text-xs text-gray-500 mt-1">Detailed breakdown for {userCompanyName}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Employees</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Total Payroll</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Avg Salary</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">PPh 21</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">BPJS Total</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">% Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departmentPayrolls.length > 0 ? (
                departmentPayrolls.map((dept, index) => {
                  const percentage = totalNet > 0 ? ((dept.totalPayroll / totalNet) * 100).toFixed(1) : '0';
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: COLORS[index % COLORS.length] + '20' }}
                          >
                            <Briefcase className="h-4 w-4" style={{ color: COLORS[index % COLORS.length] }} />
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{dept.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="font-medium text-gray-900">{dept.employeeCount}</span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="font-bold text-gray-900 text-sm">{formatCompactCurrency(dept.totalPayroll)}</span>
                      </td>
                      <td className="px-3 py-4 text-right hidden md:table-cell">
                        <span className="text-gray-600 text-sm">{formatCompactCurrency(dept.avgSalary)}</span>
                      </td>
                      <td className="px-3 py-4 text-right hidden lg:table-cell">
                        <span className="text-red-600 text-sm">{formatCompactCurrency(dept.totalTax)}</span>
                      </td>
                      <td className="px-3 py-4 text-right hidden lg:table-cell">
                        <span className="text-amber-600 text-sm">{formatCompactCurrency(dept.totalBpjs)}</span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-10">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No payroll data available for this period
                  </td>
                </tr>
              )}
            </tbody>
            {departmentPayrolls.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 md:px-6 py-4">
                    <span className="font-bold text-gray-900">Total</span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className="font-bold text-gray-900">{totalEmployees}</span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="font-bold text-indigo-600 text-sm">{formatCompactCurrency(totalNet)}</span>
                  </td>
                  <td className="px-3 py-4 text-right hidden md:table-cell">
                    <span className="font-medium text-gray-600 text-sm">{formatCompactCurrency(avgSalary)}</span>
                  </td>
                  <td className="px-3 py-4 text-right hidden lg:table-cell">
                    <span className="font-medium text-red-600 text-sm">{formatCompactCurrency(totalTax)}</span>
                  </td>
                  <td className="px-3 py-4 text-right hidden lg:table-cell">
                    <span className="font-medium text-amber-600 text-sm">
                      {formatCompactCurrency(totalBpjsEmployee + totalBpjsCompany)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                      100%
                    </span>
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
