// badge-events.js — pure client-side event bus for real-time badge updates
// No React, no WebSockets — just a Set of listeners + 2 functions.

const listeners = new Set();

/**
 * Emit a badge update event to all registered listeners.
 * @param {{ type?: string, delta?: number }} [hint] — optional context about what changed
 */
export function emitBadgeUpdate(hint) {
  listeners.forEach((fn) => fn(hint));
}

/**
 * Register a listener for badge update events.
 * @param {function} fn
 * @returns {function} unsubscribe function
 */
export function onBadgeUpdate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
