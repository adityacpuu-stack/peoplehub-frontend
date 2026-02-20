import api from './api';
import type { ApiResponse, Employee } from '@/types';

// Profile update fields (limited for self-service)
export interface UpdateProfileDTO {
  phone?: string;
  mobile_number?: string;
  // Alamat KTP
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  // Alamat Domisili
  current_address?: string;
  current_city?: string;
  current_province?: string;
  current_postal_code?: string;
  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_address?: string;
  // Identity Documents
  national_id?: string;
  family_card_number?: string;
  npwp_number?: string;
  // Bank Information
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  // Avatar
  avatar?: string;
  // Education fields
  last_education?: string;
  education_major?: string;
  education_institution?: string;
  graduation_year?: number;
  // Family fields
  spouse_name?: string;
  children_count?: number;
  number_of_dependents?: number;
}

export const profileService = {
  // Get current user's employee profile
  getMyProfile: async (): Promise<Employee> => {
    const response = await api.get<ApiResponse<Employee>>('/employees/me');
    return response.data.data;
  },

  // Update current user's employee profile (limited fields)
  updateMyProfile: async (data: UpdateProfileDTO): Promise<Employee> => {
    const response = await api.put<ApiResponse<Employee>>('/employees/me', data);
    return response.data.data;
  },

  // Change password
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await api.post('/auth/change-password', data);
  },
};
