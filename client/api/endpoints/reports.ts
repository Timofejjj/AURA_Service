import { axiosInstance } from '../axios-instance';
import { Report, PaginationParams } from '../types';

export const reportsApi = {
    create: async (data: Report) => {
        const res = await axiosInstance.post<{ message: string }>('/api/reports', data);
        return res.data;
    },

    getAll: async (params: Required<Pick<PaginationParams, 'user_id'>> & PaginationParams) => {
        const res = await axiosInstance.get<Report[]>('/api/reports', { params });
        return res.data;
    },

    getById: async (id: number) => {
        const res = await axiosInstance.get<Report>(`/api/reports/${id}`);
        return res.data;
    },
};