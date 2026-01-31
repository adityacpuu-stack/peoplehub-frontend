import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string } }>) => {
    const message = error.response?.data?.error?.message || error.message || 'An error occurred';
    const requestUrl = error.config?.url || '';

    // Skip toast for auth endpoints (login, register, etc) - let the page handle it
    const isAuthEndpoint = requestUrl.includes('/auth/login') ||
                          requestUrl.includes('/auth/register') ||
                          requestUrl.includes('/auth/forgot-password');

    // Handle 401 - Unauthorized (but not for login attempts)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    }
    // Handle 403 - Forbidden
    else if (error.response?.status === 403 && !isAuthEndpoint) {
      toast.error('You do not have permission to perform this action.');
    }
    // Handle 404 - Not Found
    else if (error.response?.status === 404 && !isAuthEndpoint) {
      toast.error('Resource not found.');
    }
    // Handle 500 - Server Error
    else if (error.response?.status === 500 && !isAuthEndpoint) {
      toast.error('Server error. Please try again later.');
    }
    // Handle other errors (skip for auth endpoints)
    else if (!isAuthEndpoint) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
