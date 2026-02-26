import { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Coins,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Building,
  Users,
  Download,
  Car,
  Utensils,
  Home,
  Phone,
  Briefcase,
  GraduationCap,
  Heart,
  Shirt,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Wifi,
  Gift,
  Trophy,
} from 'lucide-react';
import { allowanceService, ALLOWANCE_TYPES } from '../../services/allowance.service';
import type { Allowance, AllowanceListQuery, AllowanceType as AllowanceTypeEnum } from '../../services/allowance.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  basic_salary?: number;
  company_id?: number;
  department?: {
    id: number;
    name: string;
  };
}

export function AllowancesPage() {
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterTaxable, setFilterTaxable] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<Allowance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 12;

  const [formData, setFormData] = useState({
    name: '',
    type: 'transport' as AllowanceTypeEnum,
    description: '',
    is_taxable: true,
    is_bpjs_object: false,
    is_recurring: true,
    amount: 0,
    percentage: 0,
    calculation_base: 'fixed' as 'fixed' | 'basic_salary' | 'gross_salary',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'daily' | 'one_time',
    company_id: '' as string | number,
    employee_id: '' as string | number,
    status: 'active' as string,
    effective_date: '',
    end_date: '',
  });

  // Fetch allowances from API
  const fetchAllowances = useCallback(async () => {
    setLoading(true);
    try {
      const query: AllowanceListQuery = {
        page,
        limit,
        search: search || undefined,
      };
      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterCompany !== 'all' && filterCompany !== 'global') {
        query.company_id = Number(filterCompany);
      }
      if (filterTaxable !== 'all') {
        query.is_taxable = filterTaxable === 'taxable';
      }
      if (filterType !== 'all') {
        query.type = filterType;
      }

      const response = await allowanceService.list(query);
      setAllowances(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch allowances:', error);
      toast.error('Failed to load allowances');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterCompany, filterTaxable, filterType]);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  // Fetch employees (filtered by company if selected)
  const fetchEmployees = useCallback(async (companyId?: number) => {
    setLoadingEmployees(true);
    try {
      const params: { page: number; limit: number; company_id?: number; employment_status?: string } = {
        page: 1,
        limit: 200,
        employment_status: 'all',
      };
      if (companyId) {
        params.company_id = companyId;
      }
      const response = await employeeService.getAll(params);
      // Map to our local Employee interface (only active + resigned)
      setEmployees(response.data
        .filter(emp => emp.employment_status === 'active' || emp.employment_status === 'resigned')
        .map(emp => ({
          id: emp.id,
          name: emp.name,
          employee_id: emp.employee_id || '',
          basic_salary: emp.basic_salary,
          company_id: emp.company_id,
          department: emp.department || undefined,
        })));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Calculate allowance amount for percentage-based
  const calculateAllowanceAmount = useCallback(() => {
    if (!selectedEmployee?.basic_salary) return 0;
    if (formData.calculation_base === 'fixed') {
      return formData.amount || 0;
    }
    const percentage = formData.percentage || 0;
    // For now, assume gross_salary = basic_salary (simplified)
    const base = selectedEmployee.basic_salary;
    return Math.round(base * percentage / 100);
  }, [selectedEmployee, formData.calculation_base, formData.amount, formData.percentage]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch employees when modal opens or company changes
  useEffect(() => {
    if (showModal) {
      if (formData.company_id) {
        fetchEmployees(Number(formData.company_id));
      } else {
        fetchEmployees(); // Fetch all employees if no company selected
      }
    }
  }, [showModal, formData.company_id, fetchEmployees]);

  useEffect(() => {
    fetchAllowances();
  }, [fetchAllowances]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCompany, filterTaxable, filterType]);

  // Stats (computed from current data)
  const stats = useMemo(() => {
    const activeAllowances = allowances.filter(a => a.status === 'active');
    const totalAmount = activeAllowances.reduce((acc, a) => acc + Number(a.amount || 0), 0);
    const taxableAmount = activeAllowances.filter(a => a.is_taxable).reduce((acc, a) => acc + Number(a.amount || 0), 0);
    return {
      totalItems,
      activeCount: activeAllowances.length,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      taxableAmount: isNaN(taxableAmount) ? 0 : taxableAmount,
    };
  }, [allowances, totalItems]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'transport':
        return <Car className="w-5 h-5" />;
      case 'meal':
        return <Utensils className="w-5 h-5" />;
      case 'housing':
        return <Home className="w-5 h-5" />;
      case 'communication':
        return <Phone className="w-5 h-5" />;
      case 'position':
        return <Briefcase className="w-5 h-5" />;
      case 'medical':
        return <Heart className="w-5 h-5" />;
      case 'performance':
        return <GraduationCap className="w-5 h-5" />;
      case 'attendance':
        return <Clock className="w-5 h-5" />;
      case 'shift':
        return <Shirt className="w-5 h-5" />;
      case 'remote':
        return <Wifi className="w-5 h-5" />;
      case 'thr':
        return <Gift className="w-5 h-5" />;
      case 'bonus':
        return <Trophy className="w-5 h-5" />;
      default:
        return <Coins className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'transport':
        return 'from-blue-500 to-blue-600';
      case 'meal':
        return 'from-orange-500 to-orange-600';
      case 'housing':
        return 'from-green-500 to-green-600';
      case 'communication':
        return 'from-purple-500 to-purple-600';
      case 'position':
        return 'from-indigo-500 to-indigo-600';
      case 'medical':
        return 'from-red-500 to-red-600';
      case 'performance':
        return 'from-cyan-500 to-cyan-600';
      case 'attendance':
        return 'from-amber-500 to-amber-600';
      case 'shift':
        return 'from-pink-500 to-pink-600';
      case 'remote':
        return 'from-teal-500 to-teal-600';
      case 'thr':
        return 'from-yellow-500 to-yellow-600';
      case 'bonus':
        return 'from-emerald-500 to-emerald-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const handleOpenModal = (allowance?: Allowance) => {
    if (allowance) {
      setEditingAllowance(allowance);
      setFormData({
        name: allowance.name,
        type: allowance.type,
        description: allowance.description || '',
        is_taxable: allowance.is_taxable,
        is_bpjs_object: allowance.is_bpjs_object,
        is_recurring: allowance.is_recurring,
        amount: allowance.amount || 0,
        percentage: allowance.percentage || 0,
        calculation_base: allowance.calculation_base || 'fixed',
        frequency: allowance.frequency,
        company_id: allowance.company_id || '',
        employee_id: allowance.employee_id || '',
        status: allowance.status,
        effective_date: allowance.effective_date || '',
        end_date: allowance.end_date || '',
      });
      // Set selected employee from allowance data
      if (allowance.employee) {
        setSelectedEmployee({
          id: allowance.employee.id,
          name: allowance.employee.name,
          employee_id: allowance.employee.employee_id,
          basic_salary: allowance.employee.basic_salary,
          department: allowance.employee.department,
        });
      } else {
        setSelectedEmployee(null);
      }
    } else {
      setEditingAllowance(null);
      setFormData({
        name: '',
        type: 'transport',
        description: '',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        amount: 0,
        percentage: 0,
        calculation_base: 'fixed',
        frequency: 'monthly',
        company_id: '',
        employee_id: '',
        status: 'active',
        effective_date: '',
        end_date: '',
      });
      setSelectedEmployee(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAllowance(null);
    setSelectedEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      toast.error('Please fill in required fields');
      return;
    }

    // Require employee for percentage-based calculations
    if (formData.calculation_base !== 'fixed' && !formData.employee_id) {
      toast.error('Employee is required for percentage-based allowances');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
        is_taxable: formData.is_taxable,
        is_bpjs_object: formData.is_bpjs_object,
        is_recurring: formData.is_recurring,
        amount: formData.calculation_base === 'fixed' ? formData.amount : undefined,
        percentage: formData.calculation_base !== 'fixed' ? formData.percentage : undefined,
        calculation_base: formData.calculation_base,
        frequency: formData.frequency,
        company_id: formData.company_id ? Number(formData.company_id) : undefined,
        employee_id: formData.employee_id ? Number(formData.employee_id) : undefined,
        status: formData.status,
        effective_date: formData.effective_date || undefined,
        end_date: formData.end_date || undefined,
      };

      if (editingAllowance) {
        await allowanceService.update(editingAllowance.id, payload);
        toast.success('Allowance updated successfully');
      } else {
        await allowanceService.create(payload);
        toast.success('Allowance created successfully');
      }

      handleCloseModal();
      fetchAllowances();
    } catch (error: any) {
      console.error('Failed to save allowance:', error);
      toast.error(error.response?.data?.message || 'Failed to save allowance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this allowance?')) return;

    try {
      await allowanceService.delete(id);
      toast.success('Allowance deleted successfully');
      fetchAllowances();
    } catch (error: any) {
      console.error('Failed to delete allowance:', error);
      toast.error(error.response?.data?.message || 'Failed to delete allowance');
    }
  };

  // Toggle status - can be used for quick status change from card
  const _handleToggleStatus = async (allowance: Allowance) => {
    try {
      const newStatus = allowance.status === 'active' ? 'inactive' : 'active';
      await allowanceService.update(allowance.id, { status: newStatus });
      toast.success('Status updated');
      fetchAllowances();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };
  void _handleToggleStatus; // Silence unused warning

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const typeOptions = ALLOWANCE_TYPES.map(type => ({
    value: type,
    label: allowanceService.getTypeLabel(type),
    icon: getIcon(type),
  }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Coins className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Allowance Management
                  </h1>
                  <p className="text-emerald-100 text-sm mt-1">
                    Configure and manage employee allowance types
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toast.success('Export feature coming soon')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Add Allowance</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Coins className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalItems}</p>
          <p className="text-sm text-gray-500">Total Allowances</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Active
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.activeCount}</p>
          <p className="text-sm text-gray-500">Active on Page</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Coins className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalAmount)}</p>
          <p className="text-sm text-gray-500">Total Amount</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-lg">
              Taxable
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.taxableAmount)}</p>
          <p className="text-sm text-gray-500">Taxable Amount</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search allowance..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">All Types</option>
                {ALLOWANCE_TYPES.map(type => (
                  <option key={type} value={type}>{allowanceService.getTypeLabel(type)}</option>
                ))}
              </select>

              <select
                value={filterTaxable}
                onChange={(e) => setFilterTaxable(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">All Tax Status</option>
                <option value="taxable">Taxable</option>
                <option value="non-taxable">Non-Taxable</option>
              </select>

              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Allowance Cards Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : allowances.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No allowances found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allowances.map(allowance => (
                <div
                  key={allowance.id}
                  className={`relative overflow-hidden bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                    allowance.status === 'active' ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${getIconColor(allowance.type)}`}>
                        {getIcon(allowance.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{allowance.name}</h3>
                        <p className="text-xs text-gray-500">{allowanceService.getTypeLabel(allowance.type)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(allowance)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(allowance.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {allowance.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{allowance.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      allowance.status === 'active' ? 'bg-green-100 text-green-700' :
                      allowance.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      allowance.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      allowance.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {allowance.status.charAt(0).toUpperCase() + allowance.status.slice(1)}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      allowance.is_taxable ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {allowance.is_taxable ? 'Taxable' : 'Non-Taxable'}
                    </span>
                    {allowance.is_bpjs_object && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        BPJS Object
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                      {allowance.frequency.charAt(0).toUpperCase() + allowance.frequency.slice(1)}
                    </span>
                  </div>

                  {allowance.employee ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Users className="w-3.5 h-3.5" />
                      <span>{allowance.employee.name}</span>
                      {allowance.employee.department && (
                        <span className="text-gray-400">({allowance.employee.department.name})</span>
                      )}
                    </div>
                  ) : allowance.company ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Building className="w-3.5 h-3.5" />
                      <span>{allowance.company.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-3">
                      <Building className="w-3.5 h-3.5" />
                      <span>All Companies</span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-500">Calculation</p>
                        <p className="font-semibold text-gray-900">
                          {allowance.calculation_base === 'fixed' ? 'Fixed' :
                           allowance.calculation_base === 'basic_salary' ? '% Basic' : '% Gross'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500">Amount</p>
                        <p className="font-semibold text-emerald-600">
                          {allowance.amount ? formatCurrency(Number(allowance.amount)) :
                           allowance.percentage ? `${allowance.percentage}%` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {allowance.effective_date && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <p>Effective: {new Date(allowance.effective_date).toLocaleDateString('id-ID')}</p>
                      {allowance.end_date && (
                        <p>Until: {new Date(allowance.end_date).toLocaleDateString('id-ID')}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {allowances.length} of {totalItems} allowances
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {editingAllowance ? 'Edit Allowance' : 'Add Allowance'}
                      </h2>
                      <p className="text-emerald-100 text-sm">
                        {editingAllowance ? 'Update allowance type' : 'Create new allowance type'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* Template Quick Select (only for new allowances) */}
                  {!editingAllowance && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quick Template</label>
                      <select
                        onChange={(e) => {
                          const template = allowanceService.getDefaultTemplates().find(t => t.name === e.target.value);
                          if (template) {
                            setFormData(prev => ({
                              ...prev,
                              name: template.name,
                              type: template.type as AllowanceTypeEnum,
                              description: template.description,
                              calculation_base: template.calculation_base as 'fixed' | 'basic_salary' | 'gross_salary',
                              frequency: template.frequency as 'monthly' | 'weekly' | 'daily' | 'one_time',
                              is_taxable: template.is_taxable,
                              is_bpjs_object: template.is_bpjs_object,
                              is_recurring: template.is_recurring,
                            }));
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-emerald-50"
                        defaultValue=""
                      >
                        <option value="" disabled>Select a template to auto-fill...</option>
                        {allowanceService.getDefaultTemplates().map(template => (
                          <option key={template.name} value={template.name}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Step 1: Select Company & Employee */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-3">Step 1: Select Target</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                        <select
                          value={formData.company_id}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, company_id: e.target.value, employee_id: '' }));
                            setSelectedEmployee(null);
                          }}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="">All Companies (Global)</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee {formData.calculation_base !== 'fixed' && <span className="text-red-500">*</span>}
                        </label>
                        <SearchableSelect
                          options={employees.map(emp => ({
                            value: emp.id,
                            label: emp.name,
                            sublabel: emp.employee_id,
                          }))}
                          value={formData.employee_id ? Number(formData.employee_id) : ''}
                          onChange={(val) => {
                            const employeeId = String(val);
                            setFormData(prev => ({ ...prev, employee_id: employeeId }));
                            const emp = employees.find(emp => emp.id === Number(employeeId));
                            setSelectedEmployee(emp || null);
                          }}
                          placeholder="Search employee..."
                          searchPlaceholder="Type name or ID..."
                          disabled={loadingEmployees}
                          loading={loadingEmployees}
                          emptyMessage="No employees found"
                        />
                      </div>
                    </div>

                    {/* Employee Info Display */}
                    {selectedEmployee && (
                      <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{selectedEmployee.name}</p>
                            <p className="text-xs text-gray-500">
                              {selectedEmployee.employee_id}
                              {selectedEmployee.department && ` • ${selectedEmployee.department.name}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Basic Salary</p>
                            <p className="font-semibold text-emerald-600">
                              {selectedEmployee.basic_salary ? formatCurrency(selectedEmployee.basic_salary) : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Allowance Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="e.g., Tunjangan Transportasi"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AllowanceTypeEnum }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                      >
                        {typeOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      rows={2}
                      placeholder="Brief description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Calculation Base</label>
                      <select
                        value={formData.calculation_base}
                        onChange={(e) => setFormData(prev => ({ ...prev, calculation_base: e.target.value as 'fixed' | 'basic_salary' | 'gross_salary' }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="fixed">Fixed Amount</option>
                        <option value="basic_salary">% of Basic Salary</option>
                        <option value="gross_salary">% of Gross Salary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.calculation_base === 'fixed' ? 'Amount (Rp)' : 'Percentage (%)'}
                      </label>
                      {formData.calculation_base === 'fixed' ? (
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          placeholder="0"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={formData.percentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, percentage: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          placeholder="0"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'monthly' | 'weekly' | 'daily' | 'one_time' }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                        <option value="one_time">One Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
                      <input
                        type="date"
                        value={formData.effective_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Calculation Preview */}
                  {formData.calculation_base === 'fixed' && formData.amount > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-700">Total Allowance Amount</span>
                        <span className="text-lg font-bold text-emerald-700">
                          {formatCurrency(formData.amount)}
                        </span>
                      </div>
                    </div>
                  )}
                  {formData.calculation_base !== 'fixed' && formData.percentage > 0 && selectedEmployee?.basic_salary && (
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-emerald-700">Calculated Amount</span>
                          <p className="text-xs text-emerald-600 mt-0.5">
                            {formData.percentage}% of {formatCurrency(selectedEmployee.basic_salary)}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-emerald-700">
                          {formatCurrency(calculateAllowanceAmount())}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_taxable}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_taxable: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Taxable (PPh 21)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_bpjs_object}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_bpjs_object: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">BPJS Object</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_recurring}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Recurring</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingAllowance ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
