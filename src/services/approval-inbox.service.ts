import { leaveService } from './leave.service';
import { overtimeService, type Overtime } from './overtime.service';
import type { LeaveRequest } from '@/types';

/** Shared presentation model. Each source keeps its existing server-side scope. */
export interface ApprovalRequest {
  id: number;
  key: string;
  kind: 'leave' | 'overtime';
  label: string;
  amount: number | string | null;
  unit: 'leave days' | 'hours';
  start_date: string;
  end_date: string;
  status: LeaveRequest['status'];
  employee?: { name: string; employee_id: string; department?: { name: string } | null } | null;
  approver?: { name: string } | null;
  reason?: string | null;
  rejection_reason?: string | null;
  work_handover?: string | null;
  created_at: string;
  updated_at?: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  can_approve: boolean;
}

export const hasExecutiveApprovals = (roles: string[] = []) => roles.includes('CEO') || roles.includes('Group CEO');
export const canDecideApproval = (row: ApprovalRequest) => row.status === 'pending' && row.can_approve;

const fromLeave = (row: LeaveRequest): ApprovalRequest => ({
  ...row, key: `leave-${row.id}`, kind: 'leave', label: row.leaveType?.name || 'Leave',
  amount: row.total_days ?? null, unit: 'leave days', can_approve: row.can_approve === true,
});
const fromOvertime = (row: Overtime): ApprovalRequest => ({
  ...row, key: `overtime-${row.id}`, kind: 'overtime', label: 'Overtime',
  start_date: row.date, end_date: row.date, amount: row.hours, unit: 'hours',
  // Existing executive overtime endpoint supplies the pending review queue;
  // the mutation endpoint remains the final authorization boundary.
  can_approve: row.status === 'pending', work_handover: row.task_description,
});

export async function getApprovalInbox(executive: boolean): Promise<ApprovalRequest[]> {
  const [leaves, overtimes] = await Promise.all([
    executive ? leaveService.getPendingApprovals() : leaveService.getMyApprovals(),
    executive ? overtimeService.getPendingApprovals() : Promise.resolve([]),
  ]);
  return [...leaves.map(fromLeave), ...overtimes.map(fromOvertime)]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function decideApproval(row: ApprovalRequest, action: 'approve' | 'reject', comment: string) {
  if (!canDecideApproval(row)) throw new Error('This request is not available for your approval.');
  if (row.kind === 'leave') {
    if (action === 'approve') await leaveService.approve(row.id, comment.trim() || undefined);
    else await leaveService.reject(row.id, comment.trim());
  } else {
    if (action === 'approve') await overtimeService.approve(row.id);
    else await overtimeService.reject(row.id, { rejection_reason: comment.trim() });
  }
}
