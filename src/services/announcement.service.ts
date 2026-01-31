import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

// ==========================================
// ANNOUNCEMENT TYPES
// ==========================================

export const ANNOUNCEMENT_CATEGORIES = ['general', 'policy', 'event', 'hr', 'urgent'] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const ANNOUNCEMENT_VISIBILITIES = ['all', 'department', 'role'] as const;
export type AnnouncementVisibility = (typeof ANNOUNCEMENT_VISIBILITIES)[number];

export interface Announcement {
  id: number;
  company_id: number | null;
  target_company_ids: number[] | null;
  is_global: boolean;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  visibility: AnnouncementVisibility;
  target_audience: string | null;
  target_ids: number[] | null;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  views_count: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  company?: {
    id: number;
    name: string;
  } | null;
  creator?: {
    id: number;
    name: string;
  } | null;
}

export interface AnnouncementListParams extends PaginationParams {
  company_id?: number;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  visibility?: AnnouncementVisibility;
  is_pinned?: boolean;
  is_published?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateAnnouncementRequest {
  company_id?: number;
  target_company_ids?: number[];
  is_global?: boolean;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority?: AnnouncementPriority;
  visibility?: AnnouncementVisibility;
  target_audience?: string;
  target_ids?: number[];
  is_pinned?: boolean;
  is_published?: boolean;
  expires_at?: string;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  visibility?: AnnouncementVisibility;
  target_audience?: string;
  target_ids?: number[];
  is_pinned?: boolean;
  expires_at?: string | null;
}

export interface AnnouncementStatistics {
  total: number;
  published: number;
  draft: number;
  pinned: number;
  urgent: number;
  by_category: { category: string; count: number }[];
  by_priority: { priority: string; count: number }[];
}

// ==========================================
// BACKEND RESPONSE TYPES
// ==========================================

interface BackendPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ==========================================
// ANNOUNCEMENT SERVICE
// ==========================================

export const announcementService = {
  /**
   * Get all announcements with pagination and filters
   */
  getAll: async (params?: AnnouncementListParams): Promise<PaginatedResponse<Announcement>> => {
    const response = await api.get<BackendPaginatedResponse<Announcement>>('/announcements', { params });
    return {
      success: true,
      data: response.data.data,
      pagination: {
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.total_pages,
      },
    };
  },

  /**
   * Get announcement by ID
   */
  getById: async (id: number): Promise<Announcement> => {
    const response = await api.get<ApiResponse<Announcement>>(`/announcements/${id}`);
    return response.data.data;
  },

  /**
   * Get published announcements for employees
   */
  getPublished: async (companyId: number): Promise<Announcement[]> => {
    const response = await api.get<ApiResponse<Announcement[]>>(`/announcements/published/${companyId}`);
    return response.data.data;
  },

  /**
   * Get announcement statistics
   */
  getStatistics: async (companyId?: number): Promise<AnnouncementStatistics> => {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await api.get<ApiResponse<AnnouncementStatistics>>('/announcements/statistics', { params });
    return response.data.data;
  },

  /**
   * Create a new announcement
   */
  create: async (data: CreateAnnouncementRequest): Promise<Announcement> => {
    const response = await api.post<ApiResponse<Announcement>>('/announcements', data);
    return response.data.data;
  },

  /**
   * Update an announcement
   */
  update: async (id: number, data: UpdateAnnouncementRequest): Promise<Announcement> => {
    const response = await api.put<ApiResponse<Announcement>>(`/announcements/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete an announcement
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/announcements/${id}`);
  },

  /**
   * Publish an announcement
   */
  publish: async (id: number): Promise<Announcement> => {
    const response = await api.post<ApiResponse<Announcement>>(`/announcements/${id}/publish`);
    return response.data.data;
  },

  /**
   * Unpublish an announcement
   */
  unpublish: async (id: number): Promise<Announcement> => {
    const response = await api.post<ApiResponse<Announcement>>(`/announcements/${id}/unpublish`);
    return response.data.data;
  },

  /**
   * Toggle pin status
   */
  togglePin: async (id: number): Promise<Announcement> => {
    const response = await api.post<ApiResponse<Announcement>>(`/announcements/${id}/toggle-pin`);
    return response.data.data;
  },

  /**
   * Track view (increment view count)
   */
  trackView: async (id: number): Promise<void> => {
    await api.post(`/announcements/${id}/view`);
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export const getCategoryLabel = (category: AnnouncementCategory): string => {
  const labels: Record<AnnouncementCategory, string> = {
    general: 'General',
    policy: 'Policy Update',
    event: 'Event',
    hr: 'HR Notice',
    urgent: 'Urgent',
  };
  return labels[category] || category;
};

export const getPriorityLabel = (priority: AnnouncementPriority): string => {
  const labels: Record<AnnouncementPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority] || priority;
};

export const getVisibilityLabel = (visibility: AnnouncementVisibility): string => {
  const labels: Record<AnnouncementVisibility, string> = {
    all: 'All Employees',
    department: 'Specific Department',
    role: 'Specific Role',
  };
  return labels[visibility] || visibility;
};
