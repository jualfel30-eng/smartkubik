import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { triggerCelebration } from '@/hooks/use-celebration';

const STORAGE_KEY = 'smartkubik_dashboard_celebrations';
const REVENUE_THRESHOLDS = [500, 1000, 2000];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getOrResetState() {
  const todayKey = getTodayKey();
  const stored = getStoredState();
  if (stored && stored.date === todayKey) return stored;
  const fresh = { date: todayKey, firstSale: false, goalReached: false, milestones: [], alertsResolved: false };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useDashboardMilestones({ salesToday = 0, lowStockAlertCount = 0, dailyGoal = 500 }) {
  const prevSalesRef = useRef(null);
  const prevAlertsRef = useRef(null);

  useEffect(() => {
    const state = getOrResetState();
    const prevSales = prevSalesRef.current;
    const prevAlerts = prevAlertsRef.current;

    prevSalesRef.current = salesToday;
    prevAlertsRef.current = lowStockAlertCount;

    // First sale of the day
    if (salesToday > 0 && !state.firstSale) {
      state.firstSale = true;
      // Only celebrate with confetti if user was watching (not first load)
      if (prevSales !== null) {
        toast.success('Primera venta del dia!', { duration: 5000 });
        setTimeout(() => triggerCelebration(), 300);
      }
      saveState(state);
    }

    // Daily goal reached
    if (salesToday >= dailyGoal && !state.goalReached) {
      state.goalReached = true;
      toast.success(`Meta diaria alcanzada: $${dailyGoal}!`, { duration: 6000 });
      if (prevSales !== null) {
        setTimeout(() => triggerCelebration(), 300);
      }
      saveState(state);
    }

    // Revenue milestones
    for (const threshold of REVENUE_THRESHOLDS) {
      if (salesToday >= threshold && !state.milestones.includes(threshold)) {
        state.milestones.push(threshold);
        toast.success(`Ventas superan los $${threshold}!`, { duration: 4000 });
        saveState(state);
      }
    }

    // All alerts resolved
    if (prevAlerts !== null && prevAlerts > 0 && lowStockAlertCount === 0 && !state.alertsResolved) {
      state.alertsResolved = true;
      toast.success('Inventario al dia! Todas las alertas resueltas.', { duration: 5000 });
      saveState(state);
    }
  }, [salesToday, lowStockAlertCount, dailyGoal]);
}
