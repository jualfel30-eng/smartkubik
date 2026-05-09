/**
 * Pure function: classifies a payment event into a celebration tier.
 *
 * Rationale (Lembke, Dopamine Nation 2021): over-rewarding trivial events
 * desensitizes the operator and weakens future peaks. Calibrate to monto absoluto
 * AND rareza relativa al tenant.
 *
 *   subtle    — habitual cobro (<$100)
 *   standard  — meaningful cobro ($100..weeklyMaxAmount)
 *   milestone — breaks the weekly record (>weeklyMaxAmount)
 *
 * `weeklyMaxAmount` should be the largest single payment in the last 7 days for
 * this tenant. If unknown, pass null/undefined and we fall back to amount-only.
 */

const SUBTLE_CAP = 100;
const STANDARD_CAP = 500;

export function getCelebrationTier({ amount = 0, weeklyMaxAmount } = {}) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return 'subtle';
  }

  if (typeof weeklyMaxAmount === 'number' && weeklyMaxAmount > 0) {
    if (amount > weeklyMaxAmount) return 'milestone';
    if (amount >= SUBTLE_CAP) return 'standard';
    return 'subtle';
  }

  if (amount > STANDARD_CAP) return 'milestone';
  if (amount >= SUBTLE_CAP) return 'standard';
  return 'subtle';
}

export default getCelebrationTier;
