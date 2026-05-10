import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableHeader, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { AnimatedTableBody, AnimatedTableRow } from '@/components/ui/animated-table-body';
import { classifyOrder } from '@/hooks/useOrderTriage';
import { getPrimaryCTA } from '@/lib/orders/getPrimaryCTA';
import { tapScale } from '@/lib/motion';

const STATUS_LABEL = {
  draft: 'Borrador',
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  processing: 'Procesando',
  shipped: 'Enviada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

function fmt(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.round(h / 24);
  if (days < 30) return `hace ${days}d`;
  return d.toLocaleDateString();
}

function StatusVisual({ triage, balance }) {
  if (triage === 'paid') {
    return (
      <div className="flex items-center gap-1.5 text-green-500 font-semibold">
        <CheckCircle2 size={14} />
        <span>Pagado</span>
      </div>
    );
  }
  if (triage === 'overdue') {
    return (
      <div className="flex items-center gap-1.5 text-destructive font-semibold">
        <AlertCircle size={14} />
        <span>Vencida · {fmt(balance)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
      <Clock size={14} />
      <span>Pendiente · {fmt(balance)}</span>
    </div>
  );
}

export function OrdersSmartTable({ orders = [], onRowClick, onPay, onMore, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 border-b border-border last:border-0 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold">Orden</TableHead>
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold text-right">Total</TableHead>
            <TableHead className="font-semibold">Estado pago</TableHead>
            <TableHead className="font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <AnimatedTableBody>
          {orders.map((order) => {
            const triage = classifyOrder(order);
            const cta = getPrimaryCTA(order);
            const balance = Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));
            return (
              <AnimatedTableRow
                key={order._id || order.orderNumber}
                className={cn(
                  'cursor-pointer',
                  triage === 'overdue' ? 'border-l-4 border-l-destructive' : '',
                )}
                onClick={() => onRowClick?.(order)}
              >
                <TableCell className="font-medium">#{order.orderNumber || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[18rem]">
                      {order.customerName || 'Cliente sin nombre'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {relativeTime(order.createdAt)} · {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(order.totalAmount)}</TableCell>
                <TableCell>
                  <StatusVisual triage={triage} balance={balance} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cta.action === 'pay') onPay?.(order);
                        else onRowClick?.(order);
                      }}
                      whileTap={tapScale}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium',
                        cta.variant === 'outline'
                          ? 'border border-border hover:bg-muted/60'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                    >
                      {cta.label}
                    </motion.button>
                    <button
                      type="button"
                      aria-label="Más acciones"
                      onClick={(e) => { e.stopPropagation(); onMore?.(order); }}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </TableCell>
              </AnimatedTableRow>
            );
          })}
        </AnimatedTableBody>
      </Table>
    </div>
  );
}

export default OrdersSmartTable;
