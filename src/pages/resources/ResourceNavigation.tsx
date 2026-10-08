import { t, useLocale } from '@/i18n';
import { NavLink } from 'react-router-dom';
import { FileStack, Megaphone } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { getNavigation } from '@/components/layout/navigation';
import { useNavigationConfig } from '@/components/layout/useNavigationConfig';
import './resources.css';

const destinations = [
  { path: '/templates', label: 'Templates', icon: FileStack },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
];

export function ResourceNavigation() {
  useLocale();
  const user = useAuthStore(state => state.user);
  useNavigationConfig();
  const navigation = getNavigation(user);
  return <nav className="ph-resource-navigation" aria-label={t("Navigasi Resources")}>
    {destinations.filter(item => navigation.links.some(link => link.path === item.path)).map(item =>
      <NavLink key={item.path} to={item.path}><item.icon size={18} aria-hidden="true" /><span>{t(item.label)}</span></NavLink>)}
  </nav>;
}
