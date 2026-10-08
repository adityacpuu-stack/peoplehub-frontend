import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { FullPageSpinner } from '@/components/ui';
import { canAnyAction, type ActionKey } from '@/lib/actions';

interface RoleRouteProps {
  children: React.ReactNode;
  /**
   * If provided, user must have at least one of these roles to enter.
   * Super Admin always bypasses (sees everything).
   */
  allowedRoles?: string[];
  /**
   * If provided, user must ALSO be allowed at least one of these covered
   * actions (server-resolved `effectiveActions`). This narrows the role check;
   * stored permission names or roles never override an action denial.
   */
  actions?: readonly ActionKey[];
  /** Self-service exemption (e.g. the user's own employee record): skips role and action checks. */
  allowWhen?: boolean;
}

/**
 * Role/action route guard. Use INSIDE a `ProtectedRoute`.
 *
 * Defense in depth — backend authorization is still the source of truth, but
 * this prevents a user navigating to a URL whose API calls would be refused.
 */
export function RoleRoute({ children, allowedRoles, actions, allowWhen }: RoleRouteProps) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.roles?.includes('Super Admin') || allowWhen === true) {
    return <>{children}</>;
  }

  const userRoles = user.roles ?? [];
  const roleOk = !allowedRoles || allowedRoles.some((r) => userRoles.includes(r));
  const actionOk = !actions || canAnyAction(user, actions);

  if (roleOk && actionOk) {
    return <>{children}</>;
  }

  return <Navigate to="/403" state={{ from: location }} replace />;
}
