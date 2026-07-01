import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Wallet } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function fmt(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function customerIdOf(order) {
  const c = order?.customerId;
  return c && typeof c === 'object' ? c._id : c;
}

/**
 * Aplica el saldo a favor del cliente al saldo pendiente de una orden.
 * Carga el balance al abrir y aplica el mínimo entre saldo y pendiente
 * (`POST /orders/:id/redeem-store-credit`). El backend recalcula el estado de
 * pago y dispara los hooks de "orden pagada" si queda cubierta.
 */
export function ApplyCreditDialog({ open, onClose, order, onSuccess }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const remaining = Math.max(
    0,
    (order?.totalAmount || 0) - (order?.paidAmount || 0),
  );
  const toApply = balance == null ? 0 : Math.min(balance, remaining);

  useEffect(() => {
    if (!open || !order) return;
    const cid = customerIdOf(order);
    if (!cid) {
      setBalance(0);
      return;
    }
    let active = true;
    setLoading(true);
    fetchApi(`/store-credit/${cid}`)
      .then((res) => {
        if (active) setBalance(res?.data?.balance ?? 0);
      })
      .catch(() => {
        if (active) setBalance(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, order]);

  const handleApply = async () => {
    if (!order?._id || toApply <= 0) return;
    setSubmitting(true);
    try {
      await fetchApi(`/orders/${order._id}/redeem-store-credit`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success('Saldo a favor aplicado', {
        description: `Se aplicaron ${fmt(toApply)} al saldo de la orden.`,
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error('No se pudo aplicar el saldo', {
        description: err?.message || 'Intenta de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next && !submitting) {
      setBalance(null);
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet size={18} /> Aplicar saldo a favor
          </DialogTitle>
          <DialogDescription>
            {order
              ? `#${order.orderNumber || ''} — ${order.customerName || 'Cliente'}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 px-3 py-3 text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo a favor</span>
                <span className="font-semibold">
                  {loading ? '…' : fmt(balance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pendiente de la orden</span>
                <span className="font-semibold">{fmt(remaining)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <span className="text-muted-foreground">A aplicar</span>
                <span className="font-semibold text-primary">{fmt(toApply)}</span>
              </div>
            </div>

            {!loading && balance != null && balance <= 0 && (
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene saldo a favor disponible.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                disabled={submitting || loading || toApply <= 0}
              >
                {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                Aplicar {fmt(toApply)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ApplyCreditDialog;
