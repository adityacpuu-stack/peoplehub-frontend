import { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  Filter,
  Download,
  Plus,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  Building,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  X,
  MapPin,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceService } from '@/services/attendance.service';
import { departmentService } from '@/services/department.service';
import { employeeService } from '@/services/employee.service';
import { companyService } from '@/services/company.service';
import type { Attendance, Department, Employee, AttendanceStatus } from '@/types';
import type { Company } from '@/services/company.service';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Summary stats
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
  });

  // Modals
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    employee_id: number;
    date: string;
    check_in: string;
    check_out: string;
    status: AttendanceStatus;
    notes: string;
  }>({
    employee_id: 0,
    date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    status: 'present',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [pagination.page, selectedDate, selectedDepartment, selectedStatus, selectedCompany]);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchCompanies();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getAll({ page: 1, limit: 100 });
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeService.getAll({ page: 1, limit: 500, employment_status: 'active' });
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ page: 1, limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (selectedDate) {
        params.start_date = selectedDate;
        params.end_date = selectedDate;
      }
      if (selectedDepartment) {
        params.department_id = parseInt(selectedDepartment);
      }
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      if (selectedCompany) {
        params.company_id = parseInt(selectedCompany);
      }

      const response = await attendanceService.getAll(params);
      setAttendances(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });

      // Calculate summary from data
      const present = response.data.filter(a => a.status === 'present').length;
      const late = response.data.filter(a => a.status === 'late').length;
      const absent = response.data.filter(a => a.status === 'absent').length;
      const onLeave = response.data.filter(a => a.status === 'on_leave').length;

      setSummary({
        total: response.pagination.total,
        present,
        late,
        absent,
        onLeave,
      });
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedDepartment('');
    setSelectedStatus('');
    setSelectedCompany('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      employee_id: 0,
      date: new Date().toISOString().split('T')[0],
      check_in: '',
      check_out: '',
      status: 'present',
      notes: '',
    });
  };

  // Manual Entry
  const handleManualEntry = async () => {
    if (!formData.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    setIsProcessing(true);
    try {
      await attendanceService.create({
        employee_id: formData.employee_id,
        date: formData.date,
        check_in: formData.check_in || undefined,
        check_out: formData.check_out || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      });
      toast.success('Attendance created successfully');
      setShowManualEntryModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create attendance');
    } finally {
      setIsProcessing(false);
    }
  };

  // Edit
  const handleEdit = async () => {
    if (!selectedAttendance) return;

    setIsProcessing(true);
    try {
      await attendanceService.update(selectedAttendance.id, {
        check_in: formData.check_in || undefined,
        check_out: formData.check_out || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      });
      toast.success('Attendance updated successfully');
      setShowEditModal(false);
      setSelectedAttendance(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update attendance');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedAttendance) return;

    setIsProcessing(true);
    try {
      await attendanceService.delete(selectedAttendance.id);
      toast.success('Attendance deleted successfully');
      setShowDeleteModal(false);
      setSelectedAttendance(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete attendance');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export to Excel/CSV
  const handleExport = () => {
    if (attendances.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Employee ID', 'Employee Name', 'Department', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Notes'];
    const rows = attendances.map(a => [
      a.employee?.employee_id || '',
      a.employee?.name || '',
      a.employee?.department?.name || '',
      a.date,
      a.check_in || '',
      a.check_out || '',
      a.work_hours?.toFixed(2) || '',
      a.status,
      a.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${selectedDate}.csv`;
    link.click();
    toast.success('Export successful');
  };

  const openEditModal = (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setFormData({
      employee_id: attendance.employee_id,
      date: attendance.date,
      check_in: attendance.check_in || '',
      check_out: attendance.check_out || '',
      status: attendance.status,
      notes: attendance.notes || '',
    });
    setShowEditModal(true);
  };

  const openViewModal = (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setShowViewModal(true);
  };

  const openDeleteModal = (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setShowDeleteModal(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-green-100 text-green-800 border-green-200',
      absent: 'bg-red-100 text-red-800 border-red-200',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      early_leave: 'bg-orange-100 text-orange-800 border-orange-200',
      half_day: 'bg-blue-100 text-blue-800 border-blue-200',
      on_leave: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    const labels: Record<string, string> = {
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      early_leave: 'Early Leave',
      half_day: 'Half Day',
      on_leave: 'On Leave',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatWorkHours = (hours?: number) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 relative">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="attendance-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#attendance-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Clock className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Attendance Management</h1>
                  <p className="text-blue-100 text-sm mt-1">
                    Monitor and manage employee attendance
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExport}
                className="px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl hover:bg-white/30 transition-all duration-200 flex items-center gap-2 font-medium border border-white/30"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowManualEntryModal(true);
                }}
                className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-blue-50 transition-all duration-200 flex items-center gap-2 font-bold shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Manual Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Present</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{summary.present}</p>
                {summary.total > 0 && (
                  <span className="text-xs font-medium text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                    {Math.round((summary.present / summary.total) * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/25">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Late</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{summary.late}</p>
                {summary.total > 0 && (
                  <span className="text-xs font-medium text-yellow-600 flex items-center">
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                    {Math.round((summary.late / summary.total) * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Absent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.absent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">On Leave</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.onLeave}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Filter className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Attendance Filter</h3>
            <p className="text-xs text-gray-500">Filter attendance data by date, company, department, and status</p>
          </div>
        </div>

        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Date Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Department
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all appearance-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="early_leave">Early Leave</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 px-4 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Active Filters */}
        {(selectedCompany || selectedDepartment || selectedStatus) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500">Active filters:</span>
            {selectedCompany && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                {companies.find(c => c.id.toString() === selectedCompany)?.name}
                <button onClick={() => setSelectedCompany('')} className="ml-1 hover:text-indigo-900">
                  <XCircle className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedDepartment && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                {departments.find(d => d.id.toString() === selectedDepartment)?.name}
                <button onClick={() => setSelectedDepartment('')} className="ml-1 hover:text-blue-900">
                  <XCircle className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedStatus && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                {selectedStatus}
                <button onClick={() => setSelectedStatus('')} className="ml-1 hover:text-purple-900">
                  <XCircle className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Attendance Data</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Showing {attendances.length} of {pagination.total} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Work Hours
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-500">Loading data...</p>
                    </div>
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Clock className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">No data found</h3>
                      <p className="text-gray-500">No attendance data for the selected filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                attendances.map((attendance) => (
                  <tr key={attendance.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {attendance.employee?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{attendance.employee?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{attendance.employee?.employee_id || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {attendance.employee?.department?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendance.check_in ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-sm font-medium">{formatTime(attendance.check_in)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendance.check_out ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-sm font-medium">{formatTime(attendance.check_out)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatWorkHours(attendance.work_hours)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(attendance.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openViewModal(attendance)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(attendance)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(attendance)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setPagination(prev => ({ ...prev, page }))}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${pagination.page === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-50 text-gray-600'
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Manual Entry</h3>
                    <p className="text-sm text-gray-500">Create attendance record manually</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualEntryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
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
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Check In / Check Out */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check In
                  </label>
                  <input
                    type="time"
                    value={formData.check_in}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check Out
                  </label>
                  <input
                    type="time"
                    value={formData.check_out}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AttendanceStatus }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="early_leave">Early Leave</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add notes..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowManualEntryModal(false)}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEntry}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Saving...' : 'Create Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Edit className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Attendance</h3>
                    <p className="text-sm text-gray-500">{selectedAttendance.employee?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAttendance(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Employee:</span> {selectedAttendance.employee?.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {formatDate(selectedAttendance.date)}
                </p>
              </div>

              {/* Check In / Check Out */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check In
                  </label>
                  <input
                    type="time"
                    value={formData.check_in}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check Out
                  </label>
                  <input
                    type="time"
                    value={formData.check_out}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AttendanceStatus }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="early_leave">Early Leave</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add notes..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAttendance(null);
                }}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {showViewModal && selectedAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Attendance Details</h3>
                    <p className="text-sm text-gray-500">{formatDate(selectedAttendance.date)}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAttendance(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selectedAttendance.employee?.name?.charAt(0) || 'E'}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{selectedAttendance.employee?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedAttendance.employee?.employee_id}</p>
                  <p className="text-sm text-gray-500">{selectedAttendance.employee?.department?.name}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-600 uppercase">Check In</span>
                  </div>
                  <p className="text-xl font-bold text-green-700">{formatTime(selectedAttendance.check_in)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600 uppercase">Check Out</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{formatTime(selectedAttendance.check_out)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Work Hours</span>
                  </div>
                  <p className="text-xl font-bold text-gray-700">{formatWorkHours(selectedAttendance.work_hours)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Status</span>
                  </div>
                  <div className="mt-1">{getStatusBadge(selectedAttendance.status)}</div>
                </div>
              </div>

              {/* Location */}
              {(selectedAttendance.check_in_latitude || selectedAttendance.check_out_latitude) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Location</span>
                  </div>
                  {selectedAttendance.check_in_latitude && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Check In:</span> {selectedAttendance.check_in_latitude}, {selectedAttendance.check_in_longitude}
                    </p>
                  )}
                  {selectedAttendance.check_out_latitude && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Check Out:</span> {selectedAttendance.check_out_latitude}, {selectedAttendance.check_out_longitude}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedAttendance.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Notes</span>
                  </div>
                  <p className="text-sm text-gray-700">{selectedAttendance.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAttendance(null);
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Attendance?</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Are you sure you want to delete attendance record for{' '}
                <span className="font-medium text-gray-900">{selectedAttendance.employee?.name}</span>{' '}
                on <span className="font-medium text-gray-900">{formatDate(selectedAttendance.date)}</span>?
              </p>
              <p className="text-xs text-red-500 text-center mb-6">
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedAttendance(null);
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
