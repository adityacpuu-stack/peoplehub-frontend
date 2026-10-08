import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/personal/personal-workspace.css';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect, useRef, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { FileText, Download, Eye, Search, AlertCircle, FileSignature, File, FileSpreadsheet, Upload, Plus, X, CheckCircle, Clock, Loader2, Trash2, Shield, FileImage, FileArchive, Building2, FolderUp } from 'lucide-react';
import { documentService, EMPLOYEE_DOCUMENT_TYPES } from '@/services/document.service';
import type { EmployeeDocument } from '@/services/document.service';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

type TabType = 'from-hr' | 'my-uploads';

export function EmployeeDocumentsPage() {
  useLocale();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('from-hr');
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await documentService.getMyDocuments();
      setDocuments(data);
    } catch (error) {
      setLoadError(true);
      console.error('Failed to fetch documents:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t('Gagal memuat dokumen'), { id: 'api-error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchDocuments(); }, [fetchDocuments]);

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

  const getTypeLabel = (type: string) => {
    const found = EMPLOYEE_DOCUMENT_TYPES.find((t) => t.value === type);
    return found ? t(found.label) : type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes.toLocaleString(intlLocale())} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KB`;
    return `${(bytes / (1024 * 1024)).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
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

    if (isUploading) return;
    setIsUploading(true);
    try {
      // Upload file first
      const uploadResult = await documentService.uploadFile(uploadForm.file, 'documents');

      // Create document record using self-service endpoint
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
      setActiveTab('my-uploads');
      resetUploadForm();
      fetchDocuments();
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error((isAxiosError(error) && error.response?.data?.error?.message) || t('Gagal mengupload dokumen'), { id: 'api-error' });
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
      // Use self-service endpoint for deleting own documents
      await documentService.deleteMyDocument(doc.id);
      toast.success(t("Dokumen berhasil dihapus"));
      setDeletingDocument(null);
      setShowDetailModal(false);
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error((isAxiosError(error) && (error.response?.data?.error?.message || error.response?.data?.message)) || t('Gagal menghapus dokumen'), { id: 'api-error' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500">{t("Memuat dokumen...")}</p>
        </div>
      </div>
    );
  }

  if (loadError) return <div className="ph-workflow personal-page"><header className="personal-heading"><div><p className="personal-eyebrow">{t("Personal")}</p><h1>{t("My Documents")}</h1></div></header><div className="personal-empty personal-surface" role="alert"><AlertCircle /><h3>{t("Unable to load documents")}</h3><p>{t("Please try again. Your data has not been changed.")}</p><button className="ph-button" onClick={() => void fetchDocuments()}>{t("Try Again")}</button></div></div>;

  return (
    <div className="ph-workflow personal-page">
      <header className="personal-heading"><div><p className="personal-eyebrow">{t("Personal")}</p><h1>{t("My Documents")}</h1><p>{t("Your employment documents and personal uploads, in one place.")}</p></div><button className="ph-button ph-button-primary" onClick={() => setShowUploadModal(true)}><Plus />{t("Upload Document")}</button></header>
      <section className="personal-surface" aria-label={t("Personal documents")}>
        <div className="personal-tabs" aria-label={t("Document source")}><button aria-pressed={activeTab === 'from-hr'} onClick={() => setActiveTab('from-hr')}><Building2 />{t("From P&C")} <span>{hrDocuments.length.toLocaleString(intlLocale())}</span></button><button aria-pressed={activeTab === 'my-uploads'} onClick={() => setActiveTab('my-uploads')}><FolderUp />{t("My Uploads")} <span>{myUploadedDocuments.length.toLocaleString(intlLocale())}</span></button></div>
        <div className="personal-documents-intro"><Shield /><p>{activeTab === 'from-hr' ? t("Documents shared with you by P&C.") : t("Your uploads are private to you and authorized P&C staff.")}</p></div>
        <div className="personal-toolbar"><div className="personal-search"><Search /><input aria-label={t("Search documents")} placeholder={t("Search documents...")} value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label={t("Document type filter")} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="all">{t("All Types")}</option>{EMPLOYEE_DOCUMENT_TYPES.map(type => <option value={type.value} key={type.value}>{t(type.label)}</option>)}</select><span className="personal-muted">{filteredDocuments.length.toLocaleString(intlLocale())}{' '}{t("documents")}</span></div>
        <div className="personal-document-columns" aria-hidden="true"><span>{t("Document")}</span><span>{t("Uploaded")}</span><span>{t("Status")}</span><span>{t("Actions")}</span></div>
        {filteredDocuments.length === 0 ? <div className="personal-empty"><FolderUp /><h3>{search || filterType !== 'all' ? t("No matching documents") : activeTab === 'from-hr' ? t("No documents from P&C") : t("No uploaded documents")}</h3><p>{search || filterType !== 'all' ? t("Try a different search or document type.") : activeTab === 'from-hr' ? t("Documents shared with you will appear here.") : t("Upload your first document to get started.")}</p></div> : filteredDocuments.map(doc => <div className="personal-document-row" key={doc.id}>
          <button className="personal-record-name personal-document-open" aria-label={t('View document {name}', { name: doc.document_name })} onClick={() => handleViewDetail(doc)}><span className="personal-file-icon">{getDocumentIcon(doc.document_type)}</span><span><strong>{doc.document_name}</strong><small>{getTypeLabel(doc.document_type)} &middot; {formatFileSize(doc.file_size)}</small></span></button>
          <span className="personal-period">{formatDate(doc.created_at)}{activeTab === 'from-hr' && doc.uploader && <small>{doc.uploader.name}</small>}{doc.expiry_date && <small>{t("Expires:")} {formatDate(doc.expiry_date)}</small>}</span>
          <span className={`personal-status ${doc.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{doc.is_verified ? <CheckCircle /> : <Clock />}{doc.is_verified ? t("Verified") : t("Pending")}</span>
          <div className="personal-record-actions"><button className="ph-button" title={t("View")} aria-label={t('Open document details for {name}', { name: doc.document_name })} onClick={() => handleViewDetail(doc)}><Eye /></button><button className="ph-button" title={t("Download")} aria-label={t('Download document {name}', { name: doc.document_name })} disabled={!doc.file_path} onClick={() => handleDownload(doc)}><Download /></button></div>
        </div>)}
      </section>

      {showUploadModal && <Modal isOpen title={t("Upload Document")} description={t("Add a personal document for P&C to review.")} size="lg" busy={isUploading} onClose={() => { setShowUploadModal(false); resetUploadForm(); }} className="ph-workflow personal-modal">
        <form id="personal-upload-form" onSubmit={handleUpload}>
          <fieldset disabled={isUploading} className="personal-form-grid">
            <div className="personal-full personal-file-picker">
              <input id="personal-document-file" ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={handleFileSelect} className="sr-only" aria-label={t("Document file")} />
              <label htmlFor="personal-document-file"><Upload /><strong>{uploadForm.file ? uploadForm.file.name : t("Choose a file to upload")}</strong><span>{uploadForm.file ? formatFileSize(uploadForm.file.size) : t("PDF, DOC, XLS, JPG, PNG up to 10 MB")}</span></label>
              {uploadForm.file && <button type="button" className="ph-button" aria-label={t("Remove selected file")} onClick={() => { setUploadForm(prev => ({ ...prev, file: null })); if (fileInputRef.current) fileInputRef.current.value = ''; }}><X />{t("Remove")}</button>}
            </div>
            <label className="personal-field personal-full">{t("Document Name *")}<input required value={uploadForm.document_name} onChange={e => setUploadForm(prev => ({ ...prev, document_name: e.target.value }))} placeholder={t("e.g. KTP, NPWP, Ijazah S1")} /></label>
            <label className="personal-field">{t("Document Type *")}<select required value={uploadForm.document_type} onChange={e => setUploadForm(prev => ({ ...prev, document_type: e.target.value }))}>{EMPLOYEE_DOCUMENT_TYPES.map(type => <option key={type.value} value={type.value}>{t(type.label)}</option>)}</select></label>
            <label className="personal-field">{t("Document Number")}<input value={uploadForm.document_number} onChange={e => setUploadForm(prev => ({ ...prev, document_number: e.target.value }))} placeholder={t("Number on your document")} /></label>
            <label className="personal-field">{t("Issue Date")}<input type="date" value={uploadForm.issue_date} onChange={e => setUploadForm(prev => ({ ...prev, issue_date: e.target.value }))} /></label>
            <label className="personal-field">{t("Expiry Date")}<input type="date" value={uploadForm.expiry_date} onChange={e => setUploadForm(prev => ({ ...prev, expiry_date: e.target.value }))} /></label>
            <label className="personal-field personal-full">{t("Issuing Authority")}<input value={uploadForm.issuing_authority} onChange={e => setUploadForm(prev => ({ ...prev, issuing_authority: e.target.value }))} placeholder={t("e.g. Dukcapil Jakarta Selatan")} /></label>
            <label className="personal-field personal-full">{t("Description")} <span className="personal-optional">{t("Optional")}</span><textarea rows={2} value={uploadForm.description} onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))} placeholder={t("Additional notes...")} /></label>
          </fieldset>
          <p className="personal-form-hint personal-upload-note">{t("Documents will be reviewed by P&C before being marked as verified.")}</p>
        </form>
        <div className="ph-dialog-footer"><button disabled={isUploading} className="ph-button" onClick={() => { setShowUploadModal(false); resetUploadForm(); }}>{t("Cancel")}</button><button type="submit" form="personal-upload-form" className="ph-button ph-button-primary" disabled={isUploading || !uploadForm.file}>{isUploading ? <Loader2 className="animate-spin" /> : <Upload />}{t("Upload")}</button></div>
      </Modal>}

      {showDetailModal && selectedDocument && <Modal isOpen title={selectedDocument.document_name} description={t("Document details")} size="lg" onClose={() => setShowDetailModal(false)} className="ph-workflow personal-modal">
        <div className="personal-detail-summary"><div className="personal-record-name"><span className="personal-file-icon">{getDocumentIcon(selectedDocument.document_type)}</span><div><strong>{getTypeLabel(selectedDocument.document_type)}</strong><small>{selectedDocument.file_name || selectedDocument.document_name} &middot; {formatFileSize(selectedDocument.file_size)}</small></div></div><span className={`personal-status ${selectedDocument.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedDocument.is_verified ? t("Verified") : t("Pending")}</span></div>
        <dl className="personal-details">
          {selectedDocument.document_number && <div className="personal-full"><dt>{t("Document Number")}</dt><dd>{selectedDocument.document_number}</dd></div>}
          <div><dt>{t("Uploaded")}</dt><dd>{formatDate(selectedDocument.created_at)}</dd></div>
          {selectedDocument.uploader && <div><dt>{t("Uploaded By")}</dt><dd>{selectedDocument.uploader.name}</dd></div>}
          {selectedDocument.issue_date && <div><dt>{t("Issue Date")}</dt><dd>{formatDate(selectedDocument.issue_date)}</dd></div>}
          {selectedDocument.expiry_date && <div><dt>{t("Expiry Date")}</dt><dd>{formatDate(selectedDocument.expiry_date)}{new Date(selectedDocument.expiry_date) < new Date() && t(' (Expired)')}</dd></div>}
          {selectedDocument.issuing_authority && <div className="personal-full"><dt>{t("Issuing Authority")}</dt><dd>{selectedDocument.issuing_authority}</dd></div>}
          {selectedDocument.description && <div className="personal-full"><dt>{t("Description")}</dt><dd>{selectedDocument.description}</dd></div>}
          {selectedDocument.is_verified && selectedDocument.verifier && <div className="personal-full"><dt>{t("Verified By")}</dt><dd>{selectedDocument.verifier.name}{selectedDocument.verified_at && t(' on {date}', { date: formatDate(selectedDocument.verified_at) })}{selectedDocument.verification_notes && <p>{selectedDocument.verification_notes}</p>}</dd></div>}
        </dl>
        <div className="ph-dialog-footer">{selectedDocument.uploaded_by === user?.employee?.id && !selectedDocument.is_verified && <button className="ph-button personal-danger" onClick={() => setDeletingDocument(selectedDocument)}><Trash2 />{t("Delete")}</button>}<button className="ph-button" onClick={() => setShowDetailModal(false)}>{t("Close")}</button><button className="ph-button ph-button-primary" disabled={!selectedDocument.file_path} onClick={() => handleDownload(selectedDocument)}><Download />{t("Download")}</button></div>
      </Modal>}
      {deletingDocument && <Modal isOpen title={t("Delete Document?")} description={t("This removes the document from your uploads.")} size="md" role="alertdialog" busy={isDeleting} onClose={() => setDeletingDocument(null)} className="ph-workflow personal-modal"><p className="personal-note">{t('Are you sure you want to delete document "{name}"?', { name: deletingDocument.document_name })}</p><div className="ph-dialog-footer"><button className="ph-button" disabled={isDeleting} onClick={() => setDeletingDocument(null)}>{t("Cancel")}</button><button className="ph-button personal-danger" disabled={isDeleting} onClick={() => void handleDelete(deletingDocument)}>{isDeleting ? t("Deleting...") : t("Delete")}</button></div></Modal>}
    </div>
  );
}
