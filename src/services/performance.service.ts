import api from './api';

export interface PerformanceReview {
  id: number;
  employee_id: number;
  reviewer_id: number;
  company_id: number;
  cycle_id: number | null;
  review_type: string;
  period: string | null;
  review_date: string | null;
  overall_rating: number | null;
  goals_achievement: number | null;
  competency_score: number | null;
  status: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    name: string;
    employee_id: string;
    position?: { name: string } | null;
    department?: { name: string } | null;
  };
  reviewer?: {
    id: number;
    name: string;
  };
}

export interface ReviewListQuery {
  page?: number;
  limit?: number;
  company_id?: number;
  employee_id?: number;
  reviewer_id?: number;
  status?: string;
  year?: number;
}

export interface ReviewListResponse {
  data: PerformanceReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const performanceService = {
  listReviews: async (query: ReviewListQuery = {}): Promise<ReviewListResponse> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/performance/reviews?${params.toString()}`);
    // Backend returns { message, data, pagination }
    return { data: response.data.data, pagination: response.data.pagination };
  },

  getReviewById: async (id: number): Promise<PerformanceReview> => {
    const response = await api.get(`/performance/reviews/${id}`);
    return response.data.data;
  },

  createReview: async (data: Record<string, any>): Promise<PerformanceReview> => {
    const response = await api.post('/performance/reviews', data);
    return response.data.data || response.data;
  },

  updateReview: async (id: number, data: Record<string, any>): Promise<PerformanceReview> => {
    const response = await api.put(`/performance/reviews/${id}`, data);
    return response.data.data || response.data;
  },

  getMyReviews: async (): Promise<ReviewListResponse> => {
    const response = await api.get('/performance/reviews/me');
    return { data: response.data.data, pagination: response.data.pagination };
  },
};
