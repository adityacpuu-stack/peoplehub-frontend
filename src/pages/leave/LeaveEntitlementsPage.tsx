import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Download,
  Loader2,
  Calendar,
  Building,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Clock,
  CheckCircle2,
  CalendarDays,
  Briefcase,
  Eye,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { leaveService } from '../../services/leave.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import type { LeaveType } from '@/types';

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  company_id?: number;
  company?: Company;
  department?: {
    id: number;
    name: string;
  };
  position?: {
    id: number;
    name: string;
  };
  join_date?: string;
  probation_end_date?: string;
  employment_status?: string;
}

// Local interface for balance display that matches what we render
interface LocalLeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  leaveType?: LeaveType;
}

interface EmployeeEntitlement {
  employee: Employee;
  balances: LocalLeaveBalance[];
}

export function LeaveEntitlementsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [entitlements, setEntitlements] = useState<EmployeeEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeEntitlement | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showBulkAllocateModal, setShowBulkAllocateModal] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    employee_id: 0,
    leave_type_id: 0,
    allocated_days: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Fetch leave types
  const fetchLeaveTypes = useCallback(async () => {
    try {
      const types = await leaveService.getTypes();
      setLeaveTypes(types);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  }, []);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  // Fetch employees with their leave balances
  const fetchEntitlements = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; company_id?: number } = { page, limit };
      if (filterCompany !== 'all') {
        params.company_id = Number(filterCompany);
      }

      // Fetch employees
      const response = await employeeService.getAll(params);
      setEmployees(response.data.map(emp => ({
        id: emp.id,
        name: emp.name,
        employee_id: emp.employee_id || '',
        company_id: emp.company_id,
        company: emp.company || undefined,
        department: emp.department || undefined,
        position: emp.position || undefined,
        join_date: emp.join_date,
      })));
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total || response.data.length);

      // Fetch real leave balances from backend
      const balanceParams: { company_id?: number; year: number } = {
        year: new Date().getFullYear(),
      };
      if (filterCompany !== 'all') {
        balanceParams.company_id = Number(filterCompany);
      }

      let allBalances: LocalLeaveBalance[] = [];
      try {
        const balancesResponse = await leaveService.getBalances(balanceParams);
        allBalances = (balancesResponse || []).map((b: any) => ({
          id: b.id,
          employee_id: b.employee_id,
          leave_type_id: b.leave_type_id,
          year: b.year,
          allocated_days: Number(b.allocated_days) || 0,
          used_days: Number(b.used_days) || 0,
          pending_days: Number(b.pending_days) || 0,
          remaining_days: Number(b.remaining_days) || 0,
          leaveType: b.leaveType,
        }));
      } catch (err) {
        console.warn('No balances found, will show empty entitlements');
      }

      // Group balances by employee
      const balancesByEmployee = new Map<number, LocalLeaveBalance[]>();
      for (const balance of allBalances) {
        if (!balancesByEmployee.has(balance.employee_id)) {
          balancesByEmployee.set(balance.employee_id, []);
        }
        balancesByEmployee.get(balance.employee_id)!.push(balance);
      }

      // Build entitlements - use real data if available, otherwise show zeros
      const realEntitlements: EmployeeEntitlement[] = response.data.map(emp => {
        const empBalances = balancesByEmployee.get(emp.id) || [];

        // For each leave type, find balance or create empty one
        const balances: LocalLeaveBalance[] = leaveTypes.map(type => {
          const existingBalance = empBalances.find(b => b.leave_type_id === type.id);
          if (existingBalance) {
            return {
              ...existingBalance,
              leaveType: type,
            };
          }
          // No balance allocated yet - show zeros
          return {
            id: 0,
            employee_id: emp.id,
            leave_type_id: type.id,
            leaveType: type,
            allocated_days: 0,
            used_days: 0,
            pending_days: 0,
            remaining_days: 0,
            year: new Date().getFullYear(),
          };
        });

        return {
          employee: {
            id: emp.id,
            name: emp.name,
            employee_id: emp.employee_id || '',
            company_id: emp.company_id,
            company: emp.company || undefined,
            department: emp.department || undefined,
            position: emp.position || undefined,
            join_date: emp.join_date,
          },
          balances,
        };
      });

      setEntitlements(realEntitlements);
    } catch (error) {
      console.error('Failed to fetch entitlements:', error);
      toast.error('Failed to load employee entitlements');
    } finally {
      setLoading(false);
    }
  }, [page, filterCompany, leaveTypes]);

  useEffect(() => {
    fetchCompanies();
    fetchLeaveTypes();
  }, [fetchCompanies, fetchLeaveTypes]);

  useEffect(() => {
    if (leaveTypes.length > 0) {
      fetchEntitlements();
    }
  }, [fetchEntitlements, leaveTypes]);

  useEffect(() => {
    setPage(1);
  }, [search, filterCompany, filterDepartment]);

  // Define custom sort order for companies based on employee_id prefix
  // PFI (Path Finder), GDI (Growpath), LFS (Lampung Farm), UOR (UOR Kreatif), BCI (Buka Cerita), PDR (Pilar Dana)
  const COMPANY_ORDER = ['PFI', 'GDI', 'LFS', 'UOR', 'BCI', 'PDR'];

  // Helper function to extract company prefix from employee_id
  // Format: "PFI-GDI-2500014" -> company is "GDI" (second part)
  // Format: "PFI-001" -> company is "PFI" (first part, old format)
  const getEmployeePrefix = (employeeId: string | undefined): string => {
    if (!employeeId) return '';
    const parts = employeeId.toUpperCase().split('-');
    // If format is PFI-XXX-YYYY, company is the second part (XXX)
    if (parts.length >= 3) {
      return parts[1];
    }
    // If format is XXX-YYYY, company is the first part (XXX)
    if (parts.length >= 2) {
      return parts[0];
    }
    return '';
  };

  // Helper function to extract numeric part from employee_id (e.g., "PFI-GDI-2500014" -> 2500014)
  const getEmployeeNumber = (employeeId: string | undefined): number => {
    if (!employeeId) return Infinity;
    const match = employeeId.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : Infinity;
  };

  // Get unique departments from employees
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department?.name) {
        depts.add(emp.department.name);
      }
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Filter and sort entitlements by company order
  const filteredEntitlements = useMemo(() => {
    let result = entitlements;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(e =>
        e.employee.name?.toLowerCase().includes(searchLower) ||
        e.employee.employee_id?.toLowerCase().includes(searchLower) ||
        e.employee.department?.name?.toLowerCase().includes(searchLower)
      );
    }

    if (filterDepartment !== 'all') {
      result = result.filter(e => e.employee.department?.name === filterDepartment);
    }

    // Sort by employee_id prefix order: PFI, GDI, LFS, BCI, then others
    result = [...result].sort((a, b) => {
      const prefixA = getEmployeePrefix(a.employee.employee_id);
      const prefixB = getEmployeePrefix(b.employee.employee_id);

      const indexA = COMPANY_ORDER.indexOf(prefixA);
      const indexB = COMPANY_ORDER.indexOf(prefixB);

      // If both are in the order list, sort by their position, then by employee number
      if (indexA !== -1 && indexB !== -1) {
        if (indexA !== indexB) return indexA - indexB;
        // Same prefix, sort by numeric part (PFI-001 before PFI-002)
        return getEmployeeNumber(a.employee.employee_id) - getEmployeeNumber(b.employee.employee_id);
      }
      // If only a is in the order list, it comes first
      if (indexA !== -1) return -1;
      // If only b is in the order list, it comes first
      if (indexB !== -1) return 1;
      // If neither is in the order list, sort by prefix first, then by number
      if (prefixA !== prefixB) {
        return prefixA.localeCompare(prefixB);
      }
      return getEmployeeNumber(a.employee.employee_id) - getEmployeeNumber(b.employee.employee_id);
    });

    return result;
  }, [entitlements, search, filterDepartment]);

  // Stats
  const stats = useMemo(() => {
    const totalAllocated = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.allocated_days || 0), 0), 0);
    const totalUsed = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.used_days || 0), 0), 0);
    const totalPending = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.pending_days || 0), 0), 0);
    const totalRemaining = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.remaining_days || 0), 0), 0);

    return {
      totalEmployees: totalItems,
      totalAllocated,
      totalUsed,
      totalPending,
      totalRemaining,
    };
  }, [entitlements, totalItems]);

  const handleViewDetail = (entitlement: EmployeeEntitlement) => {
    setSelectedEmployee(entitlement);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEmployee(null);
  };

  const handleOpenAllocate = (entitlement: EmployeeEntitlement) => {
    setSelectedEmployee(entitlement);
    const firstType = leaveTypes[0];
    setAllocateForm({
      employee_id: entitlement.employee.id,
      leave_type_id: firstType?.id || 0,
      allocated_days: Number(firstType?.default_days) || 12,
    });
    setShowAllocateModal(true);
  };

  const handleCloseAllocateModal = () => {
    setShowAllocateModal(false);
    setSelectedEmployee(null);
  };

  const handleAllocate = async () => {
    if (!allocateForm.employee_id || !allocateForm.leave_type_id) {
      toast.error('Please select employee and leave type');
      return;
    }

    setAllocating(true);
    try {
      await leaveService.allocateLeave({
        employee_id: allocateForm.employee_id,
        leave_type_id: allocateForm.leave_type_id,
        year: new Date().getFullYear(),
        allocated_days: allocateForm.allocated_days,
      });
      toast.success('Leave allocated successfully');
      handleCloseAllocateModal();
      fetchEntitlements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to allocate leave');
    } finally {
      setAllocating(false);
    }
  };

  const handleBulkAllocate = () => {
    if (entitlements.length === 0) {
      toast.error('No employees to allocate');
      return;
    }
    setShowBulkAllocateModal(true);
  };

  // Calculate prorated leave days based on join date and probation
  const calculateProratedDays = (
    joinDate: string | null | undefined,
    defaultDays: number,
    leaveTypeCode: string | undefined,
    year: number
  ): number => {
    // Only prorate Annual Leave (AL)
    if (leaveTypeCode !== 'AL') {
      return defaultDays;
    }

    if (!joinDate) {
      return defaultDays; // No join date, give full entitlement
    }

    const join = new Date(joinDate);
    const probationMonths = 3;

    // Calculate probation end date (join + 3 months)
    const probationEnd = new Date(join);
    probationEnd.setMonth(probationEnd.getMonth() + probationMonths);

    const currentYearStart = new Date(year, 0, 1);
    const currentYearEnd = new Date(year, 11, 31);
    const today = new Date();

    // If probation ends after this year, no annual leave for this year
    if (probationEnd > currentYearEnd) {
      return 0;
    }

    // If still on probation (probation end is in future)
    if (probationEnd > today) {
      return 0;
    }

    // If joined before this year and probation ended before this year
    if (probationEnd < currentYearStart) {
      return defaultDays; // Full entitlement
    }

    // Prorate: remaining months after probation ends
    const probationEndMonth = probationEnd.getMonth(); // 0-11
    const remainingMonths = 12 - probationEndMonth;
    const proratedDays = Math.round((defaultDays * remainingMonths) / 12);

    return proratedDays;
  };

  const confirmBulkAllocate = async () => {
    setAllocating(true);
    let success = 0;
    let failed = 0;

    // Helper function to delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      // Fetch ALL employees (not just current page)
      const params: { limit: number; company_id?: number } = { limit: 1000 };
      if (filterCompany !== 'all') {
        params.company_id = Number(filterCompany);
      }
      const allEmployeesResponse = await employeeService.getAll(params);
      const allEmployees = allEmployeesResponse.data;

      const totalOperations = allEmployees.length * leaveTypes.length;
      let completed = 0;

      toast.loading(`Allocating... 0/${totalOperations}`, { id: 'bulk-allocate' });

      // Process in batches to avoid rate limiting
      const BATCH_SIZE = 5; // Process 5 employees at a time
      const DELAY_BETWEEN_BATCHES = 500; // 500ms delay between batches

      for (let i = 0; i < allEmployees.length; i += BATCH_SIZE) {
        const batch = allEmployees.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        await Promise.all(
          batch.map(async (emp) => {
            for (const type of leaveTypes) {
              try {
                const allocatedDays = calculateProratedDays(
                  emp.join_date,
                  Number(type.default_days) || 0,
                  type.code,
                  new Date().getFullYear()
                );

                await leaveService.allocateLeave({
                  employee_id: emp.id,
                  leave_type_id: type.id,
                  year: new Date().getFullYear(),
                  allocated_days: allocatedDays,
                });
                success++;
              } catch {
                failed++;
              }
              completed++;
            }
          })
        );

        // Update progress
        toast.loading(`Allocating... ${completed}/${totalOperations}`, { id: 'bulk-allocate' });

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < allEmployees.length) {
          await delay(DELAY_BETWEEN_BATCHES);
        }
      }

      toast.dismiss('bulk-allocate');
      toast.success(`Allocated ${success} balances to ${allEmployees.length} employees. ${failed > 0 ? `${failed} failed.` : ''}`);
    } catch (error) {
      toast.dismiss('bulk-allocate');
      toast.error('Failed to fetch employees');
    }

    setAllocating(false);
    setShowBulkAllocateModal(false);
    fetchEntitlements();
  };

  const handleExport = () => {
    if (filteredEntitlements.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Company',
      ...leaveTypes.map(t => `${t.name} Allocated`),
      ...leaveTypes.map(t => `${t.name} Used`),
      ...leaveTypes.map(t => `${t.name} Pending`),
      ...leaveTypes.map(t => `${t.name} Remaining`),
    ];

    const rows = filteredEntitlements.map(ent => [
      ent.employee.employee_id,
      ent.employee.name,
      ent.employee.department?.name || '-',
      ent.employee.company?.name || '-',
      ...leaveTypes.map(t => ent.balances.find(b => b.leave_type_id === t.id)?.allocated_days || 0),
      ...leaveTypes.map(t => ent.balances.find(b => b.leave_type_id === t.id)?.used_days || 0),
      ...leaveTypes.map(t => ent.balances.find(b => b.leave_type_id === t.id)?.pending_days || 0),
      ...leaveTypes.map(t => ent.balances.find(b => b.leave_type_id === t.id)?.remaining_days || 0),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_entitlements_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export successful');
  };

  const handleRefresh = () => {
    fetchEntitlements();
    toast.success('Data refreshed');
  };

  const getBalanceColor = (remaining: number, allocated: number) => {
    if (allocated === 0) return 'text-gray-400';
    const percentage = (remaining / allocated) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (remaining: number, allocated: number) => {
    if (allocated === 0) return 'bg-gray-200';
    const percentage = (remaining / allocated) * 100;
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Leave Entitlements
                  </h1>
                  <p className="text-cyan-100 text-sm mt-1">
                    Employee leave balances and entitlements for {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleBulkAllocate}
                disabled={allocating || entitlements.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold disabled:opacity-50"
              >
                {allocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                <span>Bulk Allocate</span>
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-cyan-600 rounded-xl hover:bg-cyan-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalEmployees}</p>
          <p className="text-sm text-gray-500">Total Employees</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalAllocated}</p>
          <p className="text-sm text-gray-500">Total Allocated Days</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Used
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalUsed}</p>
          <p className="text-sm text-gray-500">Total Used Days</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalPending}</p>
          <p className="text-sm text-gray-500">Total Pending Days</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalRemaining}</p>
          <p className="text-sm text-gray-500">Total Remaining Days</p>
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
                placeholder="Search by employee name, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="w-4 h-4" />
                <span>Filters:</span>
              </div>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>

              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredEntitlements.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No employees found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee
                  </th>
                  {leaveTypes.slice(0, 4).map(type => (
                    <th key={type.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {type.code || type.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntitlements.map((ent) => {
                  const totalAllocated = ent.balances.reduce((sum, b) => sum + (b.allocated_days || 0), 0);
                  const totalUsed = ent.balances.reduce((sum, b) => sum + (b.used_days || 0), 0);
                  const totalRemaining = ent.balances.reduce((sum, b) => sum + (b.remaining_days || 0), 0);

                  return (
                    <tr key={ent.employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{ent.employee.name}</p>
                            <p className="text-xs text-gray-500">
                              {ent.employee.employee_id}
                              {ent.employee.department?.name && (
                                <span className="text-gray-400"> • {ent.employee.department.name}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      {leaveTypes.slice(0, 4).map(type => {
                        const balance = ent.balances.find(b => b.leave_type_id === type.id);
                        const allocated = balance?.allocated_days || 0;
                        const remaining = balance?.remaining_days || 0;
                        const percentage = allocated > 0 ? (remaining / allocated) * 100 : 0;

                        return (
                          <td key={type.id} className="px-4 py-4">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`font-semibold ${getBalanceColor(remaining, allocated)}`}>
                                  {remaining}
                                </span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-500">{allocated}</span>
                              </div>
                              <div className="mt-1 w-16 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor(remaining, allocated)} transition-all`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-semibold ${getBalanceColor(totalRemaining, totalAllocated)}`}>
                              {totalRemaining}
                            </span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-500">{totalAllocated}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {totalUsed} used
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAllocate(ent)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Allocate Leave"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewDetail(ent)}
                            className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredEntitlements.length} of {totalItems} employees
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

      {/* Bulk Allocate Confirmation Modal */}
      {showBulkAllocateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => !allocating && setShowBulkAllocateModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Bulk Allocate Leave</h2>
                    <p className="text-amber-100 text-sm">Confirm allocation for all employees</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 font-medium mb-2">
                    This will allocate default leave balances to:
                  </p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• <strong>{totalItems}</strong> employees {filterCompany !== 'all' ? '(filtered by company)' : '(all companies)'}</li>
                    <li>• <strong>{leaveTypes.length}</strong> leave types</li>
                    <li>• Year: <strong>{new Date().getFullYear()}</strong></li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Leave types to allocate:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {leaveTypes.map(type => (
                      <div key={type.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{type.code} - {type.name}</span>
                        <span className="font-medium text-gray-900">{type.default_days} days</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 mb-1">Proration Rules (Annual Leave):</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Probation period: <strong>3 months</strong> from join date</li>
                    <li>• Still on probation → <strong>0 days</strong></li>
                    <li>• After probation → Prorated by remaining months</li>
                    <li>• Other leave types → Full default days</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-500">
                  Existing balances will be updated with the calculated values.
                </p>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => setShowBulkAllocateModal(false)}
                    disabled={allocating}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkAllocate}
                    disabled={allocating}
                    className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {allocating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Allocating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Allocate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Modal */}
      {showAllocateModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseAllocateModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Allocate Leave</h2>
                      <p className="text-green-100 text-sm">{selectedEmployee.employee.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseAllocateModal}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <select
                    value={allocateForm.leave_type_id}
                    onChange={(e) => {
                      const typeId = Number(e.target.value);
                      const selectedType = leaveTypes.find(t => t.id === typeId);
                      setAllocateForm(prev => ({
                        ...prev,
                        leave_type_id: typeId,
                        allocated_days: Number(selectedType?.default_days) || 0,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  >
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.code} - {type.name} (Default: {type.default_days} days)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allocated Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    step="0.5"
                    value={allocateForm.allocated_days}
                    onChange={(e) => setAllocateForm(prev => ({ ...prev, allocated_days: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Year:</strong> {new Date().getFullYear()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Employee:</strong> {selectedEmployee.employee.name} ({selectedEmployee.employee.employee_id})
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleCloseAllocateModal}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAllocate}
                    disabled={allocating}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {allocating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Allocate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseDetailModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Leave Entitlements</h2>
                      <p className="text-cyan-100 text-sm">{selectedEmployee.employee.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseDetailModal}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Employee Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-cyan-100 rounded-full flex items-center justify-center">
                      <User className="w-7 h-7 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-lg">{selectedEmployee.employee.name}</p>
                      <p className="text-sm text-gray-500">{selectedEmployee.employee.employee_id}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {selectedEmployee.employee.department?.name && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span>{selectedEmployee.employee.department.name}</span>
                          </div>
                        )}
                        {selectedEmployee.employee.company?.name && (
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            <span>{selectedEmployee.employee.company.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leave Balances */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-cyan-600" />
                    Leave Balances ({new Date().getFullYear()})
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    {selectedEmployee.balances.map(balance => {
                      const percentage = balance.allocated_days > 0
                        ? (balance.remaining_days / balance.allocated_days) * 100
                        : 0;

                      return (
                        <div key={balance.id || balance.leave_type_id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {balance.leaveType?.code ? `${balance.leaveType.code} - ${balance.leaveType.name}` : balance.leaveType?.name || 'Unknown'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${getBalanceColor(balance.remaining_days, balance.allocated_days)}`}>
                                {balance.remaining_days} days remaining
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(balance.remaining_days, balance.allocated_days)} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                              <span>Allocated: {balance.allocated_days}</span>
                              <span className="text-green-600">Used: {balance.used_days}</span>
                              <span className="text-amber-600">Pending: {balance.pending_days}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-700">Total Summary</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          Allocated: {selectedEmployee.balances.reduce((sum, b) => sum + (b.allocated_days || 0), 0)}
                        </span>
                        <span className="text-green-600">
                          Used: {selectedEmployee.balances.reduce((sum, b) => sum + (b.used_days || 0), 0)}
                        </span>
                        <span className="font-bold text-cyan-700">
                          Remaining: {selectedEmployee.balances.reduce((sum, b) => sum + (b.remaining_days || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={handleCloseDetailModal}
                    className="flex-1 px-4 py-2.5 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Close
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
