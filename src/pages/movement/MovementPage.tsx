import { enumLabel } from '@/pages/employees/enum-labels';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { employeeMovementService } from '@/services/employee-movement.service';
import type { EmployeeMovement, CreateEmployeeMovementRequest } from '@/services/employee-movement.service';
import { companyService, type Company } from '@/services/company.service';
import { employeeService } from '@/services/employee.service';
import { departmentService } from '@/services/department.service';
import { positionService } from '@/services/position.service';
import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { collectPages } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import './movement.css';
import type { Employee, Department, Position } from '@/types';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

type MovementType = 'promotion' | 'demotion' | 'transfer' | 'mutation' | 'salary_adjustment' | 'grade_change' | 'status_change' | 'department_change' | 'position_change' | 'company_transfer';
type MovementStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'applied';

const apiErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { error?: { message?: string }; message?: string } } }).response;
  return response?.data?.error?.message || response?.data?.message || t(fallback);
};

export function MovementPage() {
  useLocale();
  const roles = useAuthStore(state => state.user?.roles);
  const canManage = roles?.some(role => ['Super Admin', 'HR Manager'].includes(role)) ?? false;
  const [loadError, setLoadError] = useState(false);
  const [optionsError, setOptionsError] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const requestVersion = useRef(0);
  const initialVersion = useRef(0);

  const [movements, setMovements] = useState<EmployeeMovement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [deleteMovement, setDeleteMovement] = useState<EmployeeMovement | null>(null);
  const [editingMovement, setEditingMovement] = useState<EmployeeMovement | null>(null);
  const [viewingMovement, setViewingMovement] = useState<EmployeeMovement | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MovementType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MovementStatus | 'all'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState<Partial<CreateEmployeeMovementRequest>>({
    employee_id: 0,
    movement_type: 'promotion',
    effective_date: '',
    new_position_id: undefined,
    new_department_id: undefined,
    new_company_id: undefined,
    new_salary: undefined,
    reason: '',
    notes: '',
  });
  const [manualJobTitle, setManualJobTitle] = useState('');
  const [useManualJobTitle, setUseManualJobTitle] = useState(false);
  const [formCompanyFilter, setFormCompanyFilter] = useState<number | null>(null);

  const movementFieldConfig: Record<string, { position: boolean; department: boolean; salary: boolean; company: boolean }> = {
    promotion:          { position: true,  department: false, salary: true,  company: false },
    demotion:           { position: true,  department: false, salary: true,  company: false },
    transfer:           { position: false, department: true,  salary: false, company: false },
    mutation:           { position: false, department: true,  salary: false, company: false },
    salary_adjustment:  { position: false, department: false, salary: true,  company: false },
    department_change:  { position: false, department: true,  salary: false, company: false },
    position_change:    { position: true,  department: false, salary: false, company: false },
    company_transfer:   { position: false, department: false, salary: false, company: true  },
  };

  const currentFieldConfig = movementFieldConfig[formData.movement_type || 'promotion'] || { position: false, department: false, salary: false, company: false };

  const fetchInitialData = useCallback(async () => {
    const version = ++initialVersion.current;
    setOptionsLoading(true); setOptionsError(false);
    try {
      const [companyRows, employeeRows, departmentRows, positionRows] = await Promise.all([
        collectPages((page, limit) => companyService.getAll({ page, limit })),
        canManage ? collectPages((page, limit) => employeeService.getAll({ page, limit, employment_status: 'active' })) : Promise.resolve([]),
        canManage ? collectPages((page, limit) => departmentService.getAll({ page, limit })) : Promise.resolve([]),
        canManage ? collectPages((page, limit) => positionService.getAll({ page, limit })) : Promise.resolve([]),
      ]);
      if (version !== initialVersion.current) return;
      setCompanies(companyRows); setEmployees(employeeRows); setDepartments(departmentRows); setPositions(positionRows);
      setSelectedCompanyId(previous => companyRows.some(c => c.id === previous) ? previous : companyRows[0]?.id ?? null);
    } catch {
      if (version === initialVersion.current) setOptionsError(true);
    } finally { if (version === initialVersion.current) { setOptionsLoading(false); } }
  }, [canManage]);

  const fetchMovements = useCallback(async () => {
    if (!selectedCompanyId) return;
    const version = ++requestVersion.current;
    setIsLoading(true); setLoadError(false); setMovements([]);
    try {
      const response = await employeeMovementService.getAll({
        page: pagination.page, limit: pagination.limit, company_id: selectedCompanyId,
        movement_type: filterType === 'all' ? undefined : filterType,
        status: filterStatus === 'all' ? undefined : filterStatus,
        search: debouncedSearch || undefined,
      });
      if (version !== requestVersion.current) return;
      setMovements(response.data);
      setPagination(prev => ({ ...prev, page: Math.min(prev.page, Math.max(1, response.pagination.totalPages)), total: response.pagination.total, totalPages: response.pagination.totalPages }));
    } catch {
      if (version === requestVersion.current) { setLoadError(true); setPagination(prev => ({ ...prev, total: 0, totalPages: 0 })); }
    } finally { if (version === requestVersion.current) setIsLoading(false); }
  }, [selectedCompanyId, pagination.page, pagination.limit, filterType, filterStatus, debouncedSearch]);

  useEffect(() => {
    void fetchInitialData();
    // Sequence counters deliberately invalidate outstanding asynchronous requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { initialVersion.current++; };
  }, [fetchInitialData]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPagination(prev => ({ ...prev, page: 1 })); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (selectedCompanyId) void fetchMovements();
    else { setMovements([]); setIsLoading(false); }
    // Sequence counters deliberately invalidate outstanding asynchronous requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { requestVersion.current++; };
  }, [selectedCompanyId, fetchMovements]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const resetForm = () => {
    setFormData({
      employee_id: 0,
      movement_type: 'promotion',
      effective_date: '',
      new_position_id: undefined,
      new_department_id: undefined,
      new_company_id: undefined,
      new_salary: undefined,
      reason: '',
      notes: '',
      new_grade: undefined,
      new_status: undefined,
    });
    setManualJobTitle('');
    setUseManualJobTitle(false);
    setFormCompanyFilter(null);
  };

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);

  const filteredPositions = selectedEmployee?.company_id
    ? positions.filter(p => p.company_id === selectedEmployee.company_id)
    : positions;

  const uniquePositions = Array.from(
    filteredPositions.reduce((map, p) => {
      const key = p.name.trim().toUpperCase();
      if (!map.has(key)) map.set(key, { value: p.id, label: p.name });
      return map;
    }, new Map<string, { value: number; label: string }>()).values()
  );

  const handleOpenModal = (movement?: EmployeeMovement) => {
    if (!canManage) return;
    if (movement) {
      setEditingMovement(movement);
      setFormData({
        employee_id: movement.employee_id,
        movement_type: movement.movement_type,
        effective_date: movement.effective_date.split('T')[0],
        new_position_id: movement.new_position_id,
        new_department_id: movement.new_department_id,
        new_company_id: movement.new_company_id,
        new_salary: movement.new_salary,
        new_grade: movement.new_grade,
        new_status: movement.new_status,
        reason: movement.reason || '',
        notes: movement.notes || '',
      });
      // If existing movement had manual name (no position_id), pre-fill manual
      if (!movement.new_position_id && movement.new_position_name) {
        setUseManualJobTitle(true);
        setManualJobTitle(movement.new_position_name);
      } else {
        setUseManualJobTitle(false);
        setManualJobTitle('');
      }
    } else {
      setEditingMovement(null);
      resetForm();
    }
    setShowModal(true);
  };

  const handleMovementTypeChange = (type: string) => {
    const config = movementFieldConfig[type] || { position: false, department: false, salary: false, company: false };
    if (!config.position) { setUseManualJobTitle(false); setManualJobTitle(''); }
    setFormData(prev => ({
      ...prev,
      movement_type: type,
      new_position_id: config.position ? prev.new_position_id : undefined,
      new_department_id: config.department ? prev.new_department_id : undefined,
      new_salary: config.salary ? prev.new_salary : undefined,
      new_company_id: config.company ? prev.new_company_id : undefined,
      new_grade: type === 'grade_change' ? prev.new_grade : undefined,
      new_status: type === 'status_change' ? prev.new_status : undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || isProcessing) return;
    if (!formData.employee_id) {
      toast.error(t("Please select an employee"), { toasterId: 'operational-dialog' });
      return;
    }
    if (!formData.effective_date) {
      toast.error(t("Please select effective date"), { toasterId: 'operational-dialog' });
      return;
    }

    const config = currentFieldConfig;
    if (config.position && !formData.new_position_id && (!useManualJobTitle || !manualJobTitle.trim())) {
      toast.error(t("Pilih posisi atau masukkan job title manual"), { toasterId: 'operational-dialog' });
      return;
    }
    if (config.department && !formData.new_department_id) {
      toast.error(t("Please select new department"), { toasterId: 'operational-dialog' });
      return;
    }
    if (config.salary && !formData.new_salary) {
      toast.error(t("Please enter new salary"), { toasterId: 'operational-dialog' });
      return;
    }
    if (config.company && !formData.new_company_id) {
      toast.error(t("Please select new company"), { toasterId: 'operational-dialog' });
      return;
    }

    setIsProcessing(true);
    try {
      const data: CreateEmployeeMovementRequest = {
        employee_id: formData.employee_id!,
        company_id: selectedEmployee?.company_id || selectedCompanyId || undefined,
        movement_type: formData.movement_type!,
        effective_date: formData.effective_date!,
        new_position_id: useManualJobTitle ? undefined : formData.new_position_id,
        new_position_name: config.position && useManualJobTitle ? manualJobTitle.trim() : undefined,
        new_department_id: formData.new_department_id,
        new_company_id: formData.new_company_id,
        new_salary: formData.new_salary,
        new_grade: formData.new_grade,
        new_status: formData.new_status,
        reason: formData.reason,
        notes: formData.notes,
      };

      if (editingMovement) {
        await employeeMovementService.update(editingMovement.id, data);
        toast.success(t("Movement updated successfully"));
      } else {
        await employeeMovementService.create(data);
        toast.success(t("Movement created successfully"));
        // Auto-switch list filter to the employee's company
        if (selectedEmployee?.company_id && selectedEmployee.company_id !== selectedCompanyId) {
          setSelectedCompanyId(selectedEmployee.company_id);
        }
      }
      setShowModal(false);
      resetForm();
      fetchMovements();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to save movement'), { id: 'movement-error', toasterId: 'operational-dialog' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (movement: EmployeeMovement) => {
    if (!canManage || isProcessing) return;
    setIsProcessing(true);
    try {
      await employeeMovementService.approve(movement.id);
      toast.success(t('Movement for {name} has been approved', { name: movement.employee?.name || t('Unknown employee') }));
      fetchMovements();
      setShowDetailModal(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to approve movement'), { id: 'movement-error', toasterId: 'operational-dialog' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!canManage || isProcessing) return;
    if (!viewingMovement || !rejectReason.trim()) {
      toast.error(t("Please provide rejection reason"), { toasterId: 'operational-dialog' });
      return;
    }
    setIsProcessing(true);
    try {
      await employeeMovementService.reject(viewingMovement.id, rejectReason);
      toast.success(t('Movement for {name} has been rejected', { name: viewingMovement.employee?.name || t('Unknown employee') }));
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
      fetchMovements();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to reject movement'), { id: 'movement-error', toasterId: 'operational-dialog' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async (movement: EmployeeMovement) => {
    if (!canManage || isProcessing) return;
    setIsProcessing(true);
    try {
      await employeeMovementService.apply(movement.id);
      toast.success(t('Movement for {name} has been applied to employee data', { name: movement.employee?.name || t('Unknown employee') }));
      fetchMovements();
      setShowDetailModal(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to apply movement'), { id: 'movement-error', toasterId: 'operational-dialog' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (movement: EmployeeMovement) => {
    if (!canManage || isProcessing) return;
    setIsProcessing(true);
    try {
      await employeeMovementService.delete(movement.id);
      toast.success(t("Movement deleted successfully"));
      setDeleteMovement(null);
      fetchMovements();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to delete movement'), { id: 'movement-error', toasterId: 'operational-dialog' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailModal = (movement: EmployeeMovement) => {
    setViewingMovement(movement);
    setShowDetailModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const movementTypes = ['promotion', 'demotion', 'transfer', 'mutation', 'salary_adjustment', 'grade_change', 'status_change', 'department_change', 'position_change', 'company_transfer'] as const;
  const label = enumLabel;
  const changeCompany = (value: string) => { setSelectedCompanyId(value ? Number(value) : null); setPagination(prev => ({ ...prev, page: 1 })); };
  const renderState = (movement: EmployeeMovement, side: 'previous' | 'new') => <div className="movement-state">
    <strong>{movement[`${side}_position_name`] || movement[`${side}_department_name`] || movement[`${side}_company_name`] || movement[`${side}_grade`] || enumLabel(movement[`${side}_status`])}</strong>
    {movement[`${side}_position_name`] && movement[`${side}_department_name`] && <span>{movement[`${side}_department_name`]}</span>}
    {movement[`${side}_company_name`] && <span>{movement[`${side}_company_name`]}</span>}
    {movement[`${side}_salary`] != null && <span>{formatCurrency(Number(movement[`${side}_salary`]))}</span>}
  </div>;
  return <OperationalWorkspace module="operations" title={t("Employee Movement")} description={t("Review employment changes, effective dates and recorded decisions.")} className="movement-workspace"
    actions={canManage && <button className="ow-button ow-primary" onClick={() => handleOpenModal()} disabled={optionsLoading || optionsError || !companies.length}>{t("New Movement")}</button>}
    filters={<>
      <label className="movement-search"><input aria-label={t("Search movements")} placeholder={t("Search employee, ID or reason...")} value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label className="ow-field">{t("Company")}<select value={selectedCompanyId || ''} onChange={e => changeCompany(e.target.value)} disabled={optionsLoading || optionsError}><option value="" disabled>{optionsLoading ? t("Loading companies...") : t("Select company")}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {optionsError && <p role="alert">{t("Unable to load company or form options.")} <button className="ow-button" onClick={() => void fetchInitialData()}>{t("Retry options")}</button></p>}
      <label className="ow-field">{t("Movement type")}<select value={filterType} onChange={e => { setFilterType(e.target.value as MovementType | 'all'); setPagination(prev => ({ ...prev, page: 1 })); }}><option value="all">{t("All types")}</option>{movementTypes.map(type => <option key={type} value={type}>{label(type)}</option>)}</select></label>
      <label className="ow-field">{t("Status")}<select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as MovementStatus | 'all'); setPagination(prev => ({ ...prev, page: 1 })); }}><option value="all">{t("All statuses")}</option>{['pending', 'approved', 'rejected', 'cancelled', 'applied'].map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
      <details className="movement-note"><summary>{t("How movements are applied")}</summary><p>{t("Approved movements are applied separately. Review the effective date and requested changes before applying.")}</p></details>
      <button className="ow-button" onClick={() => { setFilterType('all'); setFilterStatus('all'); setSearch(''); setPagination(prev => ({ ...prev, page: 1 })); }}>{t("Reset filters")}</button>
    </>}
  >
    <section className="ow-register" aria-label={t('{company} movements', { company: selectedCompany?.name || t('Company') })}>
      <div className="ow-toolbar movement-toolbar"><p>{isLoading ? t("Loading records...") : t('{count} matching movements', { count: pagination.total.toLocaleString(intlLocale()) })}</p><button className="ow-button" onClick={() => void fetchMovements()} disabled={isLoading || !selectedCompanyId}>{t("Refresh")}</button></div>
      {isLoading || optionsLoading ? <div className="ow-feedback" role="status">{t("Loading movements...")}</div> : loadError ? <div className="ow-feedback" role="alert">{t("Unable to load movements.")} <button className="ow-button" onClick={() => void fetchMovements()}>{t("Retry movements")}</button></div> : !selectedCompanyId ? <div className="ow-feedback">{optionsError ? t("Retry loading companies to open the register.") : t("No accessible companies available.")}</div> : !movements.length ? <div className="ow-feedback"><h3>{t("No movements found")}</h3><p>{t("Adjust the filters to see other employment changes.")}</p></div> : <div>
        <div className="movement-columns" aria-hidden="true"><span>{t("Employee")}</span><span>{t("Previous")}</span><span>{t("Requested change")}</span><span>{t("Effective date")}</span><span>{t("Status / actions")}</span></div>
        {movements.map(movement => <article className="movement-record" data-movement-record key={movement.id}>
          <div className="movement-person"><h3>{movement.employee?.name || t('Unknown employee')}</h3><p>{movement.employee?.employee_id || '-'}</p><span>{label(movement.movement_type)}</span></div>
          <div><span className="movement-mobile-label">{t("Previous")}</span>{renderState(movement, 'previous')}</div><div><span className="movement-mobile-label">{t("Requested change")}</span>{renderState(movement, 'new')}</div>
          <div className="movement-effective"><span className="movement-mobile-label">{t("Effective date")}</span><time dateTime={movement.effective_date}>{formatDate(movement.effective_date)}</time></div>
          <div className="movement-actions"><span className="ow-status" data-status={movement.status}>{label(movement.status)}</span><button className="ow-button" onClick={() => openDetailModal(movement)}>{t("Review")}</button>{canManage && movement.status === 'pending' && <div><button onClick={() => handleOpenModal(movement)}>{t("Edit")}</button><button disabled={isProcessing} onClick={() => setDeleteMovement(movement)}>{t("Delete")}</button></div>}</div>
        </article>)}
      </div>}
      {!loadError && <div className="ow-pagination"><span>{t("Page")} {pagination.page.toLocaleString(intlLocale())}{' '}{t("of")} {Math.max(1, pagination.totalPages).toLocaleString(intlLocale())}</span><div><button className="ow-button" disabled={isLoading || pagination.page <= 1} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>{t("Previous")}</button><button className="ow-button" disabled={isLoading || pagination.page >= pagination.totalPages} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>{t("Next")}</button></div></div>}
    </section>
    {showModal && canManage && <OperationalDialog title={editingMovement ? t("Edit Movement") : t("New Movement")} subtitle={t("Choose the employee, effective date and employment changes.")} onClose={() => { if (!isProcessing) setShowModal(false); }} busy={isProcessing} className="movement-dialog movement-editor ph-workflow operations-refresh-dialog">
              <form onSubmit={handleSubmit} className="movement-form ow-dialog-body">
                <section className="ops-movement-section movement-employee-fields"><h3>{t("Employee and timing")}</h3>
                {/* Company Filter */}
                {!editingMovement && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Filter by Company")}</label>
                    <select
                      aria-label={t("Filter by Company")}
                      value={formCompanyFilter || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setFormCompanyFilter(val);
                        setFormData(prev => ({ ...prev, employee_id: 0, new_position_id: undefined, new_department_id: undefined }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{t("All Companies")}</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Employee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Employee")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={(formCompanyFilter
                      ? employees.filter(e => e.company_id === formCompanyFilter)
                      : employees
                    ).map(e => ({
                      value: e.id,
                      label: `${e.name} (${e.employee_id})`,
                    }))}
                    value={formData.employee_id || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, employee_id: Number(value), new_position_id: undefined, new_department_id: undefined }))}
                    placeholder={t("Select employee...")}
                    disabled={!!editingMovement}
                  />
                </div>

                <div className="ph-form-grid">
                  {/* Movement Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Movement Type")} <span className="text-red-500">*</span>
                    </label>
                    <select
                      aria-label={t("Movement Type")}
                      value={formData.movement_type}
                      onChange={(e) => handleMovementTypeChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    >
                      <option value="promotion">{t("Promotion")}</option>
                      <option value="demotion">{t("Demotion")}</option>
                      <option value="transfer">{t("Transfer")}</option>
                      <option value="mutation">{t("Mutation")}</option>
                      <option value="salary_adjustment">{t("Salary Adjustment")}</option>
                      <option value="company_transfer">{t("Company Transfer")}</option><option value="department_change">{t("Department Change")}</option><option value="position_change">{t("Position Change")}</option><option value="grade_change">{t("Grade Change")}</option><option value="status_change">{t("Status Change")}</option>
                    </select>
                  </div>

                  {/* Effective Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Effective Date")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date" aria-label={t("Effective Date")}
                      value={formData.effective_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                </section><section className="ops-movement-section"><h3>{t("Requested change")}</h3>
                {/* New Position */}
                {currentFieldConfig.position && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">{t("New Position")} <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        {(formData.movement_type === 'promotion' || formData.movement_type === 'demotion') && selectedEmployee?.job_title && (
                          <span className="text-xs text-gray-500">{t("Current:")} <span className="font-semibold text-indigo-600">{selectedEmployee.job_title}</span>
                          </span>
                        )}
                      <button
                        type="button"
                        onClick={() => {
                          setUseManualJobTitle(prev => !prev);
                          setManualJobTitle('');
                          setFormData(prev => ({ ...prev, new_position_id: undefined }));
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {useManualJobTitle ? t("Pilih dari daftar") : t("Tidak ada? Isi manual")}
                      </button>
                      </div>
                    </div>
                    {useManualJobTitle ? (
                      <input
                        type="text"
                        aria-label={t("Manual job title")} value={manualJobTitle}
                        onChange={(e) => setManualJobTitle(e.target.value)}
                        placeholder={t("Masukkan job title...")}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <SearchableSelect
                        options={uniquePositions}
                        value={formData.new_position_id || ''}
                        onChange={(value) => setFormData(prev => ({ ...prev, new_position_id: value ? Number(value) : undefined }))}
                        placeholder={selectedEmployee ? t("Select new position...") : t("Pilih employee dulu")}
                      />
                    )}
                  </div>
                )}

                {/* New Department */}
                {currentFieldConfig.department && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("New Department")} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={departments.filter(d => !d.company_id || d.company_id === selectedEmployee?.company_id).map(d => ({ value: d.id, label: d.name }))}
                      value={formData.new_department_id || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, new_department_id: value ? Number(value) : undefined }))}
                      placeholder={t("Select new department...")}
                    />
                  </div>
                )}

                {/* New Company */}
                {currentFieldConfig.company && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("New Company")} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={companies.map(c => ({ value: c.id, label: c.name }))}
                      value={formData.new_company_id || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, new_company_id: value ? Number(value) : undefined }))}
                      placeholder={t("Select new company...")}
                    />
                  </div>
                )}

                {/* New Salary */}
                {currentFieldConfig.salary && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {formData.movement_type === 'demotion' ? t("Reduced Salary") : formData.movement_type === 'promotion' ? t("Increased Salary") : t("New Salary")} <span className="text-red-500">*</span>
                      </label>
                      {selectedEmployee?.basic_salary ? (
                        <span className="text-xs text-gray-500">{t("Current salary:")} <span className="font-semibold text-indigo-600">{formatCurrency(selectedEmployee.basic_salary)}</span>
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">{t("Rp")}</span>
                      <input
                        type="text"
                        aria-label={t("New Salary")} value={formData.new_salary ? Number(formData.new_salary).toLocaleString(intlLocale()) : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                          setFormData(prev => ({ ...prev, new_salary: raw ? Number(raw) : undefined }));
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          formData.movement_type === 'demotion' && formData.new_salary && selectedEmployee?.basic_salary && formData.new_salary >= selectedEmployee.basic_salary
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    {formData.movement_type === 'demotion' && formData.new_salary && selectedEmployee?.basic_salary && formData.new_salary >= selectedEmployee.basic_salary && (
                      <p className="text-xs text-red-500 mt-1">{t("Demotion salary must be lower than current salary")}</p>
                    )}
                  </div>
                )}

                {formData.movement_type === 'grade_change' && <label className="ow-field">{t("New grade")}<input value={formData.new_grade || ''} onChange={e => setFormData(prev => ({ ...prev, new_grade: e.target.value }))} required /></label>}
                {formData.movement_type === 'status_change' && <label className="ow-field">{t("New status")}<input value={formData.new_status || ''} onChange={e => setFormData(prev => ({ ...prev, new_status: e.target.value }))} required /></label>}
                </section><section className="ops-movement-section"><h3>{t("Supporting information")}</h3>
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Reason")} </label>
                  <textarea
                    aria-label={t("Reason")} value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder={t("Reason for movement...")}
                    rows={3}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Notes")} </label>
                  <textarea
                    aria-label={t("Notes")} value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder={t("Additional notes...")}
                    rows={2}
                  />
                </div>

                </section><div className="ph-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >{t("Cancel")} </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="ow-button ow-primary"
                  >
                    {isProcessing ? t("Saving...") : editingMovement ? t("Update") : t("Create")}
                  </button>
                </div>
              </form>
    </OperationalDialog>}
    {showDetailModal && viewingMovement && !showRejectModal && <OperationalDialog title={t("Movement Details")} subtitle={viewingMovement.employee?.name} onClose={() => { if (!isProcessing) setShowDetailModal(false); }} busy={isProcessing} className="movement-dialog ph-workflow operations-refresh-dialog">
      <div className="ow-dialog-body"><div className="movement-detail-meta"><span>{label(viewingMovement.movement_type)}</span><span className="ow-status" data-status={viewingMovement.status}>{label(viewingMovement.status)}</span></div>
      <div className="movement-comparison"><section><h3>{t("Previous")}</h3>{renderState(viewingMovement, 'previous')}</section><section><h3>{t("Requested change")}</h3>{renderState(viewingMovement, 'new')}</section></div>
      <dl className="movement-detail"><dt>{t("Effective date")}</dt><dd>{formatDate(viewingMovement.effective_date)}</dd>{viewingMovement.salary_change != null && <><dt>{t("Salary change")}</dt><dd>{formatCurrency(Number(viewingMovement.salary_change))}{viewingMovement.salary_change_percentage != null && ` (${Number(viewingMovement.salary_change_percentage).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)`}</dd></>}{viewingMovement.approver && <><dt>{t("Approved by")}</dt><dd>{viewingMovement.approver.name}{viewingMovement.approved_at && ` / ${formatDate(viewingMovement.approved_at)}`}</dd></>}<dt>{t("Reason")}</dt><dd>{viewingMovement.reason || '-'}</dd>{viewingMovement.notes && <><dt>{t("Notes")}</dt><dd>{viewingMovement.notes}</dd></>}{viewingMovement.rejection_reason && <><dt>{t("Rejection reason")}</dt><dd>{viewingMovement.rejection_reason}</dd></>}</dl>
      <div className="movement-dialog-actions"><button className="ow-button" disabled={isProcessing} onClick={() => setShowDetailModal(false)}>{t("Close")}</button>{canManage && viewingMovement.status === 'pending' && <><button className="ow-button" disabled={isProcessing} onClick={() => { setRejectReason(''); setShowRejectModal(true); }}>{t("Reject")}</button><button className="ow-button ow-primary" disabled={isProcessing} onClick={() => void handleApprove(viewingMovement)}>{t("Approve")}</button></>}{canManage && viewingMovement.status === 'approved' && !viewingMovement.is_applied && <button className="ow-button ow-primary" disabled={isProcessing} onClick={() => void handleApply(viewingMovement)}>{t("Apply to Employee")}</button>}</div>
      </div>
    </OperationalDialog>}
    {showRejectModal && viewingMovement && canManage && <OperationalDialog title={t("Reject Movement?")} subtitle={viewingMovement.employee?.name} onClose={() => { if (!isProcessing) setShowRejectModal(false); }} busy={isProcessing} className="movement-dialog ph-workflow operations-refresh-dialog"><div className="ow-dialog-body"><label className="ow-field">{t("Rejection Reason")}<textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} required /></label><div className="movement-dialog-actions"><button className="ow-button" disabled={isProcessing} onClick={() => setShowRejectModal(false)}>{t("Cancel")}</button><button className="ow-button ow-primary" disabled={isProcessing || !rejectReason.trim()} onClick={() => void handleReject()}>{t("Reject")}</button></div></div></OperationalDialog>}
    {deleteMovement && canManage && <OperationalDialog title={t("Delete Movement?")} subtitle={deleteMovement.employee?.name} onClose={() => { if (!isProcessing) setDeleteMovement(null); }} busy={isProcessing} className="movement-dialog ph-workflow operations-refresh-dialog"><div className="ow-dialog-body"><p>{t("Are you sure you want to delete this movement?")}</p><div className="ph-form-actions"><button className="ow-button" disabled={isProcessing} onClick={() => setDeleteMovement(null)}>{t("Cancel")}</button><button className="ow-button ops-danger" disabled={isProcessing} onClick={() => void handleDelete(deleteMovement)}>{isProcessing ? t("Deleting...") : t("Delete")}</button></div></div></OperationalDialog>}
  </OperationalWorkspace>;
}
