import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { translateError } from '@/i18n/error-message';
import { isAxiosError } from 'axios';
import { Calendar, ChevronLeft, ChevronRight, Download, Edit, Eye, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { OperationalDialog, OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { attendanceService } from '@/services/attendance.service';
import { companyService, type Company } from '@/services/company.service';
import { departmentService } from '@/services/department.service';
import { employeeService } from '@/services/employee.service';
import { collectPages } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import { toNum } from '@/lib/utils';
import type { Attendance, AttendanceStatus, Department, Employee, PaginatedResponse } from '@/types';
import './attendance-refresh.css';

// Match requireHRStaffOrHigher / requireManagerOrHigher; company scope stays server-owned.
const editors = ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'];
const readers = [...editors, 'Tax Staff', 'Manager'];
const statusLabels: Record<string, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', early_leave: 'Early Leave', half_day: 'Half Day',
  on_leave: 'On Leave', holiday: 'Public holiday', work_from_home: 'Work from home', wfh: 'Work from home',
};
const editableStatuses: AttendanceStatus[] = ['present', 'late', 'absent', 'early_leave', 'half_day', 'on_leave'];
const statusLabel = (status: string) => statusLabels[status] ? t(statusLabels[status]) : status;
const todayWib = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateInput = (value: string) => value.slice(0, 10);
const formatDate = (value: string) => new Date(`${dateInput(value)}T00:00:00Z`).toLocaleDateString(intlLocale(), {
  timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
});

function timeInput(value?: string | null): string {
  if (!value) return '';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5);
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return '';
  return instant.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}
const formatTime = (value?: string | null) => timeInput(value) || '—';
function formatWorkHours(value: Attendance['total_hours']) {
  const hours = toNum(value, NaN);
  if (!Number.isFinite(hours)) return '—';
  const minutes = Math.round(hours * 60);
  return t('{hours}h {minutes}m', { hours: Math.floor(minutes / 60).toLocaleString(intlLocale()), minutes: (minutes % 60).toLocaleString(intlLocale()) });
}
function Status({ value }: { value: string }) {
  const tone = ['present', 'work_from_home', 'wfh'].includes(value) ? 'positive' : value === 'absent' ? 'negative' : ['late', 'early_leave'].includes(value) ? 'warning' : 'neutral';
  return <span className="ar-status" data-tone={tone}>{statusLabel(value)}</span>;
}
const emptyForm = () => ({ employee_id: 0, date: todayWib(), check_in: '', check_out: '', status: 'present' as AttendanceStatus, notes: '' });
type Dialog = { kind: 'create' } | { kind: 'edit' | 'view' | 'delete'; record: Attendance };
const defaultQuery = () => ({ page: 1, date: todayWib(), department: '', company: '', status: '', search: '' });

export function AttendancePage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  const canRead = user?.roles.some(role => readers.includes(role)) ?? false;
  const canManage = user?.roles.some(role => editors.includes(role)) ?? false;
  const [query, setQuery] = useState(defaultQuery);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const requestKey = JSON.stringify([query, revision]);
  const [result, setResult] = useState<{ key: string; data?: PaginatedResponse<Attendance>; failed?: boolean } | null>(null);
  const current = result?.key === requestKey ? result : null;
  const loading = canRead && !current;
  const records = current?.data?.data ?? [];
  const pagination = current?.data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const [optionsRevision, setOptionsRevision] = useState(0);
  const [options, setOptions] = useState<{ revision: number; companies: Company[]; departments: Department[]; failed: boolean } | null>(null);
  const [employeesRevision, setEmployeesRevision] = useState(0);
  const [employeeOptions, setEmployeeOptions] = useState<{ revision: number; data: Employee[]; failed: boolean } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isProcessing, setIsProcessing] = useState(false);
  const processing = useRef(false);
  const [mutationError, setMutationError] = useState<{ source: string; server?: boolean } | null>(null);
  const mutationErrorText = mutationError ? mutationError.server ? translateError(mutationError.source) : t(mutationError.source) : '';
  const [detailRevision, setDetailRevision] = useState(0);
  const detailId = dialog?.kind === 'view' ? dialog.record.id : null;
  const detailKey = `${detailId}:${detailRevision}`;
  const [detailResult, setDetailResult] = useState<{ key: string; data?: Attendance; failed?: boolean } | null>(null);
  const detail = detailResult?.key === detailKey ? detailResult : null;
  const creating = dialog?.kind === 'create';
  const availableEmployees = employeeOptions?.revision === employeesRevision ? employeeOptions : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      const term = search.trim();
      setQuery(previous => previous.search === term ? previous : { ...previous, search: term, page: 1 });
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!canRead) return;
    let active = true;
    attendanceService.getAll({
      page: query.page, limit: 10,
      start_date: query.date || undefined, end_date: query.date || undefined,
      department_id: query.department ? Number(query.department) : undefined,
      company_id: query.company ? Number(query.company) : undefined,
      status: query.status || undefined, search: query.search || undefined,
    }).then(data => {
      if (!active) return;
      const lastPage = Math.max(1, data.pagination.totalPages);
      if (query.page > lastPage) {
        setQuery(previous => ({ ...previous, page: lastPage }));
        return;
      }
      setResult({ key: requestKey, data });
    }).catch(() => { if (active) setResult({ key: requestKey, failed: true }); });
    return () => { active = false; };
  }, [query, requestKey, canRead]);

  useEffect(() => {
    if (!canRead) return;
    let active = true;
    Promise.allSettled([
      collectPages((page, limit) => companyService.getAll({ page, limit })),
      collectPages((page, limit) => departmentService.getAll({ page, limit })),
    ]).then(([companies, departments]) => {
      if (active) setOptions({ revision: optionsRevision,
        companies: companies.status === 'fulfilled' ? companies.value : [],
        departments: departments.status === 'fulfilled' ? departments.value : [],
        failed: companies.status === 'rejected' || departments.status === 'rejected',
      });
    });
    return () => { active = false; };
  }, [canRead, optionsRevision]);

  useEffect(() => {
    if (!creating || !canManage) return;
    let active = true;
    collectPages((page, limit) => employeeService.getAll({ page, limit, employment_status: 'active' }))
      .then(data => { if (active) setEmployeeOptions({ revision: employeesRevision, data, failed: false }); })
      .catch(() => { if (active) setEmployeeOptions({ revision: employeesRevision, data: [], failed: true }); });
    return () => { active = false; };
  }, [creating, canManage, employeesRevision]);

  useEffect(() => {
    if (detailId == null || !canRead) return;
    let active = true;
    attendanceService.getById(detailId)
      .then(data => { if (active) setDetailResult({ key: detailKey, data }); })
      .catch(() => { if (active) setDetailResult({ key: detailKey, failed: true }); });
    return () => { active = false; };
  }, [detailId, detailKey, canRead]);

  const updateFilter = (field: 'date' | 'department' | 'company' | 'status', value: string) => {
    setQuery(previous => ({ ...previous, [field]: value, search: search.trim(), page: 1 }));
  };
  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(previous => previous.search === search.trim() && previous.page === 1 ? previous : { ...previous, search: search.trim(), page: 1 });
  };
  const clearFilters = () => { setSearch(''); setQuery(defaultQuery()); };
  const closeDialog = () => { if (!processing.current) { setDialog(null); setMutationError(null); } };
  const openDialog = (next: Dialog) => {
    setMutationError(null);
    if (next.kind === 'create') { setFormData(emptyForm()); setEmployeeOptions(null); }
    if (next.kind === 'edit') {
      const record = next.record;
      setFormData({ employee_id: record.employee_id ?? record.employee?.id ?? 0, date: dateInput(record.date),
        check_in: timeInput(record.check_in), check_out: timeInput(record.check_out), status: record.status, notes: record.notes ?? '' });
    }
    if (next.kind === 'view') setDetailResult(null);
    setDialog(next);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dialog || dialog.kind === 'view' || !canManage || processing.current) return;
    if (dialog.kind === 'create' && (!formData.employee_id || !formData.date)) {
      setMutationError({ source: !formData.employee_id ? 'Please select an employee' : 'Please select a date' });
      return;
    }
    processing.current = true;
    setIsProcessing(true);
    setMutationError(null);
    try {
      const payload = { check_in: formData.check_in || undefined, check_out: formData.check_out || undefined, status: formData.status, notes: formData.notes };
      if (dialog.kind === 'create') await attendanceService.create({ ...payload, employee_id: formData.employee_id, date: formData.date });
      else if (dialog.kind === 'edit') await attendanceService.update(dialog.record.id, payload);
      else await attendanceService.delete(dialog.record.id);
      toast.success(t(dialog.kind === 'create' ? 'Attendance created successfully' : dialog.kind === 'edit' ? 'Attendance updated successfully' : 'Attendance deleted successfully'));
      setDialog(null);
      if (dialog.kind === 'delete' && records.length === 1 && query.page > 1) setQuery(previous => ({ ...previous, page: previous.page - 1 }));
      else setRevision(value => value + 1);
    } catch (error: unknown) {
      const fallback = dialog.kind === 'create' ? 'Failed to create attendance' : dialog.kind === 'edit' ? 'Failed to update attendance' : 'Failed to delete attendance';
      const serverMessage = isAxiosError(error) && typeof error.response?.data?.message === 'string' ? error.response.data.message : null;
      setMutationError({ source: serverMessage ?? fallback, server: serverMessage != null });
      toast.error(serverMessage ? translateError(serverMessage) : t(fallback), { id: 'api-error' });
    } finally {
      processing.current = false;
      setIsProcessing(false);
    }
  };
  const handleExport = () => {
    if (!records.length || loading || current?.failed) return;
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Date', 'Check-in (WIB)', 'Checkout (WIB)', 'Duration (hours)', 'Status', 'Notes'].map(source => t(source));
    const rows = records.map(record => [record.employee?.employee_id ?? record.employee_id ?? record.employee?.id ?? '', record.employee?.name ?? '', record.employee?.department?.name ?? '',
      dateInput(record.date), timeInput(record.check_in), timeInput(record.check_out),
      record.total_hours == null ? '' : toNum(record.total_hours, NaN).toLocaleString(intlLocale(), { maximumFractionDigits: 2 }), statusLabel(record.status), record.notes ?? '']);
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = `attendance_${query.date || todayWib()}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    toast.success(t('Export successful'));
  };
  const activeOptions = options?.revision === optionsRevision ? options : null;

  return <OperationalWorkspace module="operations" className="attendance-refresh" title={t('Attendance Management')} description={t('Monitor and manage employee attendance')}
    actions={canRead && <>
      <button className="ow-button" onClick={() => setRevision(value => value + 1)} disabled={loading}><RefreshCw size={16} />{t('Refresh')}</button>
      <button className="ow-button" onClick={handleExport} disabled={loading || !!current?.failed || !records.length}><Download size={16} />{t('Export this page')}</button>
      {canManage && <button className="ow-button ow-primary" onClick={() => openDialog({ kind: 'create' })}><Plus size={16} />{t('Manual Entry')}</button>}
    </>}
    filters={canRead && <>
      <label className="ow-field">{t('Date')}<input id="attendance-date-filter" type="date" value={query.date} onChange={event => updateFilter('date', event.target.value)} /></label>
      <label className="ow-field">{t('Company')}<select id="attendance-company-filter" value={query.company} onChange={event => updateFilter('company', event.target.value)}><option value="">{t('All assigned companies')}</option>{activeOptions?.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
      <label className="ow-field">{t('Department')}<select id="attendance-department-filter" value={query.department} onChange={event => updateFilter('department', event.target.value)}><option value="">{t('All Departments')}</option>{activeOptions?.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      <label className="ow-field">{t('Status')}<select id="attendance-status-filter" value={query.status} onChange={event => updateFilter('status', event.target.value)}><option value="">{t('All statuses')}</option>{Object.keys(statusLabels).filter(status => status !== 'wfh').map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
      <button className="ow-button" onClick={clearFilters}>{t('Reset filters')}</button>
    </>}>
    {!canRead ? <div className="ow-feedback" role="alert">{t('You do not have permission to view attendance records.')}</div> : <>
      {activeOptions?.failed && <div className="ar-option-error" role="alert">{t('Unable to load attendance filter options.')}<button className="ow-button" onClick={() => setOptionsRevision(value => value + 1)}>{t('Retry options')}</button></div>}
      <section className="ow-register" aria-label={t('Attendance Data')}>
        <div className="ow-toolbar"><div><h2>{t('Attendance Data')}</h2><p className="ar-note">{t('Attendance times are shown in WIB. Export includes this page only.')}</p></div>
          <form className="ar-search" onSubmit={handleSearch}><Search size={16} aria-hidden="true" /><input id="attendance-search" aria-label={t('Search attendance by name or employee ID')} placeholder={t('Name or ID...')} value={search} maxLength={200} onChange={event => setSearch(event.target.value)} /><button type="submit" className="ow-button">{t('Search')}</button></form>
        </div>
        {loading ? <div className="ow-feedback" role="status"><Loader2 className="animate-spin" size={22} />{t('Loading data...')}</div> : current?.failed ? <div className="ow-feedback" role="alert"><h3>{t('Failed to load attendance data')}</h3><button className="ow-button" onClick={() => setRevision(value => value + 1)}>{t('Retry attendance')}</button></div> : !records.length ? <div className="ow-feedback"><Calendar size={24} /><h3>{t('No data found')}</h3><p>{t('No attendance data for the selected filters')}</p><button className="ow-button" onClick={clearFilters}>{t('Reset filters')}</button></div> :
          <div className="ar-table-wrap"><table className="ow-table ar-table"><thead><tr><th>{t('Employee')}</th><th>{t('Date')}</th><th>{t('Check-in (WIB)')}</th><th>{t('Checkout (WIB)')}</th><th>{t('Work Hours')}</th><th>{t('Status')}</th><th>{t('Actions')}</th></tr></thead><tbody>
            {records.map(record => <tr key={record.id} data-attendance-record={record.id}>
              <td data-label={t('Employee')}><strong>{record.employee?.name || t('Unknown employee')}</strong><span className="ar-sub">{record.employee?.employee_id ?? record.employee_id ?? record.employee?.id ?? '—'}</span><span className="ar-sub">{record.employee?.department?.name || '—'}</span></td>
              <td data-label={t('Date')}>{formatDate(record.date)}</td><td data-label={t('Check-in (WIB)')} className="ar-number">{formatTime(record.check_in)}</td><td data-label={t('Checkout (WIB)')} className="ar-number">{formatTime(record.check_out)}</td><td data-label={t('Work Hours')} className="ar-number">{formatWorkHours(record.total_hours)}</td><td data-label={t('Status')}><Status value={record.status} /></td>
              <td data-label={t('Actions')}><div className="ar-actions"><button className="ow-button" title={t('View Details')} onClick={() => openDialog({ kind: 'view', record })}><Eye size={15} />{t('Details')}</button>{canManage && <><button className="ow-icon-button" aria-label={t('Edit Attendance')} title={t('Edit Attendance')} onClick={() => openDialog({ kind: 'edit', record })}><Edit size={16} /></button><button className="ow-icon-button ar-delete" aria-label={t('Delete Attendance?')} title={t('Delete Attendance?')} onClick={() => openDialog({ kind: 'delete', record })}><Trash2 size={16} /></button></>}</div></td>
            </tr>)}
          </tbody></table></div>}
        {!loading && !current?.failed && <div className="ow-pagination"><span>{t('{shown} shown · {total} matching attendance records', { shown: records.length.toLocaleString(intlLocale()), total: (pagination?.total ?? 0).toLocaleString(intlLocale()) })}</span><nav aria-label={t('Attendance pages')}><button className="ow-button" aria-label={t('Previous page')} disabled={query.page <= 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}><ChevronLeft size={16} /></button><span>{t('Page')} {query.page} {t('of')} {totalPages}</span><button className="ow-button" aria-label={t('Next page')} disabled={query.page >= totalPages} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}><ChevronRight size={16} /></button></nav></div>}
      </section>
    </>}
    {dialog && (dialog.kind === 'create' || dialog.kind === 'edit') && <OperationalDialog title={t(dialog.kind === 'create' ? 'Manual Entry' : 'Edit Attendance')} subtitle={dialog.kind === 'create' ? t('Create attendance record manually') : `${dialog.record.employee?.name || t('Unknown employee')} · ${formatDate(dialog.record.date)}`} onClose={closeDialog} busy={isProcessing} className="attendance-refresh-dialog">
      <form onSubmit={save} onChange={() => setMutationError(null)} className="ar-form"><div className="ow-dialog-body">
        <p className="ar-note">{t('Enter attendance times in WIB (UTC+7).')}</p>
        <fieldset disabled={isProcessing} className="ar-form-grid">
          {dialog.kind === 'create' && <><div className="ar-field ar-wide"><span>{t('Employee')} *</span><SearchableSelect aria-label={t('Employee')} options={(availableEmployees?.data ?? []).map(employee => ({ value: employee.id, label: `${employee.name} (${employee.employee_id || employee.id})` }))} value={formData.employee_id || ''} onChange={value => { setFormData(previous => ({ ...previous, employee_id: Number(value) })); setMutationError(null); }} placeholder={t('Select employee...')} loading={!availableEmployees} disabled={isProcessing || !availableEmployees || availableEmployees.failed} />{availableEmployees?.failed && <div className="ar-inline-error" role="alert">{t('Unable to load attendance employees.')}<button type="button" className="ow-button" onClick={() => setEmployeesRevision(value => value + 1)}>{t('Retry employees')}</button></div>}</div><label className="ar-field">{t('Date')} *<input id="attendance-entry-date" type="date" required value={formData.date} onChange={event => setFormData(previous => ({ ...previous, date: event.target.value }))} /></label></>}
          <label className="ar-field">{t('Status')}<select id="attendance-entry-status" value={formData.status} onChange={event => setFormData(previous => ({ ...previous, status: event.target.value as AttendanceStatus }))}>{!editableStatuses.includes(formData.status) && <option value={formData.status}>{statusLabel(formData.status)}</option>}{editableStatuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
          <label className="ar-field">{t('Check-in (WIB)')}<input id="attendance-entry-check-in" type="time" value={formData.check_in} onChange={event => setFormData(previous => ({ ...previous, check_in: event.target.value }))} /></label>
          <label className="ar-field">{t('Checkout (WIB)')}<input id="attendance-entry-check-out" type="time" value={formData.check_out} onChange={event => setFormData(previous => ({ ...previous, check_out: event.target.value }))} /></label>
          <label className="ar-field ar-wide">{t('Notes')}<textarea id="attendance-entry-notes" rows={3} value={formData.notes} placeholder={t('Add notes...')} onChange={event => setFormData(previous => ({ ...previous, notes: event.target.value }))} /></label>
        </fieldset>
        {mutationError && <p className="ar-inline-error" role="alert">{mutationErrorText}</p>}
      </div><footer className="ar-dialog-footer"><button type="button" className="ow-button" onClick={closeDialog} disabled={isProcessing}>{t('Cancel')}</button><button type="submit" className="ow-button ow-primary" disabled={isProcessing || (creating && (!availableEmployees || availableEmployees.failed))}>{isProcessing ? t('Saving...') : t(creating ? 'Create Attendance' : 'Save Changes')}</button></footer></form>
    </OperationalDialog>}
    {dialog?.kind === 'view' && <OperationalDialog title={t('Attendance Details')} subtitle={`${dialog.record.employee?.name || t('Unknown employee')} · ${formatDate(dialog.record.date)}`} onClose={closeDialog} className="attendance-refresh-dialog">
      <div className="ow-dialog-body">{!detail ? <div className="ar-detail-feedback" role="status"><Loader2 size={22} className="animate-spin" />{t('Loading data...')}</div> : detail.failed ? <div className="ar-detail-feedback" role="alert">{t('Unable to load attendance details.')}<button className="ow-button" onClick={() => setDetailRevision(value => value + 1)}>{t('Retry details')}</button></div> : detail.data && <>
        <div className="ar-detail-heading"><div><h3>{detail.data.employee?.name || t('Unknown employee')}</h3><p className="ar-note">{detail.data.employee?.employee_id ?? detail.data.employee_id ?? detail.data.employee?.id ?? '—'} · {detail.data.employee?.department?.name || '—'}</p></div><Status value={detail.data.status} /></div>
        <dl className="ar-detail-grid"><div><dt>{t('Date')}</dt><dd>{formatDate(detail.data.date)}</dd></div><div><dt>{t('Work Hours')}</dt><dd>{formatWorkHours(detail.data.total_hours)}</dd></div><div><dt>{t('Check-in (WIB)')}</dt><dd>{formatTime(detail.data.check_in)}</dd></div><div><dt>{t('Checkout (WIB)')}</dt><dd>{formatTime(detail.data.check_out)}</dd></div><div><dt>{t('Break start (WIB)')}</dt><dd>{formatTime(detail.data.break_start)}</dd></div><div><dt>{t('Break end (WIB)')}</dt><dd>{formatTime(detail.data.break_end)}</dd></div><div className="ar-wide"><dt>{t('Work location')}</dt><dd>{detail.data.workLocation?.name || '—'}</dd></div>
          {detail.data.check_in_latitude != null && <div><dt>{t('Check-in coordinates')}</dt><dd>{detail.data.check_in_latitude}, {detail.data.check_in_longitude ?? '—'}</dd></div>}{detail.data.check_out_latitude != null && <div><dt>{t('Checkout coordinates')}</dt><dd>{detail.data.check_out_latitude}, {detail.data.check_out_longitude ?? '—'}</dd></div>}
          <div className="ar-wide"><dt>{t('Notes')}</dt><dd>{detail.data.notes || t('No additional notes.')}</dd></div></dl>
      </>}</div><footer className="ar-dialog-footer"><button className="ow-button" onClick={closeDialog}>{t('Close')}</button></footer>
    </OperationalDialog>}
    {dialog?.kind === 'delete' && <OperationalDialog title={t('Delete Attendance?')} onClose={closeDialog} busy={isProcessing} className="attendance-refresh-dialog ar-delete-dialog"><form onSubmit={save} onChange={() => setMutationError(null)} className="ar-form"><div className="ow-dialog-body"><p>{t('Are you sure you want to delete attendance record for')} <strong>{dialog.record.employee?.name || t('Unknown employee')}</strong> {t('on')} <strong>{formatDate(dialog.record.date)}</strong>?</p><p className="ar-note">{t('This action cannot be undone.')}</p>{mutationError && <p className="ar-inline-error" role="alert">{mutationErrorText}</p>}</div><footer className="ar-dialog-footer"><button type="button" className="ow-button" disabled={isProcessing} onClick={closeDialog}>{t('Cancel')}</button><button type="submit" className="ow-button ar-danger" disabled={isProcessing}>{isProcessing ? t('Deleting...') : t('Yes, Delete')}</button></footer></form></OperationalDialog>}
  </OperationalWorkspace>;
}
