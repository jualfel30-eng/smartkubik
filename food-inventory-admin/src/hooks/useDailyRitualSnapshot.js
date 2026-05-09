import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = (tenantId) => `smk_orders_ritual_${tenantId || 'anon'}`;
const DAY_MS = 24 * 60 * 60 * 1000;

function readSnapshot(tenantId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(tenantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(tenantId, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY(tenantId), JSON.stringify(value));
  } catch {
    // ignore quota errors silently
  }
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * useDailyRitualSnapshot — exposes welcome-back state + last daily close stats.
 *
 * @param {string} tenantId
 * @param {{ orders?: Array, todayCollectedAmount?: number, todayOrdersCount?: number }} input
 * @returns {{
 *   shouldShowWelcomeBack: boolean,
 *   lastClose: { collected:number, ordersCount:number, date:string } | null,
 *   markVisit: () => void,
 *   recordDailyClose: (snapshot:{collected:number, ordersCount:number}) => void
 * }}
 */
export function useDailyRitualSnapshot(tenantId, { now } = {}) {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(tenantId));
  const reference = now || new Date();

  useEffect(() => {
    setSnapshot(readSnapshot(tenantId));
  }, [tenantId]);

  const shouldShowWelcomeBack = useMemo(() => {
    if (!snapshot?.lastVisit) return false;
    const last = new Date(snapshot.lastVisit);
    if (Number.isNaN(last.getTime())) return false;
    return reference.getTime() - last.getTime() > DAY_MS;
  }, [snapshot, reference]);

  const isFirstOpenToday = useMemo(() => {
    if (!snapshot?.lastVisit) return true;
    const last = new Date(snapshot.lastVisit);
    if (Number.isNaN(last.getTime())) return true;
    return !isSameDay(last, reference);
  }, [snapshot, reference]);

  const markVisit = () => {
    const next = {
      ...(snapshot || {}),
      lastVisit: reference.toISOString(),
    };
    setSnapshot(next);
    writeSnapshot(tenantId, next);
  };

  const recordDailyClose = ({ collected, ordersCount }) => {
    const next = {
      ...(snapshot || {}),
      lastDailyClose: {
        collected: Number(collected) || 0,
        ordersCount: Number(ordersCount) || 0,
        date: reference.toISOString(),
      },
      lastVisit: reference.toISOString(),
    };
    setSnapshot(next);
    writeSnapshot(tenantId, next);
  };

  return {
    shouldShowWelcomeBack,
    isFirstOpenToday,
    lastClose: snapshot?.lastDailyClose || null,
    markVisit,
    recordDailyClose,
  };
}

export default useDailyRitualSnapshot;
