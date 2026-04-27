import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { triggerCelebration } from '@/hooks/use-celebration';

/**
 * useModuleMilestones — Generalized milestone/celebration hook for any module.
 *
 * Usage:
 *   useModuleMilestones({
 *     moduleKey: 'cash-register',
 *     milestones: [
 *       { key: 'firstClose', condition: (d) => d.closingsToday > 0, message: 'Primer cierre!', confetti: true },
 *       { key: 'balanced', condition: (d) => d.balanced, message: 'Cierre perfecto' },
 *     ],
 *     data: { closingsToday, balanced },
 *   });
 */

const STORAGE_PREFIX = 'smartkubik_milestones_';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getOrResetState(moduleKey) {
  const storageKey = STORAGE_PREFIX + moduleKey;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.date === getTodayKey()) return stored;
    }
  } catch { /* ignore */ }
  const fresh = { date: getTodayKey(), fired: [] };
  localStorage.setItem(storageKey, JSON.stringify(fresh));
  return fresh;
}

function saveState(moduleKey, state) {
  localStorage.setItem(STORAGE_PREFIX + moduleKey, JSON.stringify(state));
}

export function useModuleMilestones({ moduleKey, milestones = [], data }) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!moduleKey || !data) return;

    const state = getOrResetState(moduleKey);
    const isFirstRender = !initializedRef.current;
    initializedRef.current = true;

    for (const milestone of milestones) {
      if (state.fired.includes(milestone.key)) continue;
      if (!milestone.condition(data)) continue;

      state.fired.push(milestone.key);
      saveState(moduleKey, state);

      // Don't celebrate on first render (page load) — only on live changes
      if (isFirstRender) continue;

      toast.success(milestone.message, { duration: milestone.duration || 5000 });

      if (milestone.confetti) {
        setTimeout(() => triggerCelebration(), 300);
      }
    }
  }, [moduleKey, milestones, data]);
}
