import api from './api';

export interface CompanyOption { id: number; name: string; code: string }
export interface CompanySettings extends CompanyOption {
  address: string | null; phone: string | null; email: string | null; website: string | null;
}
export interface AttendanceSettings {
  company_id: number;
  work_start_time: string | null; work_end_time: string | null;
  break_start_time: string | null; break_end_time: string | null;
  check_in_tolerance_minutes: number | null;
}
export interface PayrollSettings {
  company_id: number; payroll_cutoff_date: number | null; payment_date: number | null;
  prorate_method: string | null;
}
export interface NotificationPreferences { email_leave_request: boolean; email_leave_approval: boolean }

export const companyFields = ['name', 'code', 'address', 'phone', 'email', 'website'] as const;
export const attendanceFields = ['work_start_time', 'work_end_time', 'break_start_time', 'break_end_time', 'check_in_tolerance_minutes'] as const;
export const payrollFields = ['payroll_cutoff_date', 'payment_date'] as const;
export const preferenceFields = ['email_leave_request', 'email_leave_approval'] as const;

// Company/users use envelopes; company-setting controllers return bare rows.
function unwrap<T>(body: unknown): T {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Respons pengaturan tidak valid');
  const result = 'data' in body ? body.data : body;
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Respons pengaturan tidak valid');
  return result as T;
}
function pick<T extends object>(data: Partial<T>, fields: readonly (keyof T)[]): Partial<T> {
  return Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]])) as Partial<T>;
}
function numberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || value === '') throw new Error('Nilai pengaturan tidak valid');
  return number;
}
function timeOrNull(value: unknown): string | null {
  if (value == null) return null;
  // PostgreSQL TIME is a wall-clock value, not an instant to localize.
  const match = String(value).match(/^(?:\d{4}-\d{2}-\d{2}T)?([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?Z?)?$/);
  if (!match) throw new Error('Jam pengaturan tidak valid');
  return `${match[1]}:${match[2]}`;
}
function company(body: unknown): CompanySettings {
  const row = unwrap<CompanySettings>(body);
  if (!Number.isInteger(row.id) || typeof row.name !== 'string' || typeof row.code !== 'string') throw new Error('Data perusahaan tidak valid');
  return { id: row.id, name: row.name, code: row.code, address: row.address ?? null, phone: row.phone ?? null, email: row.email ?? null, website: row.website ?? null };
}
function attendance(body: unknown): AttendanceSettings {
  const row = unwrap<AttendanceSettings>(body);
  if (!Number.isInteger(row.company_id)) throw new Error('Data kehadiran tidak valid');
  return { company_id: row.company_id, work_start_time: timeOrNull(row.work_start_time), work_end_time: timeOrNull(row.work_end_time), break_start_time: timeOrNull(row.break_start_time), break_end_time: timeOrNull(row.break_end_time), check_in_tolerance_minutes: numberOrNull(row.check_in_tolerance_minutes) };
}
function payroll(body: unknown): PayrollSettings {
  const row = unwrap<PayrollSettings>(body);
  if (!Number.isInteger(row.company_id)) throw new Error('Data payroll tidak valid');
  return { company_id: row.company_id, payroll_cutoff_date: numberOrNull(row.payroll_cutoff_date), payment_date: numberOrNull(row.payment_date), prorate_method: row.prorate_method ?? null };
}
function preferences(body: unknown): NotificationPreferences {
  const row = unwrap<NotificationPreferences>(body);
  if (preferenceFields.some(key => typeof row[key] !== 'boolean')) throw new Error('Preferensi notifikasi tidak valid');
  return { email_leave_request: row.email_leave_request, email_leave_approval: row.email_leave_approval };
}
async function readOptional<T>(url: string, normalize: (body: unknown) => T): Promise<T | null> {
  const response = await api.get(url, { validateStatus: status => (status >= 200 && status < 300) || status === 404 });
  return response.status === 404 ? null : normalize(response.data);
}

export const settingsService = {
  async getCompanies(allowedIds: number[] | null): Promise<CompanyOption[]> {
    if (allowedIds?.length === 0) return [];
    const result: CompanyOption[] = [];
    let page = 1;
    while (true) {
      const { data } = await api.get('/companies', { params: { page, limit: 100 } });
      if (!Array.isArray(data.data)) throw new Error('Daftar perusahaan tidak valid');
      result.push(...data.data.filter((row: CompanyOption) => allowedIds === null || allowedIds.includes(row.id)));
      const pages = data.pagination?.totalPages ?? data.meta?.totalPages;
      if (pages != null ? page >= pages : data.data.length < 100) break;
      page += 1;
    }
    return [...new Map(result.map(row => [row.id, { id: row.id, name: row.name, code: row.code }])).values()];
  },
  async getCompanySettings(id: number) { return company((await api.get(`/companies/${id}`)).data); },
  async updateCompanySettings(id: number, data: Partial<CompanySettings>) {
    return company((await api.put(`/companies/${id}`, pick(data, companyFields))).data);
  },
  getAttendanceSettings: (id: number) => readOptional(`/attendance-settings/company/${id}`, attendance),
  async createAttendanceSettings(id: number) { return attendance((await api.post('/attendance-settings', { company_id: id })).data); },
  async updateAttendanceSettings(id: number, data: Partial<AttendanceSettings>) {
    return attendance((await api.patch(`/attendance-settings/company/${id}`, pick(data, attendanceFields))).data);
  },
  getPayrollSettings: (id: number) => readOptional(`/payroll-settings/company/${id}`, payroll),
  async createPayrollSettings(id: number) { return payroll((await api.post('/payroll-settings', { company_id: id })).data); },
  async updatePayrollSettings(id: number, data: Partial<PayrollSettings>) {
    return payroll((await api.patch(`/payroll-settings/company/${id}`, pick(data, payrollFields))).data);
  },
  async getNotificationPreferences() { return preferences((await api.get('/users/me/preferences')).data); },
  async updateNotificationPreferences(data: Partial<NotificationPreferences>) {
    return preferences((await api.put('/users/me/preferences', pick(data, preferenceFields))).data);
  },
};
