import { QueryClient } from '@tanstack/react-query';

// Shared client cache. Adopted to stop every module re-fetching the same data
// (e.g. switching Inventario <-> POS re-downloaded the whole catalog). Coexists
// with the legacy useState+fetch hooks — only the hot paths use it for now.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — reuse cached data across navigations
      gcTime: 5 * 60_000, // keep in memory 5 min after last use
      refetchOnWindowFocus: false, // avoid surprise refetches at the POS
      retry: 1,
    },
  },
});
