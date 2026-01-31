import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Save,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  Clock,
  Briefcase,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageSpinner,
  SearchableSelect,
} from '@/components/ui';
import { toast } from 'react-hot-toast';
import { employeeService } from '@/services/employee.service';
import { companyService } from '@/services/company.service';

interface Employee {
  id: number;
  employee_id: string | null;
  name: string;
  job_title: string | null;
  company?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  manager_id?: number;
  leave_approver_id?: number;
  overtime_approver_id?: number;
  manager?: { id: number; name: string } | null;
  leaveApprover?: { id: number; name: string } | null;
  overtimeApprover?: { id: number; name: string } | null;
}

interface Company {
  id: number;
  name: string;
}

export function ApprovalSettingsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Track changes
  const [changes, setChanges] = useState<Map<number, Partial<Employee>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch companies
      const companyResponse = await companyService.getAll();
      setCompanies(companyResponse.data || []);

      // Fetch all employees for dropdown options
      const allEmpResponse = await employeeService.getAll({ page: 1, limit: 1000 });
      setAllEmployees(allEmpResponse.data || []);

      // Fetch paginated employees for table
      const params: Record<string, unknown> = {
        page,
        limit,
        search: search || undefined,
        company_id: companyFilter || undefined,
      };

      const response = await employeeService.getAll(params);
      setEmployees(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotal(response.meta?.total || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, companyFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (employeeId: number, field: string, value: number | undefined) => {
    setChanges(prev => {
      const newChanges = new Map(prev);
      const existing = newChanges.get(employeeId) || {};
      newChanges.set(employeeId, { ...existing, [field]: value });
      return newChanges;
    });

    // Update local state for immediate feedback
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, [field]: value };
      }
      return emp;
    }));
  };

  const handleSaveAll = async () => {
    if (changes.size === 0) {
      toast.error('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const promises = Array.from(changes.entries()).map(([employeeId, data]) =>
        employeeService.update(employeeId, data)
      );

      await Promise.all(promises);
      toast.success(`Successfully updated ${changes.size} employee(s)`);
      setChanges(new Map());
      fetchData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const getEmployeeOptions = (excludeId: number) => {
    return allEmployees
      .filter(e => e.id !== excludeId)
      .map(e => ({
        value: e.id,
        label: e.name,
        sublabel: `${e.job_title || 'No Position'} • ${e.company?.name || ''}`,
      }));
  };

  if (isLoading && employees.length === 0) {
    return <PageSpinner />;
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              Approval Settings
            </h1>
            <p className="text-gray-500 mt-1">
              Manage Manager, Leave Approver, and Overtime Approver for all employees
            </p>
          </div>
          {changes.size > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              Save Changes ({changes.size})
            </button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">How it works:</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li><strong>Manager:</strong> For org chart hierarchy</li>
            <li><strong>Leave Approver:</strong> Who approves leave requests (if empty, uses Manager)</li>
            <li><strong>Overtime Approver:</strong> Who approves overtime requests (if empty, uses Manager)</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-64">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value ? Number(e.target.value) : '');
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All Companies</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Employees ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[250px]">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[280px]">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                      Manager (Org Chart)
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[280px]">
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Leave Approver
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[280px]">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-orange-600" />
                      Overtime Approver
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((employee) => {
                  const hasChanges = changes.has(employee.id);
                  return (
                    <tr
                      key={employee.id}
                      className={`hover:bg-gray-50 transition-colors ${hasChanges ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{employee.name}</p>
                            <p className="text-xs text-gray-500">
                              {employee.job_title || 'No Position'} • {employee.company?.name || 'No Company'}
                            </p>
                          </div>
                          {hasChanges && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                              Modified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <SearchableSelect
                          value={employee.manager_id || ''}
                          onChange={(val) => handleChange(employee.id, 'manager_id', val ? Number(val) : undefined)}
                          placeholder="-- No Manager --"
                          searchPlaceholder="Search..."
                          options={getEmployeeOptions(employee.id)}
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <SearchableSelect
                          value={employee.leave_approver_id || ''}
                          onChange={(val) => handleChange(employee.id, 'leave_approver_id', val ? Number(val) : undefined)}
                          placeholder="-- Same as Manager --"
                          searchPlaceholder="Search..."
                          options={getEmployeeOptions(employee.id)}
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <SearchableSelect
                          value={employee.overtime_approver_id || ''}
                          onChange={(val) => handleChange(employee.id, 'overtime_approver_id', val ? Number(val) : undefined)}
                          placeholder="-- Same as Manager --"
                          searchPlaceholder="Search..."
                          options={getEmployeeOptions(employee.id)}
                          className="w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} employees
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-4 py-2 text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Save Button when there are changes */}
      {changes.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-2xl disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Save {changes.size} Change{changes.size > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
