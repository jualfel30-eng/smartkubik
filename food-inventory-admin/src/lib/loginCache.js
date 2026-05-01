/**
 * Login cache utilities — persists "welcome back" data across sessions.
 * Keys are prefixed `smartkubik_` so they cannot collide with auth storage
 * (use-auth.jsx writes accessToken / user / tenant; this module is purely
 * presentational metadata for the LoginV2 page).
 */

const KEYS = {
  LAST_USER: 'smartkubik_last_user',
  LAST_ROUTE: 'smartkubik_last_route',
  STREAK: 'smartkubik_login_streak',
  STATS: 'smartkubik_last_stats',
};

const STATS_TTL_MS = 24 * 60 * 60 * 1000;

const safeParse = (raw) => {
  if (!raw || raw === 'undefined') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — non-critical */
  }
};

export const getLastUser = () => safeParse(localStorage.getItem(KEYS.LAST_USER));

export const setLastUser = ({ email, firstName, tenantName, vertical, lastLoginAt }) => {
  if (!email) return;
  writeJson(KEYS.LAST_USER, {
    email,
    firstName: firstName || '',
    tenantName: tenantName || '',
    vertical: vertical || '',
    lastLoginAt: lastLoginAt || new Date().toISOString(),
  });
};

export const clearLastUser = () => {
  localStorage.removeItem(KEYS.LAST_USER);
  localStorage.removeItem(KEYS.STREAK);
  localStorage.removeItem(KEYS.STATS);
};

export const getLastRoute = () => {
  const raw = localStorage.getItem(KEYS.LAST_ROUTE);
  if (!raw || raw === '/' || raw.startsWith('/login') || raw.startsWith('/register')) {
    return null;
  }
  return raw;
};

export const setLastRoute = (path) => {
  if (!path) return;
  if (path.startsWith('/login') || path.startsWith('/register')) return;
  localStorage.setItem(KEYS.LAST_ROUTE, path);
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const daysBetween = (a, b) => {
  const ms = 24 * 60 * 60 * 1000;
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bDay - aDay) / ms);
};

/**
 * Returns the current streak without mutating it. Used by StreakIndicator
 * during the pre-login render (we know who they are from getLastUser).
 */
export const getStreak = () => {
  const data = safeParse(localStorage.getItem(KEYS.STREAK));
  if (!data || typeof data.count !== 'number') return 0;
  if (!data.lastDate) return 0;
  const last = new Date(data.lastDate);
  const today = new Date();
  const diff = daysBetween(last, today);
  if (diff <= 1) return data.count;
  return 0;
};

/**
 * Updates the streak after a successful login:
 *  - same day  → keep
 *  - yesterday → +1
 *  - older     → reset to 1
 */
export const recordLoginForStreak = () => {
  const data = safeParse(localStorage.getItem(KEYS.STREAK));
  const today = new Date();
  if (!data || !data.lastDate) {
    writeJson(KEYS.STREAK, { count: 1, lastDate: today.toISOString() });
    return 1;
  }
  const last = new Date(data.lastDate);
  if (sameDay(last, today)) return data.count;
  const diff = daysBetween(last, today);
  const next = diff === 1 ? data.count + 1 : 1;
  writeJson(KEYS.STREAK, { count: next, lastDate: today.toISOString() });
  return next;
};

export const getCachedStats = () => {
  const data = safeParse(localStorage.getItem(KEYS.STATS));
  if (!data || !data.savedAt) return null;
  if (Date.now() - new Date(data.savedAt).getTime() > STATS_TTL_MS) {
    return null;
  }
  return data.stats || null;
};

export const setCachedStats = (stats) => {
  if (!stats) return;
  writeJson(KEYS.STATS, { savedAt: new Date().toISOString(), stats });
};

export const LOGIN_CACHE_KEYS = KEYS;
