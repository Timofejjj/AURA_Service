import { axiosInstance } from '../axios-instance';
import { Thought, CreateThoughtReq, UpdateThoughtReq, PaginationParams } from '../types';

export const thoughtsApi = {
    create: async (data: CreateThoughtReq) => {
        const res = await axiosInstance.post<Thought>('/api/thoughts', data);
        return res.data;
    },

    getAll: async (params?: Pick<PaginationParams, 'limit'>) => {
        const res = await axiosInstance.get<Thought[]>('/api/thoughts', { params });
        return res.data;
    },

    getById: async (id: number) => {
        const res = await axiosInstance.get<Thought>(`/api/thoughts/${id}`);
        return res.data;
    },

    update: async (data: UpdateThoughtReq) => {
        const res = await axiosInstance.put<{ status: string }>('/api/thoughts', data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await axiosInstance.delete<{ status: string }>(`/api/thoughts/${id}`);
        return res.data;
    },
};