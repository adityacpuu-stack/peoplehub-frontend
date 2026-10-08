import { t, useLocale } from '@/i18n';

/** Retain an application-owned source in state so open messages follow locale changes. */
export function ApplicationCopy({ source }: { source: string }) {
  useLocale();
  return <>{t(source)}</>;
}
