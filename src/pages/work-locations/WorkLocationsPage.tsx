import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/leave/domain-workflows.css';
import { DirectorySearch } from '@/components/ui/MasterDataWorkspace';
import { MasterDataHeader, MasterDataSummary, MasterDataDialog } from '@/components/ui/MasterDataLayout';
import { collectPages, hasMasterRole, calendarLocationEditors } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import { canAction, canOpenEmployee } from '@/lib/actions';
import { MasterDataError } from '@/components/ui/MasterDataFeedback';
import { useEffect, useState, useRef } from 'react';
import { workLocationService, type WorkLocation, type CreateWorkLocationRequest } from '@/services/work-location.service';
import { companyService, type Company } from '@/services/company.service';
import { MapPin, Plus, Pencil, Trash2, X, Clock, Loader2} from 'lucide-react';
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
  useLocale();
  const user = useAuthStore(state => state.user);
  const roles = user?.roles;
  const isEditorRole = hasMasterRole(roles, calendarLocationEditors);
  // Editor role is the ceiling; each mutation also needs its covered action.
  const canCreate = isEditorRole && canAction(user, 'work_location.create');
  const canUpdate = isEditorRole && canAction(user, 'work_location.update');
  const canDelete = isEditorRole && canAction(user, 'work_location.delete');
  const canManage = canCreate || canUpdate;
  const requestId = useRef(0);
  const employeeRequestId = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [employeeError, setEmployeeError] = useState(false);

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

  useEffect(() => { fetchLocations(); return () => { requestId.current++; employeeRequestId.current++; }; }, []);
  const fetchLocations = async () => {
    const request = ++requestId.current;
    setIsLoading(true); setLoadError(false);
    try {
      const [companyRows, rows] = await Promise.all([
        collectPages((page, limit) => companyService.getAll({ page, limit })),
        collectPages((page, limit) => workLocationService.getAll({ page, limit })),
      ]);
      if (request !== requestId.current) return;
      setCompanies(companyRows); setLocations(rows);
    } catch {
      if (request === requestId.current) { setLoadError(true); setLocations([]); }
    } finally { if (request === requestId.current) setIsLoading(false); }
  };

  const selectLocation = async (loc: WorkLocation) => {
    const request = ++employeeRequestId.current;
    setActiveLocationId(loc.id); setViewEmployees([]); setEmployeeError(false); setIsLoadingEmployees(true);
    try {
      const rows = await collectPages((page, limit) => employeeService.getAll({ page, limit, work_location_id: loc.id, company_id: loc.company_id, employment_status: 'active' }));
      if (request === employeeRequestId.current) setViewEmployees(rows);
    } catch { if (request === employeeRequestId.current) setEmployeeError(true); }
    finally { if (request === employeeRequestId.current) setIsLoadingEmployees(false); }
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
    const stillVisible = filteredLocations.some(l => l.id === activeLocationId);
    if (!stillVisible) {
      if (filteredLocations.length > 0) {
        selectLocation(filteredLocations[0]);
      } else {
        employeeRequestId.current++;
        setActiveLocationId(null);
        setViewEmployees([]);
      }
    }
  }, [filterCompanyId, search, locations]);

  const activeLocation = locations.find(l => l.id === activeLocationId) ?? null;

  const stats = {
    total: locations.length,
    active: locations.filter(l => l.is_active !== false).length,
    withGeofence: locations.filter(l => l.latitude != null && l.longitude != null).length,
  };

  const handleOpenModal = (location?: WorkLocation) => {
    if (location ? !canUpdate : !canCreate) return;
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name, code: location.code || '', description: location.description || '',
        company_id: location.company_id, address: location.address || '',
        city: location.city || '', province: location.province || '',
        postal_code: location.postal_code || '',
        latitude: location.latitude != null ? parseFloat(String(location.latitude)) : undefined,
        longitude: location.longitude != null ? parseFloat(String(location.longitude)) : undefined,
        radius_meters: location.radius_meters ?? 100,
        work_start_time: parseTimeToHHmm(location.work_start_time),
        work_end_time: parseTimeToHHmm(location.work_end_time),
        break_start_time: parseTimeToHHmm(location.break_start_time),
        break_end_time: parseTimeToHHmm(location.break_end_time),
        late_tolerance_minutes: location.late_tolerance_minutes ?? 15,
        is_active: location.is_active !== false,
      });
    } else {
      setEditingLocation(null);
      setFormData({ ...defaultFormData, company_id: filterCompanyId ? parseInt(filterCompanyId) : 0 });
    }
    setShowModal(true);
  };

  // Re-check the current operation: access may have changed while the dialog was open.
  const canSubmitDialog = editingLocation ? canUpdate : canCreate;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) { toast.error(t("Pilih company terlebih dahulu")); return; }
    if (isSaving || !canSubmitDialog) return;
    setIsSaving(true);
    try {
      const payload: CreateWorkLocationRequest = { ...formData, latitude: formData.latitude ?? null, longitude: formData.longitude ?? null };
      if (editingLocation) {
        await workLocationService.update(editingLocation.id, payload);
        toast.success(t("Work location diperbarui"));
      } else {
        await workLocationService.create(payload);
        toast.success(t("Work location dibuat"));
      }
      setShowModal(false);
      fetchLocations();
    } catch {
      toast.error(t("Gagal menyimpan"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLocation || isSaving || !canDelete) return;
    setIsSaving(true);
    try {
      await workLocationService.delete(deletingLocation.id);
      toast.success(t("Work location dihapus"));
      setShowDeleteModal(false);
      if (activeLocationId === deletingLocation.id) setActiveLocationId(null);
      setDeletingLocation(null);
      fetchLocations();
    } catch {
      toast.error(t("Gagal menghapus lokasi; periksa karyawan dan riwayat absensinya."), { id: 'api-error' });
    } finally { setIsSaving(false); }
  };

  const f = (key: keyof typeof formData, val: any) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="master-data md-page master-refresh">
      {loadError && <MasterDataError onRetry={fetchLocations} />}
      <MasterDataHeader title={t("Work Locations")} description={t("Lokasi kantor, jadwal kerja, dan area absensi karyawan.")} actions={
        canCreate && !isLoading && !loadError && <button onClick={() => handleOpenModal()} className="md-button md-button-primary"><Plus className="w-4 h-4" />{t("Tambah Lokasi")}</button>
      } />
      <div className="md-surface">
      <MasterDataSummary loading={isLoading || loadError} items={[
        { label: t('Total lokasi'), value: (stats.total).toLocaleString(intlLocale()) },
        { label: t('Aktif'), value: (stats.active).toLocaleString(intlLocale()), tone: 'active' },
        { label: t('Geo-fence'), value: (stats.withGeofence).toLocaleString(intlLocale()) },
      ]} />

      <div className="md-results-toolbar">
        <DirectorySearch value={search} onChange={setSearch} label={t("Cari lokasi")} placeholder={t("Cari nama lokasi, kode, atau kota…")} />
        <select aria-label={t("Filter company")} value={filterCompanyId} onChange={e => setFilterCompanyId(e.target.value)}>
          <option value="">{t("Semua Company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </div>
      {isLoading ? <div className="md-directory-empty" role="status">{t("Memuat lokasi…")}</div> : filteredLocations.length === 0 ? <div className="md-directory-empty">{t("Tidak ada lokasi ditemukan.")}</div> : <>
        <div className="md-location-gallery" role="region" aria-label={t("Daftar lokasi kerja")} tabIndex={0}>
          {filteredLocations.map(location => <button key={location.id} className="md-location-card" aria-pressed={activeLocationId === location.id} onClick={() => selectLocation(location)}>
            <div className="md-location-card-top"><MapPin /><span className={`md-badge ${location.is_active !== false ? 'md-badge-active' : 'md-badge-inactive'}`}>{location.is_active !== false ? t("Aktif") : t("Nonaktif")}</span></div>
            <strong>{location.name}</strong><p>{location.company?.name || companies.find(company => company.id === location.company_id)?.name || t('Company')}{location.city ? ` · ${location.city}` : ''}</p>
            <div className="md-location-card-bottom"><span>{location.code || t('Tanpa kode')}</span><span>{location._count?.employees.toLocaleString(intlLocale()) ?? '—'}{' '}{t("karyawan")}</span></div>
          </button>)}
        </div>
        {activeLocation && <section className="md-office-dossier" aria-label={t("Detail lokasi terpilih")}>
          <div className="md-office-details">
            <header className="md-location-heading"><div><h2 className="text-xl font-semibold">{activeLocation.name}</h2><p className="text-xs text-slate-500 mt-2">{activeLocation.company?.name || companies.find(company => company.id === activeLocation.company_id)?.name}</p></div>
              {(canUpdate || canDelete) && <div className="flex gap-2">{canUpdate && <button className="md-button" onClick={() => handleOpenModal(activeLocation)}><Pencil />{t("Edit")}</button>}{canDelete && <button className="md-button md-delete-action" onClick={() => { setDeletingLocation(activeLocation); setShowDeleteModal(true); }}><Trash2 />{t("Hapus")}</button>}</div>}
            </header>
            <div className="md-work-schedule"><h3><Clock />{t("Jadwal kerja")}</h3>
              <div className="md-work-timeline"><div><span>{t("Mulai kerja")}</span><strong>{parseTimeToHHmm(activeLocation.work_start_time) || '—'}</strong></div>
                <div><span>{t("Istirahat")}</span><strong>{parseTimeToHHmm(activeLocation.break_start_time) || '—'} – {parseTimeToHHmm(activeLocation.break_end_time) || '—'}</strong></div>
                <div><span>{t("Selesai kerja")}</span><strong>{parseTimeToHHmm(activeLocation.work_end_time) || '—'}</strong></div>
              </div><p className="md-schedule-note">{t("Toleransi keterlambatan:")} {(activeLocation.late_tolerance_minutes ?? 0).toLocaleString(intlLocale())}{' '}{t("menit")}</p>
            </div>
            <div className="md-location-employees"><div className="md-results-heading"><h2>{t("Karyawan di lokasi ini")}</h2><span className="md-badge">{employeeError || isLoadingEmployees ? '—' : viewEmployees.length.toLocaleString(intlLocale())}</span></div>
              {isLoadingEmployees ? <div role="status" className="py-8 text-center text-slate-500">{t("Memuat karyawan…")}</div>
                : employeeError ? <MasterDataError onRetry={() => selectLocation(activeLocation)} />
                : viewEmployees.length === 0 ? <div className="md-directory-empty">{t("Belum ada karyawan di lokasi ini.")}</div>
                : <div className="divide-y divide-slate-100">{viewEmployees.map(employee => <div key={employee.id} className="flex items-center gap-3 py-4">
                  <div className="md-avatar">{employee.name.charAt(0)}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{employee.name}</p><p className="text-xs text-slate-500 mt-1">{[employee.position?.name, employee.department?.name].filter(Boolean).join(' · ') || '—'}</p></div>
                  {canOpenEmployee(user, employee.id) && <Link to={`/employees/${employee.id}`} className="md-record-link text-xs">{t("Lihat")}</Link>}
                </div>)}</div>}
            </div>
          </div>
          <div className="md-office-metadata">
            <section><h3>{t("Alamat kantor")}</h3><p>{activeLocation.address || t('Alamat belum ditambahkan.')}</p><p>{[activeLocation.city, activeLocation.province, activeLocation.postal_code].filter(Boolean).join(', ')}</p></section>
            <section><h3>{t("Area absensi")}</h3>
              {activeLocation.latitude != null && activeLocation.longitude != null ? <dl>
                <div><dt>{t("Radius geo-fence")}</dt><dd aria-label={t("Radius absensi {radius}", { radius: activeLocation.radius_meters?.toLocaleString(intlLocale()) ?? t("belum diatur") })}>{activeLocation.radius_meters != null ? `${activeLocation.radius_meters.toLocaleString(intlLocale())} m` : '—'}</dd></div>
                <div><dt>{t("Koordinat")}</dt><dd>{Number(activeLocation.latitude).toLocaleString(intlLocale(), { minimumFractionDigits: 4, maximumFractionDigits: 4, useGrouping: false })}, {Number(activeLocation.longitude).toLocaleString(intlLocale(), { minimumFractionDigits: 4, maximumFractionDigits: 4, useGrouping: false })}</dd></div>
              </dl> : <p>{t("Geo-fence belum dikonfigurasi untuk lokasi ini.")}</p>}
            </section>
          </div>
        </section>}
      </>}

      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <MasterDataDialog busy={isSaving} labelledBy="md-work-locations-dialog-0" onClose={() => setShowModal(false)} wide>
            {/* Header */}
            <div className="md-dialog-header">
              <div className="flex items-center gap-3">

                <div>
                  <h3 id="md-work-locations-dialog-0" className="font-semibold text-gray-900">
                    {editingLocation ? t("Edit Work Location") : t("Tambah Work Location")}
                  </h3>
                  <p className="text-xs text-gray-400">{t("Isi data lokasi kerja")}</p>
                </div>
              </div>
              <button disabled={isSaving} onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label={t("Tutup dialog")}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ph-workflow dw-form">
              <div><div className="dw-form-content"><section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Informasi Dasar")}</h3>
                  <div className="ph-form-grid dw-form-grid">
                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-0">{t("Nama Lokasi")} <span className="text-red-500">*</span></label>
                      <input id="md-work-locations-field-0" type="text" value={formData.name} onChange={e => f('name', e.target.value)}
                        placeholder={t("Head Office Jakarta")} className={INPUT} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-1">{t("Kode")}</label>
                      <input id="md-work-locations-field-1" type="text" value={formData.code} onChange={e => f('code', e.target.value.toUpperCase())}
                        placeholder={"HO-JKT"} maxLength={20} className={INPUT + ' font-mono'} />
                    </div>
                    <div className="dw-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-2">{t("Company")} <span className="text-red-500">*</span></label>
                      <select id="md-work-locations-field-2" disabled={!!editingLocation} aria-label={t("Company lokasi")} value={formData.company_id || ''} onChange={e => f('company_id', Number(e.target.value))}
                        className={INPUT + ' bg-white'} required>
                        <option value="">{t("Pilih company...")}</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="dw-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-3">{t("Deskripsi")}</label>
                      <textarea id="md-work-locations-field-3" value={formData.description} onChange={e => f('description', e.target.value)}
                        placeholder={t("Deskripsi lokasi...")} rows={2} className={INPUT + ' resize-none'} />
                    </div>
                  </div>
                </section>
<section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Alamat")}</h3>
                  <div className="ph-form-grid dw-form-grid">
                    <div className="dw-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-4">{t("Alamat Lengkap")}</label>
                      <textarea id="md-work-locations-field-4" value={formData.address} onChange={e => f('address', e.target.value)}
                        placeholder={t("Jl. Contoh No. 123...")} rows={2} className={INPUT + ' resize-none'} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-5">{t("Kota")}</label>
                      <input id="md-work-locations-field-5" type="text" value={formData.city} onChange={e => f('city', e.target.value)} placeholder={"Jakarta"} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-6">{t("Provinsi")}</label>
                      <input id="md-work-locations-field-6" type="text" value={formData.province} onChange={e => f('province', e.target.value)} placeholder={"DKI Jakarta"} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-7">{t("Kode Pos")}</label>
                      <input id="md-work-locations-field-7" type="text" value={formData.postal_code} onChange={e => f('postal_code', e.target.value)} placeholder="12345" maxLength={10} className={INPUT} />
                    </div>
                  </div>
                </section>
<section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Geo-fence")}</h3>
                  <div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-8">{t("Latitude")}</label>
                      <input id="md-work-locations-field-8" type="number" step="any" value={formData.latitude ?? ''} onChange={e => f('latitude', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="-6.2088" className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-9">{t("Longitude")}</label>
                      <input id="md-work-locations-field-9" type="number" step="any" value={formData.longitude ?? ''} onChange={e => f('longitude', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="106.8456" className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-10">{t("Radius (m)")}</label>
                      <input id="md-work-locations-field-10" type="number" value={formData.radius_meters ?? ''} onChange={e => f('radius_meters', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="100" min={10} max={10000} className={INPUT} />
                    </div>
                  </div>
                </section>
<section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Jam Kerja")}</h3>
                  <div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-11">{t("Mulai Kerja")}</label>
                      <input id="md-work-locations-field-11" type="time" value={formData.work_start_time} onChange={e => f('work_start_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-12">{t("Selesai Kerja")}</label>
                      <input id="md-work-locations-field-12" type="time" value={formData.work_end_time} onChange={e => f('work_end_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-13">{t("Mulai Istirahat")}</label>
                      <input id="md-work-locations-field-13" type="time" value={formData.break_start_time} onChange={e => f('break_start_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-14">{t("Selesai Istirahat")}</label>
                      <input id="md-work-locations-field-14" type="time" value={formData.break_end_time} onChange={e => f('break_end_time', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-work-locations-field-15">{t("Toleransi Telat (menit)")}</label>
                      <input id="md-work-locations-field-15" type="number" value={formData.late_tolerance_minutes ?? ''} onChange={e => f('late_tolerance_minutes', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="15" min={0} max={120} className={INPUT} />
                    </div>
                  </div>
                </section>
<section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Status")}</h3>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input type="checkbox" checked={formData.is_active} onChange={e => f('is_active', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" />
                    <span className="text-sm font-medium text-gray-700">{t("Lokasi aktif")}</span>
                  </label>
                </section></div></div>

              {/* Footer */}
              {!canSubmitDialog && <p role="status" className="text-sm text-amber-700 px-1" data-testid="access-changed">{t("Your access changed; this action is no longer available. Your input is kept until you close the dialog.")}</p>}
              <div className="ph-form-actions dw-actions">
                <button disabled={isSaving} type="button" onClick={() => setShowModal(false)}
                  className="ph-button">{t("Batal")} </button>
                <button type="submit" disabled={isSaving || !canSubmitDialog}
                  className="ph-button ph-button-primary">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />{t("Menyimpan...")}</> : editingLocation ? t("Update") : t("Simpan")}
                </button>
              </div>
            </form>
          </MasterDataDialog>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingLocation && (
        <MasterDataDialog busy={isSaving} labelledBy="md-work-locations-dialog-1" onClose={() => setShowDeleteModal(false)}><div className="ph-workflow dw-confirm">
            <div className="flex items-center gap-3 mb-4">

              <div>
                <h3 id="md-work-locations-dialog-1" className="font-semibold text-gray-900">{t("Hapus Lokasi")}</h3>
                <p className="text-xs text-gray-400">{t("Tindakan tidak dapat dibatalkan")}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">{t("Hapus")} <span className="font-semibold text-gray-900">{deletingLocation.name}</span>{t("? Pastikan tidak ada karyawan yang masih assigned.")} </p>
            <div className="ph-form-actions dw-actions">
              <button disabled={isSaving} onClick={() => setShowDeleteModal(false)}
                className="ph-button">{t("Batal")} </button>
              <button disabled={isSaving || !canDelete} onClick={handleDelete}
                className="ph-button dw-danger">
                <Trash2 className="w-4 h-4" />{t("Hapus")} </button>
            </div>
          </div></MasterDataDialog>
      )}
    </div>
  );
}
