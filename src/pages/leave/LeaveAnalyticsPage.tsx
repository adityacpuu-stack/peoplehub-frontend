import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Building,
  Download,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { leaveService } from '../../services/leave.service';
import { companyService } from '../../services/company.service';
import type { LeaveRequest, LeaveType } from '@/types';

interface Company {
  id: number;
  name: string;
}

interface MonthlyData {
  month: string;
  requests: number;
  approved: number;
  rejected: number;
  days: number;
}

interface LeaveTypeStats {
  type: LeaveType;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  totalDays: number;
  percentage: number;
}

interface DepartmentStats {
  name: string;
  total: number;
  approved: number;
  averageDays: number;
}

export function LeaveAnalyticsPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterPeriod, setFilterPeriod] = useState<string>('year');

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

  // Fetch all leaves for analytics
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; company_id?: number } = {
        page: 1,
        limit: 1000, // Get more data for analytics
      };
      if (filterCompany !== 'all') {
        params.company_id = Number(filterCompany);
      }

      const response = await leaveService.getAll(params);
      setLeaves(response.data);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, [filterCompany]);

  useEffect(() => {
    fetchCompanies();
    fetchLeaveTypes();
  }, [fetchCompanies, fetchLeaveTypes]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Filter leaves by year
  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      const leaveYear = new Date(leave.start_date).getFullYear().toString();
      return leaveYear === filterYear;
    });
  }, [leaves, filterYear]);

  // Calculate days for a leave
  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Overall stats
  const overallStats = useMemo(() => {
    const total = filteredLeaves.length;
    const pending = filteredLeaves.filter(l => l.status === 'pending').length;
    const approved = filteredLeaves.filter(l => l.status === 'approved').length;
    const rejected = filteredLeaves.filter(l => l.status === 'rejected').length;
    const totalDays = filteredLeaves
      .filter(l => l.status === 'approved')
      .reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0);
    const avgDays = approved > 0 ? (totalDays / approved).toFixed(1) : '0';
    const approvalRate = total > 0 ? ((approved / (approved + rejected)) * 100).toFixed(1) : '0';

    // Compare with previous period (mock data for demonstration)
    const prevTotal = Math.floor(total * (0.8 + Math.random() * 0.4));
    const totalChange = total > 0 ? (((total - prevTotal) / prevTotal) * 100).toFixed(1) : '0';

    return {
      total,
      pending,
      approved,
      rejected,
      totalDays,
      avgDays,
      approvalRate,
      totalChange: parseFloat(totalChange),
    };
  }, [filteredLeaves]);

  // Monthly breakdown
  const monthlyData = useMemo((): MonthlyData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => {
      const monthLeaves = filteredLeaves.filter(l => {
        const date = new Date(l.start_date);
        return date.getMonth() === index;
      });

      return {
        month,
        requests: monthLeaves.length,
        approved: monthLeaves.filter(l => l.status === 'approved').length,
        rejected: monthLeaves.filter(l => l.status === 'rejected').length,
        days: monthLeaves
          .filter(l => l.status === 'approved')
          .reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0),
      };
    });
  }, [filteredLeaves]);

  // Leave type statistics
  const leaveTypeStats = useMemo((): LeaveTypeStats[] => {
    return leaveTypes.map(type => {
      const typeLeaves = filteredLeaves.filter(l => l.leave_type_id === type.id);
      const total = typeLeaves.length;
      const approved = typeLeaves.filter(l => l.status === 'approved').length;
      const pending = typeLeaves.filter(l => l.status === 'pending').length;
      const rejected = typeLeaves.filter(l => l.status === 'rejected').length;
      const totalDays = typeLeaves
        .filter(l => l.status === 'approved')
        .reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0);
      const percentage = filteredLeaves.length > 0 ? (total / filteredLeaves.length) * 100 : 0;

      return {
        type,
        total,
        approved,
        pending,
        rejected,
        totalDays,
        percentage,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredLeaves, leaveTypes]);

  // Department statistics
  const departmentStats = useMemo((): DepartmentStats[] => {
    const deptMap = new Map<string, { total: number; approved: number; days: number }>();

    filteredLeaves.forEach(leave => {
      const deptName = leave.employee?.department?.name || 'Unknown';
      const existing = deptMap.get(deptName) || { total: 0, approved: 0, days: 0 };
      existing.total += 1;
      if (leave.status === 'approved') {
        existing.approved += 1;
        existing.days += calculateDays(leave.start_date, leave.end_date);
      }
      deptMap.set(deptName, existing);
    });

    return Array.from(deptMap.entries())
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        approved: stats.approved,
        averageDays: stats.approved > 0 ? parseFloat((stats.days / stats.approved).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredLeaves]);

  // Get max value for chart scaling
  const maxMonthlyRequests = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.requests), 1);
  }, [monthlyData]);

  const handleRefresh = () => {
    fetchLeaves();
    toast.success('Data refreshed');
  };

  const handleExport = () => {
    const data = {
      period: `${filterYear}`,
      overall: overallStats,
      monthlyBreakdown: monthlyData,
      byLeaveType: leaveTypeStats.map(s => ({
        type: s.type.name,
        total: s.total,
        approved: s.approved,
        pending: s.pending,
        rejected: s.rejected,
        totalDays: s.totalDays,
      })),
      byDepartment: departmentStats,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_analytics_${filterYear}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export successful');
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const getTypeColor = (index: number) => {
    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-indigo-500 to-violet-600',
    ];
    return colors[index % colors.length];
  };

  const getBarColor = (index: number) => {
    const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-rose-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Leave Analytics
                  </h1>
                  <p className="text-rose-100 text-sm mt-1">
                    Insights and trends for leave management
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
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-rose-600 rounded-xl hover:bg-rose-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span>Filters:</span>
          </div>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          >
            <option value="all">All Companies</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          >
            <option value="year">Full Year</option>
            <option value="q1">Q1 (Jan-Mar)</option>
            <option value="q2">Q2 (Apr-Jun)</option>
            <option value="q3">Q3 (Jul-Sep)</option>
            <option value="q4">Q4 (Oct-Dec)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                  overallStats.totalChange >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {overallStats.totalChange >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(overallStats.totalChange)}%
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{overallStats.total}</p>
              <p className="text-sm text-gray-500">Total Requests</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
                  {overallStats.approvalRate}%
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{overallStats.approved}</p>
              <p className="text-sm text-gray-500">Approved Requests</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{overallStats.totalDays}</p>
              <p className="text-sm text-gray-500">Total Days Taken</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{overallStats.avgDays}</p>
              <p className="text-sm text-gray-500">Avg. Days per Request</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                  Monthly Leave Requests
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-end justify-between h-48 gap-2">
                  {monthlyData.map((data, index) => (
                    <div key={data.month} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{data.requests}</span>
                        <div
                          className={`w-full max-w-[32px] ${getBarColor(index)} rounded-t transition-all hover:opacity-80`}
                          style={{
                            height: `${(data.requests / maxMonthlyRequests) * 120}px`,
                            minHeight: data.requests > 0 ? '8px' : '0px',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-violet-500 rounded"></div>
                    <span className="text-xs text-gray-500">Requests</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Type Distribution */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-rose-500" />
                  Leave Type Distribution
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {leaveTypeStats.slice(0, 5).map((stat, index) => (
                    <div key={stat.type.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{stat.type.name}</span>
                        <span className="text-sm text-gray-500">{stat.total} ({stat.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getTypeColor(index)} transition-all`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {leaveTypeStats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No leave type data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Breakdown & Department Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-500" />
                  Status Breakdown
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-yellow-50 rounded-xl">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.pending}</p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.approved}</p>
                    <p className="text-sm text-gray-500">Approved</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.rejected}</p>
                    <p className="text-sm text-gray-500">Rejected</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Approval Rate</span>
                    <span className="text-lg font-bold text-green-600">{overallStats.approvalRate}%</span>
                  </div>
                  <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${overallStats.approvalRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Department Statistics */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-rose-500" />
                  Department Overview
                </h3>
              </div>
              <div className="p-6">
                {departmentStats.length > 0 ? (
                  <div className="space-y-3">
                    {departmentStats.slice(0, 6).map((dept, index) => (
                      <div key={dept.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${getTypeColor(index)}`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{dept.name}</p>
                            <p className="text-xs text-gray-500">
                              {dept.approved} approved of {dept.total} requests
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{dept.total}</p>
                          <p className="text-xs text-gray-500">avg {dept.averageDays} days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No department data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Leave Type Details Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-rose-500" />
                Leave Type Details
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rejected
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Days
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaveTypeStats.map((stat, index) => (
                    <tr key={stat.type.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm bg-gradient-to-br ${getTypeColor(index)}`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-gray-900">{stat.type.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900">
                        {stat.total}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">
                          {stat.approved}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-lg">
                          {stat.pending}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-lg">
                          {stat.rejected}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-gray-900">
                        {stat.totalDays}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-500">{stat.percentage.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leaveTypeStats.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No data available</h3>
                  <p className="mt-1 text-gray-500">No leave requests found for the selected period</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
