import api from './api';
import type { ApiResponse } from '@/types';

// Contract types
export interface ContractEmployee {
  id: number;
  name: string;
  employee_id: string;
  company?: { id: number; name: string };
  department?: { name: string };
  position?: { name: string };
}

export interface Contract {
  id: number;
  contract_number: string;
  contract_type: 'permanent' | 'contract' | 'probation';
  status: 'active' | 'expired' | 'terminated' | 'pending';
  start_date: string;
  end_date: string | null;
  created_at: string;
  employee: ContractEmployee;
}

export interface CompanyContractStats {
  company_id: number;
  company_name: string;
  total: number;
  active: number;
  expired: number;
  expiring_30_days: number;
  expiring_60_days: number;
  expiring_90_days: number;
  by_type: {
    permanent: number;
    contract: number;
    probation: number;
  };
}

export interface GroupContractStatistics {
  summary: {
    total_contracts: number;
    active_contracts: number;
    expired_contracts: number;
    expiring_30_days: number;
    expiring_60_days: number;
    expiring_90_days: number;
    by_type: {
      permanent: number;
      contract: number;
      probation: number;
    };
  };
  by_company: CompanyContractStats[];
  expiring_contracts: Contract[];
  recent_contracts: Contract[];
}

export const contractService = {
  // Get group contract statistics (for Group CEO)
  getGroupStatistics: async (): Promise<GroupContractStatistics> => {
    const response = await api.get<ApiResponse<GroupContractStatistics>>('/contracts/group/statistics');
    return response.data.data;
  },

  // List contracts
  listContracts: async (params?: {
    page?: number;
    limit?: number;
    company_id?: number;
    status?: string;
    contract_type?: string;
  }): Promise<{ data: Contract[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const response = await api.get('/contracts', { params });
    return response.data;
  },

  // Get expiring contracts
  getExpiringContracts: async (days: number = 30, companyId?: number): Promise<Contract[]> => {
    const params: Record<string, unknown> = { days };
    if (companyId) params.company_id = companyId;
    const response = await api.get('/contracts/expiring', { params });
    return response.data.data;
  },
};
