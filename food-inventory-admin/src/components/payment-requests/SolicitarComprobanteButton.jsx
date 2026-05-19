import { useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { RequestPaymentModal } from './RequestPaymentModal';

/**
 * Inline "Solicitar comprobante" CTA for order surfaces (Order detail
 * dialog, processing drawer, etc.). Self-gates so call sites stay simple —
 * mount it unconditionally and it'll only render when the user has the
 * permission AND the order is in a state where issuing makes sense.
 *
 * Gating rules:
 *   - `payment_requests_review` permission (no permission, no button)
 *   - `order.source !== 'storefront'` — storefront orders auto-issue via
 *     the backend listener; showing this button there would create a
 *     duplicate PR
 *   - `order.paymentStatus !== 'paid'` — no point asking for proof of an
 *     already-paid order
 *
 * The "active PR exists" check is intentionally NOT implemented client-
 * side. The backend creates a new PR on each call (no dedupe by entity);
 * if we want to prevent duplicates we'd need either backend dedupe or a
 * lookup endpoint. For PR3 the rare double-issue is acceptable — the
 * cashier sees both in the review queue and can close one.
 */
export function SolicitarComprobanteButton({
  order,
  variant = 'outline',
  size = 'default',
  className,
  onCreated,
}) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);

  if (!order?._id) return null;
  if (!hasPermission('payment_requests_review')) return null;
  if (order.source === 'storefront') return null;
  if (order.paymentStatus === 'paid') return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <ReceiptText className="mr-2 h-4 w-4" aria-hidden />
        Solicitar comprobante
      </Button>

      <RequestPaymentModal
        open={open}
        onOpenChange={setOpen}
        order={order}
        onCreated={onCreated}
      />
    </>
  );
}
