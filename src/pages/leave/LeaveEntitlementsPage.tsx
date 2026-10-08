import { quantity } from '@/components/leave/presentation';
import { getLocale, t, useLocale } from '@/i18n';
import '@/pages/leave/domain-workflows.css';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import toast from 'react-hot-toast';
import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { collectPages } from '@/services/master-data';
import api from '@/services/api';
import './leave-workspace.css';
import './leave-refresh.css';
import { Search, Download, Loader2, ChevronLeft, ChevronRight, Eye, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';
import { leaveService, type LeaveAllocationRequest, type LeaveAllocationResult } from '../../services/leave.service';
import { AllocationPreview } from '@/components/leave/AllocationPreview';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { departmentService } from '../../services/department.service';
import type { LeaveType, PaginatedResponse } from '@/types';

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  company_id?: number;
  company?: Company;
  department?: {
    id: number;
    name: string;
  };
  position?: {
    id: number;
    name: string;
  };
  join_date?: string;
  probation_end_date?: string;
  employment_status?: string;
}

// Local interface for balance display that matches what we render
interface LocalLeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  leaveType?: LeaveType;
}

interface EmployeeEntitlement {
  employee: Employee;
  balances: LocalLeaveBalance[];
}

/** Filters captured when the export dialog opens, plus the export-only year and status. */
interface ExportDraft {
  companyId?: number;
  companyName?: string;
  departmentId?: number;
  departmentName?: string;
  search?: string;
  year: number;
  employmentStatus: 'all' | 'active';
}

export function LeaveEntitlementsPage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  // Existing role ceiling AND the covered leave.administer action.
  const canAllocate = (user?.roles ?? []).some(role => ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'].includes(role))
    && canAction(user, 'leave.administer');
  const [loadError, setLoadError] = useState(false);
  const [optionError, setOptionError] = useState(false);
  const [typesLoaded, setTypesLoaded] = useState(false);
  const [matrixType, setMatrixType] = useState('');
  const requestSequence = useRef(0);
  const departmentSequence = useRef(0);
  const [leaveTypes, setLeaveTypes] = useState<(LeaveType & { company_id?: number | null })[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [entitlements, setEntitlements] = useState<EmployeeEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeEntitlement | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showBulkAllocateModal, setShowBulkAllocateModal] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    employee_id: 0,
    leave_type_id: 0,
  });
  const [allocationRequest, setAllocationRequest] = useState<LeaveAllocationRequest | null>(null);
  const [previewState, setPreviewState] = useState<{
    request: LeaveAllocationRequest; result: LeaveAllocationResult | null; error: boolean;
  } | null>(null);
  const [previewRetry, setPreviewRetry] = useState(0);
  const allocationPreview = previewState?.request === allocationRequest ? previewState?.result ?? null : null;
  const previewError = previewState?.request === allocationRequest && previewState?.error === true;

  useEffect(() => {
    if (!allocationRequest) return;
    let cancelled = false;
    setPreviewState(null);
    leaveService.allocateDefaults({ ...allocationRequest, dry_run: true }).then(result => {
      if (!cancelled) setPreviewState({ request: allocationRequest, result, error: false });
    }).catch(() => {
      if (!cancelled) setPreviewState({ request: allocationRequest, result: null, error: true });
    });
    return () => { cancelled = true; };
  }, [allocationRequest, previewRetry]);
  const currentYear = new Date().getFullYear();
  const exportYears = Array.from({ length: 7 }, (_, index) => currentYear + 1 - index);
  const [exportDraft, setExportDraft] = useState<ExportDraft | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const exportInFlight = useRef(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Fetch leave types
  const fetchLeaveTypes = useCallback(async () => {
    try {
      const types = await collectPages(async (page, limit) =>
        (await api.get<PaginatedResponse<LeaveType>>('/leaves/types', { params: { page, limit } })).data);
      setLeaveTypes(types); setTypesLoaded(true);
      setMatrixType(current => current || String(types[0]?.id ?? ''));
    } catch (error) {
      setOptionError(true); setLoading(false);
      console.error('Failed to fetch leave types:', error);
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

  // Fetch employees with their leave balances
  const fetchEntitlements = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setLoadError(false);
    try {
      const params: { page: number; limit: number; search?: string; company_id?: number; department_id?: number; employment_status?: string } = {
        page,
        limit,
        employment_status: 'active'
      };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (filterCompany !== 'all') {
        params.company_id = Number(filterCompany);
      }
      if (filterDepartment !== 'all') {
        params.department_id = Number(filterDepartment);
      }

      // Fetch employees (only active)
      const response = await employeeService.getAll(params);

      // Fetch real leave balances from backend
      const balanceParams: { company_id?: number; year: number } = {
        year: new Date().getFullYear(),
      };
      if (filterCompany !== 'all') {
        balanceParams.company_id = Number(filterCompany);
      }

      // A failed balance request is an error, never a zero balance.
      const balancesResponse = await leaveService.getBalances(balanceParams);
      if (sequence !== requestSequence.current) return;
      const allBalances: LocalLeaveBalance[] = balancesResponse.map(b => ({ ...b,
        allocated_days: Number(b.allocated_days), used_days: Number(b.used_days),
        pending_days: Number(b.pending_days), remaining_days: Number(b.remaining_days),
      }));
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total ?? response.data.length);

      // Group balances by employee
      const balancesByEmployee = new Map<number, LocalLeaveBalance[]>();
      for (const balance of allBalances) {
        if (!balancesByEmployee.has(balance.employee_id)) {
          balancesByEmployee.set(balance.employee_id, []);
        }
        balancesByEmployee.get(balance.employee_id)!.push(balance);
      }

      // Build entitlements. Missing allocations render as a dash, never a real zero balance.
      const realEntitlements: EmployeeEntitlement[] = response.data.map(emp => {
        const empBalances = balancesByEmployee.get(emp.id) || [];

        // For each leave type, find balance or create empty one
        const balances: LocalLeaveBalance[] = leaveTypes.filter(type => type.company_id == null || type.company_id === emp.company_id || empBalances.some(balance => balance.leave_type_id === type.id)).map(type => {
          const existingBalance = empBalances.find(b => b.leave_type_id === type.id);
          if (existingBalance) {
            return {
              ...existingBalance,
              leaveType: type,
            };
          }
          // The id=0 marker represents an unallocated policy, not a stored balance.
          return {
            id: 0,
            employee_id: emp.id,
            leave_type_id: type.id,
            leaveType: type,
            allocated_days: 0,
            used_days: 0,
            pending_days: 0,
            remaining_days: 0,
            year: new Date().getFullYear(),
          };
        });

        return {
          employee: {
            id: emp.id,
            name: emp.name,
            employee_id: emp.employee_id || '',
            company_id: emp.company_id,
            company: emp.company || undefined,
            department: emp.department || undefined,
            position: emp.position || undefined,
            join_date: emp.join_date,
            probation_end_date: emp.probation_end_date ?? undefined,
            employment_status: emp.employment_status ?? undefined,
          },
          balances,
        };
      });

      setEntitlements(realEntitlements);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setEntitlements([]); setLoadError(true);
      console.error('Failed to fetch entitlements:', error);
      toast.error(t("Failed to load employee entitlements"));
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [page, debouncedSearch, filterCompany, filterDepartment, leaveTypes]);

  // Fetch departments
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const fetchDepartments = useCallback(async () => {
    const sequence = ++departmentSequence.current;
    try {
      const params: { limit: number; company_id?: number } = { limit: 200 };
      if (filterCompany !== 'all') {
        params.company_id = Number(filterCompany);
      }
      const rows = await collectPages((page, limit) => departmentService.getAll({ ...params, page, limit }));
      if (sequence !== departmentSequence.current) return;
      setDepartments(rows.map(d => ({ id: d.id, name: d.name })));
    } catch (error) {
      if (sequence !== departmentSequence.current) return;
      setDepartments([]); setOptionError(true);
      console.error('Failed to fetch departments:', error);
    }
  }, [filterCompany]);

  useEffect(() => {
    fetchCompanies();
    fetchLeaveTypes();
  }, [fetchCompanies, fetchLeaveTypes]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (typesLoaded) {
      fetchEntitlements();
    }
  }, [fetchEntitlements, typesLoaded]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCompany, filterDepartment]);

  // Define custom sort order for companies based on employee_id prefix
  // PFI (Path Finder), GDI (Growpath), LFS (Lampung Farm), UOR (UOR Kreatif), BCI (Buka Cerita), PDR (Pilar Dana)
  const COMPANY_ORDER = useMemo(() => ['PFI', 'GDI', 'LFS', 'UOR', 'BCI', 'PDR'], []);

  // Helper function to extract company prefix from employee_id
  // Format: "PFI-GDI-2500014" -> company is "GDI" (second part)
  // Format: "PFI-001" -> company is "PFI" (first part, old format)
  const getEmployeePrefix = (employeeId: string | undefined): string => {
    if (!employeeId) return '';
    const parts = employeeId.toUpperCase().split('-');
    // If format is PFI-XXX-YYYY, company is the second part (XXX)
    if (parts.length >= 3) {
      return parts[1];
    }
    // If format is XXX-YYYY, company is the first part (XXX)
    if (parts.length >= 2) {
      return parts[0];
    }
    return '';
  };

  // Helper function to extract numeric part from employee_id (e.g., "PFI-GDI-2500014" -> 2500014)
  const getEmployeeNumber = (employeeId: string | undefined): number => {
    if (!employeeId) return Infinity;
    const match = employeeId.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : Infinity;
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Sort entitlements by company order
  const filteredEntitlements = useMemo(() => {
    let result = entitlements;

    // Sort by employee_id prefix order: PFI, GDI, LFS, BCI, then others
    result = [...result].sort((a, b) => {
      const prefixA = getEmployeePrefix(a.employee.employee_id);
      const prefixB = getEmployeePrefix(b.employee.employee_id);

      const indexA = COMPANY_ORDER.indexOf(prefixA);
      const indexB = COMPANY_ORDER.indexOf(prefixB);

      // If both are in the order list, sort by their position, then by employee number
      if (indexA !== -1 && indexB !== -1) {
        if (indexA !== indexB) return indexA - indexB;
        // Same prefix, sort by numeric part (PFI-001 before PFI-002)
        return getEmployeeNumber(a.employee.employee_id) - getEmployeeNumber(b.employee.employee_id);
      }
      // If only a is in the order list, it comes first
      if (indexA !== -1) return -1;
      // If only b is in the order list, it comes first
      if (indexB !== -1) return 1;
      // If neither is in the order list, sort by prefix first, then by number
      if (prefixA !== prefixB) {
        return prefixA.localeCompare(prefixB);
      }
      return getEmployeeNumber(a.employee.employee_id) - getEmployeeNumber(b.employee.employee_id);
    });

    return result;
  }, [entitlements, COMPANY_ORDER]);

  // Stats
  const stats = useMemo(() => {
    const totalAllocated = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.allocated_days || 0), 0), 0);
    const totalUsed = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.used_days || 0), 0), 0);
    const totalPending = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.pending_days || 0), 0), 0);
    const totalRemaining = entitlements.reduce((acc, e) =>
      acc + e.balances.reduce((sum, b) => sum + (b.remaining_days || 0), 0), 0);

    return {
      totalEmployees: totalItems,
      totalAllocated,
      totalUsed,
      totalPending,
      totalRemaining,
    };
  }, [entitlements, totalItems]);

  const handleViewDetail = (entitlement: EmployeeEntitlement) => {
    setSelectedEmployee(entitlement);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEmployee(null);
  };

  const handleOpenAllocate = (entitlement: EmployeeEntitlement) => {
    setSelectedEmployee(entitlement);
    if (!canAllocate) return;
    const typeId = leaveTypes.find(type => type.is_active !== false && (type.company_id == null || type.company_id === entitlement.employee.company_id))?.id || 0;
    setAllocateForm({ employee_id: entitlement.employee.id, leave_type_id: typeId });
    setAllocationRequest(typeId ? { employee_id: entitlement.employee.id, leave_type_ids: [typeId], dry_run: true } : null);
    setShowAllocateModal(true);
  };

  const handleCloseAllocateModal = () => {
    if (allocating) return;
    setShowAllocateModal(false);
    setAllocationRequest(null);
    setSelectedEmployee(null);
  };

  const handleCloseBulkAllocateModal = () => {
    if (allocating) return;
    setShowBulkAllocateModal(false);
    setAllocationRequest(null);
  };

  const handleBulkAllocate = () => {
    if (!canAllocate) return;
    // Snapshot visible filters. The server selects all matching employees,
    // without the old 1,000-row browser fetch limit or browser salary/date math.
    setAllocationRequest({
      dry_run: true,
      ...(filterCompany !== 'all' ? { company_id: Number(filterCompany) } : {}),
      ...(filterDepartment !== 'all' ? { department_id: Number(filterDepartment) } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    });
    setShowBulkAllocateModal(true);
  };

  const confirmAllocation = async () => {
    if (!canAllocate || allocating || !allocationRequest || !allocationPreview?.created) return;
    setAllocating(true);
    try {
      // Re-evaluate on apply: balances/history may have changed after preview.
      const result = await leaveService.allocateDefaults({ ...allocationRequest, year: allocationPreview.year, dry_run: false });
      toast.success(
        t('Allocated {created} balances. Skipped {skipped}.', { created: result.created, skipped: result.skippedBalanceExists + result.skippedHasLeaveHistory + result.skippedNotEntitledThisYear }),
      );
      setShowAllocateModal(false);
      setShowBulkAllocateModal(false);
      setAllocationRequest(null);
      setSelectedEmployee(null);
      await fetchEntitlements();
    } catch {
      toast.error(t("Allocation could not finish. Refreshing the preview before retry."), { id: 'api-error' });
      setPreviewState(null);
      setPreviewRetry(value => value + 1);
    } finally {
      setAllocating(false);
    }
  };

  // Excel export of ALL matching employees (server-side, every page and leave type). The visible
  // filters are snapshotted when the dialog opens, so later table changes cannot alter what the
  // dialog describes. The export year and status are export-only: the table year and allocation
  // state are not touched.
  const openExport = () => {
    const trimmed = search.trim();
    setExportError(false);
    setExportDraft({
      ...(filterCompany !== 'all' ? { companyId: Number(filterCompany), companyName: companies.find(company => String(company.id) === filterCompany)?.name ?? `#${filterCompany}` } : {}),
      ...(filterDepartment !== 'all' ? { departmentId: Number(filterDepartment), departmentName: departments.find(department => String(department.id) === filterDepartment)?.name ?? `#${filterDepartment}` } : {}),
      ...(trimmed ? { search: trimmed } : {}),
      year: currentYear,
      employmentStatus: 'all',
    });
  };

  const closeExport = () => {
    if (exportInFlight.current) return;
    setExportDraft(null);
    setExportError(false);
  };

  const runExport = async () => {
    if (!exportDraft || exportInFlight.current) return;
    exportInFlight.current = true;
    setExporting(true);
    setExportError(false);
    let url: string | null = null;
    try {
      const blob = await leaveService.exportBalances({
        year: exportDraft.year,
        employment_status: exportDraft.employmentStatus,
        locale: getLocale(),
        ...(exportDraft.companyId !== undefined ? { company_id: exportDraft.companyId } : {}),
        ...(exportDraft.departmentId !== undefined ? { department_id: exportDraft.departmentId } : {}),
        ...(exportDraft.search ? { search: exportDraft.search } : {}),
      });
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leave-entitlements-${exportDraft.year}-${exportDraft.employmentStatus}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('Leave entitlements Excel downloaded.'));
      setExportDraft(null);
    } catch {
      setExportError(true);
    } finally {
      // Released after the click has started the download.
      if (url) { const objectUrl = url; window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0); }
      exportInFlight.current = false;
      setExporting(false);
    }
  };

  const allocationTypes = leaveTypes.filter(type => type.is_active !== false && (type.company_id == null || type.company_id === selectedEmployee?.employee.company_id));

  return <OperationalWorkspace module="leave" title={t("Leave Entitlements")} description={t('Employee leave balances and allocations for {year}.', { year: new Date().getFullYear() })} className="lw-page"
    actions={<><button className="ow-button" onClick={fetchEntitlements} disabled={loading}><RefreshCw size={16} />{t("Refresh")}</button><button className="ow-button" onClick={openExport} disabled={exporting}><Download size={16} />{t('Export Excel')}</button>{canAllocate && <button className="ow-button ow-primary" onClick={handleBulkAllocate} disabled={allocating || loading || loadError || optionError || !entitlements.length || !leaveTypes.length}><Plus size={16} />{t("Bulk Allocate")}</button>}</>}
    filters={<><label className="ow-field">{t("Company")}<select aria-label={t("Company filter")} value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setFilterDepartment('all'); setPage(1); }}><option value="all">{t("All assigned companies")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label className="ow-field">{t("Department")}<select aria-label={t("Department filter")} value={filterDepartment} onChange={e => { setFilterDepartment(e.target.value); setPage(1); }}><option value="all">{t("All departments")}</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label className="ow-field">{t("Displayed leave type")}<select aria-label={t("Displayed leave type")} value={matrixType} onChange={e => setMatrixType(e.target.value)}>{!leaveTypes.length && <option value="">{t("No leave types")}</option>}{leaveTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><button className="ow-button" onClick={() => { setFilterCompany('all'); setFilterDepartment('all'); setSearch(''); setPage(1); }}>{t("Reset filters")}</button><details className="lw-help"><summary>{t("About allocation")}</summary><p>{t("Allocation previews follow employee eligibility. Existing balances and leave history are skipped.")}</p></details></>}
    >
    {optionError && <p className="ow-feedback" role="alert">{t("Unable to load filter options.")} <button onClick={() => { setOptionError(false); fetchCompanies(); fetchLeaveTypes(); fetchDepartments(); }}>{t("Retry options")}</button></p>}
    <section className="ow-register"><div className="lw-register-tools"><p className="lw-note">{t("Pending requests reserve part of the remaining balance.")}</p><label className="lw-search"><Search size={17} /><input aria-label={t("Search employees")} placeholder={t("Search by employee name, ID...")} value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      {loading ? <div className="lw-empty" role="status"><Loader2 className="animate-spin" />{t("Loading balances…")}</div> : loadError ? <div className="lw-empty" role="alert">{t("Unable to load employee balances.")}<button className="ow-button" onClick={fetchEntitlements}>{t("Retry balances")}</button></div> : !filteredEntitlements.length ? <div className="lw-empty"><h3>{t("No employees found")}</h3><p>{t("Adjust the company, department or search.")}</p></div> : <div className="lw-table-wrap"><table className="ow-table lw-records lw-matrix"><thead><tr><th>{t("Employee")}</th><th>{t("Allocated")}</th><th>{t("Used")}</th><th>{t("Pending")}</th><th>{t("Remaining balance")}</th><th>{t("Actions")}</th></tr></thead><tbody>
        {filteredEntitlements.map(entitlement => { const balance = entitlement.balances.find(item => item.leave_type_id === Number(matrixType)); return <tr key={entitlement.employee.id} data-leave-balance>
          <td data-label={t("Employee")}><strong>{entitlement.employee.name}</strong><span className="lw-sub">{entitlement.employee.employee_id}</span><span className="lw-sub">{entitlement.employee.company?.name || '—'} / {entitlement.employee.department?.name || '—'}</span>{balance?.id === 0 && <span className="lw-sub">{t("Not allocated")}</span>}{!balance && <span className="lw-sub">{t("Not applicable")}</span>}</td>
          <td data-label={t("Allocated")} className="lw-number">{quantity(balance?.id ? balance.allocated_days : '—')}</td><td data-label={t("Used")} className="lw-number">{quantity(balance?.id ? balance.used_days : '—')}</td><td data-label={t("Pending")} className="lw-number">{quantity(balance?.id ? balance.pending_days : '—')}</td><td data-label={t("Remaining balance")} className="lw-number lw-available">{quantity(balance?.id ? balance.remaining_days : '—')}</td>
          <td data-label={t("Actions")}><div className="lw-actions"><button className="ow-button" title={t("View Details")} onClick={() => handleViewDetail(entitlement)}><Eye size={15} /><span className="lw-sr-only">{t("Details")}</span></button>{canAllocate && <button className="ow-button" title={t("Allocate Leave")} disabled={optionError || !leaveTypes.length} onClick={() => handleOpenAllocate(entitlement)}><Plus size={15} /><span>{t("Allocate")}</span></button>}</div></td>
        </tr>; })}
      </tbody></table></div>}
      {!loading && !loadError && <div className="lw-page-totals"><span>{t("All leave types on this page")}</span><span><strong>{quantity(stats.totalUsed)}</strong>{' '}{t("days used")}</span><span><strong>{quantity(stats.totalPending)}</strong>{' '}{t("pending")}</span><span><strong>{quantity(stats.totalRemaining)}</strong>{' '}{t("remaining balance")}</span></div>}
      {!loading && !loadError && <div className="ow-pagination"><span>{quantity(filteredEntitlements.length)}{' '}{t("shown ·")} {quantity(totalItems)}{' '}{t("matching employees")}</span><div className="lw-actions"><button className="ow-button" aria-label={t("Previous page")} disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button><span>{t("Page")} {page}{' '}{t("of")} {totalPages}</span><button className="ow-button" aria-label={t("Next page")} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button></div></div>}
    </section>
    {exportDraft && <OperationalDialog title={t('Export leave entitlements')} subtitle={t('Excel workbook for every matching employee')} onClose={closeExport} busy={exporting} className="lw-dialog leave-refresh-dialog"><div className="ph-workflow dw-detail dw-fields">
      <p className="dw-note">{t('The current Company, Department and Search filters apply. Every page and every leave type is included — not only the rows or the leave type shown on screen.')}</p>
      <dl className="dw-kv" aria-label={t('Export filters')}>
        <div><dt>{t('Company')}</dt><dd>{exportDraft.companyId === undefined ? t('All assigned companies') : exportDraft.companyName}</dd></div>
        <div><dt>{t('Department')}</dt><dd>{exportDraft.departmentId === undefined ? t('All departments') : exportDraft.departmentName}</dd></div>
        <div><dt>{t('Search text')}</dt><dd>{exportDraft.search ?? t('No search')}</dd></div>
      </dl>
      <label className="ow-field">{t('Balance year')}<select aria-label={t('Export year')} disabled={exporting} value={exportDraft.year} onChange={event => { const year = Number(event.target.value); setExportDraft(draft => draft && { ...draft, year }); }}>{exportYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
      <label className="ow-field">{t('Employees to include')}<select aria-label={t('Employees to include')} disabled={exporting} value={exportDraft.employmentStatus} onChange={event => { const employmentStatus = event.target.value === 'active' ? 'active' : 'all'; setExportDraft(draft => draft && { ...draft, employmentStatus }); }}><option value="all">{t('All employment statuses')}</option><option value="active">{t('Active employees only')}</option></select></label>
      <p className="ph-callout dw-callout">{t('The table on this page lists active employees only. "All employment statuses" also includes resigned and inactive employees, so leave they already used in that year stays visible.')} {t('Exporting does not change the table year, balances or allocations.')}</p>
      {exportError && <p className="ow-feedback" role="alert">{t('The export could not be created. Nothing was changed. Please try again.')}</p>}
      <div className="ph-form-actions dw-actions"><button className="ow-button" disabled={exporting} onClick={closeExport}>{t('Cancel')}</button><button className="ow-button ow-primary" disabled={exporting} aria-busy={exporting} onClick={runExport}>{exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{' '}{exporting ? t('Preparing export…') : exportError ? t('Try export again') : t('Download Excel')}</button></div>
    </div></OperationalDialog>}
    {showBulkAllocateModal && <OperationalDialog title={t("Bulk Allocate Leave")} subtitle={t("Allocate missing balances for the selected filters.")} onClose={handleCloseBulkAllocateModal} busy={allocating} className="lw-dialog leave-refresh-dialog"><div className="ph-workflow dw-detail dw-fields"><AllocationPreview result={allocationPreview} error={previewError} onRetry={() => setPreviewRetry(value => value + 1)} /><div className="ph-form-actions dw-actions"><button className="ow-button" disabled={allocating} onClick={handleCloseBulkAllocateModal}>{t("Cancel")}</button><button className="ow-button ow-primary" disabled={allocating || !canAllocate || !allocationPreview?.created} onClick={confirmAllocation}>{allocating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{' '}{t("Confirm Allocate")}</button></div></div></OperationalDialog>}
    {showAllocateModal && selectedEmployee && <OperationalDialog title={t("Allocate Leave")} subtitle={selectedEmployee.employee.name} onClose={handleCloseAllocateModal} busy={allocating} className="lw-dialog leave-refresh-dialog"><div className="ph-workflow dw-detail dw-fields"><label className="ow-field">{t("Leave Type")}<select aria-label={t("Allocation leave type")} disabled={allocating} value={allocateForm.leave_type_id} onChange={e => { const typeId = Number(e.target.value); setAllocateForm(prev => ({ ...prev, leave_type_id: typeId })); setAllocationRequest({ employee_id: allocateForm.employee_id, leave_type_ids: [typeId], dry_run: true }); }}>{allocationTypes.map(type => <option key={type.id} value={type.id}>{type.code} - {type.name}{' '}{t("(Default:")} {quantity(type.default_days)}{' '}{t("days)")}</option>)}</select></label>{allocationRequest ? <AllocationPreview result={allocationPreview} error={previewError} onRetry={() => setPreviewRetry(value => value + 1)} /> : <p role="alert">{t("No leave types available for allocation.")}</p>}<div className="ph-form-actions dw-actions"><button className="ow-button" disabled={allocating} onClick={handleCloseAllocateModal}>{t("Cancel")}</button><button className="ow-button ow-primary" disabled={allocating || !canAllocate || !allocationPreview?.created} onClick={confirmAllocation}>{allocating && <Loader2 size={16} className="animate-spin" />}{' '}{t("Allocate")}</button></div></div></OperationalDialog>}
    {showDetailModal && selectedEmployee && <OperationalDialog title={t("Employee leave balances")} subtitle={`${selectedEmployee.employee.name} / ${new Date().getFullYear()}`} onClose={handleCloseDetailModal} className="lw-dialog lw-dialog-wide leave-refresh-dialog"><div className="ph-workflow dw-detail dw-fields"><p className="lw-note">{selectedEmployee.employee.company?.name} / {selectedEmployee.employee.department?.name}</p><div className="ph-table-scroll dw-table-scroll"><table className="ow-table"><thead><tr><th>{t("Leave type")}</th><th>{t("Allocated")}</th><th>{t("Used")}</th><th>{t("Pending")}</th><th>{t("Remaining balance")}</th></tr></thead><tbody>{selectedEmployee.balances.map(balance => <tr key={balance.leave_type_id}><td>{balance.leaveType?.name}{!balance.id && <span className="lw-sub">{t("Not allocated")}</span>}</td><td>{quantity(balance.id ? balance.allocated_days : '—')}</td><td>{quantity(balance.id ? balance.used_days : '—')}</td><td>{quantity(balance.id ? balance.pending_days : '—')}</td><td className="lw-available">{quantity(balance.id ? balance.remaining_days : '—')}</td></tr>)}</tbody></table></div><div className="ph-form-actions dw-actions"><button className="ow-button" onClick={handleCloseDetailModal}>{t("Close")}</button></div></div></OperationalDialog>}
  </OperationalWorkspace>;
}
