import {
  Users,
  Building2,
  Clock,
  Calendar,
  Activity,
  ArrowRight,
  FileText,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Calculator,
  Receipt,
  Percent,
  FileSpreadsheet,
  Landmark,
  CircleDollarSign,
  Wallet,
  Eye,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

// Mock data for Tax Dashboard
const taxMonthlyData = [
  { month: 'Aug', pph21: 125000000, bpjs: 45000000, total: 170000000 },
  { month: 'Sep', pph21: 132000000, bpjs: 47000000, total: 179000000 },
  { month: 'Oct', pph21: 128000000, bpjs: 46000000, total: 174000000 },
  { month: 'Nov', pph21: 135000000, bpjs: 48000000, total: 183000000 },
  { month: 'Dec', pph21: 142000000, bpjs: 50000000, total: 192000000 },
  { month: 'Jan', pph21: 138000000, bpjs: 49000000, total: 187000000 },
];

const taxCompanyBreakdown = [
  { name: 'PT Alpha Tech', pph21: 52000000, bpjsKes: 12000000, bpjsTK: 8000000, employees: 85, status: 'paid' },
  { name: 'PT Beta Solutions', pph21: 38000000, bpjsKes: 9000000, bpjsTK: 6000000, employees: 62, status: 'paid' },
  { name: 'PT Gamma Corp', pph21: 28000000, bpjsKes: 7000000, bpjsTK: 5000000, employees: 48, status: 'pending' },
  { name: 'PT Delta Digital', pph21: 26000000, bpjsKes: 6500000, bpjsTK: 4500000, employees: 45, status: 'paid' },
  { name: 'PT Epsilon Group', pph21: 14000000, bpjsKes: 3500000, bpjsTK: 2500000, employees: 25, status: 'overdue' },
];

const taxDistribution = [
  { name: 'PPh 21', value: 45, color: '#3b82f6', amount: 138000000 },
  { name: 'BPJS Kesehatan', value: 25, color: '#10b981', amount: 38000000 },
  { name: 'BPJS Ketenagakerjaan', value: 20, color: '#f59e0b', amount: 26000000 },
  { name: 'PPh 23', value: 10, color: '#8b5cf6', amount: 15000000 },
];

const taxKeyMetrics = {
  totalPPh21: 138000000,
  totalBPJS: 49000000,
  totalTaxPayable: 217000000,
  paidThisMonth: 185000000,
  pendingPayments: 32000000,
  companiesCompliant: 4,
  companiesOverdue: 1,
  employeesCovered: 265,
  avgTaxPerEmployee: 520000,
  ytdTaxPaid: 1850000000,
};

const taxDeadlines = [
  { id: 1, type: 'PPh 21', company: 'All Companies', deadline: '2025-02-10', status: 'upcoming', amount: 138000000 },
  { id: 2, type: 'BPJS Kesehatan', company: 'All Companies', deadline: '2025-02-10', status: 'upcoming', amount: 38000000 },
  { id: 3, type: 'BPJS TK', company: 'All Companies', deadline: '2025-02-15', status: 'upcoming', amount: 26000000 },
  { id: 4, type: 'PPh 23', company: 'PT Alpha Tech', deadline: '2025-02-10', status: 'upcoming', amount: 8500000 },
];

const taxRecentActivities = [
  { id: 1, action: 'PPh 21 January paid', company: 'PT Alpha Tech', amount: 52000000, time: '2 hours ago', type: 'payment' },
  { id: 2, action: 'BPJS Report submitted', company: 'PT Beta Solutions', amount: 15000000, time: '5 hours ago', type: 'report' },
  { id: 3, action: 'Tax calculation updated', company: 'PT Gamma Corp', amount: 28000000, time: '1 day ago', type: 'calculation' },
  { id: 4, action: 'e-SPT generated', company: 'All Companies', amount: 138000000, time: '2 days ago', type: 'document' },
  { id: 5, action: 'Tax audit completed', company: 'PT Delta Digital', amount: 0, time: '3 days ago', type: 'audit' },
];

const taxAlerts = [
  { id: 1, title: 'Payment overdue', company: 'PT Epsilon Group', message: 'PPh 21 payment is 5 days overdue', severity: 'high' },
  { id: 2, title: 'Deadline approaching', company: 'All Companies', message: 'PPh 21 due in 10 days', severity: 'medium' },
  { id: 3, title: 'Rate change', company: 'All Companies', message: 'New BPJS rates effective next month', severity: 'low' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export function TaxDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header Banner - Tax Green Theme */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="tax-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tax-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                  <Receipt className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                  </h1>
                  <p className="text-emerald-100 text-sm mt-1">Tax & Compliance Dashboard</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                  <Landmark className="h-4 w-4" />
                  {user?.roles?.[0] || 'Tax Staff'}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                  <Building2 className="h-4 w-4" />
                  {taxKeyMetrics.companiesCompliant + taxKeyMetrics.companiesOverdue} Companies
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                  <Users className="h-4 w-4" />
                  {formatNumber(taxKeyMetrics.employeesCovered)} Employees
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                  <Clock className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Percent className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500">PPh 21</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(taxKeyMetrics.totalPPh21)}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500">BPJS</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(taxKeyMetrics.totalBPJS)}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <CircleDollarSign className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-amber-600">TOTAL</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(taxKeyMetrics.totalTaxPayable)}</p>
          <p className="text-xs text-gray-500">Tax Payable</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-green-600">PAID</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(taxKeyMetrics.paidThisMonth)}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </div>
      </div>

      {/* Second Row - Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-red-600">PENDING</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(taxKeyMetrics.pendingPayments)}</p>
          <p className="text-xs text-gray-500">Unpaid Tax</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-green-600">COMPLIANT</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{taxKeyMetrics.companiesCompliant}</p>
          <p className="text-xs text-gray-500">Companies</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-red-600">OVERDUE</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{taxKeyMetrics.companiesOverdue}</p>
          <p className="text-xs text-gray-500">Companies</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500">YTD</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(taxKeyMetrics.ytdTaxPaid)}</p>
          <p className="text-xs text-gray-500">Total Tax Paid</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tax Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Monthly Tax Trend</h3>
              <p className="text-xs text-gray-500 mt-1">PPh 21 vs BPJS contributions</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taxMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                />
                <Bar dataKey="pph21" fill="#3b82f6" radius={[4, 4, 0, 0]} name="PPh 21" />
                <Bar dataKey="bpjs" fill="#10b981" radius={[4, 4, 0, 0]} name="BPJS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600">PPh 21</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-600">BPJS</span>
            </div>
          </div>
        </div>

        {/* Tax Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Tax Distribution</h3>
              <p className="text-xs text-gray-500 mt-1">By type</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <PieChartIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taxDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {taxDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? `${value}%` : ''} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {taxDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="text-gray-500 text-xs">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Company Tax Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Company Tax Breakdown</h3>
            <p className="text-xs text-gray-500 mt-1">Tax obligations by company</p>
          </div>
          <Link to="/tax/reports" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            View Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">PPh 21</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">BPJS Kes</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">BPJS TK</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employees</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {taxCompanyBreakdown.map((company, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {company.name.split(' ')[1]?.[0] || company.name[0]}
                      </div>
                      <p className="font-semibold text-gray-900">{company.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900">{formatCurrency(company.pph21)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900">{formatCurrency(company.bpjsKes)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900">{formatCurrency(company.bpjsTK)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-gray-900">{company.employees}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${company.status === 'paid' ? 'bg-green-100 text-green-700' :
                        company.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {company.status === 'paid' ? <CheckCircle className="h-3 w-3" /> :
                        company.status === 'pending' ? <Clock className="h-3 w-3" /> :
                          <XCircle className="h-3 w-3" />}
                      {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Upcoming Deadlines</h3>
              <p className="text-xs text-gray-500 mt-1">Payment due dates</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            {taxDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{deadline.type}</p>
                    <p className="text-xs text-gray-500">{deadline.company}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    {new Date(deadline.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-emerald-600 mt-2">{formatCurrency(deadline.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Alerts</h3>
              <p className="text-xs text-gray-500 mt-1">Items requiring attention</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              {taxAlerts.length}
            </span>
          </div>
          <div className="space-y-3">
            {taxAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border ${alert.severity === 'high' ? 'bg-red-50 border-red-100' :
                    alert.severity === 'medium' ? 'bg-amber-50 border-amber-100' :
                      'bg-blue-50 border-blue-100'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.severity === 'high' ? 'bg-red-100' :
                      alert.severity === 'medium' ? 'bg-amber-100' :
                        'bg-blue-100'
                    }`}>
                    <AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-red-600' :
                        alert.severity === 'medium' ? 'text-amber-600' :
                          'text-blue-600'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{alert.title}</p>
                    <p className="text-xs text-gray-500">{alert.company}</p>
                    <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
              <p className="text-xs text-gray-500 mt-1">Latest tax transactions</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            {taxRecentActivities.slice(0, 4).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.type === 'payment' ? 'bg-green-100' :
                      activity.type === 'report' ? 'bg-blue-100' :
                        activity.type === 'calculation' ? 'bg-purple-100' :
                          activity.type === 'document' ? 'bg-amber-100' :
                            'bg-gray-100'
                    }`}>
                    {activity.type === 'payment' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                      activity.type === 'report' ? <FileText className="h-4 w-4 text-blue-600" /> :
                        activity.type === 'calculation' ? <Calculator className="h-4 w-4 text-purple-600" /> :
                          activity.type === 'document' ? <FileSpreadsheet className="h-4 w-4 text-amber-600" /> :
                            <Eye className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-xs">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.company}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            to="/tax/pph21"
            className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Percent className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700">PPh 21</span>
          </Link>
          <Link
            to="/tax/bpjs"
            className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-emerald-700">BPJS</span>
          </Link>
          <Link
            to="/tax/reports"
            className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-purple-700">Reports</span>
          </Link>
          <Link
            to="/tax/espt"
            className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-amber-700">e-SPT</span>
          </Link>
          <Link
            to="/payroll"
            className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-green-700">Payroll</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
