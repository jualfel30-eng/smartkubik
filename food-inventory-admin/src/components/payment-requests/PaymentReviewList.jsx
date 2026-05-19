import { Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentReviewCard } from './PaymentReviewCard';

/**
 * Empty state for when there's nothing in the queue. Tone: confident, not
 * lonely — most cashier visits should hit this state and feel like
 * "everything's clean, good job" rather than "the system is broken".
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-full bg-emerald-400/10 p-3 text-emerald-400">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-sm font-medium">No hay comprobantes por revisar</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Cuando un cliente suba un comprobante por el portal, aparecerá aquí.
      </p>
    </div>
  );
}

/**
 * Loading skeleton — three faded rows that match PaymentReviewCard's height
 * so the list doesn't jump when data arrives.
 */
function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border bg-card p-3"
          aria-hidden
        >
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        No pudimos cargar los comprobantes.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}

/**
 * Render the list state machine. Reading `data` straight from the hook —
 * the parent owns `usePaymentRequestsList` so it can call `refresh()` after
 * actions (which is how Batch D ties the badge counter to the queue).
 */
export function PaymentReviewList({
  loading,
  error,
  data = [],
  onSelect,
  onRefresh,
}) {
  if (loading && data.length === 0) return <ListSkeleton />;
  if (error && data.length === 0)
    return <ErrorState onRetry={onRefresh} />;
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2">
      {data.map((pr) => (
        <PaymentReviewCard
          key={pr._id}
          paymentRequest={pr}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
