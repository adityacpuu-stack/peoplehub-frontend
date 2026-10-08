import { insightNumber, insightDate } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Eye, FileText, CheckCircle, Plus, Printer, Mail, Send } from 'lucide-react';
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
  useLocale();
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
      name: t('PPh 21'),
      value: mockBupotRecords.filter((r) => r.bupotType === 'pph21').reduce((s, r) => s + r.taxAmount, 0),
      color: '#3b82f6',
    },
    {
      name: t('PPh 23'),
      value: mockBupotRecords.filter((r) => r.bupotType === 'pph23').reduce((s, r) => s + r.taxAmount, 0),
      color: '#8b5cf6',
    },
    {
      name: t('PPh 26'),
      value: mockBupotRecords.filter((r) => r.bupotType === 'pph26').reduce((s, r) => s + r.taxAmount, 0),
      color: '#f59e0b',
    },
  ];

  const monthlyData = [
    { month: t('Sep'), pph21: 35, pph23: 48, pph26: 5 },
    { month: t('Oct'), pph21: 42, pph23: 52, pph26: 8 },
    { month: t('Nov'), pph21: 38, pph23: 55, pph26: 6 },
    { month: t('Dec'), pph21: 45, pph23: 60, pph26: 10 },
    { month: t('Jan'), pph21: 40, pph23: 58, pph26: 7 },
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
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />{t("Issued")} </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Mail className="w-3 h-3" />{t("Sent")} </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <FileText className="w-3 h-3" />{t("Draft")} </span>
        );
      default:
        return null;
    }
  };

  const getBupotTypeBadge = (type: string) => {
    switch (type) {
      case 'pph21':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{t("PPh 21")}</span>;
      case 'pph23':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t("PPh 23")}</span>;
      case 'pph26':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{t("PPh 26")}</span>;
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
      <header className="ph-page-header tax-page-header"><div><h1>{t("e-Bupot")}</h1><p>{t("Kelola Bukti Potong PPh 21, 23, dan 26")}</p></div><div className="ph-actions tax-header-actions"><button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button">
              <Download className="w-4 h-4" />{t("Export")} </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <Plus className="w-4 h-4" />{t("Buat Bupot")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Pratinjau e-Bupot dengan data contoh. Pembuatan, penerbitan, pengiriman dan unduhan bukti potong belum tersedia.")}</p>

      {/* Stats Cards */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input aria-label={t("Cari nama, nomor bupot, atau NPWP...")}
              type="text"
              placeholder={t("Cari nama, nomor bupot, atau NPWP...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent tax-control"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select aria-label={t("Periode")}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white tax-control"
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
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Jenis")}</option>
                <option value="pph21">{t("PPh 21")}</option>
                <option value="pph23">{t("PPh 23")}</option>
                <option value="pph26">{t("PPh 26")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select aria-label={t("Status")}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Status")}</option>
                <option value="issued">{t("Issued")}</option>
                <option value="sent">{t("Sent")}</option>
                <option value="draft">{t("Draft")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Bupot")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{insightNumber(stats.total)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Issued")}</p>
<p className="text-2xl font-bold text-emerald-600 mt-1">{insightNumber(stats.issued)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Sent")}</p>
<p className="text-2xl font-bold text-blue-600 mt-1">{insightNumber(stats.sent)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Draft")}</p>
<p className="text-2xl font-bold text-gray-600 mt-1">{insightNumber(stats.draft)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Pajak Dipotong")}</p>
<p className="text-lg font-bold text-violet-600 mt-1">{formatCurrency(stats.totalTax)}</p></div>
      </div>

      {/* Charts */}

      {/* Filters */}

      {/* Table */}
      <div className="ph-section tax-section tax-register">
        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("No. Bupot")} </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Penerima")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Jenis")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Bruto")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tarif")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Pajak")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Status")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">{t("Tidak ada data ditemukan")} </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="tabular-nums font-medium text-violet-600">{record.bupotNumber}</p>
                        <p className="text-sm text-gray-500">{formatPeriod(record.period)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{record.recipientName}</p>
                        <p className="text-sm text-gray-500 tabular-nums">{record.recipientNpwp}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{getBupotTypeBadge(record.bupotType)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-900">{formatCurrency(record.grossAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">{insightNumber(record.taxRate)}%</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-violet-600">{formatCurrency(record.taxAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" aria-label={t("View")}
                          onClick={() => setSelectedRecord(record)}
                          className="ph-button tax-button"
                          title={t("View")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" disabled aria-label={t("Print")}
                          className="ph-button tax-button"
                          title={t("Print")}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {record.status === 'issued' && (
                          <button type="button" disabled aria-label={t("Send")}
                            className="ph-button tax-button"
                            title={t("Send")}
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
        <Modal isOpen={true} onClose={() => setSelectedRecord(null)} title={t("Detail Bukti Potong")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Pratinjau e-Bupot dengan data contoh. Pembuatan, penerbitan, pengiriman dan unduhan bukti potong belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Bupot Header */}
              <div className="text-center">
                <p className="text-sm text-gray-500">{t("Nomor Bukti Potong")}</p>
                <p className="text-xl font-bold tabular-nums text-violet-600">{selectedRecord.bupotNumber}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {getBupotTypeBadge(selectedRecord.bupotType)}
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>

              {/* Recipient Info */}
              <div className="ph-section tax-section tax-stack">
                <h5 className="font-medium text-violet-900">{t("Penerima Penghasilan")}</h5>
                <div className="space-y-2">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Nama")}</dt><dd>{selectedRecord.recipientName}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("NPWP")}</dt><dd>{selectedRecord.recipientNpwp}</dd></dl>
                  {selectedRecord.recipientNik && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("NIK")}</dt><dd>{selectedRecord.recipientNik}</dd></dl>
                  )}
                </div>
              </div>

              {/* Income Details */}
              <div className="ph-section tax-section tax-stack">
                <h5 className="font-medium text-gray-900">{t("Rincian Penghasilan")}</h5>
                <div className="space-y-2">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Jenis Penghasilan")}</dt><dd>{selectedRecord.incomeType}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Masa Pajak")}</dt><dd>{formatPeriod(selectedRecord.period)}</dd></dl>
                </div>
              </div>

              {/* Tax Calculation */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Perhitungan Pajak")}</h5>
                <div className="ph-section tax-section tax-stack">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Penghasilan Bruto")}</dt><dd>{formatCurrency(selectedRecord.grossAmount)}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Tarif Pajak")}</dt><dd>{insightNumber(selectedRecord.taxRate)}%</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Pajak Dipotong")}</dt><dd>{formatCurrency(selectedRecord.taxAmount)}</dd></dl>
                </div>
              </div>

              {/* Dates */}
              {(selectedRecord.issuedDate || selectedRecord.sentDate) && (
                <div className="ph-section tax-section tax-stack">
                  {selectedRecord.issuedDate && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("Tanggal Terbit")}</dt><dd>{insightDate(selectedRecord.issuedDate)}</dd></dl>
                  )}
                  {selectedRecord.sentDate && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("Tanggal Kirim")}</dt><dd>{insightDate(selectedRecord.sentDate)}</dd></dl>
                  )}
                </div>
              )}
            </div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setSelectedRecord(null)}
                className="ph-button tax-button"
              >{t("Tutup")} </button>
              <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                <Printer className="w-4 h-4" />{t("Cetak Bupot")} </button>
            </div></div>
</Modal>
      )}
    <details className="tax-charts"><summary>{t("Lihat grafik")}</summary><div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Jumlah Bupot per Bulan")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={insightNumber} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Bar dataKey="pph21" name={t("PPh 21")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph23" name={t("PPh 23")} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph26" name={t("PPh 26")} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax Distribution */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Distribusi Pajak")}</h3>
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
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div></details>
</div>
  );
}
