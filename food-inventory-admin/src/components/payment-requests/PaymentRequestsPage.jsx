import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReceiptText, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { usePendingPaymentRequestsCount } from '@/hooks/use-payment-requests';
import { PaymentReviewSheet } from './PaymentReviewSheet';

/**
 * Tenant-side full-page view for the Payment Requests queue. The actual
 * review UX lives in `PaymentReviewSheet` — this page is the deep-link
 * landing for "Revisar" actions on notifications and a manual entry point
 * from the URL bar.
 *
 * When the route is hit with `?id=<prId>`, the sheet auto-opens focused
 * on that specific PR (Batch D wires the notification action to land here).
 */
export default function PaymentRequestsPage() {
  const { hasPermission, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || null;
  const [sheetOpen, setSheetOpen] = useState(Boolean(initialId));

  const { count, refresh } = usePendingPaymentRequestsCount({
    enabled: hasPermission('payment_requests_review'),
  });

  const handleListChange = useCallback(() => {
    refresh();
  }, [refresh]);

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (!hasPermission('payment_requests_review')) {
    return <AccessDenied />;
  }

  const handleSheetChange = (next) => {
    setSheetOpen(next);
    if (!next) {
      // Drop the deep-link param so a refresh doesn't reopen the same PR
      if (searchParams.has('id')) {
        const params = new URLSearchParams(searchParams);
        params.delete('id');
        setSearchParams(params, { replace: true });
      }
      // Refresh the badge count after the user closes the sheet — the
      // sheet calls onListChange while open, but a manual refresh on close
      // covers external mutations (other tabs, other devices).
      refresh();
    }
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Solicitudes de pago
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa y confirma los comprobantes que los clientes han subido.
          </p>
        </header>

        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ReceiptText className="h-6 w-6" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold">
                {count === 0
                  ? 'No hay comprobantes por revisar'
                  : count === 1
                    ? '1 comprobante esperando revisión'
                    : `${count} comprobantes esperando revisión`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {count === 0
                  ? 'Cuando un cliente suba un comprobante por el portal aparecerá aquí.'
                  : 'Acepta, pide corrección o cierra cada uno desde el panel de revisión.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={() => setSheetOpen(true)} size="lg">
                  {count > 0 ? 'Revisar ahora' : 'Abrir panel'}
                </Button>
                <Button variant="outline" onClick={refresh}>
                  Actualizar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          También puedes abrir este panel desde la campana de notificaciones
          o directamente desde una orden.
        </p>
      </div>

      <PaymentReviewSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        onListChange={handleListChange}
        initialPaymentRequestId={initialId}
      />
    </>
  );
}

function AccessDenied() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 p-10 text-center">
      <ShieldAlert className="h-10 w-10 text-amber-500" aria-hidden />
      <h2 className="text-lg font-semibold">Sin acceso</h2>
      <p className="text-sm text-muted-foreground">
        No tienes el permiso{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          payment_requests_review
        </code>
        . Pídele al administrador del negocio que te lo otorgue desde
        Configuración → Roles.
      </p>
      <a
        href="/dashboard"
        className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
      >
        Volver al dashboard
      </a>
    </div>
  );
}
