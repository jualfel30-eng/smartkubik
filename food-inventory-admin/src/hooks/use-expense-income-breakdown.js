import { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

const EMPTY_STATE = {
  period: null,
  expenses: null,
  income: null,
  comparison: null,
};

export function useExpenseIncomeBreakdown(
  period = '90d',
  granularity = 'month',
  compare = false,
) {
  const [data, setData] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period, granularity });
        if (compare) params.set('compare', 'true');
        const res = await fetchApi(
          `/analytics/expense-income-breakdown?${params}`,
        );
        if (active && res?.data) {
          setData(res.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ?? 'Error al cargar el desglose de gastos e ingresos',
          );
          setData(EMPTY_STATE);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [period, granularity, compare]);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return { data, loading, error, reload };
}
