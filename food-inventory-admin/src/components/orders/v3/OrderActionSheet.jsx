import { Eye, FileText, ChefHat, MessageCircle, XCircle, Receipt, RotateCcw } from 'lucide-react';
import MobileActionSheet from '@/components/mobile/MobileActionSheet';
import { cn } from '@/lib/utils';
import { getPrimaryCTA } from '@/lib/orders/getPrimaryCTA';
import haptics from '@/lib/haptics';

const SECONDARY_ACTIONS = [
  { id: 'view-detail', label: 'Ver detalle completo', icon: Eye },
  { id: 'invoice', label: 'Generar factura', icon: Receipt, requires: 'paid' },
  { id: 'view-invoice', label: 'Ver factura', icon: FileText, requires: 'has-invoice' },
  { id: 'kitchen', label: 'Enviar a cocina', icon: ChefHat, requires: 'restaurant' },
  { id: 'notify', label: 'Notificar al cliente', icon: MessageCircle },
  { id: 'reopen', label: 'Reabrir orden', icon: RotateCcw, requires: 'cancelled' },
  { id: 'cancel', label: 'Cancelar orden', icon: XCircle, danger: true, requires: 'not-cancelled' },
];

function passesRequires(action, ctx) {
  if (!action.requires) return true;
  switch (action.requires) {
    case 'paid':
      return ctx.isPaid && !ctx.hasInvoice;
    case 'has-invoice':
      return ctx.hasInvoice;
    case 'restaurant':
      return ctx.restaurantEnabled;
    case 'cancelled':
      return ctx.isCancelled;
    case 'not-cancelled':
      return !ctx.isCancelled;
    default:
      return true;
  }
}

function fmt(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OrderActionSheet({
  open,
  onClose,
  order,
  restaurantEnabled = false,
  onPrimary,
  onSecondary,
}) {
  if (!order) {
    return <MobileActionSheet open={open} onClose={onClose} title="Orden" />;
  }

  const cta = getPrimaryCTA(order);
  const isPaid = order.paymentStatus === 'paid';
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const hasInvoice = Boolean(order.billingDocumentId);
  const ctx = { isPaid, isCancelled, hasInvoice, restaurantEnabled };

  const handlePrimary = () => {
    haptics.select();
    onPrimary?.(cta, order);
  };

  const handleSecondary = (actionId) => {
    haptics.tap();
    onSecondary?.(actionId, order);
  };

  return (
    <MobileActionSheet
      open={open}
      onClose={onClose}
      title={`#${order.orderNumber || ''} — ${order.customerName || 'Cliente'}`}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Total {fmt(order.totalAmount)} · {isPaid ? 'Pagada' : 'Pendiente'}
        </div>

        {cta.id !== 'view' && cta.id !== 'noop' && (
          <button
            type="button"
            onClick={handlePrimary}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-base shadow-sm tap-target no-tap-highlight',
              cta.variant === 'outline'
                ? 'border border-border'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {cta.label}
          </button>
        )}
        {cta.subLabel && (
          <p className="text-xs text-muted-foreground -mt-2 text-center">{cta.subLabel}</p>
        )}

        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-1 mb-2">
            Otras acciones
          </p>
          <ul className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
            {SECONDARY_ACTIONS.filter((a) => passesRequires(a, ctx)).map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => handleSecondary(action.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 text-left text-sm tap-target no-tap-highlight hover:bg-muted/50',
                      action.danger && 'text-destructive',
                    )}
                  >
                    <Icon size={18} className={action.danger ? 'text-destructive' : 'text-muted-foreground'} />
                    <span className="flex-1">{action.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </MobileActionSheet>
  );
}

export default OrderActionSheet;
