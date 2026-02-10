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
  Users,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  templateService,
  getCategoryLabel,
  formatFileSize,
  TEMPLATE_CATEGORIES,
} from '@/services/template.service';
import type { Template, TemplateCategory, TemplateFileType } from '@/services/template.service';
import toast from 'react-hot-toast';

export function TeamTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
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
      const templatesResponse = await templateService.getAll({ is_active: true, limit: 100 });
      setTemplates(templatesResponse.data);
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memuat template');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats from templates data
  const stats = {
    total: templates.length,
    forms: templates.filter((t) => t.category === 'form').length,
    policies: templates.filter((t) => t.category === 'policy').length,
    contracts: templates.filter((t) => t.category === 'contract').length,
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...TEMPLATE_CATEGORIES.map((cat) => ({ value: cat, label: getCategoryLabel(cat as TemplateCategory) })),
  ];

  const getFileIcon = (type: TemplateFileType) => {
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

  const getCategoryConfig = (category: TemplateCategory | string) => {
    const configs: Record<string, { label: string; color: string }> = {
      contract: { label: 'Contract', color: 'bg-blue-100 text-blue-700' },
      letter: { label: 'Letter', color: 'bg-purple-100 text-purple-700' },
      policy: { label: 'Policy', color: 'bg-amber-100 text-amber-700' },
      form: { label: 'Form', color: 'bg-green-100 text-green-700' },
      report: { label: 'Report', color: 'bg-cyan-100 text-cyan-700' },
      sop: { label: 'SOP', color: 'bg-indigo-100 text-indigo-700' },
      guideline: { label: 'Guideline', color: 'bg-teal-100 text-teal-700' },
      manual: { label: 'Manual', color: 'bg-rose-100 text-rose-700' },
      memo: { label: 'Memo', color: 'bg-orange-100 text-orange-700' },
      circular: { label: 'Circular', color: 'bg-pink-100 text-pink-700' },
      checklist: { label: 'Checklist', color: 'bg-lime-100 text-lime-700' },
      announcement: { label: 'Announcement', color: 'bg-sky-100 text-sky-700' },
      onboarding: { label: 'Onboarding', color: 'bg-emerald-100 text-emerald-700' },
      offboarding: { label: 'Offboarding', color: 'bg-red-100 text-red-700' },
      evaluation: { label: 'Evaluation', color: 'bg-violet-100 text-violet-700' },
      training: { label: 'Training', color: 'bg-fuchsia-100 text-fuchsia-700' },
      other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
    };
    return configs[category] || configs.other;
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const templatesByCategory = categories
    .slice(1)
    .map((cat) => ({
      category: cat.value,
      label: cat.label,
      templates: filteredTemplates.filter((t) => t.category === cat.value),
    }))
    .filter((group) => group.templates.length > 0);

  const handleDownload = async (template: Template) => {
    setIsDownloading(true);
    try {
      // Track download
      await templateService.trackDownload(template.id);

      // Open download URL
      const baseUrl = import.meta.env.VITE_API_URL || '';
      window.open(`${baseUrl}/uploads/${template.file_path}`, '_blank');

      toast.success('Download started');
    } catch (error: any) {
      console.error('Failed to download template:', error);
      toast.error('Gagal mengunduh template');
    } finally {
      setIsDownloading(false);
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
          <p className="text-gray-500">Memuat template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="templates-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#templates-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <FileStack className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Company Templates</h1>
                <p className="text-emerald-100 text-sm">Download templates for forms, reports, and documents</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-emerald-100 text-xs">Total</span>
                <p className="text-xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-emerald-100 text-xs">Forms</span>
                <p className="text-xl font-bold text-white">{stats.forms}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-emerald-100 text-xs">Policies</span>
                <p className="text-xl font-bold text-white">{stats.policies}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-emerald-100 text-xs">Contracts</span>
                <p className="text-xl font-bold text-white">{stats.contracts}</p>
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
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filterCategory === 'all' ? (
        // Grouped by category
        templatesByCategory.length > 0 ? (
          templatesByCategory.map((group) => (
            <div key={group.category} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span
                  className={cn(
                    'w-3 h-3 rounded-full',
                    getCategoryConfig(group.category as TemplateCategory)
                      .color.replace('text-', 'bg-')
                      .split(' ')[0]
                  )}
                />
                {group.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.templates.map((template) => {
                  const fileConfig = getFileIcon(template.file_type);
                  const FileIcon = fileConfig.icon;

                  return (
                    <div
                      key={template.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-emerald-200 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', fileConfig.color)}>
                          <FileIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description || '-'}</p>
                          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                            <span className="uppercase font-medium">{template.file_type}</span>
                            <span>•</span>
                            <span>{formatFileSize(template.file_size)}</span>
                            {template.download_count && template.download_count > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Download className="w-3 h-3" />
                                  {template.download_count}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Updated {formatDate(template.updated_at || template.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedTemplate(template)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(template)}
                            disabled={isDownloading}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileStack className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No templates found</p>
          </div>
        )
      ) : // Flat list for filtered category
      filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const fileConfig = getFileIcon(template.file_type);
            const FileIcon = fileConfig.icon;

            return (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', fileConfig.color)}>
                    <FileIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description || '-'}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      <span className="uppercase font-medium">{template.file_type}</span>
                      <span>•</span>
                      <span>{formatFileSize(template.file_size)}</span>
                      {template.download_count && template.download_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {template.download_count}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Updated {formatDate(template.updated_at || template.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedTemplate(template)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(template)}
                      disabled={isDownloading}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
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
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileStack className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No templates found</p>
        </div>
      )}

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setSelectedTemplate(null)} />
          <div className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center',
                      getFileIcon(selectedTemplate.file_type).color
                    )}
                  >
                    {(() => {
                      const FileIcon = getFileIcon(selectedTemplate.file_type).icon;
                      return <FileIcon className="h-7 w-7" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedTemplate.file_type.toUpperCase()} • {formatFileSize(selectedTemplate.file_size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedTemplate.description && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm text-gray-700">{selectedTemplate.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        getCategoryConfig(selectedTemplate.category).color
                      )}
                    >
                      {getCategoryConfig(selectedTemplate.category).label}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Version</p>
                    <p className="text-sm text-gray-700">{selectedTemplate.version || '1.0'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedTemplate.updated_at || selectedTemplate.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Downloads</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Download className="w-4 h-4 text-gray-400" />
                      {selectedTemplate.download_count || 0}
                    </p>
                  </div>
                </div>

                {selectedTemplate.creator && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Uploaded By</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      {selectedTemplate.creator.name}
                    </p>
                  </div>
                )}

                {selectedTemplate.company && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company</p>
                    <p className="text-sm text-gray-700">{selectedTemplate.company.name}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => handleDownload(selectedTemplate)}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  Download Template
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
