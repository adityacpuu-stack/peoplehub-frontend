import { useEffect, useState } from 'react';
import { workLocationService, type WorkLocation, type CreateWorkLocationRequest } from '@/services/work-location.service';
import { companyService, type Company } from '@/services/company.service';
import { MapPin, Plus, Search, Pencil, Trash2, X, Shield, Clock, Radio } from 'lucide-react';
import toast from 'react-hot-toast';

// Parse ISO time string (e.g. "1970-01-01T02:00:00.000Z" or "09:00") to "HH:mm"
function parseTimeToHHmm(timeStr?: string | null): string {
  if (!timeStr) return '';
  // Already HH:mm
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  // ISO string
  try {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    }
  } catch {
    // fallback
  }
  return timeStr.substring(0, 5);
}

const defaultFormData: CreateWorkLocationRequest & { is_active: boolean } = {
  name: '',
  code: '',
  description: '',
  company_id: 0,
  address: '',
  city: '',
  province: '',
  postal_code: '',
  latitude: undefined,
  longitude: undefined,
  radius_meters: 100,
  enable_attendance: true,
  require_location_verification: true,
  require_photo: false,
  work_start_time: '09:00',
  work_end_time: '18:00',
  break_start_time: '12:00',
  break_end_time: '13:00',
  late_tolerance_minutes: 15,
  is_active: true,
};

export function WorkLocationsPage() {
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<WorkLocation | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ ...defaultFormData });

  useEffect(() => {
    fetchCompanies();
    fetchLocations();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ status: 'active' });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompanyId(response.data[0].id);
      }
    } catch {
      toast.error('Failed to load company data');
    }
  };

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const response = await workLocationService.getAll({ page: 1, limit: 200 });
      setLocations(response.data);
    } catch {
      toast.error('Failed to load work locations');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(search.toLowerCase()) ||
    (loc.code && loc.code.toLowerCase().includes(search.toLowerCase())) ||
    (loc.city && loc.city.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: filteredLocations.length,
    active: filteredLocations.filter(l => l.is_active !== false).length,
    withGeofence: filteredLocations.filter(l => l.latitude && l.longitude).length,
    inactive: filteredLocations.filter(l => l.is_active === false).length,
  };

  const handleOpenModal = (location?: WorkLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        code: location.code || '',
        description: location.description || '',
        company_id: location.company_id,
        address: location.address || '',
        city: location.city || '',
        province: location.province || '',
        postal_code: location.postal_code || '',
        latitude: location.latitude ? parseFloat(String(location.latitude)) : undefined,
        longitude: location.longitude ? parseFloat(String(location.longitude)) : undefined,
        radius_meters: location.radius_meters ?? 100,
        enable_attendance: location.enable_attendance ?? true,
        require_location_verification: location.require_location_verification ?? true,
        require_photo: location.require_photo ?? false,
        work_start_time: parseTimeToHHmm(location.work_start_time) || '09:00',
        work_end_time: parseTimeToHHmm(location.work_end_time) || '18:00',
        break_start_time: parseTimeToHHmm(location.break_start_time) || '12:00',
        break_end_time: parseTimeToHHmm(location.break_end_time) || '13:00',
        late_tolerance_minutes: location.late_tolerance_minutes ?? 15,
        is_active: location.is_active !== false,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        ...defaultFormData,
        company_id: selectedCompanyId || 0,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) {
      toast.error('Please select a company');
      return;
    }
    try {
      const payload: CreateWorkLocationRequest = {
        ...formData,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      };
      if (editingLocation) {
        await workLocationService.update(editingLocation.id, payload);
        toast.success('Work location updated successfully');
      } else {
        await workLocationService.create(payload);
        toast.success('Work location created successfully');
      }
      setShowModal(false);
      fetchLocations();
    } catch {
      toast.error('Failed to save work location');
    }
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;
    try {
      await workLocationService.delete(deletingLocation.id);
      toast.success('Work location deleted successfully');
      setShowDeleteModal(false);
      setDeletingLocation(null);
      fetchLocations();
    } catch {
      toast.error('Failed to delete work location. It may have employees assigned.');
    }
  };

  const openDeleteModal = (loc: WorkLocation) => {
    setDeletingLocation(loc);
    setShowDeleteModal(true);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Work Locations
                  </h1>
                  <p className="text-teal-100 text-sm mt-1">
                    {selectedCompany ? (
                      <>Manage work locations for <span className="font-semibold">{selectedCompany.name}</span></>
                    ) : (
                      'Manage office locations and attendance settings'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <MapPin className="w-4 h-4" />
                  {stats.total} Locations
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  {stats.active} Active
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-medium cursor-pointer min-w-[200px]"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id} className="text-gray-900">
                      {company.name}
                    </option>
                  ))}
                </select>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-teal-700 rounded-xl hover:bg-teal-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Add Location</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Locations</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.active}</p>
          <p className="text-sm text-gray-500">Active Locations</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">Geo-fence</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.withGeofence}</p>
          <p className="text-sm text-gray-500">With Geo-fence</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">Inactive</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.inactive}</p>
          <p className="text-sm text-gray-500">Inactive Locations</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <span className="text-sm text-gray-500">
              {filteredLocations.length} locations
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading data...</p>
              </div>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No work locations yet</h3>
              <p className="mt-1 text-gray-500">Add your first work location.</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Location
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Address / City</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Hours</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Radius</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLocations.map(loc => (
                  <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(loc.name)} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                          {loc.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{loc.name}</p>
                          {loc.company?.name && (
                            <p className="text-xs text-gray-400">{loc.company.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm font-mono rounded-lg">
                        {loc.code || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">{loc.address || '-'}</p>
                      {loc.city && <p className="text-xs text-gray-400">{loc.city}{loc.province ? `, ${loc.province}` : ''}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {loc.enable_attendance !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                          <Shield className="w-3 h-3" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600">
                        {parseTimeToHHmm(loc.work_start_time) && parseTimeToHHmm(loc.work_end_time)
                          ? `${parseTimeToHHmm(loc.work_start_time)} - ${parseTimeToHHmm(loc.work_end_time)}`
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600">
                        {loc.radius_meters ? `${loc.radius_meters}m` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {loc.is_active !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenModal(loc)}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(loc)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-br from-teal-600 to-emerald-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {editingLocation ? 'Edit Work Location' : 'Add Work Location'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                {/* Section 1: Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="e.g., Head Office Jakarta"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                        placeholder="e.g., HO-JKT"
                        maxLength={20}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                        placeholder="Location description..."
                        rows={2}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.company_id || ''}
                        onChange={(e) => setFormData({ ...formData, company_id: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        required
                      >
                        <option value="">Select company...</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Address */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                        placeholder="Full street address..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="e.g., Jakarta"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                      <input
                        type="text"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="e.g., DKI Jakarta"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="e.g., 12345"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Geolocation */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-teal-600" />
                    Geolocation & Attendance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude ?? ''}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="-6.2088"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude ?? ''}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="106.8456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Radius (meters)</label>
                      <input
                        type="number"
                        value={formData.radius_meters ?? ''}
                        onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="100"
                        min={10}
                        max={10000}
                      />
                    </div>
                    <div className="sm:col-span-3 flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.enable_attendance ?? true}
                          onChange={(e) => setFormData({ ...formData, enable_attendance: e.target.checked })}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Enable Attendance</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.require_location_verification ?? true}
                          onChange={(e) => setFormData({ ...formData, require_location_verification: e.target.checked })}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Require Location Verification</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.require_photo ?? false}
                          onChange={(e) => setFormData({ ...formData, require_photo: e.target.checked })}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Require Photo</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section 4: Work Schedule */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    Work Schedule
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Start Time</label>
                      <input
                        type="time"
                        value={formData.work_start_time}
                        onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work End Time</label>
                      <input
                        type="time"
                        value={formData.work_end_time}
                        onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Break Start Time</label>
                      <input
                        type="time"
                        value={formData.break_start_time}
                        onChange={(e) => setFormData({ ...formData, break_start_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Break End Time</label>
                      <input
                        type="time"
                        value={formData.break_end_time}
                        onChange={(e) => setFormData({ ...formData, break_end_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Late Tolerance (minutes)</label>
                      <input
                        type="number"
                        value={formData.late_tolerance_minutes ?? ''}
                        onChange={(e) => setFormData({ ...formData, late_tolerance_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder="15"
                        min={0}
                        max={120}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Status */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.is_active === true}
                        onChange={() => setFormData({ ...formData, is_active: true })}
                        className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.is_active === false}
                        onChange={() => setFormData({ ...formData, is_active: false })}
                        className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Inactive</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                  >
                    {editingLocation ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingLocation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDeleteModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Work Location?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Are you sure you want to delete <span className="font-semibold text-gray-700">{deletingLocation.name}</span>? This action cannot be undone.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
