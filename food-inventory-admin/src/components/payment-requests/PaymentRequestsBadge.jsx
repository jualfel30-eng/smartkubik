import { useCallback, useEffect, useRef, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useNotification } from '@/context/NotificationContext';
import { usePendingPaymentRequestsCount } from '@/hooks/use-payment-requests';
import { PaymentReviewSheet } from './PaymentReviewSheet';

const PAYMENT_REQUEST_TYPES = new Set([
  'payment-request.submitted',
  'payment-request.confirmed',
  'payment-request.status-changed',
]);

/**
 * Navbar action that:
 *   1. Shows a count of `submitted` PaymentRequests waiting for review.
 *   2. Opens the PaymentReviewSheet on click — the actual review UX.
 *   3. Refreshes immediately when a `payment-request.*` notification
 *      arrives via Socket.IO (in addition to the hook's 60 s poll).
 *
 * Hidden if the user lacks `payment_requests_review` — no orphan icon
 * with a permanent zero badge, no info leakage about a feature they
 * can't use.
 *
 * The badge's only state is "is there work to do" — we don't need a
 * dropdown preview because the sheet does that better.
 */
export function PaymentRequestsBadge() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission('payment_requests_review');

  const { count, refresh } = usePendingPaymentRequestsCount({
    enabled: allowed,
  });
  const [open, setOpen] = useState(false);

  // Stable callback for the sheet's onListChange. Without this, every parent
  // render creates a new arrow function, which trips the sheet's
  // bubble-effect dependency and causes an infinite re-fetch loop.
  const handleListChange = useCallback(() => {
    refresh();
  }, [refresh]);

  // Reactively invalidate on socket notifications. We watch the head of
  // `centerNotifications` (which NotificationContext prepends on each
  // arrival) and refresh when the newest one is a payment-request event.
  // Comparing by `_id` avoids re-firing on unrelated context re-renders.
  const { centerNotifications } = useNotification();
  const lastSeenIdRef = useRef(null);

  useEffect(() => {
    if (!allowed) return;
    const head = centerNotifications?.[0];
    if (!head?._id) return;
    if (head._id === lastSeenIdRef.current) return;
    lastSeenIdRef.current = head._id;
    if (PAYMENT_REQUEST_TYPES.has(head.type)) {
      refresh();
    }
  }, [allowed, centerNotifications, refresh]);

  if (!allowed) return null;

  const hasCount = count > 0;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title={
          hasCount
            ? `${count} comprobante${count === 1 ? '' : 's'} por revisar`
            : 'Solicitudes de pago'
        }
        aria-label={
          hasCount
            ? `Revisar ${count} comprobante${count === 1 ? '' : 's'} pendiente${count === 1 ? '' : 's'}`
            : 'Solicitudes de pago'
        }
        className="relative text-sidebar-foreground/65 hover:text-sidebar-foreground/80"
      >
        <ReceiptText size={16} />
        {hasCount && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-sidebar"
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>

      <PaymentReviewSheet
        open={open}
        onOpenChange={setOpen}
        onListChange={handleListChange}
      />
    </>
  );
}
