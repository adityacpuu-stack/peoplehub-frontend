import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { FullPageSpinner } from '@/components/ui';

interface RoleRouteProps {
  children: React.ReactNode;
  /**
   * If provided, user must have at least one of these roles to enter.
   * Super Admin always bypasses (sees everything).
   */
  allowedRoles?: string[];
  /**
   * If provided, user must have at least one of these permissions (dot-notation,
   * e.g., 'payroll.view'). Either roles OR permissions matching allows access.
   */
  allowedPermissions?: string[];
}

/**
 * Role-based route guard. Use INSIDE a `ProtectedRoute` to add role gating.
 *
 * Defense in depth — backend RBAC is still the source of truth, but this
 * prevents accidental UI exposure where a low-privilege user navigates to
 * a privileged URL and sees the page render (even if the API calls 403).
 *
 * Super Admin always bypasses both checks.
 */
export function RoleRoute({ children, allowedRoles, allowedPermissions }: RoleRouteProps) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin always passes
  if (user.roles?.includes('Super Admin')) {
    return <>{children}</>;
  }

  const userRoles = user.roles ?? [];
  const userPermissions = user.permissions ?? [];

  const roleMatch = allowedRoles
    ? allowedRoles.some((r) => userRoles.includes(r))
    : false;
  const permissionMatch = allowedPermissions
    ? allowedPermissions.some((p) => userPermissions.includes(p))
    : false;

  // Neither check provided = open
  if (!allowedRoles && !allowedPermissions) {
    return <>{children}</>;
  }

  if (roleMatch || permissionMatch) {
    return <>{children}</>;
  }

  return <Navigate to="/403" state={{ from: location }} replace />;
}
