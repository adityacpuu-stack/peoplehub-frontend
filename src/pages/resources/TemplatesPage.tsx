import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Upload,
  Copy,
  Building2,
  FolderOpen,
  Clock,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  templateService,
  type Template,
  type TemplateCategory,
  type TemplateFileType,
  type TemplateStatistics,
  type CreateTemplateRequest,
  formatFileSize,
} from '@/services/template.service';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'contract', label: 'Contracts' },
  { value: 'letter', label: 'Letters' },
  { value: 'policy', label: 'Policies' },
  { value: 'form', label: 'Forms' },
  { value: 'report', label: 'Reports' },
  { value: 'other', label: 'Other' },
];

const fileTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pptx', label: 'PowerPoint (.pptx)' },
  { value: 'other', label: 'Other' },
];

export function TemplatesPage() {
  const { user } = useAuthStore();
  const companies = user?.companies || [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(companies[0]?.id || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  // Data states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [statistics, setStatistics] = useState<TemplateStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: TemplateCategory;
    version: string;
    is_active: boolean;
  }>({
    name: '',
    description: '',
    category: 'contract',
    version: '1.0',
    is_active: true,
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [templatesRes, statsRes] = await Promise.all([
        templateService.getAll({
          company_id: selectedCompanyId,
          search: searchQuery || undefined,
          category: selectedCategory !== 'all' ? selectedCategory as TemplateCategory : undefined,
          file_type: selectedFileType !== 'all' ? selectedFileType as TemplateFileType : undefined,
          limit: 100,
        }),
        templateService.getStatistics(selectedCompanyId),
      ]);
      setTemplates(templatesRes.data);
      setStatistics(statsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, searchQuery, selectedCategory, selectedFileType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Stats from real data
  const stats = {
    total: statistics?.total || 0,
    active: statistics?.active || 0,
    contracts: statistics?.by_category?.find(c => c.category === 'contract')?.count || 0,
    forms: statistics?.by_category?.find(c => c.category === 'form')?.count || 0,
  };

  const getCategoryBadge = (category: Template['category']) => {
    const styles = {
      contract: 'bg-blue-100 text-blue-700',
      letter: 'bg-purple-100 text-purple-700',
      policy: 'bg-amber-100 text-amber-700',
      form: 'bg-green-100 text-green-700',
      report: 'bg-cyan-100 text-cyan-700',
      other: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      contract: 'Contract',
      letter: 'Letter',
      policy: 'Policy',
      form: 'Form',
      report: 'Report',
      other: 'Other',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[category]}`}>
        {labels[category]}
      </span>
    );
  };

  const getFileIcon = (fileType: TemplateFileType) => {
    switch (fileType) {
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'pdf':
        return <File className="h-5 w-5 text-red-500" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'pptx':
        return <FileImage className="h-5 w-5 text-orange-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileTypeFromFile = (file: File): TemplateFileType => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    if (ext === 'pptx' || ext === 'ppt') return 'pptx';
    return 'other';
  };

  const handleView = (template: Template) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
    setActiveDropdown(null);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      version: template.version || '1.0',
      is_active: template.is_active,
    });
    setUploadedFile(null);
    setShowModal(true);
    setActiveDropdown(null);
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      await templateService.delete(template.id);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
    setActiveDropdown(null);
  };

  const handleDownload = async (template: Template) => {
    try {
      // Track download
      await templateService.trackDownload(template.id);
      // Open file in new tab (assuming file_path is a URL)
      window.open(template.file_path, '_blank');
    } catch (err: any) {
      console.error('Download tracking failed:', err);
      // Still open the file even if tracking fails
      window.open(template.file_path, '_blank');
    }
    setActiveDropdown(null);
  };

  const handleDuplicate = async (template: Template) => {
    try {
      setSubmitting(true);
      await templateService.duplicate(template.id);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate template');
    } finally {
      setSubmitting(false);
    }
    setActiveDropdown(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      if (selectedTemplate) {
        // Update existing template
        const updateData: any = {
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category,
          version: formData.version,
          is_active: formData.is_active,
        };

        // If new file uploaded, upload it first
        if (uploadedFile) {
          const fileInfo = await templateService.uploadFile(uploadedFile);
          updateData.file_path = fileInfo.file_path;
          updateData.file_name = fileInfo.file_name;
          updateData.file_size = fileInfo.file_size;
          updateData.mime_type = fileInfo.mime_type;
          updateData.file_type = getFileTypeFromFile(uploadedFile);
        }

        await templateService.update(selectedTemplate.id, updateData);
      } else {
        // Create new template - file is required
        if (!uploadedFile) {
          alert('Please select a file to upload');
          return;
        }

        // Upload file first
        const fileInfo = await templateService.uploadFile(uploadedFile);

        const createData: CreateTemplateRequest = {
          company_id: selectedCompanyId,
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category,
          file_type: getFileTypeFromFile(uploadedFile),
          file_path: fileInfo.file_path,
          file_name: fileInfo.file_name,
          file_size: fileInfo.file_size,
          mime_type: fileInfo.mime_type,
          version: formData.version,
          is_active: formData.is_active,
        };

        await templateService.create(createData);
      }

      setShowModal(false);
      resetForm();
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'contract',
      version: '1.0',
      is_active: true,
    });
    setUploadedFile(null);
    setSelectedTemplate(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-8">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Templates</h1>
                <p className="text-emerald-100 mt-1">Manage document templates for your organization</p>
              </div>
            </div>

            {/* Company Selector */}
            {companies.length > 1 && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-emerald-200" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[200px]"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id} className="text-gray-900">
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-emerald-100">Total Templates</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.active}</p>
                  <p className="text-sm text-emerald-100">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <File className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.contracts}</p>
                  <p className="text-sm text-emerald-100">Contracts</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.forms}</p>
                  <p className="text-sm text-emerald-100">Forms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggles */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                showFilters
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Template</span>
            </button>
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {fileTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
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
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-600">Loading templates...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-red-200">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="ml-2 text-red-600">{error}</span>
          <button
            onClick={fetchTemplates}
            className="ml-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all group"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                    {getFileIcon(template.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.file_type.toUpperCase()} • {formatFileSize(template.file_size)}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === template.id ? null : template.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeDropdown === template.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => handleView(template)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleDownload(template)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => handleDelete(template)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(template.category)}
                  <span className="text-xs text-gray-500">v{template.version}</span>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Meta */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Updated {new Date(template.updated_at).toLocaleDateString()}
                </span>
                <span>{template.creator?.name || 'System'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Empty State */}
      {!loading && !error && templates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Template
          </button>
        </div>
      )}

      {/* Upload/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />

            <div className="relative bg-white rounded-2xl max-w-lg w-full mx-auto shadow-2xl transform transition-all">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedTemplate ? 'Edit Template' : 'Upload Template'}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* File Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.doc,.pdf,.xlsx,.xls,.pptx,.ppt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <>
                      <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatFileSize(uploadedFile.size)}</p>
                    </>
                  ) : selectedTemplate ? (
                    <>
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700">Click to replace file (optional)</p>
                      <p className="text-xs text-gray-500 mt-1">Current: {selectedTemplate.file_name || selectedTemplate.file_path.split('/').pop()}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">DOCX, PDF, XLSX, PPTX up to 10MB</p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter template name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter template description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {categories.filter((c) => c.value !== 'all').map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Active (available for use)
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formData.name}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selectedTemplate ? 'Save Changes' : 'Upload Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl max-w-lg w-full mx-auto shadow-2xl transform transition-all">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Template Details</h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* File Preview */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    {getFileIcon(selectedTemplate.file_type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{selectedTemplate.name}</h4>
                    <p className="text-sm text-gray-500">
                      {selectedTemplate.file_type.toUpperCase()} • {formatFileSize(selectedTemplate.file_size)} • Version {selectedTemplate.version || '1.0'}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                    <p className="text-gray-900 mt-1">{selectedTemplate.description || '-'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
                      <div className="mt-1">{getCategoryBadge(selectedTemplate.category)}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                      <p className="mt-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedTemplate.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</label>
                      <p className="text-gray-900 mt-1">{selectedTemplate.creator?.name || 'System'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</label>
                      <p className="text-gray-900 mt-1">{new Date(selectedTemplate.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</label>
                    <p className="text-gray-900 mt-1">{new Date(selectedTemplate.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => handleDownload(selectedTemplate)}
                  className="flex items-center gap-2 px-4 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedTemplate);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
