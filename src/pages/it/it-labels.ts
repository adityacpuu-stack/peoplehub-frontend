import { t } from '@/i18n';
import type { ItAccountRow } from '@/services/it-account.service';

// Server codes -> application copy (translated at render time; codes are never shown raw).
// "Account" wording on purpose: without a license a Microsoft 365 account has no working mailbox.
const STATUS: Record<string, string> = {
  none: 'Not created here', creating: 'Being created', completed: 'Account created', needs_attention: 'Needs attention', failed: 'Last attempt failed',
};
const REASONS: Record<string, string> = {
  has_work_email: 'Already has a work email',
  protected_account: 'Restricted account: ask a Super Admin',
  own_record: 'Your own record: ask another administrator',
  account_inactive: 'PeopleHub account inactive',
  no_personal_email: 'No personal email for delivery',
  internal_personal_email: 'Personal email must be outside company domains',
  domain_not_configured: 'Company email domain not configured',
  in_progress: 'Being created',
  needs_attention: 'Needs a Microsoft 365 administrator',
  completed: 'Account created',
};
const FAILURES: Record<string, string> = {
  address_taken: 'The address was already in use.',
  provider_unavailable: 'Microsoft 365 could not be reached.',
  create_rejected: 'Microsoft 365 rejected the account.',
  create_unconfirmed: 'Microsoft 365 did not confirm whether the account was created.',
  license_failed: 'The license was not assigned.',
  groups_failed: 'The configured company group was not confirmed.',
  delivery_failed: 'The sign-in email could not be handed to the email service.',
  employee_changed: 'The employee record changed during creation, so no sign-in email was sent.',
  work_email_changed: 'A work email was recorded by someone else meanwhile.',
  interrupted: 'The request was interrupted.',
  unexpected_error: 'The request was interrupted.',
};
const ERRORS: Record<string, string> = {
  M365_NOT_CONFIGURED: 'Microsoft 365 is not configured. No account was created.',
  EMAIL_NOT_CONFIGURED: 'Email delivery is not configured. No account was created.',
  IT_ADDRESS_TAKEN: 'This address is already in use. Choose another username.',
  IT_IN_PROGRESS: 'An account for this employee is already being created or was created.',
  IT_EMPLOYEE_CHANGED: 'The employee record changed. Reload and try again.',
  IT_HAS_WORK_EMAIL: 'This employee already has a work email.',
  IT_PROTECTED_ACCOUNT: 'This account is restricted. Ask a Super Admin.',
  IT_OWN_RECORD: 'You cannot create an account for your own record.',
  IT_ACCOUNT_INACTIVE: 'The employee\'s PeopleHub account is inactive.',
  IT_NO_PERSONAL_EMAIL: 'The employee has no personal email for delivery.',
  IT_INTERNAL_PERSONAL_EMAIL: 'The personal email must be outside company domains.',
  IT_DOMAIN_NOT_CONFIGURED: 'The company email domain is not configured.',
  IT_NOT_ACTIVE: 'Only active employees can receive an account.',
  IT_LICENSE_UNKNOWN: 'The selected license is not available.',
  IT_LICENSE_EXHAUSTED: 'No units of the selected license are available.',
  IT_PROVIDER_UNAVAILABLE: 'Microsoft 365 could not be reached. Nothing was created; try again later.',
  IT_CREATE_REJECTED: 'Microsoft 365 rejected the account. Nothing was created.',
  IT_PROVISION_INTERRUPTED: 'The request was interrupted. Ask a Microsoft 365 administrator to check the account.',
  VALIDATION_ERROR: 'Check the username.',
  NOT_FOUND: 'Employee not found in your assigned companies.',
  FORBIDDEN: 'You do not have access to this action.',
};
const NOTES = { unlicensed: 'No license: email not active yet' };

export const statusLabel = (status: string) => t(STATUS[status] ?? 'Unknown status');
export const reasonLabel = (reason: string | null) => reason ? t(REASONS[reason] ?? 'Not eligible') : '';
export const failureLabel = (code: string | null) => code ? t(FAILURES[code] ?? 'Unknown problem.') : '';
export const errorMessage = (code?: string, _message?: string) => t(code && ERRORS[code] ? ERRORS[code] : 'The account could not be created. Try again.');
/** Follow-up for a created account without a license (the email address is not a working mailbox yet). */
export const mailboxNote = (mailbox: ItAccountRow['mailbox']) =>
  mailbox.status === 'completed' && !(mailbox.license_requested && mailbox.license_assigned) ? t(NOTES.unlicensed) : '';
export const IT_LABEL_SOURCES = [...Object.values(STATUS), ...Object.values(REASONS), ...Object.values(FAILURES), ...Object.values(ERRORS),
  ...Object.values(NOTES), 'Unknown status', 'Not eligible', 'Unknown problem.', 'The account could not be created. Try again.'];
