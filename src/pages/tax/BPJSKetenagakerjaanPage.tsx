import { useState, useEffect, useMemo } from 'react';
import {
  HardHat,
  Search,
  Filter,
  Download,
  Building2,
  Users,
  TrendingUp,
  ChevronDown,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Briefcase,
  PiggyBank,
  Home,
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
import { payrollService, type PayrollRecord } from '@/services/payroll.service';
import { companyService, type Company } from '@/services/company.service';

// BPJS Ketenagakerjaan rate constants
const JKK_RATE = 0.0024; // 0.24% - Jaminan Kecelakaan Kerja (company)
const JKM_RATE = 0.003; // 0.3% - Jaminan Kematian (company)
const JHT_EMPLOYEE_RATE = 0.02; // 2% - Jaminan Hari Tua (employee)
const JHT_COMPANY_RATE = 0.037; // 3.7% - Jaminan Hari Tua (company)
const JP_EMPLOYEE_RATE = 0.01; // 1% - Jaminan Pensiun (employee)
const JP_COMPANY_RATE = 0.02; // 2% - Jaminan Pensiun (company)
const JP_MAX_SALARY = 10042300; // Max salary for JP calculation (2025)

export function BPJSKetenagakerjaanPage() {
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-01');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payrollRes, companiesRes] = await Promise.all([
        payrollService.getAll({ period: selectedPeriod, limit: 1000 }),
        companyService.getAll(),
      ]);
      setPayrollData(payrollRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate BPJS Ketenagakerjaan for each employee
  const bpjsData = useMemo(() => {
    return payrollData.map((record) => {
      const baseSalary = record.basicSalary;
      const jpSalary = Math.min(baseSalary, JP_MAX_SALARY);

      // JKK - Jaminan Kecelakaan Kerja (company only)
      const jkk = baseSalary * JKK_RATE;

      // JKM - Jaminan Kematian (company only)
      const jkm = baseSalary * JKM_RATE;

      // JHT - Jaminan Hari Tua
      const jhtEmployee = baseSalary * JHT_EMPLOYEE_RATE;
      const jhtCompany = baseSalary * JHT_COMPANY_RATE;

      // JP - Jaminan Pensiun
      const jpEmployee = jpSalary * JP_EMPLOYEE_RATE;
      const jpCompany = jpSalary * JP_COMPANY_RATE;

      const totalEmployee = jhtEmployee + jpEmployee;
      const totalCompany = jkk + jkm + jhtCompany + jpCompany;
      const totalContribution = totalEmployee + totalCompany;

      const statuses = ['paid', 'pending', 'overdue'];
      const randomStatus = statuses[Math.floor(Math.random() * 10) % 3];

      return {
        ...record,
        baseSalary,
        jpSalary,
        jkk,
        jkm,
        jhtEmployee,
        jhtCompany,
        jpEmployee,
        jpCompany,
        totalEmployee,
        totalCompany,
        totalContribution,
        bpjsTkNumber: `TK${record.employee.id}${Math.floor(Math.random() * 100000)}`.slice(0, 16),
        status: randomStatus as 'paid' | 'pending' | 'overdue',
      };
    });
  }, [payrollData]);

  // Filter data
  const filteredData = useMemo(() => {
    return bpjsData.filter((record) => {
      const matchesSearch =
        record.employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = selectedCompany === 'all' || record.employee.company?.id === selectedCompany;
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
    { name: 'JKK', value: stats.totalJKK, color: '#f43f5e' },
    { name: 'JKM', value: stats.totalJKM, color: '#8b5cf6' },
    { name: 'JHT', value: stats.totalJHT, color: '#3b82f6' },
    { name: 'JP', value: stats.totalJP, color: '#10b981' },
  ];

  // Trend data
  const trendData = [
    { month: 'Aug', employee: 85000000, company: 142000000 },
    { month: 'Sep', employee: 87000000, company: 145000000 },
    { month: 'Oct', employee: 89000000, company: 148000000 },
    { month: 'Nov', employee: 91000000, company: 152000000 },
    { month: 'Dec', employee: 93000000, company: 155000000 },
    { month: 'Jan', employee: stats.totalEmployee, company: stats.totalCompany },
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
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  const periods = [
    { value: '2025-01', label: 'January 2025' },
    { value: '2024-12', label: 'December 2024' },
    { value: '2024-11', label: 'November 2024' },
    { value: '2024-10', label: 'October 2024' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <HardHat className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BPJS Ketenagakerjaan</h1>
              <p className="text-amber-100">Kelola iuran JKK, JKM, JHT & JP karyawan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg hover:bg-amber-50 transition-colors font-medium">
              <FileText className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Program Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">JKK (Kecelakaan Kerja)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJKK)}</p>
              <p className="text-xs text-rose-600 mt-1">0.24% dari gaji (Perusahaan)</p>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl">
              <Shield className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">JKM (Kematian)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJKM)}</p>
              <p className="text-xs text-purple-600 mt-1">0.3% dari gaji (Perusahaan)</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">JHT (Hari Tua)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJHT)}</p>
              <p className="text-xs text-blue-600 mt-1">2% + 3.7% = 5.7% dari gaji</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <PiggyBank className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">JP (Pensiun)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalJP)}</p>
              <p className="text-xs text-emerald-600 mt-1">1% + 2% = 3% (max 10jt)</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Home className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">Total Iuran Karyawan</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalEmployee)}</p>
              <p className="text-xs text-blue-200 mt-1">JHT 2% + JP 1% = 3%</p>
            </div>
            <Users className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-100">Total Iuran Perusahaan</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalCompany)}</p>
              <p className="text-xs text-purple-200 mt-1">JKK + JKM + JHT + JP</p>
            </div>
            <Building2 className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-100">Total Keseluruhan</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalContribution)}</p>
              <p className="text-xs text-amber-200 mt-1">{stats.totalEmployees} karyawan</p>
            </div>
            <TrendingUp className="w-10 h-10 text-amber-200" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Iuran Bulanan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="employee" name="Karyawan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="company" name="Perusahaan" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Program Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Program</h3>
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
              placeholder="Cari karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
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
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="all">Semua Perusahaan</option>
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Karyawan
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  No. BPJS TK
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  JKK + JKM
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  JHT
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  JP
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
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                filteredData.slice(0, 20).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                          {record.employee.firstName[0]}
                          {record.employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {record.employee.firstName} {record.employee.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{record.employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">{record.bpjsTkNumber}</span>
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
                      <button
                        onClick={() => setSelectedEmployee(record)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detail BPJS Ketenagakerjaan</h3>
                <button
                  onClick={() => setSelectedEmployee(null)}
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
              {/* Employee Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                  {selectedEmployee.employee.firstName[0]}
                  {selectedEmployee.employee.lastName[0]}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedEmployee.employee.firstName} {selectedEmployee.employee.lastName}
                  </h4>
                  <p className="text-gray-500">{selectedEmployee.employee.employeeId}</p>
                  <p className="text-sm text-gray-400">{selectedEmployee.employee.company?.name}</p>
                </div>
              </div>

              {/* BPJS Details */}
              <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">No. BPJS Ketenagakerjaan</span>
                  <span className="font-mono font-medium">{selectedEmployee.bpjsTkNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gaji Pokok</span>
                  <span className="font-medium">{formatCurrency(selectedEmployee.baseSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dasar JP (max 10jt)</span>
                  <span className="font-medium">{formatCurrency(selectedEmployee.jpSalary)}</span>
                </div>
              </div>

              {/* Program Details */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Rincian Program</h5>
                <div className="space-y-3">
                  {/* JKK */}
                  <div className="bg-rose-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-rose-700">JKK (Kecelakaan Kerja)</span>
                      <span className="text-xs bg-rose-200 text-rose-700 px-2 py-0.5 rounded">0.24%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Perusahaan</span>
                      <span className="font-medium">{formatCurrency(selectedEmployee.jkk)}</span>
                    </div>
                  </div>

                  {/* JKM */}
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-purple-700">JKM (Kematian)</span>
                      <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded">0.3%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Perusahaan</span>
                      <span className="font-medium">{formatCurrency(selectedEmployee.jkm)}</span>
                    </div>
                  </div>

                  {/* JHT */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-blue-700">JHT (Hari Tua)</span>
                      <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">5.7%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Karyawan (2%)</span>
                      <span className="font-medium">{formatCurrency(selectedEmployee.jhtEmployee)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Perusahaan (3.7%)</span>
                      <span className="font-medium">{formatCurrency(selectedEmployee.jhtCompany)}</span>
                    </div>
                  </div>

                  {/* JP */}
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-emerald-700">JP (Pensiun)</span>
                      <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded">3%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Karyawan (1%)</span>
                      <span className="font-medium">{formatCurrency(selectedEmployee.jpEmployee)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Perusahaan (2%)</span>
                      <span className="font-medium">{formatCurrency(selectedEmployee.jpCompany)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-100 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Karyawan</span>
                  <span className="font-medium text-blue-600">{formatCurrency(selectedEmployee.totalEmployee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Perusahaan</span>
                  <span className="font-medium text-purple-600">{formatCurrency(selectedEmployee.totalCompany)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-medium text-gray-900">Total Iuran</span>
                  <span className="font-bold text-gray-900">{formatCurrency(selectedEmployee.totalContribution)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                Download Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
