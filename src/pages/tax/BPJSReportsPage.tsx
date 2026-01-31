import { useState, useEffect, useMemo } from 'react';
import {
  FileBarChart,
  Search,
  Download,
  Building2,
  Calendar,
  ChevronDown,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Heart,
  HardHat,
  TrendingUp,
  Users,
  Printer,
  Mail,
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
} from 'recharts';
import { companyService, type Company } from '@/services/company.service';

interface BPJSReport {
  id: string;
  reportType: 'kesehatan' | 'ketenagakerjaan' | 'combined';
  period: string;
  company: string;
  companyId: string;
  totalEmployees: number;
  totalKesehatan: number;
  totalKetenagakerjaan: number;
  totalAmount: number;
  status: 'submitted' | 'pending' | 'draft';
  submittedDate?: string;
  dueDate: string;
  createdBy: string;
}

// Mock data for reports
const mockReports: BPJSReport[] = [
  {
    id: '1',
    reportType: 'combined',
    period: '2025-01',
    company: 'PT Teknologi Maju',
    companyId: '1',
    totalEmployees: 150,
    totalKesehatan: 75000000,
    totalKetenagakerjaan: 112500000,
    totalAmount: 187500000,
    status: 'submitted',
    submittedDate: '2025-01-15',
    dueDate: '2025-01-15',
    createdBy: 'Tax Admin',
  },
  {
    id: '2',
    reportType: 'kesehatan',
    period: '2025-01',
    company: 'PT Digital Solusi',
    companyId: '2',
    totalEmployees: 85,
    totalKesehatan: 42500000,
    totalKetenagakerjaan: 0,
    totalAmount: 42500000,
    status: 'pending',
    dueDate: '2025-01-15',
    createdBy: 'Tax Admin',
  },
  {
    id: '3',
    reportType: 'ketenagakerjaan',
    period: '2025-01',
    company: 'PT Inovasi Global',
    companyId: '3',
    totalEmployees: 200,
    totalKesehatan: 0,
    totalKetenagakerjaan: 150000000,
    totalAmount: 150000000,
    status: 'draft',
    dueDate: '2025-01-15',
    createdBy: 'Tax Admin',
  },
  {
    id: '4',
    reportType: 'combined',
    period: '2024-12',
    company: 'PT Teknologi Maju',
    companyId: '1',
    totalEmployees: 148,
    totalKesehatan: 74000000,
    totalKetenagakerjaan: 111000000,
    totalAmount: 185000000,
    status: 'submitted',
    submittedDate: '2024-12-14',
    dueDate: '2024-12-15',
    createdBy: 'Tax Admin',
  },
  {
    id: '5',
    reportType: 'combined',
    period: '2024-12',
    company: 'PT Digital Solusi',
    companyId: '2',
    totalEmployees: 82,
    totalKesehatan: 41000000,
    totalKetenagakerjaan: 61500000,
    totalAmount: 102500000,
    status: 'submitted',
    submittedDate: '2024-12-15',
    dueDate: '2024-12-15',
    createdBy: 'Tax Admin',
  },
];

export function BPJSReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<BPJSReport | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await companyService.getAll();
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports
  const filteredReports = useMemo(() => {
    return mockReports.filter((report) => {
      const matchesSearch = report.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = selectedCompany === 'all' || report.companyId === selectedCompany;
      const matchesPeriod = selectedPeriod === 'all' || report.period === selectedPeriod;
      const matchesType = selectedType === 'all' || report.reportType === selectedType;
      const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
      return matchesSearch && matchesCompany && matchesPeriod && matchesType && matchesStatus;
    });
  }, [searchTerm, selectedCompany, selectedPeriod, selectedType, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const submitted = mockReports.filter((r) => r.status === 'submitted').length;
    const pending = mockReports.filter((r) => r.status === 'pending').length;
    const draft = mockReports.filter((r) => r.status === 'draft').length;
    const totalKesehatan = mockReports.reduce((sum, r) => sum + r.totalKesehatan, 0);
    const totalKetenagakerjaan = mockReports.reduce((sum, r) => sum + r.totalKetenagakerjaan, 0);
    return { submitted, pending, draft, totalKesehatan, totalKetenagakerjaan };
  }, []);

  // Chart data
  const trendData = [
    { month: 'Aug', kesehatan: 180000000, ketenagakerjaan: 280000000 },
    { month: 'Sep', kesehatan: 185000000, ketenagakerjaan: 290000000 },
    { month: 'Oct', kesehatan: 190000000, ketenagakerjaan: 295000000 },
    { month: 'Nov', kesehatan: 195000000, ketenagakerjaan: 300000000 },
    { month: 'Dec', kesehatan: 200000000, ketenagakerjaan: 310000000 },
    { month: 'Jan', kesehatan: stats.totalKesehatan, ketenagakerjaan: stats.totalKetenagakerjaan },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <FileText className="w-3 h-3" />
            Draft
          </span>
        );
      default:
        return null;
    }
  };

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'kesehatan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
            <Heart className="w-3 h-3" />
            Kesehatan
          </span>
        );
      case 'ketenagakerjaan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <HardHat className="w-3 h-3" />
            Ketenagakerjaan
          </span>
        );
      case 'combined':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <FileBarChart className="w-3 h-3" />
            Combined
          </span>
        );
      default:
        return null;
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileBarChart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BPJS Reports</h1>
              <p className="text-indigo-100">Laporan iuran BPJS Kesehatan & Ketenagakerjaan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm">
              <Download className="w-4 h-4" />
              Export All
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
              <FileText className="w-4 h-4" />
              New Report
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.submitted}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Draft</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.draft}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-xl">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Kesehatan</p>
              <p className="text-lg font-bold text-rose-600 mt-1">{formatCurrency(stats.totalKesehatan)}</p>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl">
              <Heart className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Ketenagakerjaan</p>
              <p className="text-lg font-bold text-amber-600 mt-1">{formatCurrency(stats.totalKetenagakerjaan)}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <HardHat className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Laporan BPJS</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="kesehatan"
                name="BPJS Kesehatan"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ fill: '#f43f5e' }}
              />
              <Line
                type="monotone"
                dataKey="ketenagakerjaan"
                name="BPJS Ketenagakerjaan"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
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
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">Semua Tipe</option>
                <option value="kesehatan">Kesehatan</option>
                <option value="ketenagakerjaan">Ketenagakerjaan</option>
                <option value="combined">Combined</option>
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
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
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
                  Total
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
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
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                          {report.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{report.company}</p>
                          <p className="text-sm text-gray-500">Due: {report.dueDate}</p>
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
                      <span className="font-bold text-gray-900">{formatCurrency(report.totalAmount)}</span>
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
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
                <h3 className="text-lg font-semibold text-gray-900">Detail Laporan BPJS</h3>
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
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
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

              {/* Report Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total Karyawan</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedReport.totalEmployees}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedReport.dueDate}</p>
                </div>
              </div>

              {/* BPJS Breakdown */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Rincian Iuran</h5>
                <div className="space-y-3">
                  {selectedReport.totalKesehatan > 0 && (
                    <div className="bg-rose-50 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg">
                          <Heart className="w-5 h-5 text-rose-600" />
                        </div>
                        <span className="font-medium text-gray-900">BPJS Kesehatan</span>
                      </div>
                      <span className="font-bold text-rose-600">{formatCurrency(selectedReport.totalKesehatan)}</span>
                    </div>
                  )}
                  {selectedReport.totalKetenagakerjaan > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <HardHat className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="font-medium text-gray-900">BPJS Ketenagakerjaan</span>
                      </div>
                      <span className="font-bold text-amber-600">
                        {formatCurrency(selectedReport.totalKetenagakerjaan)}
                      </span>
                    </div>
                  )}
                  <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total Keseluruhan</span>
                    <span className="font-bold text-indigo-600 text-xl">
                      {formatCurrency(selectedReport.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submission Info */}
              {selectedReport.submittedDate && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Submitted on {selectedReport.submittedDate}</span>
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
              <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
