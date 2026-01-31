// @ts-nocheck
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { employeeMovementService } from '@/services/employee-movement.service';
import type { EmployeeMovement, CreateEmployeeMovementRequest } from '@/services/employee-movement.service';
import { companyService } from '@/services/company.service';
import { employeeService } from '@/services/employee.service';
import { departmentService } from '@/services/department.service';
import { positionService } from '@/services/position.service';
import type { Company, Employee, Department, Position } from '@/types';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

type MovementType = 'promotion' | 'demotion' | 'transfer' | 'mutation' | 'salary_adjustment' | 'grade_change' | 'status_change' | 'department_change' | 'position_change' | 'company_transfer';
type MovementStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'applied';

export function MovementPage() {
  const [movements, setMovements] = useState<EmployeeMovement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingMovement, setEditingMovement] = useState<EmployeeMovement | null>(null);
  const [viewingMovement, setViewingMovement] = useState<EmployeeMovement | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MovementType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MovementStatus | 'all'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState<Partial<CreateEmployeeMovementRequest>>({
    employee_id: 0,
    movement_type: 'promotion',
    effective_date: '',
    new_position_id: undefined,
    new_department_id: undefined,
    new_company_id: undefined,
    new_salary: undefined,
    reason: '',
    notes: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchMovements();
    }
  }, [selectedCompanyId, pagination.page, filterType, filterStatus]);

  const fetchInitialData = async () => {
    try {
      const [companiesRes, employeesRes, departmentsRes, positionsRes] = await Promise.all([
        companyService.getAll({ page: 1, limit: 100 }),
        employeeService.getAll({ page: 1, limit: 500 }),
        departmentService.getAll({ page: 1, limit: 100 }),
        positionService.getAll({ page: 1, limit: 100 }),
      ]);
      setCompanies(companiesRes.data);
      setEmployees(employeesRes.data);
      setDepartments(departmentsRes.data);
      setPositions(positionsRes.data);
      if (companiesRes.data.length > 0) {
        setSelectedCompanyId(companiesRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchMovements = async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        company_id: selectedCompanyId,
      };
      if (filterType !== 'all') params.movement_type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (search) params.search = search;

      const response = await employeeMovementService.getAll(params);
      setMovements(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
    } catch (error) {
      console.error('Failed to fetch movements:', error);
      toast.error('Failed to load movements');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredMovements = movements.filter(movement => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      movement.employee?.name?.toLowerCase().includes(searchLower) ||
      movement.employee?.employee_id?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: movements.length,
    pending: movements.filter(m => m.status === 'pending').length,
    approved: movements.filter(m => m.status === 'approved').length,
    applied: movements.filter(m => m.status === 'applied').length,
  };

  const resetForm = () => {
    setFormData({
      employee_id: 0,
      movement_type: 'promotion',
      effective_date: '',
      new_position_id: undefined,
      new_department_id: undefined,
      new_company_id: undefined,
      new_salary: undefined,
      reason: '',
      notes: '',
    });
  };

  const handleOpenModal = (movement?: EmployeeMovement) => {
    if (movement) {
      setEditingMovement(movement);
      setFormData({
        employee_id: movement.employee_id,
        movement_type: movement.movement_type,
        effective_date: movement.effective_date.split('T')[0],
        new_position_id: movement.new_position_id,
        new_department_id: movement.new_department_id,
        new_company_id: movement.new_company_id,
        new_salary: movement.new_salary,
        reason: movement.reason || '',
        notes: movement.notes || '',
      });
    } else {
      setEditingMovement(null);
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    if (!formData.effective_date) {
      toast.error('Please select effective date');
      return;
    }

    setIsProcessing(true);
    try {
      const data: CreateEmployeeMovementRequest = {
        employee_id: formData.employee_id!,
        company_id: selectedCompanyId || undefined,
        movement_type: formData.movement_type!,
        effective_date: formData.effective_date!,
        new_position_id: formData.new_position_id,
        new_department_id: formData.new_department_id,
        new_company_id: formData.new_company_id,
        new_salary: formData.new_salary,
        reason: formData.reason,
        notes: formData.notes,
      };

      if (editingMovement) {
        await employeeMovementService.update(editingMovement.id, data);
        toast.success('Movement updated successfully');
      } else {
        await employeeMovementService.create(data);
        toast.success('Movement created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchMovements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save movement');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (movement: EmployeeMovement) => {
    setIsProcessing(true);
    try {
      await employeeMovementService.approve(movement.id);
      toast.success(`Movement for ${movement.employee?.name} has been approved`);
      fetchMovements();
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve movement');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!viewingMovement || !rejectReason.trim()) {
      toast.error('Please provide rejection reason');
      return;
    }
    setIsProcessing(true);
    try {
      await employeeMovementService.reject(viewingMovement.id, rejectReason);
      toast.success(`Movement for ${viewingMovement.employee?.name} has been rejected`);
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
      fetchMovements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject movement');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async (movement: EmployeeMovement) => {
    setIsProcessing(true);
    try {
      await employeeMovementService.apply(movement.id);
      toast.success(`Movement for ${movement.employee?.name} has been applied to employee data`);
      fetchMovements();
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to apply movement');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (movement: EmployeeMovement) => {
    if (!confirm('Are you sure you want to delete this movement?')) return;
    try {
      await employeeMovementService.delete(movement.id);
      toast.success('Movement deleted successfully');
      fetchMovements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete movement');
    }
  };

  const openDetailModal = (movement: EmployeeMovement) => {
    setViewingMovement(movement);
    setShowDetailModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      promotion: { bg: 'bg-green-100', text: 'text-green-700', label: 'Promotion' },
      demotion: { bg: 'bg-red-100', text: 'text-red-700', label: 'Demotion' },
      transfer: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Transfer' },
      mutation: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Mutation' },
      salary_adjustment: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Salary Adj' },
      grade_change: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Grade Change' },
      status_change: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Status Change' },
      department_change: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Dept Change' },
      position_change: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Position Change' },
      company_transfer: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Company Transfer' },
    };
    const style = styles[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: type };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Cancelled' },
      applied: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Applied' },
    };
    const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {style.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Employee Movement
                  </h1>
                  <p className="text-amber-100 text-sm mt-1">
                    {selectedCompany ? (
                      <>Manage employee movements for <span className="font-semibold">{selectedCompany.name}</span></>
                    ) : (
                      'Select company to start'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {stats.total} Movements
                </span>
                {stats.pending > 0 && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/30 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {stats.pending} Pending
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Company Selector */}
              <div className="relative">
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => {
                    setSelectedCompanyId(Number(e.target.value));
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
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

              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-amber-700 rounded-xl hover:bg-amber-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Movement</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Movement</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pending}</p>
          <p className="text-sm text-gray-500">Waiting Approval</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
              Approved
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.approved}</p>
          <p className="text-sm text-gray-500">Approved</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Done
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.applied}</p>
          <p className="text-sm text-gray-500">Applied</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as MovementType | 'all')}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="all">All Types</option>
              <option value="promotion">Promotion</option>
              <option value="demotion">Demotion</option>
              <option value="transfer">Transfer</option>
              <option value="mutation">Mutation</option>
              <option value="salary_adjustment">Salary Adjustment</option>
              <option value="department_change">Department Change</option>
              <option value="position_change">Position Change</option>
              <option value="company_transfer">Company Transfer</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as MovementStatus | 'all')}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="applied">Applied</option>
            </select>
            <button
              onClick={fetchMovements}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Search
            </button>
            <span className="text-sm text-gray-500">
              {filteredMovements.length} records
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading data...</p>
              </div>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No movements found</h3>
              <p className="mt-1 text-gray-500">Create your first movement.</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Movement
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">From</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">To</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Effective</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMovements.map(movement => (
                  <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(movement.employee?.name || 'U')} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                          {movement.employee?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{movement.employee?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{movement.employee?.employee_id || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getTypeBadge(movement.movement_type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900 font-medium">{movement.previous_position_name || '-'}</p>
                        <p className="text-gray-500 text-xs">{movement.previous_department_name || '-'}</p>
                        {movement.previous_salary && (
                          <p className="text-gray-400 text-xs">{formatCurrency(Number(movement.previous_salary))}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900 font-medium">{movement.new_position_name || '-'}</p>
                        <p className="text-gray-500 text-xs">{movement.new_department_name || '-'}</p>
                        {movement.new_salary && (
                          <p className="text-green-600 text-xs font-medium">{formatCurrency(movement.new_salary)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{formatDate(movement.effective_date)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(movement.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetailModal(movement)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Detail"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {movement.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(movement)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setViewingMovement(movement);
                                setShowRejectModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleOpenModal(movement)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </>
                        )}
                        {movement.status === 'approved' && !movement.is_applied && (
                          <button
                            onClick={() => handleApply(movement)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Apply to Employee"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </button>
                        )}
                        {movement.status === 'pending' && (
                          <button
                            onClick={() => handleDelete(movement)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-amber-600 to-orange-600 px-6 py-5 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {editingMovement ? 'Edit Movement' : 'Create New Movement'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Employee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={employees.map(e => ({
                      value: e.id,
                      label: `${e.name} (${e.employee_id})`,
                    }))}
                    value={formData.employee_id || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, employee_id: Number(value) }))}
                    placeholder="Select employee..."
                    disabled={!!editingMovement}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Movement Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Movement Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.movement_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, movement_type: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      required
                    >
                      <option value="promotion">Promotion</option>
                      <option value="demotion">Demotion</option>
                      <option value="transfer">Transfer</option>
                      <option value="mutation">Mutation</option>
                      <option value="salary_adjustment">Salary Adjustment</option>
                      <option value="department_change">Department Change</option>
                      <option value="position_change">Position Change</option>
                      <option value="company_transfer">Company Transfer</option>
                    </select>
                  </div>

                  {/* Effective Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* New Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Position
                  </label>
                  <SearchableSelect
                    options={positions.map(p => ({ value: p.id, label: p.name }))}
                    value={formData.new_position_id || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, new_position_id: value ? Number(value) : undefined }))}
                    placeholder="Select new position..."
                  />
                </div>

                {/* New Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Department
                  </label>
                  <SearchableSelect
                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                    value={formData.new_department_id || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, new_department_id: value ? Number(value) : undefined }))}
                    placeholder="Select new department..."
                  />
                </div>

                {/* New Company (for company transfer) */}
                {formData.movement_type === 'company_transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Company
                    </label>
                    <SearchableSelect
                      options={companies.map(c => ({ value: c.id, label: c.name }))}
                      value={formData.new_company_id || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, new_company_id: value ? Number(value) : undefined }))}
                      placeholder="Select new company..."
                    />
                  </div>
                )}

                {/* New Salary */}
                {(formData.movement_type === 'promotion' || formData.movement_type === 'salary_adjustment') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Salary
                    </label>
                    <input
                      type="number"
                      value={formData.new_salary || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, new_salary: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="Enter new salary..."
                    />
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                    placeholder="Reason for movement..."
                    rows={3}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isProcessing ? 'Saving...' : editingMovement ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && viewingMovement && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-amber-600 to-orange-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Movement Details</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(viewingMovement.employee?.name || 'U')} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {viewingMovement.employee?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{viewingMovement.employee?.name}</p>
                    <p className="text-sm text-gray-500">{viewingMovement.employee?.employee_id}</p>
                  </div>
                  {getTypeBadge(viewingMovement.movement_type)}
                </div>

                {/* Movement Flow */}
                <div className="relative">
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>

                  {/* From */}
                  <div className="relative flex gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 z-10">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <div className="flex-1 p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">From</p>
                      <p className="font-semibold text-gray-900">{viewingMovement.previous_position_name || '-'}</p>
                      <p className="text-sm text-gray-600">{viewingMovement.previous_department_name || '-'}</p>
                      {viewingMovement.previous_salary && (
                        <p className="text-sm text-gray-500">{formatCurrency(Number(viewingMovement.previous_salary))}</p>
                      )}
                    </div>
                  </div>

                  {/* To */}
                  <div className="relative flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 z-10">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <div className="flex-1 p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">To</p>
                      <p className="font-semibold text-gray-900">{viewingMovement.new_position_name || '-'}</p>
                      <p className="text-sm text-gray-600">{viewingMovement.new_department_name || '-'}</p>
                      {viewingMovement.new_salary && (
                        <p className="text-sm text-green-600 font-medium">{formatCurrency(viewingMovement.new_salary)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Salary Change */}
                {viewingMovement.salary_change !== null && viewingMovement.salary_change !== undefined && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Salary Change</p>
                    <p className="font-bold text-green-700 text-lg">
                      {viewingMovement.salary_change > 0 ? '+' : ''}{formatCurrency(viewingMovement.salary_change)}
                      {viewingMovement.salary_change_percentage && (
                        <span className="text-sm font-medium ml-2">
                          ({viewingMovement.salary_change_percentage > 0 ? '+' : ''}{viewingMovement.salary_change_percentage.toFixed(1)}%)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Effective Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(viewingMovement.effective_date)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                    <div className="mt-1">{getStatusBadge(viewingMovement.status)}</div>
                  </div>
                </div>

                {viewingMovement.approver && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Approved By</p>
                    <p className="font-semibold text-gray-900">{viewingMovement.approver.name}</p>
                    {viewingMovement.approved_at && (
                      <p className="text-sm text-gray-500">{formatDate(viewingMovement.approved_at)}</p>
                    )}
                  </div>
                )}

                {viewingMovement.reason && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reason</p>
                    <p className="text-gray-700">{viewingMovement.reason}</p>
                  </div>
                )}

                {viewingMovement.rejection_reason && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
                    <p className="text-red-700">{viewingMovement.rejection_reason}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {viewingMovement.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setShowRejectModal(true);
                        }}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(viewingMovement)}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                      >
                        {isProcessing ? 'Processing...' : 'Approve'}
                      </button>
                    </>
                  )}
                  {viewingMovement.status === 'approved' && !viewingMovement.is_applied && (
                    <button
                      onClick={() => handleApply(viewingMovement)}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {isProcessing ? 'Applying...' : 'Apply to Employee'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && viewingMovement && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowRejectModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Reject Movement?</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  You are about to reject the movement for{' '}
                  <span className="font-medium text-gray-900">{viewingMovement.employee?.name}</span>
                </p>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Enter rejection reason..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isProcessing || !rejectReason.trim()}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
