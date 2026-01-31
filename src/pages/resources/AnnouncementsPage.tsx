import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Pin,
  PinOff,
  Megaphone,
  Building2,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  X,
  Bell,
  Send,
  Globe,
  Lock,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  announcementService,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementPriority,
  type AnnouncementVisibility,
  type AnnouncementStatistics,
  type CreateAnnouncementRequest,
} from '@/services/announcement.service';


const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'policy', label: 'Policy Update' },
  { value: 'event', label: 'Event' },
  { value: 'hr', label: 'HR Notice' },
  { value: 'urgent', label: 'Urgent' },
];

const priorities = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function AnnouncementsPage() {
  const { user } = useAuthStore();
  const companies = user?.companies || [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(companies[0]?.id || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'published' | 'draft'>('all');

  // Data states
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [statistics, setStatistics] = useState<AnnouncementStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    category: AnnouncementCategory;
    priority: AnnouncementPriority;
    visibility: AnnouncementVisibility;
    target_audience: string;
    is_pinned: boolean;
    expires_at: string;
    target_scope: 'single' | 'multiple' | 'global';
    target_company_ids: number[];
  }>({
    title: '',
    content: '',
    category: 'general',
    priority: 'normal',
    visibility: 'all',
    target_audience: '',
    is_pinned: false,
    expires_at: '',
    target_scope: 'single',
    target_company_ids: [],
  });

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const isPublishedFilter = viewMode === 'published' ? true : viewMode === 'draft' ? false : undefined;

      const [announcementsRes, statsRes] = await Promise.all([
        announcementService.getAll({
          company_id: selectedCompanyId,
          search: searchQuery || undefined,
          category: selectedCategory !== 'all' ? selectedCategory as AnnouncementCategory : undefined,
          priority: selectedPriority !== 'all' ? selectedPriority as AnnouncementPriority : undefined,
          is_published: isPublishedFilter,
          limit: 100,
        }),
        announcementService.getStatistics(selectedCompanyId),
      ]);
      setAnnouncements(announcementsRes.data);
      setStatistics(statsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, searchQuery, selectedCategory, selectedPriority, viewMode]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Stats from real data
  const stats = {
    total: statistics?.total || 0,
    published: statistics?.published || 0,
    pinned: statistics?.pinned || 0,
    urgent: statistics?.urgent || 0,
  };

  const getCategoryBadge = (category: Announcement['category']) => {
    const styles = {
      general: 'bg-blue-100 text-blue-700',
      policy: 'bg-purple-100 text-purple-700',
      event: 'bg-green-100 text-green-700',
      hr: 'bg-amber-100 text-amber-700',
      urgent: 'bg-red-100 text-red-700',
    };
    const labels = {
      general: 'General',
      policy: 'Policy',
      event: 'Event',
      hr: 'HR Notice',
      urgent: 'Urgent',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[category]}`}>
        {labels[category]}
      </span>
    );
  };

  const getPriorityBadge = (priority: Announcement['priority']) => {
    const styles = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600 animate-pulse',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getVisibilityIcon = (visibility: Announcement['visibility']) => {
    switch (visibility) {
      case 'all':
        return <Globe className="h-4 w-4 text-green-500" />;
      case 'department':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'role':
        return <Lock className="h-4 w-4 text-amber-500" />;
    }
  };

  const handleView = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailModal(true);
    setActiveDropdown(null);
    // Track view
    try {
      await announcementService.trackView(announcement.id);
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    // Determine target scope from existing data
    let targetScope: 'single' | 'multiple' | 'global' = 'single';
    if (announcement.is_global) {
      targetScope = 'global';
    } else if (announcement.target_company_ids && announcement.target_company_ids.length > 0) {
      targetScope = 'multiple';
    }
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      priority: announcement.priority,
      visibility: announcement.visibility,
      target_audience: announcement.target_audience || '',
      is_pinned: announcement.is_pinned,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : '',
      target_scope: targetScope,
      target_company_ids: announcement.target_company_ids || [],
    });
    setShowModal(true);
    setActiveDropdown(null);
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!confirm(`Are you sure you want to delete "${announcement.title}"?`)) return;

    try {
      await announcementService.delete(announcement.id);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement');
    }
    setActiveDropdown(null);
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      await announcementService.togglePin(announcement.id);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle pin');
    }
    setActiveDropdown(null);
  };

  const handlePublish = async (announcement: Announcement) => {
    try {
      await announcementService.publish(announcement.id);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to publish announcement');
    }
    setActiveDropdown(null);
  };

  const handleUnpublish = async (announcement: Announcement) => {
    try {
      await announcementService.unpublish(announcement.id);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to unpublish announcement');
    }
    setActiveDropdown(null);
  };

  const handleSubmit = async (publish: boolean) => {
    try {
      setSubmitting(true);

      if (selectedAnnouncement) {
        // Update existing announcement
        await announcementService.update(selectedAnnouncement.id, {
          title: formData.title,
          content: formData.content,
          category: formData.category,
          priority: formData.priority,
          visibility: formData.visibility,
          target_audience: formData.visibility !== 'all' ? formData.target_audience : undefined,
          is_pinned: formData.is_pinned,
          expires_at: formData.expires_at || null,
        });

        if (publish && !selectedAnnouncement.is_published) {
          await announcementService.publish(selectedAnnouncement.id);
        }
      } else {
        // Create new announcement
        const createData: CreateAnnouncementRequest = {
          title: formData.title,
          content: formData.content,
          category: formData.category,
          priority: formData.priority,
          visibility: formData.visibility,
          target_audience: formData.visibility !== 'all' ? formData.target_audience : undefined,
          is_pinned: formData.is_pinned,
          is_published: publish,
          expires_at: formData.expires_at || undefined,
        };

        // Set target based on scope
        if (formData.target_scope === 'global') {
          createData.is_global = true;
        } else if (formData.target_scope === 'multiple') {
          createData.target_company_ids = formData.target_company_ids;
        } else {
          createData.company_id = selectedCompanyId;
        }

        await announcementService.create(createData);
      }

      setShowModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      priority: 'normal',
      visibility: 'all',
      target_audience: '',
      is_pinned: false,
      expires_at: '',
      target_scope: 'single',
      target_company_ids: [],
    });
    setSelectedAnnouncement(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header - Compact */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-xl p-4">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Title & Company Selector */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Announcements</h1>
                <p className="text-orange-100 text-xs">Stay updated with latest news</p>
              </div>
            </div>

            {/* Company Selector - Mobile */}
            {companies.length > 1 && (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                className="md:hidden bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id} className="text-gray-900">
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stats - Inline */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <Bell className="h-3.5 w-3.5 text-white" />
              <span className="text-sm font-bold text-white">{stats.total}</span>
              <span className="text-xs text-orange-100">Total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <CheckCircle className="h-3.5 w-3.5 text-white" />
              <span className="text-sm font-bold text-white">{stats.published}</span>
              <span className="text-xs text-orange-100">Published</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <Pin className="h-3.5 w-3.5 text-white" />
              <span className="text-sm font-bold text-white">{stats.pinned}</span>
              <span className="text-xs text-orange-100">Pinned</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <AlertCircle className="h-3.5 w-3.5 text-white" />
              <span className="text-sm font-bold text-white">{stats.urgent}</span>
              <span className="text-xs text-orange-100">Urgent</span>
            </div>

            {/* Company Selector - Desktop */}
            {companies.length > 1 && (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                className="hidden md:block bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none ml-2"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id} className="text-gray-900">
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* View Mode Tabs & Actions Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-shrink-0 overflow-x-auto">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setViewMode('published')}
                className={`px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'published' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setViewMode('draft')}
                className={`px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'draft' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Drafts
              </button>
            </div>

            {/* Filter & Create */}
            <div className="flex items-center gap-2 md:gap-3 sm:ml-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl border transition-all text-sm ${
                  showFilters
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/30 text-sm flex-1 sm:flex-initial justify-center"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>
            </div>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <span className="ml-2 text-gray-600">Loading announcements...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-red-200">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="ml-2 text-red-600">{error}</span>
          <button
            onClick={fetchAnnouncements}
            className="ml-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Announcements List */}
      {!loading && !error && (
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`bg-white rounded-xl border hover:shadow-lg transition-all ${
              announcement.is_pinned ? 'border-orange-300 ring-1 ring-orange-100' : 'border-gray-200'
            } ${announcement.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}`}
          >
            <div className="p-3 md:p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 md:mb-2 flex-wrap">
                    {announcement.is_pinned && (
                      <Pin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-1">{announcement.title}</h3>
                    {!announcement.is_published && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm line-clamp-2">{announcement.content}</p>
                </div>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === announcement.id ? null : announcement.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeDropdown === announcement.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => handleView(announcement)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePin(announcement)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {announcement.is_pinned ? (
                          <>
                            <PinOff className="h-4 w-4" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4" />
                            Pin to Top
                          </>
                        )}
                      </button>
                      {!announcement.is_published && (
                        <button
                          onClick={() => handlePublish(announcement)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                        >
                          <Send className="h-4 w-4" />
                          Publish Now
                        </button>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={() => handleDelete(announcement)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-3 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100">
                {/* Badges - wrap on mobile */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(announcement.category)}
                  {getPriorityBadge(announcement.priority)}
                  {/* Global/Multi-company indicator */}
                  {announcement.is_global ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Globe className="h-3 w-3" />
                      Global
                    </span>
                  ) : announcement.target_company_ids && announcement.target_company_ids.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      <Users className="h-3 w-3" />
                      {announcement.target_company_ids.length} Co.
                    </span>
                  ) : announcement.company ? (
                    <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <Building2 className="h-3 w-3" />
                      {announcement.company.name}
                    </span>
                  ) : null}
                </div>

                {/* Meta Info - wrap on mobile */}
                <div className="flex items-center gap-3 md:gap-4 text-xs text-gray-500 flex-wrap">
                  {announcement.is_published && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {announcement.views_count}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(announcement.published_at || announcement.created_at).toLocaleDateString()}
                  </span>
                  <span className="hidden sm:inline">{announcement.creator?.name || 'System'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Empty State */}
      {!loading && !error && announcements.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No announcements found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Announcement
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 md:inset-auto md:top-[5%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 md:px-6 md:py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter announcement title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Target Scope Selector */}
                {!selectedAnnouncement && companies.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, target_scope: 'single', target_company_ids: [] })}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.target_scope === 'single'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Building2 className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Current Company</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {companies.find(c => c.id === selectedCompanyId)?.name || 'Selected'}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, target_scope: 'multiple', target_company_ids: [] })}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.target_scope === 'multiple'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Users className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Select Companies</span>
                        <p className="text-xs text-gray-500 mt-0.5">Multiple</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, target_scope: 'global', target_company_ids: [] })}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.target_scope === 'global'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Globe className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">All Companies</span>
                        <p className="text-xs text-gray-500 mt-0.5">Global</p>
                      </button>
                    </div>

                    {/* Multi-company selector */}
                    {formData.target_scope === 'multiple' && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <label className="block text-xs font-medium text-gray-600 mb-2">Select target companies:</label>
                        <div className="space-y-2">
                          {companies.map((company) => (
                            <label key={company.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.target_company_ids.includes(company.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      target_company_ids: [...formData.target_company_ids, company.id],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      target_company_ids: formData.target_company_ids.filter((id) => id !== company.id),
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-700">{company.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                  <textarea
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your announcement content..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as AnnouncementCategory })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {categories.filter((c) => c.value !== 'all').map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as AnnouncementPriority })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {priorities.filter((p) => p.value !== 'all').map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as AnnouncementVisibility })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="all">All Employees</option>
                      <option value="department">Specific Department</option>
                      <option value="role">Specific Role</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                    <input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {formData.visibility !== 'all' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target {formData.visibility === 'department' ? 'Department' : 'Role'}
                    </label>
                    <input
                      type="text"
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      placeholder={`Enter ${formData.visibility === 'department' ? 'department' : 'role'} name`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">Pin to top</span>
                  </label>
                </div>
            </div>

            {/* Footer - Fixed Buttons */}
            <div className="p-4 md:px-6 md:py-4 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 border border-gray-200 sm:border-0"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting || !formData.title || !formData.content}
                    className="flex-1 sm:flex-initial px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span className="hidden sm:inline">Save as</span> Draft
                  </button>
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={submitting || !formData.title || !formData.content}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-colors disabled:opacity-50 text-sm"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Send className="h-4 w-4" />
                    Publish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAnnouncement && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowDetailModal(false)} />
          <div className="fixed inset-0 md:inset-auto md:top-[5%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 md:px-6 md:py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                {selectedAnnouncement.is_pinned && <Pin className="h-4 w-4 text-orange-500" />}
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Announcement Details</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {/* Title & Badges */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{selectedAnnouncement.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getCategoryBadge(selectedAnnouncement.category)}
                    {getPriorityBadge(selectedAnnouncement.priority)}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedAnnouncement.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {selectedAnnouncement.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Target Scope</label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedAnnouncement.is_global ? (
                        <>
                          <Globe className="h-4 w-4 text-purple-500" />
                          <span className="text-gray-900">All Companies (Global)</span>
                        </>
                      ) : selectedAnnouncement.target_company_ids && selectedAnnouncement.target_company_ids.length > 0 ? (
                        <>
                          <Users className="h-4 w-4 text-indigo-500" />
                          <span className="text-gray-900">{selectedAnnouncement.target_company_ids.length} Companies</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-900">{selectedAnnouncement.company?.name || 'Single Company'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getVisibilityIcon(selectedAnnouncement.visibility)}
                      <span className="text-gray-900">
                        {selectedAnnouncement.visibility === 'all'
                          ? 'All Employees'
                          : selectedAnnouncement.target_audience}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Views</label>
                    <p className="text-gray-900 mt-1 flex items-center gap-1">
                      <Eye className="h-4 w-4 text-gray-400" />
                      {selectedAnnouncement.views_count}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</label>
                    <p className="text-gray-900 mt-1">{selectedAnnouncement.creator?.name || 'System'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</label>
                    <p className="text-gray-900 mt-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedAnnouncement.published_at && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Published At</label>
                      <p className="text-gray-900 mt-1">{new Date(selectedAnnouncement.published_at).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedAnnouncement.expires_at && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expires At</label>
                      <p className="text-gray-900 mt-1">{new Date(selectedAnnouncement.expires_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
            </div>

            {/* Footer - Fixed Buttons */}
            <div className="p-4 md:px-6 md:py-4 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEdit(selectedAnnouncement);
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
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
