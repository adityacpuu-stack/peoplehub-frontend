import api from './api';
import type { ApiResponse } from '@/types';

// ==========================================
// TYPES
// ==========================================

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  unread_count: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unread_count: number;
  };
}

export interface AnnouncementPopup {
  notification_id: number;
  type: string;
  announcement: {
    id: number;
    title: string;
    content: string;
    category: string;
    priority: string;
    published_at: string;
    creator: {
      id: number;
      name: string;
    };
  };
  created_at: string;
}

export interface AnnouncementPopupsResponse {
  success: boolean;
  data: AnnouncementPopup[];
}

// ==========================================
// SERVICE
// ==========================================

export const notificationService = {
  // Get my notifications
  getMyNotifications: async (params?: { page?: number; limit?: number; is_read?: boolean }): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>('/notifications', { params });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data.data.unread_count;
  },

  // Mark notification as read
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await api.post<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data.data;
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/mark-all-read');
  },

  // Delete notification
  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  // Delete all read notifications
  deleteAllRead: async (): Promise<void> => {
    await api.delete('/notifications/read');
  },

  // Get announcement popups (unread announcements for popup display)
  getAnnouncementPopups: async (): Promise<AnnouncementPopup[]> => {
    const response = await api.get<AnnouncementPopupsResponse>('/notifications/announcement-popups');
    return response.data.data;
  },

  // Dismiss single announcement popup
  dismissAnnouncementPopup: async (notificationId: number): Promise<void> => {
    await api.post(`/notifications/announcement-popups/${notificationId}/dismiss`);
  },

  // Dismiss all announcement popups
  dismissAllAnnouncementPopups: async (): Promise<void> => {
    await api.post('/notifications/announcement-popups/dismiss-all');
  },
};
