import api from './api';
import type { ApiResponse, DashboardStats } from '@/types';

export interface DashboardOverview {
  employee: {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
    by_department: Array<{ department: string; count: number }>;
    by_employment_type: Array<{ type: string; count: number }>;
    gender_distribution: Array<{ gender: string; count: number }>;
  };
  attendance: {
    today: {
      total_expected: number;
      checked_in: number;
      checked_out: number;
      late: number;
      absent: number;
      on_leave: number;
    };
    this_week: {
      avg_check_in_time: string | null;
      avg_work_hours: number | null;
      late_count: number;
      absent_count: number;
    };
    this_month: {
      total_work_days: number;
      avg_attendance_rate: number;
    };
  };
  leave: {
    pending_requests: number;
    approved_this_month: number;
    rejected_this_month: number;
    on_leave_today: number;
    upcoming_leaves: Array<{
      employee_name: string;
      leave_type: string;
      start_date: string;
      end_date: string;
    }>;
    by_type: Array<{ type: string; count: number }>;
  };
  payroll: {
    current_period: {
      period: string;
      status: string;
      total_employees: number;
      total_gross: number;
      total_deductions: number;
      total_net: number;
    } | null;
    pending_adjustments: number;
    pending_overtime: number;
  };
  performance: {
    active_cycles: number;
    pending_reviews: number;
    completed_reviews_this_month: number;
    avg_performance_score: number | null;
    goals: {
      total: number;
      in_progress: number;
      completed: number;
      overdue: number;
    };
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'error' | 'success';
    category: string;
    title: string;
    message: string;
    count?: number;
    action_url?: string;
    created_at: string;
  }>;
}

interface QuickStats {
  total_employees: number;
  active_employees: number;
  departments_count: number;
  new_hires_this_month: number;
  attendance_today: {
    present: number;
    absent: number;
    late: number;
    on_leave: number;
  };
  pending_requests: {
    leave: number;
    overtime: number;
  };
}

// Team member type for manager's team view
export interface TeamMember {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  avatar: string | null;
  join_date: string | null;
  status_today: 'present' | 'absent' | 'leave' | 'late' | 'not_checked_in';
  check_in_time: string | null;
  pending_leaves: number;
}

export interface TeamDashboard {
  team_size: number;
  present_today: number;
  on_leave_today: number;
  pending_leave_requests: number;
  pending_overtime_requests: number;
  team_goals: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
  };
  team_members: TeamMember[];
}

// Group CEO Dashboard types
export interface GroupDashboard {
  summary: {
    total_companies: number;
    total_employees: number;
    total_departments: number;
    avg_attendance_rate: number;
    total_on_leave_today: number;
    pending_approvals: number;
    new_hires_this_month: number;
    terminations_this_month: number;
  };
  companies: CompanyOverview[];
  headcount_trend: {
    month: string;
    headcount: number;
    hires: number;
    exits: number;
  }[];
  department_distribution: {
    name: string;
    employees: number;
    percentage: number;
  }[];
  payroll_summary: {
    total_monthly_payroll: number;
    avg_salary: number;
    by_company: {
      company_name: string;
      total_payroll: number;
      employee_count: number;
    }[];
  };
  recent_activities: GroupActivity[];
  alerts: DashboardAlert[];
}

export interface CompanyOverview {
  id: number;
  name: string;
  employees: number;
  active_employees: number;
  attendance_rate: number; // -1 means N/A (attendance not enabled)
  attendance_enabled: boolean;
  on_leave_today: number;
  pending_leaves: number;
  new_hires_this_month: number;
}

export interface GroupActivity {
  id: number;
  type: 'hire' | 'exit' | 'promotion' | 'leave' | 'transfer';
  action: string;
  company_name: string;
  employee_name: string;
  created_at: string;
}

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  category: string;
  title: string;
  message: string;
  count?: number;
  action_url?: string;
  created_at: string;
}

// Headcount Analytics types
export interface HeadcountAnalytics {
  headcount_trend: {
    month: string;
    headcount: number;
    hires: number;
    exits: number;
  }[];
  quarterly_comparison: {
    quarter: string;
    headcount: number;
    growth: number;
  }[];
  headcount_by_company: {
    name: string;
    headcount: number;
    growth: string;
    hires: number;
  }[];
  department_headcount: {
    name: string;
    employees: number;
    percentage: number;
  }[];
  headcount_forecast: {
    month: string;
    projected: number;
    lower: number;
    upper: number;
  }[];
  current_headcount: number;
  year_end_target: number;
}

// Turnover Analytics types
export interface TurnoverAnalytics {
  monthly_turnover: {
    month: string;
    hires: number;
    exits: number;
    rate: number;
  }[];
  exit_reasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  department_turnover: {
    name: string;
    turnoverRate: number;
    exits: number;
    hires: number;
    netChange: number;
  }[];
  tenure_at_exit: {
    range: string;
    count: number;
    percentage: number;
  }[];
  recent_exits: {
    name: string;
    department: string;
    position: string;
    exitDate: string;
    reason: string;
    tenure: string;
    company: string;
  }[];
  avg_tenure_at_exit: number;
  total_exits_period: number;
  total_hires_period: number;
}

// Workforce Analytics types
export interface WorkforceAnalytics {
  gender_distribution: {
    label: string;
    value: number;
    count: number;
    color: string;
  }[];
  employment_type_distribution: {
    label: string;
    value: number;
    count: number;
    color: string;
  }[];
  age_distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  tenure_distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  marital_status_distribution: {
    label: string;
    value: number;
    count: number;
  }[];
}

// My Dashboard (Employee Self-Service) types
export interface MyDashboard {
  attendance: {
    today_status: 'checked_in' | 'checked_out' | 'not_checked_in' | 'on_leave';
    check_in_time: string | null;
    check_out_time: string | null;
    this_month: {
      present_days: number;
      late_days: number;
      absent_days: number;
      leave_days: number;
    };
  };
  attendance_history: {
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: 'present' | 'late' | 'absent' | 'on_leave';
    hours: number;
  }[];
  leave_balance: {
    type: string;
    total: number;
    used: number;
    remaining: number;
  }[];
  recent_requests: {
    id: number;
    type: 'leave' | 'overtime';
    detail: string;
    status: 'pending' | 'approved' | 'rejected';
    date: string;
  }[];
  announcements: {
    id: number;
    title: string;
    category: string;
    date: string;
    is_new: boolean;
  }[];
  pending_requests: {
    leave: number;
    overtime: number;
  };
  goals: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
  };
  upcoming_events: {
    id: string;
    type: string;
    title: string;
    date: string;
  }[];
}

// Super Admin Stats type
export interface SuperAdminStats {
  total_users: number;
  total_companies: number;
  total_employees: number;
  audit_entries_today: number;
}

// Audit Log entry type (from /audit-logs/recent)
export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  user_email: string | null;
  employee_name: string | null;
  action: string;
  model: string | null;
  model_id: number | null;
  description: string | null;
  ip_address: string | null;
  method: string | null;
  url: string | null;
  created_at: string;
}

// Audit Statistics type (from /audit-logs/statistics)
export interface AuditStatistics {
  total_logs: number;
  by_action: { action: string; count: number }[];
  by_model: { model: string | null; count: number }[];
  by_user: { user_email: string | null; count: number }[];
  daily_activity: { date: string; count: number }[];
}

export const dashboardService = {
  // Get super admin stats
  getSuperAdminStats: async (): Promise<SuperAdminStats> => {
    const response = await api.get<ApiResponse<SuperAdminStats>>('/dashboard/super-admin-stats');
    return response.data.data;
  },

  // Get recent audit logs
  getRecentAuditLogs: async (limit: number = 10): Promise<AuditLogEntry[]> => {
    const response = await api.get<ApiResponse<AuditLogEntry[]>>('/audit-logs/recent', { params: { limit } });
    return response.data.data;
  },

  // Get audit statistics
  getAuditStatistics: async (): Promise<AuditStatistics> => {
    const response = await api.get<ApiResponse<AuditStatistics>>('/audit-logs/statistics');
    return response.data.data;
  },

  // Get full dashboard overview (Admin/HR)
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await api.get<ApiResponse<DashboardOverview>>('/dashboard');
    return response.data.data;
  },

  // Get Group CEO dashboard (multi-company overview)
  getGroupOverview: async (companyId?: number): Promise<GroupDashboard> => {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get<ApiResponse<GroupDashboard>>('/dashboard/group', { params });
    return response.data.data;
  },

  // Get quick stats for dashboard cards
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<QuickStats>>('/dashboard/quick-stats');
    const data = response.data.data;

    // Map to DashboardStats format
    return {
      total_employees: data.total_employees,
      active_employees: data.active_employees,
      new_hires_this_month: data.new_hires_this_month,
      departments_count: data.departments_count,
      attendance_today: data.attendance_today,
      pending_requests: data.pending_requests,
    };
  },

  // Get my personal dashboard (self-service)
  getMyDashboard: async (): Promise<MyDashboard> => {
    const response = await api.get<ApiResponse<MyDashboard>>('/dashboard/my');
    return response.data.data;
  },

  // Get team dashboard (for managers)
  getTeamDashboard: async (): Promise<TeamDashboard> => {
    const response = await api.get<ApiResponse<TeamDashboard>>('/dashboard/team');
    return response.data.data;
  },

  // Get calendar events
  getCalendarEvents: async (params?: { start_date?: string; end_date?: string }): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/dashboard/calendar', { params });
    return response.data.data;
  },

  // Get alerts and notifications
  getAlerts: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/dashboard/alerts');
    return response.data.data;
  },

  // Get employee summary
  getEmployeeSummary: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/dashboard/employee');
    return response.data.data;
  },

  // Get attendance summary
  getAttendanceSummary: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/dashboard/attendance');
    return response.data.data;
  },

  // Get leave summary
  getLeaveSummary: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/dashboard/leave');
    return response.data.data;
  },

  // Get payroll summary
  getPayrollSummary: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/dashboard/payroll');
    return response.data.data;
  },

  // Get performance summary
  getPerformanceSummary: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/dashboard/performance');
    return response.data.data;
  },

  // Get workforce analytics (demographics, tenure, etc.)
  getWorkforceAnalytics: async (companyId?: number): Promise<WorkforceAnalytics> => {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get<ApiResponse<WorkforceAnalytics>>('/dashboard/workforce-analytics', { params });
    return response.data.data;
  },

  // Get turnover analytics (exits, retention, etc.)
  getTurnoverAnalytics: async (companyId?: number, period?: string): Promise<TurnoverAnalytics> => {
    const params: Record<string, string | number> = {};
    if (companyId) params.company_id = companyId;
    if (period) params.period = period;
    const response = await api.get<ApiResponse<TurnoverAnalytics>>('/dashboard/turnover-analytics', { params });
    return response.data.data;
  },

  // Get headcount analytics (trends, forecasts, etc.)
  getHeadcountAnalytics: async (companyId?: number, period?: string): Promise<HeadcountAnalytics> => {
    const params: Record<string, string | number> = {};
    if (companyId) params.company_id = companyId;
    if (period) params.period = period;
    const response = await api.get<ApiResponse<HeadcountAnalytics>>('/dashboard/headcount-analytics', { params });
    return response.data.data;
  },
};
