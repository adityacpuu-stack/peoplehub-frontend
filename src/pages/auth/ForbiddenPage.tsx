import { t, useLocale } from '@/i18n';
import { AuthLayout } from './components/AuthLayout';
import { Link, useLocation } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';

export function ForbiddenPage() {
  useLocale();
  const { user } = useAuthStore();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  return (
    <AuthLayout>
      <section className="ph-auth-result">
        <div className="mb-5">
          <ShieldX className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t("Akses ditolak")}</h1>
        <p className="text-gray-600 mb-2">{t("Kamu tidak memiliki izin untuk mengakses halaman ini.")} </p>
        {from && (
          <p className="text-sm text-gray-500 mb-6">{t("Halaman:")} <code className="bg-gray-100 px-1.5 py-0.5 rounded">{from}</code>
          </p>
        )}
        {user && (
          <p className="text-xs text-gray-400 mb-6">{t("Login sebagai:")} {user.email}{t("· Role:")} {user.roles?.join(', ') || '(no roles)'}
          </p>
        )}
        <div className="flex gap-3">
          <Link to="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />{t("Kembali ke Dashboard")} </Button>
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-8">{t("Kalau menurut kamu ini error, hubungi admin atau HR.")} </p>
      </section>
    </AuthLayout>
  );
}
