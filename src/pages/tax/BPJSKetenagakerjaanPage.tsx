import { insightNumber, insightFixed, SavedPayrollValueError, savedPayrollError } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, ChevronDown, Eye, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
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
import { payrollService, type Payroll } from '@/services/payroll.service';
import { companyService, type Company } from '@/services/company.service';
import { collectPages } from '@/services/master-data';

function savedContribution(value: unknown, field: string): number {
  if (value == null || (typeof value !== 'number' && typeof value !== 'string')
    || (typeof value === 'string' && value.trim() === '') || !Number.isFinite(Number(value))) {
    throw new SavedPayrollValueError(field);
  }
  return Number(value);
}

type BPJSKetenagakerjaanData = Omit<Payroll, 'status'> & {
  employee: Payroll['employee'] & { company?: { name: string } };
  baseSalary: number | null;
  jkk: number; jkm: number; jhtEmployee: number; jhtCompany: number; jpEmployee: number; jpCompany: number;
  totalEmployee: number; totalCompany: number; totalContribution: number;
  bpjsTkNumber: string;
  status: 'paid' | 'pending' | 'overdue';
};

export function BPJSKetenagakerjaanPage() {
  useLocale();
  const [bpjsData, setBpjsData] = useState<BPJSKetenagakerjaanData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-01');
  const [selectedEmployee, setSelectedEmployee] = useState<BPJSKetenagakerjaanData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setBpjsData([]);
      setSelectedEmployee(null);
      // Every page of the period; one limit=1000 request could truncate it.
      const [payrollRows, companiesRes] = await Promise.all([
        collectPages((page, limit) => payrollService.getAll({ period: selectedPeriod, page, limit })),
        companyService.getAll(),
      ]);
      const rows: BPJSKetenagakerjaanData[] = payrollRows.map(record => {
        const jkk = savedContribution(record.bpjs_jkk_company, 'bpjs_jkk_company');
        const jkm = savedContribution(record.bpjs_jkm_company, 'bpjs_jkm_company');
        const jhtEmployee = savedContribution(record.bpjs_jht_employee, 'bpjs_jht_employee');
        const jhtCompany = savedContribution(record.bpjs_jht_company, 'bpjs_jht_company');
        const jpEmployee = savedContribution(record.bpjs_jp_employee, 'bpjs_jp_employee');
        const jpCompany = savedContribution(record.bpjs_jp_company, 'bpjs_jp_company');
        const totalEmployee = jhtEmployee + jpEmployee;
        const totalCompany = jkk + jkm + jhtCompany + jpCompany;
        const statuses = ['paid', 'pending', 'overdue'] as const;
        return {
          ...record,
          baseSalary: record.basic_salary == null ? null : Number(record.basic_salary),
          jkk, jkm, jhtEmployee, jhtCompany, jpEmployee, jpCompany,
          totalEmployee, totalCompany, totalContribution: totalEmployee + totalCompany,
          bpjsTkNumber: `TK${record.employee.id}${Math.floor(Math.random() * 100000)}`.slice(0, 16),
          status: statuses[Math.floor(Math.random() * 10) % 3],
        };
      });
      setBpjsData(rows);
      setCompanies(companiesRes.data);
    } catch (error) {
      setLoadError(error instanceof Error ? error : new Error('Payroll load failed'));
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Filter data
  const filteredData = useMemo(() => {
    return bpjsData.filter((record) => {
      const employeeName = record.employee?.name || '';
      const employeeId = record.employee?.employee_id || '';
      const matchesSearch =
        employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = selectedCompany === 'all' || record.company_id === Number(selectedCompany);
      return matchesSearch && matchesCompany;
    });
  }, [bpjsData, searchTerm, selectedCompany]);

  // Calculate summary stats
  const stats = useMemo(() => {
    return {
      totalEmployees: filteredData.length,
      totalJKK: filteredData.reduce((sum, r) => sum + r.jkk, 0),
      totalJKM: filteredData.reduce((sum, r) => sum + r.jkm, 0),
      totalJHT: filteredData.reduce((sum, r) => sum + r.jhtEmployee + r.jhtCompany, 0),
      totalJP: filteredData.reduce((sum, r) => sum + r.jpEmployee + r.jpCompany, 0),
      totalEmployee: filteredData.reduce((sum, r) => sum + r.totalEmployee, 0),
      totalCompany: filteredData.reduce((sum, r) => sum + r.totalCompany, 0),
      totalContribution: filteredData.reduce((sum, r) => sum + r.totalContribution, 0),
    };
  }, [filteredData]);

  // Chart data - program distribution
  const programData = [
    { name: t('JKK'), value: stats.totalJKK, color: '#f43f5e' },
    { name: t('JKM'), value: stats.totalJKM, color: '#8b5cf6' },
    { name: t('JHT'), value: stats.totalJHT, color: '#3b82f6' },
    { name: t('JP'), value: stats.totalJP, color: '#10b981' },
  ];

  // Trend data
  const trendData = [
    { month: t('Aug'), employee: 85000000, company: 142000000 },
    { month: t('Sep'), employee: 87000000, company: 145000000 },
    { month: t('Oct'), employee: 89000000, company: 148000000 },
    { month: t('Nov'), employee: 91000000, company: 152000000 },
    { month: t('Dec'), employee: 93000000, company: 155000000 },
    { month: t('Jan'), employee: stats.totalEmployee, company: stats.totalCompany },
  ];

  const formatCurrency = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return t('Tidak tersedia');
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />{t("Paid")} </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />{t("Pending")} </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3" />{t("Overdue")} </span>
        );
      default:
        return null;
    }
  };

  const periods = [
    { value: '2025-01', get label() { return t('January 2025'); } },
    { value: '2024-12', get label() { return t('December 2024'); } },
    { value: '2024-11', get label() { return t('November 2024'); } },
    { value: '2024-10', get label() { return t('October 2024'); } },
  ];

  const exportCSV = () => {
    if (loading || loadError || filteredData.length === 0) return;
    const quote = (value: string | number) => {
      const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Nomor payroll', 'ID karyawan', 'Nama', 'JKK perusahaan', 'JKM perusahaan', 'JHT karyawan', 'JHT perusahaan',
        'JP karyawan', 'JP perusahaan', 'Total karyawan', 'Total perusahaan', 'Total iuran'].map(source => t(source)),
      ...filteredData.map(record => [record.payroll_number ?? '', record.employee?.employee_id ?? '', record.employee?.name ?? '',
        record.jkk, record.jkm, record.jhtEmployee, record.jhtCompany, record.jpEmployee, record.jpCompany,
        record.totalEmployee, record.totalCompany, record.totalContribution]),
    ];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bpjs-ketenagakerjaan-${selectedPeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadError) return (
    <div className="ph-workflow tax-workflow tax-error-page">
      <h1 className="text-2xl font-bold">{t("BPJS Ketenagakerjaan")}</h1>
      <div role="alert" className="rounded-md bg-red-50 p-5 text-red-800">{savedPayrollError(loadError)}</div>
      <button type="button" onClick={() => void fetchData()} className="ph-button tax-button ph-button-primary">{t("Coba lagi")}</button>
    </div>
  );

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("BPJS Ketenagakerjaan")}</h1><p>{t("Kelola iuran JKK, JKM, JHT & JP karyawan")}</p></div><div className="ph-actions tax-header-actions"><button type="button" onClick={exportCSV} disabled={loading || filteredData.length === 0} className="ph-button tax-button">
              <Download className="w-4 h-4" />{t("Export")} </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <FileText className="w-4 h-4" />{t("Generate Report")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Iuran menggunakan nilai payroll tersimpan. Nomor peserta, status pembayaran dan riwayat grafik masih contoh tampilan, bukan data kepesertaan atau bukti pembayaran. CSV berisi iuran tersimpan; pembuatan laporan dan slip belum tersedia.")}</p>

      {/* Program Cards */}
      <div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("JKK (Kecelakaan Kerja)")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJKK)}</p>
<p className="text-xs text-rose-600 mt-1">{t("Nilai payroll tersimpan")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("JKM (Kematian)")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJKM)}</p>
<p className="text-xs text-purple-600 mt-1">{t("Nilai payroll tersimpan")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("JHT (Hari Tua)")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJHT)}</p>
<p className="text-xs text-blue-600 mt-1">{t("Nilai payroll tersimpan")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("JP (Pensiun)")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJP)}</p>
<p className="text-xs text-emerald-600 mt-1">{t("Nilai payroll tersimpan")}</p></div>
      </div>

      {/* Summary Cards */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input aria-label={t("Cari karyawan...")}
              type="text"
              placeholder={t("Cari karyawan...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent tax-control"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select aria-label={t("Periode")}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white tax-control"
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
              <select aria-label={t("Perusahaan")}
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Perusahaan")}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-blue-100">{t("Total Iuran Karyawan")}</p>
<p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalEmployee)}</p>
<p className="text-xs text-blue-200 mt-1">{t("Nilai payroll tersimpan")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-purple-100">{t("Total Iuran Perusahaan")}</p>
<p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalCompany)}</p>
<p className="text-xs text-purple-200 mt-1">{t("JKK + JKM + JHT + JP")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-amber-100">{t("Total Keseluruhan")}</p>
<p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalContribution)}</p>
<p className="text-xs text-amber-200 mt-1">{insightNumber(stats.totalEmployees)}{' '}{t("karyawan")}</p></div>
      </div>

      {/* Charts */}

      {/* Filters */}

      {/* Table */}
      <div className="ph-section tax-section tax-register">
        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("Karyawan")} </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("No. BPJS TK")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("JKK + JKM")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("JHT")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("JP")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Total")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Status")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>{t("Loading data...")}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">{t("Tidak ada data ditemukan")} </td>
                </tr>
              ) : (
                filteredData.slice(0, 20).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center font-semibold text-sm tax-initials">
                          {(record.employee?.name || 'N')[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {record.employee?.name || t('N/A')}
                          </p>
                          <p className="text-sm text-gray-500">{record.employee?.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="tabular-nums text-sm text-gray-600">{record.bpjsTkNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-rose-600 font-medium">{formatCurrency(record.jkk + record.jkm)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-blue-600 font-medium">
                        {formatCurrency(record.jhtEmployee + record.jhtCompany)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-emerald-600 font-medium">
                        {formatCurrency(record.jpEmployee + record.jpCompany)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(record.totalContribution)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <button type="button"
                        onClick={() => setSelectedEmployee(record)}
                        aria-label={t('Detail BPJS {name}', { name: record.employee?.name || t('karyawan') })}
                        className="ph-button tax-button"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEmployee && (
        <Modal isOpen={true} onClose={() => setSelectedEmployee(null)} title={t("Detail BPJS Ketenagakerjaan")} size="xl">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Iuran menggunakan nilai payroll tersimpan. Nomor peserta, status pembayaran dan riwayat grafik masih contoh tampilan, bukan data kepesertaan atau bukti pembayaran. CSV berisi iuran tersimpan; pembuatan laporan dan slip belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Employee Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center font-bold text-xl tax-initials">
                  {(selectedEmployee.employee?.name || '').trim().split(/\s+/).slice(0, 2).map((part: string) => part[0] || '').join('') || '?'}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedEmployee.employee?.name || t('Nama belum tersedia')}
                  </h4>
                  <p className="text-gray-500">{selectedEmployee.employee?.employee_id || '—'}</p>
                  <p className="text-sm text-gray-400">{selectedEmployee.employee?.company?.name}</p>
                </div>
              </div>

              {/* BPJS Details */}
              <div className="ph-section tax-section tax-stack">
                <dl className="ph-kv tax-kv-row"><dt>{t("No. BPJS Ketenagakerjaan")}</dt><dd>{selectedEmployee.bpjsTkNumber}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Gaji pokok dibayar (bukan dasar iuran)")}</dt><dd>{formatCurrency(selectedEmployee.baseSalary)}</dd></dl>
              </div>

              {/* Program Details */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Rincian Program")}</h5>
                <div className="space-y-3">
                  {/* JKK */}
                  <div className="ph-section tax-section">
                    <dl className="ph-kv tax-kv-row"><dt>{t("JKK (Kecelakaan Kerja)")}</dt><dd>{t("Nilai payroll tersimpan")}</dd></dl>
                    <dl className="ph-kv tax-kv-row"><dt>{t("Perusahaan")}</dt><dd>{formatCurrency(selectedEmployee.jkk)}</dd></dl>
                  </div>

                  {/* JKM */}
                  <div className="ph-section tax-section">
                    <dl className="ph-kv tax-kv-row"><dt>{t("JKM (Kematian)")}</dt><dd>{t("Nilai payroll tersimpan")}</dd></dl>
                    <dl className="ph-kv tax-kv-row"><dt>{t("Perusahaan")}</dt><dd>{formatCurrency(selectedEmployee.jkm)}</dd></dl>
                  </div>

                  {/* JHT */}
                  <div className="ph-section tax-section">
                    <dl className="ph-kv tax-kv-row"><dt>{t("JHT (Hari Tua)")}</dt><dd>{t("Nilai payroll tersimpan")}</dd></dl>
                    <dl className="ph-kv tax-kv-row"><dt>{t("Karyawan")}</dt><dd>{formatCurrency(selectedEmployee.jhtEmployee)}</dd></dl>
                    <dl className="ph-kv tax-kv-row"><dt>{t("Perusahaan")}</dt><dd>{formatCurrency(selectedEmployee.jhtCompany)}</dd></dl>
                  </div>

                  {/* JP */}
                  <div className="ph-section tax-section">
                    <dl className="ph-kv tax-kv-row"><dt>{t("JP (Pensiun)")}</dt><dd>{t("Nilai payroll tersimpan")}</dd></dl>
                    <dl className="ph-kv tax-kv-row"><dt>{t("Karyawan")}</dt><dd>{formatCurrency(selectedEmployee.jpEmployee)}</dd></dl>
                    <dl className="ph-kv tax-kv-row"><dt>{t("Perusahaan")}</dt><dd>{formatCurrency(selectedEmployee.jpCompany)}</dd></dl>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="ph-section tax-section tax-stack">
                <dl className="ph-kv tax-kv-row"><dt>{t("Total Karyawan")}</dt><dd>{formatCurrency(selectedEmployee.totalEmployee)}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Employer BPJS total")}</dt><dd>{formatCurrency(selectedEmployee.totalCompany)}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Total Iuran")}</dt><dd>{formatCurrency(selectedEmployee.totalContribution)}</dd></dl>
              </div>
            </div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setSelectedEmployee(null)}
                className="ph-button tax-button"
              >{t("Tutup")} </button>
              <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">{t("Download Slip")} </button>
            </div></div>
</Modal>
      )}
    <details className="tax-charts"><summary>{t("Lihat grafik")}</summary><div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Tren Iuran Bulanan")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${insightFixed((v / 1000000), 0)}${t('million short')}`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="employee" name={t("Karyawan")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="company" name={t("Perusahaan")} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Program Distribution */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Distribusi Program")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {programData.map((entry, index) => (
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
