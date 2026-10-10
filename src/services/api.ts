import { t, getLocale } from '@/i18n';
import { translateError } from '@/i18n/error-message';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { clearEmployeeCreateDrafts } from '@/lib/employee-create-draft';

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
    config.headers['Accept-Language'] = getLocale();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// ERROR BODY NORMALIZATION
// ==========================================
// Backend contract (backend/src/middlewares/error.middleware.ts errorHandler):
//   { success: false, error: { message: string, code?: string, errors?: any[] } }
// Legacy shapes may still arrive from an un-migrated route: { message } and
// { error: "..." }. We read all three, then backfill the canonical message onto
// data.message so the ~40 page-level `data?.message || 'Gagal ...'` reads resolve
// without editing every page.

type ApiErrorBody = {
  message?: unknown;
  error?: string | { message?: string; code?: string; errors?: unknown[] };
};

/** Plain JSON body only. Blob/ArrayBuffer bodies (responseType:'blob' exports)
 *  are objects too, and writing onto them would poison the page fallback. */
const isPlainErrorBody = (d: unknown): d is ApiErrorBody =>
  typeof d === 'object' &&
  d !== null &&
  !(d instanceof Blob) &&
  !(d instanceof ArrayBuffer) &&
  !ArrayBuffer.isView(d) &&
  !Array.isArray(d);

/** SERVER-AUTHORED message only. Returns undefined when the server said nothing —
 *  never a synthesized axios string like "Request failed with status code 400". */
const readServerMessage = (d: unknown): string | undefined => {
  if (!isPlainErrorBody(d)) return undefined;
  if (typeof d.error === 'string') return d.error || undefined;
  if (d.error && typeof d.error === 'object' && typeof d.error.message === 'string') {
    return d.error.message || undefined;
  }
  if (typeof d.message === 'string') return d.message || undefined;
  return undefined;
};

const readServerCode = (d: unknown): string | undefined => {
  if (!isPlainErrorBody(d)) return undefined;
  if (d.error && typeof d.error === 'object' && typeof d.error.code === 'string') {
    return d.error.code;
  }
  return undefined;
};

// 401s whose real reason must reach the user instead of "Session expired".
// These codes are emitted by backend/src/middlewares/auth.middleware.ts.
const ACCOUNT_STATE_CODES = new Set([
  'ACCOUNT_DISABLED',
  'ACCOUNT_LOCKED',
  'EMPLOYEE_INACTIVE',
  'USER_NOT_FOUND',
]);

// Response interceptor - normalize + handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    if (!error.response && error.code !== 'ERR_CANCELED' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('peoplehub:network-error'));
    }
    // responseType:'blob' (payroll + employee Excel export) makes axios deliver
    // the JSON error body as a Blob. Re-parse it so the shapes below are visible.
    const raw = error.response?.data;
    if (error.response && (raw instanceof Blob || raw instanceof ArrayBuffer)) {
      try {
        const text = raw instanceof Blob ? await raw.text() : new TextDecoder().decode(raw);
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === 'object') error.response.data = parsed;
      } catch {
        /* genuinely binary or unparseable — leave as-is */
      }
    }

    const data = error.response?.data;
    const originalMessage = readServerMessage(data);
    const serverMessage = originalMessage ? translateError(originalMessage) : undefined;
    const serverCode = readServerCode(data);

    // Backfill ONLY a real server message. Never write error.message here: it
    // would override every page's `|| 'Gagal ...'` fallback with axios internals.
    if (serverMessage && isPlainErrorBody(data)) {
      data.message = serverMessage;
      if (data.error && typeof data.error === 'object') data.error.message = serverMessage;
      else if (typeof data.error === 'string') data.error = serverMessage;
    }

    const message = serverMessage || t(error.message || 'An error occurred');
    const requestUrl = error.config?.url || '';

    // Skip toast for auth endpoints - let the page own the message.
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password');

    // A shared toast id means the interceptor can never stack duplicates.
    // Handle 401 - Unauthorized (but not for login attempts)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Authentication lost: drop Add Employee drafts (HR PII) before redirect.
      clearEmployeeCreateDrafts();
      window.location.href = '/login';
      toast.error(
        serverCode && ACCOUNT_STATE_CODES.has(serverCode) && serverMessage
          ? serverMessage
          : t("Session expired. Please login again."),
        { id: 'api-error' }
      );
    }
    // Handle 403 - Forbidden
    else if (error.response?.status === 403 && !isAuthEndpoint) {
      toast.error(serverMessage || t('You do not have permission to perform this action.'), {
        id: 'api-error',
      });
    }
    // Handle 404 - Not Found
    else if (error.response?.status === 404 && !isAuthEndpoint) {
      toast.error(serverMessage || t('Resource not found.'), { id: 'api-error' });
    }
    // Handle 500 - Server Error
    else if (error.response?.status === 500 && !isAuthEndpoint) {
      toast.error(serverMessage || t('Server error. Please try again later.'), { id: 'api-error' });
    }
    // Handle other errors (skip for auth endpoints)
    else if (!isAuthEndpoint) {
      toast.error(message, { id: 'api-error' });
    }

    return Promise.reject(error);
  }
);

export default api;
