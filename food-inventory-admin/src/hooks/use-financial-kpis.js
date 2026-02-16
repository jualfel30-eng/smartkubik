import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * Fetches financial KPIs for one or more periods in parallel.
 *
 * @param {Array<{year, from, to, label}>} periods
 * @returns {{ results, primary, loading, error, reload }}
 *   - results: array of { year, label, data, error } (one per period)
 *   - primary: the most-recent period's data (results[0].data)
 */
export function useFinancialKpis(periods = []) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const periodsRef = useRef(periods);
  periodsRef.current = periods;

  const periodsKey = JSON.stringify(periods.map((p) => `${p.from}|${p.to}`));

  const reload = useCallback(() => {
    let active = true;
    const currentPeriods = periodsRef.current;

    async function load() {
      if (!currentPeriods.length) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const settled = await Promise.all(
          currentPeriods.map(async (p) => {
            try {
              const params = new URLSearchParams({
                fromDate: p.from,
                toDate: p.to,
              });
              const res = await fetchApi(`/analytics/financial-kpis?${params}`);
              return { year: p.year, label: p.label, data: res?.data ?? null, error: null };
            } catch (err) {
              return { year: p.year, label: p.label, data: null, error: err?.message };
            }
          }),
        );

        if (active) {
          setResults(settled);
          if (settled.every((r) => r.error)) {
            setError(settled[0].error);
          }
        }
      } catch (err) {
        if (active) {
          setError(err?.message ?? 'Error al cargar los KPIs financieros');
          setResults([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [periodsKey]);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  const primary = results[0]?.data ?? null;

  return { results, primary, loading, error, reload };
}
