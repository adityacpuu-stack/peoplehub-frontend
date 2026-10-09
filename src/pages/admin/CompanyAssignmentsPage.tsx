import { t, useLocale, intlLocale } from '@/i18n';
import { useReportConfirmation } from '@/pages/dashboard/useReportConfirmation';
import { Modal } from '@/components/ui/Modal';
import { ReportPage, ReportHeader, ReportSection } from '@/pages/dashboard/ReportingLayout';
import './admin-workflows.css';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Users, Search, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { companyAssignmentService } from '@/services/company-assignment.service';
import type { CompanyAssignment, AvailableEmployee } from '@/services/company-assignment.service';
import { companyService } from '@/services/company.service';

interface AssignmentCompany {
  id: number;
  name: string;
  code: string;
  company_type?: string;
}

export function CompanyAssignmentsPage() {
  useLocale();
  const { confirm, dialog: confirmationDialog } = useReportConfirmation();
  const [assignments, setAssignments] = useState<CompanyAssignment[]>([]);
  const [companies, setCompanies] = useState<AssignmentCompany[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [assignmentsRes, companiesRes] = await Promise.all([
        companyAssignmentService.getAll({ page: 1, limit: 500 }),
        companyService.getAll({ page: 1, limit: 100 }),
      ]);
      setAssignments(assignmentsRes.data);
      setCompanies(companiesRes.data);
      if (!activeCompanyId && companiesRes.data.length > 0) {
        setActiveCompanyId(companiesRes.data[0].id);
      }
    } catch {
      toast.error(t("Gagal memuat data"));
    } finally {
      setIsLoading(false);
    }
  };

  const openAssignModal = async (companyId: number) => {
    setSelectedCompanyId(companyId);
    setSelectedEmployeeId(null);
    try {
      const employees = await companyAssignmentService.getAvailableEmployees(companyId);
      setAvailableEmployees(employees);
      setShowModal(true);
    } catch {
      toast.error(t("Gagal memuat daftar karyawan"));
    }
  };

  const handleAssign = async () => {
    if (!selectedCompanyId || !selectedEmployeeId) { toast.error(t("Pilih karyawan terlebih dahulu")); return; }
    setIsAssigning(true);
    try {
      await companyAssignmentService.create({ employee_id: selectedEmployeeId, company_id: selectedCompanyId });
      toast.success(t("Berhasil assign karyawan ke company"));
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('Gagal assign'), { id: 'api-error' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm(t("Hapus assignment ini?")))) return;
    try {
      await companyAssignmentService.delete(id);
      toast.success(t("Assignment dihapus"));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('Gagal menghapus'), { id: 'api-error' });
    }
  };

  const handleToggleStatus = async (assignment: CompanyAssignment) => {
    const newStatus = assignment.status === 'active' ? 'inactive' : 'active';
    try {
      await companyAssignmentService.update(assignment.id, { status: newStatus });
      toast.success(t("Status diubah ke {status}", { status: t(newStatus === "active" ? "Active" : "Inactive") }));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('Gagal mengubah status'), { id: 'api-error' });
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;
  const activeAssignments = assignments.filter((a) => a.company_id === activeCompanyId);
  const totalAssignments = assignments.length;

  return (
    <ReportPage  className="ph-admin-page">{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl font-bold text-gray-900">{t("Company Assignments")}</h1><p className="text-sm text-gray-500">{t("Kelola akses perusahaan untuk staf P&C dan Admin IT")}</p></div>
<div className="report-header-context"><div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
          <span><span className="font-semibold text-gray-900">{(companies.length).toLocaleString(intlLocale())}</span>{' '}{t("company")}</span>
          <span className="text-gray-200">|</span>
          <span><span className="font-semibold text-gray-900">{(totalAssignments).toLocaleString(intlLocale())}</span>{' '}{t("total assignment")}</span>
        </div></div>
</ReportHeader>{/* Two-panel */}<ReportSection  className="overflow-hidden"><div className="admin-scope-layout">

          {/* Left: company list */}
          <div className="admin-scope-list">
            {/* Search */}
            <div className="px-3 py-3 border-b border-gray-100">
              <div className="relative report-search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("Cari company...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:border-slate-400 focus:outline-none focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="admin-scope-buttons">
                {filteredCompanies.map((company) => {
                  const count = assignments.filter((a) => a.company_id === company.id).length;
                  const isActive = company.id === activeCompanyId;
                  return (
                    <button aria-selected={activeCompanyId === company.id}
                      key={company.id}
                      onClick={() => setActiveCompanyId(company.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? "bg-slate-800 text-white" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {company.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-gray-900"}`}>
                          {company.name}
                        </p>
                        <p className={`text-xs ${isActive ? "text-white/60" : "text-gray-400"}`}>
                          {company.code}
                        </p>
                      </div>
                      {count > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {(count).toLocaleString(intlLocale())}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: assignments panel */}
          {activeCompany ? (
            <div className="admin-scope-detail">
              {/* Panel header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 report-avatar">
                    <Building2 className="w-4 h-4 text-[#65716b]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{activeCompany.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span className="font-mono">{activeCompany.code}</span>
                      <span>·</span>
                      <span>{(activeAssignments.length).toLocaleString(intlLocale())}{' '}{t("karyawan di-assign")}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => openAssignModal(activeCompany.id)} className="ph-button ph-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" />{t("Assign Karyawan")} </button>
              </div>

              {/* Assignment list */}
              <div className="flex-1 overflow-y-auto">
                {activeAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <Users className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-400">{t("Belum ada karyawan di-assign")}</p>
                    <p className="text-xs text-gray-300 mt-1">{t("Klik tombol \"Assign Karyawan\" untuk menambahkan")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {activeAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 report-avatar">
                          <span className="text-[#65716b] text-xs font-bold">
                            {assignment.employee.name.charAt(0)}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{assignment.employee.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {assignment.employee.position?.name || t('No Position')}
                            {assignment.employee.employee_id && ` · ${assignment.employee.employee_id}`}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleStatus(assignment)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                              assignment.status === "active"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {assignment.status === 'active' ? t("Aktif") : t("Nonaktif")}
                          </button>
                          <button aria-label={t("Hapus assignment {name}", { name: assignment.employee.name })}
                            onClick={() => handleDelete(assignment.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Building2 className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">{t("Pilih company di kiri")}</p>
            </div>
          )}
        </div></ReportSection>{/* Assign Modal */}{showModal && (
        <Modal isOpen onClose={() => setShowModal(false)} title={t("Assign Karyawan")} description={t("ke {company}", { company: companies.find((c) => c.id === selectedCompanyId)?.name || "" })} size="md" busy={isAssigning} className="admin-workflow-dialog admin-refreshed-dialog">
<section className="ph-section"><h3>{t("Pilih karyawan")}</h3><p>{t("Pilih satu karyawan yang tersedia untuk akses perusahaan ini.")}</p><p>{t("Untuk Admin IT, penugasan hanya menentukan perusahaan di ruang kerja akun Microsoft 365; tidak memberikan akses HR.")}</p></section>

            {/* Employee list */}
            <div className="admin-dialog-content">
              {availableEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">{t("Tidak ada karyawan P&C atau Admin IT yang tersedia")}</p>
                </div>
              ) : (
                <div className="admin-assignee-list">
                  {availableEmployees.map((employee) => (
                    <label
                      key={employee.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedEmployeeId === employee.id
                          ? "bg-emerald-50 border-emerald-200"
                          : "hover:bg-gray-50 border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="employee"
                        checked={selectedEmployeeId === employee.id}
                        onChange={() => setSelectedEmployeeId(employee.id)}
                        className="h-4 w-4"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        selectedEmployeeId === employee.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {employee.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${selectedEmployeeId === employee.id ? "text-emerald-900" : "text-gray-900"}`}>
                          {employee.name}
                        </p>
                        <p className={`text-xs truncate ${selectedEmployeeId === employee.id ? "text-emerald-700" : "text-gray-400"}`}>
                          {employee.position?.name || t('No Position')} · {employee.company?.name || ''}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="ph-dialog-footer">
              <button disabled={isAssigning} onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors">{t("Batal")} </button>
              <button onClick={handleAssign} disabled={!selectedEmployeeId || isAssigning} className="ph-button ph-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isAssigning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("Assigning...")}</> : t("Assign")}</button>
            </div>

</Modal>
      )}{confirmationDialog}</ReportPage>
  );
}
