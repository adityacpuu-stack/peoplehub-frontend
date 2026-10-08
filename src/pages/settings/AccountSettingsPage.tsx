import { t, useLocale } from '@/i18n';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AccountDialog } from '@/components/ui/AccountDialog';
import { useAuthStore } from '@/stores/auth.store';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { SettingsPage, settingsTabs } from './SettingsPage';
import { settingsAccess, type SettingsTab } from './settings-access';
import type { AccountSectionHandle } from './account-section';
import './account-settings.css';
import './settings-refresh.css';

type AccountTab = 'profile' | SettingsTab;

export function AccountSettingsPage({ active, onClose }: { active: AccountTab; onClose: () => void }) {
  useLocale();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  // Same role ceiling + covered-action narrowing as SettingsPage (payroll tab hidden without payroll.view).
  const access = settingsAccess(user?.roles ?? [], user);
  const section = useRef<AccountSectionHandle>(null);
  const [busy, setBusy] = useState(false);
  const tabs = [
    { id: 'profile' as const, label: 'Profil saya', icon: UserRound, personal: true },
    ...settingsTabs.filter(tab => access[tab.id].view),
  ];
  const leave = (action: () => void) => {
    if (busy) return;
    if (section.current) section.current.leave(action);
    else action();
  };
  const select = (tab: AccountTab) => {
    if (tab === active) return;
    leave(() => {
      toast.removeAll('account');
      navigate('/settings/' + tab, { replace: true });
    });
  };

  return <AccountDialog labelledBy="account-title" toasterId="account" className="settings-refresh-dialog" onClose={() => leave(onClose)}>
    <div className="ph-account ph-workflow">
      <header className="ph-account-header">
        <div><h1 id="account-title">{t("Profil & Pengaturan")}</h1><p>{t("Data pribadi, preferensi akun, dan pengaturan sesuai akses Anda.")}</p></div>
        <button type="button" className="ph-account-close" aria-label={t("Tutup profil dan pengaturan")} autoFocus
          disabled={busy} onClick={() => leave(onClose)}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="ph-account-body">
        <nav aria-label={t("Kategori pengaturan")} className="ph-account-nav">
          <div className="ph-account-desktop-nav">
            {[true, false].map(personal => {
              const items = tabs.filter(tab => !!tab.personal === personal);
              if (!items.length) return null;
              return <div key={String(personal)} className="ph-account-group">
                <h2>{personal ? t("Akun saya") : t("Perusahaan")}</h2>
                <ul>{items.map(tab => <li key={tab.id}><button type="button" disabled={busy}
                  aria-current={active === tab.id ? 'page' : undefined} onClick={() => select(tab.id)}>
                  <tab.icon size={16} aria-hidden="true" /><span>{t(tab.label)}</span>
                </button></li>)}</ul>
              </div>;
            })}
          </div>
          <div className="ph-account-mobile-nav">
            <label htmlFor="account-category">{t("Bagian pengaturan")}</label>
            <select id="account-category" value={active} disabled={busy} onChange={event => select(event.target.value as AccountTab)}>
              {!tabs.some(tab => tab.id === active) && <option value={active} disabled>{t("Pengaturan tidak tersedia")}</option>}
              {[true, false].map(personal => {
                const items = tabs.filter(tab => !!tab.personal === personal);
                return items.length > 0 && <optgroup key={String(personal)} label={personal ? t("Akun saya") : t("Perusahaan")}>
                  {items.map(tab => <option key={tab.id} value={tab.id}>{t(tab.label)}</option>)}
                </optgroup>;
              })}
            </select>
          </div>
        </nav>
        <div className="ph-account-content">
          {active === 'profile'
            ? <ProfilePage navigationRef={section} onBusyChange={setBusy} />
            : <SettingsPage defaultTab={active} navigationRef={section} onBusyChange={setBusy} />}
        </div>
      </div>
    </div>
  </AccountDialog>;
}
