import { useState, useMemo, useCallback } from 'react';

// ─── localStorage helpers ────────────────────────────────────────────────────
function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ─── Method labels for hint text ─────────────────────────────────────────────
const METHOD_NAMES = {
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  transferencia_usd: 'Transferencia USD',
  transferencia_ves: 'Transferencia VES',
  zelle_usd: 'Zelle',
  pago_movil_ves: 'Pago móvil',
  pos_ves: 'POS',
  tarjeta_ves: 'Tarjeta',
  otros_usd: 'Otro USD',
  otros_ves: 'Otro VES',
};

// ─── Derive the top key from a frequency map ─────────────────────────────────
function topKey(freqMap) {
  if (!freqMap) return null;
  let best = null;
  let max = 0;
  for (const [k, v] of Object.entries(freqMap)) {
    if (v > max) { max = v; best = k; }
  }
  return best;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useSmartPaymentDefaults(tenantId, clientPhone) {
  // Read frequency maps once on mount (synchronous localStorage reads)
  const [methodFreq, setMethodFreq] = useState(() =>
    readJSON(`sk_pos:${tenantId}:method_freq`, {}),
  );
  const [tipFreq, setTipFreq] = useState(() =>
    readJSON(`sk_pos:${tenantId}:tip_freq`, {}),
  );
  const [clientPref, setClientPref] = useState(() =>
    clientPhone ? readJSON(`sk_pos:${tenantId}:client_pref:${clientPhone}`, null) : null,
  );

  // Derived values
  const preferredMethod = useMemo(() => topKey(methodFreq), [methodFreq]);

  const preferredTipPct = useMemo(() => {
    const key = topKey(tipFreq);
    return key !== null ? Number(key) : null;
  }, [tipFreq]);

  const clientMethod = clientPref?.method ?? null;
  const clientTipPct = clientPref?.tipPct ?? null;

  const clientHint = useMemo(() => {
    if (!clientPref || !clientPref.method || (clientPref.count || 0) < 2) return null;
    const label = METHOD_NAMES[clientPref.method] || clientPref.method;
    const name = clientPref.name || 'Este cliente';
    return `${name} siempre paga con ${label}`;
  }, [clientPref]);

  // Record a completed payment — updates all frequency maps
  const recordPayment = useCallback((methodId, tipPct, phone, clientName) => {
    if (!tenantId) return;

    // Method frequency
    const mKey = `sk_pos:${tenantId}:method_freq`;
    const mFreq = readJSON(mKey, {});
    mFreq[methodId] = (mFreq[methodId] || 0) + 1;
    writeJSON(mKey, mFreq);
    setMethodFreq({ ...mFreq });

    // Tip frequency
    const tKey = `sk_pos:${tenantId}:tip_freq`;
    const tFreq = readJSON(tKey, {});
    const tipKey = String(tipPct);
    tFreq[tipKey] = (tFreq[tipKey] || 0) + 1;
    writeJSON(tKey, tFreq);
    setTipFreq({ ...tFreq });

    // Client preference
    if (phone) {
      const cKey = `sk_pos:${tenantId}:client_pref:${phone}`;
      const prev = readJSON(cKey, { count: 0 });
      const updated = {
        method: methodId,
        tipPct,
        name: clientName || prev.name || '',
        count: (prev.count || 0) + 1,
      };
      writeJSON(cKey, updated);
      setClientPref(updated);
    }
  }, [tenantId]);

  return {
    preferredMethod,
    clientMethod,
    clientTipPct,
    preferredTipPct,
    clientHint,
    recordPayment,
  };
}
