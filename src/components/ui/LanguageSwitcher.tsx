import { useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/services/api';
import { getLocale, setLocale, t, useLocale, type Locale } from '@/i18n';
import './language-switcher.css';

export function LanguageSwitcher() {
  const locale = useLocale();
  const user = useAuthStore(state => state.user);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const change = async (next: Locale) => {
    if (busy.current || next === getLocale()) return;
    setError(false);
    if (!user) { setLocale(next); return; }
    busy.current = true;
    setSaving(true);
    try {
      await api.put('/users/me/language', { language: next });
      // Ignore an old account's response after logout/account change.
      const current = useAuthStore.getState();
      if (current.user?.id === user.id) current.setUser({ ...current.user, language: next });
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return <div className="ph-language">
    <div role="group" aria-label={t('Language')} aria-busy={saving}>
      {(['en', 'id'] as const).map(value => <button key={value} type="button"
        lang={value} aria-label={value === 'en' ? 'English' : 'Bahasa Indonesia'}
        aria-pressed={locale === value} disabled={saving} onClick={() => void change(value)}>{value.toUpperCase()}</button>)}
    </div>
    {saving && <span className="sr-only" role="status">{t('Saving language…')}</span>}
    {error && <span className="ph-language-error" role="alert">{t('Could not save language. Please try again.')}</span>}
  </div>;
}
