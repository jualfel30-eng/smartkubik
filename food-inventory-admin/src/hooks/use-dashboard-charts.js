import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { FEATURES } from '@/config/features.js';

const EMPTY_SALES = {
  trend: [],
  categories: [],
  comparison: null,
  attributes: {
    schema: [],
    combinations: [],
  },
};

const EMPTY_INVENTORY = {
  status: [],
  movement: [],
  rotation: [],
  attributes: {
    schema: [],
    combinations: [],
  },
};

const EMPTY_ADVANCED = {
  pnl: { revenues: [], expenses: [] },
  rfm: [],
  employees: [],
};

const EMPTY_PREDICTIVE = {
  salesForecast: null,
  purchaseRecommendations: [],
  customerLifetimeValue: [],
};

const INITIAL_STATE = {
  sales: EMPTY_SALES,
  inventory: EMPTY_INVENTORY,
  advanced: EMPTY_ADVANCED,
  predictive: EMPTY_PREDICTIVE,
};

export function useDashboardCharts(period = '30d') {
  const [data, setData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!FEATURES.DASHBOARD_CHARTS) {
      setData(INITIAL_STATE);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;

    const handleError = (err) => {
      if (!active) return;
      setData(INITIAL_STATE);
      setError(err?.message ?? 'No fue posible cargar las gráficas del dashboard.');
      setLoading(false);
    };

    async function loadCharts() {
      setLoading(true);
      try {
        const requests = [
          fetchApi(`/analytics/sales-trend?period=${period}`),
          fetchApi(`/analytics/inventory-status?period=${period}`),
          fetchApi(`/analytics/performance?period=${period}`),
        ];

        if (FEATURES.ADVANCED_REPORTS) {
          requests.push(fetchApi(`/analytics/profit-and-loss?period=${period}`));
          requests.push(fetchApi('/analytics/customer-segmentation'));
        }

        const [
          salesRes,
          inventoryRes,
          performanceRes,
          pnlRes,
          segmentationRes,
        ] = await Promise.allSettled(requests);

        if (!active) return;

        if (
          salesRes.status === 'rejected' ||
          inventoryRes.status === 'rejected'
        ) {
          throw salesRes.reason || inventoryRes.reason;
        }

        const salesPayload = salesRes.status === 'fulfilled' ? salesRes.value?.data : null;
        const salesData = salesPayload
          ? {
              ...EMPTY_SALES,
              ...salesPayload,
              attributes: {
                schema: salesPayload?.attributes?.schema ?? [],
                combinations: salesPayload?.attributes?.combinations ?? [],
              },
            }
          : EMPTY_SALES;
        const inventoryPayload =
          inventoryRes.status === 'fulfilled' ? inventoryRes.value?.data : null;
        const inventoryData = inventoryPayload
          ? {
              ...EMPTY_INVENTORY,
              ...inventoryPayload,
              attributes: {
                schema: inventoryPayload?.attributes?.schema ?? [],
                combinations: inventoryPayload?.attributes?.combinations ?? [],
              },
            }
          : EMPTY_INVENTORY;
        const performanceData =
          performanceRes.status === 'fulfilled' ? performanceRes.value?.data : [];

        const pnlData =
          FEATURES.ADVANCED_REPORTS && pnlRes?.status === 'fulfilled'
            ? pnlRes.value?.data
            : EMPTY_ADVANCED.pnl;
        const segmentationData =
          FEATURES.ADVANCED_REPORTS && segmentationRes?.status === 'fulfilled'
            ? segmentationRes.value?.data
            : [];

        setData({
          sales: salesData,
          inventory: inventoryData,
          advanced: {
            ...EMPTY_ADVANCED,
            employees: performanceData ?? [],
            pnl: pnlData ?? EMPTY_ADVANCED.pnl,
            rfm: segmentationData ?? [],
          },
          predictive: EMPTY_PREDICTIVE,
        });
        setError(null);
      } catch (err) {
        handleError(err);
        return;
      }

      if (active) {
        setLoading(false);
      }
    }

    loadCharts();

    return () => {
      active = false;
    };
  }, [period]);

  return { data, loading, error };
}
