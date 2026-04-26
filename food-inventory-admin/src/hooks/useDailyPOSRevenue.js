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
  if (total >= 500 && total - 500 < 100) ms.push('$500_day');
  if (total >= 1000 && total - 1000 < 100) ms.push('$1000_day');
  if (count === 50) ms.push('50_orders');
  if (isNewRecord) ms.push('new_record');
  return ms;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useDailyPOSRevenue(tenantId) {
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [record, setRecord] = useState(0);
  const [lastOrder, setLastOrder] = useState(null);
  const fetchedRef = useRef(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Load streak + record from localStorage
  useEffect(() => {
    if (!tenantId) return;
    const streakData = readJSON(`sk_pos_orders:${tenantId}:streak`, { lastDate: '', count: 0 });
    const savedRecord = readJSON(`sk_pos_orders:${tenantId}:daily_record`, 0);
    const savedLastOrder = readJSON(`sk_pos_orders:${tenantId}:last_order:${today}`, null);

    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (streakData.lastDate === today) {
      setStreak(streakData.count);
    } else if (streakData.lastDate === yesterday) {
      setStreak(streakData.count);
    } else {
      setStreak(0);
    }
    setRecord(savedRecord);
    if (savedLastOrder) setLastOrder(savedLastOrder);
  }, [tenantId, today]);

  // Fetch today's paid orders
  const fetchRevenue = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
      const res = await fetchApi(`/orders?startDate=${today}&endDate=${tomorrow}&limit=200`);
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res?.orders) ? res.orders : Array.isArray(res) ? res : [];
      const paid = raw.filter((o) => o.paymentStatus === 'paid');
      const total = paid.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      setTodayTotal(total);
      setTodayCount(paid.length);

      // Set last order from fetched data
      if (raw.length > 0) {
        const latest = raw[0]; // Most recent order (assuming sorted desc)
        setLastOrder({
          orderNumber: latest.orderNumber,
          customerName: latest.customerName,
          total: latest.totalAmount,
        });
      }
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
  const commitDay = useCallback((addedAmount, orderInfo = null) => {
    if (!tenantId) return;

    if (orderInfo) {
      setLastOrder(orderInfo);
      writeJSON(`sk_pos_orders:${tenantId}:last_order:${today}`, orderInfo);
    }

    setTodayTotal((prev) => {
      const newTotal = prev + addedAmount;

      // Update record
      const savedRecord = readJSON(`sk_pos_orders:${tenantId}:daily_record`, 0);
      if (newTotal > savedRecord) {
        writeJSON(`sk_pos_orders:${tenantId}:daily_record`, newTotal);
        setRecord(newTotal);
      }

      // Update streak
      if (newTotal >= STREAK_THRESHOLD) {
        const streakData = readJSON(`sk_pos_orders:${tenantId}:streak`, { lastDate: '', count: 0 });
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        let newCount;
        if (streakData.lastDate === today) {
          newCount = streakData.count;
        } else if (streakData.lastDate === yesterday) {
          newCount = streakData.count + 1;
        } else {
          newCount = 1;
        }

        writeJSON(`sk_pos_orders:${tenantId}:streak`, { lastDate: today, count: newCount });
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
    lastOrder,
    refetch: fetchRevenue,
    commitDay,
  };
}
