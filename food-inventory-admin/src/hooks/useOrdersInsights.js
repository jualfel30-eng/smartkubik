import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = (tenantId) => `smk_orders_lastInsight_${tenantId || 'anon'}`;

function readLastInsightId(tenantId) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY(tenantId));
  } catch {
    return null;
  }
}

function writeLastInsightId(tenantId, id) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY(tenantId), id);
  } catch {
    // ignore
  }
}

function fmtCurrency(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function topByCount(arr, accessor) {
  const counts = new Map();
  arr.forEach((item) => {
    const k = accessor(item);
    if (!k) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  let bestKey = null;
  let bestCount = 0;
  counts.forEach((v, k) => {
    if (v > bestCount) { bestCount = v; bestKey = k; }
  });
  return { key: bestKey, count: bestCount };
}

function topClient(orders) {
  const totals = new Map();
  orders.forEach((o) => {
    const name = o.customerName;
    if (!name) return;
    const prev = totals.get(name) || { count: 0, sum: 0 };
    prev.count += 1;
    prev.sum += Number(o.totalAmount) || 0;
    totals.set(name, prev);
  });
  let bestKey = null;
  let bestCount = 0;
  let bestSum = 0;
  totals.forEach((v, k) => {
    if (v.count > bestCount) { bestCount = v.count; bestKey = k; bestSum = v.sum; }
  });
  return bestKey ? { name: bestKey, count: bestCount, sum: bestSum } : null;
}

function peakHour(orders) {
  const buckets = new Array(24).fill(0);
  let counted = 0;
  orders.forEach((o) => {
    if (!o.createdAt) return;
    const d = new Date(o.createdAt);
    if (Number.isNaN(d.getTime())) return;
    buckets[d.getHours()] += 1;
    counted += 1;
  });
  if (counted < 5) return null;
  let bestH = 0;
  let bestC = 0;
  buckets.forEach((c, h) => { if (c > bestC) { bestC = c; bestH = h; } });
  const pct = Math.round((bestC / counted) * 100);
  return { hour: bestH, pct };
}

function paidIn24hRate(orders) {
  const sample = orders.filter((o) => o.paymentStatus === 'paid' && o.createdAt && o.updatedAt);
  if (sample.length < 5) return null;
  const fast = sample.filter((o) => {
    const created = new Date(o.createdAt).getTime();
    const updated = new Date(o.updatedAt).getTime();
    return Number.isFinite(created) && Number.isFinite(updated) && updated - created <= 24 * 60 * 60 * 1000;
  });
  return Math.round((fast.length / sample.length) * 100);
}

export function buildInsights(orders = []) {
  const insights = [];

  if (!orders || orders.length === 0) {
    return insights;
  }

  const client = topClient(orders);
  if (client && client.count >= 2) {
    insights.push({
      id: 'top-client',
      icon: '👤',
      text: `Cliente más frecuente: ${client.name} (${client.count} órdenes, ${fmtCurrency(client.sum)})`,
    });
  }

  const peak = peakHour(orders);
  if (peak) {
    const next = (peak.hour + 2) % 24;
    insights.push({
      id: 'peak-hour',
      icon: '⏰',
      text: `Tu hora pico: ${String(peak.hour).padStart(2, '0')}:00–${String(next).padStart(2, '0')}:00 (${peak.pct}% del volumen)`,
    });
  }

  const seller = topByCount(orders, (o) => o.assignedTo?.name || o.assignedTo);
  if (seller.key && seller.count >= 2) {
    insights.push({
      id: 'top-seller',
      icon: '🏅',
      text: `Vendedor top: ${seller.key} (${seller.count} órdenes)`,
    });
  }

  const paidRate = paidIn24hRate(orders);
  if (paidRate !== null) {
    insights.push({
      id: 'paid-rate',
      icon: '⚡',
      text: `Tasa de cobro <24h: ${paidRate}% — el resto requiere seguimiento`,
    });
  }

  return insights;
}

/**
 * useOrdersInsights — pick ONE insight per session, rotating to avoid repeating
 * the last one shown. Falls back to onboarding message when dataset is small.
 */
export function useOrdersInsights(tenantId, orders = []) {
  const insights = useMemo(() => buildInsights(orders), [orders]);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (insights.length === 0) {
      setPicked({
        id: 'onboarding',
        icon: '✨',
        text: 'Cuando tengas más órdenes, aquí verás patrones de tu negocio.',
      });
      return;
    }
    const lastId = readLastInsightId(tenantId);
    const candidates = insights.filter((i) => i.id !== lastId);
    const pool = candidates.length > 0 ? candidates : insights;
    const next = pool[Math.floor(Math.random() * pool.length)];
    writeLastInsightId(tenantId, next.id);
    setPicked(next);
  }, [tenantId, insights]);

  return picked;
}

export default useOrdersInsights;
