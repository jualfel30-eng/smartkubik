import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, tapScale } from '@/lib/motion';
import { useAuth } from '@/hooks/use-auth';
import { usePendingPaymentRequestsCount } from '@/hooks/use-payment-requests';
import { PaymentReviewSheet } from './PaymentReviewSheet';

/**
 * Discoverable chip that lives next to the regular filter chips on the
 * Orders page (and reusable elsewhere). Not actually a filter — it's a
 * CTA: tap it and the review sheet opens.
 *
 * The visual language stays in the filter-strip family (rounded-full pill,
 * same height) so it doesn't feel grafted on. Amber tint when there's
 * pending work, neutral when the queue is empty.
 *
 * Hidden when:
 *   - User lacks `payment_requests_review` (no orphan CTA)
 *   - Queue is empty AND `hideWhenEmpty` is set (default false; pages may
 *     want it to remain as a discoverable "0" affordance)
 */
export function PaymentReviewChip({ className, hideWhenEmpty = false }) {
  const { hasPermission } = useAuth();
  const allowed = hasPermission('payment_requests_review');

  const { count, refresh } = usePendingPaymentRequestsCount({
    enabled: allowed,
  });
  const [open, setOpen] = useState(false);

  const handleListChange = useCallback(() => {
    refresh();
  }, [refresh]);

  if (!allowed) return null;
  if (hideWhenEmpty && count === 0) return null;

  const hasWork = count > 0;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={tapScale}
        transition={SPRING.snappy}
        className={cn(
          'shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium no-tap-highlight transition-colors',
          hasWork
            ? 'border-amber-400/40 bg-amber-400/[0.10] text-amber-200 hover:bg-amber-400/[0.16]'
            : 'border-border bg-card text-foreground hover:bg-muted/60',
          className,
        )}
        aria-label={
          hasWork
            ? `Revisar ${count} comprobante${count === 1 ? '' : 's'}`
            : 'Solicitudes de pago'
        }
      >
        <ReceiptText className="h-3.5 w-3.5" aria-hidden />
        <span>Por confirmar</span>
        {hasWork && (
          <span className="ml-0.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-amber-400/25 px-1.5 text-[11px] font-semibold text-amber-100">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </motion.button>

      <PaymentReviewSheet
        open={open}
        onOpenChange={setOpen}
        onListChange={handleListChange}
      />
    </>
  );
}
