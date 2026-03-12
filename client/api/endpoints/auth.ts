import { axiosInstance, setTokens, clearTokens, getRefreshToken } from '../axios-instance';
import {
    LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, LogoutResponse
} from '../types';

export const authApi = {
    register: async (data: RegisterRequest) => {
        const res = await axiosInstance.post<RegisterResponse>('/auth/register', data);
        return res.data;
    },

    login: async (data: LoginRequest) => {
        const res = await axiosInstance.post<LoginResponse>('/auth/login', data);
        setTokens(res.data.access_token, res.data.refresh_token);
        return res.data;
    },

    logout: async () => {
        const refreshToken = getRefreshToken();
        try {
            if (refreshToken) {
                await axiosInstance.post<LogoutResponse>('/auth/logout', { refresh_token: refreshToken });
            }
        } finally {
            clearTokens();
        }
    },
};