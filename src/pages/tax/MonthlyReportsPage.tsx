import { insightNumber, insightFixed, insightDate } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Eye, FileText, CheckCircle, Clock, Users, Printer, FileSpreadsheet } from 'lucide-react';
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
  useLocale();
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
    { month: t('Aug'), pph21: 95000000, pph23: 35000000, bpjs: 160000000 },
    { month: t('Sep'), pph21: 102000000, pph23: 38000000, bpjs: 168000000 },
    { month: t('Oct'), pph21: 108000000, pph23: 40000000, bpjs: 175000000 },
    { month: t('Nov'), pph21: 115000000, pph23: 42000000, bpjs: 180000000 },
    { month: t('Dec'), pph21: 120000000, pph23: 42000000, bpjs: 185000000 },
    { month: t('Jan'), pph21: 125000000, pph23: 45000000, bpjs: 187500000 },
  ];

  const payrollTrend = [
    { month: t('Aug'), amount: 3100000000 },
    { month: t('Sep'), amount: 3250000000 },
    { month: t('Oct'), amount: 3400000000 },
    { month: t('Nov'), amount: 3500000000 },
    { month: t('Dec'), amount: 3525000000 },
    { month: t('Jan'), amount: 3525000000 },
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
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />{t("Generated")} </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <FileText className="w-3 h-3" />{t("Submitted")} </span>
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
      case 'pph21':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{t("PPh 21")}</span>;
      case 'pph23':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t("PPh 23")}</span>;
      case 'bpjs':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{t("BPJS")}</span>;
      case 'all':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{t("All")}</span>;
      default:
        return null;
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
      <header className="ph-page-header tax-page-header"><div><h1>{t("Monthly Reports")}</h1><p>{t("Laporan pajak dan BPJS bulanan")}</p></div><div className="ph-actions tax-header-actions"><button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button">
              <Download className="w-4 h-4" />{t("Export All")} </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <FileSpreadsheet className="w-4 h-4" />{t("Generate Report")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Pratinjau laporan bulanan dengan data contoh. Pembuatan dan unduhan laporan belum tersedia.")}</p>

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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent tax-control"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select aria-label={t("Periode")}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white tax-control"
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
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Tipe")}</option>
                <option value="pph21">{t("PPh 21")}</option>
                <option value="pph23">{t("PPh 23")}</option>
                <option value="bpjs">{t("BPJS")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select aria-label={t("Status")}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Status")}</option>
                <option value="generated">{t("Generated")}</option>
                <option value="submitted">{t("Submitted")}</option>
                <option value="draft">{t("Draft")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Karyawan")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{insightNumber(stats.totalEmployees)}</p>
<p className="text-xs text-gray-400 mt-1">{t("Periode Jan 2025")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Payroll")}</p>
<p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalPayroll)}</p>
<p className="text-xs text-emerald-600 mt-1">{t("+2.5% dari bulan lalu")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Pajak & BPJS")}</p>
<p className="text-xl font-bold text-gray-900 mt-1">{formatShortCurrency(stats.totalTax)}</p>
<p className="text-xs text-gray-400 mt-1">{t("PPh 21, 23, BPJS")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Laporan Dibuat")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{insightNumber(stats.generated)}</p>
<p className="text-xs text-amber-600 mt-1">{insightNumber(stats.draft)}{' '}{t("draft")}</p></div>
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
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tipe")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Karyawan")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Total Potongan")} </th>
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
                        {insightNumber(report.totalEmployees)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(report.totalDeductions)}</span>
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
        <Modal isOpen={true} onClose={() => setSelectedReport(null)} title={t("Detail Laporan Bulanan")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Pratinjau laporan bulanan dengan data contoh. Pembuatan dan unduhan laporan belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Report Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 flex items-center justify-center font-bold text-lg tax-initials">
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
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Total Karyawan")}</p>
                  <p className="text-2xl font-bold text-gray-900">{insightNumber(selectedReport.totalEmployees)}</p>
                </div>
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Gross Payroll")}</p>
                  <p className="text-lg font-bold text-gray-900">{formatShortCurrency(selectedReport.grossPayroll)}</p>
                </div>
              </div>

              {/* Tax Breakdown */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Rincian Potongan")}</h5>
                <div className="space-y-3">
                  {selectedReport.totalPPh21 > 0 && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("PPh 21")}</dt><dd>{formatCurrency(selectedReport.totalPPh21)}</dd></dl>
                  )}
                  {selectedReport.totalPPh23 > 0 && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("PPh 23")}</dt><dd>{formatCurrency(selectedReport.totalPPh23)}</dd></dl>
                  )}
                  {selectedReport.totalBPJS > 0 && (
                    <dl className="ph-kv tax-kv-row"><dt>{t("BPJS (Kes + TK)")}</dt><dd>{formatCurrency(selectedReport.totalBPJS)}</dd></dl>
                  )}
                  <dl className="ph-kv tax-kv-row"><dt>{t("Total Potongan")}</dt><dd>
                      {formatCurrency(selectedReport.totalDeductions)}
                    </dd></dl>
                </div>
              </div>

              {/* Generated Info */}
              {selectedReport.generatedDate && (
                <div className="ph-section tax-section">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Dibuat pada")}</dt><dd>{insightDate(selectedReport.generatedDate)}{' '}{t("oleh")} {selectedReport.generatedBy}</dd></dl>
                </div>
              )}
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
    <details className="tax-charts"><summary>{t("Lihat grafik")}</summary><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Breakdown Chart */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Tren Pajak & BPJS")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
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
                <Bar dataKey="bpjs" name={t("BPJS")} fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payroll Trend Chart */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Tren Payroll")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${insightFixed((v / 1000000000), 1)}${t('billion short')}`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name={t("Total Payroll")}
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div></details>
</div>
  );
}
