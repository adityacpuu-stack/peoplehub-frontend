import { useSyncExternalStore } from 'react';
import { messages } from './messages';

export type Locale = 'id' | 'en';
export type MessagePair = readonly [id: string, en: string];
const storageKey = 'peoplehub.language';
const listeners = new Set<() => void>();
const normalize = (value: unknown): Locale => value === 'en' ? 'en' : 'id';
function readPreference(): Locale {
  try { return normalize(localStorage.getItem(storageKey)); } catch { return 'id'; }
}
let locale: Locale = readPreference();

export function getLocale(): Locale { return locale; }
export function intlLocale(): string { return locale === 'en' ? 'en-GB' : 'id-ID'; }
export function setLocale(value: Locale): void {
  locale = normalize(value);
  try { localStorage.setItem(storageKey, locale); } catch { /* Private browsing may deny storage. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  listeners.forEach(listener => listener());
}
export function syncAccountLocale(value: unknown): void { setLocale(normalize(value)); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
/** Subscribe without remounting the page or resetting unfinished forms. */
export function useLocale(): Locale { return useSyncExternalStore(subscribe, getLocale, () => 'id'); }

/** Only call for application-owned copy, never employee/document/API content. */
export function t(source: string, values?: Record<string, string | number>): string {
  const pair = messages[source];
  const translated = pair ? pair[locale === 'en' ? 1 : 0] : source;
  return values ? translated.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match) : translated;
}

if (typeof document !== 'undefined') document.documentElement.lang = locale;
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === storageKey) {
    locale = normalize(event.newValue);
    document.documentElement.lang = locale;
    listeners.forEach(listener => listener());
  }
});
