import type { AuthProvider } from 'react-admin';
import axios from 'axios';
import apiClient from '../../shared/lib/apiClient';

export const authProvider: AuthProvider = {
    login: async ({ username, password }) => {
        await apiClient.post('/auth', { login: username, password });
    },

    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            //
        }

        window.location.href = '/login';
    },

    checkAuth: async () => {
        await apiClient.get('/auth/me');
    },

    checkError: async (error: unknown) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401 || status === 403) {
            throw new Error('Unauthorized');
        }
    },

    getIdentity: async () => {
        const res = await apiClient.get<{ data: { user: { name: string } } }>('/auth/me');
        return { id: 'admin', fullName: res.data.data.user.name };
    },

    getPermissions: async () => undefined,
};