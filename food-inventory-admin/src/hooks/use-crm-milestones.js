import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';

const STORAGE_KEY = 'smartkubik:crm-milestones';
const THRESHOLDS = [100, 500, 1000, 5000];

function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return { milestones: [] };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useCRMMilestones({ totalCustomers, onCelebrate }) {
  const prevRef = useRef(totalCustomers);

  useEffect(() => {
    if (!totalCustomers || totalCustomers <= 0) return;

    const state = getState();

    for (const threshold of THRESHOLDS) {
      if (totalCustomers >= threshold && !state.milestones.includes(threshold)) {
        state.milestones.push(threshold);
        saveState(state);
        toast.success(`${threshold} clientes alcanzados!`, {
          description: 'Tu base de contactos sigue creciendo.',
        });
        if (onCelebrate) {
          setTimeout(() => onCelebrate(), 300);
        }
        break;
      }
    }

    prevRef.current = totalCustomers;
  }, [totalCustomers, onCelebrate]);
}
