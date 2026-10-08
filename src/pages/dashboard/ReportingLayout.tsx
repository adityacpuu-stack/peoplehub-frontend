import { t, useLocale } from '@/i18n';
import type { HTMLAttributes } from 'react';
import './reporting.css';
import '../ceo/executive-workspace.css';

/** Presentation only: callers own values, authorization and every interaction. */
export function ReportPage({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  useLocale();
  return <div className={`ph-workflow report-page ${className}`} {...props} />;
}

export function ReportHeader({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  useLocale();
  return <header className={`ph-page-header report-header ${className}`} {...props} />;
}

export function ReportSummary({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  useLocale();
  return <section aria-label={t("Summary")} className={`report-summary ${className}`} {...props} />;
}

export function ReportSection({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  useLocale();
  return <section className={`ph-section report-section ${className}`} {...props} />;
}
