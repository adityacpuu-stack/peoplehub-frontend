import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, User, Search, X } from 'lucide-react';
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
  const [filterCompanyId, setFilterCompanyId] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterCompanyId, search]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [assignmentsRes, companiesRes] = await Promise.all([
        companyAssignmentService.getAll({
          page: 1,
          limit: 100,
          company_id: filterCompanyId ? parseInt(filterCompanyId) : undefined,
          search: search || undefined,
        }),
        companyService.getAll({ page: 1, limit: 100 }),
      ]);
      setAssignments(assignmentsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
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
    } catch (error) {
      console.error('Failed to fetch available employees:', error);
      toast.error('Gagal memuat daftar karyawan');
    }
  };

  const handleAssign = async () => {
    if (!selectedCompanyId || !selectedEmployeeId) {
      toast.error('Pilih karyawan terlebih dahulu');
      return;
    }

    try {
      await companyAssignmentService.create({
        employee_id: selectedEmployeeId,
        company_id: selectedCompanyId,
      });
      toast.success('Berhasil assign company ke karyawan');
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal assign company');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus assignment ini?')) return;

    try {
      await companyAssignmentService.delete(id);
      toast.success('Assignment berhasil dihapus');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menghapus assignment');
    }
  };

  const handleToggleStatus = async (assignment: CompanyAssignment) => {
    const newStatus = assignment.status === 'active' ? 'inactive' : 'active';
    try {
      await companyAssignmentService.update(assignment.id, { status: newStatus });
      toast.success(`Status berhasil diubah ke ${newStatus}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengubah status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Assignments</h1>
          <p className="text-gray-600 mt-1">
            Kelola akses karyawan HR ke masing-masing company untuk proses payroll, dll
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Karyawan</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama karyawan..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter Company</label>
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => {
          const companyAssignments = assignments.filter((a) => a.company_id === company.id);
          return (
            <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Company Header */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                    <p className="text-sm text-gray-500">{company.code}</p>
                  </div>
                  <button
                    onClick={() => openAssignModal(company.id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Tambah Assignment"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Assigned Employees */}
              <div className="p-4">
                {companyAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Belum ada karyawan yang di-assign
                  </p>
                ) : (
                  <div className="space-y-2">
                    {companyAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          assignment.status === 'active'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">
                            {assignment.employee.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {assignment.employee.position?.name || 'No Position'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(assignment)}
                            className={`px-2 py-1 text-xs rounded-full ${
                              assignment.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {assignment.status}
                          </button>
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Assign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Assign Karyawan ke Company</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Karyawan HR
                </label>
                {availableEmployees.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                    Tidak ada karyawan HR yang tersedia untuk di-assign
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableEmployees.map((employee) => (
                      <label
                        key={employee.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedEmployeeId === employee.id
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="employee"
                          checked={selectedEmployeeId === employee.id}
                          onChange={() => setSelectedEmployeeId(employee.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-500">
                            {employee.position?.name || 'No Position'} • {employee.company?.name || 'No Company'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedEmployeeId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
