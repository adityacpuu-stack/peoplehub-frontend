import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  FileSignature,
  File,
  FileSpreadsheet,
  Upload,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Trash2,
  Shield,
  FileImage,
  FileArchive,
  Building2,
  FolderUp,
} from 'lucide-react';
import { documentService, EMPLOYEE_DOCUMENT_TYPES } from '@/services/document.service';
import type { EmployeeDocument } from '@/services/document.service';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

type TabType = 'from-hr' | 'my-uploads';

export function ManagerDocumentsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('from-hr');
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    document_name: '',
    document_type: 'other',
    document_number: '',
    description: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await documentService.getMyDocuments();
      setDocuments(data);
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memuat dokumen');
    } finally {
      setIsLoading(false);
    }
  };

  // Separate documents by who uploaded them
  const hrDocuments = documents.filter((doc) => doc.uploaded_by !== user?.employee?.id);
  const myUploadedDocuments = documents.filter((doc) => doc.uploaded_by === user?.employee?.id);

  // Get current tab documents
  const currentDocuments = activeTab === 'from-hr' ? hrDocuments : myUploadedDocuments;

  const filteredDocuments = currentDocuments.filter((doc) => {
    const matchSearch =
      doc.document_name.toLowerCase().includes(search.toLowerCase()) ||
      doc.document_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || doc.document_type === filterType;
    return matchSearch && matchType;
  });

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return <FileSignature className="w-5 h-5 text-blue-500" />;
      case 'certificate':
      case 'ijazah':
        return <File className="w-5 h-5 text-amber-500" />;
      case 'ktp':
      case 'npwp':
      case 'family_card':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'photo':
        return <FileImage className="w-5 h-5 text-pink-500" />;
      case 'cv':
        return <FileSpreadsheet className="w-5 h-5 text-purple-500" />;
      case 'bpjs_tk':
      case 'bpjs_kes':
        return <Shield className="w-5 h-5 text-cyan-500" />;
      default:
        return <FileArchive className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'contract':
        return 'bg-blue-100 text-blue-700';
      case 'certificate':
      case 'ijazah':
        return 'bg-amber-100 text-amber-700';
      case 'ktp':
      case 'npwp':
      case 'family_card':
        return 'bg-green-100 text-green-700';
      case 'photo':
        return 'bg-pink-100 text-pink-700';
      case 'cv':
        return 'bg-purple-100 text-purple-700';
      case 'bpjs_tk':
      case 'bpjs_kes':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    const found = EMPLOYEE_DOCUMENT_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stats = {
    fromHR: hrDocuments.length,
    fromHRVerified: hrDocuments.filter((d) => d.is_verified).length,
    myUploads: myUploadedDocuments.length,
    myUploadsVerified: myUploadedDocuments.filter((d) => d.is_verified).length,
    expiringSoon: documents.filter((d) => {
      if (!d.expiry_date) return false;
      const expiry = new Date(d.expiry_date);
      const now = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return expiry > now && expiry <= thirtyDays;
    }).length,
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      setUploadForm((prev) => ({ ...prev, file }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file) {
      toast.error('Pilih file untuk diupload');
      return;
    }

    if (!uploadForm.document_name.trim()) {
      toast.error('Nama dokumen harus diisi');
      return;
    }

    setIsUploading(true);
    try {
      // Upload file first
      const uploadResult = await documentService.uploadFile(uploadForm.file, 'documents');

      // Create document record
      await documentService.createEmployeeDocument({
        employee_id: user?.employee?.id || 0,
        document_name: uploadForm.document_name,
        document_type: uploadForm.document_type,
        document_number: uploadForm.document_number || undefined,
        description: uploadForm.description || undefined,
        issue_date: uploadForm.issue_date || undefined,
        expiry_date: uploadForm.expiry_date || undefined,
        issuing_authority: uploadForm.issuing_authority || undefined,
        file_path: uploadResult.file_path,
        file_name: uploadResult.file_name,
        file_size: uploadResult.file_size,
        mime_type: uploadResult.mime_type,
      });

      toast.success('Dokumen berhasil diupload');
      setShowUploadModal(false);
      resetUploadForm();
      fetchDocuments();
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal mengupload dokumen');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      document_name: '',
      document_type: 'other',
      document_number: '',
      description: '',
      issue_date: '',
      expiry_date: '',
      issuing_authority: '',
      file: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewDetail = (doc: EmployeeDocument) => {
    setSelectedDocument(doc);
    setShowDetailModal(true);
  };

  const handleDownload = (doc: EmployeeDocument) => {
    if (doc.file_path) {
      window.open(`${import.meta.env.VITE_API_URL || ''}/uploads/${doc.file_path}`, '_blank');
    }
  };

  const handleDelete = async (doc: EmployeeDocument) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokumen "${doc.document_name}"?`)) {
      return;
    }

    try {
      await documentService.deleteEmployeeDocument(doc.id);
      toast.success('Dokumen berhasil dihapus');
      setShowDetailModal(false);
      fetchDocuments();
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menghapus dokumen');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500">Memuat dokumen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="docs-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#docs-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">My Documents</h1>
                <p className="text-indigo-100 text-sm">View and manage your personal documents</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 backdrop-blur-xl rounded-lg text-sm text-blue-100 font-medium border border-blue-500/20">
                <Building2 className="h-4 w-4" />
                {stats.fromHR} From HR
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 backdrop-blur-xl rounded-lg text-sm text-purple-100 font-medium border border-purple-500/20">
                <FolderUp className="h-4 w-4" />
                {stats.myUploads} Uploads
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 backdrop-blur-xl rounded-lg text-sm text-green-100 font-medium border border-green-500/20">
                <CheckCircle className="h-4 w-4" />
                {stats.fromHRVerified + stats.myUploadsVerified} Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-100">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('from-hr')}
              className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'from-hr'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Building2 className="w-5 h-5" />
                <span>From HR</span>
                {stats.fromHR > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'from-hr' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stats.fromHR}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('my-uploads')}
              className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'my-uploads'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FolderUp className="w-5 h-5" />
                <span>My Uploads</span>
                {stats.myUploads > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'my-uploads' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stats.myUploads}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload button only for My Uploads tab */}
              {activeTab === 'my-uploads' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              )}

              <span className="text-sm text-gray-500">{filteredDocuments.length} documents</span>
            </div>
          </div>

          {/* Documents List */}
          <div className="divide-y divide-gray-100">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'from-hr' ? (
                    <Building2 className="w-8 h-8 text-gray-400" />
                  ) : (
                    <FolderUp className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'from-hr' ? 'No documents from HR' : 'No uploaded documents'}
                </h3>
                <p className="mt-1 text-gray-500">
                  {activeTab === 'from-hr'
                    ? 'HR has not uploaded any documents for you yet'
                    : 'Upload your first document to get started'}
                </p>
                {activeTab === 'my-uploads' && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Document
                  </button>
                )}
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleViewDetail(doc)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        {getDocumentIcon(doc.document_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{doc.document_name}</p>
                          {doc.is_verified ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(doc.document_type)}`}>
                            {getTypeLabel(doc.document_type)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(doc.created_at)}
                          </span>
                          <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
                          {doc.expiry_date && (
                            <span
                              className={`text-xs ${
                                new Date(doc.expiry_date) < new Date() ? 'text-red-500' : 'text-gray-500'
                              }`}
                            >
                              Expires: {formatDate(doc.expiry_date)}
                            </span>
                          )}
                        </div>
                        {activeTab === 'from-hr' && doc.uploader && (
                          <p className="text-xs text-gray-400 mt-1">
                            Uploaded by: {doc.uploader.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewDetail(doc)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowUploadModal(false)} />
          <div className="fixed inset-x-4 top-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      uploadForm.file ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {uploadForm.file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{uploadForm.file.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadForm((prev) => ({ ...prev, file: null }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to select file or drag and drop</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, JPG, PNG (max 10MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </div>

                {/* Document Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Name *</label>
                  <input
                    type="text"
                    value={uploadForm.document_name}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, document_name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. KTP, NPWP, Ijazah S1"
                    required
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
                  <select
                    value={uploadForm.document_type}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, document_type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Number</label>
                  <input
                    type="text"
                    value={uploadForm.document_number}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, document_number: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. 3174xxxxxxxxx"
                  />
                </div>

                {/* Issue & Expiry Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                    <input
                      type="date"
                      value={uploadForm.issue_date}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <input
                      type="date"
                      value={uploadForm.expiry_date}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Issuing Authority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issuing Authority</label>
                  <input
                    type="text"
                    value={uploadForm.issuing_authority}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, issuing_authority: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Dukcapil Jakarta Selatan"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-sm text-indigo-800">
                    <strong>Note:</strong> Documents will be reviewed by HR before being marked as verified.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadForm.file}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDocument && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowDetailModal(false)} />
          <div className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                    {getDocumentIcon(selectedDocument.document_type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedDocument.document_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(selectedDocument.document_type)}`}>
                        {getTypeLabel(selectedDocument.document_type)}
                      </span>
                      {selectedDocument.is_verified ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedDocument.document_number && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Document Number</p>
                    <p className="font-medium text-gray-900">{selectedDocument.document_number}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">File Size</p>
                    <p className="font-medium text-gray-900">{formatFileSize(selectedDocument.file_size)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Uploaded</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedDocument.created_at)}</p>
                  </div>
                </div>

                {selectedDocument.uploader && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Uploaded By</p>
                    <p className="font-medium text-gray-900">{selectedDocument.uploader.name}</p>
                  </div>
                )}

                {(selectedDocument.issue_date || selectedDocument.expiry_date) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDocument.issue_date && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Issue Date</p>
                        <p className="font-medium text-gray-900">{formatDate(selectedDocument.issue_date)}</p>
                      </div>
                    )}
                    {selectedDocument.expiry_date && (
                      <div className={`rounded-xl p-4 ${new Date(selectedDocument.expiry_date) < new Date() ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <p className={`text-xs uppercase tracking-wider mb-1 ${new Date(selectedDocument.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>
                          Expiry Date
                        </p>
                        <p className={`font-medium ${new Date(selectedDocument.expiry_date) < new Date() ? 'text-red-700' : 'text-gray-900'}`}>
                          {formatDate(selectedDocument.expiry_date)}
                          {new Date(selectedDocument.expiry_date) < new Date() && ' (Expired)'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedDocument.issuing_authority && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Issuing Authority</p>
                    <p className="font-medium text-gray-900">{selectedDocument.issuing_authority}</p>
                  </div>
                )}

                {selectedDocument.description && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-gray-700">{selectedDocument.description}</p>
                  </div>
                )}

                {selectedDocument.is_verified && selectedDocument.verifier && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm text-green-800">
                      Verified by <strong>{selectedDocument.verifier.name}</strong>
                      {selectedDocument.verified_at && ` on ${formatDate(selectedDocument.verified_at)}`}
                    </p>
                    {selectedDocument.verification_notes && (
                      <p className="text-sm text-green-700 mt-1">{selectedDocument.verification_notes}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {/* Only show delete for my uploads and unverified docs */}
                {activeTab === 'my-uploads' && !selectedDocument.is_verified && (
                  <button
                    onClick={() => handleDelete(selectedDocument)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
