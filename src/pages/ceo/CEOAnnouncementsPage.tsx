import { useState, useEffect } from 'react';
import {
  Megaphone,
  Calendar,
  Users,
  Building2,
  Eye,
  Search,
  Pin,
  CheckCircle,
  AlertCircle,
  Globe,
} from 'lucide-react';
import {
  announcementService,
  type Announcement,
  type AnnouncementStatistics,
  getAnnouncementCategoryLabel,
} from '@/services/announcement.service';
import { PageSpinner } from '@/components/ui';

const categoryColors: Record<string, string> = {
  general: 'bg-indigo-100 text-indigo-700',
  policy: 'bg-blue-100 text-blue-700',
  event: 'bg-purple-100 text-purple-700',
  hr: 'bg-green-100 text-green-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export function CEOAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [statistics, setStatistics] = useState<AnnouncementStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('published');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [announcementsRes, statsRes] = await Promise.all([
        announcementService.getAll({ page: 1, limit: 100, is_published: true }),
        announcementService.getStatistics(),
      ]);
      setAnnouncements(announcementsRes.data);
      setStatistics(statsRes);
    } catch (err: any) {
      console.error('Failed to fetch announcements:', err);
      setError(err.message || 'Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load announcements</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredAnnouncements = announcements
    .filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'published') return a.is_published;
      if (filter === 'pinned') return a.is_pinned;
      return true;
    })
    .filter(
      (a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const pinnedAnnouncements = filteredAnnouncements.filter((a) => a.is_pinned && a.is_published);
  const otherAnnouncements = filteredAnnouncements.filter((a) => !a.is_pinned || !a.is_published);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="announcements-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#announcements-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-rose-400 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Megaphone className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Company Announcements</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">View company-wide communications</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
              <Megaphone className="h-4 w-4" />
              {statistics?.published || 0} Published
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{statistics?.total || 0}</p>
          <p className="text-xs text-gray-500">Total Announcements</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{statistics?.published || 0}</p>
          <p className="text-xs text-gray-500">Published</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <Pin className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{statistics?.pinned || 0}</p>
          <p className="text-xs text-gray-500">Pinned</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
              <Eye className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">
            {announcements.reduce((sum, a) => sum + a.views_count, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Total Views</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['all', 'published', 'pinned'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                filter === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pin className="h-5 w-5 text-indigo-600" />
            Pinned Announcements
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {pinnedAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-sm border border-indigo-200 p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${categoryColors[announcement.category] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {getAnnouncementCategoryLabel(announcement.category)}
                    </span>
                    {announcement.is_global && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                        <Globe className="h-3 w-3" />
                        Global
                      </span>
                    )}
                  </div>
                  <Pin className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{announcement.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{announcement.content}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {announcement.creator?.name || 'P&C Team'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(announcement.published_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    {announcement.views_count} views
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Announcements */}
      <div className="space-y-4">
        {pinnedAnnouncements.length > 0 && otherAnnouncements.length > 0 && (
          <h2 className="text-lg font-bold text-gray-900">Recent Announcements</h2>
        )}
        <div className="space-y-4">
          {otherAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${categoryColors[announcement.category] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {getAnnouncementCategoryLabel(announcement.category)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${priorityColors[announcement.priority] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
                    </span>
                    {announcement.is_global && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                        <Globe className="h-3 w-3" />
                        Global
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{announcement.content}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {announcement.creator?.name || 'P&C Team'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDate(announcement.published_at || announcement.created_at)}
                    </span>
                    {announcement.company && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        {announcement.company.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {announcement.views_count} views
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No announcements found</h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search criteria.'
              : 'No announcements have been published yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
