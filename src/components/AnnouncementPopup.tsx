import { useEffect, useState } from 'react';
import { X, Megaphone, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { notificationService, type AnnouncementPopup as AnnouncementPopupType } from '@/services/notification.service';

export function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<AnnouncementPopupType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!current) return;

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
    }
  };

  const handleDismissAll = async () => {
    try {
      await notificationService.dismissAllAnnouncementPopups();
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to dismiss all announcements:', error);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
  };

  if (isLoading || !isVisible || announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex];
  const isUrgent = current.type === 'announcement_urgent' || current.announcement.priority === 'urgent';

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'policy': return 'bg-blue-100 text-blue-700';
      case 'event': return 'bg-purple-100 text-purple-700';
      case 'hr': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all ${isUrgent ? 'ring-4 ring-red-500' : ''}`}>
        {/* Header */}
        <div className={`px-6 py-4 ${isUrgent ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isUrgent ? (
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isUrgent ? 'Pengumuman Penting!' : 'Pengumuman Baru'}
                </h3>
                <p className="text-sm text-white/80">
                  {announcements.length > 1 ? `${currentIndex + 1} dari ${announcements.length} pengumuman` : 'Ada pengumuman untuk Anda'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissAll}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Tutup semua"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Category & Priority badges */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(current.announcement.category)}`}>
              {current.announcement.category.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${getPriorityColor(current.announcement.priority)}`}>
              {current.announcement.priority.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-xl font-bold text-gray-900 mb-3">
            {current.announcement.title}
          </h4>

          {/* Content */}
          <div
            className="text-gray-600 prose prose-sm max-w-none max-h-64 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: current.announcement.content }}
          />

          {/* Meta */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Oleh: {current.announcement.creator.name}</span>
            <span>
              {new Date(current.announcement.published_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
          {/* Navigation (if multiple) */}
          {announcements.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-1">
                {announcements.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {announcements.length <= 1 && <div />}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {announcements.length > 1 && (
              <button
                onClick={handleDismissAll}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Tutup Semua
              </button>
            )}
            <button
              onClick={handleDismiss}
              className={`px-6 py-2 rounded-xl font-bold text-white transition-all shadow-lg ${
                isUrgent
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              }`}
            >
              {announcements.length > 1 ? 'Mengerti, Lanjut' : 'Mengerti'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
