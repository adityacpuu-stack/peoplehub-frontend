import { t, useLocale } from '@/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { roleLabel } from '@/pages/admin/localization';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronDown, ChevronRight, Grid3X3, LogOut, Menu, Search, Settings, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useSidebarStore } from '@/stores/sidebar.store';
import { getInitials } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getNavigation } from './navigation';
import { useNavigationConfig } from './useNavigationConfig';
import { SearchModal } from './SearchModal';
import { NotificationList } from './NotificationList';
import { useNotifications, useUnreadNotifications } from '@/hooks/useNotifications';
import './navbar.css';

type Popover = 'notifications' | 'shortcuts' | 'account';
const labels: Record<string, string> = {
  employees: 'Employees', create: 'Tambah', edit: 'Edit', settings: 'Profil & Pengaturan', profile: 'Profil & Pengaturan',
  general: 'Profil perusahaan', attendance: 'Kehadiran', payroll: 'Payroll', notifications: 'Notifikasi', security: 'Keamanan akun',
  resources: 'Resources', leave: 'Leave', tax: 'Tax', ceo: 'Executive', manager: 'Team', employee: 'Personal',
};

export function Header() {
  useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const { isOpen, setOpen } = useSidebarStore();
  const isMobile = useIsMobile();
  useNavigationConfig();
  const navigation = getNavigation(user);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const count = useUnreadNotifications();
  const feed = useNotifications(1, false, 10, popover === 'notifications');
  const name = user?.employee?.name || user?.email?.split('@')[0] || t('User');
  const closePopover = (restore = false) => { setPopover(null); if (restore) opener.current?.focus(); };
  const toggle = (value: Popover, button: HTMLButtonElement) => {
    opener.current = button; setPopover(previous => previous === value ? null : value);
  };
  const openSearch = () => { setPopover(null); setSearchOpen(true); };
  useEffect(() => { setPopover(null); setSearchOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (popover) panel.current?.focus({ preventScroll: true });
  }, [popover]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isMobile && isOpen) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (document.querySelector('dialog[open], [role="alertdialog"]')) return;
        event.preventDefault(); openSearch();
      } else if (event.key === 'Escape' && popover) {
        event.preventDefault(); closePopover(true);
      }
    };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setPopover(null); };
    document.addEventListener('keydown', keydown); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('pointerdown', outside); };
  }, [popover, isMobile, isOpen]);
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const known = navigation.links.find(item => item.path === path);
    return { path, known: !!known, label: known?.label || (labels[segment] ? t(labels[segment]) : undefined) || (/^\d+$/.test(segment) ? 'Detail' : segment.charAt(0).toUpperCase() + segment.slice(1)) };
  }).filter(crumb => crumb.path !== '/dashboard');
  // These are destinations from the shared model, never another set of role rules.
  const priorities = ['/my-attendance', '/my-leave', '/documents', '/employees', '/my-team', '/leave-approval', '/payroll', '/ceo/payroll-report', '/users'];
  const shortcuts = priorities.flatMap(path => { const item = navigation.links.find(link => link.path === path); return item ? [item] : []; }).slice(0, 6);
  if (!shortcuts.length) shortcuts.push(...navigation.links.filter(link => link.path !== '/notifications').slice(0, 4));
  const windows = typeof navigator !== 'undefined' && !/Mac|iPhone|iPad/.test(navigator.platform);

  return <>
    <header ref={root} className="ph-navbar" inert={isMobile && isOpen}>
      <a className="ph-shell-skip" href="#main-content">{t("Langsung ke konten")}</a>
      <div className="ph-navbar-location">
        <button aria-label={t("Buka menu navigasi")} aria-expanded={isOpen} aria-controls="app-sidebar" onClick={() => { closePopover(); setOpen(!isOpen); }} className="ph-navbar-icon ph-navbar-menu"><Menu size={20} /></button>
        <div className="ph-navbar-heading">
        {navigation.isEmployee && <span className="ess-navbar-title">{t(user?.roles?.includes('IT Admin') ? 'IT workspace' : 'Employee Self-Service')}</span>}
        {navigation.isHR && <span className="ess-navbar-title">{t("People & Culture")}</span>}
        {navigation.isManager && <span className="ess-navbar-title">{t("Team workspace")}</span>}
        {navigation.isSuperAdmin && <span className="ess-navbar-title">{t("Administration")}</span>}
        {(navigation.isCEO || navigation.isGroupCEO) && <span className="ess-navbar-title">{navigation.isGroupCEO ? t("Group overview") : t("Executive workspace")}</span>}
        <nav aria-label={t("Breadcrumb")} className="ph-breadcrumb">
          <Link to="/dashboard" aria-current={!breadcrumbs.length ? 'page' : undefined}>{t("Dashboard")}</Link>
          {breadcrumbs.map((crumb, index) => <span key={crumb.path}><ChevronRight size={14} aria-hidden="true" />
            {index === breadcrumbs.length - 1 ? <strong aria-current="page">{crumb.label}</strong>
              : crumb.known ? <Link to={crumb.path}>{crumb.label}</Link> : <span>{crumb.label}</span>}</span>)}
        </nav>
        </div>
      </div>
        <button className="ph-navbar-search" aria-label={t("Buka pencarian")} aria-keyshortcuts="Control+k Meta+k" onClick={openSearch}>
          <Search size={18} aria-hidden="true" /><span>{navigation.canSearchEmployees ? t("Cari halaman atau karyawan…") : t("Cari halaman…")}</span><kbd>{windows ? t("Ctrl K") : t("⌘ K")}</kbd>
        </button>
      <div className="ph-navbar-actions">
        <LanguageSwitcher />
        <button className="ph-navbar-icon ph-navbar-shortcut-trigger" aria-label={t("Akses cepat")} title={t("Akses cepat")} aria-expanded={popover === 'shortcuts'}
          aria-controls={popover === 'shortcuts' ? 'navbar-popover' : undefined}
          onClick={event => toggle('shortcuts', event.currentTarget)}><Grid3X3 size={19} /></button>
        <button className="ph-navbar-icon" aria-label={count == null ? t("Notifikasi, jumlah belum tersedia") : t('Notifikasi, {count} belum dibaca', { count })}
          title={t("Notifikasi")}
          aria-expanded={popover === 'notifications'} aria-controls={popover === 'notifications' ? 'navbar-popover' : undefined}
          onClick={event => toggle('notifications', event.currentTarget)}><Bell size={20} />
          {count !== null && count > 0 && <span className="ph-navbar-badge">{count > 99 ? '99+' : count}</span>}</button>
        <button className="ph-navbar-account" aria-label={t("Menu akun")} aria-expanded={popover === 'account'} data-account-menu-trigger
          aria-controls={popover === 'account' ? 'navbar-popover' : undefined}
          onClick={event => toggle('account', event.currentTarget)}>
          <span className="ph-navbar-avatar" aria-hidden="true">{getInitials(name)}</span>
          <span className="ph-navbar-identity"><strong>{name}</strong><small>{user?.employee?.job_title || user?.employee?.position?.name || user?.roles.map(roleLabel).join(' / ')}</small></span>
          <ChevronDown size={14} aria-hidden="true" /></button>
      </div>
      {popover && <div ref={panel} id="navbar-popover" tabIndex={-1} className={'ph-navbar-popover ' + (popover === 'notifications' ? 'ph-navbar-notifications' : '')}
        role="region" aria-label={popover === 'notifications' ? t("Notifikasi terbaru") : popover === 'shortcuts' ? t("Akses cepat") : t("Akun saya")}
        onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && !opener.current?.contains(event.relatedTarget as Node)) setPopover(null); }}
        onKeyDown={event => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
          if (!items.length) return;
          event.preventDefault();
          const current = items.indexOf(document.activeElement as HTMLElement);
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
            : current < 0 ? (event.key === 'ArrowDown' ? 0 : items.length - 1)
              : (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
          items[index].focus();
        }}>
        <div className="ph-navbar-popover-header"><h2>{popover === 'notifications' ? t("Notifikasi") : popover === 'shortcuts' ? t("Akses cepat") : name}</h2>
          <button aria-label={t("Tutup menu navbar")} className="ph-navbar-icon" onClick={() => closePopover(true)}><X size={17} /></button></div>
        {popover === 'notifications' ? <>
          <button className="ph-navbar-read-all" disabled={feed.status !== 'ready' || !feed.data?.unread_count || feed.busy !== null}
            onClick={() => feed.markRead('all')}><CheckCheck size={15} />{t("Tandai semua dibaca")}</button>
          <div className="ph-navbar-feed"><NotificationList feed={feed} onNavigate={() => closePopover()} /></div>
          <Link to="/notifications" className="ph-navbar-all" onClick={() => closePopover()}>{t("Lihat semua notifikasi")}</Link>
        </> : popover === 'shortcuts' ? <div className="ph-navbar-shortcuts">{shortcuts.map(item =>
          <Link key={item.path} to={item.path} onClick={() => closePopover()}><item.icon size={19} /><span>{item.label}</span></Link>)}</div>
          : <div className="ph-navbar-account-menu"><p>{user?.email}</p>
            <button onClick={() => { closePopover(); navigate('/settings'); }}><Settings size={18} />{t("Profil & Pengaturan")}</button>
            <button onClick={async () => { closePopover(); await logout(); navigate('/login'); }}><LogOut size={18} />{t("Keluar")}</button>
          </div>}
      </div>}
    </header>
    {searchOpen && <SearchModal key={JSON.stringify([user?.id, user?.roles, user?.accessibleCompanyIds])} navigation={navigation} onClose={() => setSearchOpen(false)} />}
  </>;
}
