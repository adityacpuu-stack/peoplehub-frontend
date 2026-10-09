import { t, useLocale } from '@/i18n';
import { useState, useEffect, useRef, useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useAuthStore } from '@/stores/auth.store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { leaveService } from '@/services/leave.service';
import { getApprovalInbox, canDecideApproval } from '@/services/approval-inbox.service';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Settings, UsersRound, X } from 'lucide-react';
import { getNavigation, type MenuItem, type DropdownMenu } from './navigation';
import { useNavigationConfig } from './useNavigationConfig';
import { lockBodyScroll } from '@/components/ui/scroll-lock';

export function Sidebar() {
  useLocale();
  const location = useLocation();
  const { isCollapsed, toggleCollapse, isOpen, setOpen } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const isMobile = useIsMobile();
  // A desktop preference must never hide labels/submenus in the mobile drawer.
  const compact = isCollapsed && !isMobile;
  const drawerOpen = isMobile && isOpen;
  const sidebar = useRef<HTMLElement>(null);
  const [dropdownState, setDropdownState] = useState<{ path: string; values: Record<string, boolean> }>({ path: location.pathname, values: {} });
  const dropdowns = dropdownState.path === location.pathname ? dropdownState.values : {};
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [managerPendingLeaveCount, setManagerPendingLeaveCount] = useState(0);

  useNavigationConfig();
  const navigation = getNavigation(user, { ceo: pendingApprovalsCount, manager: managerPendingLeaveCount });
  const { isGroupCEO, isCEO, isManager } = navigation;
  const managerLeaveEnabled = isManager && (user?.companyFeatures?.leave_enabled ?? true);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, setOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const unlockScroll = lockBodyScroll();
    sidebar.current?.querySelector<HTMLButtonElement>('[data-drawer-close]')?.focus();
    return () => {
      unlockScroll();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [drawerOpen]);

  // Preserve the existing, role-specific approval indicators.
  useEffect(() => {
    let cancelled = false;
    if (!isGroupCEO && !isCEO) return;
    let generation = 0;
    const refresh = () => {
      const current = ++generation;
      getApprovalInbox(true).catch(() => []).then(requests => {
        if (!cancelled && current === generation) setPendingApprovalsCount(requests.filter(canDecideApproval).length);
      });
    };
    refresh();
    window.addEventListener('executive-approvals-changed', refresh);
    return () => { cancelled = true; window.removeEventListener('executive-approvals-changed', refresh); };
  }, [isGroupCEO, isCEO, user?.id, location.pathname]);

  useEffect(() => {
    let cancelled = false;
    if (!managerLeaveEnabled) return;
    let generation = 0;
    const refresh = () => {
      const current = ++generation;
      leaveService.getMyApprovals().catch(() => []).then(leaves => {
        if (!cancelled && current === generation) setManagerPendingLeaveCount(leaves.filter(leave => leave.status === 'pending' && leave.can_approve === true).length);
      });
    };
    refresh();
    window.addEventListener('leave-approvals-changed', refresh);
    return () => { cancelled = true; window.removeEventListener('leave-approvals-changed', refresh); };
  }, [managerLeaveEnabled, user?.id, location.pathname]);

  // Prefer the closest destination: /leave/policy must not also activate /leave.
  // A detail URL without its own menu entry still highlights its parent register.
  const activePath = navigation.links
    .filter(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;
  const isActive = (path: string) => path === activePath;
  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return <>
    {drawerOpen && <div className="ph-sidebar-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />}
    <aside ref={sidebar} id="app-sidebar" aria-label={t("Menu utama")} role={drawerOpen ? 'dialog' : undefined}
      aria-modal={drawerOpen ? true : undefined} inert={isMobile && !isOpen}
      className={cn('ph-sidebar', compact && 'is-compact', drawerOpen && 'is-open')}
      onKeyDown={event => {
        if (!drawerOpen) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        if (event.key !== 'Tab') return;
        const items = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])
          .filter(item => item.tabIndex >= 0 && !item.matches(':disabled') && item.getClientRects().length > 0);
        const first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <div className="ph-sidebar-brand">
        <Link to="/dashboard" aria-label={t("PeopleHub — Dashboard")} title={compact ? t("PeopleHub") : undefined}>
          {compact ? <UsersRound size={25} aria-hidden="true" /> : <img src="/images/logo/logo-black.png" alt={t("PeopleHub")} />}
        </Link>
        <button className="ph-sidebar-collapse" onClick={toggleCollapse}
          aria-label={compact ? t("Perluas sidebar") : t("Ciutkan sidebar")} title={compact ? t("Perluas sidebar") : t("Ciutkan sidebar")}>
          {compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button className="ph-sidebar-close" data-drawer-close aria-label={t("Tutup menu navigasi")} onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      {navigation.isEmployee && !compact && <div className="ess-sidebar-workspace"><strong>{t("PFIGroups")}</strong><span>{t(user?.roles?.includes('IT Admin') ? 'IT workspace' : 'Employee Self-Service')}</span></div>}
      <nav className="ph-sidebar-nav" aria-label={t("Navigasi utama")}>
        {navigation.sections.map((section, index) => <div key={index} className="ph-sidebar-section">
          {section.label && <div className="ph-sidebar-label">{compact ? <span aria-hidden="true" /> : section.label}</div>}
          {section.entries.map(entry => {
            if (!('items' in entry)) return <NavItem key={entry.path} item={entry} active={isActive(entry.path)} compact={compact} onClick={() => setOpen(false)} />;
            const key = `${index}:${entry.sourceLabel}`;
            const active = entry.items.some(item => isActive(item.path));
            const expanded = dropdowns[key] ?? active;
            return <NavDropdown key={key} dropdown={entry} expanded={!compact && expanded} active={active}
              compact={compact} currentPath={activePath} onNavigate={() => setOpen(false)}
              onToggle={() => {
                if (compact) toggleCollapse();
                setDropdownState(previous => ({ path: location.pathname, values: {
                  ...(previous.path === location.pathname ? previous.values : {}),
                  [key]: compact || !expanded,
                } }));
              }} />;
          })}
        </div>)}
      </nav>

      <div className="ph-sidebar-footer">
        <Link to="/settings" className="ph-sidebar-settings" aria-label={t("Profil & Pengaturan")} title={compact ? t("Profil & Pengaturan") : undefined} onClick={() => setOpen(false)}>
          <Settings size={18} aria-hidden="true" />{!compact && <span>{t("Profil & Pengaturan")}</span>}
        </Link>
        <button onClick={handleLogout} aria-label={t("Logout")} title={t("Logout")} className="ph-sidebar-logout"><LogOut size={18} /></button>
      </div>
    </aside>
  </>;
}

function NavItem({ item, active, compact, onClick }: { item: MenuItem; active: boolean; compact: boolean; onClick: () => void }) {
  useLocale();
  const Icon = item.icon;
  return <Link to={item.path} onClick={onClick} title={compact ? item.label : undefined} aria-label={item.label}
    aria-current={active ? 'page' : undefined} className={cn('ph-sidebar-link', active && 'is-active')}>
    <Icon size={18} aria-hidden="true" />
    {!compact && <span className="ph-sidebar-link-text">{item.label}</span>}
    {!!item.badge && <span className="ph-sidebar-count" aria-label={t('{count} menunggu', { count: item.badge })}>{item.badge > 99 ? '99+' : item.badge}</span>}
  </Link>;
}

function NavDropdown({ dropdown, expanded, active, compact, onToggle, onNavigate, currentPath }: {
  dropdown: DropdownMenu; expanded: boolean; active: boolean; compact: boolean;
  onToggle: () => void; onNavigate: () => void; currentPath: string | undefined;
}) {
  useLocale();
  const id = useId();
  const Icon = dropdown.icon;
  return <div className="ph-sidebar-group">
    <button onClick={onToggle} aria-expanded={expanded} aria-controls={id} aria-label={dropdown.label}
      title={compact ? dropdown.label : undefined} className={cn('ph-sidebar-link', 'ph-sidebar-group-trigger', active && 'is-active')}>
      <Icon size={18} aria-hidden="true" />
      {!compact && <><span className="ph-sidebar-link-text">{dropdown.label}</span><ChevronDown size={15} className={cn('ph-sidebar-chevron', expanded && 'is-open')} aria-hidden="true" /></>}
    </button>
    <div id={id} hidden={!expanded} className="ph-sidebar-submenu">
      {dropdown.items.map(item => <Link key={item.path} to={item.path} onClick={onNavigate}
        aria-current={currentPath === item.path ? 'page' : undefined}>
        <span aria-hidden="true" className="ph-sidebar-submenu-dot" />{item.label}
      </Link>)}
    </div>
  </div>;
}
