import { payrollNumber } from '@/components/payroll/localization';
import { payrollEnumLabel } from '@/components/payroll/localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { useDomainConfirmation } from '@/pages/leave/useDomainConfirmation';
import '@/pages/leave/domain-workflows.css';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { Coins, Plus, Edit2, Trash2, Lock, Car, Utensils, Home, Phone, Briefcase, GraduationCap, Heart, Shirt, Loader2, Clock, Wifi, Gift, Trophy } from 'lucide-react';
import { allowanceService, ALLOWANCE_TYPES } from '../../services/allowance.service';
import type { Allowance, AllowanceListQuery, AllowanceType as AllowanceTypeEnum } from '../../services/allowance.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { CompensationWorkspace, CompensationStatus, CompensationEmpty, CompensationDialog, CompensationEmployeeSelect } from '@/components/compensation/CompensationWorkspace';
import { collectPages } from '@/services/master-data';

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  basic_salary?: number;
  company_id?: number;
  department?: {
    id: number;
    name: string;
  };
}

export function AllowancesPage() {
  useLocale();
  const { requestDecision, decisionDialog } = useDomainConfirmation('compensation-refresh-dialog');
  const user = useAuthStore(state => state.user);
  // Match the existing allowance/payroll-adjustment write routes.
  const canManage = user?.roles.some(role => ['Super Admin', 'HR Manager', 'HR Staff'].includes(role)) ?? false;
  const dataRequest = useRef(0);
  const employeeRequest = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [companiesError, setCompaniesError] = useState(false);
  const [employeesError, setEmployeesError] = useState(false);
  useEffect(() => () => { dataRequest.current++; employeeRequest.current++; }, []);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterTaxable, setFilterTaxable] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<Allowance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 12;

  const [formData, setFormData] = useState({
    name: '',
    type: 'transport' as AllowanceTypeEnum,
    description: '',
    is_taxable: true,
    is_bpjs_object: false,
    is_recurring: true,
    is_contract: false,
    amount: 0,
    percentage: 0,
    calculation_base: 'fixed' as 'fixed' | 'basic_salary' | 'gross_salary',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'daily' | 'one_time',
    company_id: '' as string | number,
    employee_id: '' as string | number,
    status: 'active' as string,
    effective_date: '',
    end_date: '',
  });

  // Fetch allowances from API
  const fetchAllowances = useCallback(async () => {
    const request = ++dataRequest.current;
    setLoadError(false);
    setLoading(true);
    try {
      const query: AllowanceListQuery = {
        page,
        limit,
        search: search || undefined,
      };
      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterCompany !== 'all' && filterCompany !== 'global') {
        query.company_id = Number(filterCompany);
      }
      if (filterTaxable !== 'all') {
        query.is_taxable = filterTaxable === 'taxable';
      }
      if (filterType !== 'all') {
        query.type = filterType;
      }

      const response = await allowanceService.list(query);
      if (request !== dataRequest.current) return;
      setAllowances(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
    } catch (error) {
      if (request !== dataRequest.current) return;
      setLoadError(true);
      setAllowances([]);
      console.error('Failed to fetch allowances:', error);
    } finally {
      if (request === dataRequest.current) setLoading(false);
    }
  }, [page, search, filterStatus, filterCompany, filterTaxable, filterType]);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      setCompaniesError(false);
      const rows = await collectPages((page, limit) => companyService.getAll({ page, limit }));
      setCompanies(rows);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompaniesError(true);
    }
  }, []);

  // Fetch employees (filtered by company if selected)
  const fetchEmployees = useCallback(async (companyId?: number) => {
    const request = ++employeeRequest.current;
    setEmployeesError(false);
    setEmployees([]);
    setLoadingEmployees(true);
    try {
      const params: { page: number; limit: number; company_id?: number; employment_status?: string } = {
        page: 1,
        limit: 200,
        employment_status: 'all',
      };
      if (companyId) {
        params.company_id = companyId;
      }
      const rows = await collectPages((page, limit) => employeeService.getAll({ ...params, page, limit }));
      if (request !== employeeRequest.current) return;
      // Map to our local Employee interface (only active + resigned)
      setEmployees(rows
        .filter(emp => emp.employment_status === 'active' || emp.employment_status === 'resigned')
        .map(emp => ({
          id: emp.id,
          name: emp.name,
          employee_id: emp.employee_id || '',
          basic_salary: emp.basic_salary,
          company_id: emp.company_id,
          department: emp.department || undefined,
        })));
    } catch (error) {
      if (request !== employeeRequest.current) return;
      setEmployeesError(true);
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    } finally {
      if (request === employeeRequest.current) setLoadingEmployees(false);
    }
  }, []);

  // Calculate allowance amount for percentage-based
  const calculateAllowanceAmount = useCallback(() => {
    if (!selectedEmployee?.basic_salary) return 0;
    if (formData.calculation_base === 'fixed') {
      return formData.amount || 0;
    }
    const percentage = formData.percentage || 0;
    // For now, assume gross_salary = basic_salary (simplified)
    const base = selectedEmployee.basic_salary;
    return Math.round(base * percentage / 100);
  }, [selectedEmployee, formData.calculation_base, formData.amount, formData.percentage]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch employees when modal opens or company changes
  useEffect(() => {
    if (showModal) {
      if (formData.company_id) {
        fetchEmployees(Number(formData.company_id));
      } else {
        fetchEmployees(); // Fetch all employees if no company selected
      }
    }
  }, [showModal, formData.company_id, fetchEmployees]);

  useEffect(() => {
    fetchAllowances();
  }, [fetchAllowances]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCompany, filterTaxable, filterType]);

  // Stats (computed from current data)
  const stats = useMemo(() => {
    const activeAllowances = allowances.filter(a => a.status === 'active');
    const totalAmount = activeAllowances.reduce((acc, a) => acc + Number(a.amount || 0), 0);
    const taxableAmount = activeAllowances.filter(a => a.is_taxable).reduce((acc, a) => acc + Number(a.amount || 0), 0);
    return {
      totalItems,
      activeCount: activeAllowances.length,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      taxableAmount: isNaN(taxableAmount) ? 0 : taxableAmount,
    };
  }, [allowances, totalItems]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'transport':
        return <Car className="w-5 h-5" />;
      case 'meal':
        return <Utensils className="w-5 h-5" />;
      case 'housing':
        return <Home className="w-5 h-5" />;
      case 'communication':
        return <Phone className="w-5 h-5" />;
      case 'position':
        return <Briefcase className="w-5 h-5" />;
      case 'medical':
        return <Heart className="w-5 h-5" />;
      case 'performance':
        return <GraduationCap className="w-5 h-5" />;
      case 'attendance':
        return <Clock className="w-5 h-5" />;
      case 'shift':
        return <Shirt className="w-5 h-5" />;
      case 'remote':
        return <Wifi className="w-5 h-5" />;
      case 'thr':
        return <Gift className="w-5 h-5" />;
      case 'bonus':
        return <Trophy className="w-5 h-5" />;
      default:
        return <Coins className="w-5 h-5" />;
    }
  };

  const handleOpenModal = (allowance?: Allowance) => {
    if (allowance) {
      setEditingAllowance(allowance);
      setFormData({
        name: allowance.name,
        type: allowance.type,
        description: allowance.description || '',
        is_taxable: allowance.is_taxable,
        is_bpjs_object: allowance.is_bpjs_object,
        is_recurring: allowance.is_recurring,
        is_contract: allowance.is_contract || false,
        amount: allowance.amount || 0,
        percentage: allowance.percentage || 0,
        calculation_base: allowance.calculation_base || 'fixed',
        frequency: allowance.frequency,
        company_id: allowance.company_id || '',
        employee_id: allowance.employee_id || '',
        status: allowance.status,
        effective_date: allowance.effective_date?.split('T')[0] || '',
        end_date: allowance.end_date?.split('T')[0] || '',
      });
      // Set selected employee from allowance data
      if (allowance.employee) {
        setSelectedEmployee({
          id: allowance.employee.id,
          name: allowance.employee.name,
          employee_id: allowance.employee.employee_id,
          basic_salary: allowance.employee.basic_salary,
          department: allowance.employee.department,
        });
      } else {
        setSelectedEmployee(null);
      }
    } else {
      setEditingAllowance(null);
      setFormData({
        name: '',
        type: 'transport',
        description: '',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        is_contract: false,
        amount: 0,
        percentage: 0,
        calculation_base: 'fixed',
        frequency: 'monthly',
        company_id: '',
        employee_id: '',
        status: 'active',
        effective_date: '',
        end_date: '',
      });
      setSelectedEmployee(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAllowance(null);
    setSelectedEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      toast.error(t("Please fill in required fields"), { id: 'api-error', toasterId: 'compensation-dialog' });
      return;
    }

    // Require employee for percentage-based calculations
    if (formData.calculation_base !== 'fixed' && !formData.employee_id) {
      toast.error(t("Employee is required for percentage-based allowances"), { id: 'api-error', toasterId: 'compensation-dialog' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
        is_taxable: formData.is_taxable,
        is_bpjs_object: formData.is_bpjs_object,
        is_recurring: formData.is_recurring,
        is_contract: formData.is_contract,
        amount: formData.calculation_base === 'fixed' ? formData.amount : undefined,
        percentage: formData.calculation_base !== 'fixed' ? formData.percentage : undefined,
        calculation_base: formData.calculation_base,
        frequency: formData.frequency,
        company_id: formData.company_id ? Number(formData.company_id) : undefined,
        employee_id: formData.employee_id ? Number(formData.employee_id) : undefined,
        status: formData.status,
        effective_date: formData.effective_date || undefined,
        end_date: formData.end_date || undefined,
      };

      if (editingAllowance) {
        await allowanceService.update(editingAllowance.id, payload);
        toast.success(t("Allowance updated successfully"));
      } else {
        await allowanceService.create(payload);
        toast.success(t("Allowance created successfully"));
      }

      handleCloseModal();
      fetchAllowances();
    } catch (error) {
      console.error('Failed to save allowance:', error);
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Failed to save allowance'), { id: 'api-error', toasterId: 'compensation-dialog' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await requestDecision({ title: t('Delete allowance'), message: t('Are you sure you want to delete this allowance?'), confirmLabel: t('Delete') }))) return;

    try {
      await allowanceService.delete(id);
      toast.success(t("Allowance deleted successfully"));
      fetchAllowances();
    } catch (error) {
      console.error('Failed to delete allowance:', error);
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Failed to delete allowance'), { id: 'api-error' });
    }
  };

  // Toggle status - can be used for quick status change from card
  const _handleToggleStatus = async (allowance: Allowance) => {
    try {
      const newStatus = allowance.status === 'active' ? 'inactive' : 'active';
      await allowanceService.update(allowance.id, { status: newStatus });
      toast.success(t("Status updated"));
      fetchAllowances();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(t("Failed to update status"));
    }
  };
  void _handleToggleStatus; // Silence unused warning

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const typeOptions = ALLOWANCE_TYPES.map(type => ({
    value: type,
    label: payrollEnumLabel(type),
    icon: getIcon(type),
  }));

  return (
    <>
      <CompensationWorkspace title={t("Allowances")} description={t("Kelola tunjangan karyawan, penerima, dan periode berlakunya.")}
        actions={canManage && <button className="cp-button cp-primary" onClick={() => handleOpenModal()}><Plus size={17} />{t("Add Allowance")}</button>}
        filters={<>
          <label className="cp-field">{t("company")}<select aria-label={t("Filter company")} value={filterCompany} onChange={event => { setFilterCompany(event.target.value); setPage(1); }}><option value="all">{t("Semua company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            {companiesError && <p className="cp-filter-error" role="alert">{t("Daftar company gagal dimuat.")} <button onClick={fetchCompanies}>{t("Coba lagi")}</button></p>}
          <label className="cp-field">{t("tipe")}<select aria-label={t("Filter tipe")} value={filterType} onChange={event => { setFilterType(event.target.value); setPage(1); }}><option value="all">{t("Semua tipe")}</option>{ALLOWANCE_TYPES.map(type => <option key={type} value={type}>{payrollEnumLabel(type)}</option>)}</select></label>
          <label className="cp-field">{t("status")}<select aria-label={t("Filter status")} value={filterStatus} onChange={event => { setFilterStatus(event.target.value); setPage(1); }}><option value="all">{t("Semua status")}</option><option value="active">{t("Active")}</option><option value="inactive">{t("Inactive")}</option><option value="pending">{t("Pending")}</option><option value="approved">{t("Approved")}</option><option value="rejected">{t("Rejected")}</option></select></label>
          <label className="cp-field">{t("pajak")}<select aria-label={t("Filter pajak")} value={filterTaxable} onChange={event => { setFilterTaxable(event.target.value); setPage(1); }}><option value="all">{t("Semua status pajak")}</option><option value="taxable">{t("Taxable")}</option><option value="non-taxable">{t("Non-taxable")}</option></select></label>
          <button className="cp-reset" onClick={() => { setSearch(''); setFilterCompany('all'); setFilterType('all'); setFilterStatus('all'); setFilterTaxable('all'); setPage(1); }}>{t("Reset filter")}</button>
          <p className="cp-filter-note"><Lock size={16} />{t("Tunjangan Contract / OL dikunci dan tidak dapat diubah dari daftar ini.")}</p>
        </>}
        metrics={[
          { label: t('Tunjangan ditemukan'), value: payrollNumber(totalItems), note: t('Sesuai filter yang dipilih') },
          { label: t('Aktif'), value: payrollNumber(stats.activeCount), note: t('Pada halaman ini') },
          { label: t('Nominal aktif'), value: formatCurrency(stats.totalAmount), note: t('Nominal tersimpan pada halaman ini') },
        ]}
        search={search} onSearch={value => { setSearch(value); setPage(1); }} searchLabel={t("Cari nama tunjangan…")}
        loading={loading} error={loadError} onRetry={fetchAllowances}
        page={page} totalPages={totalPages} onPage={setPage} count={t("{value0} dari {value1} tunjangan", { value0: payrollNumber(allowances.length), value1: payrollNumber(totalItems) })}>
        {!allowances.length ? <CompensationEmpty /> : <table className="cp-table"><thead><tr><th>{t("Tunjangan")}</th><th>{t("Penerima")}</th><th>{t("Nominal / Periode")}</th><th>{t("Status")}</th><th><span className="sr-only">{t("Aksi")}</span></th></tr></thead>
          <tbody>{allowances.map(allowance => <tr key={allowance.id}>
            <td><div className="cp-record-title"><span className="cp-record-icon">{getIcon(allowance.type)}</span><div><strong>{allowance.name}</strong><small>{payrollEnumLabel(allowance.type)}</small></div></div>
              {allowance.description && <p className="cp-description">{allowance.description}</p>}
              <div className="cp-tags"><span>{allowance.is_taxable ? t("Taxable") : t("Non-taxable")}</span>{allowance.is_bpjs_object && <span>{t("BPJS object")}</span>}{allowance.is_contract && <span>{t("Contract / OL")}</span>}</div></td>
            <td data-label={t("Penerima")}><strong>{allowance.employee?.name || allowance.company?.name || t('Semua company')}</strong><small>{allowance.employee?.employee_id || allowance.company?.name || t('Tunjangan global')}</small>{allowance.employee?.department && <small>{allowance.employee.department.name}</small>}</td>
            <td data-label={t("Nominal / Periode")} className="cp-money"><strong>{allowance.calculation_base === 'basic_salary' || allowance.calculation_base === 'gross_salary' ? (allowance.percentage == null ? '?' : `${Number(allowance.percentage).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}%`) : allowance.amount == null ? '?' : formatCurrency(Number(allowance.amount))}</strong>
              <small>{allowance.calculation_base === 'basic_salary' ? t("Dari gaji pokok") : allowance.calculation_base === 'gross_salary' ? t("Dari gross salary") : t("Nominal tetap")} · {payrollEnumLabel(allowance.frequency)}</small>
              {allowance.effective_date && <small>{new Date(allowance.effective_date).toLocaleDateString(intlLocale())}{allowance.end_date ? ` – ${new Date(allowance.end_date).toLocaleDateString(intlLocale())}` : ''}</small>}</td>
            <td data-label={t("Status")}><CompensationStatus status={allowance.status} /></td>
            <td className="cp-row-actions">{allowance.is_contract ? <span title={t("Terkunci: bagian dari Contract / OL")} aria-label={t("Tunjangan kontrak terkunci")}><Lock size={16} /></span> : canManage ? <><button className="cp-icon-button" aria-label={t("Edit {value0}", { value0: allowance.name })} onClick={() => handleOpenModal(allowance)}><Edit2 size={16} /></button><button className="cp-icon-button cp-danger" aria-label={t("Hapus {value0}", { value0: allowance.name })} onClick={() => handleDelete(allowance.id)}><Trash2 size={16} /></button></> : null}</td>
          </tr>)}</tbody></table>}
      </CompensationWorkspace>
      {showModal && canManage && <CompensationDialog title={editingAllowance ? t("Edit Allowance") : t("Add Allowance")} subtitle={t("Tentukan penerima dan komponen tunjangannya.")} busy={submitting} onClose={handleCloseModal}>
        {employeesError && <p className="cp-form-error" role="alert">{t("Daftar karyawan gagal dimuat.")} <button type="button" onClick={() => fetchEmployees(formData.company_id ? Number(formData.company_id) : undefined)}>{t("Coba lagi")}</button></p>}
        <form onSubmit={handleSubmit} className="ph-workflow dw-form">
                <div><div className="dw-form-content"><section className="ph-section dw-section"><h3>{t("Recipient")}</h3><div className="dw-fields">{!editingAllowance && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Quick Template")}</label>
                      <select aria-label={t("Quick Template")}
                        onChange={(e) => {
                          const template = allowanceService.getDefaultTemplates().find(t => t.name === e.target.value);
                          if (template) {
                            setFormData(prev => ({
                              ...prev,
                              name: template.name,
                              type: template.type as AllowanceTypeEnum,
                              description: template.description,
                              calculation_base: template.calculation_base as 'fixed' | 'basic_salary' | 'gross_salary',
                              frequency: template.frequency as 'monthly' | 'weekly' | 'daily' | 'one_time',
                              is_taxable: template.is_taxable,
                              is_bpjs_object: template.is_bpjs_object,
                              is_recurring: template.is_recurring,
                            }));
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-emerald-50"
                        defaultValue=""
                      >
                        <option value="" disabled>{t("Select a template to auto-fill...")}</option>
                        {allowanceService.getDefaultTemplates().map(template => (
                          <option key={template.name} value={template.name}>
                            {t(template.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
<div className="dw-fields">

                    <div className="ph-form-grid dw-form-grid">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Company")}</label>
                        <select aria-label={t("Company")}
                          value={formData.company_id}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, company_id: e.target.value, employee_id: '' }));
                            setSelectedEmployee(null);
                          }}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                          <option value="">{t("All Companies (Global)")}</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Employee")} {formData.calculation_base !== 'fixed' && <span className="text-red-500">*</span>}
                        </label>
                        <CompensationEmployeeSelect
                          options={employees.map(emp => ({
                            value: emp.id,
                            label: emp.name,
                            sublabel: emp.employee_id,
                          }))}
                          value={formData.employee_id ? Number(formData.employee_id) : ''}
                          onChange={(val) => {
                            const employeeId = String(val);
                            setFormData(prev => ({ ...prev, employee_id: employeeId }));
                            const emp = employees.find(emp => emp.id === Number(employeeId));
                            setSelectedEmployee(emp || null);
                          }}
                          placeholder={t("Search employee...")}
                          searchPlaceholder={t("Type name or ID...")}
                          disabled={loadingEmployees}
                          loading={loadingEmployees}
                          emptyMessage={t("No employees found")}
                        />
                      </div>
                    </div>

                    {/* Employee Info Display */}
                    {selectedEmployee && (
                      <div className="dw-context">
                        <div className="flex items-center gap-3">

                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{selectedEmployee.name}</p>
                            <p className="text-xs text-gray-500">
                              {selectedEmployee.employee_id}
                              {selectedEmployee.department && ` • ${selectedEmployee.department.name}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{t("Basic Salary")}</p>
                            <p className="font-semibold text-emerald-600">
                              {selectedEmployee.basic_salary ? formatCurrency(selectedEmployee.basic_salary) : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Allowance")}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Name")} <span className="text-red-500">*</span>
                      </label>
                      <input aria-label={t("Name *")}
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder={t("e.g., Tunjangan Transportasi")}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Type")} <span className="text-red-500">*</span>
                      </label>
                      <select aria-label={t("Type *")}
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AllowanceTypeEnum }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                      >
                        {typeOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
<div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Description")}</label>
                    <textarea aria-label={t("Description")}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      rows={2}
                      placeholder={t("Brief description...")}
                    />
                  </div>
<div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Calculation Base")}</label>
                      <select aria-label={t("Calculation Base")}
                        value={formData.calculation_base}
                        onChange={(e) => setFormData(prev => ({ ...prev, calculation_base: e.target.value as 'fixed' | 'basic_salary' | 'gross_salary' }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="fixed">{t("Fixed Amount")}</option>
                        <option value="basic_salary">{t("% of Basic Salary")}</option>
                        <option value="gross_salary">{t("% of Gross Salary")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.calculation_base === 'fixed' ? t("Amount (Rp)") : t("Percentage (%)")}
                      </label>
                      {formData.calculation_base === 'fixed' ? (
                        <input aria-label={t("Amount (Rp)")}
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          placeholder="0"
                        />
                      ) : (
                        <input aria-label={t("Percentage (%)")}
                          type="number"
                          step="0.01"
                          value={formData.percentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, percentage: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          placeholder="0"
                        />
                      )}
                    </div>
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Schedule")}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Frequency")}</label>
                      <select aria-label={t("Frequency")}
                        value={formData.frequency}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'monthly' | 'weekly' | 'daily' | 'one_time' }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="monthly">{t("Monthly")}</option>
                        <option value="weekly">{t("Weekly")}</option>
                        <option value="daily">{t("Daily")}</option>
                        <option value="one_time">{t("One Time")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Status")}</label>
                      <select aria-label={t("Status")}
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="active">{t("Active")}</option>
                        <option value="inactive">{t("Inactive")}</option>
                        <option value="pending">{t("Pending")}</option>
                      </select>
                    </div>
                  </div>
<div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Effective Date")}</label>
                      <input aria-label={t("Effective Date")}
                        type="date"
                        value={formData.effective_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("End Date (Optional)")}</label>
                      <input aria-label={t("End Date (Optional)")}
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Payroll treatment")}</h3><div className="dw-fields"><div className="dw-checks">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_taxable}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_taxable: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{t("Taxable (PPh 21)")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_bpjs_object}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_bpjs_object: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{t("BPJS Object")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_recurring}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{t("Recurring")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_contract}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_contract: e.target.checked }))}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">{t("Contract / OL")}</span>
                    </label>
                  </div></div></section>{formData.calculation_base === 'fixed' && formData.amount > 0 && (
                    <div className="dw-inline">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-700">{t("Total Allowance Amount")}</span>
                        <span className="dw-money">
                          {formatCurrency(formData.amount)}
                        </span>
                      </div>
                    </div>
                  )}
{formData.calculation_base !== 'fixed' && formData.percentage > 0 && selectedEmployee?.basic_salary && (
                    <div className="dw-inline">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-emerald-700">{t("Calculated Amount")}</span>
                          <p className="text-xs text-emerald-600 mt-0.5">
                            {payrollNumber(Number(formData.percentage))}{t("% of")} {formatCurrency(selectedEmployee.basic_salary)}
                          </p>
                        </div>
                        <span className="dw-money">
                          {formatCurrency(calculateAllowanceAmount())}
                        </span>
                      </div>
                    </div>
                  )}</div></div>

                <div className="ph-form-actions dw-actions">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ph-button ph-button-primary"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingAllowance ? t("Update") : t("Create")}
                  </button>
                </div>
              </form>
      </CompensationDialog>}
    {decisionDialog}
</>
  );
}
