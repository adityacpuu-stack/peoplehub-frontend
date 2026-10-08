import { payrollNumber } from '@/components/payroll/localization';
import { payrollEnumLabel } from '@/components/payroll/localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { useDomainConfirmation } from '@/pages/leave/useDomainConfirmation';
import '@/pages/leave/domain-workflows.css';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { MinusCircle, Plus, Edit2, Trash2, Loader2, Check, XCircle, AlertTriangle, Banknote, Receipt, Wallet } from 'lucide-react';
import { deductionService, DEDUCTION_TYPES } from '../../services/deduction.service';
import type { PayrollAdjustment, DeductionListQuery, CreateDeductionDTO } from '../../services/deduction.service';
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

export function DeductionsPage() {
  useLocale();
  const { requestDecision, decisionDialog } = useDomainConfirmation('compensation-refresh-dialog');
  const user = useAuthStore(state => state.user);
  // Match the existing allowance/payroll-adjustment write routes.
  const canManage = user?.roles.some(role => ['Super Admin', 'HR Manager', 'HR Staff'].includes(role)) ?? false;
  const canApprove = user?.roles.some(role => ['Super Admin', 'HR Manager', 'Finance Manager'].includes(role)) ?? false;
  const dataRequest = useRef(0);
  const employeeRequest = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [companiesError, setCompaniesError] = useState(false);
  const [employeesError, setEmployeesError] = useState(false);
  useEffect(() => () => { dataRequest.current++; employeeRequest.current++; }, []);
  const [deductions, setDeductions] = useState<PayrollAdjustment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<PayrollAdjustment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 12;

  const [formData, setFormData] = useState({
    type: 'deduction' as string,
    category: '',
    description: '',
    reason: '',
    amount: 0,
    is_recurring: false,
    recurring_frequency: 'monthly' as string,
    recurring_end_date: '',
    company_id: '' as string | number,
    employee_id: '' as string | number,
    effective_date: '',
    pay_period: '',
    reference_number: '',
    total_loan_amount: 0,
    installment_amount: 0,
  });

  // Fetch deductions from API
  const fetchDeductions = useCallback(async () => {
    const request = ++dataRequest.current;
    setLoadError(false);
    setLoading(true);
    try {
      const query: DeductionListQuery = {
        page,
        limit,
        search: search || undefined,
      };
      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterCompany !== 'all') {
        query.company_id = Number(filterCompany);
      }
      if (filterType !== 'all') {
        query.type = filterType;
      }

      const response = await deductionService.list(query);
      if (request !== dataRequest.current) return;
      // Filter to only show deduction types
      const deductionData = response.data.filter(d =>
        DEDUCTION_TYPES.includes(d.type as typeof DEDUCTION_TYPES[number])
      );
      setDeductions(deductionData);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
    } catch (error) {
      if (request !== dataRequest.current) return;
      setLoadError(true);
      setDeductions([]);
      console.error('Failed to fetch deductions:', error);
    } finally {
      if (request === dataRequest.current) setLoading(false);
    }
  }, [page, search, filterStatus, filterCompany, filterType]);

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

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch employees when modal opens or company changes
  useEffect(() => {
    if (showModal) {
      if (formData.company_id) {
        fetchEmployees(Number(formData.company_id));
      } else {
        fetchEmployees();
      }
    }
  }, [showModal, formData.company_id, fetchEmployees]);

  useEffect(() => {
    fetchDeductions();
  }, [fetchDeductions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCompany, filterType]);

  // Stats (computed from current data)
  const stats = useMemo(() => {
    const pendingCount = deductions.filter(d => d.status === 'pending').length;
    const approvedCount = deductions.filter(d => d.status === 'approved').length;
    const totalAmount = deductions.filter(d => d.status === 'approved').reduce((acc, d) => acc + Number(d.amount || 0), 0);
    return {
      totalItems,
      pendingCount,
      approvedCount,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
    };
  }, [deductions, totalItems]);

  const isLoanType = formData.type === 'loan' || formData.type === 'advance';

  const computedInstallments = useMemo(() => {
    if (!isLoanType || !formData.total_loan_amount || !formData.installment_amount) return 0;
    return Math.ceil(formData.total_loan_amount / formData.installment_amount);
  }, [isLoanType, formData.total_loan_amount, formData.installment_amount]);

  const computedEndDate = useMemo(() => {
    if (!computedInstallments || !formData.effective_date) return '';
    try {
      const date = new Date(formData.effective_date);
      if (isNaN(date.getTime())) return '';
      date.setMonth(date.getMonth() + computedInstallments);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [computedInstallments, formData.effective_date]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deduction':
        return <MinusCircle className="w-5 h-5" />;
      case 'penalty':
        return <AlertTriangle className="w-5 h-5" />;
      case 'loan':
        return <Banknote className="w-5 h-5" />;
      case 'advance':
        return <Wallet className="w-5 h-5" />;
      default:
        return <Receipt className="w-5 h-5" />;
    }
  };

  const handleOpenModal = (deduction?: PayrollAdjustment) => {
    if (deduction) {
      setEditingDeduction(deduction);
      setFormData({
        type: deduction.type,
        category: deduction.category || '',
        description: deduction.description || '',
        reason: deduction.reason || '',
        amount: Number(deduction.amount) || 0,
        is_recurring: deduction.is_recurring,
        recurring_frequency: deduction.recurring_frequency || 'monthly',
        recurring_end_date: deduction.recurring_end_date ? deduction.recurring_end_date.split('T')[0] : '',
        company_id: deduction.company_id || '',
        employee_id: deduction.employee_id || '',
        effective_date: deduction.effective_date ? deduction.effective_date.split('T')[0] : '',
        pay_period: deduction.pay_period || '',
        reference_number: deduction.reference_number || '',
        total_loan_amount: Number(deduction.total_loan_amount) || 0,
        installment_amount: Number(deduction.installment_amount) || 0,
      });
      if (deduction.employee) {
        setSelectedEmployee({
          id: deduction.employee.id,
          name: deduction.employee.name,
          employee_id: deduction.employee.employee_id,
          department: deduction.employee.department,
        });
      } else {
        setSelectedEmployee(null);
      }
    } else {
      setEditingDeduction(null);
      setFormData({
        type: 'deduction',
        category: '',
        description: '',
        reason: '',
        amount: 0,
        is_recurring: false,
        recurring_frequency: 'monthly',
        recurring_end_date: '',
        company_id: '',
        employee_id: '',
        effective_date: '',
        pay_period: '',
        reference_number: '',
        total_loan_amount: 0,
        installment_amount: 0,
      });
      setSelectedEmployee(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDeduction(null);
    setSelectedEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isLoan = formData.type === 'loan' || formData.type === 'advance';

    if (!formData.employee_id) {
      toast.error(t("Karyawan harus dipilih"), { id: 'api-error', toasterId: 'compensation-dialog' });
      return;
    }

    if (isLoan) {
      if (!formData.total_loan_amount || !formData.installment_amount) {
        toast.error(t("Total pinjaman dan cicilan per bulan harus diisi"), { id: 'api-error', toasterId: 'compensation-dialog' });
        return;
      }
    } else {
      if (!formData.amount) {
        toast.error(t("Jumlah harus diisi"), { id: 'api-error', toasterId: 'compensation-dialog' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: CreateDeductionDTO = {
        employee_id: Number(formData.employee_id),
        type: formData.type,
        category: formData.category || undefined,
        amount: isLoan ? formData.installment_amount : formData.amount,
        description: formData.description || undefined,
        reason: formData.reason || undefined,
        effective_date: formData.effective_date || undefined,
        pay_period: formData.pay_period || undefined,
        is_recurring: isLoan ? true : formData.is_recurring,
        recurring_frequency: isLoan ? 'monthly' : (formData.is_recurring ? formData.recurring_frequency : undefined),
        recurring_end_date: isLoan
          ? (computedEndDate || undefined)
          : (formData.is_recurring && formData.recurring_end_date ? formData.recurring_end_date : undefined),
        reference_number: formData.reference_number || undefined,
        company_id: formData.company_id ? Number(formData.company_id) : undefined,
      };

      if (isLoan) {
        payload.total_loan_amount = formData.total_loan_amount;
        payload.installment_amount = formData.installment_amount;
      }

      if (editingDeduction) {
        await deductionService.update(editingDeduction.id, payload);
        toast.success(t("Potongan berhasil diperbarui"));
      } else {
        await deductionService.create(payload);
        toast.success(t("Potongan berhasil ditambahkan"));
      }

      handleCloseModal();
      fetchDeductions();
    } catch (error) {
      console.error('Failed to save deduction:', error);
      toast.error((isAxiosError(error) ? error.response?.data?.error?.message || error.response?.data?.message : undefined) || t('Gagal menyimpan potongan'), { id: 'api-error', toasterId: 'compensation-dialog' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await requestDecision({ title: t('Hapus potongan'), message: t('Yakin ingin menghapus potongan ini?'), confirmLabel: t('Hapus') }))) return;

    try {
      await deductionService.delete(id);
      toast.success(t("Potongan berhasil dihapus"));
      fetchDeductions();
    } catch (error) {
      console.error('Failed to delete deduction:', error);
      toast.error((isAxiosError(error) ? error.response?.data?.error?.message || error.response?.data?.message : undefined) || t('Gagal menghapus potongan'), { id: 'api-error' });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await deductionService.approve(id);
      toast.success(t("Potongan berhasil disetujui"));
      fetchDeductions();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error((isAxiosError(error) ? error.response?.data?.error?.message || error.response?.data?.message : undefined) || t('Gagal menyetujui'), { id: 'api-error' });
    }
  };

  const handleReject = async (id: number) => {
    const reason = (await requestDecision({ title: t('Tolak potongan'), message: t('Alasan ini akan disimpan bersama penolakan.'), confirmLabel: t('Tolak'), reasonLabel: t('Alasan penolakan:') }));
    if (!reason) return;

    try {
      await deductionService.reject(id, reason);
      toast.success(t("Potongan berhasil ditolak"));
      fetchDeductions();
    } catch (error) {
      console.error('Failed to reject:', error);
      toast.error((isAxiosError(error) ? error.response?.data?.error?.message || error.response?.data?.message : undefined) || t('Gagal menolak'), { id: 'api-error' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <CompensationWorkspace title={t("Deductions")} description={t("Kelola potongan, pinjaman, dan cicilan karyawan.")}
        actions={canManage && <button className="cp-button cp-primary" onClick={() => handleOpenModal()}><Plus size={17} />{t("Tambah Potongan")}</button>}
        filters={<>
          <label className="cp-field">{t("company")}<select aria-label={t("Filter company")} value={filterCompany} onChange={event => { setFilterCompany(event.target.value); setPage(1); }}><option value="all">{t("Semua company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            {companiesError && <p className="cp-filter-error" role="alert">{t("Daftar company gagal dimuat.")} <button onClick={fetchCompanies}>{t("Coba lagi")}</button></p>}
          <label className="cp-field">{t("tipe")}<select aria-label={t("Filter tipe")} value={filterType} onChange={event => { setFilterType(event.target.value); setPage(1); }}><option value="all">{t("Semua tipe")}</option>{DEDUCTION_TYPES.map(type => <option key={type} value={type}>{payrollEnumLabel(type)}</option>)}</select></label>
          <label className="cp-field">{t("status")}<select aria-label={t("Filter status")} value={filterStatus} onChange={event => { setFilterStatus(event.target.value); setPage(1); }}><option value="all">{t("Semua status")}</option><option value="pending">{t("Pending")}</option><option value="approved">{t("Approved")}</option><option value="rejected">{t("Rejected")}</option><option value="processed">{t("Processed")}</option></select></label>
          <button className="cp-reset" onClick={() => { setSearch(''); setFilterCompany('all'); setFilterType('all'); setFilterStatus('all'); setPage(1); }}>{t("Reset filter")}</button>
          <p className="cp-filter-note">{t("Lihat status persetujuan dan sisa cicilan sebelum memperbarui potongan.")}</p>
        </>}
        metrics={[
          { label: t('Potongan ditampilkan'), value: payrollNumber(deductions.length), note: t('Pada halaman ini') },
          { label: t('Menunggu persetujuan'), value: payrollNumber(stats.pendingCount), note: t('Pada halaman ini') },
          { label: t('Nominal disetujui'), value: formatCurrency(stats.totalAmount), note: t('Pada halaman ini') },
        ]}
        search={search} onSearch={value => { setSearch(value); setPage(1); }} searchLabel={t("Cari potongan…")}
        loading={loading} error={loadError} onRetry={fetchDeductions}
        page={page} totalPages={totalPages} onPage={setPage} count={t("{value0} potongan di halaman ini", { value0: payrollNumber(deductions.length) })}>
        {!deductions.length ? <CompensationEmpty /> : <table className="cp-table cp-deductions"><thead><tr><th>{t("Potongan / Karyawan")}</th><th>{t("Nominal / Cicilan")}</th><th>{t("Periode")}</th><th>{t("Status")}</th><th><span className="sr-only">{t("Aksi")}</span></th></tr></thead>
          <tbody>{deductions.map(deduction => <tr key={deduction.id}>
            <td><div className="cp-record-title"><span className="cp-record-icon">{getIcon(deduction.type)}</span><div><strong>{deduction.employee?.name || t('Karyawan')}</strong><small>{deduction.employee?.employee_id} · {payrollEnumLabel(deduction.type)}</small></div></div>
              <p className="cp-description">{deduction.description || deduction.category || t('Potongan karyawan')}</p>{deduction.employee?.department && <small>{deduction.employee.department.name}</small>}
              {deduction.rejection_reason && <p className="cp-rejection">{t("Ditolak:")} {deduction.rejection_reason}</p>}</td>
            <td data-label={t("Nominal / Cicilan")} className="cp-money"><strong>{formatCurrency(Number(deduction.amount))}</strong>
              {(deduction.type === 'loan' || deduction.type === 'advance') && deduction.total_installments ? <div className="cp-installment"><small>{t("Cicilan")} {payrollNumber(Number(deduction.current_installment || 0))} / {payrollNumber(Number(deduction.total_installments))}</small><progress aria-label={t("Progress cicilan")} value={deduction.current_installment || 0} max={deduction.total_installments} /><small>{t("Sisa")} {formatCurrency(Number(deduction.remaining_balance || 0))}</small><small>{t("Total")} {formatCurrency(Number(deduction.total_loan_amount || 0))}</small></div> : <small>{deduction.is_recurring ? t("Berulang") : t("Sekali bayar")}</small>}</td>
            <td data-label={t("Periode")}><strong>{deduction.effective_date ? new Date(deduction.effective_date).toLocaleDateString(intlLocale()) : '—'}</strong><small>{deduction.pay_period || t('Periode belum ditentukan')}</small>{deduction.is_recurring && <span className="cp-tag">{t("Recurring")}</span>}</td>
            <td data-label={t("Status")}><CompensationStatus status={deduction.status} /></td>
            <td className="cp-row-actions">{canApprove && deduction.status === 'pending' && <><button className="cp-icon-button" aria-label={t("Approve potongan {value0}", { value0: deduction.id })} onClick={() => handleApprove(deduction.id)}><Check size={16} /></button><button className="cp-icon-button cp-danger" aria-label={t("Reject potongan {value0}", { value0: deduction.id })} onClick={() => handleReject(deduction.id)}><XCircle size={16} /></button></>}{canManage && <><button className="cp-icon-button" aria-label={t("Edit potongan {value0}", { value0: deduction.id })} onClick={() => handleOpenModal(deduction)}><Edit2 size={16} /></button><button className="cp-icon-button cp-danger" aria-label={t("Hapus potongan {value0}", { value0: deduction.id })} onClick={() => handleDelete(deduction.id)}><Trash2 size={16} /></button></>}</td>
          </tr>)}</tbody></table>}
      </CompensationWorkspace>
      {showModal && canManage && <CompensationDialog title={editingDeduction ? t("Edit Potongan") : t("Tambah Potongan")} subtitle={t("Tentukan karyawan, jenis potongan, dan periode berlakunya.")} busy={submitting} onClose={handleCloseModal}>
        {employeesError && <p className="cp-form-error" role="alert">{t("Daftar karyawan gagal dimuat.")} <button type="button" onClick={() => fetchEmployees(formData.company_id ? Number(formData.company_id) : undefined)}>{t("Coba lagi")}</button></p>}
        <form onSubmit={handleSubmit} className="ph-workflow dw-form">
                <div><div className="dw-form-content"><section className="ph-section dw-section"><h3>{t("Karyawan")}</h3><div className="dw-fields"><div className="dw-fields">

                    <div className="ph-form-grid dw-form-grid">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Perusahaan")}</label>
                        <select aria-label={t("Perusahaan")}
                          value={formData.company_id}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, company_id: e.target.value, employee_id: '' }));
                            setSelectedEmployee(null);
                          }}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                        >
                          <option value="">{t("Semua Perusahaan")}</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Karyawan")} <span className="text-red-500">*</span>
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
                          placeholder={t("Cari karyawan...")}
                          searchPlaceholder={t("Ketik nama atau ID...")}
                          disabled={loadingEmployees}
                          loading={loadingEmployees}
                          emptyMessage={t("Tidak ada karyawan")}
                        />
                      </div>
                    </div>

                    {selectedEmployee && (
                      <div className="dw-context">
                        <div className="flex items-center gap-3">

                          <div>
                            <p className="font-medium text-gray-900">{selectedEmployee.name}</p>
                            <p className="text-xs text-gray-500">
                              {selectedEmployee.employee_id}
                              {selectedEmployee.department && ` - ${selectedEmployee.department.name}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Potongan & cicilan")}</h3><div className="dw-fields"><div className={isLoanType ? 'dw-fields' : 'ph-form-grid dw-form-grid'}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Tipe Potongan")} <span className="text-red-500">*</span>
                      </label>
                      <select aria-label={t("Tipe Potongan *")}
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          type: e.target.value,
                          // Reset loan fields when switching away from loan type
                          ...(e.target.value !== 'loan' && e.target.value !== 'advance' ? {
                            total_loan_amount: 0,
                            installment_amount: 0,
                          } : {}),
                        }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        required
                      >
                        {DEDUCTION_TYPES.map(type => (
                          <option key={type} value={type}>{payrollEnumLabel(type)}</option>
                        ))}
                      </select>
                    </div>
                    {!isLoanType && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Jumlah (Rp)")} <span className="text-red-500">*</span>
                        </label>
                        <input aria-label={t("Jumlah (Rp) *")}
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          placeholder="0"
                          required
                        />
                      </div>
                    )}
                  </div>
{isLoanType && (
                    <div className="dw-fields">
                      <h3 className="dw-section-heading">{t("Detail Pinjaman / Kasbon")}</h3>
                      <div className="ph-form-grid dw-form-grid">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Total Pinjaman (Rp)")} <span className="text-red-500">*</span>
                          </label>
                          <input aria-label={t("Total Pinjaman (Rp) *")}
                            type="number"
                            value={formData.total_loan_amount || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, total_loan_amount: Number(e.target.value) }))}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            placeholder={t("e.g. 4000000")}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Cicilan per Bulan (Rp)")} <span className="text-red-500">*</span>
                          </label>
                          <input aria-label={t("Cicilan per Bulan (Rp) *")}
                            type="number"
                            value={formData.installment_amount || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, installment_amount: Number(e.target.value) }))}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            placeholder={t("e.g. 500000")}
                            required
                          />
                        </div>
                      </div>
                      {computedInstallments > 0 && (
                        <div className="dw-note">{t("Jumlah Cicilan:")} <strong>{payrollNumber(Number(computedInstallments))}{' '}{t("bulan")}</strong>
                        </div>
                      )}

                      {/* Loan Summary Preview */}
                      {formData.total_loan_amount > 0 && formData.installment_amount > 0 && computedInstallments > 0 && (
                        <div className="dw-context">
                          <h3 className="dw-section-heading">{t("Ringkasan Pinjaman")}</h3>
                          <dl className="dw-kv">
                            <div>
                              <dt>{t("Total Pinjaman")}</dt>
                              <dd>{formatCurrency(formData.total_loan_amount)}</dd>
                            </div>
                            <div>
                              <dt>{t("Cicilan")}</dt>
                              <dd>
                                {formatCurrency(formData.installment_amount)}{' '}{t("x")} {payrollNumber(Number(computedInstallments))}{' '}{t("bulan")} </dd>
                            </div>
                            {formData.effective_date && computedEndDate && (
                              <div>
                                <dt>{t("Periode")}</dt>
                                <dd>
                                  {new Date(formData.effective_date).toLocaleDateString(intlLocale(), { month: 'short', year: 'numeric' })}
                                  {' - '}
                                  {new Date(computedEndDate).toLocaleDateString(intlLocale(), { month: 'short', year: 'numeric' })}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      )}
                    </div>
                  )}</div></section><section className="ph-section dw-section"><h3>{t("Periode & keterangan")}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Kategori")}</label>
                      <input aria-label={t("Kategori")}
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        placeholder={t("e.g., Cicilan, Denda")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Periode Gaji")}</label>
                      <input aria-label={t("Periode Gaji")}
                        type="month"
                        value={formData.pay_period}
                        onChange={(e) => setFormData(prev => ({ ...prev, pay_period: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  </div>
<div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Keterangan")}</label>
                    <textarea aria-label={t("Keterangan")}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      rows={2}
                      placeholder={t("Keterangan potongan...")}
                    />
                  </div>
<div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Tanggal Efektif")}</label>
                      <input aria-label={t("Tanggal Efektif")}
                        type="date"
                        value={formData.effective_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("No. Referensi")}</label>
                      <input aria-label={t("No. Referensi")}
                        type="text"
                        value={formData.reference_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        placeholder={t("e.g., LOAN-2024-001")}
                      />
                    </div>
                  </div>
{!isLoanType && (
                    <div className="dw-fields">
                      <label className="flex items-center gap-2 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={formData.is_recurring}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{t("Potongan Berulang (Recurring)")}</span>
                      </label>

                      {formData.is_recurring && (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t("Frekuensi")}</label>
                            <select aria-label={t("Frekuensi")}
                              value={formData.recurring_frequency}
                              onChange={(e) => setFormData(prev => ({ ...prev, recurring_frequency: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            >
                              <option value="monthly">{t("Bulanan")}</option>
                              <option value="quarterly">{t("Per Kuartal")}</option>
                              <option value="yearly">{t("Tahunan")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t("Berakhir Pada")}</label>
                            <input aria-label={t("Berakhir Pada")}
                              type="date"
                              value={formData.recurring_end_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, recurring_end_date: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}</div></section>{!isLoanType && formData.amount > 0 && (
                    <div className="dw-inline">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700">{t("Total Potongan")}</span>
                        <span className="dw-money">
                          {formatCurrency(formData.amount)}
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
                  >{t("Batal")} </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ph-button ph-button-primary"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingDeduction ? t("Perbarui") : t("Simpan")}
                  </button>
                </div>
              </form>
      </CompensationDialog>}
    {decisionDialog}
</>
  );
}
