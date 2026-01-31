import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function LayoutNoSidebar() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-16">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
