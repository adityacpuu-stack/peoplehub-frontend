import { enumLabel } from '@/pages/employees/enum-labels';
import { t, useLocale } from '@/i18n';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, LayoutGrid, List, CalendarX } from 'lucide-react';
import { Badge, Modal, getStatusVariant } from '@/components/ui';
import { OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import './employees.css';
import './operations-workflows.css';
import toast from 'react-hot-toast';
import { employeeService } from '@/services/employee.service';
import { companyService, type Company } from '@/services/company.service';
import { departmentService } from '@/services/department.service';
import type { Department, Employee } from '@/types';
import { formatDate, formatNumber, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canAction, canEditEmployee, canOpenEmployee } from '@/lib/actions';

const apiErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { error?: { message?: string }; message?: string } } }).response;
  return response?.data?.error?.message || response?.data?.message || t(fallback);
};

export function EmployeesPage() {
  useLocale();
  const { user } = useAuthStore();
  const isGroupCEO = user?.roles?.includes('Group CEO');
  const canManageEmployees = !isGroupCEO && (user?.roles?.some(role => ['Super Admin', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'].includes(role)) ?? false);
  // Role eligibility above stays the ceiling; covered actions narrow each control.
  // Edit loads the detail endpoint, so its narrower role ceiling applies (Group CEO stays read-only).
  const canEditEmployees = canManageEmployees && canEditEmployee(user);
  const canCreateEmployees = canManageEmployees && canAction(user, 'employee.create');
  const canExportEmployees = canManageEmployees && canAction(user, 'employee.export');
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const setPage = useCallback((newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', String(newPage));
      return prev;
    });
  }, [setSearchParams]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    company_id: '' as string,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState(false);
  const [employeeError, setEmployeeError] = useState(false);
  const employeeRequest = useRef(0);
  const companyRequest = useRef(0);
  const departmentRequest = useRef(0);
  const [inactiveTotal, setInactiveTotal] = useState(0);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    const request = ++companyRequest.current;
    setCompaniesLoading(true);
    setCompaniesError(false);
    try {
      // The API applies company access. Follow all pages within that scope.
      const all: Company[] = [];
      let nextPage = 1;
      let pageCount = 1;
      do {
        const response = await companyService.getAll({ page: nextPage, limit: 100, status: 'active' });
        if (request !== companyRequest.current) return;
        all.push(...response.data);
        pageCount = response.pagination.totalPages;
        nextPage++;
      } while (nextPage <= pageCount);
      setCompanies(Array.from(new Map(all.map(company => [company.id, company])).values())
        .sort((a, b) => a.name.localeCompare(b.name, 'id')));
    } catch {
      if (request === companyRequest.current) setCompaniesError(true);
    } finally {
      if (request === companyRequest.current) setCompaniesLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    const request = ++departmentRequest.current;
    setDepartmentsLoading(true);
    setDepartmentsError(false);
    try {
      // Read every API page, independently of the ten employees on screen.
      // Keep inactive departments too so historical employees remain filterable.
      const all: Department[] = [];
      let nextPage = 1;
      let pageCount = 1;
      do {
        const response = await departmentService.getAll({ page: nextPage, limit: 100 });
        if (request !== departmentRequest.current) return;
        all.push(...response.data);
        pageCount = response.pagination.totalPages;
        nextPage++;
      } while (nextPage <= pageCount);
      setDepartments(Array.from(new Map(all.map(department => [department.id, department])).values())
        .sort((a, b) => a.name.localeCompare(b.name, 'id')));
    } catch {
      if (request === departmentRequest.current) setDepartmentsError(true);
    } finally {
      if (request === departmentRequest.current) setDepartmentsLoading(false);
    }
  }, []);

  const availableDepartments = departments.filter(department => {
    const companyId = department.company_id ?? department.company?.id;
    if (companyId == null) return true;
    // Match the company options returned by the API. Auth profile scope can
    // differ from the scope resolved by middleware (notably for HR Manager).
    if (!user?.roles.includes('Super Admin') && !companies.some(company => company.id === companyId)) return false;
    return !filters.company_id || companyId === Number(filters.company_id);
  });
  const departmentLabel = (department: Department) =>
    `${department.name}${department.code ? ` (${department.code})` : ''}`;

  const fetchEmployees = useCallback(async () => {
    const request = ++employeeRequest.current;
    setIsLoading(true);
    setEmployeeError(false);
    try {
      // When searching, show ALL statuses so no employee is missed
      const response = await employeeService.getAll({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        employment_status: debouncedSearch ? 'all' : (activeTab === 'active' ? 'active' : 'inactive'),
        company_id: filters.company_id ? Number(filters.company_id) : undefined,
        department_id: filters.department ? Number(filters.department) : undefined,
      });
      if (request !== employeeRequest.current) return;
      setEmployees(response.data);
      setTotalPages(response.pagination.totalPages);
      if (page > Math.max(1, response.pagination.totalPages)) setPage(Math.max(1, response.pagination.totalPages));
      setTotal(response.pagination.total);

      // Also fetch inactive count for the badge (only when on active tab)
      if (activeTab === 'active') {
        try {
        const inactiveResponse = await employeeService.getAll({
          page: 1,
          limit: 1,
          employment_status: 'inactive',
          company_id: filters.company_id ? Number(filters.company_id) : undefined,
          department_id: filters.department ? Number(filters.department) : undefined,
        });
        if (request === employeeRequest.current) setInactiveTotal(inactiveResponse.pagination.total);
        } catch { if (request === employeeRequest.current) setInactiveTotal(0); }
      }
    } catch (error) {
      if (request === employeeRequest.current) { setEmployees([]); setTotal(0); setEmployeeError(true); }
      console.error('Failed to fetch employees:', error);
    } finally {
      if (request === employeeRequest.current) setIsLoading(false);
    }
  }, [page, debouncedSearch, activeTab, filters.company_id, filters.department, setPage]);

  useEffect(() => {
    void fetchCompanies();
    // This is a request sequence counter, not a DOM ref; invalidate all pending loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { companyRequest.current++; };
  }, [fetchCompanies]);

  useEffect(() => {
    void fetchDepartments();
    // This is a request sequence counter, not a DOM ref; invalidate all pending loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { departmentRequest.current++; };
  }, [fetchDepartments]);

  // Debounce search: wait 500ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (search !== debouncedSearch) { setDebouncedSearch(search); setPage(1); }
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, debouncedSearch, setPage]);

  useEffect(() => {
    fetchEmployees();
    // This is a request sequence counter, not a DOM ref; invalidate all pending loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { employeeRequest.current++; };
  }, [fetchEmployees]);

  const updateFilters = (changes: Partial<typeof filters>) => {
    setFilters(previous => {
      const next = { ...previous, ...changes };
      const selectedDepartment = departments.find(department => department.id === Number(next.department));
      const companyId = selectedDepartment?.company_id ?? selectedDepartment?.company?.id;
      if (changes.company_id && companyId != null && companyId !== Number(changes.company_id)) {
        next.department = '';
      }
      return next;
    });
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleDelete = async () => {
    if (!deleteModal.employee) return;

    setIsDeleting(true);
    try {
      await employeeService.delete(deleteModal.employee.id);
      setDeleteModal({ open: false, employee: null });
      fetchEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    updateFilters({ status: '', department: '', company_id: '' });
    setSearch('');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await employeeService.exportExcel({
        search: debouncedSearch || undefined,
        employment_status: debouncedSearch ? undefined : (activeTab === 'active' ? 'active' : 'inactive'),
        company_id: filters.company_id ? Number(filters.company_id) : undefined,
        department_id: filters.department ? Number(filters.department) : undefined,
      });
      toast.success(t("Employee data exported successfully"));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(apiErrorMessage(error, 'Failed to export employee data'), { id: 'api-error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Get active count when on inactive tab (for the tab badge)
  const [activeTotal, setActiveTotal] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const fetchActiveCount = async () => {
      if (activeTab === 'inactive') {
        try {
          const activeResponse = await employeeService.getAll({
            page: 1,
            limit: 1,
            employment_status: 'active',
            company_id: filters.company_id ? Number(filters.company_id) : undefined,
            department_id: filters.department ? Number(filters.department) : undefined,
          });
          if (!cancelled) setActiveTotal(activeResponse.pagination.total);
        } catch (error) {
          console.error('Failed to fetch active count:', error);
        }
      }
    };
    fetchActiveCount();
    return () => { cancelled = true; };
  }, [activeTab, filters.company_id, filters.department]);

  const hasActiveFilters = search || filters.department || filters.company_id;

  const employeeRecords = employees.map(employee => {
    // Finance/Tax alone may list employees but the detail endpoint refuses them (own record excepted).
    const canOpen = canOpenEmployee(user, employee.id);
    const identity = <div className="employee-identity"><span className="operations-person-mark" aria-hidden="true">{getInitials(employee.name || '?')}</span><div>{canOpen ? <Link to={`/employees/${employee.id}`} className="employee-name">{employee.name}</Link> : <span className="employee-name">{employee.name}</span>}<p><span>{employee.employee_id || t('No employee ID')}</span><span className="employee-email">{employee.email || '-'}</span></p></div></div>;
    const organization = <div className="employee-organization"><strong>{employee.job_title || employee.position?.name || t('No position')}</strong><p>{employee.department?.name || t('No department')}</p></div>;
    const employment = <div className="employee-employment"><Badge variant={getStatusVariant(employee.employment_status || 'active')}>{enumLabel(employee.employment_status || 'active')}</Badge>{employee.resign_date && <p className="employee-resign"><CalendarX size={13} />{formatDate(employee.resign_date)}{employee.resign_type && <span>{enumLabel(employee.resign_type)}</span>}</p>}</div>;
    const actions = <div className="employee-actions">{canOpen && <Link aria-label={t('View {name}', { name: employee.name })} title={t("View Details")} to={`/employees/${employee.id}`}>{t("View")}</Link>}{activeTab !== 'inactive' && canEditEmployees && <Link aria-label={t('Edit {name}', { name: employee.name })} title={t("Edit")} to={`/employees/${employee.id}/edit`}>{t("Edit")}</Link>}</div>;
    return viewMode === 'list' ? <tr key={employee.id} className="employee-record" data-employee-record><td data-label={t("Employee")}>{identity}</td><td data-label={t("Position / department")}>{organization}</td><td data-label={t("Company")}>{employee.company?.name || t('No company')}</td><td data-label={t("Employment")}>{employment}</td><td>{actions}</td></tr>
      : <article key={employee.id} className="employee-record" data-employee-record>{identity}{organization}<p>{employee.company?.name || t('No company')}</p>{employment}{actions}</article>;
  });

  return (
    <OperationalWorkspace module="operations" title={t("Employee Directory")} description={t("People, roles and employment records across your companies.")}
      className="employees-workspace"
      actions={<>{canExportEmployees && <button className="ow-button" onClick={handleExport} disabled={isExporting || isLoading}><Download size={16} />{isExporting ? t("Exporting...") : t("Export")}</button>}{canCreateEmployees && <Link className="ow-button ow-primary" to="/employees/create"><Plus size={16} />{t("Add Employee")}</Link>}</>}
      filters={<>
        <label className="employee-search"><Search size={16} /><input aria-label={t("Search employees")} placeholder={t("Search by name or email...")} value={search} onChange={handleSearch} /></label>
        <label className="ow-field">{t("Company")}<select id="employee-company-filter" value={filters.company_id} onChange={e => updateFilters({ company_id: e.target.value })} disabled={companiesLoading || companiesError}>
          <option value="">{companiesLoading ? t("Loading companies...") : t("All Companies")}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
        {companiesError && <p role="alert">{t("Gagal memuat company.")} <button onClick={() => void fetchCompanies()} className="ow-button">{t("Muat ulang company")}</button></p>}
        <label className="ow-field">{t("Department")}<select id="employee-department-filter" value={filters.department} onChange={e => updateFilters({ department: e.target.value })} disabled={departmentsLoading || departmentsError}>
          <option value="">{departmentsLoading ? t("Loading departments...") : t("All Departments")}</option>{availableDepartments.map(d => <option key={d.id} value={d.id}>{departmentLabel(d)}</option>)}
        </select></label>
        {departmentsError && <p role="alert">{t("Gagal memuat department.")} <button className="ow-button" onClick={() => void fetchDepartments()}>{t("Coba lagi")}</button></p>}
        {filters.company_id && <button className="employee-clear" aria-label={t("Hapus filter company")} onClick={() => updateFilters({ company_id: '' })}>{t("Clear company")}</button>}
        {filters.department && <button className="employee-clear" aria-label={t("Hapus filter department")} onClick={() => updateFilters({ department: '' })}>{t("Clear department")}</button>}
        <div className="employee-status-filter" aria-label={t("Employment status")}>
          <button aria-label={`${t("Active")} (${debouncedSearch ? '-' : formatNumber(activeTab === 'active' ? total : activeTotal)})`} aria-pressed={activeTab === 'active'} onClick={() => { setActiveTab('active'); setPage(1); }}><span>{t("Active")}</span><span>{debouncedSearch ? '-' : formatNumber(activeTab === 'active' ? total : activeTotal)}</span></button>
          <button aria-label={`${t("Inactive")} (${debouncedSearch ? '-' : formatNumber(activeTab === 'inactive' ? total : inactiveTotal)})`} aria-pressed={activeTab === 'inactive'} onClick={() => { setActiveTab('inactive'); setPage(1); }}><span>{t("Inactive")}</span><span>{debouncedSearch ? '-' : formatNumber(activeTab === 'inactive' ? total : inactiveTotal)}</span></button>
        </div>
        <details className="employee-filter-note"><summary>{t("About this directory")}</summary><p>{t("Inactive records include resigned, terminated and retired employees. Search includes all employment statuses.")}</p></details>
        {hasActiveFilters && <button className="ow-button" onClick={clearFilters}>{t("Clear All Filters")}</button>}
      </>}
    >
      <section className="ow-register">
        <div className="ow-toolbar employee-toolbar">
          <p className="employee-count">{isLoading ? t("Loading records...") : t('{count} matching employees', { count: formatNumber(total) })}{debouncedSearch && <span>{t("/ all statuses")}</span>}</p>
          <div className="employee-view" aria-label={t("Directory view")}><button aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><List size={16} />{t("List")}</button><button aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}><LayoutGrid size={16} />{t("Grid")}</button></div>
        </div>
        {employeeError ? <div className="ow-feedback" role="alert">{t("Unable to load employees.")} <button className="ow-button" onClick={() => void fetchEmployees()}>{t("Retry employees")}</button></div>
        : isLoading ? <div className="ow-feedback" role="status">{t("Loading employees...")}</div>
        : employees.length === 0 ? <div className="ow-feedback"><h3>{t("No employees found")}</h3><p>{hasActiveFilters ? t("Adjust the filters or search to see more people.") : t("No employee records in this selection.")}</p></div>
        : viewMode === 'list' ? <div className="employee-table-scroll"><table className="employee-table employee-records--list">
          <thead><tr><th scope="col">{t("Employee")}</th><th scope="col">{t("Position / department")}</th><th scope="col">{t("Company")}</th><th scope="col">{t("Employment")}</th><th scope="col"><span className="sr-only">{t("Actions")}</span></th></tr></thead>
          <tbody>{employeeRecords}</tbody>
        </table></div> : <div className="employee-records employee-records--grid">{employeeRecords}</div>}
        {!employeeError && <div className="ow-pagination"><span>{formatNumber(total ? (page - 1) * 10 + 1 : 0)} - {formatNumber(Math.min(page * 10, total))}{' '}{t("of")} {formatNumber(total)}</span><span>{t("Page")} {formatNumber(page)}{' '}{t("of")} {formatNumber(Math.max(1, totalPages))}</span><div><button className="ow-button" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>{t("Previous")}</button><button className="ow-button" disabled={page >= totalPages || isLoading} onClick={() => setPage(page + 1)}>{t("Next")}</button></div></div>}
      </section>
      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.employee && (
        <Modal isOpen={true} title={t("Delete Employee")} size="md" busy={isDeleting}
          className="ph-workflow ops-workflow ops-modal operations-refresh-dialog"
          onClose={() => { if (!isDeleting) setDeleteModal({ open: false, employee: null }); }}>
            <p className="text-sm text-gray-600">{t("Are you sure you want to delete")} <span className="font-bold text-gray-900">{deleteModal.employee.name}</span>{t("? This action cannot be undone.")} </p>

            <div className="ops-dialog-footer">
              <button
                onClick={() => setDeleteModal({ open: false, employee: null })}
                disabled={isDeleting}
                className="ph-button"
              >{t("Cancel")} </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="ph-button ops-danger"
              >
                {isDeleting ? t("Deleting...") : t("Delete")}
              </button>
            </div>
        </Modal>
      )}
    </OperationalWorkspace>
  );
}
