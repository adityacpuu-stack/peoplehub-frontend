import { useEffect, useState } from 'react';
import { workLocationService, type WorkLocation, type CreateWorkLocationRequest } from '@/services/work-location.service';
import { companyService, type Company } from '@/services/company.service';
import { MapPin, Plus, Search, Pencil, Trash2, X, Clock, Radio, Users, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { employeeService } from '@/services/employee.service';
import type { Employee } from '@/types';

function parseTimeToHHmm(timeStr?: string | null): string {
  if (!timeStr) return '';
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  try {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    }
  } catch { /* */ }
  return timeStr.substring(0, 5);
}

const defaultFormData: CreateWorkLocationRequest & { is_active: boolean } = {
  name: '', code: '', description: '', company_id: 0,
  address: '', city: '', province: '', postal_code: '',
  latitude: undefined, longitude: undefined, radius_meters: 100,
  work_start_time: '09:00', work_end_time: '18:00',
  break_start_time: '12:00', break_end_time: '13:00',
  late_tolerance_minutes: 15, is_active: true,
};

const INPUT = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all';

export function WorkLocationsPage() {
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<WorkLocation | null>(null);
  const [search, setSearch] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState<string>('');
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);
  const [viewEmployees, setViewEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchLocations();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ status: 'active' });
      setCompanies(response.data);
    } catch { /* */ }
  };

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const response = await workLocationService.getAll({ page: 1, limit: 200 });
      setLocations(response.data);
      if (!activeLocationId && response.data.length > 0) {
        selectLocation(response.data[0]);
      }
    } catch {
      toast.error('Gagal memuat work locations');
    } finally {
      setIsLoading(false);
    }
  };

  const selectLocation = async (loc: WorkLocation) => {
    setActiveLocationId(loc.id);
    setViewEmployees([]);
    setIsLoadingEmployees(true);
    try {
      const response = await employeeService.getAll({
        page: 1, limit: 500,
        work_location_id: loc.id,
        company_id: loc.company_id,
        employment_status: 'active',
      });
      setViewEmployees(response.data);
    } catch { /* */ } finally {
      setIsLoadingEmployees(false);
    }
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch =
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.code && loc.code.toLowerCase().includes(search.toLowerCase())) ||
      (loc.city && loc.city.toLowerCase().includes(search.toLowerCase()));
    const matchesCompany = !filterCompanyId || String(loc.company_id) === filterCompanyId;
    return matchesSearch && matchesCompany;
  });

  // Reset active location when company filter changes and active loc no longer in filtered list
  useEffect(() => {
    if (!activeLocationId) return;
    const stillVisible = filteredLocations.some(l => l.id === activeLocationId);
    if (!stillVisible) {
      if (filteredLocations.length > 0) {
        selectLocation(filteredLocations[0]);
      } else {
        setActiveLocationId(null);
        setViewEmployees([]);
      }
    }
  }, [filterCompanyId, search]);

  const activeLocation = locations.find(l => l.id === activeLocationId) ?? null;

  const stats = {
    total: locations.length,
    active: locations.filter(l => l.is_active !== false).length,
    withGeofence: locations.filter(l => l.latitude && l.longitude).length,
  };

  const handleOpenModal = (location?: WorkLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name, code: location.code || '', description: location.description || '',
        company_id: location.company_id, address: location.address || '',
        city: location.city || '', province: location.province || '',
        postal_code: location.postal_code || '',
        latitude: location.latitude ? parseFloat(String(location.latitude)) : undefined,
        longitude: location.longitude ? parseFloat(String(location.longitude)) : undefined,
        radius_meters: location.radius_meters ?? 100,
        work_start_time: parseTimeToHHmm(location.work_start_time) || '09:00',
        work_end_time: parseTimeToHHmm(location.work_end_time) || '18:00',
        break_start_time: parseTimeToHHmm(location.break_start_time) || '12:00',
        break_end_time: parseTimeToHHmm(location.break_end_time) || '13:00',
        late_tolerance_minutes: location.late_tolerance_minutes ?? 15,
        is_active: location.is_active !== false,
      });
    } else {
      setEditingLocation(null);
      setFormData({ ...defaultFormData, company_id: filterCompanyId ? parseInt(filterCompanyId) : 0 });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) { toast.error('Pilih company terlebih dahulu'); return; }
    setIsSaving(true);
    try {
      const payload: CreateWorkLocationRequest = { ...formData, latitude: formData.latitude || undefined, longitude: formData.longitude || undefined };
      if (editingLocation) {
        await workLocationService.update(editingLocation.id, payload);
        toast.success('Work location diperbarui');
      } else {
        await workLocationService.create(payload);
        toast.success('Work location dibuat');
      }
      setShowModal(false);
      fetchLocations();
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;
    try {
      await workLocationService.delete(deletingLocation.id);
      toast.success('Work location dihapus');
      setShowDeleteModal(false);
      if (activeLocationId === deletingLocation.id) setActiveLocationId(null);
      setDeletingLocation(null);
      fetchLocations();
    } catch {
      toast.error('Gagal menghapus. Mungkin ada karyawan yang masih assigned.');
    }
  };

  const f = (key: keyof typeof formData, val: any) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Work Locations</h1>
            <p className="text-sm text-gray-500">Kelola lokasi kantor dan pengaturan absensi</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Tambah Lokasi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Lokasi', value: stats.total, icon: <MapPin className="w-4 h-4" />, color: 'text-slate-600 bg-slate-100' },
          { label: 'Aktif', value: stats.active, icon: <div className="w-2 h-2 rounded-full bg-emerald-500" />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Geo-fence', value: stats.withGeofence, icon: <Radio className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex min-h-[560px]">

          {/* Left: location list */}
          <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
            {/* Filters */}
            <div className="px-3 py-3 space-y-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari lokasi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:border-slate-400 focus:outline-none focus:bg-white transition-all"
                />
              </div>
              <div className="relative">
                <select
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                  className="w-full pl-3 pr-7 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:border-slate-400 focus:outline-none appearance-none"
                >
                  <option value="">Semua Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-center px-4">
                <MapPin className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">Tidak ada lokasi</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-1">
                {filteredLocations.map(loc => {
                  const isActive = loc.id === activeLocationId;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => selectLocation(loc)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? 'bg-slate-800' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {loc.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {loc.name}
                        </p>
                        <div className={`flex items-center gap-1.5 mt-0.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                          {loc.code && <span className="text-xs font-mono">{loc.code}</span>}
                          {loc.city && <><span className="text-xs">·</span><span className="text-xs truncate">{loc.city}</span></>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          loc.is_active !== false
                            ? isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
                            : isActive ? 'bg-white/20 text-white/60' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {loc.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                        {(loc._count?.employees ?? 0) > 0 && (
                          <span className={`text-xs flex items-center gap-0.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                            <Users className="w-3 h-3" />{loc._count?.employees}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          {activeLocation ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Panel header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{activeLocation.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      {activeLocation.code && <span className="font-mono">{activeLocation.code}</span>}
                      {activeLocation.company?.name && <><span>·</span><span>{activeLocation.company.name}</span></>}
                      {activeLocation.city && <><span>·</span><span>{activeLocation.city}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(activeLocation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => { setDeletingLocation(activeLocation); setShowDeleteModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>

              {/* Detail sections */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Work Hours */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Kerja</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Kerja</span>
                        <span className="font-medium text-gray-900">
                          {parseTimeToHHmm(activeLocation.work_start_time) || '–'} – {parseTimeToHHmm(activeLocation.work_end_time) || '–'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Istirahat</span>
                        <span className="font-medium text-gray-900">
                          {parseTimeToHHmm(activeLocation.break_start_time) || '–'} – {parseTimeToHHmm(activeLocation.break_end_time) || '–'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Toleransi telat</span>
                        <span className="font-medium text-gray-900">{activeLocation.late_tolerance_minutes ?? 0} menit</span>
                      </div>
                    </div>
                  </div>

                  {/* Geo-fence */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Radio className="w-4 h-4 text-slate-500" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Geo-fence</p>
                    </div>
                    {activeLocation.latitude && activeLocation.longitude ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Koordinat</span>
                          <span className="font-mono text-xs text-gray-900">
                            {parseFloat(String(activeLocation.latitude)).toFixed(4)}, {parseFloat(String(activeLocation.longitude)).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Radius</span>
                          <span className="font-medium text-gray-900">{activeLocation.radius_meters ?? 100}m</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Geo-fence belum dikonfigurasi</p>
                    )}
                  </div>

                  {/* Address */}
                  {(activeLocation.address || activeLocation.city) && (
                    <div className="bg-gray-50 rounded-xl p-4 lg:col-span-2">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alamat</p>
                      </div>
                      <p className="text-sm text-gray-700">{activeLocation.address}</p>
                      {(activeLocation.city || activeLocation.province) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {[activeLocation.city, activeLocation.province, activeLocation.postal_code].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Employees section */}
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Karyawan di Lokasi Ini
                    </p>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold ml-auto">
                      {viewEmployees.length}
                    </span>
                  </div>

                  {isLoadingEmployees ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : viewEmployees.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Belum ada karyawan di lokasi ini</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                      {viewEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">{emp.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{emp.name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {emp.position?.name || '–'}{emp.department?.name ? ` · ${emp.department.name}` : ''}
                            </p>
                          </div>
                          <Link
                            to={`/employees/${emp.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0"
                          >
                            Lihat
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <MapPin className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Pilih lokasi di sebelah kiri</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {editingLocation ? 'Edit Work Location' : 'Tambah Work Location'}
                  </h3>
                  <p className="text-xs text-gray-400">Isi data lokasi kerja</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">

                {/* Basic Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informasi Dasar</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lokasi <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.name} onChange={e => f('name', e.target.value)}
                        placeholder="Head Office Jakarta" className={INPUT} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
                      <input type="text" value={formData.code} onChange={e => f('code', e.target.value.toUpperCase())}
                        placeholder="HO-JKT" maxLength={20} className={INPUT + ' font-mono'} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
                      <select value={formData.company_id || ''} onChange={e => f('company_id', Number(e.target.value))}
                        className={INPUT + ' bg-white'} required>
                        <option value="">Pilih company...</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                      <textarea value={formData.description} onChange={e => f('description', e.target.value)}
                        placeholder="Deskripsi lokasi..." rows={2} className={INPUT + ' resize-none'} />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Alamat</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                      <textarea value={formData.address} onChange={e => f('address', e.target.value)}
                        placeholder="Jl. Contoh No. 123..." rows={2} className={INPUT + ' resize-none'} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                      <input type="text" value={formData.city} onChange={e => f('city', e.target.value)} placeholder="Jakarta" className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                      <input type="text" value={formData.province} onChange={e => f('province', e.target.value)} placeholder="DKI Jakarta" className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode Pos</label>
                      <input type="text" value={formData.postal_code} onChange={e => f('postal_code', e.target.value)} placeholder="12345" maxLength={10} className={INPUT} />
                    </div>
                  </div>
                </div>

                {/* Geolocation */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Geo-fence</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input type="number" step="any" value={formData.latitude ?? ''} onChange={e => f('latitude', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="-6.2088" className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input type="number" step="any" value={formData.longitude ?? ''} onChange={e => f('longitude', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="106.8456" className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Radius (m)</label>
                      <input type="number" value={formData.radius_meters ?? ''} onChange={e => f('radius_meters', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="100" min={10} max={10000} className={INPUT} />
                    </div>
                  </div>
                </div>

                {/* Work Schedule */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Jam Kerja</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mulai Kerja</label>
                      <input type="time" value={formData.work_start_time} onChange={e => f('work_start_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selesai Kerja</label>
                      <input type="time" value={formData.work_end_time} onChange={e => f('work_end_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mulai Istirahat</label>
                      <input type="time" value={formData.break_start_time} onChange={e => f('break_start_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selesai Istirahat</label>
                      <input type="time" value={formData.break_end_time} onChange={e => f('break_end_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Toleransi Telat (menit)</label>
                      <input type="number" value={formData.late_tolerance_minutes ?? ''} onChange={e => f('late_tolerance_minutes', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="15" min={0} max={120} className={INPUT} />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input type="checkbox" checked={formData.is_active} onChange={e => f('is_active', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" />
                    <span className="text-sm font-medium text-gray-700">Lokasi aktif</span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : editingLocation ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hapus Lokasi</h3>
                <p className="text-xs text-gray-400">Tindakan tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Hapus <span className="font-semibold text-gray-900">{deletingLocation.name}</span>?
              Pastikan tidak ada karyawan yang masih assigned.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Batal
              </button>
              <button onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
