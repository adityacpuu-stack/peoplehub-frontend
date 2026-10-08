import { insightNumber, insightFixed, SavedPayrollValueError, savedPayrollError } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Download, Users, ChevronDown, Eye, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
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

function savedContribution(value: unknown, field: string): number {
  if (value == null || (typeof value !== 'number' && typeof value !== 'string')
    || (typeof value === 'string' && value.trim() === '') || !Number.isFinite(Number(value))) {
    throw new SavedPayrollValueError(field);
  }
  return Number(value);
}

// Contribution amounts come only from the saved payroll; totals are sums.
type BPJSKesehatanData = Omit<Payroll, 'status'> & {
  baseSalary: number | null;
  employeeContribution: number;
  companyContribution: number;
  totalContribution: number;
  bpjsNumber: string;
  status: 'paid' | 'pending' | 'overdue';
  familyMembers: number;
};

export function BPJSKesehatanPage() {
  useLocale();
  const [bpjsData, setBpjsData] = useState<BPJSKesehatanData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | number>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-01');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<BPJSKesehatanData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setBpjsData([]);
      setSelectedEmployee(null);
      const [payrollRes, companiesRes] = await Promise.all([
        payrollService.getAll({ period: selectedPeriod, limit: 1000 }),
        companyService.getAll(),
      ]);
      const rows: BPJSKesehatanData[] = payrollRes.data.map(record => {
        const employeeContribution = savedContribution(record.bpjs_kes_employee, 'bpjs_kes_employee');
        const companyContribution = savedContribution(record.bpjs_kes_company, 'bpjs_kes_company');
        const statuses = ['paid', 'pending', 'overdue'] as const;
        return {
          ...record,
          baseSalary: record.basic_salary == null ? null : Number(record.basic_salary),
          employeeContribution, companyContribution,
          totalContribution: employeeContribution + companyContribution,
          bpjsNumber: `000${record.employee?.id || 0}${Math.floor(Math.random() * 10000)}`.slice(-13),
          status: statuses[Math.floor(Math.random() * 10) % 3],
          familyMembers: Math.floor(Math.random() * 4) + 1,
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
      const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [bpjsData, searchTerm, selectedCompany, selectedStatus]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalEmployees = filteredData.length;
    const totalEmployeeContribution = filteredData.reduce((sum, r) => sum + r.employeeContribution, 0);
    const totalCompanyContribution = filteredData.reduce((sum, r) => sum + r.companyContribution, 0);
    const totalContribution = totalEmployeeContribution + totalCompanyContribution;
    const paidCount = filteredData.filter((r) => r.status === 'paid').length;
    const pendingCount = filteredData.filter((r) => r.status === 'pending').length;
    const overdueCount = filteredData.filter((r) => r.status === 'overdue').length;

    return {
      totalEmployees,
      totalEmployeeContribution,
      totalCompanyContribution,
      totalContribution,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }, [filteredData]);

  // Chart data - monthly trend
  const trendData = [
    { month: t('Aug'), employee: 45000000, company: 180000000 },
    { month: t('Sep'), employee: 46500000, company: 186000000 },
    { month: t('Oct'), employee: 47200000, company: 188800000 },
    { month: t('Nov'), employee: 48000000, company: 192000000 },
    { month: t('Dec'), employee: 49500000, company: 198000000 },
    { month: t('Jan'), employee: stats.totalEmployeeContribution, company: stats.totalCompanyContribution },
  ];

  // Status distribution for pie chart
  const statusData = [
    { name: t('Paid'), value: stats.paidCount, color: '#10b981' },
    { name: t('Pending'), value: stats.pendingCount, color: '#f59e0b' },
    { name: t('Overdue'), value: stats.overdueCount, color: '#ef4444' },
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
      ['Nomor payroll', 'ID karyawan', 'Nama', 'Iuran karyawan tersimpan', 'Iuran perusahaan tersimpan', 'Total iuran'].map(source => t(source)),
      ...filteredData.map(record => [record.payroll_number ?? '', record.employee?.employee_id ?? '', record.employee?.name ?? '',
        record.employeeContribution, record.companyContribution, record.totalContribution]),
    ];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bpjs-kesehatan-${selectedPeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadError) return (
    <div className="ph-workflow tax-workflow tax-error-page">
      <h1 className="text-2xl font-bold">{t("BPJS Kesehatan")}</h1>
      <div role="alert" className="rounded-md bg-red-50 p-5 text-red-800">{savedPayrollError(loadError)}</div>
      <button type="button" onClick={() => void fetchData()} className="ph-button tax-button ph-button-primary">{t("Coba lagi")}</button>
    </div>
  );

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("BPJS Kesehatan")}</h1><p>{t("Kelola iuran BPJS Kesehatan karyawan")}</p></div><div className="ph-actions tax-header-actions"><button type="button" onClick={exportCSV} disabled={loading || filteredData.length === 0} className="ph-button tax-button">
              <Download className="w-4 h-4" />{t("Export")} </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <FileText className="w-4 h-4" />{t("Generate Report")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Iuran menggunakan nilai payroll tersimpan. Nomor peserta, tanggungan, status pembayaran dan riwayat grafik masih contoh tampilan, bukan data kepesertaan atau bukti pembayaran. CSV berisi iuran tersimpan; pembuatan laporan dan slip belum tersedia.")}</p>

      {/* Stats Cards */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input aria-label={t("Cari karyawan...")}
              type="text"
              placeholder={t("Cari karyawan...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent tax-control"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select aria-label={t("Periode")}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white tax-control"
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
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white tax-control"
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

            <div className="relative">
              <select aria-label={t("Status")}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white tax-control"
              >
                <option value="all">{t("Semua Status")}</option>
                <option value="paid">{t("Paid")}</option>
                <option value="pending">{t("Pending")}</option>
                <option value="overdue">{t("Overdue")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="ph-button tax-button"
            >
              <Filter className="w-4 h-4" />{t("Filter")} </button>
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Peserta")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{insightNumber(stats.totalEmployees)}</p>
<p className="text-xs text-gray-400 mt-1">{t("Karyawan terdaftar")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Iuran Karyawan")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalEmployeeContribution)}
              </p>
<p className="text-xs text-emerald-600 mt-1">{t("Nilai payroll tersimpan")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Iuran Perusahaan")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalCompanyContribution)}
              </p>
<p className="text-xs text-blue-600 mt-1">{t("Ditanggung perusahaan")}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Iuran")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalContribution)}
              </p>
<p className="text-xs text-gray-400 mt-1">{t("Nilai payroll tersimpan")}</p></div>
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
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">{t("No. BPJS")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Gaji Pokok")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Iuran Karyawan")} </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500">{t("Iuran Perusahaan")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Tanggungan")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Status")} </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
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
                      <span className="tabular-nums text-sm text-gray-600">{record.bpjsNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-gray-900">{formatCurrency(record.baseSalary)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-rose-600 font-medium">{formatCurrency(record.employeeContribution)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-pink-600 font-medium">{formatCurrency(record.companyContribution)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
                        <Users className="w-3 h-3" />
                        {insightNumber(record.familyMembers)}
                      </span>
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
        <Modal isOpen={true} onClose={() => setSelectedEmployee(null)} title={t("Detail BPJS Kesehatan")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Iuran menggunakan nilai payroll tersimpan. Nomor peserta, tanggungan, status pembayaran dan riwayat grafik masih contoh tampilan, bukan data kepesertaan atau bukti pembayaran. CSV berisi iuran tersimpan; pembuatan laporan dan slip belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Employee Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center font-bold text-xl tax-initials">
                  {(selectedEmployee.employee?.name || 'N')[0]}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedEmployee.employee?.name || t('N/A')}
                  </h4>
                  <p className="text-gray-500">{selectedEmployee.employee?.employee_id}</p>
                </div>
              </div>

              {/* BPJS Details */}
              <div className="ph-section tax-section tax-stack">
                <dl className="ph-kv tax-kv-row"><dt>{t("No. BPJS Kesehatan")}</dt><dd>{selectedEmployee.bpjsNumber}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Jumlah Tanggungan")}</dt><dd>{insightNumber(selectedEmployee.familyMembers)}{' '}{t("orang")}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Kelas Rawat Inap")}</dt><dd>{t("Kelas 1")}</dd></dl>
              </div>

              {/* Contribution Details */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">{t("Rincian Iuran")}</h5>
                <div className="ph-section tax-section tax-stack">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Gaji pokok dibayar (bukan dasar iuran)")}</dt><dd>{formatCurrency(selectedEmployee.baseSalary)}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Iuran Karyawan")}</dt><dd>
                      {formatCurrency(selectedEmployee.employeeContribution)}
                    </dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Iuran Perusahaan")}</dt><dd>
                      {formatCurrency(selectedEmployee.companyContribution)}
                    </dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Total Iuran")}</dt><dd>
                      {formatCurrency(selectedEmployee.totalContribution)}
                    </dd></dl>
                </div>
              </div>

              {/* Status */}
              <div className="ph-section tax-section tax-inline">
                <span className="text-gray-600">{t("Status Pembayaran")}</span>
                {getStatusBadge(selectedEmployee.status)}
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
                <Bar dataKey="employee" name={t("Karyawan")} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="company" name={t("Perusahaan")} fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="ph-section tax-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("Status Pembayaran")}</h3>
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
