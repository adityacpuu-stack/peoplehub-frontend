import type { User } from '@/types';
import { canAction, type ActionKey } from '@/lib/actions';

export type SettingsTab = 'general' | 'attendance' | 'payroll' | 'notifications' | 'security';

// Exact role lists: any additional role may independently grant a capability.
// Covered actions then narrow the role result, mapped to the exact endpoints:
// general save -> PUT /companies/:id (company.update); payroll read ->
// GET /payroll-settings/company/:id (payroll.view); payroll save/initialise ->
// POST /payroll-settings and PATCH .../company/:id (payroll.settings).
// Attendance settings, notifications and security are not covered by actions.
export function settingsAccess(roles: string[], user?: User | null) {
  const has = (...allowed: string[]) => roles.includes('Super Admin') || allowed.some(role => roles.includes(role));
  // Without a user (older callers) the role lists alone apply, as before.
  const can = (key: ActionKey) => user === undefined || canAction(user, key);
  const payrollView = has('Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'HR Staff') && can('payroll.view');
  return {
    general: { view: has('Group CEO', 'CEO', 'HR Manager'), edit: has('Group CEO', 'HR Manager') && can('company.update') },
    attendance: { view: has('Group CEO', 'CEO', 'HR Manager', 'HR Staff'), edit: has('HR Manager') },
    payroll: { view: payrollView, edit: payrollView && has('HR Manager', 'Finance Manager') && can('payroll.settings') },
    notifications: { view: true, edit: true },
    security: { view: true, edit: true },
  };
}
