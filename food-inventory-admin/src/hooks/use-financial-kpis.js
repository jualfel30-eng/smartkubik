import { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

const EMPTY_STATE = {
  avgTicket: null,
  grossMargin: null,
  contributionMargin: null,
  fixedVsVariable: null,
  netMargin: null,
  breakEven: null,
  inventoryTurnover: null,
  liquidity: null,
  ebitda: null,
  roi: null,
  period: null,
  comparison: null,
};

export function useFinancialKpis(
  period = '30d',
  compare = false,
  fromDate = null,
  toDate = null,
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
        const params = new URLSearchParams();
        if (fromDate && toDate) {
          params.set('fromDate', fromDate);
          params.set('toDate', toDate);
        } else {
          params.set('period', period);
        }
        if (compare) params.set('compare', 'true');
        const res = await fetchApi(`/analytics/financial-kpis?${params}`);
        if (active && res?.data) {
          setData(res.data);
        }
      } catch (err) {
        if (active) {
          setError(err?.message ?? 'Error al cargar los KPIs financieros');
          setData(EMPTY_STATE);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [period, compare, fromDate, toDate]);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return { data, loading, error, reload };
}

const EMPTY_COMPARE = {
  periodA: null,
  periodB: null,
  summaryA: null,
  summaryB: null,
  deltas: null,
};

export function useKpiComparison() {
  const [data, setData] = useState(EMPTY_COMPARE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const compare = useCallback(async (fromA, toA, fromB, toB) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        fromA: fromA.toISOString(),
        toA: toA.toISOString(),
        fromB: fromB.toISOString(),
        toB: toB.toISOString(),
      });
      const res = await fetchApi(`/analytics/financial-kpis/compare?${params}`);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err?.message ?? 'Error al comparar periodos');
      setData(EMPTY_COMPARE);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(EMPTY_COMPARE);
    setError(null);
  }, []);

  return { data, loading, error, compare, reset };
}
