import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import Celebration from '@/components/Celebration';
import {
  usePaymentRequestActions,
  usePaymentRequestsList,
} from '@/hooks/use-payment-requests';
import { PaymentReviewDetail } from './PaymentReviewDetail';
import { PaymentReviewList } from './PaymentReviewList';

/**
 * Cross-app review surface. Drawer on mobile (slides from bottom with
 * drag-to-dismiss), centered dialog on desktop.
 *
 * Two views, single component lifecycle:
 *   - List: pending PaymentRequests waiting for the tenant's action
 *   - Detail: zoom into one PR, accept/reject/awaiting actions
 *
 * The transition between them lives in local state — never closes the
 * sheet, never navigates. The cashier can flip back and forth from any
 * card to triage in seconds.
 *
 * Props
 *   open / onOpenChange — Radix-style controlled state from the parent
 *     (badge in the navbar, "Revisar" toast, etc.)
 *   onListChange?(count) — fired with the new pending count whenever the
 *     list refreshes; lets the badge invalidate without a separate poll
 *   initialPaymentRequestId? — deep-link from a notification opens the
 *     sheet pre-focused on a specific PR
 */
export function PaymentReviewSheet({
  open,
  onOpenChange,
  onListChange,
  initialPaymentRequestId,
}) {
  const [selectedId, setSelectedId] = useState(initialPaymentRequestId || null);
  const [celebrate, setCelebrate] = useState(false);

  const list = usePaymentRequestsList({
    status: 'submitted',
    page: 1,
    limit: 50,
    enabled: open,
  });
  const actions = usePaymentRequestActions();

  // Bubble the pending count up so the navbar badge can update without a
  // duplicate fetch. Two guards against runaway re-fires:
  //   1. `onListChange` is captured via a ref so it doesn't appear in the
  //      effect's dep array — parents passing inline arrows (() => refresh())
  //      no longer trigger an effect every render.
  //   2. The bubble only fires while the sheet is open. When closed the
  //      parent badge has its own poll; nothing to bubble.
  const onListChangeRef = useRef(onListChange);
  useEffect(() => {
    onListChangeRef.current = onListChange;
  }, [onListChange]);

  useEffect(() => {
    if (!open) return;
    if (list.loading) return;
    onListChangeRef.current?.(list.total);
  }, [open, list.loading, list.total]);

  // Reset selection when the sheet closes — opening again should land on
  // the queue, not a stale detail view.
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setCelebrate(false);
    } else if (initialPaymentRequestId) {
      setSelectedId(initialPaymentRequestId);
    }
  }, [initialPaymentRequestId, open]);

  const selected = selectedId
    ? list.data.find((pr) => pr._id === selectedId)
    : null;

  const handleMutated = useCallback(
    async (updated) => {
      // Always refresh — the list filter is `status === 'submitted'` so any
      // confirm/reject/awaiting moves the PR out of the queue.
      await list.refresh();
      if (updated?.status === 'confirmed') {
        setCelebrate(true);
        // Close detail after a beat so the cashier sees the green confetti
        // before being kicked back to the (now shorter) queue.
        setTimeout(() => setSelectedId(null), 900);
      } else {
        setSelectedId(null);
      }
    },
    [list],
  );

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          {selected ? (
            <>
              <ResponsiveDialogHeader className="sr-only">
                <ResponsiveDialogTitle>Revisar comprobante</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Confirma o pide corrección del comprobante subido por el cliente.
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <PaymentReviewDetail
                paymentRequest={selected}
                onBack={() => setSelectedId(null)}
                actions={actions}
                onMutated={handleMutated}
              />
            </>
          ) : (
            <>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>
                  Comprobantes por revisar
                  {!list.loading && list.total > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {list.total}
                    </span>
                  )}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Toca un comprobante para revisarlo y confirmarlo.
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <div className="px-1 pt-2 sm:px-0">
                <PaymentReviewList
                  loading={list.loading}
                  error={list.error}
                  data={list.data}
                  onSelect={(pr) => setSelectedId(pr._id)}
                  onRefresh={list.refresh}
                />
              </div>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <Celebration
        active={celebrate}
        onComplete={() => setCelebrate(false)}
      />
    </>
  );
}
