import { QueryClient } from '@tanstack/react-query';

// QueryClient публичного сайта (у админки react-admin свой внутренний клиент).
// Глобального редиректа на /login по 401 здесь намеренно нет: публичные запросы
// не должны отдавать 401, авторизацию в админке разруливает authProvider, а
// AuthContext сам трактует 401 как «не залогинен» (см. fetchMe).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
