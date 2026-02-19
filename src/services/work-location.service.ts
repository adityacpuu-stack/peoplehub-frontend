import { api } from './api';

export interface WorkLocation {
  id: number;
  name: string;
  address?: string;
  city?: string;
}

export const workLocationService = {
  async getAll(): Promise<WorkLocation[]> {
    const response = await api.get('/work-locations');
    return response.data.data || response.data;
  },
};
