import { Link, useLocation } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';

export function ForbiddenPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <ShieldX className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Akses ditolak</h1>
        <p className="text-gray-600 mb-2">
          Kamu tidak memiliki izin untuk mengakses halaman ini.
        </p>
        {from && (
          <p className="text-sm text-gray-500 mb-6">
            Halaman: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{from}</code>
          </p>
        )}
        {user && (
          <p className="text-xs text-gray-400 mb-6">
            Login sebagai: {user.email} · Role: {user.roles?.join(', ') || '(no roles)'}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-8">
          Kalau menurut kamu ini error, hubungi admin atau HR.
        </p>
      </div>
    </div>
  );
}
