import { insightNumber, insightFixed, insightDate } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useEffect, useMemo } from 'react';
import { FileBarChart, Search, Download, ChevronDown, Eye, FileText, CheckCircle, Clock, Heart, HardHat, Users, Printer } from 'lucide-react';
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
  useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyLoadError, setCompanyLoadError] = useState(false);
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
      setCompanyLoadError(false);
      const res = await companyService.getAll();
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanyLoadError(true);
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
    { month: t('Aug'), kesehatan: 180000000, ketenagakerjaan: 280000000 },
    { month: t('Sep'), kesehatan: 185000000, ketenagakerjaan: 290000000 },
    { month: t('Oct'), kesehatan: 190000000, ketenagakerjaan: 295000000 },
    { month: t('Nov'), kesehatan: 195000000, ketenagakerjaan: 300000000 },
    { month: t('Dec'), kesehatan: 200000000, ketenagakerjaan: 310000000 },
    { month: t('Jan'), kesehatan: stats.totalKesehatan, ketenagakerjaan: stats.totalKetenagakerjaan },
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
      default:
        return null;
    }
  };

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'kesehatan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
            <Heart className="w-3 h-3" />{t("Kesehatan")} </span>
        );
      case 'ketenagakerjaan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <HardHat className="w-3 h-3" />{t("Ketenagakerjaan")} </span>
        );
      case 'combined':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <FileBarChart className="w-3 h-3" />{t("Combined")} </span>
        );
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
      <header className="ph-page-header tax-page-header"><div><h1>{t("BPJS Reports")}</h1><p>{t("Laporan iuran BPJS Kesehatan & Ketenagakerjaan")}</p></div><div className="ph-actions tax-header-actions"><button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button">
              <Download className="w-4 h-4" />{t("Export All")} </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <FileText className="w-4 h-4" />{t("New Report")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Pratinjau laporan dengan data contoh. Pembuatan, pengiriman dan unduhan laporan BPJS belum tersedia.")}</p>

      {/* Stats Cards */}
      <div className="tax-toolbar">{loading && <p role="status" className="tax-period">{t("Memuat data perusahaan...")}</p>}{companyLoadError && <div role="alert" className="ph-callout" data-tone="error">{t("Data perusahaan tidak dapat dimuat.")} <button type="button" className="ph-button tax-button" onClick={() => void fetchCompanies()}>{t("Coba lagi")}</button></div>}
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
              <select aria-label={t("Periode")}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white tax-control"
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
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Tipe")}</option>
                <option value="kesehatan">{t("Kesehatan")}</option>
                <option value="ketenagakerjaan">{t("Ketenagakerjaan")}</option>
                <option value="combined">{t("Combined")}</option>
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
                <option value="submitted">{t("Submitted")}</option>
                <option value="pending">{t("Pending")}</option>
                <option value="draft">{t("Draft")}</option>
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

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Kesehatan")}</p>
<p className="text-lg font-bold text-rose-600 mt-1">{formatCurrency(stats.totalKesehatan)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Ketenagakerjaan")}</p>
<p className="text-lg font-bold text-amber-600 mt-1">{formatCurrency(stats.totalKetenagakerjaan)}</p></div>
      </div>

      {/* Chart */}

      {/* Filters */}

      {/* Reports Table */}
      <div className="ph-section tax-section tax-register">
        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Perusahaan")} </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Periode")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tipe")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Karyawan")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Total")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Status")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>{t("Loading data...")}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
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
                          <p className="text-sm text-gray-500">{t("Due:")} {insightDate(report.dueDate)}</p>
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
                      <span className="font-bold text-gray-900">{formatCurrency(report.totalAmount)}</span>
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
        <Modal isOpen={true} onClose={() => setSelectedReport(null)} title={t("Detail Laporan BPJS")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Pratinjau laporan dengan data contoh. Pembuatan, pengiriman dan unduhan laporan BPJS belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Report Header */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 flex items-center justify-center font-bold text-xl tax-initials">
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
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Total Karyawan")}</p>
                  <p className="text-2xl font-bold text-gray-900">{insightNumber(selectedReport.totalEmployees)}</p>
                </div>
                <div className="ph-section tax-section">
                  <p className="text-sm text-gray-500">{t("Due Date")}</p>
                  <p className="text-2xl font-bold text-gray-900">{insightDate(selectedReport.dueDate)}</p>
                </div>
              </div>

              {/* BPJS Breakdown */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Rincian Iuran")}</h5>
                <div className="space-y-3">
                  {selectedReport.totalKesehatan > 0 && (
                    <div className="ph-section tax-section tax-inline">
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-rose-600" />
                        <span className="font-medium text-gray-900">{t("BPJS Kesehatan")}</span>
                      </div>
                      <span className="font-bold text-rose-600">{formatCurrency(selectedReport.totalKesehatan)}</span>
                    </div>
                  )}
                  {selectedReport.totalKetenagakerjaan > 0 && (
                    <div className="ph-section tax-section tax-inline">
                      <div className="flex items-center gap-3">
                        <HardHat className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-gray-900">{t("BPJS Ketenagakerjaan")}</span>
                      </div>
                      <span className="font-bold text-amber-600">
                        {formatCurrency(selectedReport.totalKetenagakerjaan)}
                      </span>
                    </div>
                  )}
                  <dl className="ph-kv tax-kv-row"><dt>{t("Total Keseluruhan")}</dt><dd>
                      {formatCurrency(selectedReport.totalAmount)}
                    </dd></dl>
                </div>
              </div>

              {/* Submission Info */}
              {selectedReport.submittedDate && (
                <div className="ph-section tax-section">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{t("Submitted on")} {insightDate(selectedReport.submittedDate)}</span>
                  </div>
                </div>
              )}
            </div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setSelectedReport(null)}
                className="ph-button tax-button"
              >{t("Tutup")} </button>
              <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                <Download className="w-4 h-4" />{t("Download PDF")} </button>
            </div></div>
</Modal>
      )}
    <details className="tax-charts"><summary>{t("Lihat grafik")}</summary><div className="ph-section tax-section">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Tren Laporan BPJS")}</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${insightFixed((v / 1000000), 0)}${t('million short')}`} />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="kesehatan"
                name={t("BPJS Kesehatan")}
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ fill: '#f43f5e' }}
              />
              <Line
                type="monotone"
                dataKey="ketenagakerjaan"
                name={t("BPJS Ketenagakerjaan")}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div></details>
</div>
  );
}
