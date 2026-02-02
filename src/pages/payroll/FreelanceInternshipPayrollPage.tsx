import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { companyService, type Company } from '@/services/company.service';
import { employeeService } from '@/services/employee.service';
import type { Employee } from '@/types';

type EmploymentType = 'freelance' | 'internship';

interface FreelanceDetail {
  rate_type: 'hourly' | 'daily' | 'project';
  rate_amount: number;
  quantity: number;
  total_fee: number;
}

interface InternshipDetail {
  stipend: number;
  meal_allowance?: number;
  transport_allowance?: number;
}

interface TaxDetail {
  gross_income: number;
  gross_up: number;
  ptkp: string;
  ptkp_amount: number;
  pkp: number;
  tax_rate: string;
  pph21: number;
  effective_rate: number;
  formula: string;
}

interface PayrollRecord {
  id: number;
  company_id: number;
  employment_type: EmploymentType;
  employee: {
    id: number;
    name: string;
    employee_id: string;
    department: string;
    position: string;
    avatar?: string;
    join_date?: string;
    bank_name?: string;
    bank_account?: string;
  };
  period: string;
  total_payment: number;
  gross_up: number;
  tax: number;
  tax_detail?: TaxDetail;
  freelance_detail?: FreelanceDetail;
  internship_detail?: InternshipDetail;
  net_salary: number;
  company_cost: number;
  status: 'pending' | 'processing' | 'validated' | 'paid';
  paid_at?: string;
  calculated_at?: string;
  validated_by?: string;
  paid_by?: string;
}

interface PayrollSummary {
  total_freelance: number;
  total_internship: number;
  pending_count: number;
  paid_count: number;
  total_payment: number;
}

// Constants for gross-up calculation (matching Laravel HRIS)
const GROSS_UP_DIVISOR = 0.975; // H3/0.975
const PPH21_RATE = 0.025; // 2.5% PPH21 rate

// Helper function to convert Employee to PayrollRecord
const employeeToPayrollRecord = (employee: Employee, period: string): PayrollRecord => {
  const isFreelance = employee.employment_type === 'freelance';
  const basicSalary = Number(employee.basic_salary || 0);
  const mealAllowance = Number(employee.meal_allowance || 0);
  const transportAllowance = Number(employee.transport_allowance || 0);

  if (isFreelance) {
    // Freelance: Use gross-up formula (matching Laravel HRIS)
    // Gross Up = Basic Salary ÷ 0.975
    // PPH21 = Gross Up × 2.5%
    // Employee receives full basic salary, company pays the tax
    const totalPayment = basicSalary; // What employee receives
    const grossUp = Math.round(basicSalary / GROSS_UP_DIVISOR);
    const tax = Math.round(grossUp * PPH21_RATE);
    const effectiveRate = basicSalary > 0 ? (tax / basicSalary) * 100 : 0;
    const companyCost = basicSalary + tax; // Company pays: basic + PPH21

    return {
      id: employee.id,
      company_id: employee.company_id || 0,
      employment_type: 'freelance',
      employee: {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id || '-',
        department: employee.department?.name || '-',
        position: employee.position?.name || employee.job_title || '-',
        avatar: employee.avatar,
        bank_name: undefined,
        bank_account: undefined,
      },
      period,
      total_payment: totalPayment,
      gross_up: grossUp,
      tax,
      tax_detail: {
        gross_income: totalPayment,
        gross_up: grossUp,
        ptkp: '-',
        ptkp_amount: 0,
        pkp: grossUp,
        tax_rate: 'PPh 21 Final 2.5%',
        pph21: tax,
        effective_rate: Math.round(effectiveRate * 100) / 100,
        formula: 'Gross Up = Basic Salary ÷ 0.975, PPH21 = Gross Up × 2.5%',
      },
      freelance_detail: {
        rate_type: 'project',
        rate_amount: basicSalary,
        quantity: 1,
        total_fee: basicSalary,
      },
      net_salary: totalPayment, // Employee receives full amount
      company_cost: companyCost,
      status: 'pending',
    };
  } else {
    // Internship: Also use gross-up formula (same as freelance)
    const totalPayment = basicSalary + mealAllowance + transportAllowance;
    const grossUp = Math.round(totalPayment / GROSS_UP_DIVISOR);
    const tax = Math.round(grossUp * PPH21_RATE);
    const effectiveRate = totalPayment > 0 ? (tax / totalPayment) * 100 : 0;
    const companyCost = totalPayment + tax;

    return {
      id: employee.id,
      company_id: employee.company_id || 0,
      employment_type: 'internship',
      employee: {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id || '-',
        department: employee.department?.name || '-',
        position: employee.position?.name || employee.job_title || '-',
        avatar: employee.avatar,
        join_date: employee.join_date,
        bank_name: undefined,
        bank_account: undefined,
      },
      period,
      total_payment: totalPayment,
      gross_up: grossUp,
      tax,
      tax_detail: {
        gross_income: totalPayment,
        gross_up: grossUp,
        ptkp: '-',
        ptkp_amount: 0,
        pkp: grossUp,
        tax_rate: 'PPh 21 Final 2.5%',
        pph21: tax,
        effective_rate: Math.round(effectiveRate * 100) / 100,
        formula: 'Gross Up = Basic Salary ÷ 0.975, PPH21 = Gross Up × 2.5%',
      },
      internship_detail: {
        stipend: basicSalary,
        meal_allowance: mealAllowance || undefined,
        transport_allowance: transportAllowance || undefined,
      },
      net_salary: totalPayment, // Employee receives full amount
      company_cost: companyCost,
      status: 'pending',
    };
  }
};

export function FreelanceInternshipPayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'processing' | 'validation' | 'processed'>('processing');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-01');
  const [search, setSearch] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<EmploymentType | 'all'>('all');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchPayrollData();
    }
  }, [selectedPeriod, selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      const activeCompanies = response.data.filter(c => c.is_active);
      setCompanies(activeCompanies);
      if (activeCompanies.length > 0) {
        setSelectedCompanyId(activeCompanies[0].id);
      }
    } catch {
      toast.error('Gagal memuat data company');
    }
  };

  const fetchPayrollData = async () => {
    setIsLoading(true);
    try {
      // Fetch freelance employees (only active)
      const freelanceResponse = await employeeService.getAll({
        company_id: selectedCompanyId || undefined,
        employment_type: 'freelance',
        employment_status: 'active',
        page: 1,
        limit: 100,
      });

      // Fetch internship employees (only active)
      const internshipResponse = await employeeService.getAll({
        company_id: selectedCompanyId || undefined,
        employment_type: 'internship',
        employment_status: 'active',
        page: 1,
        limit: 100,
      });

      // Convert employees to PayrollRecords
      const freelanceRecords = freelanceResponse.data.map(emp =>
        employeeToPayrollRecord(emp, selectedPeriod)
      );
      const internshipRecords = internshipResponse.data.map(emp =>
        employeeToPayrollRecord(emp, selectedPeriod)
      );

      const allRecords = [...freelanceRecords, ...internshipRecords];
      setRecords(allRecords);

      // Calculate summary
      const newSummary: PayrollSummary = {
        total_freelance: freelanceRecords.length,
        total_internship: internshipRecords.length,
        pending_count: allRecords.filter(r => r.status === 'pending' || r.status === 'processing').length,
        paid_count: allRecords.filter(r => r.status === 'paid').length,
        total_payment: allRecords.reduce((sum, r) => sum + r.total_payment, 0),
      };
      setSummary(newSummary);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      toast.error('Gagal memuat data payroll');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredRecords = records.filter(record => {
    const matchCompany = record.company_id === selectedCompanyId;
    const matchSearch =
      record.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      record.employee.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchEmploymentType = employmentTypeFilter === 'all' || record.employment_type === employmentTypeFilter;

    if (activeTab === 'processing') {
      return matchCompany && matchSearch && matchEmploymentType && (record.status === 'pending' || record.status === 'processing');
    } else if (activeTab === 'validation') {
      return matchCompany && matchSearch && matchEmploymentType && record.status === 'validated';
    } else if (activeTab === 'processed') {
      return matchCompany && matchSearch && matchEmploymentType && record.status === 'paid';
    }
    return matchCompany && matchSearch && matchEmploymentType;
  });

  const handleViewDetail = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const updateRecordStatus = async (recordId: number, newStatus: PayrollRecord['status']) => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRecords(prev => prev.map(record =>
        record.id === recordId
          ? {
              ...record,
              status: newStatus,
              ...(newStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
              ...(newStatus === 'validated' ? { validated_by: 'Current User' } : {}),
            }
          : record
      ));
      const statusMessages: Record<string, string> = {
        processing: 'Payroll sedang diproses',
        validated: 'Payroll berhasil divalidasi',
        paid: 'Payroll berhasil dibayar',
      };
      toast.success(statusMessages[newStatus] || 'Status berhasil diupdate');
    } catch {
      toast.error('Gagal mengupdate status');
    } finally {
      setIsProcessing(false);
    }
  };

  const batchUpdateStatus = async (newStatus: PayrollRecord['status']) => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal 1 record');
      return;
    }
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setRecords(prev => prev.map(record =>
        selectedIds.includes(record.id)
          ? {
              ...record,
              status: newStatus,
              ...(newStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
              ...(newStatus === 'validated' ? { validated_by: 'Current User' } : {}),
            }
          : record
      ));
      toast.success(`${selectedIds.length} payroll berhasil diupdate`);
      setSelectedIds([]);
    } catch {
      toast.error('Gagal mengupdate status');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Processing
          </span>
        );
      case 'validated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validated
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Paid
          </span>
        );
      default:
        return null;
    }
  };

  const getActionButton = (record: PayrollRecord) => {
    switch (record.status) {
      case 'pending':
        return (
          <button
            onClick={() => updateRecordStatus(record.id, 'processing')}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Proses
          </button>
        );
      case 'processing':
        return (
          <button
            onClick={() => updateRecordStatus(record.id, 'validated')}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            Validasi
          </button>
        );
      case 'validated':
        return (
          <button
            onClick={() => updateRecordStatus(record.id, 'paid')}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Bayar
          </button>
        );
      case 'paid':
        return (
          <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">
            Selesai
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-teal-600 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Freelance & Internship
                  </h1>
                  <p className="text-orange-100 text-sm mt-1">
                    {selectedCompany ? (
                      <>Proses pembayaran non-permanent - <span className="font-semibold">{selectedCompany.name}</span></>
                    ) : (
                      'Pilih company untuk memulai'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  💻 {summary?.total_freelance || 0} Freelance
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  🎓 {summary?.total_internship || 0} Internship
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Company Selector */}
              <div className="relative">
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-medium cursor-pointer min-w-[200px]"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id} className="text-gray-900">
                      {company.name}
                    </option>
                  ))}
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Period Selector */}
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-medium cursor-pointer"
                >
                  <option value="2026-01" className="text-gray-900">Januari 2026</option>
                  <option value="2025-12" className="text-gray-900">Desember 2025</option>
                  <option value="2025-11" className="text-gray-900">November 2025</option>
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-orange-700 rounded-xl hover:bg-orange-50 transition-all duration-200 font-semibold shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">💻</span>
            </div>
            <span className="text-xs font-semibold text-gray-500">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{summary?.total_freelance || 0}</p>
          <p className="text-sm text-gray-500">Freelancer</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🎓</span>
            </div>
            <span className="text-xs font-semibold text-gray-500">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{summary?.total_internship || 0}</p>
          <p className="text-sm text-gray-500">Magang</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{summary?.pending_count || 0}</p>
          <p className="text-sm text-gray-500">Perlu Diproses</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Done
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{summary?.paid_count || 0}</p>
          <p className="text-sm text-gray-500">Sudah Dibayar</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Employment Type Filter */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">Filter:</span>
            {[
              { id: 'all', label: 'Semua', icon: '👥' },
              { id: 'freelance', label: 'Freelance', icon: '💻' },
              { id: 'internship', label: 'Internship', icon: '🎓' },
            ].map(type => {
              const count = records.filter(r =>
                r.company_id === selectedCompanyId &&
                (type.id === 'all' || r.employment_type === type.id)
              ).length;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    setEmploymentTypeFilter(type.id as EmploymentType | 'all');
                    setSelectedIds([]);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    employmentTypeFilter === type.id
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>{type.icon}</span>
                  {type.label}
                  {count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs font-bold rounded ${
                      employmentTypeFilter === type.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'processing', label: 'Processing', count: records.filter(r => r.company_id === selectedCompanyId && (r.status === 'pending' || r.status === 'processing')).length },
              { id: 'validation', label: 'Validation', count: records.filter(r => r.company_id === selectedCompanyId && r.status === 'validated').length },
              { id: 'processed', label: 'Processed', count: records.filter(r => r.company_id === selectedCompanyId && r.status === 'paid').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                    activeTab === tab.id ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Batch Actions */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Cari nama atau ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Batch Actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                {activeTab === 'processing' && (
                  <button
                    onClick={() => batchUpdateStatus('validated')}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    Validasi ({selectedIds.length})
                  </button>
                )}
                {activeTab === 'validation' && (
                  <button
                    onClick={() => batchUpdateStatus('paid')}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Bayar ({selectedIds.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Periode: <span className="font-semibold text-gray-900">{formatPeriod(selectedPeriod)}</span></span>
            </div>
            <span className="text-sm text-gray-500">{filteredRecords.length} data</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {!selectedCompanyId ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Pilih Company</h3>
              <p className="mt-1 text-gray-500">Pilih company terlebih dahulu.</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                <p className="text-gray-500">Memuat data...</p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Tidak ada data</h3>
              <p className="mt-1 text-gray-500">Tidak ada data untuk ditampilkan.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {activeTab !== 'processed' && (
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                    </th>
                  )}
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pembayaran</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pajak</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Take Home</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map(record => (
                  <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(record.id) ? 'bg-orange-50' : ''}`}>
                    {activeTab !== 'processed' && (
                      <td className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelection(record.id)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
                          record.employment_type === 'freelance' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-teal-500 to-teal-600'
                        }`}>
                          {record.employee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{record.employee.name}</p>
                          <p className="text-xs text-gray-500">{record.employee.employee_id} • {record.employee.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.employment_type === 'freelance' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                          💻 Freelance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                          🎓 Internship
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(record.total_payment)}</p>
                      {record.freelance_detail && (
                        <p className="text-xs text-gray-500">
                          {formatCurrency(record.freelance_detail.rate_amount)}/{record.freelance_detail.rate_type === 'hourly' ? 'jam' : record.freelance_detail.rate_type === 'daily' ? 'hari' : 'project'}
                        </p>
                      )}
                      {record.internship_detail && (
                        <p className="text-xs text-gray-500">Uang Saku + Tunjangan</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.tax > 0 ? (
                        <>
                          <p className="font-medium text-amber-600">{formatCurrency(record.tax)}</p>
                          <p className="text-xs text-gray-500">PPh 21 (Company)</p>
                        </>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900 text-lg">{formatCurrency(record.net_salary)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {getActionButton(record)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className={`px-6 py-5 ${
                selectedRecord.employment_type === 'freelance'
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                  : 'bg-gradient-to-br from-teal-500 to-teal-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                      {selectedRecord.employee.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedRecord.employee.name}</h2>
                      <p className="text-white/80 text-sm">
                        {selectedRecord.employee.employee_id} • {selectedRecord.employee.position}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-lg text-sm text-white">
                    {selectedRecord.employment_type === 'freelance' ? '💻 Freelance' : '🎓 Internship'}
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-sm text-white">
                    Periode: {formatPeriod(selectedRecord.period)}
                  </span>
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-4">
                {/* Freelance Detail */}
                {selectedRecord.employment_type === 'freelance' && selectedRecord.freelance_detail && (
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Perhitungan Fee</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipe Rate</span>
                        <span className="font-medium capitalize">
                          {selectedRecord.freelance_detail.rate_type === 'hourly' ? 'Per Jam' :
                           selectedRecord.freelance_detail.rate_type === 'daily' ? 'Per Hari' : 'Per Project'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rate</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.freelance_detail.rate_amount)}</span>
                      </div>
                      {selectedRecord.freelance_detail.rate_type !== 'project' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Jumlah {selectedRecord.freelance_detail.rate_type === 'hourly' ? 'Jam' : 'Hari'}
                          </span>
                          <span className="font-medium">{selectedRecord.freelance_detail.quantity}</span>
                        </div>
                      )}
                      <div className="border-t border-orange-200 pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">Total Fee</span>
                        <span className="font-bold text-orange-600">{formatCurrency(selectedRecord.freelance_detail.total_fee)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Internship Detail */}
                {selectedRecord.employment_type === 'internship' && selectedRecord.internship_detail && (
                  <div className="bg-teal-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Kompensasi Magang</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uang Saku</span>
                        <span className="font-medium text-teal-600">{formatCurrency(selectedRecord.internship_detail.stipend)}</span>
                      </div>
                      {selectedRecord.internship_detail.meal_allowance && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uang Makan</span>
                          <span className="font-medium text-teal-600">{formatCurrency(selectedRecord.internship_detail.meal_allowance)}</span>
                        </div>
                      )}
                      {selectedRecord.internship_detail.transport_allowance && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uang Transport</span>
                          <span className="font-medium text-teal-600">{formatCurrency(selectedRecord.internship_detail.transport_allowance)}</span>
                        </div>
                      )}
                      <div className="border-t border-teal-200 pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-teal-600">{formatCurrency(selectedRecord.total_payment)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tax Calculation (Gross-Up Formula) */}
                {selectedRecord.tax > 0 && (
                  <div className="bg-amber-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Perhitungan Pajak (PPh 21 Final - Gross Up)</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Basic Salary (Diterima Karyawan)</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.total_payment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gross Up (÷ 0.975)</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.gross_up)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tarif PPh 21</span>
                        <span className="font-medium">2.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Effective Rate</span>
                        <span className="font-medium">{selectedRecord.tax_detail?.effective_rate?.toFixed(2)}%</span>
                      </div>
                      <div className="border-t border-amber-200 pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">PPh 21 (Dibayar Perusahaan)</span>
                        <span className="font-bold text-amber-700">{formatCurrency(selectedRecord.tax)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 mt-3 italic">
                      Formula: Gross Up = Basic Salary ÷ 0.975, PPH21 = Gross Up × 2.5%
                    </p>
                  </div>
                )}

                {/* Company Cost */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Biaya Perusahaan</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gaji/Fee Karyawan</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.total_payment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">PPh 21 (Company Pays)</span>
                      <span className="font-medium text-amber-600">+{formatCurrency(selectedRecord.tax)}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                      <span className="font-semibold">Total Biaya Perusahaan</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedRecord.company_cost)}</span>
                    </div>
                  </div>
                </div>

                {/* Take Home Pay */}
                <div className={`rounded-xl p-6 ${
                  selectedRecord.employment_type === 'freelance'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                    : 'bg-gradient-to-r from-teal-500 to-teal-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Take Home Pay</p>
                      <p className="text-white text-3xl font-bold mt-1">{formatCurrency(selectedRecord.net_salary)}</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Bank</h3>
                    <p className="text-sm text-gray-600">{selectedRecord.employee.bank_name || '-'}</p>
                    <p className="text-sm font-mono text-gray-600">{selectedRecord.employee.bank_account || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Status Proses</h3>
                    {selectedRecord.calculated_at && (
                      <p className="text-xs text-gray-600">Dihitung: {formatDateTime(selectedRecord.calculated_at)}</p>
                    )}
                    {selectedRecord.validated_by && (
                      <p className="text-xs text-gray-600">Validasi: {selectedRecord.validated_by}</p>
                    )}
                    {selectedRecord.paid_at && (
                      <p className="text-xs text-gray-600">Dibayar: {formatDateTime(selectedRecord.paid_at)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className={`px-6 py-2 text-white rounded-lg font-medium ${
                    selectedRecord.employment_type === 'freelance'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-teal-600 hover:bg-teal-700'
                  } transition-colors`}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
