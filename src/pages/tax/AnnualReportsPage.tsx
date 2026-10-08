import { insightNumber, insightFixed, insightDate } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Eye, FileText, CheckCircle, Clock, Users, Printer, FileSpreadsheet, FileCheck } from 'lucide-react';
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
  useLocale();
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
    { name: t('Verified'), value: mockReports.filter((r) => r.status === 'verified').length, color: '#10b981' },
    { name: t('Submitted'), value: mockReports.filter((r) => r.status === 'submitted').length, color: '#3b82f6' },
    { name: t('Generated'), value: mockReports.filter((r) => r.status === 'generated').length, color: '#f59e0b' },
    { name: t('Draft'), value: mockReports.filter((r) => r.status === 'draft').length, color: '#6b7280' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${insightFixed(value / 1000000000, 1)}${t('billion short')}`;
    }
    return `${insightFixed(value / 1000000, 0)}${t('million short')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <FileCheck className="w-3 h-3" />{t("Verified")} </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <CheckCircle className="w-3 h-3" />{t("Submitted")} </span>
        );
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <FileText className="w-3 h-3" />{t("Generated")} </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3" />{t("Draft")} </span>
        );
      default:
        return null;
    }
  };

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case '1721-A1':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{t("Form 1721-A1")}</span>
        );
      case '1721':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t("SPT 1721")}</span>
        );
      case 'bukpot':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{t("Bukti Potong")}</span>
        );
      default:
        return null;
    }
  };

  const years = [
    { value: 'all', get label() { return t('Semua Tahun'); } },
    { value: '2024', get label() { return t('Tahun 2024'); } },
    { value: '2023', get label() { return t('Tahun 2023'); } },
    { value: '2022', get label() { return t('Tahun 2022'); } },
  ];

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("Annual Reports")}</h1><p>{t("Laporan tahunan PPh 21 (1721-A1, SPT 1721)")}</p></div><div className="ph-actions tax-header-actions"><button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button">
              <Download className="w-4 h-4" />{t("Export All")} </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <FileSpreadsheet className="w-4 h-4" />{t("Generate Annual")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Pratinjau laporan tahunan dengan data contoh. Status, tenggat dan angka yang ditampilkan bukan catatan pelaporan aktual. Pembuatan dan unduhan belum tersedia.")}</p>

      {/* Deadline Alert */}
      <div className="ph-section tax-section">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">{t("Deadline Pelaporan 1721-A1")}</p>
            <p className="text-sm text-amber-600">{t("Batas akhir pelaporan Form 1721-A1 tahun 2024: 31 Januari 2025")}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input aria-label={t("Cari perusahaan...")}
              type="text"
              placeholder={t("Cari perusahaan...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tax-control"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select aria-label={t("Tahun")}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white tax-control"
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
              <select aria-label={t("Jenis")}
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Tipe")}</option>
                <option value="1721-A1">{t("Form 1721-A1")}</option>
                <option value="1721">{t("SPT 1721")}</option>
                <option value="bukpot">{t("Bukti Potong")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select aria-label={t("Status")}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Status")}</option>
                <option value="verified">{t("Verified")}</option>
                <option value="submitted">{t("Submitted")}</option>
                <option value="generated">{t("Generated")}</option>
                <option value="draft">{t("Draft")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Karyawan 2024")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{insightNumber(stats.totalEmployees)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Penghasilan Bruto")}</p>
<p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalGross)}</p>
<p className="text-xs text-emerald-600 mt-1">{t("+50% dari 2023")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total PPh 21")}</p>
<p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalPPh)}</p>
<p className="text-xs text-gray-400 mt-1">{t("Tahun 2024")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Laporan Disubmit")}</p>
<p className="text-2xl font-bold text-emerald-600 mt-1">{insightNumber(stats.submitted)}</p>
<p className="text-xs text-amber-600 mt-1">{insightNumber(stats.pending)}{' '}{t("pending")}</p></div>
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
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tahun")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tipe")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Karyawan")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Total PPh 21")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Status")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-500">{t("Tidak ada laporan ditemukan")} </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center font-semibold text-sm tax-initials">
                          {report.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{report.company}</p>
                          <p className="text-sm text-gray-500">{t("Deadline:")} {insightDate(report.deadline)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-gray-900">{insightNumber(report.year)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getReportTypeBadge(report.reportType)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        {insightNumber(report.totalEmployees)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(report.totalPPh21)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" aria-label={t("View")}
                          onClick={() => setSelectedReport(report)}
                          className="ph-button tax-button"
                          title={t("View")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" disabled aria-label={t("Download")}
                          className="ph-button tax-button"
                          title={t("Download")}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button type="button" disabled aria-label={t("Print")}
                          className="ph-button tax-button"
                          title={t("Print")}
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
        <Modal isOpen={true} onClose={() => setSelectedReport(null)} title={t("Detail Laporan Tahunan")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Pratinjau laporan tahunan dengan data contoh. Status, tenggat dan angka yang ditampilkan bukan catatan pelaporan aktual. Pembuatan dan unduhan belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Report Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 flex items-center justify-center font-bold text-lg tax-initials">
                  {selectedReport.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900">{selectedReport.company}</h4>
                  <p className="text-gray-500">{t("Tahun Pajak")} {insightNumber(selectedReport.year)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getReportTypeBadge(selectedReport.reportType)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Total Karyawan")}</p>
                  <p className="text-2xl font-bold text-indigo-600">{insightNumber(selectedReport.totalEmployees)}</p>
                </div>
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Deadline")}</p>
                  <p className="text-lg font-bold text-gray-900">{insightDate(selectedReport.deadline)}</p>
                </div>
              </div>

              {/* Income Summary */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Ringkasan Penghasilan")}</h5>
                <div className="ph-section tax-section tax-stack">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Penghasilan Bruto")}</dt><dd>{formatCurrency(selectedReport.totalGrossIncome)}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Total PPh 21 Dipotong")}</dt><dd>{formatCurrency(selectedReport.totalPPh21)}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Penghasilan Netto")}</dt><dd>{formatCurrency(selectedReport.totalNetto)}</dd></dl>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Timeline")}</h5>
                <div className="space-y-2">
                  {selectedReport.generatedDate && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("Generated")}</dt><dd>{insightDate(selectedReport.generatedDate)}</dd></dl>
                  )}
                  {selectedReport.submittedDate && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("Submitted")}</dt><dd>{insightDate(selectedReport.submittedDate)}</dd></dl>
                  )}
                </div>
              </div>
            </div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setSelectedReport(null)}
                className="ph-button tax-button"
              >{t("Tutup")} </button>
              <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                <Download className="w-4 h-4" />{t("Download Report")} </button>
            </div></div>
</Modal>
      )}
    <details className="tax-charts"><summary>{t("Lihat grafik")}</summary><div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yearly Comparison */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Perbandingan Tahunan")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${insightFixed((v / 1000000000), 0)}${t('billion short')}`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="gross" name={t("Penghasilan Bruto")} fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pph" name={t("PPh 21")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Status Laporan")}</h3>
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
