import { useEffect, useState } from 'react';
import { companyService } from '@/services/company.service';
import type { Company } from '@/services/company.service';
import { employeeService } from '@/services/employee.service';
import { employeeDocumentService, getDocumentCategory } from '@/services/employee-document.service';
import type { EmployeeDocument as EmployeeDocumentType } from '@/services/employee-document.service';
import type { Employee } from '@/types';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import toast from 'react-hot-toast';

type ContractType = 'permanent' | 'contract' | 'probation';
type ContractStatus = 'active' | 'expired' | 'terminated' | 'pending';
type TabType = 'contracts' | 'documents';
type DocumentCategory = 'employee' | 'hr';

interface Contract {
  id: number;
  company_id: number;
  employee: {
    id: number;
    name: string;
    employee_id: string;
    department: string;
    position: string;
  };
  contract_type: ContractType;
  contract_number: string;
  start_date: string;
  end_date: string | null;
  salary: number;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
}

// Use the type from service, but create a local view type for UI
interface DocumentListItem {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  category: DocumentCategory;
  is_verified: boolean;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
  verification_notes?: string;
}

// Document types for employee uploads
const employeeDocumentTypes = [
  { value: 'ktp', label: 'National ID Card (KTP)' },
  { value: 'npwp', label: 'Tax ID (NPWP)' },
  { value: 'kk', label: 'Family Card' },
  { value: 'ijazah', label: 'Latest Diploma' },
  { value: 'transkrip', label: 'Academic Transcript' },
  { value: 'sertifikat', label: 'Skill Certificate' },
  { value: 'skck', label: 'Police Clearance (SKCK)' },
  { value: 'surat_sehat', label: 'Health Certificate' },
  { value: 'foto', label: 'Passport Photo' },
  { value: 'bpjs_kesehatan', label: 'BPJS Health Insurance' },
  { value: 'bpjs_ketenagakerjaan', label: 'BPJS Employment' },
  { value: 'rekening', label: 'Bank Account Book' },
  { value: 'other', label: 'Other' },
];

// Document types for HR uploads
const hrDocumentTypes = [
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'kontrak_kerja', label: 'Employment Contract' },
  { value: 'pkwt', label: 'Fixed-Term Contract (PKWT)' },
  { value: 'pkwtt', label: 'Permanent Contract (PKWTT)' },
  { value: 'addendum', label: 'Contract Addendum' },
  { value: 'sp1', label: 'Warning Letter 1' },
  { value: 'sp2', label: 'Warning Letter 2' },
  { value: 'sp3', label: 'Warning Letter 3' },
  { value: 'sk_pengangkatan', label: 'Appointment Letter' },
  { value: 'sk_promosi', label: 'Promotion Letter' },
  { value: 'sk_mutasi', label: 'Transfer Letter' },
  { value: 'sk_phk', label: 'Termination Letter' },
  { value: 'surat_referensi', label: 'Reference Letter' },
  { value: 'paklaring', label: 'Employment Certificate' },
  { value: 'slip_gaji', label: 'Salary Slip' },
  { value: 'other', label: 'Other' },
];

export function ContractsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contract modals
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  // Document modals
  const [showDocModal, setShowDocModal] = useState(false);
  const [showDocDetailModal, setShowDocDetailModal] = useState(false);
  const [showDocDeleteModal, setShowDocDeleteModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentListItem | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<DocumentListItem | null>(null);
  const [documentCategory, setDocumentCategory] = useState<DocumentCategory>('employee');

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<ContractType | 'all'>('all');
  const [docSearch, setDocSearch] = useState('');
  const [docFilterCategory, setDocFilterCategory] = useState<DocumentCategory | 'all'>('all');
  const [docFilterStatus, setDocFilterStatus] = useState<'verified' | 'unverified' | 'all'>('all');

  // Form data
  const [formData, setFormData] = useState({
    employee_id: '',
    contract_type: 'contract' as ContractType,
    contract_number: '',
    start_date: '',
    end_date: '',
    salary: '',
    status: 'active' as ContractStatus,
    notes: '',
  });

  const [docFormData, setDocFormData] = useState({
    employee_id: 0,
    document_type: '',
    document_name: '',
    category: 'employee' as DocumentCategory,
    file: null as File | null,
    notes: '',
  });

  // Mock contracts
  const mockContracts: Contract[] = [
    { id: 1, company_id: 1, employee: { id: 1, name: 'John Doe', employee_id: 'EMP001', department: 'Engineering', position: 'Software Engineer' }, contract_type: 'permanent', contract_number: 'CTR-2024-001', start_date: '2024-01-15', end_date: null, salary: 15000000, status: 'active', notes: 'Permanent employee contract', created_at: '2024-01-01' },
    { id: 2, company_id: 1, employee: { id: 2, name: 'Jane Smith', employee_id: 'EMP002', department: 'Human Resources', position: 'HR Officer' }, contract_type: 'contract', contract_number: 'CTR-2024-002', start_date: '2024-02-01', end_date: '2025-01-31', salary: 10000000, status: 'active', notes: '1 year contract', created_at: '2024-01-15' },
    { id: 3, company_id: 1, employee: { id: 3, name: 'Ahmad Wijaya', employee_id: 'EMP003', department: 'Finance', position: 'Accountant' }, contract_type: 'probation', contract_number: 'CTR-2024-003', start_date: '2024-06-01', end_date: '2024-08-31', salary: 8000000, status: 'active', notes: '3 months probation', created_at: '2024-05-20' },
    { id: 4, company_id: 1, employee: { id: 4, name: 'Siti Rahayu', employee_id: 'EMP004', department: 'Marketing', position: 'Marketing Specialist' }, contract_type: 'contract', contract_number: 'CTR-2023-015', start_date: '2023-03-01', end_date: '2024-02-28', salary: 9000000, status: 'expired', notes: 'Contract ended', created_at: '2023-02-15' },
  ];

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchData();
    }
  }, [selectedCompanyId, activeTab]);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ page: 1, limit: 100 });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompanyId(response.data[0].id);
      }
    } catch {
      toast.error('Failed to load company data');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch employees for the selected company
      const empResponse = await employeeService.getAll({ company_id: selectedCompanyId!, page: 1, limit: 100 });
      setEmployees(empResponse.data);

      // TODO: Replace with actual API for contracts
      if (activeTab === 'contracts') {
        const filtered = mockContracts.filter(c => c.company_id === selectedCompanyId);
        setContracts(filtered);
      } else {
        // Fetch documents from real API
        const docResponse = await employeeDocumentService.getAll({
          company_id: selectedCompanyId!,
          page: 1,
          limit: 100,
        });

        // Transform to DocumentListItem format
        const transformedDocs: DocumentListItem[] = docResponse.data.map((doc: EmployeeDocumentType) => ({
          id: doc.id,
          employee_id: doc.employee_id,
          employee_name: doc.employee?.name || 'Unknown',
          employee_code: doc.employee?.employee_id || 'N/A',
          document_type: doc.document_type,
          document_name: doc.document_name,
          file_path: doc.file_path,
          file_size: doc.file_size || 0,
          category: getDocumentCategory(doc.document_type),
          is_verified: doc.is_verified,
          uploaded_by: doc.uploader?.name || 'Unknown',
          uploaded_at: doc.created_at,
          description: doc.description,
          verification_notes: doc.verification_notes,
        }));

        setDocuments(transformedDocs);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Contract filtering
  const filteredContracts = contracts.filter(contract => {
    const matchSearch = contract.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      contract.employee.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || contract.status === filterStatus;
    const matchType = filterType === 'all' || contract.contract_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  // Document filtering
  const filteredDocuments = documents.filter(doc => {
    const matchSearch = doc.employee_name.toLowerCase().includes(docSearch.toLowerCase()) ||
      doc.employee_code.toLowerCase().includes(docSearch.toLowerCase()) ||
      doc.document_name.toLowerCase().includes(docSearch.toLowerCase());
    const matchCategory = docFilterCategory === 'all' || doc.category === docFilterCategory;
    const matchStatus = docFilterStatus === 'all' ||
      (docFilterStatus === 'verified' && doc.is_verified) ||
      (docFilterStatus === 'unverified' && !doc.is_verified);
    return matchSearch && matchCategory && matchStatus;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expiringSoon: contracts.filter(c => {
      if (!c.end_date) return false;
      const endDate = new Date(c.end_date);
      const today = new Date();
      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30 && c.status === 'active';
    }).length,
    expired: contracts.filter(c => c.status === 'expired').length,
  };

  const docStats = {
    total: documents.length,
    employeeDocs: documents.filter(d => d.category === 'employee').length,
    hrDocs: documents.filter(d => d.category === 'hr').length,
    unverified: documents.filter(d => !d.is_verified).length,
  };

  const handleOpenModal = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        employee_id: contract.employee.id.toString(),
        contract_type: contract.contract_type,
        contract_number: contract.contract_number,
        start_date: contract.start_date,
        end_date: contract.end_date || '',
        salary: contract.salary.toString(),
        status: contract.status,
        notes: contract.notes || '',
      });
    } else {
      setEditingContract(null);
      setFormData({
        employee_id: '',
        contract_type: 'contract',
        contract_number: '',
        start_date: '',
        end_date: '',
        salary: '',
        status: 'active',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Replace with actual API
      if (editingContract) {
        toast.success('Contract updated successfully');
      } else {
        toast.success('Contract created successfully');
      }
      setShowModal(false);
      fetchData();
    } catch {
      toast.error('Failed to save contract');
    }
  };

  const handleDelete = async () => {
    if (!deletingContract) return;
    try {
      // TODO: Replace with actual API
      toast.success('Contract deleted successfully');
      setShowDeleteModal(false);
      setDeletingContract(null);
      fetchData();
    } catch {
      toast.error('Failed to delete contract');
    }
  };

  const openDeleteModal = (contract: Contract) => {
    setDeletingContract(contract);
    setShowDeleteModal(true);
  };

  const openDetailModal = (contract: Contract) => {
    setViewingContract(contract);
    setShowDetailModal(true);
  };

  // Document handlers
  const handleOpenDocModal = (category: DocumentCategory) => {
    setDocumentCategory(category);
    setDocFormData({
      employee_id: 0,
      document_type: '',
      document_name: '',
      category: category,
      file: null,
      notes: '',
    });
    setShowDocModal(true);
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFormData.file || !docFormData.employee_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // First upload the file
      const fileInfo = await employeeDocumentService.uploadFile(docFormData.file);

      // Then create the document record
      await employeeDocumentService.create({
        employee_id: docFormData.employee_id,
        document_name: docFormData.document_name,
        document_type: docFormData.document_type,
        file_path: fileInfo.file_path,
        file_name: fileInfo.file_name,
        file_size: fileInfo.file_size,
        mime_type: fileInfo.mime_type,
        description: docFormData.notes || undefined,
      });

      toast.success('Document uploaded successfully');
      setShowDocModal(false);
      fetchData();
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocDelete = async () => {
    if (!deletingDocument) return;
    setIsSubmitting(true);
    try {
      await employeeDocumentService.delete(deletingDocument.id);
      toast.success('Document deleted successfully');
      setShowDocDeleteModal(false);
      setDeletingDocument(null);
      fetchData();
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocVerify = async (doc: DocumentListItem, notes?: string) => {
    try {
      await employeeDocumentService.verify(doc.id, notes);
      toast.success('Document verified successfully');
      fetchData();
    } catch {
      toast.error('Failed to verify document');
    }
  };

  const handleDocUnverify = async (doc: DocumentListItem) => {
    try {
      await employeeDocumentService.unverify(doc.id);
      toast.success('Document verification revoked');
      fetchData();
    } catch {
      toast.error('Failed to revoke document verification');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getTypeBadge = (type: ContractType) => {
    const styles: Record<ContractType, { bg: string; text: string; label: string }> = {
      permanent: { bg: 'bg-green-100', text: 'text-green-700', label: 'Permanent' },
      contract: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Contract' },
      probation: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Probation' },
    };
    const style = styles[type];
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const getStatusBadge = (status: ContractStatus) => {
    const styles: Record<ContractStatus, { bg: string; text: string; dot: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Active' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Expired' },
      terminated: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Terminated' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
    };
    const style = styles[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {style.label}
      </span>
    );
  };

  const getDocStatusBadge = (isVerified: boolean) => {
    const style = isVerified
      ? { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified' }
      : { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Unverified' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const getDocTypeLabel = (type: string, category: DocumentCategory) => {
    const types = category === 'employee' ? employeeDocumentTypes : hrDocumentTypes;
    return types.find(t => t.value === type)?.label || type;
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    if (diffDays <= 30) {
      return (
        <span className="text-xs text-red-600 font-medium">
          {diffDays} days left
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-rose-700 to-pink-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-rose-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Contracts & Documents
                  </h1>
                  <p className="text-rose-100 text-sm mt-1">
                    {selectedCompany ? (
                      <>Manage employee contracts and documents for <span className="font-semibold">{selectedCompany.name}</span></>
                    ) : (
                      'Select a company to get started'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Company Selector */}
              <div className="relative">
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-medium cursor-pointer min-w-[200px]"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id} className="text-gray-900">
                      {company.name}
                    </option>
                  ))}
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'contracts'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Contracts
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'contracts' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {stats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'documents'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Documents
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'documents' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {docStats.total}
            </span>
            {docStats.unverified > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">
                {docStats.unverified}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Contracts</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.active}</p>
              <p className="text-sm text-gray-500">Active Contracts</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.expiringSoon}</p>
              <p className="text-sm text-gray-500">Expiring Soon</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.expired}</p>
              <p className="text-sm text-gray-500">Expired Contracts</p>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[250px]">
                  <input
                    type="text"
                    placeholder="Search employee or contract number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as ContractType | 'all')}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="all">All Types</option>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="probation">Probation</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as ContractStatus | 'all')}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Contract
              </button>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500">Loading data...</p>
                  </div>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No contracts yet</h3>
                  <p className="mt-1 text-gray-500">Add your first contract.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contract No.</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredContracts.map(contract => (
                      <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(contract.employee.name)} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                              {contract.employee.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{contract.employee.name}</p>
                              <p className="text-xs text-gray-500">{contract.employee.employee_id} • {contract.employee.position}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm font-mono rounded-lg">
                            {contract.contract_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getTypeBadge(contract.contract_type)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{formatDate(contract.start_date)}</p>
                            <p className="text-gray-500">
                              to {contract.end_date ? formatDate(contract.end_date) : 'Unlimited'}
                            </p>
                            {getDaysRemaining(contract.end_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(contract.salary)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(contract.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDetailModal(contract)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Detail"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleOpenModal(contract)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openDeleteModal(contract)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <>
          {/* Document Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{docStats.total}</p>
              <p className="text-sm text-gray-500">Total Documents</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{docStats.employeeDocs}</p>
              <p className="text-sm text-gray-500">From Employees</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{docStats.hrDocs}</p>
              <p className="text-sm text-gray-500">From P&C</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{docStats.unverified}</p>
              <p className="text-sm text-gray-500">Unverified</p>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[250px]">
                  <input
                    type="text"
                    placeholder="Search document or employee..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={docFilterCategory}
                  onChange={(e) => setDocFilterCategory(e.target.value as DocumentCategory | 'all')}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="all">All Categories</option>
                  <option value="employee">From Employee</option>
                  <option value="hr">From P&C</option>
                </select>
                <select
                  value={docFilterStatus}
                  onChange={(e) => setDocFilterStatus(e.target.value as 'verified' | 'unverified' | 'all')}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="all">All Status</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenDocModal('employee')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Employee Doc
                </button>
                <button
                  onClick={() => handleOpenDocModal('hr')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload P&C Doc
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500">Loading data...</p>
                  </div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No documents yet</h3>
                  <p className="mt-1 text-gray-500">Upload your first document.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDocuments.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(doc.employee_name)} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                              {doc.employee_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{doc.employee_name}</p>
                              <p className="text-xs text-gray-500">{doc.employee_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{doc.document_name}</p>
                              <p className="text-xs text-gray-500">{getDocTypeLabel(doc.document_type, doc.category)} • {formatFileSize(doc.file_size)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            doc.category === 'employee'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {doc.category === 'employee' ? 'From Employee' : 'From P&C'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{doc.uploaded_by}</p>
                            <p className="text-gray-500 text-xs">{formatDate(doc.uploaded_at)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getDocStatusBadge(doc.is_verified)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setViewingDocument(doc);
                                setShowDocDetailModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <a
                              href={doc.file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                            {!doc.is_verified ? (
                              <button
                                onClick={() => handleDocVerify(doc)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Verify"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDocUnverify(doc)}
                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Revoke Verification"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setDeletingDocument(doc);
                                setShowDocDeleteModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Contract Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-rose-600 to-pink-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {editingContract ? 'Edit Contract' : 'Add Contract'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={employees.map(emp => ({
                        value: emp.id,
                        label: `${emp.name} (${emp.employee_id})`,
                      }))}
                      value={formData.employee_id ? Number(formData.employee_id) : ''}
                      onChange={(val) => setFormData({ ...formData, employee_id: val?.toString() || '' })}
                      placeholder="Select Employee"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.contract_number}
                      onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
                      placeholder="CTR-2024-XXX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as ContractType })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      required
                    >
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="probation">Probation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      placeholder="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ContractStatus })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                  >
                    {editingContract ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contract Detail Modal */}
      {showDetailModal && viewingContract && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-rose-600 to-pink-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Contract Details</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(viewingContract.employee.name)} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {viewingContract.employee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{viewingContract.employee.name}</p>
                    <p className="text-sm text-gray-500">{viewingContract.employee.employee_id} • {viewingContract.employee.position}</p>
                    <p className="text-sm text-gray-500">{viewingContract.employee.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contract No.</p>
                    <p className="font-mono font-semibold text-gray-900">{viewingContract.contract_number}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contract Type</p>
                    <div className="mt-1">{getTypeBadge(viewingContract.contract_type)}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Start Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(viewingContract.start_date)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">End Date</p>
                    <p className="font-semibold text-gray-900">
                      {viewingContract.end_date ? formatDate(viewingContract.end_date) : 'Unlimited'}
                    </p>
                    {getDaysRemaining(viewingContract.end_date)}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Salary</p>
                    <p className="font-bold text-gray-900 text-lg">{formatCurrency(viewingContract.salary)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                    <div className="mt-1">{getStatusBadge(viewingContract.status)}</div>
                  </div>
                </div>

                {viewingContract.notes && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-gray-700">{viewingContract.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleOpenModal(viewingContract);
                    }}
                    className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                  >
                    Edit Contract
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Delete Confirmation Modal */}
      {showDeleteModal && deletingContract && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDeleteModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Contract?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Are you sure you want to delete contract <span className="font-semibold text-gray-700">{deletingContract.contract_number}</span> belonging to <span className="font-semibold text-gray-700">{deletingContract.employee.name}</span>?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDocModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className={`px-6 py-5 ${
                documentCategory === 'employee'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                  : 'bg-gradient-to-br from-purple-600 to-purple-700'
              }`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {documentCategory === 'employee' ? 'Upload Employee Document' : 'Upload P&C Document'}
                  </h2>
                  <button
                    onClick={() => setShowDocModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-white/80 text-sm mt-1">
                  {documentCategory === 'employee'
                    ? 'Documents to be uploaded by employees (ID card, Tax ID, Diploma, etc.)'
                    : 'Documents from P&C for employees (Offer Letter, Contract, Letters, etc.)'}
                </p>
              </div>

              <form onSubmit={handleDocSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={employees.map(emp => ({
                      value: emp.id,
                      label: `${emp.name} (${emp.employee_id})`,
                    }))}
                    value={docFormData.employee_id || ''}
                    onChange={(val) => setDocFormData({ ...docFormData, employee_id: Number(val) || 0 })}
                    placeholder="Select Employee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={docFormData.document_type}
                    onChange={(e) => setDocFormData({ ...docFormData, document_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Document Type</option>
                    {(documentCategory === 'employee' ? employeeDocumentTypes : hrDocumentTypes).map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={docFormData.document_name}
                    onChange={(e) => setDocFormData({ ...docFormData, document_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g., John Doe ID Card"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      onChange={(e) => setDocFormData({ ...docFormData, file: e.target.files?.[0] || null })}
                      className="hidden"
                      id="doc-file-input"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <label htmlFor="doc-file-input" className="cursor-pointer">
                      {docFormData.file ? (
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{docFormData.file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(docFormData.file.size)}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
                          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC (Max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={docFormData.notes}
                    onChange={(e) => setDocFormData({ ...docFormData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowDocModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 ${
                      documentCategory === 'employee'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {isSubmitting ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {showDocDetailModal && viewingDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDocDetailModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className={`px-6 py-5 ${
                viewingDocument.category === 'employee'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                  : 'bg-gradient-to-br from-purple-600 to-purple-700'
              }`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Document Details</h2>
                  <button
                    onClick={() => setShowDocDetailModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(viewingDocument.employee_name)} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {viewingDocument.employee_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{viewingDocument.employee_name}</p>
                    <p className="text-sm text-gray-500">{viewingDocument.employee_code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Document Name</p>
                    <p className="font-semibold text-gray-900">{viewingDocument.document_name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Document Type</p>
                    <p className="font-semibold text-gray-900">{getDocTypeLabel(viewingDocument.document_type, viewingDocument.category)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Category</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      viewingDocument.category === 'employee'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {viewingDocument.category === 'employee' ? 'From Employee' : 'From P&C'}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">File Size</p>
                    <p className="font-semibold text-gray-900">{formatFileSize(viewingDocument.file_size)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                    <div className="mt-1">{getDocStatusBadge(viewingDocument.is_verified)}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Uploaded By</p>
                    <p className="font-semibold text-gray-900">{viewingDocument.uploaded_by}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Upload Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(viewingDocument.uploaded_at)}</p>
                  </div>
                </div>

                {viewingDocument.description && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-gray-700">{viewingDocument.description}</p>
                  </div>
                )}

                {viewingDocument.verification_notes && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verification Notes</p>
                    <p className="text-gray-700">{viewingDocument.verification_notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowDocDetailModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={viewingDocument.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Delete Modal */}
      {showDocDeleteModal && deletingDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDocDeleteModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Document?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Are you sure you want to delete the document <span className="font-semibold text-gray-700">{deletingDocument.document_name}</span>?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowDocDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDocDelete}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
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
