import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  AlertCircle,
  Users,
  UserCheck,
  Building2,
  UserCog,
  Download,
  Upload,
  Filter,
  LayoutGrid,
  List,
  X,
  Mail,
  Briefcase,
  MapPin,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Badge,
  getStatusVariant,
  PageSpinner,
} from '@/components/ui';
import toast from 'react-hot-toast';
import { employeeService } from '@/services/employee.service';
import type { Employee } from '@/types';
import { formatDate, formatNumber } from '@/lib/utils';

export function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const page = Number(searchParams.get('page')) || 1;
  const setPage = (newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', String(newPage));
      return prev;
    });
  };
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [filters, setFilters] = useState({
    status: '',
    department: '',
  });
  const [inactiveTotal, setInactiveTotal] = useState(0);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      // Fetch based on active tab
      const response = await employeeService.getAll({
        page,
        limit: 10,
        search,
        employment_status: activeTab === 'active' ? 'active' : 'inactive'
      });
      setEmployees(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);

      // Also fetch inactive count for the badge (only when on active tab)
      if (activeTab === 'active') {
        const inactiveResponse = await employeeService.getAll({
          page: 1,
          limit: 1,
          employment_status: 'inactive'
        });
        setInactiveTotal(inactiveResponse.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset to page 1 when tab changes
  }, [activeTab]);

  useEffect(() => {
    fetchEmployees();
  }, [page, search, activeTab]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteModal.employee) return;

    setIsDeleting(true);
    try {
      await employeeService.delete(deleteModal.employee.id);
      setDeleteModal({ open: false, employee: null });
      fetchEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', department: '' });
    setSearch('');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await employeeService.exportExcel({
        search: search || undefined,
        employment_status: activeTab === 'active' ? 'active' : 'inactive',
      });
      toast.success('Employee data exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to export employee data');
    } finally {
      setIsExporting(false);
    }
  };

  // Get active count when on inactive tab (for the tab badge)
  const [activeTotal, setActiveTotal] = useState(0);
  useEffect(() => {
    const fetchActiveCount = async () => {
      if (activeTab === 'inactive') {
        try {
          const activeResponse = await employeeService.getAll({
            page: 1,
            limit: 1,
            employment_status: 'active'
          });
          setActiveTotal(activeResponse.pagination.total);
        } catch (error) {
          console.error('Failed to fetch active count:', error);
        }
      }
    };
    fetchActiveCount();
  }, [activeTab]);

  const hasActiveFilters = search || filters.department;

  if (isLoading && employees.length === 0) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="employee-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#employee-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Employee Directory</h1>
                  <p className="text-blue-100 text-sm mt-1">Manage your workforce</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'active'
                      ? 'bg-white text-green-600 shadow-lg'
                      : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Active ({formatNumber(activeTab === 'active' ? total : activeTotal)})
                </button>
                <button
                  onClick={() => setActiveTab('inactive')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'inactive'
                      ? 'bg-white text-red-600 shadow-lg'
                      : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Inactive ({formatNumber(activeTab === 'inactive' ? total : inactiveTotal)})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-5 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl hover:bg-white/30 transition text-sm font-medium border border-white/30 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
              <button className="px-5 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl hover:bg-white/30 transition text-sm font-medium border border-white/30 shadow-lg flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import
              </button>
              <Link
                to="/employees/create"
                className="px-5 py-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition text-sm font-bold shadow-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - Only show for Active tab */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Active</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(total)}</p>
            <p className="text-sm text-gray-500">Active Employees</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <button
                onClick={() => setActiveTab('inactive')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                View →
              </button>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(inactiveTotal)}</p>
            <p className="text-sm text-gray-500">Inactive Employees</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <Link to="/departments" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View →
              </Link>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {employees.length > 0 ? new Set(employees.filter(e => e.department).map(e => e.department?.id)).size : 0}
            </p>
            <p className="text-sm text-gray-500">Departments</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Managers</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {employees.filter(e => e.manager).length > 0 ? new Set(employees.filter(e => e.manager).map(e => e.manager?.id)).size : 0}
            </p>
            <p className="text-sm text-gray-500">Line Managers</p>
          </div>
        </div>
      )}

      {/* Inactive Stats Banner */}
      {activeTab === 'inactive' && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Inactive Employees</h3>
                <p className="text-sm text-gray-600">Employees who are no longer active (terminated, resigned, retired)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-red-600">{formatNumber(total)}</p>
              <p className="text-sm text-gray-500">Total Inactive</p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Search & Filter</h3>
                <p className="text-sm text-gray-500">Find employees quickly</p>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={handleSearch}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-300 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full h-10 px-4 rounded-xl border border-gray-300 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Departments</option>
                {/* Departments would be fetched from API */}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Active Filters:</span>
              {search && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-medium">
                  <Search className="h-3 w-3" />
                  "{search}"
                  <button onClick={() => setSearch('')} className="hover:text-indigo-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.department && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
                  <Building2 className="h-3 w-3" />
                  {filters.department}
                  <button onClick={() => setFilters({ ...filters, department: '' })} className="hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                {activeTab === 'active' ? 'Active Employees' : 'Inactive Employees'}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Showing {employees.length > 0 ? ((page - 1) * 10) + 1 : 0} - {Math.min(page * 10, total)} of {total} {activeTab} employees
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-all ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="p-6">
            {employees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Employees Found</h3>
                <p className="text-gray-500 mb-6">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Start by adding your first employee'}
                </p>
                <Link
                  to="/employees/create"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-medium shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white">
                        {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{employee.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{employee.employee_id || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-xs text-gray-600">
                        <Building2 className="h-3.5 w-3.5 text-gray-400 mr-2" />
                        <span className="truncate">{employee.company?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <Briefcase className="h-3.5 w-3.5 text-gray-400 mr-2" />
                        <span className="truncate">{employee.position?.name || employee.job_title || 'N/A'}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 mr-2" />
                        <span className="truncate">{employee.department?.name || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <Badge variant={getStatusVariant(employee.employment_status || 'active')}>
                        {employee.employment_status || 'Active'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/employees/${employee.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/employees/${employee.id}/edit`}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Employee</TableHead>
                <TableHead className="hidden md:table-cell font-bold text-gray-700 uppercase text-xs tracking-wider">Company</TableHead>
                <TableHead className="hidden lg:table-cell font-bold text-gray-700 uppercase text-xs tracking-wider">Department</TableHead>
                <TableHead className="hidden xl:table-cell font-bold text-gray-700 uppercase text-xs tracking-wider">Position</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableEmpty message="No employees found" />
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md border-2 border-gray-100">
                          {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.email || '-'}</p>
                          {employee.employee_id && (
                            <p className="text-xs text-gray-400 mt-0.5">ID: {employee.employee_id}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="font-medium text-gray-900">{employee.company?.name || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-gray-700">{employee.department?.name || '-'}</span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-gray-700">{employee.position?.name || employee.job_title || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(employee.employment_status || 'active')}>
                        {employee.employment_status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/employees/${employee.id}`}
                          className="p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                        </Link>
                        <Link
                          to={`/employees/${employee.id}/edit`}
                          className="p-2 rounded-lg hover:bg-indigo-50 transition-colors group"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                        </Link>
                        <button
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
                          title="Delete"
                          onClick={() => setDeleteModal({ open: true, employee })}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="rounded-lg"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteModal({ open: false, employee: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 border-0">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Employee</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to delete <span className="font-bold text-gray-900">{deleteModal.employee.name}</span>?
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, employee: null })}
                disabled={isDeleting}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md shadow-red-500/25 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
