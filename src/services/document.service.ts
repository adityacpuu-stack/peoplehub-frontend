import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

// ==========================================
// TYPES
// ==========================================

export interface DocumentCategory {
  id: number;
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  parent?: { id: number; name: string };
  _count?: { documents: number; children: number };
}

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_name: string;
  document_type: string;
  document_number?: string;
  file_path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  is_verified: boolean;
  is_required: boolean;
  is_confidential: boolean;
  verified_at?: string;
  verified_by?: number;
  verification_notes?: string;
  uploaded_by?: number;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  employee?: {
    id: number;
    name: string;
    employee_id: string;
    company_id?: number;
  };
  uploader?: { id: number; name: string };
  verifier?: { id: number; name: string };
}

export interface Document {
  id: number;
  title: string;
  description?: string;
  file_path: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  mime_type?: string;
  document_type?: string;
  category_id?: number;
  employee_id?: number;
  version: number;
  expiry_date?: string;
  status: string;
  visibility: string;
  is_required: boolean;
  is_verified: boolean;
  download_count: number;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  category?: { id: number; name: string; code?: string };
  employee?: { id: number; name: string; employee_id: string };
  uploader?: { id: number; name: string };
  reviewer?: { id: number; name: string };
}

export interface DocumentStatistics {
  total: number;
  verified: number;
  unverified: number;
  expired: number;
  expiring_soon: number;
  by_type: { type: string; count: number }[];
}

export interface EmployeeDocumentListParams extends PaginationParams {
  employee_id?: number;
  company_id?: number;
  department_id?: number;
  document_type?: string;
  is_verified?: boolean;
  is_expired?: boolean;
  expiring_within_days?: number;
  search?: string;
}

export interface DocumentListParams extends PaginationParams {
  company_id?: number;
  category_id?: number;
  document_type?: string;
  status?: string;
  visibility?: string;
  search?: string;
}

export interface CreateEmployeeDocumentDTO {
  employee_id: number;
  document_name: string;
  document_type: string;
  file_path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  document_number?: string;
  description?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  is_required?: boolean;
  is_confidential?: boolean;
  tags?: string[];
}

export interface CreateDocumentDTO {
  title: string;
  description?: string;
  file_path: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  mime_type?: string;
  document_type?: string;
  category_id?: number;
  employee_id?: number;
  expiry_date?: string;
  tags?: string[];
  visibility?: string;
  is_required?: boolean;
}

// Document types
export const EMPLOYEE_DOCUMENT_TYPES = [
  { value: 'ktp', label: 'KTP' },
  { value: 'family_card', label: 'Kartu Keluarga' },
  { value: 'npwp', label: 'NPWP' },
  { value: 'bpjs_tk', label: 'BPJS Ketenagakerjaan' },
  { value: 'bpjs_kes', label: 'BPJS Kesehatan' },
  { value: 'bank_account', label: 'Rekening Bank' },
  { value: 'cv', label: 'CV/Resume' },
  { value: 'ijazah', label: 'Ijazah' },
  { value: 'certificate', label: 'Sertifikat' },
  { value: 'contract', label: 'Kontrak Kerja' },
  { value: 'photo', label: 'Foto' },
  { value: 'other', label: 'Lainnya' },
];

export const documentService = {
  // ==========================================
  // SELF-SERVICE (MY DOCUMENTS)
  // ==========================================

  // Get my documents
  getMyDocuments: async (): Promise<EmployeeDocument[]> => {
    const response = await api.get<ApiResponse<EmployeeDocument[]>>('/documents/employee/me');
    return response.data.data;
  },

  // Upload my own document (self-service)
  uploadMyDocument: async (data: Omit<CreateEmployeeDocumentDTO, 'employee_id'>): Promise<EmployeeDocument> => {
    const response = await api.post<ApiResponse<EmployeeDocument>>('/documents/employee/me', data);
    return response.data.data;
  },

  // Delete my own document (self-service, only unverified)
  deleteMyDocument: async (id: number): Promise<void> => {
    await api.delete(`/documents/employee/me/${id}`);
  },

  // ==========================================
  // EMPLOYEE DOCUMENT ROUTES (HR)
  // ==========================================

  // List employee documents
  getEmployeeDocuments: async (params?: EmployeeDocumentListParams): Promise<PaginatedResponse<EmployeeDocument>> => {
    const response = await api.get<PaginatedResponse<EmployeeDocument>>('/documents/employee', { params });
    return response.data;
  },

  // Get employee document by ID
  getEmployeeDocumentById: async (id: number): Promise<EmployeeDocument> => {
    const response = await api.get<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}`);
    return response.data.data;
  },

  // Create employee document
  createEmployeeDocument: async (data: CreateEmployeeDocumentDTO): Promise<EmployeeDocument> => {
    const response = await api.post<ApiResponse<EmployeeDocument>>('/documents/employee', data);
    return response.data.data;
  },

  // Update employee document
  updateEmployeeDocument: async (id: number, data: Partial<CreateEmployeeDocumentDTO>): Promise<EmployeeDocument> => {
    const response = await api.put<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}`, data);
    return response.data.data;
  },

  // Delete employee document
  deleteEmployeeDocument: async (id: number): Promise<void> => {
    await api.delete(`/documents/employee/${id}`);
  },

  // Verify employee document
  verifyEmployeeDocument: async (id: number, notes?: string): Promise<EmployeeDocument> => {
    const response = await api.post<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}/verify`, {
      verification_notes: notes,
    });
    return response.data.data;
  },

  // Unverify employee document
  unverifyEmployeeDocument: async (id: number): Promise<EmployeeDocument> => {
    const response = await api.post<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}/unverify`);
    return response.data.data;
  },

  // Get expiring documents
  getExpiringDocuments: async (days?: number): Promise<EmployeeDocument[]> => {
    const response = await api.get<ApiResponse<EmployeeDocument[]>>('/documents/employee/expiring', {
      params: { days: days || 30 },
    });
    return response.data.data;
  },

  // Get expired documents
  getExpiredDocuments: async (): Promise<EmployeeDocument[]> => {
    const response = await api.get<ApiResponse<EmployeeDocument[]>>('/documents/employee/expired');
    return response.data.data;
  },

  // Get document statistics
  getStatistics: async (): Promise<DocumentStatistics> => {
    const response = await api.get<ApiResponse<DocumentStatistics>>('/documents/employee/statistics');
    return response.data.data;
  },

  // ==========================================
  // COMPANY DOCUMENT ROUTES
  // ==========================================

  // List company documents
  getDocuments: async (params?: DocumentListParams): Promise<PaginatedResponse<Document>> => {
    const response = await api.get<PaginatedResponse<Document>>('/documents', { params });
    return response.data;
  },

  // Get document by ID
  getDocumentById: async (id: number): Promise<Document> => {
    const response = await api.get<ApiResponse<Document>>(`/documents/${id}`);
    return response.data.data;
  },

  // Create document
  createDocument: async (data: CreateDocumentDTO): Promise<Document> => {
    const response = await api.post<ApiResponse<Document>>('/documents', data);
    return response.data.data;
  },

  // Update document
  updateDocument: async (id: number, data: Partial<CreateDocumentDTO>): Promise<Document> => {
    const response = await api.put<ApiResponse<Document>>(`/documents/${id}`, data);
    return response.data.data;
  },

  // Delete document
  deleteDocument: async (id: number): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  // Archive document
  archiveDocument: async (id: number): Promise<Document> => {
    const response = await api.post<ApiResponse<Document>>(`/documents/${id}/archive`);
    return response.data.data;
  },

  // Verify document
  verifyDocument: async (id: number): Promise<Document> => {
    const response = await api.post<ApiResponse<Document>>(`/documents/${id}/verify`);
    return response.data.data;
  },

  // ==========================================
  // DOCUMENT CATEGORIES
  // ==========================================

  // List categories
  getCategories: async (): Promise<PaginatedResponse<DocumentCategory>> => {
    const response = await api.get<PaginatedResponse<DocumentCategory>>('/documents/categories');
    return response.data;
  },

  // Get category by ID
  getCategoryById: async (id: number): Promise<DocumentCategory> => {
    const response = await api.get<ApiResponse<DocumentCategory>>(`/documents/categories/${id}`);
    return response.data.data;
  },

  // ==========================================
  // FILE UPLOAD
  // ==========================================

  // Upload file and return path
  uploadFile: async (file: File, folder?: string): Promise<{ file_path: string; file_name: string; file_size: number; mime_type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    const response = await api.post<ApiResponse<{ file_path: string; file_name: string; file_size: number; mime_type: string }>>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};
