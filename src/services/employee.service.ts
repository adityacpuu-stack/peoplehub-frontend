import api from './api';
import type { ApiResponse, PaginatedResponse, Employee, CreateEmployeeRequest, PaginationParams } from '@/types';

interface EmployeeListParams extends PaginationParams {
  company_id?: number;
  department_id?: number;
  work_location_id?: number;
  employment_status?: string;
  employment_type?: string;
}

// Backend response uses 'meta' for pagination
interface BackendPaginatedResponse<T> {
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const employeeService = {
  // Get paginated list of employees
  getAll: async (params?: EmployeeListParams): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get<BackendPaginatedResponse<Employee>>('/employees', { params });
    // Transform backend response to frontend format
    return {
      success: true,
      data: response.data.data,
      pagination: {
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        total: response.data.meta.total,
        totalPages: response.data.meta.totalPages,
      },
    };
  },

  // Get my profile (self-service)
  getMyProfile: async (): Promise<Employee> => {
    const response = await api.get<ApiResponse<Employee>>('/employees/me');
    return response.data.data;
  },

  // Update my profile (self-service)
  updateMyProfile: async (data: Partial<CreateEmployeeRequest>): Promise<Employee> => {
    const response = await api.put<ApiResponse<Employee>>('/employees/me', data);
    return response.data.data;
  },

  // Get employee by ID
  getById: async (id: number): Promise<Employee> => {
    const response = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
    return response.data.data;
  },

  // Get employee by employee_id (NIK)
  getByEmployeeId: async (employeeId: string): Promise<Employee> => {
    const response = await api.get<ApiResponse<Employee>>(`/employees/by-employee-id/${employeeId}`);
    return response.data.data;
  },

  // Get employees by company
  getByCompany: async (companyId: number, params?: PaginationParams): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get<PaginatedResponse<Employee>>(`/employees/company/${companyId}`, { params });
    return response.data;
  },

  // Get employees by department
  getByDepartment: async (departmentId: number, params?: PaginationParams): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get<PaginatedResponse<Employee>>(`/employees/department/${departmentId}`, { params });
    return response.data;
  },

  // Get subordinates of an employee
  getSubordinates: async (id: number): Promise<Employee[]> => {
    const response = await api.get<ApiResponse<Employee[]>>(`/employees/${id}/subordinates`);
    return response.data.data;
  },

  // Create new employee
  create: async (data: CreateEmployeeRequest): Promise<Employee> => {
    const response = await api.post<ApiResponse<Employee>>('/employees', data);
    return response.data.data;
  },

  // Update employee
  update: async (id: number, data: Partial<CreateEmployeeRequest>): Promise<Employee> => {
    const response = await api.put<ApiResponse<Employee>>(`/employees/${id}`, data);
    return response.data.data;
  },

  // Delete employee
  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  // Get next employee ID for a company
  getNextEmployeeId: async (companyId: number): Promise<string> => {
    const response = await api.get<ApiResponse<{ employee_id: string }>>(`/employees/next-id/${companyId}`);
    return response.data.data.employee_id;
  },

  // Export employees to Excel
  exportExcel: async (params?: {
    search?: string;
    company_id?: number;
    department_id?: number;
    employment_status?: string;
    employment_type?: string;
  }): Promise<void> => {
    const response = await api.get('/employees/export', {
      params,
      responseType: 'blob',
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `Employee_Export_${dateStr}.xlsx`;

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Get leadership team - employees who have direct reports
  getLeadershipTeam: async (companyId?: number): Promise<LeadershipMember[]> => {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await api.get<ApiResponse<LeadershipMember[]>>('/employees/leadership-team', { params });
    return response.data.data;
  },
};

// Leadership team member type
export interface LeadershipMember {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  department: string;
  company: string;
  join_date: string | null;
  tenure: string;
  direct_reports: number;
}
