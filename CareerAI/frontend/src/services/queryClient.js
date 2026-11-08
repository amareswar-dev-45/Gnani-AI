import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes fresh
      gcTime: 10 * 60 * 1000,   // 10 minutes cache retention
      refetchOnWindowFocus: false, // Prevent distracting background refetches
      refetchOnReconnect: true,
      retry: 1
    }
  }
});

