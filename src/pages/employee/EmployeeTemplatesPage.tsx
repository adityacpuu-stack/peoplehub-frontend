import { useState, useEffect } from 'react';
import {
  FileStack,
  Search,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Calendar,
  FolderOpen,
  X,
  Loader2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  templateService,
  TEMPLATE_CATEGORIES,
  type Template,
  type TemplateCategory,
  type TemplateStatistics,
  getCategoryLabel,
  formatFileSize,
} from '@/services/template.service';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

export function EmployeeTemplatesPage() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [statistics, setStatistics] = useState<TemplateStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all active templates (no company filter for employees)
      const [templatesRes, stats] = await Promise.all([
        templateService.getAll({ is_active: true }),
        templateService.getStatistics(),
      ]);
      setTemplates(templatesRes.data);
      setStatistics(stats);
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memuat templates');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...TEMPLATE_CATEGORIES.map(cat => ({ value: cat, label: getCategoryLabel(cat) })),
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return { icon: FileText, color: 'text-red-500 bg-red-50' };
      case 'docx':
        return { icon: File, color: 'text-blue-500 bg-blue-50' };
      case 'xlsx':
        return { icon: FileSpreadsheet, color: 'text-green-500 bg-green-50' };
      case 'pptx':
        return { icon: Presentation, color: 'text-orange-500 bg-orange-50' };
      default:
        return { icon: FileText, color: 'text-gray-500 bg-gray-50' };
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'form':
        return { label: 'Form', color: 'bg-blue-100 text-blue-700' };
      case 'report':
        return { label: 'Report', color: 'bg-purple-100 text-purple-700' };
      case 'letter':
        return { label: 'Letter', color: 'bg-amber-100 text-amber-700' };
      case 'policy':
        return { label: 'Policy', color: 'bg-green-100 text-green-700' };
      case 'contract':
        return { label: 'Contract', color: 'bg-indigo-100 text-indigo-700' };
      default:
        return { label: 'Other', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const templatesByCategory = categories.slice(1).map(cat => ({
    category: cat.value,
    label: cat.label,
    templates: filteredTemplates.filter(t => t.category === cat.value),
  })).filter(group => group.templates.length > 0);

  const handleDownload = async (template: Template) => {
    if (!template.file_path) {
      toast.error('File tidak tersedia');
      return;
    }

    setIsDownloading(true);
    try {
      // Track download
      await templateService.trackDownload(template.id);

      // Download file
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/uploads/${template.file_path}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = template.file_name || template.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Template berhasil diunduh');
    } catch (error) {
      console.error('Failed to download:', error);
      toast.error('Gagal mengunduh template');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = (template: Template) => {
    if (template.file_path) {
      window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/uploads/${template.file_path}`, '_blank');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Memuat templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Compact */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl p-4 text-white">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <FileStack className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Templates</h1>
              <p className="text-emerald-100 text-xs">Download forms & documents</p>
            </div>
          </div>

          {/* Stats - Inline */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <FileStack className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{statistics?.total || templates.length}</span>
              <span className="text-xs text-emerald-100">Total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">
                {statistics?.by_category.find(c => c.category === 'form')?.count || templates.filter(t => t.category === 'form').length}
              </span>
              <span className="text-xs text-emerald-100 hidden sm:inline">Forms</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <File className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">
                {statistics?.by_category.find(c => c.category === 'policy')?.count || templates.filter(t => t.category === 'policy').length}
              </span>
              <span className="text-xs text-emerald-100 hidden sm:inline">Policies</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">
                {statistics?.by_category.find(c => c.category === 'report')?.count || templates.filter(t => t.category === 'report').length}
              </span>
              <span className="text-xs text-emerald-100 hidden sm:inline">Reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Category Filter & Count */}
          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 md:flex-initial px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              {filteredTemplates.length} items
            </span>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filterCategory === 'all' ? (
        // Grouped by category
        templatesByCategory.length > 0 ? (
          templatesByCategory.map(group => (
            <div key={group.category} className="space-y-3">
              <h2 className="text-sm md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', getCategoryConfig(group.category).color.replace('text-', 'bg-').split(' ')[0])} />
                {group.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.templates.map(template => {
                  const fileConfig = getFileIcon(template.file_type);
                  const FileIcon = fileConfig.icon;

                  return (
                    <div
                      key={template.id}
                      className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 hover:shadow-lg hover:border-emerald-200 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0', fileConfig.color)}>
                          <FileIcon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm md:text-base truncate group-hover:text-emerald-600 transition-colors">
                            {template.name}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-500 mt-0.5 line-clamp-2">{template.description || 'No description'}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span className="uppercase font-medium">{template.file_type}</span>
                            <span>•</span>
                            <span>{formatFileSize(template.file_size)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span className="hidden sm:inline">Updated</span> {formatDate(template.updated_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedTemplate(template)}
                            className="p-1.5 md:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(template)}
                            disabled={isDownloading}
                            className="p-1.5 md:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileStack className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No templates available</p>
          </div>
        )
      ) : (
        // Flat list for filtered category
        filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map(template => {
              const fileConfig = getFileIcon(template.file_type);
              const FileIcon = fileConfig.icon;

              return (
                <div
                  key={template.id}
                  className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 hover:shadow-lg hover:border-emerald-200 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0', fileConfig.color)}>
                      <FileIcon className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm md:text-base truncate group-hover:text-emerald-600 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 mt-0.5 line-clamp-2">{template.description || 'No description'}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span className="uppercase font-medium">{template.file_type}</span>
                        <span>•</span>
                        <span>{formatFileSize(template.file_size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span className="hidden sm:inline">Updated</span> {formatDate(template.updated_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedTemplate(template)}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(template)}
                        disabled={isDownloading}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileStack className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No templates found</p>
          </div>
        )
      )}

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setSelectedTemplate(null)} />
          <div className="fixed inset-0 md:inset-auto md:top-[5%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getFileIcon(selectedTemplate.file_type).color)}>
                  {(() => {
                    const FileIcon = getFileIcon(selectedTemplate.file_type).icon;
                    return <FileIcon className="h-5 w-5" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{selectedTemplate.name}</h3>
                  <p className="text-xs text-gray-500">{selectedTemplate.file_type.toUpperCase()} • {formatFileSize(selectedTemplate.file_size)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedTemplate.description && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-gray-700">{selectedTemplate.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getCategoryConfig(selectedTemplate.category).color)}>
                    {getCategoryConfig(selectedTemplate.category).label}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Updated</p>
                  <p className="text-xs text-gray-700">
                    {formatDate(selectedTemplate.updated_at)}
                  </p>
                </div>
              </div>

              {selectedTemplate.creator && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created By</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-emerald-600" />
                    </div>
                    <p className="text-sm text-gray-700">{selectedTemplate.creator.name}</p>
                  </div>
                </div>
              )}

              {selectedTemplate.download_count !== null && selectedTemplate.download_count > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-800 flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    Downloaded <strong>{selectedTemplate.download_count}</strong> times
                  </p>
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => handlePreview(selectedTemplate)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  onClick={() => handleDownload(selectedTemplate)}
                  disabled={isDownloading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
