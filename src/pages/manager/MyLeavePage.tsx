import { quantity } from '@/components/leave/presentation';
import { t, useLocale, intlLocale } from '@/i18n';
import { LeaveBalanceDialog } from '@/components/leave/LeaveBalanceDialog';
import { getAvailableDays } from '@/components/leave/leave-balance';
import '@/pages/personal/personal-workspace.css';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { Calendar, Info, Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, Palmtree, Stethoscope, Baby, Heart, GraduationCap, CalendarDays, ChevronLeft, ChevronRight, Loader2, Briefcase } from 'lucide-react';
import { cn , toNum } from '@/lib/utils';
import { leaveService } from '@/services/leave.service';
import { employeeService } from '@/services/employee.service';
import type { LeaveRequest, LeaveBalance, LeaveType, Employee } from '@/types';
import toast from 'react-hot-toast';

export function MyLeavePage() {
  useLocale();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myProfile, setMyProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    leave_type_id: 0,
    start_date: '',
    end_date: '',
    reason: '',
    work_handover: '',
    contact_during_leave: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [leavesRes, balances, types, profile] = await Promise.all([
        leaveService.getMyLeaves({ page: currentPage, limit: 10 }),
        leaveService.getMyBalance(),
        leaveService.getMyTypes(),
        employeeService.getMyProfile(),
      ]);

      setLeaveRequests(leavesRes.data);
      setTotalPages(leavesRes.pagination.totalPages);
      setTotalItems(leavesRes.pagination.total);
      setLeaveBalances(balances);
      setLeaveTypes(types);
      setMyProfile(profile);

      // Set default leave type
      if (types.length > 0) {
        setFormData((prev) => prev.leave_type_id === 0 ? ({ ...prev, leave_type_id: types[0].id }) : prev);
      }
    } catch (error) {
      setLoadError(true);
      console.error('Failed to fetch data:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t("Gagal memuat data cuti"), { id: 'api-error' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const getLeaveTypeConfig = (leaveType?: LeaveType | null) => {
    const code = leaveType?.code?.toLowerCase() || '';
    const name = leaveType?.name?.toLowerCase() || '';

    if (code === 'annual' || name.includes('annual') || name.includes('tahunan')) {
      return { label: leaveType?.name || t("Annual Leave"), icon: Palmtree, color: 'bg-green-100 text-green-700' };
    }
    if (code === 'sick' || name.includes('sick') || name.includes('sakit')) {
      return { label: leaveType?.name || t("Sick Leave"), icon: Stethoscope, color: 'bg-red-100 text-red-700' };
    }
    if (code === 'maternity' || name.includes('maternity') || name.includes('melahirkan')) {
      return { label: leaveType?.name || t("Maternity"), icon: Baby, color: 'bg-pink-100 text-pink-700' };
    }
    if (code === 'paternity' || name.includes('paternity')) {
      return { label: leaveType?.name || t("Paternity"), icon: Baby, color: 'bg-blue-100 text-blue-700' };
    }
    if (code === 'marriage' || name.includes('marriage') || name.includes('nikah')) {
      return { label: leaveType?.name || t("Marriage"), icon: Heart, color: 'bg-rose-100 text-rose-700' };
    }
    if (code === 'bereavement' || name.includes('bereavement') || name.includes('duka')) {
      return { label: leaveType?.name || t("Bereavement"), icon: Heart, color: 'bg-gray-100 text-gray-700' };
    }
    if (code === 'unpaid' || name.includes('unpaid') || name.includes('tanpa gaji')) {
      return { label: leaveType?.name || t("Unpaid Leave"), icon: Briefcase, color: 'bg-amber-100 text-amber-700' };
    }
    if (code === 'study' || name.includes('study') || name.includes('belajar')) {
      return { label: leaveType?.name || t("Study Leave"), icon: GraduationCap, color: 'bg-purple-100 text-purple-700' };
    }

    return { label: leaveType?.name || t("Leave"), icon: Calendar, color: 'bg-gray-100 text-gray-700' };
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: t("Pending"), icon: Clock, color: 'bg-amber-100 text-amber-700' };
      case 'approved':
        return { label: t("Approved"), icon: CheckCircle, color: 'bg-green-100 text-green-700' };
      case 'rejected':
        return { label: t("Rejected"), icon: XCircle, color: 'bg-red-100 text-red-700' };
      case 'cancelled':
        return { label: t("Cancelled"), icon: XCircle, color: 'bg-gray-100 text-gray-600' };
      default:
        return { label: status, icon: AlertCircle, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const filteredRequests = leaveRequests.filter((request) => {
    // reason is optional on the API. Matching straight through it meant an empty
    // search box evaluated `undefined?.includes(...)` -> undefined -> falsy, so every
    // reason-less request disappeared from the list — including the one just filed,
    // which is the only place its Cancel button lives.
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === '' || (request.reason ?? '').toLowerCase().includes(query);
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesYear = filterYear === 'all' || request.start_date.slice(0, 4) === filterYear;
    return matchesSearch && matchesStatus && matchesYear;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leave_type_id) {
      toast.error(t("Pilih jenis cuti"));
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error(t("Tanggal mulai dan berakhir harus diisi"));
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await leaveService.create({
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || undefined,
        work_handover: formData.work_handover || undefined,
        contact_during_leave: formData.contact_during_leave || undefined,
      });

      toast.success(t("Pengajuan cuti berhasil dikirim"));
      setShowRequestModal(false);
      setFormData({
        leave_type_id: leaveTypes.length > 0 ? leaveTypes[0].id : 0,
        start_date: '',
        end_date: '',
        reason: '',
        work_handover: '',
        contact_during_leave: '',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t("Gagal mengajukan cuti"), { id: 'api-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await leaveService.cancel(id);
      toast.success(t("Pengajuan cuti berhasil dibatalkan"));
      setSelectedRequest(null);
      setConfirmCancel(false);
      fetchData();
    } catch (error) {
      console.error('Failed to cancel leave request:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t("Gagal membatalkan cuti"), { id: 'api-error' });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateLong = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = [...new Set([...Array.from({ length: 5 }, (_, i) => currentYear - i), ...leaveRequests.map(r => Number(r.start_date.slice(0, 4)))])].sort((a, b) => b - a);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cyan-600 animate-spin" />
          <p className="text-gray-500">{t("Memuat data cuti...")}</p>
        </div>
      </div>
    );
  }

  if (loadError) return <div className="ph-workflow personal-page"><header className="personal-heading"><div><p className="personal-eyebrow">{t("Personal")}</p><h1>{t("My Leave")}</h1></div></header><div className="personal-empty personal-surface" role="alert"><AlertCircle /><h3>{t("Unable to load leave data")}</h3><p>{t("Please try again. Your data has not been changed.")}</p><button className="ph-button" onClick={() => void fetchData()}>{t("Try Again")}</button></div></div>;

  return (
    <div className="ph-workflow personal-page">
      <header className="personal-heading">
        <div><p className="personal-eyebrow">{t("Personal")}</p><h1>{t("My Leave")}</h1><p>{t("Your time off, balances and request history.")}</p></div>
        <div className="personal-heading-actions"><button className="ph-button" onClick={() => setShowBalances(true)} aria-haspopup="dialog"><Info />{t("Lihat saldo cuti")}</button><button className="ph-button ph-button-primary" onClick={() => setShowRequestModal(true)}><Plus />{t("Request Leave")}</button></div>
      </header>

      {showBalances && <LeaveBalanceDialog balances={leaveBalances} onClose={() => setShowBalances(false)} />}

      <section className="personal-surface" aria-label={t("Leave history")}>
        <div className="personal-section-heading personal-surface-heading"><div><h2>{t("Leave History")} <span className="personal-count">{quantity(totalItems)}</span></h2><p>{t("Review a request to see its status and details.")}</p></div></div>
        <div className="personal-toolbar">
          <div className="personal-search"><Search /><input aria-label={t("Search leave requests")} placeholder={t("Search by reason...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
          <select aria-label={t("Leave status")} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">{t("All statuses")}</option><option value="pending">{t("Pending")}</option><option value="approved">{t("Approved")}</option><option value="rejected">{t("Rejected")}</option><option value="cancelled">{t("Cancelled")}</option></select>
          <select aria-label={t("Leave year")} value={filterYear} onChange={e => setFilterYear(e.target.value)}><option value="all">{t("All years")}</option>{yearOptions.map(year => <option key={year} value={year}>{year}</option>)}</select>
        </div>
        <p className="personal-filter-note">{t("Search and filters apply to this page of requests.")}</p>
        <div className="personal-leave-columns" aria-hidden="true"><span>{t("Leave request")}</span><span>{t("Period")}</span><span>{t("Duration")}</span><span>{t("Status")}</span><span /></div>
        {filteredRequests.length === 0 ? <div className="personal-empty"><CalendarDays /><h3>{leaveRequests.length ? t("No matching requests") : t("No leave requests yet")}</h3><p>{leaveRequests.length ? t("Try a different filter or check another page.") : t("Your submitted requests will appear here.")}</p></div> :
          filteredRequests.map(request => {
            const config = getLeaveTypeConfig(request.leaveType);
            const status = getStatusConfig(request.status);
            const Icon = config.icon;
            return <button type="button" className="personal-leave-row" key={request.id} onClick={() => setSelectedRequest(request)} aria-label={t('View {name}: {date}', { name: config.label, date: formatDate(request.start_date) })}>
              <span className="personal-record-name"><span className="personal-file-icon"><Icon /></span><span><strong>{config.label}</strong><small>{request.reason || t('Submitted {date}', { date: formatDate(request.created_at) })}</small></span></span>
              <span className="personal-period">{formatDate(request.start_date)}{request.start_date !== request.end_date && <small>{t("to")} {formatDate(request.end_date)}</small>}</span>
              <span>{quantity(request.total_days ?? '\u2014')} <span className="personal-muted">{t("day(s)")}</span></span>
              <span className={cn('personal-status', status.color)}>{status.label}</span><ChevronRight className="personal-row-arrow" />
            </button>;
          })}
        <footer className="personal-pagination"><span>{quantity(filteredRequests.length)}{' '}{t("shown on page")} {currentPage}{' '}{t("of")} {Math.max(1, totalPages)} &middot; {quantity(totalItems)}{' '}{t("total requests")}</span><div><button className="ph-button" aria-label={t("Previous page")} disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft /></button><button className="ph-button" aria-label={t("Next page")} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight /></button></div></footer>
      </section>

      {showRequestModal && <Modal isOpen onClose={() => setShowRequestModal(false)} title={t("Request Leave")} description={t("Choose your dates and share the details for approval.")} size="lg" busy={isSubmitting} className="ph-workflow personal-modal">
        <form id="leave-request-form" onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting} className="personal-form-grid">
            <label className="personal-field personal-full">{t("Leave Type")}<select required value={formData.leave_type_id || ''} onChange={e => setFormData({ ...formData, leave_type_id: Number(e.target.value) })}><option value="">{t("Select leave type...")}</option>{leaveTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
            <div className="personal-full personal-form-hint"><p>{t("Cuti hanya tersedia dalam hari penuh (full day).")}</p>{(() => {
              const type = leaveTypes.find(t => t.id === formData.leave_type_id);
              if (!type) return null;
              return <p>{t("Min")} {Math.max(1, Math.ceil(toNum(type.min_days_per_request, 1)))}{type.max_days_per_request != null && <>{' '}{t("· Max")} {type.max_days_per_request}</>}{' '}{t('working days per request — weekends & public holidays are not counted.')}</p>;
            })()}</div>
            <label className="personal-field">{t("Start Date")}<input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} /></label>
            <label className="personal-field">{t("End Date")}<input type="date" required min={formData.start_date} value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} /></label>
            <label className="personal-field personal-full">{t("Reason")} <span className="personal-optional">{t("Optional")}</span><textarea rows={2} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder={t("Please provide a reason for your leave request...")} /></label>
            <label className="personal-field">{t("Task Handover")}<input value={formData.work_handover} onChange={e => setFormData({ ...formData, work_handover: e.target.value })} placeholder={t("Person handling your tasks")} /></label>
            <label className="personal-field">{t("Emergency Contact")}<input value={formData.contact_during_leave} onChange={e => setFormData({ ...formData, contact_during_leave: e.target.value })} placeholder={t("Name and phone number")} /></label>
          </fieldset>
          <div className="personal-request-context">
            <div><span>{t("Available Balance")}</span><strong>{(() => { const balance = leaveBalances.find(b => b.leave_type_id === formData.leave_type_id); return balance ? t('{count} days', { count: quantity(getAvailableDays(balance)) }) : t("No balance allocated"); })()}</strong><small>{t("Pending days are already reserved.")}</small></div>
            <div><span>{t("Leave Approver")}</span><strong>{myProfile?.leaveApprover?.name || myProfile?.manager?.name || 'P&C'}</strong><small>{t("Your request will be sent for approval.")}</small></div>
          </div>
        </form>
        <div className="ph-dialog-footer"><button className="ph-button" disabled={isSubmitting} onClick={() => setShowRequestModal(false)}>{t("Cancel")}</button><button className="ph-button ph-button-primary" form="leave-request-form" type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />}{' '}{t("Submit Request")}</button></div>
      </Modal>}

      {selectedRequest && <Modal isOpen onClose={() => setSelectedRequest(null)} title={getLeaveTypeConfig(selectedRequest.leaveType).label} description={t("Leave request details")} size="lg" busy={isCancelling} className="ph-workflow personal-modal">
        <div className="personal-detail-summary"><div><span className={cn('personal-status', getStatusConfig(selectedRequest.status).color)}>{getStatusConfig(selectedRequest.status).label}</span><p>{formatDateLong(selectedRequest.start_date)}{selectedRequest.start_date !== selectedRequest.end_date && <>{' – '} {formatDateLong(selectedRequest.end_date)}</>}</p></div><strong>{quantity(selectedRequest.total_days ?? '\u2014')}<small>{t("day(s)")}</small></strong></div>
        <dl className="personal-details">
          <div className="personal-full"><dt>{t("Reason")}</dt><dd>{selectedRequest.reason || t("No reason provided")}</dd></div>
          {selectedRequest.work_handover && <div><dt>{t("Task Handover")}</dt><dd>{selectedRequest.work_handover}</dd></div>}
          {selectedRequest.contact_during_leave && <div><dt>{t("Emergency Contact")}</dt><dd>{selectedRequest.contact_during_leave}</dd></div>}
          {selectedRequest.document_name && <div className="personal-full"><dt>{t("Attachment")}</dt><dd>{selectedRequest.document_name}</dd></div>}
          <div><dt>{t("Submitted")}</dt><dd>{formatDateLong(selectedRequest.created_at)}</dd></div>
          {selectedRequest.approved_at && <div><dt>{selectedRequest.status === 'approved' ? t("Approved") : t("Processed")}</dt><dd>{formatDateLong(selectedRequest.approved_at)}</dd></div>}
          {selectedRequest.approver && <div><dt>{t("Approver")}</dt><dd>{selectedRequest.approver.name}</dd></div>}
          {(selectedRequest.start_half_day || selectedRequest.end_half_day) && <div><dt>{t("Original request")}</dt><dd>{selectedRequest.start_half_day && t("Start: Half day")}{selectedRequest.end_half_day && t(" End: Half day")}</dd></div>}
        </dl>
        {selectedRequest.rejection_reason && <div className="personal-warning"><strong>{t("Rejection Reason")}</strong><p>{selectedRequest.rejection_reason}</p></div>}
        <div className="ph-dialog-footer">{selectedRequest.status === 'pending' && <button className="ph-button personal-danger" onClick={() => setConfirmCancel(true)}>{t("Cancel Request")}</button>}<button className="ph-button" onClick={() => setSelectedRequest(null)}>{t("Close")}</button></div>
      </Modal>}
      {confirmCancel && selectedRequest && <Modal isOpen title={t("Cancel this leave request?")} description={t("This pending request will be withdrawn from approval.")} size="md" role="alertdialog" busy={isCancelling} onClose={() => setConfirmCancel(false)} className="ph-workflow personal-modal">
        <p className="personal-note">{getLeaveTypeConfig(selectedRequest.leaveType).label} &middot; {formatDate(selectedRequest.start_date)}{' – '} {formatDate(selectedRequest.end_date)}</p>
        <div className="ph-dialog-footer"><button className="ph-button" disabled={isCancelling} onClick={() => setConfirmCancel(false)}>{t("Keep Request")}</button><button className="ph-button personal-danger" disabled={isCancelling} onClick={() => handleCancel(selectedRequest.id)}>{isCancelling ? t("Cancelling...") : t("Confirm Cancellation")}</button></div>
      </Modal>}
    </div>
  );
}
