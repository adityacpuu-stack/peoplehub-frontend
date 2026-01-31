import api from './api';
import type { ApiResponse } from '@/types';

// Types matching backend response
export type OrgChartNode = {
  id: number;
  employee_id: string | null;
  name: string;
  job_title: string | null;
  avatar: string | null;
  department: {
    id: number;
    name: string;
  } | null;
  position: {
    id: number;
    name: string;
  } | null;
  company: {
    id: number;
    name: string;
  } | null;
  email: string | null;
  phone: string | null;
  employment_status: string | null;
  children: OrgChartNode[];
};

export type OrgChartStats = {
  totalEmployees: number;
  totalDepartments: number;
  maxDepth: number;
  levelDistribution: { level: number; count: number }[];
};

export type OrgChartResponse = {
  tree: OrgChartNode[];
  stats: OrgChartStats;
};

export type OrgChartParams = {
  company_id?: number;
  department_id?: number;
  root_employee_id?: number;
  max_depth?: number;
};

export const orgChartService = {
  // Get full org chart
  getOrgChart: async (params?: OrgChartParams): Promise<OrgChartResponse> => {
    const response = await api.get<ApiResponse<OrgChartResponse>>('/org-chart', { params });
    return response.data.data;
  },

  // Get subtree for specific employee
  getEmployeeSubtree: async (employeeId: number, maxDepth: number = 5): Promise<OrgChartNode> => {
    const response = await api.get<ApiResponse<OrgChartNode>>(`/org-chart/employee/${employeeId}`, {
      params: { max_depth: maxDepth },
    });
    return response.data.data;
  },
};
