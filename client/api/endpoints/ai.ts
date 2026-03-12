import { axiosInstance } from '../axios-instance';
import { AIPromptsSettings, UpsertAISettingsRequest, DeleteAISettingsResponse } from '../types';

export const aiSettingsApi = {
    get: async () => {
        const res = await axiosInstance.get<AIPromptsSettings>('/api/ai-settings');
        return res.data;
    },

    upsert: async (data: UpsertAISettingsRequest) => {
        const res = await axiosInstance.put<AIPromptsSettings>('/api/ai-settings', data);
        return res.data;
    },

    delete: async () => {
        const res = await axiosInstance.delete<DeleteAISettingsResponse>('/api/ai-settings');
        return res.data;
    },
};