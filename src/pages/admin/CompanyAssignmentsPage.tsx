import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Users, Search, X, Loader2, UserCheck } from 'lucide-react';
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

export default function CompanyAssignmentsPage() {
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
      toast.error('Gagal memuat data');
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
      toast.error('Gagal memuat daftar karyawan');
    }
  };

  const handleAssign = async () => {
    if (!selectedCompanyId || !selectedEmployeeId) { toast.error('Pilih karyawan terlebih dahulu'); return; }
    setIsAssigning(true);
    try {
      await companyAssignmentService.create({ employee_id: selectedEmployeeId, company_id: selectedCompanyId });
      toast.success('Berhasil assign karyawan ke company');
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal assign');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus assignment ini?')) return;
    try {
      await companyAssignmentService.delete(id);
      toast.success('Assignment dihapus');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menghapus');
    }
  };

  const handleToggleStatus = async (assignment: CompanyAssignment) => {
    const newStatus = assignment.status === 'active' ? 'inactive' : 'active';
    try {
      await companyAssignmentService.update(assignment.id, { status: newStatus });
      toast.success(`Status diubah ke ${newStatus}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengubah status');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Company Assignments</h1>
            <p className="text-sm text-gray-500">Kelola akses karyawan P&C ke masing-masing company</p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
          <span><span className="font-semibold text-gray-900">{companies.length}</span> company</span>
          <span className="text-gray-200">|</span>
          <span><span className="font-semibold text-gray-900">{totalAssignments}</span> total assignment</span>
        </div>
      </div>

      {/* Two-panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex min-h-[520px]">

          {/* Left: company list */}
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col">
            {/* Search */}
            <div className="px-3 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari company..."
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
              <div className="flex-1 overflow-y-auto py-1">
                {filteredCompanies.map((company) => {
                  const count = assignments.filter((a) => a.company_id === company.id).length;
                  const isActive = company.id === activeCompanyId;
                  return (
                    <button
                      key={company.id}
                      onClick={() => setActiveCompanyId(company.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? 'bg-slate-800 text-white' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {company.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {company.name}
                        </p>
                        <p className={`text-xs ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                          {company.code}
                        </p>
                      </div>
                      {count > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {count}
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
            <div className="flex-1 flex flex-col">
              {/* Panel header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{activeCompany.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span className="font-mono">{activeCompany.code}</span>
                      <span>·</span>
                      <span>{activeAssignments.length} karyawan di-assign</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openAssignModal(activeCompany.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign Karyawan
                </button>
              </div>

              {/* Assignment list */}
              <div className="flex-1 overflow-y-auto">
                {activeAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <Users className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-400">Belum ada karyawan di-assign</p>
                    <p className="text-xs text-gray-300 mt-1">Klik tombol "Assign Karyawan" untuk menambahkan</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {activeAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                        {/* Avatar */}
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">
                            {assignment.employee.name.charAt(0)}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{assignment.employee.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {assignment.employee.position?.name || 'No Position'}
                            {assignment.employee.employee_id && ` · ${assignment.employee.employee_id}`}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleStatus(assignment)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                              assignment.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {assignment.status === 'active' ? 'Aktif' : 'Nonaktif'}
                          </button>
                          <button
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
              <p className="text-sm text-gray-400">Pilih company di kiri</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Assign Karyawan</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  ke {companies.find((c) => c.id === selectedCompanyId)?.name}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Employee list */}
            <div className="p-4">
              {availableEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Tidak ada karyawan P&C yang tersedia</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {availableEmployees.map((employee) => (
                    <label
                      key={employee.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedEmployeeId === employee.id
                          ? 'bg-slate-800 border-slate-800'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="employee"
                        checked={selectedEmployeeId === employee.id}
                        onChange={() => setSelectedEmployeeId(employee.id)}
                        className="sr-only"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        selectedEmployeeId === employee.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {employee.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${selectedEmployeeId === employee.id ? 'text-white' : 'text-gray-900'}`}>
                          {employee.name}
                        </p>
                        <p className={`text-xs truncate ${selectedEmployeeId === employee.id ? 'text-white/60' : 'text-gray-400'}`}>
                          {employee.position?.name || 'No Position'} · {employee.company?.name || ''}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Batal
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedEmployeeId || isAssigning}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Assigning...</> : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
