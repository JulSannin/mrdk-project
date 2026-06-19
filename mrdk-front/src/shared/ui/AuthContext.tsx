import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import apiClient from '../lib/apiClient';

interface User {
  name: string;
  role: string;
}

async function fetchMe(): Promise<User | null> {
  try {
    const res = await apiClient.get<{ data: { user: User } }>('/auth/me');
    return res.data.data.user;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 401) return null;
    throw e;
  }
}

interface AuthState {
  isAuthenticated: boolean;
  userName: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  userName: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });

  const value: AuthState = {
    isAuthenticated: !!data,
    userName: data?.name ?? null,
    loading: isPending,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);