import type { User } from '@/types';

/**
 * Covered action keys enforced by the backend (backend/src/utils/action-policy.ts).
 * The server is the authority; these checks only keep the UI from offering
 * actions the API will refuse.
 */
export const ACTION_KEYS = [
  'employee.view', 'employee.create', 'employee.update', 'employee.delete', 'employee.export',
  'employee.view_salary', 'employee.update_salary',
  'leave.view_all', 'leave.administer', 'leave.manage_type', 'leave.override_approve',
  'payroll.view', 'payroll.export', 'payroll.generate', 'payroll.update', 'payroll.submit',
  'payroll.approve', 'payroll.pay', 'payroll.settings',
  'company.create', 'company.update', 'company.settings',
  'department.create', 'department.update', 'department.delete',
  'position.create', 'position.update', 'position.delete',
  'work_location.create', 'work_location.update', 'work_location.delete',
  'holiday.create', 'holiday.update', 'holiday.delete',
] as const;
export type ActionKey = (typeof ACTION_KEYS)[number];

/**
 * Whether the signed-in user may perform a covered action.
 *
 * - Super Admin: always (name-based, as on the server).
 * - `effectiveActions` present (current servers): exact membership; an empty
 *   array denies every covered action. Roles or stored permission names never
 *   override a denial.
 * - `effectiveActions` undefined (older server/fixtures): legacy compatibility —
 *   returns true so the caller's existing role eligibility stays the only gate.
 * - Any other present value (null, non-array, non-string entries) is malformed
 *   and denies (fail closed).
 *
 * Always combine with the existing role eligibility for that control; this
 * narrows, it never widens.
 */
export function canAction(user: User | null | undefined, key: ActionKey): boolean {
  if (!user) return false;
  if (user.roles?.includes('Super Admin')) return true;
  const actions: unknown = user.effectiveActions;
  if (actions === undefined) return true;
  if (!Array.isArray(actions) || actions.some(item => typeof item !== 'string')) return false;
  return actions.includes(key);
}

export const canAnyAction = (user: User | null | undefined, keys: readonly ActionKey[]) =>
  keys.some(key => canAction(user, key));

/**
 * Route destinations whose page is an operational read covered by an action.
 * Shared lookup pages (companies, departments, positions, work locations,
 * holidays, leave types) stay reachable because their reads are deliberately
 * not covered by the backend; only their mutations are gated in-page.
 */
export function routeActions(pathname: string): ActionKey[] | null {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/employees') return ['employee.view'];
  if (path === '/employees/create') return ['employee.create'];
  if (/^\/employees\/[^/]+\/edit$/.test(path)) return ['employee.update'];
  if (/^\/employees\/[^/]+$/.test(path)) return ['employee.view'];
  if (path === '/leave' || path === '/leave/analytics' || path === '/leave/entitlements') return ['leave.view_all'];
  if (path === '/leave/policy') return ['leave.view_all', 'leave.manage_type'];
  // /payroll-settings (tax tables) is not covered by the backend action gates.
  if (path === '/payroll' || path === '/payroll/freelance' || path === '/ceo/payroll-report' || path === '/ceo/financial-overview') return ['payroll.view'];
  return null;
}

// Existing server salary eligibility (employee.service getById) — the ceiling for
// employee.view_salary. Finance Manager is deliberately not included.
const SALARY_VIEW_ROLES = ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Tax Manager', 'Tax Staff'];
// Existing employee administration roles (HR Staff+ guards) — ceiling for salary edits.
export const EMPLOYEE_ADMIN_ROLES = ['Super Admin', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'];

// Existing route ceilings (backend role guards), used together with actions so a
// present-but-legacy or missing effectiveActions never widens page access.
/** GET /employees, /leaves list: requireManagerOrHigher. */
export const MANAGER_UP_ROLES = ['Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff', 'Tax Staff', 'Manager'];
/** POST /employees and other HR Staff+ routes. */
export const HR_STAFF_UP_ROLES = ['Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'];
/** GET /payroll list/detail/export: requireHRStaffOrTaxAccess. */
export const PAYROLL_READ_ROLES = [...HR_STAFF_UP_ROLES, 'Tax Staff'];
/** GET /employees/:id: requireSelfEmployeeOrRole(...) — Finance/Tax alone cannot open another record. */
export const EMPLOYEE_DETAIL_ROLES = ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager'];
/** The edit form loads GET /employees/:id and saves PUT (HR Staff+); Group CEO stays read-only in the UI (existing). */
export const EMPLOYEE_EDIT_ROLES = ['Super Admin', 'CEO', 'HR Manager', 'HR Staff'];

const hasRole = (user: User | null | undefined, roles: readonly string[]) => (user?.roles ?? []).some(role => roles.includes(role));

/** Another employee's detail: detail route ceiling AND employee.view. Own record is always self-service. */
export function canOpenEmployee(user: User | null | undefined, employeeId?: number | null): boolean {
  if (!user) return false;
  if (employeeId != null && user.employee?.id === employeeId) return true;
  return hasRole(user, EMPLOYEE_DETAIL_ROLES) && canAction(user, 'employee.view');
}

/** Edit form entry: it needs both the detail read and the update. */
export function canEditEmployee(user: User | null | undefined): boolean {
  return hasRole(user, EMPLOYEE_EDIT_ROLES) && canAction(user, 'employee.view') && canAction(user, 'employee.update');
}

/** Own compensation always; others need salary eligibility AND employee.view_salary. */
export function canViewCompensation(user: User | null | undefined, employeeId?: number | null): boolean {
  if (!user) return false;
  if (employeeId != null && user.employee?.id === employeeId) return true;
  return (user.roles ?? []).some(role => SALARY_VIEW_ROLES.includes(role)) && canAction(user, 'employee.view_salary');
}

/** Compensation inputs on create/edit: employee administration role AND employee.update_salary. */
export function canEditCompensation(user: User | null | undefined): boolean {
  if (!user) return false;
  return (user.roles ?? []).some(role => EMPLOYEE_ADMIN_ROLES.includes(role)) && canAction(user, 'employee.update_salary');
}

/** Navigation/search filter: true unless the path needs actions the user lacks. */
export function canOpenPath(user: User | null | undefined, path: string): boolean {
  const required = routeActions(path);
  return !required || canAnyAction(user, required);
}
