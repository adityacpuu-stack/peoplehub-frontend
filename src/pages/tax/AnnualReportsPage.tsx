import { useState, useMemo } from 'react';
import {
  CalendarRange,
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
  BarChart3,
  FileCheck,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnnualReport {
  id: string;
  year: number;
  company: string;
  companyId: string;
  reportType: '1721-A1' | '1721' | 'bukpot';
  totalEmployees: number;
  totalGrossIncome: number;
  totalPPh21: number;
  totalNetto: number;
  status: 'generated' | 'draft' | 'submitted' | 'verified';
  generatedDate?: string;
  submittedDate?: string;
  deadline: string;
}

// Mock data
const mockReports: AnnualReport[] = [
  {
    id: '1',
    year: 2024,
    company: 'PT Teknologi Maju',
    companyId: '1',
    reportType: '1721-A1',
    totalEmployees: 150,
    totalGrossIncome: 27000000000,
    totalPPh21: 1500000000,
    totalNetto: 25500000000,
    status: 'submitted',
    generatedDate: '2025-01-15',
    submittedDate: '2025-01-25',
    deadline: '2025-01-31',
  },
  {
    id: '2',
    year: 2024,
    company: 'PT Digital Solusi',
    companyId: '2',
    reportType: '1721-A1',
    totalEmployees: 85,
    totalGrossIncome: 15300000000,
    totalPPh21: 850000000,
    totalNetto: 14450000000,
    status: 'generated',
    generatedDate: '2025-01-20',
    deadline: '2025-01-31',
  },
  {
    id: '3',
    year: 2024,
    company: 'PT Inovasi Global',
    companyId: '3',
    reportType: '1721-A1',
    totalEmployees: 200,
    totalGrossIncome: 36000000000,
    totalPPh21: 2000000000,
    totalNetto: 34000000000,
    status: 'draft',
    deadline: '2025-01-31',
  },
  {
    id: '4',
    year: 2024,
    company: 'PT Teknologi Maju',
    companyId: '1',
    reportType: '1721',
    totalEmployees: 150,
    totalGrossIncome: 27000000000,
    totalPPh21: 1500000000,
    totalNetto: 25500000000,
    status: 'verified',
    generatedDate: '2025-01-15',
    submittedDate: '2025-01-25',
    deadline: '2025-04-30',
  },
  {
    id: '5',
    year: 2023,
    company: 'PT Teknologi Maju',
    companyId: '1',
    reportType: '1721-A1',
    totalEmployees: 140,
    totalGrossIncome: 25200000000,
    totalPPh21: 1400000000,
    totalNetto: 23800000000,
    status: 'verified',
    generatedDate: '2024-01-15',
    submittedDate: '2024-01-25',
    deadline: '2024-01-31',
  },
];

export function AnnualReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<AnnualReport | null>(null);

  // Filter reports
  const filteredReports = useMemo(() => {
    return mockReports.filter((report) => {
      const matchesSearch = report.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = selectedYear === 'all' || report.year.toString() === selectedYear;
      const matchesCompany = selectedCompany === 'all' || report.companyId === selectedCompany;
      const matchesType = selectedType === 'all' || report.reportType === selectedType;
      const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
      return matchesSearch && matchesYear && matchesCompany && matchesType && matchesStatus;
    });
  }, [searchTerm, selectedYear, selectedCompany, selectedType, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const year2024 = mockReports.filter((r) => r.year === 2024);
    return {
      totalReports: year2024.length,
      totalEmployees: year2024.reduce((sum, r) => sum + r.totalEmployees, 0),
      totalGross: year2024.reduce((sum, r) => sum + r.totalGrossIncome, 0),
      totalPPh: year2024.reduce((sum, r) => sum + r.totalPPh21, 0),
      submitted: year2024.filter((r) => r.status === 'submitted' || r.status === 'verified').length,
      pending: year2024.filter((r) => r.status === 'generated' || r.status === 'draft').length,
    };
  }, []);

  // Chart data - yearly comparison
  const yearlyComparison = [
    { year: '2022', gross: 45000000000, pph: 2500000000 },
    { year: '2023', gross: 52000000000, pph: 2900000000 },
    { year: '2024', gross: 78300000000, pph: 4350000000 },
  ];

  // Status distribution
  const statusData = [
    { name: 'Verified', value: mockReports.filter((r) => r.status === 'verified').length, color: '#10b981' },
    { name: 'Submitted', value: mockReports.filter((r) => r.status === 'submitted').length, color: '#3b82f6' },
    { name: 'Generated', value: mockReports.filter((r) => r.status === 'generated').length, color: '#f59e0b' },
    { name: 'Draft', value: mockReports.filter((r) => r.status === 'draft').length, color: '#6b7280' },
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
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <FileCheck className="w-3 h-3" />
            Verified
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <CheckCircle className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <FileText className="w-3 h-3" />
            Generated
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
      case '1721-A1':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Form 1721-A1</span>
        );
      case '1721':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">SPT 1721</span>
        );
      case 'bukpot':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Bukti Potong</span>
        );
      default:
        return null;
    }
  };

  const years = [
    { value: 'all', label: 'Semua Tahun' },
    { value: '2024', label: 'Tahun 2024' },
    { value: '2023', label: 'Tahun 2023' },
    { value: '2022', label: 'Tahun 2022' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CalendarRange className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Annual Reports</h1>
              <p className="text-indigo-100">Laporan tahunan PPh 21 (1721-A1, SPT 1721)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm">
              <Download className="w-4 h-4" />
              Export All
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
              <FileSpreadsheet className="w-4 h-4" />
              Generate Annual
            </button>
          </div>
        </div>
      </div>

      {/* Deadline Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-amber-800">Deadline Pelaporan 1721-A1</p>
            <p className="text-sm text-amber-600">Batas akhir pelaporan Form 1721-A1 tahun 2024: 31 Januari 2025</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Karyawan 2024</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Penghasilan Bruto</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalGross)}</p>
              <p className="text-xs text-emerald-600 mt-1">+50% dari 2023</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total PPh 21</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalPPh)}</p>
              <p className="text-xs text-gray-400 mt-1">Tahun 2024</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Laporan Disubmit</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.submitted}</p>
              <p className="text-xs text-amber-600 mt-1">{stats.pending} pending</p>
            </div>
            <div className="p-3 bg-cyan-100 rounded-xl">
              <FileCheck className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yearly Comparison */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Perbandingan Tahunan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000000).toFixed(0)}B`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="gross" name="Penghasilan Bruto" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph" name="PPh 21" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Laporan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {years.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">Semua Tipe</option>
                <option value="1721-A1">Form 1721-A1</option>
                <option value="1721">SPT 1721</option>
                <option value="bukpot">Bukti Potong</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="verified">Verified</option>
                <option value="submitted">Submitted</option>
                <option value="generated">Generated</option>
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
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tahun
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Karyawan
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total PPh 21
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
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {report.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{report.company}</p>
                          <p className="text-sm text-gray-500">Deadline: {report.deadline}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-gray-900">{report.year}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getReportTypeBadge(report.reportType)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        {report.totalEmployees}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(report.totalPPh21)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                <h3 className="text-lg font-semibold text-gray-900">Detail Laporan Tahunan</h3>
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
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedReport.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900">{selectedReport.company}</h4>
                  <p className="text-gray-500">Tahun Pajak {selectedReport.year}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getReportTypeBadge(selectedReport.reportType)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total Karyawan</p>
                  <p className="text-2xl font-bold text-indigo-600">{selectedReport.totalEmployees}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Deadline</p>
                  <p className="text-lg font-bold text-gray-900">{selectedReport.deadline}</p>
                </div>
              </div>

              {/* Income Summary */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Ringkasan Penghasilan</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penghasilan Bruto</span>
                    <span className="font-medium">{formatCurrency(selectedReport.totalGrossIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total PPh 21 Dipotong</span>
                    <span className="font-medium text-blue-600">{formatCurrency(selectedReport.totalPPh21)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-medium text-gray-900">Penghasilan Netto</span>
                    <span className="font-bold text-gray-900">{formatCurrency(selectedReport.totalNetto)}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Timeline</h5>
                <div className="space-y-2">
                  {selectedReport.generatedDate && (
                    <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-gray-600">Generated</span>
                      <span className="font-medium">{selectedReport.generatedDate}</span>
                    </div>
                  )}
                  {selectedReport.submittedDate && (
                    <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-gray-600">Submitted</span>
                      <span className="font-medium">{selectedReport.submittedDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
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
