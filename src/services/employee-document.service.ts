import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

// Document types categorized by who uploads them
export const EMPLOYEE_UPLOAD_TYPES = [
  'ktp', 'family_card', 'npwp', 'bpjs_tk', 'bpjs_kes',
  'bank_account', 'cv', 'ijazah', 'certificate', 'photo',
  'skck', 'surat_sehat', 'transkrip', 'sertifikat', 'rekening'
] as const;

export const HR_UPLOAD_TYPES = [
  'contract', 'offer_letter', 'kontrak_kerja', 'pkwt', 'pkwtt',
  'addendum', 'sp1', 'sp2', 'sp3', 'sk_pengangkatan', 'sk_promosi',
  'sk_mutasi', 'sk_phk', 'surat_referensi', 'paklaring', 'slip_gaji'
] as const;

export type DocumentCategory = 'employee' | 'hr';

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
  updated_at: string;
  // Relations
  employee?: {
    id: number;
    name: string;
    employee_id: string;
    company_id?: number;
  };
  uploader?: {
    id: number;
    name: string;
  };
  verifier?: {
    id: number;
    name: string;
  };
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
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateEmployeeDocumentRequest {
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

export interface UpdateEmployeeDocumentRequest {
  document_name?: string;
  document_type?: string;
  document_number?: string;
  description?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  is_required?: boolean;
  is_confidential?: boolean;
  tags?: string[];
}

interface BackendPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface DocumentStatistics {
  total: number;
  verified: number;
  unverified: number;
  expired: number;
  expiring_soon: number;
  by_type: { type: string; count: number }[];
}

// Helper to determine document category based on type
export function getDocumentCategory(documentType: string): DocumentCategory {
  if (HR_UPLOAD_TYPES.includes(documentType as typeof HR_UPLOAD_TYPES[number])) {
    return 'hr';
  }
  return 'employee';
}

export const employeeDocumentService = {
  // List employee documents
  getAll: async (params?: EmployeeDocumentListParams): Promise<PaginatedResponse<EmployeeDocument>> => {
    const response = await api.get<BackendPaginatedResponse<EmployeeDocument>>('/documents/employee', { params });
    return {
      success: true,
      data: response.data.data,
      pagination: {
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.total_pages,
      },
    };
  },

  // Get document by ID
  getById: async (id: number): Promise<EmployeeDocument> => {
    const response = await api.get<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}`);
    return response.data.data;
  },

  // Get my own documents (employee self-service)
  getMyDocuments: async (): Promise<EmployeeDocument[]> => {
    const response = await api.get<ApiResponse<EmployeeDocument[]>>('/documents/employee/me');
    return response.data.data;
  },

  // Get statistics
  getStatistics: async (companyId?: number): Promise<DocumentStatistics> => {
    const response = await api.get<ApiResponse<DocumentStatistics>>('/documents/employee/statistics', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data.data;
  },

  // Get expiring documents
  getExpiring: async (days: number = 30, companyId?: number): Promise<EmployeeDocument[]> => {
    const response = await api.get<ApiResponse<EmployeeDocument[]>>('/documents/employee/expiring', {
      params: { days, company_id: companyId },
    });
    return response.data.data;
  },

  // Get expired documents
  getExpired: async (companyId?: number): Promise<EmployeeDocument[]> => {
    const response = await api.get<ApiResponse<EmployeeDocument[]>>('/documents/employee/expired', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data.data;
  },

  // Check document completeness for an employee
  checkCompleteness: async (employeeId: number): Promise<{
    total_required: number;
    uploaded: number;
    verified: number;
    missing: string[];
    unverified: string[];
    is_complete: boolean;
    is_verified: boolean;
  }> => {
    const response = await api.get(`/documents/employee/${employeeId}/completeness`);
    return response.data.data;
  },

  // Create document
  create: async (data: CreateEmployeeDocumentRequest): Promise<EmployeeDocument> => {
    const response = await api.post<ApiResponse<EmployeeDocument>>('/documents/employee', data);
    return response.data.data;
  },

  // Update document
  update: async (id: number, data: UpdateEmployeeDocumentRequest): Promise<EmployeeDocument> => {
    const response = await api.put<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}`, data);
    return response.data.data;
  },

  // Delete document
  delete: async (id: number): Promise<void> => {
    await api.delete(`/documents/employee/${id}`);
  },

  // Verify document (approve)
  verify: async (id: number, notes?: string): Promise<EmployeeDocument> => {
    const response = await api.post<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}/verify`, {
      verification_notes: notes,
    });
    return response.data.data;
  },

  // Unverify document (reject/revoke verification)
  unverify: async (id: number): Promise<EmployeeDocument> => {
    const response = await api.post<ApiResponse<EmployeeDocument>>(`/documents/employee/${id}/unverify`);
    return response.data.data;
  },

  // Upload file (returns file info)
  uploadFile: async (file: File): Promise<{
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};
