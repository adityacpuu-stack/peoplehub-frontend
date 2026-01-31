import { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Download,
  ChevronDown,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Send,
  Calendar,
  Building2,
  FileCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface ESPTRecord {
  id: string;
  taxType: 'pph21' | 'pph23' | 'pph4_2';
  period: string;
  company: string;
  npwp: string;
  totalTax: number;
  totalEmployees: number;
  status: 'submitted' | 'pending' | 'draft' | 'rejected';
  submittedDate?: string;
  dueDate: string;
  ntpn?: string;
  receiptNumber?: string;
  rejectionReason?: string;
}

// Mock data
const mockESPTRecords: ESPTRecord[] = [
  {
    id: '1',
    taxType: 'pph21',
    period: '2025-01',
    company: 'PT Teknologi Maju',
    npwp: '01.234.567.8-901.000',
    totalTax: 125000000,
    totalEmployees: 150,
    status: 'submitted',
    submittedDate: '2025-01-20',
    dueDate: '2025-01-20',
    ntpn: 'NTPN202501001234',
    receiptNumber: 'BPE-202501-00123',
  },
  {
    id: '2',
    taxType: 'pph21',
    period: '2025-01',
    company: 'PT Digital Solusi',
    npwp: '02.345.678.9-012.000',
    totalTax: 85000000,
    totalEmployees: 85,
    status: 'pending',
    dueDate: '2025-01-20',
  },
  {
    id: '3',
    taxType: 'pph23',
    period: '2025-01',
    company: 'PT Teknologi Maju',
    npwp: '01.234.567.8-901.000',
    totalTax: 45000000,
    totalEmployees: 25,
    status: 'draft',
    dueDate: '2025-01-20',
  },
  {
    id: '4',
    taxType: 'pph21',
    period: '2024-12',
    company: 'PT Teknologi Maju',
    npwp: '01.234.567.8-901.000',
    totalTax: 120000000,
    totalEmployees: 148,
    status: 'submitted',
    submittedDate: '2024-12-19',
    dueDate: '2024-12-20',
    ntpn: 'NTPN202412001234',
    receiptNumber: 'BPE-202412-00098',
  },
  {
    id: '5',
    taxType: 'pph23',
    period: '2024-12',
    company: 'PT Digital Solusi',
    npwp: '02.345.678.9-012.000',
    totalTax: 32000000,
    totalEmployees: 18,
    status: 'rejected',
    dueDate: '2024-12-20',
    rejectionReason: 'Data tidak lengkap',
  },
];

export function ESPTPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedTaxType, setSelectedTaxType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ESPTRecord | null>(null);

  // Filter records
  const filteredRecords = useMemo(() => {
    return mockESPTRecords.filter((record) => {
      const matchesSearch =
        record.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.npwp.includes(searchTerm);
      const matchesPeriod = selectedPeriod === 'all' || record.period === selectedPeriod;
      const matchesTaxType = selectedTaxType === 'all' || record.taxType === selectedTaxType;
      const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
      return matchesSearch && matchesPeriod && matchesTaxType && matchesStatus;
    });
  }, [searchTerm, selectedPeriod, selectedTaxType, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const submitted = mockESPTRecords.filter((r) => r.status === 'submitted').length;
    const pending = mockESPTRecords.filter((r) => r.status === 'pending').length;
    const draft = mockESPTRecords.filter((r) => r.status === 'draft').length;
    const rejected = mockESPTRecords.filter((r) => r.status === 'rejected').length;
    const totalTax = mockESPTRecords
      .filter((r) => r.status === 'submitted')
      .reduce((sum, r) => sum + r.totalTax, 0);
    return { submitted, pending, draft, rejected, totalTax };
  }, []);

  // Chart data
  const taxTypeData = [
    { name: 'PPh 21', value: mockESPTRecords.filter((r) => r.taxType === 'pph21').length, color: '#3b82f6' },
    { name: 'PPh 23', value: mockESPTRecords.filter((r) => r.taxType === 'pph23').length, color: '#8b5cf6' },
    { name: 'PPh 4(2)', value: mockESPTRecords.filter((r) => r.taxType === 'pph4_2').length, color: '#10b981' },
  ];

  const monthlyData = [
    { month: 'Sep', pph21: 95000000, pph23: 28000000 },
    { month: 'Oct', pph21: 102000000, pph23: 31000000 },
    { month: 'Nov', pph21: 115000000, pph23: 35000000 },
    { month: 'Dec', pph21: 120000000, pph23: 32000000 },
    { month: 'Jan', pph21: 125000000, pph23: 45000000 },
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
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const getTaxTypeBadge = (type: string) => {
    switch (type) {
      case 'pph21':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">PPh 21</span>;
      case 'pph23':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">PPh 23</span>;
      case 'pph4_2':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">PPh 4(2)</span>;
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
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">e-SPT</h1>
              <p className="text-blue-100">Kelola dan lapor SPT Masa Pajak secara elektronik</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm">
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
              <FileText className="w-4 h-4" />
              Buat SPT Baru
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
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Pajak Dilaporkan</p>
              <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(stats.totalTax)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Pelaporan Bulanan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="pph21" name="PPh 21" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph23" name="PPh 23" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax Type Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Jenis Pajak</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taxTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taxTypeData.map((entry, index) => (
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
              placeholder="Cari perusahaan atau NPWP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                value={selectedTaxType}
                onChange={(e) => setSelectedTaxType(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Semua Jenis</option>
                <option value="pph21">PPh 21</option>
                <option value="pph23">PPh 23</option>
                <option value="pph4_2">PPh 4(2)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected</option>
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
                  Jenis Pajak
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Pajak
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  No. BPE
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{record.company}</p>
                        <p className="text-sm text-gray-500 font-mono">{record.npwp}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{formatPeriod(record.period)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getTaxTypeBadge(record.taxType)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(record.totalTax)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4">
                      {record.receiptNumber ? (
                        <span className="font-mono text-sm text-blue-600">{record.receiptNumber}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {record.status === 'draft' && (
                          <button
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Submit"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {record.status === 'rejected' && (
                          <button
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Resubmit"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
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
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detail e-SPT</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
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
              {/* Company Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedRecord.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{selectedRecord.company}</h4>
                  <p className="text-gray-500 font-mono text-sm">{selectedRecord.npwp}</p>
                </div>
              </div>

              {/* SPT Details */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Jenis Pajak</span>
                  {getTaxTypeBadge(selectedRecord.taxType)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Masa Pajak</span>
                  <span className="font-medium">{formatPeriod(selectedRecord.period)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jumlah WP</span>
                  <span className="font-medium">{selectedRecord.totalEmployees} orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date</span>
                  <span className="font-medium">{selectedRecord.dueDate}</span>
                </div>
              </div>

              {/* Tax Amount */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Pajak Terutang</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(selectedRecord.totalTax)}</span>
                </div>
              </div>

              {/* Status Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Status</span>
                  {getStatusBadge(selectedRecord.status)}
                </div>

                {selectedRecord.status === 'submitted' && (
                  <>
                    <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tanggal Submit</span>
                        <span className="font-medium">{selectedRecord.submittedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">No. BPE</span>
                        <span className="font-mono font-medium text-emerald-600">{selectedRecord.receiptNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">NTPN</span>
                        <span className="font-mono font-medium">{selectedRecord.ntpn}</span>
                      </div>
                    </div>
                  </>
                )}

                {selectedRecord.status === 'rejected' && (
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Alasan Penolakan:</span>
                    </div>
                    <p className="mt-2 text-red-600">{selectedRecord.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedRecord(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              {selectedRecord.status === 'submitted' && (
                <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Download className="w-4 h-4" />
                  Download BPE
                </button>
              )}
              {selectedRecord.status === 'draft' && (
                <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                  <Send className="w-4 h-4" />
                  Submit SPT
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
