import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

// ==========================================
// TEMPLATE TYPES
// ==========================================

export const TEMPLATE_CATEGORIES = [
  'contract',      // Kontrak kerja, perjanjian
  'letter',        // Surat-surat (offering, warning, reference)
  'policy',        // Kebijakan perusahaan
  'form',          // Form/formulir
  'report',        // Laporan
  'sop',           // Standard Operating Procedure
  'guideline',     // Pedoman/panduan
  'manual',        // Manual/buku panduan
  'memo',          // Memorandum internal
  'circular',      // Surat edaran
  'checklist',     // Checklist/daftar periksa
  'announcement',  // Template pengumuman
  'onboarding',    // Dokumen onboarding
  'offboarding',   // Dokumen offboarding/resign
  'evaluation',    // Form evaluasi/penilaian
  'training',      // Materi/dokumen training
  'other',         // Lainnya
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_FILE_TYPES = ['docx', 'pdf', 'xlsx', 'pptx', 'other'] as const;
export type TemplateFileType = (typeof TEMPLATE_FILE_TYPES)[number];

export interface Template {
  id: number;
  company_id: number;
  name: string;
  description: string | null;
  category: TemplateCategory;
  file_type: TemplateFileType;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  version: string | null;
  is_active: boolean;
  download_count: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  company?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  } | null;
}

export interface TemplateListParams extends PaginationParams {
  company_id?: number;
  category?: TemplateCategory;
  file_type?: TemplateFileType;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateTemplateRequest {
  company_id: number;
  name: string;
  description?: string;
  category: TemplateCategory;
  file_type: TemplateFileType;
  file_path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  version?: string;
  is_active?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  file_type?: TemplateFileType;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  version?: string;
  is_active?: boolean;
}

export interface TemplateStatistics {
  total: number;
  active: number;
  inactive: number;
  by_category: { category: string; count: number }[];
  by_file_type: { file_type: string; count: number }[];
}

// ==========================================
// BACKEND RESPONSE TYPES
// ==========================================

interface BackendPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ==========================================
// TEMPLATE SERVICE
// ==========================================

export const templateService = {
  /**
   * Get all templates with pagination and filters
   */
  getAll: async (params?: TemplateListParams): Promise<PaginatedResponse<Template>> => {
    const response = await api.get<BackendPaginatedResponse<Template>>('/templates', { params });
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

  /**
   * Get template by ID
   */
  getById: async (id: number): Promise<Template> => {
    const response = await api.get<ApiResponse<Template>>(`/templates/${id}`);
    return response.data.data;
  },

  /**
   * Get templates by company
   */
  getByCompany: async (companyId: number): Promise<Template[]> => {
    const response = await api.get<ApiResponse<Template[]>>(`/templates/company/${companyId}`);
    return response.data.data;
  },

  /**
   * Get templates by category
   */
  getByCategory: async (category: TemplateCategory, companyId?: number): Promise<Template[]> => {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await api.get<ApiResponse<Template[]>>(`/templates/category/${category}`, { params });
    return response.data.data;
  },

  /**
   * Get template statistics
   */
  getStatistics: async (companyId?: number): Promise<TemplateStatistics> => {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await api.get<ApiResponse<TemplateStatistics>>('/templates/statistics', { params });
    return response.data.data;
  },

  /**
   * Create a new template
   */
  create: async (data: CreateTemplateRequest): Promise<Template> => {
    const response = await api.post<ApiResponse<Template>>('/templates', data);
    return response.data.data;
  },

  /**
   * Update a template
   */
  update: async (id: number, data: UpdateTemplateRequest): Promise<Template> => {
    const response = await api.put<ApiResponse<Template>>(`/templates/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a template
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  /**
   * Duplicate a template
   */
  duplicate: async (id: number): Promise<Template> => {
    const response = await api.post<ApiResponse<Template>>(`/templates/${id}/duplicate`);
    return response.data.data;
  },

  /**
   * Track download (increment download count)
   */
  trackDownload: async (id: number): Promise<void> => {
    await api.post(`/templates/${id}/download`);
  },

  /**
   * Upload template file (returns file info)
   */
  uploadFile: async (file: File): Promise<{
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export const getCategoryLabel = (category: TemplateCategory): string => {
  const labels: Record<TemplateCategory, string> = {
    contract: 'Contracts',
    letter: 'Letters',
    policy: 'Policies',
    form: 'Forms',
    report: 'Reports',
    sop: 'SOP',
    guideline: 'Guidelines',
    manual: 'Manuals',
    memo: 'Memos',
    circular: 'Circulars',
    checklist: 'Checklists',
    announcement: 'Announcements',
    onboarding: 'Onboarding',
    offboarding: 'Offboarding',
    evaluation: 'Evaluations',
    training: 'Training',
    other: 'Other',
  };
  return labels[category] || category;
};

export const getFileTypeLabel = (fileType: TemplateFileType): string => {
  const labels: Record<TemplateFileType, string> = {
    docx: 'Word (.docx)',
    pdf: 'PDF (.pdf)',
    xlsx: 'Excel (.xlsx)',
    pptx: 'PowerPoint (.pptx)',
    other: 'Other',
  };
  return labels[fileType] || fileType;
};

export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
