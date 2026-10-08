import { t, useLocale } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';

export function PersonalRoute({ children, feature }: {
  children: React.ReactNode;
  feature?: 'attendance_enabled' | 'leave_enabled';
}) {
  useLocale();
  const user = useAuthStore(state => state.user);
  if (!user?.employee) {
    return <div className="p-6 text-gray-600" role="status">{t("Akun belum terhubung ke profil karyawan. Hubungi P&C.")}</div>;
  }
  if (feature && user.companyFeatures?.[feature] === false) {
    return <div className="p-6 text-gray-600" role="status">{t("Fitur ini belum diaktifkan untuk perusahaan Anda.")}</div>;
  }
  return <>{children}</>;
}
