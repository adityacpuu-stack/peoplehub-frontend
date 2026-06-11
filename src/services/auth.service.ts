import api from './api';
import type { ApiResponse, LoginRequest, LoginResponse, User } from '@/types';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    // Send the refresh token so BE can block it too (W7.A security fix).
    // Without this, an attacker holding the refresh token could mint a fresh
    // access token via /auth/refresh even after we "logged out".
    const refreshToken = localStorage.getItem('refreshToken') || undefined;
    await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
  },

  me: async (): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await api.post('/auth/change-password', data);
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (data: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> => {
    await api.post('/auth/reset-password', data);
  },
};
