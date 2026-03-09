import api from './api';

export interface Goal {
  id: number;
  employee_id: number;
  performance_review_id: number | null;
  kpi_id: number | null;
  parent_goal_id: number | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  target_value: number | null;
  current_value: number | null;
  unit_of_measure: string | null;
  start_date: string | null;
  target_date: string | null;
  weight: number | null;
  is_stretch_goal: boolean;
  progress_percentage: number;
  achievement_notes: string | null;
  blockers: string | null;
  manager_feedback: string | null;
  score: number | null;
  employee_comments: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    name: string;
    employee_id: string;
    position?: { name: string } | null;
    department?: { name: string } | null;
  };
  kpi?: {
    id: number;
    name: string;
  } | null;
}

export interface GoalListQuery {
  page?: number;
  limit?: number;
  search?: string;
  employee_id?: number;
  category?: string;
  priority?: string;
  status?: string;
}

export interface GoalListResponse {
  data: Goal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GoalStatistics {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  completion_rate: number;
  average_progress: number;
}

export const goalService = {
  list: async (query: GoalListQuery = {}): Promise<GoalListResponse> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/goals?${params.toString()}`);
    // Backend returns { data, pagination } directly
    return { data: response.data.data, pagination: response.data.pagination };
  },

  getById: async (id: number): Promise<Goal> => {
    const response = await api.get(`/goals/${id}`);
    return response.data;
  },

  getStatistics: async (query?: { employee_id?: number; company_id?: number }): Promise<GoalStatistics> => {
    const response = await api.get('/goals/statistics', { params: query });
    return response.data;
  },

  create: async (data: Partial<Goal>): Promise<Goal> => {
    const response = await api.post('/goals', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Goal>): Promise<Goal> => {
    const response = await api.put(`/goals/${id}`, data);
    return response.data;
  },

  updateProgress: async (id: number, data: { progress_percentage: number; achievement_notes?: string; blockers?: string }): Promise<Goal> => {
    const response = await api.patch(`/goals/${id}/progress`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/goals/${id}`);
  },
};
