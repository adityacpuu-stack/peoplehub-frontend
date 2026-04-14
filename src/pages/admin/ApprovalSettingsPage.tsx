import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Save,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Clock,
  Briefcase,
  Info,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui';
import { toast } from 'react-hot-toast';
import { employeeService } from '@/services/employee.service';
import { companyService } from '@/services/company.service';

interface ApprovalEmployee {
  id: number;
  employee_id?: string | null;
  name: string;
  job_title?: string | null;
  position?: { name: string } | null;
  company?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  manager_id?: number;
  leave_approver_id?: number;
  overtime_approver_id?: number;
  manager?: { id: number; name: string } | null;
  leaveApprover?: { id: number; name: string } | null;
  overtimeApprover?: { id: number; name: string } | null;
}

interface ApprovalCompany {
  id: number;
  name: string;
}

export function ApprovalSettingsPage() {
  const [employees, setEmployees] = useState<ApprovalEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<ApprovalEmployee[]>([]);
  const [companies, setCompanies] = useState<ApprovalCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [changes, setChanges] = useState<Map<number, Record<string, unknown>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const companyResponse = await companyService.getAll();
      setCompanies(companyResponse.data || []);

      const allEmpResponse = await employeeService.getAll({ page: 1, limit: 1000 });
      setAllEmployees(allEmpResponse.data as unknown as ApprovalEmployee[] || []);

      const params: Record<string, unknown> = {
        page,
        limit,
        search: search || undefined,
        company_id: companyFilter || undefined,
      };
      const response = await employeeService.getAll(params);
      setEmployees(response.data as unknown as ApprovalEmployee[] || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, companyFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChange = (employeeId: number, field: string, value: number | undefined) => {
    setChanges(prev => {
      const newChanges = new Map(prev);
      const existing = newChanges.get(employeeId) || {};
      newChanges.set(employeeId, { ...existing, [field]: value ?? null });
      return newChanges;
    });
    setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, [field]: value } : emp));
  };

  const handleSaveAll = async () => {
    if (changes.size === 0) { toast.error('Tidak ada perubahan'); return; }
    setIsSaving(true);
    try {
      await Promise.all(Array.from(changes.entries()).map(([id, data]) => employeeService.update(id, data)));
      toast.success(`${changes.size} karyawan berhasil diupdate`);
      setChanges(new Map());
      fetchData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  const getEmployeeOptions = (excludeId: number) =>
    allEmployees
      .filter(e => e.id !== excludeId)
      .map(e => ({
        value: e.id,
        label: e.name,
        sublabel: `${e.position?.name || 'No Position'} • ${e.company?.name || ''}`,
      }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Approval Settings</h1>
            <p className="text-sm text-gray-500">Atur Manager, Leave Approver, dan Overtime Approver per karyawan</p>
          </div>
        </div>
        {changes.size > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan ({changes.size})
          </button>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="text-xs text-gray-500 space-y-0.5">
          <p><span className="font-semibold text-gray-700">Manager</span> — digunakan untuk hierarki org chart</p>
          <p><span className="font-semibold text-gray-700">Leave Approver</span> — yang menyetujui cuti (jika kosong, menggunakan Manager)</p>
          <p><span className="font-semibold text-gray-700">Overtime Approver</span> — yang menyetujui lembur (jika kosong, menggunakan Manager)</p>
        </div>
      </div>

      {/* Table Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={companyFilter}
              onChange={(e) => { setCompanyFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className="pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all appearance-none"
            >
              <option value="">Semua Company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <span className="text-xs text-gray-400 ml-auto hidden sm:block">
            {total} karyawan
            {changes.size > 0 && <span className="ml-2 text-amber-600 font-medium">· {changes.size} diubah</span>}
          </span>
        </div>

        {/* Column headers */}
        <div className="hidden md:flex items-center px-5 py-2.5 bg-gray-50 border-b border-gray-100 gap-4">
          <div className="w-52 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wider">Karyawan</div>
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[
              { icon: Briefcase, label: 'Manager', color: 'text-slate-500' },
              { icon: UserCheck, label: 'Leave Approver', color: 'text-emerald-500' },
              { icon: Clock, label: 'Overtime Approver', color: 'text-amber-500' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300 mx-auto" />
            </div>
          ) : employees.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Tidak ada karyawan ditemukan</p>
            </div>
          ) : (
            employees.map((employee) => {
              const hasChanges = changes.has(employee.id);
              return (
                <div
                  key={employee.id}
                  className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-5 py-3 transition-colors ${hasChanges ? 'bg-amber-50/60' : 'hover:bg-gray-50/50'}`}
                >
                  {/* Employee */}
                  <div className="w-full md:w-52 shrink-0 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
                      {employee.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{employee.name}</p>
                        {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {employee.position?.name || 'No Position'}{employee.company?.name && ` · ${employee.company.name}`}
                      </p>
                    </div>
                  </div>

                  {/* 3 Selects */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-1 md:hidden flex items-center gap-1"><Briefcase className="w-3 h-3" />Manager</p>
                      <SearchableSelect
                        value={employee.manager_id || ''}
                        onChange={(val) => handleChange(employee.id, 'manager_id', val ? Number(val) : undefined)}
                        placeholder="— Tidak ada —"
                        searchPlaceholder="Cari..."
                        options={getEmployeeOptions(employee.id)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1 md:hidden flex items-center gap-1"><UserCheck className="w-3 h-3" />Leave Approver</p>
                      <SearchableSelect
                        value={employee.leave_approver_id || ''}
                        onChange={(val) => handleChange(employee.id, 'leave_approver_id', val ? Number(val) : undefined)}
                        placeholder="— Sama dg Manager —"
                        searchPlaceholder="Cari..."
                        options={getEmployeeOptions(employee.id)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1 md:hidden flex items-center gap-1"><Clock className="w-3 h-3" />Overtime Approver</p>
                      <SearchableSelect
                        value={employee.overtime_approver_id || ''}
                        onChange={(val) => handleChange(employee.id, 'overtime_approver_id', val ? Number(val) : undefined)}
                        placeholder="— Sama dg Manager —"
                        searchPlaceholder="Cari..."
                        options={getEmployeeOptions(employee.id)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} dari {total} karyawan
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 px-1">Hal. {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Save */}
      {changes.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors shadow-xl disabled:opacity-50"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>
            ) : (
              <><Save className="w-4 h-4" />Simpan {changes.size} Perubahan</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
