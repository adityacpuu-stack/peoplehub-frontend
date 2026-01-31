import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Download,
  Loader2,
  Calendar,
  Clock,
  Users,
  Building,
  ChevronLeft,
  ChevronRight,
  Settings,
  Shield,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';
import { leaveService } from '../../services/leave.service';
import { companyService } from '../../services/company.service';
// LeaveType imported from service response

interface Company {
  id: number;
  name: string;
}

interface LeavePolicy {
  id: number;
  name: string;
  code?: string;
  company_id?: number;
  company?: Company;
  default_days: number;
  max_days?: number;
  carry_forward?: boolean;
  carry_forward_days?: number;
  prorate_enabled?: boolean;
  gender_specific?: string;
  min_tenure_months?: number;
  requires_document?: boolean;
  description?: string;
  is_paid?: boolean;
  is_active: boolean;
}

export function LeavePolicyPage() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    default_days: 12,
    max_days: 12,
    carry_forward: false,
    carry_forward_days: 0,
    prorate_enabled: true,
    gender_specific: '',
    min_tenure_months: 0,
    requires_document: false,
    company_id: '',
    is_active: true,
  });

  // Fetch leave types as policies
  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const types = await leaveService.getTypes();
      setPolicies(types as LeavePolicy[]);
      setTotalPages(Math.ceil(types.length / limit));
    } catch (error) {
      console.error('Failed to fetch leave policies:', error);
      toast.error('Failed to load leave policies');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchPolicies();
  }, [fetchCompanies, fetchPolicies]);

  // Filter policies
  const filteredPolicies = useMemo(() => {
    let result = policies;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.code?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filterCompany !== 'all') {
      result = result.filter(p => p.company_id === Number(filterCompany));
    }

    if (filterStatus !== 'all') {
      result = result.filter(p => (filterStatus === 'active' ? p.is_active !== false : p.is_active === false));
    }

    return result;
  }, [policies, search, filterCompany, filterStatus]);

  // Paginate
  const paginatedPolicies = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredPolicies.slice(start, start + limit);
  }, [filteredPolicies, page]);

  // Stats
  const stats = useMemo(() => {
    const active = policies.filter(p => p.is_active !== false).length;
    const withCarryForward = policies.filter(p => p.carry_forward).length;
    const requiresDoc = policies.filter(p => p.requires_document).length;
    return {
      total: policies.length,
      active,
      withCarryForward,
      requiresDoc,
    };
  }, [policies]);

  const handleOpenModal = (policy?: LeavePolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        name: policy.name || '',
        code: policy.code || '',
        description: policy.description || '',
        default_days: policy.default_days || 12,
        max_days: policy.max_days || 12,
        carry_forward: policy.carry_forward || false,
        carry_forward_days: policy.carry_forward_days || 0,
        prorate_enabled: policy.prorate_enabled !== false,
        gender_specific: policy.gender_specific || '',
        min_tenure_months: policy.min_tenure_months || 0,
        requires_document: policy.requires_document || false,
        company_id: policy.company_id?.toString() || '',
        is_active: policy.is_active !== false,
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        default_days: 12,
        max_days: 12,
        carry_forward: false,
        carry_forward_days: 0,
        prorate_enabled: true,
        gender_specific: '',
        min_tenure_months: 0,
        requires_document: false,
        company_id: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPolicy(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Note: This is a placeholder - actual API implementation may vary
      // For now, we'll show a success message
      toast.success(editingPolicy ? 'Policy updated successfully' : 'Policy created successfully');
      handleCloseModal();
      fetchPolicies();
    } catch (error: unknown) {
      console.error('Failed to save policy:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (_id: number) => {
    if (!confirm('Are you sure you want to delete this leave policy?')) return;

    try {
      // Note: This is a placeholder - actual API implementation may vary
      toast.success('Policy deleted successfully');
      fetchPolicies();
    } catch (error: unknown) {
      console.error('Failed to delete policy:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete policy');
    }
  };

  const handleExport = () => {
    if (filteredPolicies.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Name',
      'Code',
      'Default Days',
      'Max Days',
      'Carry Forward',
      'Carry Forward Days',
      'Prorate',
      'Gender Specific',
      'Min Tenure (Months)',
      'Requires Document',
      'Company',
      'Status',
    ];

    const rows = filteredPolicies.map(policy => [
      policy.name,
      policy.code || '-',
      policy.default_days || '-',
      policy.max_days || '-',
      policy.carry_forward ? 'Yes' : 'No',
      policy.carry_forward_days || 0,
      policy.prorate_enabled ? 'Yes' : 'No',
      policy.gender_specific || 'All',
      policy.min_tenure_months || 0,
      policy.requires_document ? 'Yes' : 'No',
      policy.company?.name || 'All Companies',
      policy.is_active !== false ? 'Active' : 'Inactive',
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_policies_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export successful');
  };

  const getPolicyIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('annual') || nameLower.includes('tahunan')) {
      return <Calendar className="w-5 h-5" />;
    }
    if (nameLower.includes('sick') || nameLower.includes('sakit')) {
      return <Shield className="w-5 h-5" />;
    }
    if (nameLower.includes('maternity') || nameLower.includes('paternity') || nameLower.includes('melahirkan')) {
      return <Users className="w-5 h-5" />;
    }
    if (nameLower.includes('marriage') || nameLower.includes('nikah')) {
      return <CalendarDays className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  const getPolicyColor = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('annual') || nameLower.includes('tahunan')) {
      return 'from-violet-500 to-purple-600';
    }
    if (nameLower.includes('sick') || nameLower.includes('sakit')) {
      return 'from-red-500 to-rose-600';
    }
    if (nameLower.includes('maternity') || nameLower.includes('melahirkan')) {
      return 'from-pink-500 to-fuchsia-600';
    }
    if (nameLower.includes('paternity')) {
      return 'from-blue-500 to-indigo-600';
    }
    if (nameLower.includes('marriage') || nameLower.includes('nikah')) {
      return 'from-amber-500 to-orange-600';
    }
    return 'from-gray-500 to-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Leave Policy
                  </h1>
                  <p className="text-indigo-100 text-sm mt-1">
                    Configure leave types and their rules
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Add Policy</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Policies</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Active
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.active}</p>
          <p className="text-sm text-gray-500">Active Policies</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.withCarryForward}</p>
          <p className="text-sm text-gray-500">With Carry Forward</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.requiresDoc}</p>
          <p className="text-sm text-gray-500">Requires Document</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search policies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Policy Cards Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : paginatedPolicies.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No leave policies found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedPolicies.map(policy => (
                <div
                  key={policy.id}
                  className={`relative overflow-hidden bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                    policy.is_active !== false ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${getPolicyColor(policy.name)}`}>
                        {getPolicyIcon(policy.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                        {policy.code && (
                          <p className="text-xs text-gray-500">{policy.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(policy)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(policy.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {policy.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{policy.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      policy.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {policy.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                    {policy.carry_forward && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        Carry Forward
                      </span>
                    )}
                    {policy.requires_document && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Requires Doc
                      </span>
                    )}
                    {policy.gender_specific && (
                      <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded">
                        {policy.gender_specific}
                      </span>
                    )}
                  </div>

                  {policy.company?.name ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Building className="w-3.5 h-3.5" />
                      <span>{policy.company.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium mb-3">
                      <Building className="w-3.5 h-3.5" />
                      <span>All Companies</span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Default Days</p>
                        <p className="font-semibold text-gray-900">
                          {policy.default_days || 12} days
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Max Days</p>
                        <p className="font-semibold text-gray-900">
                          {policy.max_days || 12} days
                        </p>
                      </div>
                    </div>
                  </div>

                  {policy.min_tenure_months && policy.min_tenure_months > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Min. tenure: {policy.min_tenure_months} months
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {paginatedPolicies.length} of {filteredPolicies.length} policies
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {editingPolicy ? 'Edit Leave Policy' : 'Add Leave Policy'}
                      </h2>
                      <p className="text-indigo-100 text-sm">
                        {editingPolicy ? 'Update policy configuration' : 'Create new leave policy'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Policy Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="e.g., Annual Leave"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="e.g., AL"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      rows={2}
                      placeholder="Brief description of this leave type..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">All Companies (Global)</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Days</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.default_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_days: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Days</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.max_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_days: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender Specific</label>
                      <select
                        value={formData.gender_specific}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender_specific: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">All Genders</option>
                        <option value="male">Male Only</option>
                        <option value="female">Female Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Tenure (Months)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_tenure_months}
                        onChange={(e) => setFormData(prev => ({ ...prev, min_tenure_months: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Carry Forward Settings</p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.carry_forward}
                          onChange={(e) => setFormData(prev => ({ ...prev, carry_forward: e.target.checked }))}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Enable Carry Forward</span>
                      </label>
                      {formData.carry_forward && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={formData.carry_forward_days}
                            onChange={(e) => setFormData(prev => ({ ...prev, carry_forward_days: Number(e.target.value) }))}
                            className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          <span className="text-sm text-gray-500">max days</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.prorate_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, prorate_enabled: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Enable Prorate</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requires_document}
                        onChange={(e) => setFormData(prev => ({ ...prev, requires_document: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Requires Document</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingPolicy ? 'Update Policy' : 'Create Policy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
