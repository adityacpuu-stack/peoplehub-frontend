import { syncAccountLocale } from '@/i18n';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { authService } from '@/services/auth.service';
import { clearEmployeeCreateDrafts, setEmployeeDraftOwner } from '@/lib/employee-create-draft';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  /** Re-read /auth/me (role/action changes) if the last read is older than maxAgeMs. */
  refreshUserIfStale: (maxAgeMs?: number) => Promise<void>;
}

// Shared across callers so focus/navigation/explicit refreshes never stack up.
let inflightRefresh: Promise<void> | null = null;
let lastRefreshAt = 0;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        const response = await authService.login({ email, password });
        // A new sign-in never inherits another session's Add Employee draft.
        clearEmployeeCreateDrafts();
        setEmployeeDraftOwner(response.user.id);
        syncAccountLocale(response.user.language);
        localStorage.setItem('token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
        });
        lastRefreshAt = Date.now();
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Ignore logout errors
        } finally {
          localStorage.removeItem('token');
          clearEmployeeCreateDrafts();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          clearEmployeeCreateDrafts();
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const user = await authService.me();
          // Keep only this account's draft (another account may have signed in).
          clearEmployeeCreateDrafts(user.id);
          syncAccountLocale(user.language);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          lastRefreshAt = Date.now();
        } catch {
          localStorage.removeItem('token');
          clearEmployeeCreateDrafts();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      setUser: (user: User) => {
        // Another account replacing this one keeps only its own draft and owns new writes.
        if (get().user?.id !== user.id) clearEmployeeCreateDrafts(user.id);
        syncAccountLocale(user.language);
        set({ user });
      },

      refreshUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        // One request at a time; concurrent callers share it.
        if (inflightRefresh) return inflightRefresh;
        inflightRefresh = (async () => {
          try {
            const user = await authService.me();
            // Ignore a response that belongs to a session which has since been
            // logged out or replaced (stale tab / concurrent logout).
            if (localStorage.getItem('token') !== token || !get().isAuthenticated) return;
            if (get().user?.id !== user.id) clearEmployeeCreateDrafts(user.id);
            syncAccountLocale(user.language);
            set({ user });
            lastRefreshAt = Date.now();
          } catch (error) {
            console.error('Failed to refresh user:', error);
          } finally {
            inflightRefresh = null;
          }
        })();
        return inflightRefresh;
      },

      refreshUserIfStale: async (maxAgeMs = 60_000) => {
        if (!get().isAuthenticated || Date.now() - lastRefreshAt < maxAgeMs) return;
        await get().refreshUser();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);
