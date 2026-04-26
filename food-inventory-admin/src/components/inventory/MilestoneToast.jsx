/**
 * MilestoneToast.jsx
 * Tracks inventory milestones in localStorage and shows celebration toasts.
 */
import { toast } from 'sonner';
import { triggerCelebration } from '@/hooks/use-celebration';

const STORAGE_KEY = 'smartkubik_milestones';

const MILESTONES = {
  firstProduct: {
    check: (count) => count >= 1,
    message: 'Tu primer producto esta listo',
    celebrate: true,
  },
  products100: {
    check: (count) => count >= 100,
    message: '100 productos en tu catalogo',
    celebrate: true,
  },
  firstPOReceived: {
    check: (count) => count >= 1,
    message: 'Tu primera compra recibida',
    celebrate: true,
  },
  inventoryValue10K: {
    check: (value) => value >= 10000,
    message: 'Tu inventario supera los $10,000',
    celebrate: true,
  },
  zeroAlerts: {
    check: (count) => count === 0,
    message: 'Inventario al dia — sin alertas',
    celebrate: false,
  },
};

function getAchieved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function markAchieved(key) {
  const achieved = getAchieved();
  achieved[key] = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(achieved));
}

/**
 * Check a milestone. Call after relevant inventory operations.
 * @param {'firstProduct'|'products100'|'firstPOReceived'|'inventoryValue10K'|'zeroAlerts'} type
 * @param {number} currentValue - the current count/value to check against
 */
export function checkMilestone(type, currentValue) {
  const milestone = MILESTONES[type];
  if (!milestone) return;

  const achieved = getAchieved();
  if (achieved[type]) return; // Already triggered

  if (milestone.check(currentValue)) {
    markAchieved(type);
    toast.success(milestone.message, {
      duration: 5000,
      icon: '🎉',
    });
    if (milestone.celebrate) {
      setTimeout(() => triggerCelebration(), 300);
    }
  }
}
