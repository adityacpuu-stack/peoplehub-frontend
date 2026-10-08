import { t, useLocale } from '@/i18n';
import type { ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import '../auth.css';
import '../login-entrance.css';

export function AuthLayout({ children, employeePortal = false, recovery = false }: { children: ReactNode; employeePortal?: boolean; recovery?: boolean }) {
  useLocale();
  if (employeePortal) return (
    <div className={`ph-auth ess-login${recovery ? ' ess-recovery' : ''}`}>
      <div className="auth-language"><LanguageSwitcher /></div>
      <div className="ess-login-access">
      <header className="ess-login-header">
        <div className="ess-login-wordmark"><img src="/images/logo/logo-black.png" alt={t("PeopleHub")} width="232" height="78" /></div>
        <div className="ess-login-company"><span>{t("PFIGroups")}</span></div>
      </header>
      <main className="ess-login-main">
        <div className="ess-login-panel">
          <section className="ess-login-form-panel" aria-label={recovery ? t("Account recovery") : t("Sign in")}>
            <div className="ph-auth-content">{children}
              <div className="ess-login-support"><strong>{t("Need help with your account?")}</strong><p>{t("Contact your People & Culture team for access or account assistance.")}</p></div>
            </div>
          </section>
        </div>
      </main>
      <footer className="ess-login-footer"><span>&copy; {new Date().getFullYear()}{' '}{t("PeopleHub")}</span><span>{t("Employee Self-Service")}</span></footer>
      </div>
      <aside className="ess-login-welcome" aria-label={t("PeopleHub Employee Self-Service")}>
        <div className="ess-login-art" aria-hidden="true"><span /><span /><span /></div>
        <div className="ess-login-welcome-copy">
          <h2>{recovery ? <>{t("Get back to")}<br />{t("your PeopleHub.")}</> : <>{t("Welcome to")}<br />{t("Employee Self-Service.")}</>}</h2>
          <p>{t("PFIGroups")}</p>
          <span>{recovery ? t("Reset your password to access Employee Self-Service.") : t("Your work. Your people. Your PeopleHub.")}</span>
        </div>
      </aside>
    </div>
  );
  return <div className="ph-auth">
    <div className="auth-language"><LanguageSwitcher /></div>
    <header className="ph-auth-brand"><img src="/images/logo/logo-black.png" alt={t("PeopleHub")} /></header>
    <main className="ph-auth-main"><div className="ph-auth-content">{children}</div></main>
    <footer className="ph-auth-footer">&copy; {new Date().getFullYear()}{' '}{t("PeopleHUB. All rights reserved.")}</footer>
  </div>;
}
