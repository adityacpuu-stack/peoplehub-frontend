/**
 * Refresh-safe Add Employee draft.
 *
 * sessionStorage only (this tab), one record per authenticated user, version
 * and 24-hour expiry. Stores raw, possibly incomplete form text exactly as typed
 * (leading zeros kept), restricted to an explicit allowlist of form keys and to
 * primitive values. Never stores tokens, passwords or files; the generated
 * employee ID is never kept (it is regenerated). Every storage access is
 * guarded: unavailable storage or a corrupt record is treated as "no draft".
 *
 * Plain module (no store/API imports) so auth.store and api.ts can clear drafts
 * without import cycles. Only keys with this module's prefix are ever touched.
 */

export const EMPLOYEE_DRAFT_PREFIX = 'peoplehub.employee-create-draft.v1.';
export const EMPLOYEE_DRAFT_VERSION = 1;
export const EMPLOYEE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 5000;

/** Form keys a draft may hold (EmployeeFormInput fields; no employee_id). */
export const EMPLOYEE_DRAFT_KEYS = [
  'has_office_email', 'name', 'nick_name', 'national_id', 'family_card_number', 'npwp_number', 'passport_number',
  'passport_expiry', 'date_of_birth', 'place_of_birth', 'gender', 'marital_status', 'religion', 'nationality',
  'email', 'personal_email', 'phone', 'mobile_number', 'address', 'city', 'province', 'postal_code',
  'current_address', 'current_city', 'current_province', 'current_postal_code', 'emergency_contact_name',
  'emergency_contact_phone', 'emergency_contact_relationship', 'emergency_contact_address', 'job_title',
  'company_id', 'department_id', 'position_id', 'work_location_id', 'manager_id', 'leave_approver_id',
  'overtime_approver_id', 'employment_type', 'employment_status', 'work_schedule', 'join_date', 'hire_date',
  'probation_start_date', 'probation_end_date', 'contract_start_date', 'contract_end_date', 'basic_salary',
  'salary_currency', 'pay_frequency', 'pay_type', 'salary_status', 'transport_allowance', 'meal_allowance',
  'position_allowance', 'ptkp_status', 'bpjs_ketenagakerjaan_number', 'bpjs_kesehatan_number', 'jht_registered',
  'jp_registered', 'medical_insurance', 'life_insurance', 'bank_name', 'bank_account_number', 'bank_account_holder',
] as const;
export type EmployeeDraftKey = (typeof EMPLOYEE_DRAFT_KEYS)[number];
export type EmployeeDraftValue = string | number | boolean | null;
export type EmployeeDraftValues = Partial<Record<EmployeeDraftKey, EmployeeDraftValue>>;

export interface EmployeeCreateDraft {
  version: typeof EMPLOYEE_DRAFT_VERSION;
  user_id: number;
  saved_at: number;
  expires_at: number;
  step: number;
  values: EmployeeDraftValues;
}

const keyFor = (userId: number) => `${EMPLOYEE_DRAFT_PREFIX}${userId}`;

/**
 * The account currently authenticated in this tab, set by auth.store (login,
 * checkAuth, refreshUser, setUser) and cleared on sign-out/authentication loss.
 * A write is accepted only for this owner and while a session token exists, so
 * a form still mounted for account A (or a late programmatic change after a
 * 401) can never save under account B or after the session ended.
 */
let draftOwner: number | null = null;

export function setEmployeeDraftOwner(userId: number | null): void {
  draftOwner = userId;
}

export function isEmployeeDraftOwner(userId: number): boolean {
  if (draftOwner !== userId) return false;
  try {
    return !!window.localStorage.getItem('token');
  } catch {
    return false;
  }
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Allowlisted keys with primitive values only; anything else is dropped. */
export function sanitizeDraftValues(raw: unknown): EmployeeDraftValues {
  const out: EmployeeDraftValues = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const key of EMPLOYEE_DRAFT_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === null || typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string' && value.length <= MAX_TEXT) out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

export function readEmployeeCreateDraft(userId: number, now = Date.now()): EmployeeCreateDraft | null {
  if (!isEmployeeDraftOwner(userId)) return null;
  const store = storage();
  if (!store) return null;
  let text: string | null;
  try { text = store.getItem(keyFor(userId)); } catch { return null; }
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Partial<EmployeeCreateDraft>;
    if (parsed?.version !== EMPLOYEE_DRAFT_VERSION || parsed.user_id !== userId
      || typeof parsed.saved_at !== 'number' || typeof parsed.expires_at !== 'number' || parsed.expires_at <= now
      || typeof parsed.step !== 'number') {
      removeEmployeeCreateDraft(userId);
      return null;
    }
    return {
      version: EMPLOYEE_DRAFT_VERSION, user_id: userId, saved_at: parsed.saved_at, expires_at: parsed.expires_at,
      step: Math.min(5, Math.max(1, Math.trunc(parsed.step))), values: sanitizeDraftValues(parsed.values),
    };
  } catch {
    removeEmployeeCreateDraft(userId);
    return null;
  }
}

/** Synchronous write. Returns false when storage is unavailable or full. */
export function writeEmployeeCreateDraft(userId: number, values: unknown, step: number, now = Date.now()): boolean | 'not_owner' {
  // Not the authenticated account (or no session): refuse silently, never save.
  if (!isEmployeeDraftOwner(userId)) return 'not_owner';
  const store = storage();
  if (!store) return false;
  const record: EmployeeCreateDraft = {
    version: EMPLOYEE_DRAFT_VERSION, user_id: userId, saved_at: now, expires_at: now + EMPLOYEE_DRAFT_TTL_MS,
    step, values: sanitizeDraftValues(values),
  };
  try {
    store.setItem(keyFor(userId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function removeEmployeeCreateDraft(userId: number): void {
  try { storage()?.removeItem(keyFor(userId)); } catch { /* storage unavailable */ }
}

/**
 * Remove Add Employee drafts (this module's prefix only) on logout, account
 * change or authentication loss. `keepUserId` keeps the current account's
 * draft and makes it the draft owner; without it no account may write.
 */
export function clearEmployeeCreateDrafts(keepUserId?: number): void {
  // Session ended (no account kept): no account may write until auth sets one.
  draftOwner = keepUserId ?? null;
  const store = storage();
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < store.length; index++) {
      const key = store.key(index);
      if (key?.startsWith(EMPLOYEE_DRAFT_PREFIX) && (keepUserId === undefined || key !== keyFor(keepUserId))) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch { /* storage unavailable */ }
}
