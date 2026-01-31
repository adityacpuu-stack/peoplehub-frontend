import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSidebarStore } from '@/stores/sidebar.store';
import { cn } from '@/lib/utils';

export function Layout() {
  const { isCollapsed, isOpen } = useSidebarStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'pt-16 transition-all duration-300',
          // Desktop: add left padding for sidebar
          // Mobile: no padding (sidebar is overlay)
          'lg:pl-[280px]',
          isCollapsed && 'lg:pl-20'
        )}
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => useSidebarStore.getState().setOpen(false)}
        />
      )}
    </div>
  );
}
