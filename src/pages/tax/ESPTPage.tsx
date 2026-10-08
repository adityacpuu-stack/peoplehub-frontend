import { insightNumber, insightFixed, insightDate } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Eye, FileText, CheckCircle, Clock, AlertCircle, Upload, Send, AlertTriangle, RefreshCw } from 'lucide-react';
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
  useLocale();
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
    { name: t('PPh 21'), value: mockESPTRecords.filter((r) => r.taxType === 'pph21').length, color: '#3b82f6' },
    { name: t('PPh 23'), value: mockESPTRecords.filter((r) => r.taxType === 'pph23').length, color: '#8b5cf6' },
    { name: t('PPh 4(2)'), value: mockESPTRecords.filter((r) => r.taxType === 'pph4_2').length, color: '#10b981' },
  ];

  const monthlyData = [
    { month: t('Sep'), pph21: 95000000, pph23: 28000000 },
    { month: t('Oct'), pph21: 102000000, pph23: 31000000 },
    { month: t('Nov'), pph21: 115000000, pph23: 35000000 },
    { month: t('Dec'), pph21: 120000000, pph23: 32000000 },
    { month: t('Jan'), pph21: 125000000, pph23: 45000000 },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
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
            <CheckCircle className="w-3 h-3" />{t("Submitted")} </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />{t("Pending")} </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <FileText className="w-3 h-3" />{t("Draft")} </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3" />{t("Rejected")} </span>
        );
      default:
        return null;
    }
  };

  const getTaxTypeBadge = (type: string) => {
    switch (type) {
      case 'pph21':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{t("PPh 21")}</span>;
      case 'pph23':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t("PPh 23")}</span>;
      case 'pph4_2':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{t("PPh 4(2)")}</span>;
      default:
        return null;
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${t(months[parseInt(month) - 1])} ${year}`;
  };

  const periods = [
    { value: 'all', get label() { return t('Semua Periode'); } },
    { value: '2025-01', get label() { return t('January 2025'); } },
    { value: '2024-12', get label() { return t('December 2024'); } },
    { value: '2024-11', get label() { return t('November 2024'); } },
  ];

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("e-SPT")}</h1><p>{t("Kelola dan lapor SPT Masa Pajak secara elektronik")}</p></div><div className="ph-actions tax-header-actions"><button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button">
              <Upload className="w-4 h-4" />{t("Import CSV")} </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <FileText className="w-4 h-4" />{t("Buat SPT Baru")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Pratinjau e-SPT dengan data contoh. Pembuatan, pengunggahan, pengiriman dan unduhan SPT belum tersedia; status yang terlihat bukan bukti pelaporan.")}</p>

      {/* Stats Cards */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input aria-label={t("Cari perusahaan atau NPWP...")}
              type="text"
              placeholder={t("Cari perusahaan atau NPWP...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tax-control"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select aria-label={t("Periode")}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white tax-control"
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
              <select aria-label={t("Jenis")}
                value={selectedTaxType}
                onChange={(e) => setSelectedTaxType(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Jenis")}</option>
                <option value="pph21">{t("PPh 21")}</option>
                <option value="pph23">{t("PPh 23")}</option>
                <option value="pph4_2">{t("PPh 4(2)")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select aria-label={t("Status")}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Status")}</option>
                <option value="submitted">{t("Submitted")}</option>
                <option value="pending">{t("Pending")}</option>
                <option value="draft">{t("Draft")}</option>
                <option value="rejected">{t("Rejected")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Submitted")}</p>
<p className="text-2xl font-bold text-emerald-600 mt-1">{insightNumber(stats.submitted)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Pending")}</p>
<p className="text-2xl font-bold text-amber-600 mt-1">{insightNumber(stats.pending)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Draft")}</p>
<p className="text-2xl font-bold text-gray-600 mt-1">{insightNumber(stats.draft)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Rejected")}</p>
<p className="text-2xl font-bold text-red-600 mt-1">{insightNumber(stats.rejected)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Pajak Dilaporkan")}</p>
<p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(stats.totalTax)}</p></div>
      </div>

      {/* Charts */}

      {/* Filters */}

      {/* Table */}
      <div className="ph-section tax-section tax-register">
        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Perusahaan")} </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Periode")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Jenis Pajak")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Total Pajak")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Status")} </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("No. BPE")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-500">{t("Tidak ada data ditemukan")} </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{record.company}</p>
                        <p className="text-sm text-gray-500 tabular-nums">{record.npwp}</p>
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
                        <span className="tabular-nums text-sm text-blue-600">{record.receiptNumber}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" aria-label={t("View")}
                          onClick={() => setSelectedRecord(record)}
                          className="ph-button tax-button"
                          title={t("View")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {record.status === 'draft' && (
                          <button type="button" disabled aria-label={t("Submit")}
                            className="ph-button tax-button"
                            title={t("Submit")}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {record.status === 'rejected' && (
                          <button type="button" disabled aria-label={t("Resubmit")}
                            className="ph-button tax-button"
                            title={t("Resubmit")}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button type="button" disabled aria-label={t("Download")}
                          className="ph-button tax-button"
                          title={t("Download")}
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
        <Modal isOpen={true} onClose={() => setSelectedRecord(null)} title={t("Detail e-SPT")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Pratinjau e-SPT dengan data contoh. Pembuatan, pengunggahan, pengiriman dan unduhan SPT belum tersedia; status yang terlihat bukan bukti pelaporan.")}</p><div className="tax-dialog-body">
              {/* Company Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 flex items-center justify-center font-bold text-lg tax-initials">
                  {selectedRecord.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{selectedRecord.company}</h4>
                  <p className="text-gray-500 tabular-nums text-sm">{selectedRecord.npwp}</p>
                </div>
              </div>

              {/* SPT Details */}
              <div className="ph-section tax-section tax-stack">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t("Jenis Pajak")}</span>
                  {getTaxTypeBadge(selectedRecord.taxType)}
                </div>
                <dl className="ph-kv tax-kv-row"><dt>{t("Masa Pajak")}</dt><dd>{formatPeriod(selectedRecord.period)}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Jumlah WP")}</dt><dd>{insightNumber(selectedRecord.totalEmployees)}{' '}{t("orang")}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Due Date")}</dt><dd>{insightDate(selectedRecord.dueDate)}</dd></dl>
              </div>

              {/* Tax Amount */}
              <div className="ph-section tax-section">
                <dl className="ph-kv tax-kv-row"><dt>{t("Total Pajak Terutang")}</dt><dd>{formatCurrency(selectedRecord.totalTax)}</dd></dl>
              </div>

              {/* Status Info */}
              <div className="space-y-3">
                <div className="ph-section tax-section tax-inline">
                  <span className="text-gray-600">{t("Status")}</span>
                  {getStatusBadge(selectedRecord.status)}
                </div>

                {selectedRecord.status === 'submitted' && (
                  <>
                    <div className="ph-section tax-section tax-stack">
                      <dl className="ph-kv tax-kv-row"><dt>{t("Tanggal Submit")}</dt><dd>{insightDate(selectedRecord.submittedDate)}</dd></dl>
                      <dl className="ph-kv tax-kv-row"><dt>{t("No. BPE")}</dt><dd>{selectedRecord.receiptNumber}</dd></dl>
                      <dl className="ph-kv tax-kv-row"><dt>{t("NTPN")}</dt><dd>{selectedRecord.ntpn}</dd></dl>
                    </div>
                  </>
                )}

                {selectedRecord.status === 'rejected' && (
                  <div className="bg-red-50 rounded-md p-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">{t("Alasan Penolakan:")}</span>
                    </div>
                    <p className="mt-2 text-red-600">{selectedRecord.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setSelectedRecord(null)}
                className="ph-button tax-button"
              >{t("Tutup")} </button>
              {selectedRecord.status === 'submitted' && (
                <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                  <Download className="w-4 h-4" />{t("Download BPE")} </button>
              )}
              {selectedRecord.status === 'draft' && (
                <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                  <Send className="w-4 h-4" />{t("Submit SPT")} </button>
              )}
            </div></div>
</Modal>
      )}
    <details className="tax-charts"><summary>{t("Lihat grafik")}</summary><div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Tren Pelaporan Bulanan")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${insightFixed((v / 1000000), 0)}${t('million short')}`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="pph21" name={t("PPh 21")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph23" name={t("PPh 23")} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax Type Distribution */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Distribusi Jenis Pajak")}</h3>
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
                <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div></details>
</div>
  );
}
