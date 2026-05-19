/**
 * Tiny helpers shared across the Payment Requests UI. Kept colocated and
 * underscore-prefixed so the folder feels like a self-contained feature.
 */

/**
 * Renders a Date-ish value as "Hace 2 min" / "Hace 1 hora" / "Hace 3 días".
 * Intentionally coarse — the cashier wants to triage by recency, not see
 * an exact timestamp.
 */
export function timeAgo(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return 'Hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} día${days === 1 ? '' : 's'}`;
  return date.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format an amount in the proof's currency. Compact-ish — fits the card
 * line ("$24.50") and the detail header alike.
 */
export function formatProofAmount(amount, currency) {
  const n = Number(amount) || 0;
  if (currency === 'VES') {
    return `${n.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Bs`;
  }
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Pulls the most recently submitted proof that the tenant hasn't acted on
 * yet. The review queue's mental model: "this is the proof I need to look at."
 */
export function getPendingProof(pr) {
  if (!pr?.proofs?.length) return null;
  // Walk in reverse — most recent submissions land at the end of the array
  for (let i = pr.proofs.length - 1; i >= 0; i -= 1) {
    if (pr.proofs[i].reviewStatus === 'pending') return pr.proofs[i];
  }
  return pr.proofs[pr.proofs.length - 1];
}

/**
 * True when the PaymentRequest has at least one rejected proof — surfaces
 * as the amber "Devuelto" pill so the cashier knows to look closer.
 */
export function hasRejectionHistory(pr) {
  return (pr?.events || []).some((e) => e?.type === 'proof.rejected');
}

/**
 * Human-readable label for the polymorphic entity link. Lets the card line
 * say "Pedido", "Cita", or "Factura" without each call site repeating it.
 */
export function entityNoun(entityType) {
  if (entityType === 'appointment') return 'Cita';
  if (entityType === 'invoice') return 'Factura';
  return 'Pedido';
}

/**
 * The static URL prefix the backend serves uploads from. For local-disk
 * storage adapter, this is the same origin as the API; for the future R2
 * adapter the URL will already be absolute and this passthrough still works.
 */
export function resolveProofImageUrl(rawUrl, apiBaseUrl) {
  if (!rawUrl) return '';
  if (/^https?:/i.test(rawUrl)) return rawUrl;
  if (!apiBaseUrl) return rawUrl;
  const base = apiBaseUrl.endsWith('/api/v1')
    ? apiBaseUrl.slice(0, -'/api/v1'.length)
    : apiBaseUrl;
  return `${base}${rawUrl}`;
}
