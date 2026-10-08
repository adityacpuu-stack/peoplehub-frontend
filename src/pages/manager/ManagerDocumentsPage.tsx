import { isAxiosError } from 'axios';
import { quantity } from '@/components/leave/presentation';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Eye, Search, Filter, Calendar, FileSignature, File, FileSpreadsheet, Upload, Plus, X, CheckCircle, Clock, Loader2, Trash2, Shield, FileImage, FileArchive, Building2, FolderUp } from 'lucide-react';
import { documentService, EMPLOYEE_DOCUMENT_TYPES } from '@/services/document.service';
import type { EmployeeDocument } from '@/services/document.service';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

type TabType = 'from-hr' | 'my-uploads';

export function ManagerDocumentsPage() {
  useLocale();
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
  const [deletingDocument, setDeletingDocument] = useState<EmployeeDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    } catch (error: unknown) {
      console.error('Failed to fetch documents:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t("Gagal memuat dokumen"), { id: 'api-error' });
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
    return found ? t(found.label) : type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KB`;
    return `${(bytes / (1024 * 1024)).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
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
        toast.error(t("Ukuran file maksimal 10MB"));
        return;
      }
      setUploadForm((prev) => ({ ...prev, file }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file) {
      toast.error(t("Pilih file untuk diupload"));
      return;
    }

    if (!uploadForm.document_name.trim()) {
      toast.error(t("Nama dokumen harus diisi"));
      return;
    }

    setIsUploading(true);
    try {
      // Upload file first
      const uploadResult = await documentService.uploadFile(uploadForm.file, 'documents');

      // Create document record
      await documentService.uploadMyDocument({
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

      toast.success(t("Dokumen berhasil diupload"));
      setShowUploadModal(false);
      resetUploadForm();
      fetchDocuments();
    } catch (error: unknown) {
      console.error('Failed to upload document:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t("Gagal mengupload dokumen"), { id: 'api-error' });
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

  const handleDownload = async (doc: EmployeeDocument) => {
    if (!doc.file_path) return;
    try {
      await documentService.downloadFile(doc.file_path, doc.file_name || doc.document_name);
    } catch {
      toast.error(t("Gagal mengunduh dokumen"), { id: 'api-error' });
    }
  };

  const handleDelete = async (doc: EmployeeDocument) => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      await documentService.deleteMyDocument(doc.id);
      toast.success(t("Dokumen berhasil dihapus"));
      setDeletingDocument(null);
      setShowDetailModal(false);
      fetchDocuments();
    } catch (error: unknown) {
      console.error('Failed to delete document:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t("Gagal menghapus dokumen"), { id: 'api-error' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500">{t("Memuat dokumen...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-workflow ops-workflow ops-page">
      {/* Header Banner */}
      <header className="ph-page-header ops-page-heading"><div>
                <h1 className="ops-page-title">{t("My Documents")}</h1>
                <p className="text-gray-500 text-sm">{t("View and manage your personal documents")}</p>
              </div><div className="ph-actions"><div className="flex flex-wrap items-center gap-3">
              <span className="ops-header-count">
                <Building2 className="h-4 w-4" />
                {quantity(stats.fromHR)}{' '}{t("From P&C")} </span>
              <span className="ops-header-count">
                <FolderUp className="h-4 w-4" />
                {quantity(stats.myUploads)}{' '}{t("Uploads")} </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg text-sm text-green-100 font-medium border border-green-500/20">
                <CheckCircle className="h-4 w-4" />
                {stats.fromHRVerified + stats.myUploadsVerified}{' '}{t("Verified")} </span>
            </div></div></header>

      {/* Main Content with Tabs */}
      <div className="ph-section ops-section">
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
                <span>{t("From P&C")}</span>
                {stats.fromHR > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'from-hr' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {quantity(stats.fromHR)}
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
                <span>{t("My Uploads")}</span>
                {stats.myUploads > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'my-uploads' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {quantity(stats.myUploads)}
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
                  placeholder={t("Search documents...")}
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
                  <option value="all">{t("All Types")}</option>
                  {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(type.label)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload button only for My Uploads tab */}
              {activeTab === 'my-uploads' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="ph-button ph-button-primary"
                >
                  <Upload className="w-4 h-4" />{t("Upload")} </button>
              )}

              <span className="text-sm text-gray-500">{filteredDocuments.length}{' '}{t("documents")}</span>
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
                  {activeTab === 'from-hr' ? t("No documents from P&C") : t("No uploaded documents")}
                </h3>
                <p className="mt-1 text-gray-500">
                  {activeTab === 'from-hr'
                    ? t("P&C has not uploaded any documents for you yet")
                    : t("Upload your first document to get started")}
                </p>
                {activeTab === 'my-uploads' && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="ph-button ph-button-primary"
                  >
                    <Plus className="w-4 h-4" />{t("Upload Document")} </button>
                )}
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleViewDetail(doc)}
                >
                  <div className="ops-document-row">
                    <div className="ops-document-identity">
                      <div className="ops-document-type-icon">
                        {getDocumentIcon(doc.document_type)}
                      </div>
                      <div>
                        <div className="ops-document-title">
                          <p className="font-semibold text-gray-900">{doc.document_name}</p>
                          {doc.is_verified ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />{t("Verified")} </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3" />{t("Pending")} </span>
                          )}
                        </div>
                        <div className="ops-document-meta">
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
                            >{t("Expires:")} {formatDate(doc.expiry_date)}
                            </span>
                          )}
                        </div>
                        {activeTab === 'from-hr' && doc.uploader && (
                          <p className="text-xs text-gray-400 mt-1">{t("Uploaded by:")} {doc.uploader.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ops-document-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewDetail(doc)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={t("View")}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={t("Download")}
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
        <Modal isOpen={true} onClose={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }} title={t("Upload Document")} size="xl" busy={isUploading} className="ph-workflow ops-workflow ops-modal">
            <div className="p-6">


              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload */}
                <div>
                  <label htmlFor="ops-managerdocuments-1" className="block text-sm font-medium text-gray-700 mb-2">{t("File")}</label>
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
                          type="button" aria-label={t("Remove selected file")}
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
                        <p className="text-sm text-gray-600">{t("Click to select file")}</p>
                        <p className="text-xs text-gray-400 mt-1">{t("PDF, DOC, XLS, JPG, PNG (max 10MB)")}</p>
                      </>
                    )}
                  </div>
                  <input id="ops-managerdocuments-1"
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </div>

                {/* Document Name */}
                <div>
                  <label htmlFor="ops-managerdocuments-2" className="block text-sm font-medium text-gray-700 mb-2">{t("Document Name *")}</label>
                  <input id="ops-managerdocuments-2"
                    type="text"
                    value={uploadForm.document_name}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, document_name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder={t("e.g. KTP, NPWP, Ijazah S1")}
                    required
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label htmlFor="ops-managerdocuments-3" className="block text-sm font-medium text-gray-700 mb-2">{t("Document Type *")}</label>
                  <select id="ops-managerdocuments-3"
                    value={uploadForm.document_type}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, document_type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {t(type.label)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Number */}
                <div>
                  <label htmlFor="ops-managerdocuments-4" className="block text-sm font-medium text-gray-700 mb-2">{t("Document Number")}</label>
                  <input id="ops-managerdocuments-4"
                    type="text"
                    value={uploadForm.document_number}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, document_number: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder={t("e.g. 3174xxxxxxxxx")}
                  />
                </div>

                {/* Issue & Expiry Date */}
                <div className="ph-form-grid">
                  <div>
                    <label htmlFor="ops-managerdocuments-5" className="block text-sm font-medium text-gray-700 mb-2">{t("Issue Date")}</label>
                    <input id="ops-managerdocuments-5"
                      type="date"
                      value={uploadForm.issue_date}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="ops-managerdocuments-6" className="block text-sm font-medium text-gray-700 mb-2">{t("Expiry Date")}</label>
                    <input id="ops-managerdocuments-6"
                      type="date"
                      value={uploadForm.expiry_date}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Issuing Authority */}
                <div>
                  <label htmlFor="ops-managerdocuments-7" className="block text-sm font-medium text-gray-700 mb-2">{t("Issuing Authority")}</label>
                  <input id="ops-managerdocuments-7"
                    type="text"
                    value={uploadForm.issuing_authority}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, issuing_authority: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder={t("e.g. Dukcapil Jakarta Selatan")}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="ops-managerdocuments-8" className="block text-sm font-medium text-gray-700 mb-2">{t("Description")}</label>
                  <textarea id="ops-managerdocuments-8"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder={t("Additional notes...")}
                  />
                </div>

                <div className="ops-record-block">
                  <p className="text-sm text-indigo-800">
                    <strong>{t("Note:")}</strong>{' '}{t("Documents will be reviewed by P&C before being marked as verified.")} </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadForm.file}
                    className="ph-button ph-button-primary"
                  >
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}{' '}{t("Upload")} </button>
                </div>
              </form>
            </div>
          </Modal>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDocument && (
        <Modal isOpen={true} onClose={() => setShowDetailModal(false)} title={selectedDocument.document_name} size="xl" busy={isUploading} className="ph-workflow ops-workflow ops-modal">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="ops-avatar">
                    {getDocumentIcon(selectedDocument.document_type)}
                  </div>
                  <div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(selectedDocument.document_type)}`}>
                        {getTypeLabel(selectedDocument.document_type)}
                      </span>
                      {selectedDocument.is_verified ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />{t("Verified")} </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />{t("Pending")} </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              <div className="space-y-4">
                {selectedDocument.document_number && (
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("Document Number")}</p>
                    <p className="font-medium text-gray-900">{selectedDocument.document_number}</p>
                  </div>
                )}

                <div className="ph-form-grid">
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("File Size")}</p>
                    <p className="font-medium text-gray-900">{formatFileSize(selectedDocument.file_size)}</p>
                  </div>
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("Uploaded")}</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedDocument.created_at)}</p>
                  </div>
                </div>

                {selectedDocument.uploader && (
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("Uploaded By")}</p>
                    <p className="font-medium text-gray-900">{selectedDocument.uploader.name}</p>
                  </div>
                )}

                {(selectedDocument.issue_date || selectedDocument.expiry_date) && (
                  <div className="ph-form-grid">
                    {selectedDocument.issue_date && (
                      <div className="ops-record-block">
                        <p className="text-xs text-gray-500 mb-1">{t("Issue Date")}</p>
                        <p className="font-medium text-gray-900">{formatDate(selectedDocument.issue_date)}</p>
                      </div>
                    )}
                    {selectedDocument.expiry_date && (
                      <div className={`rounded-xl p-4 ${new Date(selectedDocument.expiry_date) < new Date() ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <p className={`text-xs uppercase tracking-wider mb-1 ${new Date(selectedDocument.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>{t("Expiry Date")} </p>
                        <p className={`font-medium ${new Date(selectedDocument.expiry_date) < new Date() ? 'text-red-700' : 'text-gray-900'}`}>
                          {formatDate(selectedDocument.expiry_date)}
                          {new Date(selectedDocument.expiry_date) < new Date() && t(" (Expired)")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedDocument.issuing_authority && (
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("Issuing Authority")}</p>
                    <p className="font-medium text-gray-900">{selectedDocument.issuing_authority}</p>
                  </div>
                )}

                {selectedDocument.description && (
                  <div className="ops-record-block">
                    <p className="text-xs text-gray-500 mb-1">{t("Description")}</p>
                    <p className="text-sm text-gray-700">{selectedDocument.description}</p>
                  </div>
                )}

                {selectedDocument.is_verified && selectedDocument.verifier && (
                  <div className="ops-record-block">
                    <p className="text-sm text-green-800">{t("Verified by")} <strong>{selectedDocument.verifier.name}</strong>
                      {selectedDocument.verified_at && t(' on {date}', { date: formatDate(selectedDocument.verified_at) })}
                    </p>
                    {selectedDocument.verification_notes && (
                      <p className="text-sm text-green-700 mt-1">{selectedDocument.verification_notes}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="ph-dialog-footer">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="ph-button ph-button-primary"
                >
                  <Download className="w-4 h-4" />{t("Download")} </button>
                {/* Only show delete for my uploads and unverified docs */}
                {activeTab === 'my-uploads' && !selectedDocument.is_verified && (
                  <button
                    onClick={() => setDeletingDocument(selectedDocument)}
                    className="ph-button ops-danger"
                  >
                    <Trash2 className="w-4 h-4" />{t("Delete")} </button>
                )}
              </div>
            </div>
          </Modal>
      )}
      {deletingDocument && <Modal isOpen={true} title={t("Delete Document?")} size="md" busy={isDeleting} onClose={() => { if (!isDeleting) setDeletingDocument(null); }} className="ph-workflow ops-workflow ops-modal"><p>{t('Hapus dokumen "{name}"?', { name: deletingDocument.document_name })}</p><div className="ph-dialog-footer"><button className="ph-button" disabled={isDeleting} onClick={() => setDeletingDocument(null)}>{t("Cancel")}</button><button className="ph-button ops-danger" disabled={isDeleting} onClick={() => void handleDelete(deletingDocument)}>{isDeleting ? t("Deleting...") : t("Delete")}</button></div></Modal>}
    </div>
  );
}
