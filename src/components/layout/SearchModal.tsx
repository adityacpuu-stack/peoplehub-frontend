import { t, useLocale } from '@/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Loader2, Search, UserRound, X } from 'lucide-react';
import { AccountDialog } from '@/components/ui/AccountDialog';
import { employeeService } from '@/services/employee.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Employee } from '@/types';
import type { getNavigation } from './navigation';
import './navbar.css';

const aliases: Record<string, string> = {
  '/my-attendance': 'absensi kehadiran saya', '/attendance': 'absensi kehadiran', '/my-leave': 'cuti saya',
  '/leave': 'cuti', '/leave-approval': 'persetujuan cuti', '/employees': 'karyawan pegawai',
  '/documents': 'dokumen saya', '/payroll': 'gaji penggajian', '/overtime': 'lembur',
  '/settings': 'profil pengaturan akun password keamanan', '/notifications': 'notifikasi pemberitahuan',
  '/templates': 'template formulir panduan dokumen acuan',
  '/announcements': 'pengumuman informasi perusahaan berita announcement',
};

export function SearchModal({ navigation, onClose }: { navigation: ReturnType<typeof getNavigation>; onClose: () => void }) {
  useLocale();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const scope = JSON.stringify([user?.id, user?.roles, user?.accessibleCompanyIds]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pages' | 'employees'>('all');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(0);
  const [remote, setRemote] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; rows: Employee[] }>({ key: '', status: 'ready', rows: [] });
  const term = query.trim().toLocaleLowerCase();
  const wantsEmployees = navigation.canSearchEmployees && filter !== 'pages' && term.length >= 2;
  const requestKey = JSON.stringify([scope, term, wantsEmployees]);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  // Focus after AccountDialog.showModal(); React autoFocus runs while it is still closed.
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    let cancelled = false;
    if (!wantsEmployees) { setRemote({ key: requestKey, status: 'ready', rows: [] }); return; }
    setRemote({ key: requestKey, status: 'loading', rows: [] });
    const timer = setTimeout(() => {
      employeeService.getAll({ search: term, limit: 8, employment_status: 'all' }).then(response => {
        if (!cancelled) setRemote({ key: requestKey, status: 'ready', rows: response.data });
      }).catch(() => { if (!cancelled) setRemote({ key: requestKey, status: 'error', rows: [] }); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [requestKey, retry]);

  const pages = (filter === 'employees' ? [] : navigation.links.filter(item =>
    `${item.label} ${item.sourceLabel} ${item.section} ${item.path} ${aliases[item.path] ?? ''}`.toLocaleLowerCase().includes(term))).slice(0, 18);
  const employees = wantsEmployees && remote.key === requestKey && remote.status === 'ready' ? remote.rows : [];
  const results = [
    ...pages.map(item => ({ path: item.path, label: item.label, description: item.section, icon: item.icon })),
    ...employees.map(employee => ({ path: `/employees/${employee.id}`, label: employee.name,
      description: [employee.employee_id, employee.company?.name].filter(Boolean).join(' · '), icon: UserRound })),
  ];
  const selectedIndex = Math.min(selected, results.length - 1);
  const loading = wantsEmployees && (remote.key !== requestKey || remote.status === 'loading');
  const failed = wantsEmployees && remote.key === requestKey && remote.status === 'error';
  const open = (path: string) => { onClose(); navigate(path); };
  useEffect(() => {
    document.getElementById(`${listId}-${selectedIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [listId, selectedIndex, requestKey]);

  return <AccountDialog labelledBy="navbar-search-title" toasterId="search" className="ph-search-dialog" onClose={onClose}>
    <div className="ph-search">
      <header className="ph-search-header"><h2 id="navbar-search-title">{t("Cari di PeopleHub")}</h2>
        <button className="ph-navbar-icon" aria-label={t("Tutup pencarian")} onClick={onClose}><X size={19} /></button></header>
      <div className="ph-search-input"><Search size={19} aria-hidden="true" />
        <input ref={input} aria-label={t("Cari halaman atau karyawan")} placeholder={navigation.canSearchEmployees ? t("Cari halaman atau karyawan…") : t("Cari halaman…")}
          role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={listId}
          aria-activedescendant={selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
          value={query} onChange={event => { setQuery(event.target.value); setSelected(0); }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected(index => results.length ? (index + (event.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length : 0);
            } else if (event.key === 'Enter' && results[selectedIndex]) { event.preventDefault(); open(results[selectedIndex].path); }
          }} />
      </div>
      <div className="ph-search-filters" aria-label={t("Jenis pencarian")}>
        {(['all', 'pages', ...(navigation.canSearchEmployees ? ['employees'] as const : [])] as const).map(value =>
          <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setSelected(0); }}>
            {value === 'all' ? t("Semua") : value === 'pages' ? t("Halaman") : t("Karyawan")}</button>)}
      </div>
      <div className="ph-search-results">
        <div id={listId} role="listbox" aria-label={t("Hasil pencarian")}>
          {results.map((item, index) => <button id={`${listId}-${index}`} key={item.path} role="option" aria-selected={index === selectedIndex}
            onClick={() => open(item.path)} onMouseMove={() => setSelected(index)} className="ph-search-result">
            <item.icon size={19} aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowUpRight size={16} aria-hidden="true" />
          </button>)}
        </div>
        {loading && <p className="ph-navbar-state" role="status"><Loader2 size={17} className="animate-spin" />{t("Mencari karyawan…")}</p>}
        {failed && <div className="ph-navbar-state" role="alert">{t("Pencarian karyawan gagal.")} <button onClick={() => setRetry(value => value + 1)}>{t("Coba lagi")}</button></div>}
        {!results.length && !loading && !failed && <p className="ph-navbar-state" role="status">{filter === 'employees' && term.length < 2 ? t("Ketik minimal 2 karakter untuk mencari karyawan.") : t("Tidak ada hasil. Coba nama halaman atau kata lain.")}</p>}
      </div>
      <footer className="ph-search-footer"><span>{t("↑ ↓ Pilih · Enter Buka · Esc Tutup")}</span><span>{navigation.canSearchEmployees ? t("Sesuai akses akun Anda") : t("Halaman yang tersedia untuk akun Anda")}</span></footer>
    </div>
  </AccountDialog>;
}
