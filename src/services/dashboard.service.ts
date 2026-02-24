import api from './api';
import type { ApiResponse, DashboardStats } from '@/types';

interface DashboardOverview {
  employee_summary: {
    total_employees: number;
    active_employees: number;
    new_hires_this_month: number;
    terminated_this_month: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  };
  department_summary: {
    total_departments: number;
    departments: Array<{ id: number; name: string; employee_count: number }>;
  };
  attendance_summary: {
    today: {
      present: number;
      absent: number;
      late: number;
      on_leave: number;
      total: number;
    };
    this_week: {
      average_attendance_rate: number;
      total_late: number;
    };
  };
  leave_summary: {
    pending_requests: number;
    approved_this_month: number;
    rejected_this_month: number;
    on_leave_today: number;
  };
  pending_requests: {
    leave: number;
    overtime: number;
    total: number;
  };
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

export const dashboardService = {
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
