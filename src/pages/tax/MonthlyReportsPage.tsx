import { useState, useMemo } from 'react';
import {
  CalendarDays,
  Search,
  Download,
  ChevronDown,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  Building2,
  TrendingUp,
  Users,
  Printer,
  FileSpreadsheet,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface MonthlyReport {
  id: string;
  period: string;
  company: string;
  companyId: string;
  reportType: 'pph21' | 'pph23' | 'bpjs' | 'all';
  totalEmployees: number;
  grossPayroll: number;
  totalPPh21: number;
  totalPPh23: number;
  totalBPJS: number;
  totalDeductions: number;
  status: 'generated' | 'draft' | 'submitted';
  generatedDate?: string;
  generatedBy: string;
}

// Mock data
const mockReports: MonthlyReport[] = [
  {
    id: '1',
    period: '2025-01',
    company: 'PT Teknologi Maju',
    companyId: '1',
    reportType: 'all',
    totalEmployees: 150,
    grossPayroll: 2250000000,
    totalPPh21: 125000000,
    totalPPh23: 45000000,
    totalBPJS: 187500000,
    totalDeductions: 357500000,
    status: 'generated',
    generatedDate: '2025-01-28',
    generatedBy: 'Tax Admin',
  },
  {
    id: '2',
    period: '2025-01',
    company: 'PT Digital Solusi',
    companyId: '2',
    reportType: 'pph21',
    totalEmployees: 85,
    grossPayroll: 1275000000,
    totalPPh21: 85000000,
    totalPPh23: 0,
    totalBPJS: 0,
    totalDeductions: 85000000,
    status: 'draft',
    generatedBy: 'Tax Admin',
  },
  {
    id: '3',
    period: '2024-12',
    company: 'PT Teknologi Maju',
    companyId: '1',
    reportType: 'all',
    totalEmployees: 148,
    grossPayroll: 2220000000,
    totalPPh21: 120000000,
    totalPPh23: 42000000,
    totalBPJS: 185000000,
    totalDeductions: 347000000,
    status: 'submitted',
    generatedDate: '2024-12-28',
    generatedBy: 'Tax Admin',
  },
  {
    id: '4',
    period: '2024-12',
    company: 'PT Inovasi Global',
    companyId: '3',
    reportType: 'bpjs',
    totalEmployees: 200,
    grossPayroll: 3000000000,
    totalPPh21: 0,
    totalPPh23: 0,
    totalBPJS: 250000000,
    totalDeductions: 250000000,
    status: 'submitted',
    generatedDate: '2024-12-27',
    generatedBy: 'Tax Admin',
  },
];

export function MonthlyReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);

  // Filter reports
  const filteredReports = useMemo(() => {
    return mockReports.filter((report) => {
      const matchesSearch = report.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPeriod = selectedPeriod === 'all' || report.period === selectedPeriod;
      const matchesCompany = selectedCompany === 'all' || report.companyId === selectedCompany;
      const matchesType = selectedType === 'all' || report.reportType === selectedType;
      const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
      return matchesSearch && matchesPeriod && matchesCompany && matchesType && matchesStatus;
    });
  }, [searchTerm, selectedPeriod, selectedCompany, selectedType, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const currentMonth = mockReports.filter((r) => r.period === '2025-01');
    return {
      totalReports: currentMonth.length,
      totalEmployees: currentMonth.reduce((sum, r) => sum + r.totalEmployees, 0),
      totalPayroll: currentMonth.reduce((sum, r) => sum + r.grossPayroll, 0),
      totalTax: currentMonth.reduce((sum, r) => sum + r.totalDeductions, 0),
      generated: currentMonth.filter((r) => r.status === 'generated').length,
      draft: currentMonth.filter((r) => r.status === 'draft').length,
    };
  }, []);

  // Chart data
  const monthlyTrend = [
    { month: 'Aug', pph21: 95000000, pph23: 35000000, bpjs: 160000000 },
    { month: 'Sep', pph21: 102000000, pph23: 38000000, bpjs: 168000000 },
    { month: 'Oct', pph21: 108000000, pph23: 40000000, bpjs: 175000000 },
    { month: 'Nov', pph21: 115000000, pph23: 42000000, bpjs: 180000000 },
    { month: 'Dec', pph21: 120000000, pph23: 42000000, bpjs: 185000000 },
    { month: 'Jan', pph21: 125000000, pph23: 45000000, bpjs: 187500000 },
  ];

  const payrollTrend = [
    { month: 'Aug', amount: 3100000000 },
    { month: 'Sep', amount: 3250000000 },
    { month: 'Oct', amount: 3400000000 },
    { month: 'Nov', amount: 3500000000 },
    { month: 'Dec', amount: 3525000000 },
    { month: 'Jan', amount: 3525000000 },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    return `${(value / 1000000).toFixed(0)}M`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Generated
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <FileText className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      default:
        return null;
    }
  };

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'pph21':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">PPh 21</span>;
      case 'pph23':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">PPh 23</span>;
      case 'bpjs':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">BPJS</span>;
      case 'all':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">All</span>;
      default:
        return null;
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const periods = [
    { value: 'all', label: 'Semua Periode' },
    { value: '2025-01', label: 'January 2025' },
    { value: '2024-12', label: 'December 2024' },
    { value: '2024-11', label: 'November 2024' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CalendarDays className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Monthly Reports</h1>
              <p className="text-teal-100">Laporan pajak dan BPJS bulanan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm">
              <Download className="w-4 h-4" />
              Export All
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-medium">
              <FileSpreadsheet className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Karyawan</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
              <p className="text-xs text-gray-400 mt-1">Periode Jan 2025</p>
            </div>
            <div className="p-3 bg-teal-100 rounded-xl">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Payroll</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalPayroll)}</p>
              <p className="text-xs text-emerald-600 mt-1">+2.5% dari bulan lalu</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Pajak & BPJS</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalTax)}</p>
              <p className="text-xs text-gray-400 mt-1">PPh 21, 23, BPJS</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <PieChartIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Laporan Dibuat</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.generated}</p>
              <p className="text-xs text-amber-600 mt-1">{stats.draft} draft</p>
            </div>
            <div className="p-3 bg-cyan-100 rounded-xl">
              <FileText className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Breakdown Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Pajak & BPJS</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="pph21" name="PPh 21" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph23" name="PPh 23" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bpjs" name="BPJS" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payroll Trend Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Payroll</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000000).toFixed(1)}B`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Total Payroll"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari perusahaan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {periods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="all">Semua Tipe</option>
                <option value="pph21">PPh 21</option>
                <option value="pph23">PPh 23</option>
                <option value="bpjs">BPJS</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="generated">Generated</option>
                <option value="submitted">Submitted</option>
                <option value="draft">Draft</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Perusahaan
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Karyawan
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Potongan
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                    Tidak ada laporan ditemukan
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                          {report.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{report.company}</p>
                          <p className="text-sm text-gray-500">{report.generatedBy}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{formatPeriod(report.period)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getReportTypeBadge(report.reportType)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        {report.totalEmployees}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(report.totalDeductions)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detail Laporan Bulanan</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedReport.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900">{selectedReport.company}</h4>
                  <p className="text-gray-500">{formatPeriod(selectedReport.period)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getReportTypeBadge(selectedReport.reportType)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total Karyawan</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedReport.totalEmployees}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Gross Payroll</p>
                  <p className="text-lg font-bold text-gray-900">{formatShortCurrency(selectedReport.grossPayroll)}</p>
                </div>
              </div>

              {/* Tax Breakdown */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Rincian Potongan</h5>
                <div className="space-y-3">
                  {selectedReport.totalPPh21 > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                      <span className="font-medium text-gray-900">PPh 21</span>
                      <span className="font-bold text-blue-600">{formatCurrency(selectedReport.totalPPh21)}</span>
                    </div>
                  )}
                  {selectedReport.totalPPh23 > 0 && (
                    <div className="bg-purple-50 rounded-xl p-4 flex items-center justify-between">
                      <span className="font-medium text-gray-900">PPh 23</span>
                      <span className="font-bold text-purple-600">{formatCurrency(selectedReport.totalPPh23)}</span>
                    </div>
                  )}
                  {selectedReport.totalBPJS > 0 && (
                    <div className="bg-teal-50 rounded-xl p-4 flex items-center justify-between">
                      <span className="font-medium text-gray-900">BPJS (Kes + TK)</span>
                      <span className="font-bold text-teal-600">{formatCurrency(selectedReport.totalBPJS)}</span>
                    </div>
                  )}
                  <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total Potongan</span>
                    <span className="font-bold text-gray-900 text-xl">
                      {formatCurrency(selectedReport.totalDeductions)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated Info */}
              {selectedReport.generatedDate && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Dibuat pada</span>
                    <span className="font-medium">{selectedReport.generatedDate} oleh {selectedReport.generatedBy}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
