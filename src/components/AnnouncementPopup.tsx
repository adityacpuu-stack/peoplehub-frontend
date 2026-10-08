import { t, useLocale, intlLocale } from '@/i18n';
import { Modal } from '@/components/ui/Modal';
import '@/pages/notifications/notifications.css';
import { useEffect, useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { notificationService, type AnnouncementPopup as AnnouncementPopupType } from '@/services/notification.service';
import { useAuthStore } from '@/stores/auth.store';

// Conservative HTML allowlist for announcement content. Strips script/style/iframe/
// event handlers / javascript: URLs / inline styles entirely.
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a',
    'img',
    'div', 'span',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'],
};

function SanitizedHtml({ html }: { html: string }) {
  useLocale();
  const clean = useMemo(() => DOMPurify.sanitize(html ?? '', SANITIZE_CONFIG), [html]);
  return (
    <div
      className="ph-announcement-prose"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export function AnnouncementPopup() {
  useLocale();
  // A later popup response must not cover the mandatory account workflows.
  const onboardingRequired = useAuthStore(({ user }) => user?.force_password_change === true ||
    !!user?.employee && (user.employee.profile_completed === false || !user.employee.national_id));
  const [announcements, setAnnouncements] = useState<AnnouncementPopupType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissError, setDismissError] = useState(false);
  const dismissing = useRef(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await notificationService.getAnnouncementPopups();
      if (data.length > 0) {
        setAnnouncements(data);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Failed to fetch announcement popups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    const current = announcements[currentIndex];
    if (!current || dismissing.current) return;
    dismissing.current = true; setIsDismissing(true); setDismissError(false);
    try {
      await notificationService.dismissAnnouncementPopup(current.notification_id);

      const remaining = announcements.filter((_, i) => i !== currentIndex);
      if (remaining.length === 0) {
        setIsVisible(false);
      } else {
        setAnnouncements(remaining);
        setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
      }
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
      setDismissError(true);
    } finally { dismissing.current = false; setIsDismissing(false); }
  };

  const handleDismissAll = async () => {
    if (dismissing.current) return;
    dismissing.current = true; setIsDismissing(true); setDismissError(false);
    try {
      await notificationService.dismissAllAnnouncementPopups();
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to dismiss all announcements:', error);
      setDismissError(true);
    } finally { dismissing.current = false; setIsDismissing(false); }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
  };

  if (onboardingRequired || isLoading || !isVisible || announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex];
  const isUrgent = current.type === 'announcement_urgent' || current.announcement.priority === 'urgent';

  return <Modal isOpen={isVisible} onClose={handleDismissAll} busy={isDismissing} size="lg"
    title={isUrgent ? t("Pengumuman Penting!") : t("Pengumuman Baru")}
    description={announcements.length > 1 ? t('{index} dari {total} pengumuman', { index: currentIndex + 1, total: announcements.length }) : t("Ada pengumuman untuk Anda")}>
    <article className="ph-announcement-reader ph-workflow" aria-busy={isDismissing}>
      <header className="ph-announcement-heading">
        <div className="ph-announcement-meta"><span>{current.announcement.category}</span><span data-priority={current.announcement.priority}>{isUrgent && <AlertTriangle size={14} aria-hidden="true" />}{current.announcement.priority}</span></div>
        <h3 id="announcement-popup-title">{current.announcement.title}</h3>
        <div className="ph-announcement-byline"><span>{t("Oleh:")} {current.announcement.creator.name}</span>
          <time dateTime={current.announcement.published_at}>{new Date(current.announcement.published_at).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}</time>
        </div>
      </header>
      <SanitizedHtml html={current.announcement.content} />
      {dismissError && <p role="alert" className="ph-callout" data-tone="error">{t("Pengumuman belum dapat ditutup. Silakan coba lagi.")}</p>}
      <footer className="ph-dialog-footer ph-announcement-footer">
        {announcements.length > 1 && <nav className="ph-actions" aria-label={t("Navigasi pengumuman")}>
          <button type="button" onClick={handlePrev} disabled={isDismissing} className="ph-button" aria-label={t("Pengumuman sebelumnya")}><ChevronLeft size={16} /></button>
          <span aria-live="polite">{currentIndex + 1} / {announcements.length}</span>
          <button type="button" onClick={handleNext} disabled={isDismissing} className="ph-button" aria-label={t("Pengumuman berikutnya")}><ChevronRight size={16} /></button>
        </nav>}
        <div className="ph-actions">
          {announcements.length > 1 && <button type="button" onClick={handleDismissAll} disabled={isDismissing} className="ph-button">{t("Tutup Semua")}</button>}
          <button type="button" onClick={handleDismiss} disabled={isDismissing} className="ph-button ph-button-primary">{isDismissing ? t("Menutup…") : announcements.length > 1 ? t("Mengerti, Lanjut") : t("Mengerti")}</button>
        </div>
      </footer>
    </article>
  </Modal>;
}
