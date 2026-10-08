import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AnnouncementPopup } from '@/components/AnnouncementPopup';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useAuthStore } from '@/stores/auth.store';
import { usePresence } from '@/hooks/usePresence';
import { useAuditActivity } from '@/hooks/useAuditActivity';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import './shell.css';
import './ess-shell.css';
import '@/pages/admin/admin-refresh.css';
import { getNavigation } from './navigation';

export function Layout() {
  const { isCollapsed, isOpen } = useSidebarStore();
  const isMobile = useIsMobile();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const { isEmployee, isHR, isManager, isCEO, isGroupCEO, isSuperAdmin } = getNavigation(user);
  usePresence(token);
  useAuditActivity(token);

  return (
    <div className={cn('ph-shell', isEmployee && 'ess-shell', isHR && 'hr-shell', isManager && 'manager-shell', (isCEO || isGroupCEO) && 'executive-shell', isSuperAdmin && 'admin-shell', isCollapsed && 'is-sidebar-compact')}>
      <Sidebar />
      <Header />
      <main id="main-content" tabIndex={-1} className="ph-shell-main" inert={isMobile && isOpen}>
        <div className="ph-shell-content">
          <Outlet />
        </div>
      </main>

      {/* Announcement Popup */}
      <AnnouncementPopup />
    </div>
  );
}
