import { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  UserCheck,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  LogIn,
  LogOut,
  UsersRound,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { attendanceService } from '@/services/attendance.service';
import type { Attendance } from '@/types';

interface AttendanceRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  position: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'wfh' | 'half_day';
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  overtime_hours: number | null;
  notes: string | null;
}

function transformAttendance(att: Attendance): AttendanceRecord {
  const checkIn = att.check_in ? new Date(att.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
  const checkOut = att.check_out ? new Date(att.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;

  return {
    id: att.id,
    employee_id: att.employee?.employee_id || '-',
    employee_name: att.employee?.name || 'Unknown',
    position: (att.employee as any)?.position?.name || (att.employee as any)?.position || '-',
    date: att.date,
    status: (att.status as any) || 'absent',
    check_in: checkIn,
    check_out: checkOut,
    work_hours: att.work_hours ?? null,
    overtime_hours: att.overtime_hours ?? null,
    notes: att.notes ?? null,
  };
}

export function TeamAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const data = await attendanceService.getTeamAttendance({ date: selectedDate });
      setAttendanceRecords((data || []).map(transformAttendance));
    } catch (err) {
      console.error('Failed to fetch team attendance:', err);
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter((r) => r.status === 'present').length,
    wfh: attendanceRecords.filter((r) => r.status === 'wfh').length,
    late: attendanceRecords.filter((r) => r.status === 'late').length,
    onLeave: attendanceRecords.filter((r) => r.status === 'on_leave').length,
    absent: attendanceRecords.filter((r) => r.status === 'absent').length,
    halfDay: attendanceRecords.filter((r) => r.status === 'half_day').length,
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    const config = {
      present: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Present' },
      late: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle, label: 'Late' },
      wfh: { bg: 'bg-blue-100', text: 'text-blue-700', icon: MapPin, label: 'WFH' },
      on_leave: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Calendar, label: 'On Leave' },
      absent: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Absent' },
      half_day: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: Timer, label: 'Half Day' },
    };
    const c = config[status] || config.absent;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="h-3.5 w-3.5" />
        {c.label}
      </span>
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-8">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Team Attendance</h1>
                <p className="text-green-100 mt-1">Monitor your team's attendance records</p>
              </div>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl p-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 px-3">
                <CalendarDays className="h-5 w-5 text-green-200" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none"
                />
              </div>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                disabled={isToday}
              >
                <ChevronRight className={`h-5 w-5 ${isToday ? 'opacity-50' : ''}`} />
              </button>
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Date Display */}
          <div className="mt-4">
            <p className="text-green-100 text-lg">{formatDate(selectedDate)}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-green-100">Total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.present}</p>
              <p className="text-xs text-green-100">Present</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.wfh}</p>
              <p className="text-xs text-green-100">WFH</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.late}</p>
              <p className="text-xs text-green-100">Late</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.onLeave}</p>
              <p className="text-xs text-green-100">On Leave</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.halfDay}</p>
              <p className="text-xs text-green-100">Half Day</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.absent}</p>
              <p className="text-xs text-green-100">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            {[
              { value: 'all', label: 'All' },
              { value: 'present', label: 'Present' },
              { value: 'wfh', label: 'WFH' },
              { value: 'late', label: 'Late' },
              { value: 'on_leave', label: 'Leave' },
              { value: 'half_day', label: 'Half Day' },
              { value: 'absent', label: 'Absent' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedStatus === filter.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
                <p className="text-gray-500">Loading attendance...</p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersRound className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No records found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Work Hours</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Overtime</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {record.employee_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{record.employee_name}</p>
                          <p className="text-xs text-gray-500">{record.employee_id} {record.position !== '-' ? `\u2022 ${record.position}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4 text-center">
                      {record.check_in ? (
                        <div className="inline-flex items-center gap-1.5 text-sm">
                          <LogIn className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-gray-900">{record.check_in}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.check_out ? (
                        <div className="inline-flex items-center gap-1.5 text-sm">
                          <LogOut className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-gray-900">{record.check_out}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.work_hours !== null ? (
                        <span className="font-medium text-gray-900">{record.work_hours.toFixed(1)}h</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.overtime_hours !== null && record.overtime_hours > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <Timer className="h-3 w-3" />
                          +{record.overtime_hours.toFixed(1)}h
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {record.notes ? (
                        <span className="text-sm text-gray-600">{record.notes}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Summary Card */}
      {!isLoading && attendanceRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Attendance Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {stats.total > 0 ? Math.round(((stats.present + stats.wfh + stats.late + stats.halfDay) / stats.total) * 100) : 0}%
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Late Rate</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Total Overtime</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {attendanceRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0).toFixed(1)}h
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Avg Work Hours</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {(() => {
                  const validRecords = attendanceRecords.filter(r => r.work_hours !== null);
                  return validRecords.length > 0
                    ? (validRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0) / validRecords.length).toFixed(1)
                    : '0';
                })()}h
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
