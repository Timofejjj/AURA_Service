import { axiosInstance } from '../axios-instance';
import {
    WorkSession, CreateWorkSessionReq, CreateWorkSessionResp, EndWorkSessionReq,
    BreakSession, StartBreakReq, StartBreakResp, EndBreakReq,
    PaginationParams
} from '../types';

export const sessionsApi = {
    // Work Sessions
    startWork: async (data: CreateWorkSessionReq) => {
        const res = await axiosInstance.post<CreateWorkSessionResp>('/api/work-sessions', data);
        return res.data;
    },

    getWorkSessions: async (params?: Pick<PaginationParams, 'limit' | 'offset'>) => {
        const res = await axiosInstance.get<WorkSession[]>('/api/work-sessions', { params });
        return res.data;
    },

    endWork: async (id: number, data: EndWorkSessionReq) => {
        const res = await axiosInstance.put<{ status: string }>(`/api/work-sessions/${id}/end`, data);
        return res.data;
    },

    // Breaks
    startBreak: async (data: StartBreakReq) => {
        const res = await axiosInstance.post<StartBreakResp>('/api/breaks', data);
        return res.data;
    },

    getBreaks: async (params?: Pick<PaginationParams, 'limit' | 'offset'>) => {
        const res = await axiosInstance.get<BreakSession[]>('/api/breaks', { params });
        return res.data;
    },

    endBreak: async (id: number, data: EndBreakReq) => {
        const res = await axiosInstance.put<{ status: string }>(`/api/breaks/${id}/end`, data);
        return res.data;
    },
};