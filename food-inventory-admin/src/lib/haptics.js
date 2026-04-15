/**
 * Haptics helpers — SmartKubik mobile
 * Uses the Vibration API where available. No-op on desktop and unsupported devices.
 * Keep patterns short: iOS Safari ignores vibrate() entirely, Android honors it.
 */

const canVibrate = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.vibrate === 'function';

const fire = (pattern) => {
  if (!canVibrate()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
};

export const tap = () => fire(8);
export const select = () => fire(12);
export const impact = () => fire(18);
export const success = () => fire([10, 40, 20]);
export const warning = () => fire([20, 60, 20]);
export const error = () => fire([30, 30, 30, 30, 30]);

export const haptics = { tap, select, impact, success, warning, error };
export default haptics;
