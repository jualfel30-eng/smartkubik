import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * Fetches expense/income breakdown for one or more periods in parallel.
 *
 * @param {Array<{year, from, to, label}>} periods
 * @param {string} granularity - 'month' | 'quarter' | 'year'
 * @param {string} groupBy - 'type' | 'account'
 * @returns {{ results, primary, loading, error, reload }}
 */
export function useExpenseIncomeBreakdown(
  periods = [],
  granularity = 'month',
  groupBy = 'type',
) {
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
                granularity,
                groupBy,
                fromDate: p.from,
                toDate: p.to,
              });
              const res = await fetchApi(
                `/analytics/expense-income-breakdown?${params}`,
              );
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
          setError(err?.message ?? 'Error al cargar el desglose de gastos e ingresos');
          setResults([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [periodsKey, granularity, groupBy]);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  const primary = results[0]?.data ?? null;

  return { results, primary, loading, error, reload };
}
