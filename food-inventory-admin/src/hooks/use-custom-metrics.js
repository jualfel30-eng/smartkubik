import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * Fetches custom metrics based on selected metric IDs and period.
 *
 * @param {Array<string>} metricIds - Array of metric IDs to fetch
 * @param {Array<{year, from, to, label}>} periods - Date periods
 * @returns {{ data, loading, error, reload }}
 */
export function useCustomMetrics(metricIds = [], periods = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const metricIdsRef = useRef(metricIds);
  metricIdsRef.current = metricIds;

  const periodsRef = useRef(periods);
  periodsRef.current = periods;

  const metricIdsKey = JSON.stringify(metricIds);
  const periodsKey = JSON.stringify(periods.map((p) => `${p.from}|${p.to}`));

  const reload = useCallback(() => {
    let active = true;
    const currentMetricIds = metricIdsRef.current;
    const currentPeriods = periodsRef.current;

    async function load() {
      // Filter out invalid metric IDs
      const validMetricIds = currentMetricIds.filter(
        id => id && typeof id === 'string' && id !== 'undefined' && id !== 'null'
      );

      // Don't fetch if no metrics selected
      if (!validMetricIds.length) {
        setData(null);
        setLoading(false);
        return;
      }

      // If no periods, don't fetch
      if (!currentPeriods.length) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use the first period's dates
        const period = currentPeriods[0];

        const params = new URLSearchParams();
        validMetricIds.forEach(id => params.append('metrics', id));
        if (period.from) params.append('fromDate', period.from);
        if (period.to) params.append('toDate', period.to);

        const res = await fetchApi(`/analytics/custom-metrics?${params}`);

        if (active) {
          setData(res?.data ?? null);
        }
      } catch (err) {
        if (active) {
          setError(err?.message ?? 'Error al cargar métricas personalizadas');
          setData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [metricIdsKey, periodsKey]);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return { data, loading, error, reload };
}
