import api from './api';

// ==========================================
// TYPES
// ==========================================

export interface Overtime {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  break_duration?: number;
  reason: string;
  task_description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  overtime_type: 'regular' | 'weekend' | 'holiday';
  rate_multiplier: number;
  rate_per_hour: number;
  total_amount: number;
  employee: {
    id: number;
    name: string;
    employee_id: string;
    department?: {
      id: number;
      name: string;
    };
  };
  company?: {
    id: number;
    name: string;
  };
  approver?: {
    id: number;
    name: string;
  };
  approval_notes?: string;
  rejection_reason?: string;
  approved_at?: string;
  created_at: string;
}

export interface OvertimeListQuery {
  page?: number;
  limit?: number;
  employee_id?: number;
  company_id?: number;
  department_id?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  overtime_type?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateOvertimeDTO {
  employee_id?: number;
  date: string;
  start_time?: string;
  end_time?: string;
  hours?: number; // Direct hours input (takes precedence over start/end time calculation)
  break_duration?: number;
  reason: string;
  task_description?: string;
  overtime_type?: string;
  rate_multiplier?: number;
}

export interface UpdateOvertimeDTO {
  date?: string;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  reason?: string;
  task_description?: string;
  overtime_type?: string;
}

export interface ApproveOvertimeDTO {
  approval_notes?: string;
}

export interface RejectOvertimeDTO {
  rejection_reason: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==========================================
// SERVICE
// ==========================================

class OvertimeService {
  /**
   * Get list of overtime requests with pagination and filters
   */
  async list(query: OvertimeListQuery = {}): Promise<PaginatedResponse<Overtime>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/overtime?${params.toString()}`);
    // Backend returns { data, meta } format, transform to { data, pagination }
    const { data, meta } = response.data;
    return {
      data: data || [],
      pagination: {
        page: meta?.page || 1,
        limit: meta?.limit || 10,
        total: meta?.total || 0,
        totalPages: meta?.totalPages || 1,
      },
    };
  }

  /**
   * Get overtime detail by ID
   */
  async getById(id: number): Promise<Overtime> {
    const response = await api.get(`/overtime/${id}`);
    return response.data?.data || response.data;
  }

  /**
   * Create new overtime request (for self)
   */
  async create(data: CreateOvertimeDTO): Promise<Overtime> {
    const response = await api.post('/overtime', data);
    return response.data?.data || response.data;
  }

  /**
   * Create overtime request for employee (HR)
   */
  async createForEmployee(data: CreateOvertimeDTO & { employee_id: number }): Promise<Overtime> {
    const response = await api.post('/overtime/employee', data);
    return response.data?.data || response.data;
  }

  /**
   * Update overtime request
   */
  async update(id: number, data: UpdateOvertimeDTO): Promise<Overtime> {
    const response = await api.put(`/overtime/${id}`, data);
    return response.data?.data || response.data;
  }

  /**
   * Approve overtime request
   */
  async approve(id: number, data?: ApproveOvertimeDTO): Promise<Overtime> {
    const response = await api.post(`/overtime/${id}/approve`, data || {});
    return response.data?.data || response.data;
  }

  /**
   * Reject overtime request
   */
  async reject(id: number, data: RejectOvertimeDTO): Promise<Overtime> {
    const response = await api.post(`/overtime/${id}/reject`, data);
    return response.data?.data || response.data;
  }

  /**
   * Delete overtime request
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/overtime/${id}`);
  }

  /**
   * Get pending approvals for manager/CEO
   */
  async getPendingApprovals(): Promise<Overtime[]> {
    const response = await api.get('/overtime/pending-approvals');
    return response.data?.data || [];
  }

  /**
   * Get my overtime requests
   */
  async getMyOvertime(query: OvertimeListQuery = {}): Promise<PaginatedResponse<Overtime>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/overtime/me?${params.toString()}`);
    // Backend returns { data, meta } format, transform to { data, pagination }
    const { data, meta } = response.data;
    return {
      data: data || [],
      pagination: {
        page: meta?.page || 1,
        limit: meta?.limit || 10,
        total: meta?.total || 0,
        totalPages: meta?.totalPages || 1,
      },
    };
  }

  /**
   * Calculate overtime amount
   */
  calculateAmount(hours: number, hourlyRate: number, multiplier: number): number {
    return Math.round(hours * hourlyRate * multiplier);
  }

  /**
   * Get multiplier based on overtime type
   */
  getMultiplier(type: string): number {
    switch (type) {
      case 'regular':
      case 'weekday':
        return 1.5;
      case 'weekend':
        return 2;
      case 'holiday':
        return 3;
      default:
        return 1.5;
    }
  }

  /**
   * Calculate hours between start and end time
   */
  calculateHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const totalMinutes = endMinutes - startMinutes - breakMinutes;
    return Math.max(0, totalMinutes / 60);
  }
}

export const overtimeService = new OvertimeService();
