// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Search,
  Filter,
  Download,
  Building2,
  Users,
  Calendar,
  TrendingUp,
  ChevronDown,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Calculator,
  Percent,
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
import { payrollService, type Payroll } from '@/services/payroll.service';
import { companyService, type Company } from '@/services/company.service';

// BPJS Kesehatan rate constants
const BPJS_KES_RATE_EMPLOYEE = 0.01; // 1% employee
const BPJS_KES_RATE_COMPANY = 0.04; // 4% company
const BPJS_KES_MAX_SALARY = 12000000; // Max salary for BPJS Kesehatan calculation

export function BPJSKesehatanPage() {
  const [payrollData, setPayrollData] = useState<Payroll[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-01');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Payroll | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  // Calculate BPJS Kesehatan for each employee
  const bpjsData = useMemo(() => {
    return payrollData.map((record) => {
      const baseSalary = Math.min(record.basic_salary, BPJS_KES_MAX_SALARY);
      const employeeContribution = baseSalary * BPJS_KES_RATE_EMPLOYEE;
      const companyContribution = baseSalary * BPJS_KES_RATE_COMPANY;
      const totalContribution = employeeContribution + companyContribution;

      // Random status for demo
      const statuses = ['paid', 'pending', 'overdue'];
      const randomStatus = statuses[Math.floor(Math.random() * 10) % 3];

      return {
        ...record,
        baseSalary,
        employeeContribution,
        companyContribution,
        totalContribution,
        bpjsNumber: `000${record.employee?.id || 0}${Math.floor(Math.random() * 10000)}`.slice(-13),
        status: randomStatus as 'paid' | 'pending' | 'overdue',
        familyMembers: Math.floor(Math.random() * 4) + 1,
      };
    });
  }, [payrollData]);

  // Filter data
  const filteredData = useMemo(() => {
    return bpjsData.filter((record) => {
      const employeeName = record.employee?.name || '';
      const employeeId = record.employee?.employee_id || '';
      const matchesSearch =
        employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = selectedCompany === 'all' || record.company_id === selectedCompany;
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
    { month: 'Aug', employee: 45000000, company: 180000000 },
    { month: 'Sep', employee: 46500000, company: 186000000 },
    { month: 'Oct', employee: 47200000, company: 188800000 },
    { month: 'Nov', employee: 48000000, company: 192000000 },
    { month: 'Dec', employee: 49500000, company: 198000000 },
    { month: 'Jan', employee: stats.totalEmployeeContribution, company: stats.totalCompanyContribution },
  ];

  // Status distribution for pie chart
  const statusData = [
    { name: 'Paid', value: stats.paidCount, color: '#10b981' },
    { name: 'Pending', value: stats.pendingCount, color: '#f59e0b' },
    { name: 'Overdue', value: stats.overdueCount, color: '#ef4444' },
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
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BPJS Kesehatan</h1>
              <p className="text-rose-100">Kelola iuran BPJS Kesehatan karyawan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-medium">
              <FileText className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Peserta</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
              <p className="text-xs text-gray-400 mt-1">Karyawan terdaftar</p>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl">
              <Users className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Iuran Karyawan (1%)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalEmployeeContribution)}
              </p>
              <p className="text-xs text-emerald-600 mt-1">Dipotong dari gaji</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Iuran Perusahaan (4%)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalCompanyContribution)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Ditanggung perusahaan</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Iuran</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalContribution)}
              </p>
              <p className="text-xs text-gray-400 mt-1">5% dari gaji pokok</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
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
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="employee" name="Karyawan" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="company" name="Perusahaan" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Pembayaran</h3>
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
              placeholder="Cari karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
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
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
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

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
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
                  No. BPJS
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Gaji Pokok
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Iuran Karyawan
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Iuran Perusahaan
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tanggungan
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
                      <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
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
                      <span className="font-mono text-sm text-gray-600">{record.bpjsNumber}</span>
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
                        {record.familyMembers}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedEmployee(record)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                <h3 className="text-lg font-semibold text-gray-900">Detail BPJS Kesehatan</h3>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
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
              <div className="bg-rose-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">No. BPJS Kesehatan</span>
                  <span className="font-mono font-medium">{selectedEmployee.bpjsNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jumlah Tanggungan</span>
                  <span className="font-medium">{selectedEmployee.familyMembers} orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kelas Rawat Inap</span>
                  <span className="font-medium">Kelas 1</span>
                </div>
              </div>

              {/* Contribution Details */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Rincian Iuran</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gaji Pokok (max 12jt)</span>
                    <span className="font-medium">{formatCurrency(selectedEmployee.baseSalary)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="text-gray-600">Iuran Karyawan (1%)</span>
                    <span className="font-medium text-rose-600">
                      {formatCurrency(selectedEmployee.employeeContribution)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Iuran Perusahaan (4%)</span>
                    <span className="font-medium text-pink-600">
                      {formatCurrency(selectedEmployee.companyContribution)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-medium text-gray-900">Total Iuran</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(selectedEmployee.totalContribution)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Status Pembayaran</span>
                {getStatusBadge(selectedEmployee.status)}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">
                Download Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
