import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, RotateCcw, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function fmt(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Líneas devolubles de la orden: cantidad pendiente = vendida − ya devuelta.
function buildLines(order) {
  return (order?.items || []).map((it) => {
    const remaining = (it.quantity || 0) - (it.returnedQuantity || 0);
    const unitValue = it.quantity ? (it.totalPrice || 0) / it.quantity : 0;
    return {
      id: it._id,
      name: it.productName || it.productSku,
      unit: it.selectedUnit,
      remaining,
      unitValue,
    };
  });
}

/**
 * Devolución de una orden con reembolso en efectivo.
 *
 * - **Total**: devuelve todo lo pendiente (un clic).
 * - **Parcial**: el cajero elige qué ítems y cuánto; el reembolso es
 *   proporcional a lo pagado (el backend es la fuente de verdad; aquí sólo se
 *   estima en vivo).
 *
 * Reembolso: **efectivo** (sale de la caja abierta) o **saldo a favor** (se
 * acredita al cliente, no toca caja). Efectivo requiere una sesión de caja
 * abierta; si no la hay, el backend responde con el error y lo mostramos tal
 * cual.
 *
 * Modo **cambio** (`exchange`): la devolución se hace SIEMPRE a saldo a favor y
 * al confirmar redirige al POS para crear la orden nueva (el saldo se aplica al
 * cobrarla). Reutiliza el selector de ítems.
 */
export function ReturnDialog({ open, onClose, order, onSuccess, exchange = false }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('total');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [qty, setQty] = useState({}); // orderItemId → cantidad a devolver
  const [submitting, setSubmitting] = useState(false);

  const lines = useMemo(() => buildLines(order), [order]);
  const returnable = lines.filter((l) => l.remaining > 0);

  const partialItems = useMemo(
    () =>
      returnable
        .map((l) => ({ orderItemId: l.id, quantity: Number(qty[l.id]) || 0 }))
        .filter((i) => i.quantity > 0),
    [returnable, qty],
  );

  const estimatedRefund = useMemo(() => {
    if (mode === 'total') return order?.paidAmount || order?.totalAmount || 0;
    return partialItems.reduce((sum, i) => {
      const line = returnable.find((l) => l.id === i.orderItemId);
      return sum + (line ? line.unitValue * i.quantity : 0);
    }, 0);
  }, [mode, order, partialItems, returnable]);

  const reset = () => {
    setMode('total');
    setRefundMethod('cash');
    setReason('');
    setQty({});
  };

  const setLineQty = (line, raw) => {
    const n = Math.max(0, Math.min(line.remaining, Number(raw) || 0));
    setQty((prev) => ({ ...prev, [line.id]: n }));
  };

  const handleConfirm = async () => {
    if (!order?._id) return;
    if (mode === 'partial' && partialItems.length === 0) {
      toast.error('Selecciona al menos un ítem y cantidad a devolver');
      return;
    }
    setSubmitting(true);
    try {
      const body = { reason: reason.trim() || undefined };
      if (mode === 'partial') body.items = partialItems;

      if (exchange) {
        // El backend fuerza store_credit y marca isExchange; devuelve el saldo.
        const res = await fetchApi(`/orders/${order._id}/exchange`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const data = res?.data || {};
        reset();
        onClose?.();
        toast.success('Devolución del cambio lista', {
          description: `Crea la orden nueva; el saldo de ${fmt(
            data.storeCreditBalance,
          )} se aplicará al cobrar.`,
        });
        // Redirige al POS con el cliente + saldo para completar el cambio.
        navigate('/orders/new', {
          state: {
            exchange: {
              customerId: data.customerId,
              customerName: data.customerName || order.customerName,
              customerPhone: order.customerPhone,
              customerRif: order.customerRif,
              credit: data.storeCreditBalance,
            },
          },
        });
        return;
      }

      body.refundMethod = refundMethod;
      await fetchApi(`/orders/${order._id}/returns`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('Devolución registrada', {
        description: `${mode === 'partial' ? 'Devolución parcial' : 'Devolución total'} — se reintegró el stock y ${
          refundMethod === 'store_credit'
            ? 'se acreditó saldo a favor del cliente.'
            : 'se reembolsó en efectivo.'
        }`,
      });
      reset();
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error('No se pudo procesar la devolución', {
        description: err?.message || 'Intenta de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next && !submitting) {
      reset();
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {exchange ? (
              <>
                <ArrowLeftRight size={18} /> Cambiar por otro producto
              </>
            ) : (
              <>
                <RotateCcw size={18} /> Devolver orden
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {order
              ? `#${order.orderNumber || ''} — ${order.customerName || 'Cliente'}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            {/* Selector Total / Parcial */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'total', label: 'Total' },
                { id: 'partial', label: 'Parcial' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium tap-target no-tap-highlight',
                    mode === opt.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Método de reembolso (en cambio se fuerza a saldo a favor) */}
            {!exchange && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Reembolsar como
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Efectivo' },
                  { id: 'store_credit', label: 'Saldo a favor' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRefundMethod(opt.id)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium tap-target no-tap-highlight',
                      refundMethod === opt.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Selector de ítems (sólo parcial) */}
            {mode === 'partial' && (
              <div className="rounded-xl border border-border divide-y divide-border">
                {returnable.length === 0 && (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    No quedan ítems pendientes por devolver.
                  </p>
                )}
                {returnable.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pendiente: {line.remaining}
                        {line.unit ? ` ${line.unit}` : ''} · {fmt(line.unitValue)} c/u
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={line.remaining}
                      value={qty[line.id] ?? ''}
                      onChange={(e) => setLineQty(line, e.target.value)}
                      placeholder="0"
                      className="w-20 text-right"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Resumen del reembolso */}
            <div className="rounded-xl bg-muted/40 px-3 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {exchange
                    ? 'Crédito para la orden nueva'
                    : mode === 'partial'
                      ? 'Reembolso estimado'
                      : refundMethod === 'store_credit'
                        ? 'A acreditar (saldo a favor)'
                        : 'A reembolsar (efectivo)'}
                </span>
                <span className="font-semibold">{fmt(estimatedRefund)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {exchange
                  ? 'Se devuelve a saldo a favor. Luego crea la orden nueva en el POS; el saldo se aplica al cobrar y el sobrante queda a favor del cliente.'
                  : refundMethod === 'store_credit'
                    ? 'Se acredita como saldo a favor del cliente para futuras compras (no sale dinero de la caja).'
                    : mode === 'partial'
                      ? 'El monto exacto lo calcula el sistema, proporcional a lo pagado.'
                      : 'Se devuelven todos los ítems al inventario y el dinero sale de la caja abierta.'}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                {exchange || refundMethod === 'store_credit'
                  ? 'La devolución no se puede deshacer.'
                  : 'Requiere una sesión de caja abierta. La devolución no se puede deshacer.'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="return-reason">Motivo (opcional)</Label>
              <Textarea
                id="return-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Producto defectuoso, cliente insatisfecho…"
                rows={3}
                maxLength={500}
              />
            </div>

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
                onClick={handleConfirm}
                disabled={submitting || (mode === 'partial' && partialItems.length === 0)}
              >
                {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                {exchange ? 'Devolver y crear orden nueva' : 'Confirmar devolución'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReturnDialog;
