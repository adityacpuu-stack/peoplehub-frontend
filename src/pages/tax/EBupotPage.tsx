import { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Download,
  ChevronDown,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  Plus,
  Printer,
  Mail,
  Send,
  Users,
  Building2,
  Calendar,
  TrendingUp,
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

interface EBupotRecord {
  id: string;
  bupotNumber: string;
  bupotType: 'pph21' | 'pph23' | 'pph26';
  period: string;
  recipientName: string;
  recipientNpwp: string;
  recipientNik?: string;
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  status: 'issued' | 'draft' | 'sent';
  issuedDate?: string;
  sentDate?: string;
  incomeType: string;
}

// Mock data
const mockBupotRecords: EBupotRecord[] = [
  {
    id: '1',
    bupotNumber: 'BP21-2501-00001',
    bupotType: 'pph21',
    period: '2025-01',
    recipientName: 'Ahmad Sulaiman',
    recipientNpwp: '12.345.678.9-012.000',
    recipientNik: '3201234567890001',
    grossAmount: 15000000,
    taxRate: 5,
    taxAmount: 750000,
    status: 'issued',
    issuedDate: '2025-01-25',
    incomeType: 'Gaji & Tunjangan',
  },
  {
    id: '2',
    bupotNumber: 'BP23-2501-00001',
    bupotType: 'pph23',
    period: '2025-01',
    recipientName: 'PT Konsultan Prima',
    recipientNpwp: '01.234.567.8-901.000',
    grossAmount: 50000000,
    taxRate: 2,
    taxAmount: 1000000,
    status: 'sent',
    issuedDate: '2025-01-20',
    sentDate: '2025-01-21',
    incomeType: 'Jasa Konsultan',
  },
  {
    id: '3',
    bupotNumber: 'BP23-2501-00002',
    bupotType: 'pph23',
    period: '2025-01',
    recipientName: 'CV Teknologi Kreatif',
    recipientNpwp: '02.345.678.9-012.000',
    grossAmount: 25000000,
    taxRate: 2,
    taxAmount: 500000,
    status: 'draft',
    incomeType: 'Jasa Teknik',
  },
  {
    id: '4',
    bupotNumber: 'BP21-2501-00002',
    bupotType: 'pph21',
    period: '2025-01',
    recipientName: 'Budi Santoso',
    recipientNpwp: '23.456.789.0-123.000',
    recipientNik: '3201234567890002',
    grossAmount: 12000000,
    taxRate: 5,
    taxAmount: 600000,
    status: 'issued',
    issuedDate: '2025-01-25',
    incomeType: 'Honorarium',
  },
  {
    id: '5',
    bupotNumber: 'BP26-2501-00001',
    bupotType: 'pph26',
    period: '2025-01',
    recipientName: 'John Smith (Singapore)',
    recipientNpwp: '-',
    grossAmount: 100000000,
    taxRate: 20,
    taxAmount: 20000000,
    status: 'sent',
    issuedDate: '2025-01-15',
    sentDate: '2025-01-16',
    incomeType: 'Royalty',
  },
];

export function EBupotPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<EBupotRecord | null>(null);

  // Filter records
  const filteredRecords = useMemo(() => {
    return mockBupotRecords.filter((record) => {
      const matchesSearch =
        record.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.bupotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.recipientNpwp.includes(searchTerm);
      const matchesPeriod = selectedPeriod === 'all' || record.period === selectedPeriod;
      const matchesType = selectedType === 'all' || record.bupotType === selectedType;
      const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
      return matchesSearch && matchesPeriod && matchesType && matchesStatus;
    });
  }, [searchTerm, selectedPeriod, selectedType, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const issued = mockBupotRecords.filter((r) => r.status === 'issued').length;
    const sent = mockBupotRecords.filter((r) => r.status === 'sent').length;
    const draft = mockBupotRecords.filter((r) => r.status === 'draft').length;
    const totalTax = mockBupotRecords.reduce((sum, r) => sum + r.taxAmount, 0);
    const totalGross = mockBupotRecords.reduce((sum, r) => sum + r.grossAmount, 0);
    return { issued, sent, draft, totalTax, totalGross, total: mockBupotRecords.length };
  }, []);

  // Chart data
  const bupotTypeData = [
    {
      name: 'PPh 21',
      value: mockBupotRecords.filter((r) => r.bupotType === 'pph21').reduce((s, r) => s + r.taxAmount, 0),
      color: '#3b82f6',
    },
    {
      name: 'PPh 23',
      value: mockBupotRecords.filter((r) => r.bupotType === 'pph23').reduce((s, r) => s + r.taxAmount, 0),
      color: '#8b5cf6',
    },
    {
      name: 'PPh 26',
      value: mockBupotRecords.filter((r) => r.bupotType === 'pph26').reduce((s, r) => s + r.taxAmount, 0),
      color: '#f59e0b',
    },
  ];

  const monthlyData = [
    { month: 'Sep', pph21: 35, pph23: 48, pph26: 5 },
    { month: 'Oct', pph21: 42, pph23: 52, pph26: 8 },
    { month: 'Nov', pph21: 38, pph23: 55, pph26: 6 },
    { month: 'Dec', pph21: 45, pph23: 60, pph26: 10 },
    { month: 'Jan', pph21: 40, pph23: 58, pph26: 7 },
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
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Issued
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Mail className="w-3 h-3" />
            Sent
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

  const getBupotTypeBadge = (type: string) => {
    switch (type) {
      case 'pph21':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">PPh 21</span>;
      case 'pph23':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">PPh 23</span>;
      case 'pph26':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">PPh 26</span>;
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
      <div className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Receipt className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">e-Bupot</h1>
              <p className="text-violet-100">Kelola Bukti Potong PPh 21, 23, dan 26</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-violet-600 rounded-lg hover:bg-violet-50 transition-colors font-medium">
              <Plus className="w-4 h-4" />
              Buat Bupot
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bupot</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-violet-100 rounded-xl">
              <Receipt className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Issued</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.issued}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sent</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.sent}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Mail className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm text-gray-500">Total Pajak Dipotong</p>
              <p className="text-lg font-bold text-violet-600 mt-1">{formatCurrency(stats.totalTax)}</p>
            </div>
            <div className="p-3 bg-violet-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jumlah Bupot per Bulan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Bar dataKey="pph21" name="PPh 21" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph23" name="PPh 23" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph26" name="PPh 26" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Pajak</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bupotTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bupotTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
              placeholder="Cari nama, nomor bupot, atau NPWP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="all">Semua Jenis</option>
                <option value="pph21">PPh 21</option>
                <option value="pph23">PPh 23</option>
                <option value="pph26">PPh 26</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="issued">Issued</option>
                <option value="sent">Sent</option>
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
                  No. Bupot
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Penerima
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Jenis
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Bruto
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tarif
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pajak
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono font-medium text-violet-600">{record.bupotNumber}</p>
                        <p className="text-sm text-gray-500">{formatPeriod(record.period)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{record.recipientName}</p>
                        <p className="text-sm text-gray-500 font-mono">{record.recipientNpwp}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{getBupotTypeBadge(record.bupotType)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-900">{formatCurrency(record.grossAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">{record.taxRate}%</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-violet-600">{formatCurrency(record.taxAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {record.status === 'issued' && (
                          <button
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Send"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
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
                <h3 className="text-lg font-semibold text-gray-900">Detail Bukti Potong</h3>
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
              {/* Bupot Header */}
              <div className="text-center">
                <p className="text-sm text-gray-500">Nomor Bukti Potong</p>
                <p className="text-xl font-bold font-mono text-violet-600">{selectedRecord.bupotNumber}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {getBupotTypeBadge(selectedRecord.bupotType)}
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>

              {/* Recipient Info */}
              <div className="bg-violet-50 rounded-xl p-4 space-y-3">
                <h5 className="font-medium text-violet-900">Penerima Penghasilan</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama</span>
                    <span className="font-medium">{selectedRecord.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NPWP</span>
                    <span className="font-mono">{selectedRecord.recipientNpwp}</span>
                  </div>
                  {selectedRecord.recipientNik && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">NIK</span>
                      <span className="font-mono">{selectedRecord.recipientNik}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Income Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h5 className="font-medium text-gray-900">Rincian Penghasilan</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jenis Penghasilan</span>
                    <span className="font-medium">{selectedRecord.incomeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Masa Pajak</span>
                    <span className="font-medium">{formatPeriod(selectedRecord.period)}</span>
                  </div>
                </div>
              </div>

              {/* Tax Calculation */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Perhitungan Pajak</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penghasilan Bruto</span>
                    <span className="font-medium">{formatCurrency(selectedRecord.grossAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tarif Pajak</span>
                    <span className="font-medium">{selectedRecord.taxRate}%</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-medium text-gray-900">Pajak Dipotong</span>
                    <span className="font-bold text-violet-600 text-lg">{formatCurrency(selectedRecord.taxAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              {(selectedRecord.issuedDate || selectedRecord.sentDate) && (
                <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
                  {selectedRecord.issuedDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal Terbit</span>
                      <span className="font-medium">{selectedRecord.issuedDate}</span>
                    </div>
                  )}
                  {selectedRecord.sentDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal Kirim</span>
                      <span className="font-medium">{selectedRecord.sentDate}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedRecord(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors">
                <Printer className="w-4 h-4" />
                Cetak Bupot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
