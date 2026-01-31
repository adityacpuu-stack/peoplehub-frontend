import { useState, useEffect } from 'react';
import {
  Megaphone,
  Search,
  Calendar,
  Pin,
  AlertCircle,
  Info,
  CheckCircle,
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Loader2,
  Eye,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  announcementService,
  ANNOUNCEMENT_CATEGORIES,
  type Announcement,
  type AnnouncementStatistics,
  getAnnouncementCategoryLabel,
} from '@/services/announcement.service';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

export function EmployeeAnnouncementsPage() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [statistics, setStatistics] = useState<AnnouncementStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const companyId = user?.employee?.company_id;
      if (!companyId) {
        toast.error('Company ID tidak ditemukan');
        setIsLoading(false);
        return;
      }

      const [announcementsData, stats] = await Promise.all([
        announcementService.getPublished(companyId),
        announcementService.getStatistics(companyId),
      ]);
      setAnnouncements(announcementsData);
      setStatistics(stats);
    } catch (error: any) {
      console.error('Failed to fetch announcements:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memuat pengumuman');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'general':
        return { label: 'General', color: 'bg-gray-100 text-gray-700', icon: Info };
      case 'policy':
        return { label: 'Policy', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'event':
        return { label: 'Event', color: 'bg-purple-100 text-purple-700', icon: Calendar };
      case 'urgent':
        return { label: 'Urgent', color: 'bg-red-100 text-red-700', icon: AlertCircle };
      case 'hr':
        return { label: 'HR Notice', color: 'bg-green-100 text-green-700', icon: Users };
      default:
        return { label: category, color: 'bg-gray-100 text-gray-700', icon: Info };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Urgent', color: 'text-red-600 bg-red-50 border-red-200' };
      case 'high':
        return { label: 'High', color: 'text-orange-600 bg-orange-50 border-orange-200' };
      case 'normal':
        return { label: 'Normal', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'low':
        return { label: 'Low', color: 'text-gray-600 bg-gray-50 border-gray-200' };
      default:
        return { label: priority, color: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const filteredAnnouncements = announcements
    .filter(announcement => {
      const matchesSearch = announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || announcement.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Pinned first, then by date
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
    });

  // Pagination
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewAnnouncement = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    // Track view
    try {
      await announcementService.trackView(announcement.id);
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateLong = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
          <p className="text-gray-500">Memuat pengumuman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Compact */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-xl p-4 text-white">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Announcements</h1>
              <p className="text-orange-100 text-xs">Latest company news</p>
            </div>
          </div>

          {/* Stats - Inline */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <Bell className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{statistics?.total || announcements.length}</span>
              <span className="text-xs text-orange-100">Total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{statistics?.published || announcements.length}</span>
              <span className="text-xs text-orange-100 hidden sm:inline">Published</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <Pin className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{statistics?.pinned || announcements.filter(a => a.is_pinned).length}</span>
              <span className="text-xs text-orange-100 hidden sm:inline">Pinned</span>
            </div>
            {(statistics?.urgent || announcements.filter(a => a.priority === 'urgent').length) > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/30 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-sm font-bold">{statistics?.urgent || announcements.filter(a => a.priority === 'urgent').length}</span>
                <span className="text-xs text-orange-100 hidden sm:inline">Urgent</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Announcements Alert */}
      {announcements.filter(a => a.priority === 'urgent').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              There are {announcements.filter(a => a.priority === 'urgent').length} urgent announcement(s)
            </p>
            <p className="text-sm text-red-700 mt-1">
              Please review them immediately.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Category Filter & Count */}
          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 md:flex-initial px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
            >
              <option value="all">All Categories</option>
              {ANNOUNCEMENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{getAnnouncementCategoryLabel(cat)}</option>
              ))}
            </select>

            <span className="text-xs text-gray-500">
              {filteredAnnouncements.length} items
            </span>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {paginatedAnnouncements.length > 0 ? (
          paginatedAnnouncements.map(announcement => {
            const categoryConfig = getCategoryConfig(announcement.category);
            const priorityConfig = getPriorityConfig(announcement.priority);
            const CategoryIcon = categoryConfig.icon;

            return (
              <div
                key={announcement.id}
                onClick={() => handleViewAnnouncement(announcement)}
                className={cn(
                  'bg-white rounded-xl border p-3 md:p-4 cursor-pointer transition-all hover:shadow-lg',
                  announcement.is_pinned ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200',
                  announcement.priority === 'urgent' && 'ring-2 ring-red-500/20'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0', categoryConfig.color)}>
                    <CategoryIcon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {announcement.is_pinned && (
                            <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-1">{announcement.title}</h3>
                        </div>
                        <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                      </div>

                      <span className={cn('px-2 py-0.5 rounded-lg text-xs font-medium border flex-shrink-0', priorityConfig.color)}>
                        {priorityConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 mt-2 md:mt-3 text-xs text-gray-500 flex-wrap">
                      <span className={cn('px-2 py-0.5 rounded-full', categoryConfig.color)}>
                        {categoryConfig.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(announcement.published_at || announcement.created_at)}
                      </span>
                      {announcement.views_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {announcement.views_count}
                        </span>
                      )}
                      {announcement.creator && (
                        <span className="text-gray-400 hidden sm:inline">by {announcement.creator.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Megaphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No announcements found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)} of {filteredAnnouncements.length} announcements
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'px-3 py-1 text-sm font-medium rounded-lg transition-colors',
                  page === currentPage
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setSelectedAnnouncement(null)} />
          <div className="fixed inset-0 md:inset-auto md:top-[5%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getCategoryConfig(selectedAnnouncement.category).color)}>
                  {(() => {
                    const CategoryIcon = getCategoryConfig(selectedAnnouncement.category).icon;
                    return <CategoryIcon className="h-5 w-5" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {selectedAnnouncement.is_pinned && <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{selectedAnnouncement.title}</h3>
                  </div>
                  {selectedAnnouncement.creator && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedAnnouncement.creator.name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getCategoryConfig(selectedAnnouncement.category).color)}>
                  {getCategoryConfig(selectedAnnouncement.category).label}
                </span>
                <span className={cn('px-2 py-1 rounded-lg text-xs font-medium border', getPriorityConfig(selectedAnnouncement.priority).color)}>
                  {getPriorityConfig(selectedAnnouncement.priority).label}
                </span>
                {selectedAnnouncement.views_count > 0 && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {selectedAnnouncement.views_count}
                  </span>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">{selectedAnnouncement.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Published</p>
                  <p className="text-xs text-gray-700 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {formatDateLong(selectedAnnouncement.published_at || selectedAnnouncement.created_at)}
                  </p>
                </div>
                {selectedAnnouncement.expires_at && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Expires</p>
                    <p className={cn(
                      'text-xs flex items-center gap-1',
                      new Date(selectedAnnouncement.expires_at) < new Date() ? 'text-red-600' : 'text-gray-700'
                    )}>
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {formatDateLong(selectedAnnouncement.expires_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
