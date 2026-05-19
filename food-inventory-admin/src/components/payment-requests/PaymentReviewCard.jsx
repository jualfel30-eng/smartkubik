import { AlertCircle, ChevronRight, Image as ImageIcon, Send } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import {
  entityNoun,
  formatProofAmount,
  getPendingProof,
  hasRejectionHistory,
  resolveProofImageUrl,
  timeAgo,
} from './_utils';

/**
 * Single card in the review queue list. One card per PaymentRequest, not
 * per proof — the detail view exposes all proofs when there are several.
 *
 * Render contract:
 *   - Customer name + entity reference + time elapsed (top row)
 *   - Pending proof thumbnail (left of metadata) — placeholder if missing
 *   - Amber "Devuelto" pill when this PR has rejection history (signals
 *     "look closer, this isn't the first attempt")
 *   - Whole card is the tap target; chevron is a visual affordance only
 */
export function PaymentReviewCard({ paymentRequest, onSelect }) {
  const pr = paymentRequest;
  const proof = getPendingProof(pr);
  const apiBase = getApiBaseUrl();
  const thumbnailUrl = proof?.imageUrl
    ? resolveProofImageUrl(proof.imageUrl, apiBase)
    : null;
  const elapsed = timeAgo(proof?.submittedAt || pr.createdAt);
  const flagged = hasRejectionHistory(pr);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(pr)}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Revisar comprobante de ${pr.entitySnapshot?.customerName || 'cliente'}`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {thumbnailUrl ? (
          // The static-served URL might be cross-origin in production;
          // referrerpolicy keeps the storefront link out of logs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">
            {pr.entitySnapshot?.customerName || 'Cliente'}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {pr.delivery?.channel === 'pending_manual' && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-rose-400/[0.12] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-300"
                title={pr.delivery?.lastError || 'El enlace no llegó al cliente. Copia y compártelo manualmente.'}
              >
                <Send className="h-3 w-3" aria-hidden />
                Sin enviar
              </span>
            )}
            {flagged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/[0.12] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                <AlertCircle className="h-3 w-3" aria-hidden />
                Devuelto
              </span>
            )}
          </div>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {entityNoun(pr.entityType)} ·{' '}
          {formatProofAmount(
            proof?.amount ?? pr.amountDue,
            proof?.currency ?? pr.currency,
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          {elapsed}
        </p>
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}
