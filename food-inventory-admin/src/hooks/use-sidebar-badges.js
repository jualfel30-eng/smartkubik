import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * useSidebarBadges — Polls lightweight count endpoints for sidebar badges.
 * Returns a map of route-key → count (only non-zero values).
 *
 * Counts fetched:
 * - appointments: pending + confirmed (today)
 * - inventory-management: low stock alerts
 *
 * Polling: every 60 seconds (configurable).
 */
export function useSidebarBadges(enabled = true, intervalMs = 60_000) {
  const [badges, setBadges] = useState({});

  const fetchCounts = useCallback(async () => {
    if (!enabled) return;

    const counts = {};

    try {
      // Appointments today — pending or confirmed
      const aptRes = await fetchApi('/appointments/count-today');
      if (aptRes?.data?.count > 0) {
        counts.appointments = aptRes.data.count;
      }
    } catch {
      // Endpoint may not exist — silently skip
    }

    try {
      // Low-stock alerts
      const alertRes = await fetchApi('/inventory/alerts/count');
      if (alertRes?.data?.count > 0) {
        counts['inventory-management'] = alertRes.data.count;
      }
    } catch {
      // Endpoint may not exist — silently skip
    }

    setBadges(counts);
  }, [enabled]);

  useEffect(() => {
    fetchCounts();
    if (!enabled) return;
    const id = setInterval(fetchCounts, intervalMs);
    return () => clearInterval(id);
  }, [fetchCounts, enabled, intervalMs]);

  return badges;
}
