import { useState, useEffect, useCallback, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { fetchApi } from '@/lib/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const DAILY_GOAL_DEFAULT = 500;
const STREAK_THRESHOLD = 300;

// ─── localStorage helpers ────────────────────────────────────────────────────
function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ─── Compute milestones from current state ───────────────────────────────────
function computeMilestones(count, total, isNewRecord) {
  const ms = [];
  if (count === 1) ms.push('first_sale');
  if (count === 10) ms.push('10th_sale');
  if (total >= 500 && total - 500 < 100) ms.push('$500_day'); // only near the crossing
  if (isNewRecord) ms.push('new_record');
  return ms;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useDailyRevenue(tenantId) {
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [record, setRecord] = useState(0);
  const fetchedRef = useRef(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Load streak + record from localStorage
  useEffect(() => {
    if (!tenantId) return;
    const streakData = readJSON(`sk_pos:${tenantId}:streak`, { lastDate: '', count: 0 });
    const savedRecord = readJSON(`sk_pos:${tenantId}:daily_record`, 0);

    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (streakData.lastDate === today) {
      setStreak(streakData.count);
    } else if (streakData.lastDate === yesterday) {
      setStreak(streakData.count); // will be incremented on commitDay if threshold met
    } else {
      setStreak(0);
    }
    setRecord(savedRecord);
  }, [tenantId, today]);

  // Fetch today's paid bookings
  const fetchRevenue = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
      const res = await fetchApi(`/beauty-bookings?startDate=${today}&endDate=${tomorrow}&limit=100`);
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const paid = raw.filter((b) => b.paymentStatus === 'paid');
      const total = paid.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
      setTodayTotal(total);
      setTodayCount(paid.length);
    } catch {
      // Silently fail — revenue display is non-critical
    } finally {
      setLoading(false);
    }
  }, [tenantId, today]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchRevenue();
    }
  }, [fetchRevenue]);

  // Optimistic update after a payment + persist streak/record
  const commitDay = useCallback((addedAmount) => {
    if (!tenantId) return;

    setTodayTotal((prev) => {
      const newTotal = prev + addedAmount;

      // Update record
      const savedRecord = readJSON(`sk_pos:${tenantId}:daily_record`, 0);
      if (newTotal > savedRecord) {
        writeJSON(`sk_pos:${tenantId}:daily_record`, newTotal);
        setRecord(newTotal);
      }

      // Update streak
      if (newTotal >= STREAK_THRESHOLD) {
        const streakData = readJSON(`sk_pos:${tenantId}:streak`, { lastDate: '', count: 0 });
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        let newCount;
        if (streakData.lastDate === today) {
          newCount = streakData.count; // already counted today
        } else if (streakData.lastDate === yesterday) {
          newCount = streakData.count + 1;
        } else {
          newCount = 1;
        }

        writeJSON(`sk_pos:${tenantId}:streak`, { lastDate: today, count: newCount });
        setStreak(newCount);
      }

      return newTotal;
    });

    setTodayCount((prev) => prev + 1);
  }, [tenantId, today]);

  const isNewRecord = todayTotal > record && record > 0;
  const milestones = computeMilestones(todayCount, todayTotal, isNewRecord);

  return {
    todayTotal,
    todayCount,
    dailyGoal: DAILY_GOAL_DEFAULT,
    streak,
    record,
    isNewRecord,
    milestones,
    loading,
    refetch: fetchRevenue,
    commitDay,
  };
}
