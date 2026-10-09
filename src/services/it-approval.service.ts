import api from './api';

/** Fixed DTO from GET /it/approval-settings: identity, organisation and leave-routing only. */
export type RelationView =
  | { state: 'none' }
  | { state: 'out_of_scope' }
  | { state: 'assigned' | 'unavailable'; id: number; name: string; employee_id: string | null };
export interface ApprovalRow {
  id: number;
  employee_id: string | null;
  name: string;
  company: { id: number; name: string };
  department: string | null;
  title: string | null;
  updated_at: string;
  manager: RelationView;
  direct_manager: RelationView;
  leave_approver: RelationView;
  effective_route: 'leave_approver' | 'managers' | 'hr_fallback';
  editable: boolean;
}
export interface ApprovalCandidate { id: number; employee_id: string | null; name: string; company: { id: number; name: string }; department: string | null; title: string | null; capability: 'manager' | 'direct_reports_only' | null }
export type RoutingField = 'manager_id' | 'direct_manager_id' | 'leave_approver_id';
type Page<T> = { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

export const itApprovalService = {
  list: async (params: { page: number; limit: number; company_id?: number; search?: string }): Promise<Page<ApprovalRow>> => {
    const query: Record<string, string | number> = { page: params.page, limit: params.limit };
    if (params.company_id) query.company_id = params.company_id;
    if (params.search?.trim()) query.search = params.search.trim();
    const response = await api.get('/it/approval-settings', { params: query });
    return { data: response.data.data, pagination: response.data.meta };
  },
  candidates: async (targetEmployeeId: number, search: string, page = 1): Promise<Page<ApprovalCandidate>> => {
    const query: Record<string, string | number> = { target_employee_id: targetEmployeeId, page, limit: 20 };
    if (search.trim()) query.search = search.trim();
    const response = await api.get('/it/approval-settings/candidates', { params: query });
    return { data: response.data.data, pagination: response.data.meta };
  },
  /** Only changed routing fields plus the version are sent; nothing else is accepted by the API. */
  update: async (employeeId: number, expectedUpdatedAt: string, changes: Partial<Record<RoutingField, number | null>>): Promise<ApprovalRow> =>
    (await api.patch(`/it/approval-settings/${employeeId}`, { expected_updated_at: expectedUpdatedAt, ...changes })).data.data,
};
