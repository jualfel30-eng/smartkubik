import { useEffect, useState } from 'react';

const STORAGE_KEY = (tenantId) => `smk_orders_streak_${tenantId || 'anon'}`;
const DAY_MS = 24 * 60 * 60 * 1000;

function readStreak(tenantId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(tenantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStreak(tenantId, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY(tenantId), JSON.stringify(value));
  } catch {
    // ignore quota errors silently
  }
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * useStreakCounter — tracks consecutive days without overdue orders.
 *
 * Reads + auto-updates a per-tenant streak in localStorage.
 *
 * Reset rule: if last update gap > 1 day OR overdueCount > 0, streak resets to 0.
 * Increment rule: if last update was yesterday and overdueCount === 0, streak += 1.
 * Same-day re-checks do not bump the streak (idempotent within a day).
 *
 * @param {string} tenantId
 * @param {number} overdueCount  current count of overdue orders
 * @returns {{ days: number, broken: boolean, lastUpdate: string | null }}
 */
export function useStreakCounter(tenantId, overdueCount = 0) {
  const [state, setState] = useState(() => readStreak(tenantId));

  useEffect(() => {
    if (!tenantId) return;
    const now = new Date();
    const today = startOfDay(now);
    const previous = readStreak(tenantId);
    const prevDays = previous?.days ?? 0;
    const prevDate = previous?.lastUpdate ? startOfDay(new Date(previous.lastUpdate)) : null;

    let nextDays = prevDays;
    let broken = false;

    if (overdueCount > 0) {
      if (prevDays > 0) broken = true;
      nextDays = 0;
    } else if (!prevDate) {
      nextDays = 1;
    } else {
      const gap = (today.getTime() - prevDate.getTime()) / DAY_MS;
      if (gap === 0) {
        nextDays = prevDays || 1;
      } else if (gap === 1) {
        nextDays = prevDays + 1;
      } else if (gap > 1) {
        nextDays = 1;
        if (prevDays > 0) broken = true;
      }
    }

    const next = {
      days: nextDays,
      broken,
      lastUpdate: now.toISOString(),
    };
    writeStreak(tenantId, next);
    setState(next);
  }, [tenantId, overdueCount]);

  return state || { days: 0, broken: false, lastUpdate: null };
}

export default useStreakCounter;
