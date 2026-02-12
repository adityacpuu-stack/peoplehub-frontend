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
  Building2,
  Users,
  Loader2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import {
  announcementService,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementPriority,
  type AnnouncementVisibility,
} from '@/services/announcement.service';

export function TeamAnnouncementsPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const companyId = user?.employee?.company_id || user?.accessibleCompanyIds?.[0];
        const params: {
          page: number;
          limit: number;
          is_published: boolean;
          company_id?: number;
          category?: AnnouncementCategory;
        } = {
          page,
          limit: 10,
          is_published: true,
        };

        if (companyId) {
          params.company_id = companyId;
        }

        if (filterCategory !== 'all') {
          params.category = filterCategory as AnnouncementCategory;
        }

        const response = await announcementService.getAll(params);
        setAnnouncements(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
        toast.error('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user, page, filterCategory]);

  // Track view when opening announcement
  const handleViewAnnouncement = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    try {
      await announcementService.trackView(announcement.id);
    } catch (error) {
      // Silently fail for view tracking
    }
  };

  const getCategoryConfig = (category: AnnouncementCategory) => {
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
        return { label: 'P&C Notice', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      default:
        return { label: category, color: 'bg-gray-100 text-gray-700', icon: Info };
    }
  };

  const getPriorityConfig = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return { label: priority === 'urgent' ? 'Urgent' : 'High', color: 'text-red-600 bg-red-50 border-red-200' };
      case 'normal':
        return { label: 'Normal', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'low':
        return { label: 'Low', color: 'text-gray-600 bg-gray-50 border-gray-200' };
      default:
        return { label: priority, color: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const getVisibilityConfig = (visibility: AnnouncementVisibility) => {
    switch (visibility) {
      case 'all':
        return { label: 'All Employees', icon: Users };
      case 'department':
        return { label: 'Department', icon: Building2 };
      case 'role':
        return { label: 'Specific Role', icon: Users };
      default:
        return { label: visibility, icon: Users };
    }
  };

  // Filter by search query (category filtering done via API)
  const filteredAnnouncements = announcements
    .filter((announcement) => {
      const matchesSearch =
        announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      // Pinned first, then by date
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
    });

  // Calculate stats from loaded data
  const stats = {
    total: total,
    pinned: announcements.filter((a) => a.is_pinned).length,
    urgent: announcements.filter((a) => a.priority === 'urgent' || a.priority === 'high').length,
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="announcements-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#announcements-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <Megaphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Company Announcements</h1>
                <p className="text-orange-100 text-sm">Stay updated with the latest company news</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-orange-100 text-xs">Total</span>
                <p className="text-xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-orange-100 text-xs">Pinned</span>
                <p className="text-xl font-bold text-white">{stats.pinned}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-orange-100 text-xs">High Priority</span>
                <p className="text-xl font-bold text-white">{stats.urgent}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="policy">Policy</option>
            <option value="event">Event</option>
            <option value="hr">P&C Notice</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => {
            const categoryConfig = getCategoryConfig(announcement.category);
            const priorityConfig = getPriorityConfig(announcement.priority);
            const visibilityConfig = getVisibilityConfig(announcement.visibility);
            const CategoryIcon = categoryConfig.icon;
            const VisibilityIcon = visibilityConfig.icon;

            return (
              <div
                key={announcement.id}
                onClick={() => handleViewAnnouncement(announcement)}
                className={cn(
                  'bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-lg',
                  announcement.is_pinned ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      categoryConfig.color
                    )}
                  >
                    <CategoryIcon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {announcement.is_pinned && <Pin className="h-4 w-4 text-orange-500" />}
                          <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={cn('px-2 py-1 rounded-lg text-xs font-medium border', priorityConfig.color)}>
                          {priorityConfig.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                      <span className={cn('px-2 py-1 rounded-full', categoryConfig.color)}>{categoryConfig.label}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(announcement.published_at || announcement.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <VisibilityIcon className="h-3.5 w-3.5" />
                        {visibilityConfig.label}
                      </span>
                      {announcement.views_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {announcement.views_count} views
                        </span>
                      )}
                      {announcement.creator && <span className="text-gray-400">by {announcement.creator.name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredAnnouncements.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No announcements found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages} ({total} announcements)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 bg-orange-600 text-white text-sm font-medium rounded-lg">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
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
          <div className="fixed inset-x-4 top-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center',
                      getCategoryConfig(selectedAnnouncement.category).color
                    )}
                  >
                    {(() => {
                      const CategoryIcon = getCategoryConfig(selectedAnnouncement.category).icon;
                      return <CategoryIcon className="h-7 w-7" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedAnnouncement.is_pinned && <Pin className="h-4 w-4 text-orange-500" />}
                      <h3 className="text-lg font-semibold text-gray-900">{selectedAnnouncement.title}</h3>
                    </div>
                    {selectedAnnouncement.creator && (
                      <p className="text-sm text-gray-500 mt-1">by {selectedAnnouncement.creator.name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    getCategoryConfig(selectedAnnouncement.category).color
                  )}
                >
                  {getCategoryConfig(selectedAnnouncement.category).label}
                </span>
                <span
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium border',
                    getPriorityConfig(selectedAnnouncement.priority).color
                  )}
                >
                  {getPriorityConfig(selectedAnnouncement.priority).label} Priority
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1">
                  {(() => {
                    const VisibilityIcon = getVisibilityConfig(selectedAnnouncement.visibility).icon;
                    return <VisibilityIcon className="h-3.5 w-3.5" />;
                  })()}
                  {getVisibilityConfig(selectedAnnouncement.visibility).label}
                </span>
                {selectedAnnouncement.views_count > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {selectedAnnouncement.views_count} views
                  </span>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-gray-700 whitespace-pre-line">{selectedAnnouncement.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Published</p>
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {new Date(selectedAnnouncement.published_at || selectedAnnouncement.created_at).toLocaleDateString(
                      'id-ID',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </p>
                </div>
                {selectedAnnouncement.expires_at && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Expires</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {new Date(selectedAnnouncement.expires_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
