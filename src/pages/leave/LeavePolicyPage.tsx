import { quantity } from '@/components/leave/presentation';
import { ApplicationCopy } from '@/components/leave/ApplicationCopy';
import type { ReactElement } from 'react';
import { t, useLocale } from '@/i18n';
import { useDomainConfirmation } from '@/pages/leave/useDomainConfirmation';
import '@/pages/leave/domain-workflows.css';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import toast from 'react-hot-toast';
import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { collectPages } from '@/services/master-data';
import api from '@/services/api';
import type { PaginatedResponse } from '@/types';
import './leave-workspace.css';
import './leave-refresh.css';
import { Plus, Search, Edit2, Trash2, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { leaveService } from '../../services/leave.service';
import { companyService } from '../../services/company.service';
// LeaveType imported from service response

interface Company {
  id: number;
  name: string;
}

// Field names MUST match the API. GET /leaves/types returns the Prisma column
// names (LEAVE_TYPE_SELECT in backend/src/modules/leave/leave.types.ts) and
// POST/PUT /leave-types only accepts those names (CreateLeaveTypeDTO). This
// interface previously declared max_days / carry_forward / carry_forward_days /
// prorate_enabled, none of which exist on either side — so those values read
// back as undefined (the edit form showed its defaults instead of what was
// stored) and were silently dropped on save.
interface LeavePolicy {
  id: number;
  name: string;
  code?: string;
  company_id?: number;
  company?: Company;
  default_days: number;
  // Nullable on the wire: null is how the API says "no per-request cap".
  max_days_per_request?: number | null;
  can_carry_forward?: boolean;
  max_carry_forward_days?: number;
  prorate_on_join?: boolean;
  gender_specific?: string | null;
  requires_document?: boolean;
  description?: string;
  is_paid?: boolean;
  is_active: boolean;
}

export function LeavePolicyPage() {
  useLocale();
  const { requestDecision, decisionDialog } = useDomainConfirmation('leave-refresh-dialog');
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.roles.includes('Super Admin') ?? false;
  // Existing role ceiling AND the covered leave.manage_type action.
  const canManage = isSuperAdmin || ((user?.roles.includes('HR Manager') ?? false) && canAction(user, 'leave.manage_type'));
  const canEdit = (policy: LeavePolicy) => canManage && (policy.company_id == null ? isSuperAdmin : isSuperAdmin || !!user?.accessibleCompanyIds.includes(policy.company_id));
  const [loadError, setLoadError] = useState(false);
  const [optionError, setOptionError] = useState(false);
  const [formError, setFormError] = useState<string | ReactElement>('');
  const requestSequence = useRef(0);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 12;

  // max_days is held as a string, not a number: the API distinguishes "no cap"
  // (null) from a real limit, and only an empty string can carry "no cap"
  // through a number input without colliding with a genuine 0.
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    default_days: 12,
    max_days: '',
    carry_forward: false,
    carry_forward_days: 0,
    prorate_enabled: true,
    gender_specific: '',
    requires_document: false,
    company_id: '',
    is_active: true,
  });

  // Fetch leave types as policies
  const fetchPolicies = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setLoadError(false);
    try {
      const types = await collectPages(async (page, limit) =>
        (await api.get<PaginatedResponse<LeavePolicy>>('/leaves/types', { params: { page, limit } })).data);
      if (sequence === requestSequence.current) setPolicies(types as LeavePolicy[]);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setPolicies([]); setLoadError(true);
      console.error('Failed to fetch leave policies:', error);
      toast.error(t("Failed to load leave policies"), { id: 'api-error' });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const rows = await collectPages((page, limit) => companyService.getAll({ page, limit }));
      setCompanies(rows);
    } catch (error) {
      setOptionError(true);
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchPolicies();
  }, [fetchCompanies, fetchPolicies]);

  // Filter policies
  const filteredPolicies = useMemo(() => {
    let result = policies;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.code?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filterCompany !== 'all') {
      result = result.filter(p => p.company_id == null || p.company_id === Number(filterCompany));
    }

    if (filterStatus !== 'all') {
      result = result.filter(p => (filterStatus === 'active' ? p.is_active !== false : p.is_active === false));
    }

    return result;
  }, [policies, search, filterCompany, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / limit));
  useEffect(() => { setPage(1); }, [search, filterCompany, filterStatus]);
  useEffect(() => { setPage(current => Math.min(current, totalPages)); }, [totalPages]);

  // Paginate
  const paginatedPolicies = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredPolicies.slice(start, start + limit);
  }, [filteredPolicies, page]);

  const handleOpenModal = (policy?: LeavePolicy) => {
    if (!canManage || (policy && !canEdit(policy))) return;
    setFormError('');
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        name: policy.name || '',
        code: policy.code || '',
        description: policy.description || '',
        // ?? not ||: 0 allocated days is a real policy ("Cuti Tanpa Gaji"), and
        // || turned it into 12 in the form, so the next save granted 12 days.
        default_days: policy.default_days ?? 12,
        max_days: policy.max_days_per_request != null ? String(policy.max_days_per_request) : '',
        carry_forward: policy.can_carry_forward || false,
        carry_forward_days: policy.max_carry_forward_days ?? 0,
        prorate_enabled: policy.prorate_on_join !== false,
        gender_specific: policy.gender_specific || '',
        requires_document: policy.requires_document || false,
        company_id: policy.company_id?.toString() || '',
        is_active: policy.is_active !== false,
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        default_days: 12,
        max_days: '',
        carry_forward: false,
        carry_forward_days: 0,
        prorate_enabled: true,
        gender_specific: '',
        requires_document: false,
        company_id: isSuperAdmin ? '' : filterCompany !== 'all' ? filterCompany : String(companies[0]?.id ?? ''),
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingPolicy(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!canManage || (editingPolicy && !canEdit(editingPolicy))) return;
    if (!isSuperAdmin && !formData.company_id) { setFormError(<ApplicationCopy source="Select a company." />); return; }

    if (!formData.name || !formData.code) {
      setFormError(<ApplicationCopy source="Please fill in all required fields." />);
      return;
    }

    // Empty means "no cap"; anything else has to be a usable limit, since the
    // backend rejects every request longer than this value.
    const maxDaysInput = formData.max_days.trim();
    const maxDaysValue = maxDaysInput === '' ? null : Number(maxDaysInput);
    if (maxDaysValue !== null && (!Number.isInteger(maxDaysValue) || maxDaysValue < 1)) {
      setFormError(<ApplicationCopy source="Max days must be a whole number of at least 1, or empty for no limit." />);
      return;
    }

    setSubmitting(true);
    try {
      // Convert empty-string company_id to undefined; coerce numbers.
      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        default_days: Number(formData.default_days) || 0,
        // formData keys are the UI-local short names; the API names are on the right.
        // null, not undefined: undefined is dropped from the PUT body and reads as
        // "leave unchanged", which made an existing cap impossible to clear.
        max_days_per_request: maxDaysValue,
        can_carry_forward: !!formData.carry_forward,
        max_carry_forward_days: Number(formData.carry_forward_days) || 0,
        prorate_on_join: !!formData.prorate_enabled,
        gender_specific: formData.gender_specific || null,
        // No minimum-tenure field here on purpose: LeaveType has no tenure column,
        // so the form no longer offers a control for a value nothing would store.
        requires_document: !!formData.requires_document,
        ...(editingPolicy ? {} : { company_id: formData.company_id !== '' ? Number(formData.company_id) : undefined }),
        is_active: formData.is_active,
      };

      if (editingPolicy) {
        await leaveService.updateType(editingPolicy.id, payload);
        toast.success(t("Policy updated successfully"));
      } else {
        await leaveService.createType(payload);
        toast.success(t("Policy created successfully"));
      }
      setShowModal(false); setEditingPolicy(null);
      fetchPolicies();
    } catch (error: unknown) {
      setFormError((error as { response?: { data?: { message?: string } } }).response?.data?.message || <ApplicationCopy source="Unable to save this policy. Please try again." />);
      console.error('Failed to save policy:', error);
      const err = error as { response?: { data?: { message?: string } } };
      // Axios interceptor already toasts generic 4xx/5xx; only toast field-level here
      if (!err.response) {
        toast.error(t("Failed to save policy"), { id: 'api-error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await requestDecision({ title: () => t('Delete leave policy'), message: () => t('Are you sure you want to delete this leave policy?'), confirmLabel: () => t('Delete') }))) return;

    try {
      await leaveService.deleteType(id);
      toast.success(t("Policy deleted successfully"));
      fetchPolicies();
    } catch (error: unknown) {
      console.error('Failed to delete policy:', error);
      // Axios interceptor already toasts
    }
  };

  const handleExport = () => {
    if (filteredPolicies.length === 0) {
      toast.error(t("No data to export"), { id: 'api-error' });
      return;
    }

    const headers = [
      t("Name"),
      t("Code"),
      t("Default Days"),
      t("Max Days"),
      t("Carry Forward"),
      t("Carry Forward Days"),
      t("Prorate"),
      t("Gender Specific"),
      t("Requires Document"),
      t("Company"),
      t("Status"),
    ];

    const rows = filteredPolicies.map(policy => [
      policy.name,
      policy.code || '-',
      // ?? so an allocation of 0 exports as 0 rather than as a missing value,
      // and so an absent cap exports with the same wording the cards use.
      policy.default_days ?? '-',
      policy.max_days_per_request ?? t("No limit"),
      policy.can_carry_forward ? t("Yes") : t("No"),
      policy.max_carry_forward_days ?? 0,
      policy.prorate_on_join ? t("Yes") : t("No"),
      policy.gender_specific ? t(policy.gender_specific) : t("All"),
      policy.requires_document ? t("Yes") : t("No"),
      policy.company?.name || t("All Companies"),
      policy.is_active !== false ? t("Active") : t("Inactive"),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_policies_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("Export successful"));
  };

  return <OperationalWorkspace module="leave" title={t("Leave Policy")} description={t("Browse leave allowances, request limits and company-specific rules.")} className="lw-page"
    actions={<><button className="ow-button" disabled={loading || loadError || !filteredPolicies.length} onClick={handleExport}><Download size={16} />{t("Export policies")}</button>{canManage && <button className="ow-button ow-primary" onClick={() => handleOpenModal()} disabled={optionError}><Plus size={16} />{t("Add Policy")}</button>}</>}
    filters={<><label className="ow-field">{t("Company")}<select aria-label={t("Company filter")} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}><option value="all">{t("All assigned companies")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label className="ow-field">{t("Status")}<select aria-label={t("Status filter")} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">{t("All statuses")}</option><option value="active">{t("Active")}</option><option value="inactive">{t("Inactive")}</option></select></label><button className="ow-button" onClick={() => { setFilterCompany('all'); setFilterStatus('all'); setSearch(''); }}>{t("Reset filters")}</button><details className="lw-help"><summary>{t("Policy scope")}</summary><p>{t("Company selections include global policies. Leave requests use full days; stored prorated balances are preserved.")}</p></details></>}>
    {optionError && <p className="ow-feedback" role="alert">{t("Unable to load companies.")} <button onClick={() => { setOptionError(false); fetchCompanies(); }}>{t("Retry companies")}</button></p>}
    <section className="ow-register"><div className="lw-register-tools"><p className="lw-note">{filteredPolicies.length}{' '}{t("policies in this selection")}</p><label className="lw-search"><Search size={17} /><input aria-label={t("Search policies")} placeholder={t("Search name, code or description…")} value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      {loading ? <div className="lw-empty" role="status"><Loader2 className="animate-spin" />{t("Loading policies…")}</div> : loadError ? <div className="lw-empty" role="alert">{t("Unable to load leave policies.")}<button className="ow-button" onClick={fetchPolicies}>{t("Retry policies")}</button></div> : !paginatedPolicies.length ? <div className="lw-empty"><h3>{t("No policies found")}</h3><p>{t("Adjust your filters to view available policies.")}</p></div> : <div className="lw-table-wrap"><table className="ow-table lw-records lw-policies"><thead><tr><th>{t("Policy")}</th><th>{t("Leave allowance")}</th><th>{t("Request limit")}</th><th>{t("Carry forward")}</th><th>{t("Status")}</th><th>{t("Actions")}</th></tr></thead><tbody>{paginatedPolicies.map(policy => <tr data-leave-policy key={policy.id}>
        <td data-label={t("Policy")}><strong>{policy.name}</strong><span className="lw-sub">{policy.code || '—'} / {policy.company?.name || (policy.company_id ? t('Company #{id}', { id: policy.company_id! }) : t("Global policy"))}</span><details className="lw-policy-details"><summary>{t("Policy details")}</summary><p>{policy.description || t("No description provided.")}</p><dl><div><dt>{t("Joining allowance")}</dt><dd>{policy.prorate_on_join ? t("Prorated") : t("Full allowance")}</dd></div><div><dt>{t("Payment")}</dt><dd>{policy.is_paid === false ? t("Unpaid") : t("Paid leave")}</dd></div>{policy.requires_document && <div><dt>{t("Supporting document")}</dt><dd>{t("Required")}</dd></div>}{policy.gender_specific && <div><dt>{t("Eligibility")}</dt><dd>{t(policy.gender_specific)}{' '}{t("only")}</dd></div>}</dl></details></td>
        <td data-label={t("Leave allowance")}><span className="lw-number">{quantity(policy.default_days ?? '—')}</span>{' '}{t("days")}</td>
        <td data-label={t("Request limit")}>{policy.max_days_per_request == null ? t("No limit") : t('{count} days maximum', { count: policy.max_days_per_request })}</td>
        <td data-label={t("Carry forward")}>{policy.can_carry_forward ? t('Up to {count} days', { count: policy.max_carry_forward_days ?? 0 }) : t("Not enabled")}</td>
        <td data-label={t("Status")}><span className={`lw-status ${policy.is_active !== false ? 'lw-active' : ''}`}>{policy.is_active !== false ? t("Active") : t("Inactive")}</span></td>
        <td data-label={t("Actions")}>{canEdit(policy) ? <div className="lw-actions"><button className="ow-button" title={t("Edit")} onClick={() => handleOpenModal(policy)}><Edit2 size={15} />{t("Edit")}</button><button className="ow-button" title={t("Delete")} aria-label={t('Delete {name}', { name: policy.name })} onClick={() => handleDelete(policy.id)}><Trash2 size={15} /></button></div> : <span className="lw-note">{t("Read only")}</span>}</td>
      </tr>)}</tbody></table></div>}
      {!loading && !loadError && <div className="ow-pagination"><span>{paginatedPolicies.length}{' '}{t("of")} {filteredPolicies.length}{' '}{t("policies")}</span><div className="lw-actions"><button className="ow-button" aria-label={t("Previous page")} disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button><span>{t("Page")} {page}{' '}{t("of")} {totalPages}</span><button className="ow-button" aria-label={t("Next page")} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button></div></div>}
    </section>
    {showModal && <OperationalDialog title={editingPolicy ? t("Edit Leave Policy") : t("Add Leave Policy")} subtitle={t("Company ownership is fixed after creation.")} onClose={handleCloseModal} busy={submitting} className="lw-dialog leave-refresh-dialog leave-policy-editor">              <form onSubmit={handleSubmit} className="ph-workflow dw-form">
                <div><div className="dw-form-content">{formError && <p className="ow-feedback" role="alert">{formError}</p>}<section className="ph-section dw-section"><h3>{t("Policy & company")}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Policy Name")} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        aria-label={t("Policy Name")}
                      value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        placeholder={t("e.g., Annual Leave")}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Code")} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        aria-label={t("Code")}
                      value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        placeholder={t("e.g., AL")}
                        required
                      />
                    </div>
                  </div>
<div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Description")}</label>
                    <textarea
                      aria-label={t("Description")}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                      rows={2}
                      placeholder={t("Brief description of this leave type...")}
                    />
                  </div>
<div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Company")}</label>
                    <select
                      disabled={!!editingPolicy}
                      aria-label={t("Company")}
                      value={formData.company_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    >
                      {isSuperAdmin ? <option value="">{t("All Companies (Global)")}</option> : <option value="">{t("Select company")}</option>}
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Entitlement & eligibility")}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Default Days")}</label>
                      <input
                        type="number" step="any"
                        min="0"
                        aria-label={t("Default Days")}
                      value={formData.default_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_days: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Max Days")}</label>
                      <input
                        type="number"
                        min="1"
                        aria-label={t("Max Days")}
                      value={formData.max_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_days: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        placeholder={t("No limit")}
                      />
                      <p className="mt-1 text-xs text-gray-500">{t("Working days per request. Leave empty for no limit.")} </p>
                    </div>
                  </div>
<div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Gender Specific")}</label>
                      <select
                        aria-label={t("Gender Specific")}
                      value={formData.gender_specific}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender_specific: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                      >
                        <option value="">{t("All Genders")}</option>
                        <option value="male">{t("Male Only")}</option>
                        <option value="female">{t("Female Only")}</option>
                      </select>
                    </div>
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Carry forward")}</h3><div className="dw-fields"><div className="dw-fields">

                    <div className="dw-checks">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.carry_forward}
                          onChange={(e) => setFormData(prev => ({ ...prev, carry_forward: e.target.checked }))}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{t("Enable Carry Forward")}</span>
                      </label>
                      {formData.carry_forward && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number" step="any"
                            min="0"
                            aria-label={t("Carry forward days")}
                      value={formData.carry_forward_days}
                            onChange={(e) => setFormData(prev => ({ ...prev, carry_forward_days: Number(e.target.value) }))}
                            className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                          />
                          <span className="text-sm text-gray-500">{t("max days")}</span>
                        </div>
                      )}
                    </div>
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Policy options")}</h3><div className="dw-fields"><div className="dw-checks">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.prorate_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, prorate_enabled: e.target.checked }))}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{t("Enable Prorate")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requires_document}
                        onChange={(e) => setFormData(prev => ({ ...prev, requires_document: e.target.checked }))}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{t("Requires Document")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{t("Active")}</span>
                    </label>
                  </div></div></section></div></div>

                <div className="ph-form-actions dw-actions">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    type="submit"
                    // Re-checked on every render: access may change while the dialog is open.
                    disabled={submitting || !canManage || (!!editingPolicy && !canEdit(editingPolicy))}
                    className="ph-button ph-button-primary"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingPolicy ? t("Update Policy") : t("Create Policy")}
                  </button>
                </div>
              </form></OperationalDialog>}
  {decisionDialog}
</OperationalWorkspace>;
}
