import { useState, useEffect } from 'react';

export function useDashboardAutoRefresh(fetchFn, intervalMs = 60000) {
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        await fetchFn();
        setLastUpdated(new Date());
      } catch {
        // Silent fail on auto-refresh
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [fetchFn, intervalMs]);

  return { lastUpdated };
}
