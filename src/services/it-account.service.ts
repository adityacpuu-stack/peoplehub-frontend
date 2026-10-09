import api from './api';

/** Fixed DTO from GET /it/accounts: no salary, identity, bank, role or raw employee fields. */
export type MailboxStatus = 'none' | 'creating' | 'completed' | 'needs_attention' | 'failed';
export interface ItAccountRow {
  id: number;
  employee_id: string | null;
  name: string;
  company: { id: number; name: string };
  work_email: string | null;
  personal_email_hint: string | null;
  domain: string | null;
  mailbox: { status: MailboxStatus; email: string | null; failure_code: string | null; license_requested: boolean; license_assigned: boolean; groups_added: boolean; credential_sent: boolean; updated_at: string | null };
  can_provision: boolean;
  ineligible_reason: string | null;
}
export interface ItSummary { companies: number; without_mailbox: number; provisioned: number; needs_attention: number; m365_configured: boolean }
export interface ItCompany { id: number; name: string; domain: string | null }
export interface ItLicense { sku_id: string; name: string; available: number }
export interface ItListParams { page: number; limit: number; company_id?: number; search?: string; status: 'all' | 'no_mailbox' | 'needs_attention' | 'provisioned' }
/** license_requested=false: a Microsoft 365 account without a license (no working mailbox yet). */
export interface ProvisionResult { employee_id: number; email: string; status: MailboxStatus; failure_code: string | null; license_requested: boolean; license_assigned: boolean; groups_added: boolean; credential_sent: boolean }

export const itAccountService = {
  summary: async (): Promise<ItSummary> => (await api.get('/it/summary')).data.data,
  companies: async (): Promise<ItCompany[]> => (await api.get('/it/companies')).data.data,
  licenses: async (): Promise<ItLicense[]> => (await api.get('/it/licenses')).data.data,
  list: async (params: ItListParams): Promise<{ data: ItAccountRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const query: Record<string, string | number> = { page: params.page, limit: params.limit, status: params.status };
    if (params.company_id) query.company_id = params.company_id;
    if (params.search?.trim()) query.search = params.search.trim();
    const response = await api.get('/it/accounts', { params: query });
    return { data: response.data.data, pagination: response.data.meta };
  },
  /** Only these three fields are ever sent: the domain, recipient and password are decided by the server. */
  provision: async (body: { employee_id: number; username: string; license_sku_id?: string }): Promise<ProvisionResult> =>
    (await api.post('/it/accounts/mailbox', body)).data.data,
};
