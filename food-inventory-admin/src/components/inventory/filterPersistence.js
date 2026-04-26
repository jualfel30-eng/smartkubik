/**
 * filterPersistence.js
 * Pure localStorage helpers for persisting filter state across tab navigations.
 */

const PREFIX = 'smartkubik_filters_';

export function loadFilters(storageKey, defaults) {
  try {
    const raw = localStorage.getItem(PREFIX + storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // Validate shape matches defaults (same keys)
    if (typeof parsed !== 'object' || parsed === null) return defaults;
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (key in parsed) result[key] = parsed[key];
    }
    return result;
  } catch {
    return defaults;
  }
}

export function saveFilters(storageKey, filters) {
  try {
    localStorage.setItem(PREFIX + storageKey, JSON.stringify(filters));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function clearFilters(storageKey) {
  try {
    localStorage.removeItem(PREFIX + storageKey);
  } catch {
    // silently ignore
  }
}
