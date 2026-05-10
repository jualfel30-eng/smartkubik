import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, MoreVertical, ArrowRight, Eye, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, tapScale } from '@/lib/motion';
import { classifyOrder } from '@/hooks/useOrderTriage';
import { getPrimaryCTA } from '@/lib/orders/getPrimaryCTA';
import haptics from '@/lib/haptics';
import { AnimatedCurrency } from '@/components/ui/animated-number';

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

function fmtCurrency(n) {
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

function balanceStateOf(order, triage) {
  if (triage === 'paid') {
    return { tone: 'paid', label: 'Pagado', icon: CheckCircle2, color: 'text-green-500' };
  }
  if (triage === 'overdue') {
    return { tone: 'overdue', label: 'Vencida', icon: AlertCircle, color: 'text-destructive' };
  }
  return { tone: 'pending', label: 'Pendiente', icon: Clock, color: 'text-amber-500' };
}

const SWIPE_THRESHOLD = 60;

export function OrderCardMobile({ order, onTap, onPay, onViewDetail, onMore }) {
  const reduceMotion = useReducedMotion();
  const triage = classifyOrder(order);
  const cta = getPrimaryCTA(order);
  const balanceState = balanceStateOf(order, triage);
  const hasSwipe = !reduceMotion;

  const [actionHint, setActionHint] = useState(null); // 'pay' | 'detail' | null
  const lastFiredRef = useRef(null);

  const total = order?.totalAmount || 0;
  const paid = order?.paidAmount || 0;
  const balance = Math.max(0, total - paid);
  const BalIcon = balanceState.icon;

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    if (offset <= -SWIPE_THRESHOLD) {
      haptics.success();
      onPay?.(order);
    } else if (offset >= SWIPE_THRESHOLD) {
      haptics.tap();
      onViewDetail?.(order);
    }
    setActionHint(null);
    lastFiredRef.current = null;
  };

  const handleDrag = (_, info) => {
    const offset = info.offset.x;
    let next = null;
    if (offset <= -SWIPE_THRESHOLD * 0.6) next = 'pay';
    else if (offset >= SWIPE_THRESHOLD * 0.6) next = 'detail';
    if (next !== actionHint) {
      if (next && lastFiredRef.current !== next) {
        haptics.tap();
        lastFiredRef.current = next;
      }
      setActionHint(next);
    }
  };

  return (
    <div className="relative">
      {/* Swipe-revealed background actions */}
      <div className="absolute inset-0 flex items-center justify-between px-5 rounded-[var(--mobile-radius-lg)] overflow-hidden pointer-events-none">
        <div className={cn('flex items-center gap-2 text-sm font-medium', actionHint === 'detail' ? 'text-foreground' : 'text-muted-foreground/40')}>
          <Eye size={16} /> Detalle
        </div>
        <div className={cn('flex items-center gap-2 text-sm font-semibold', actionHint === 'pay' ? 'text-green-500' : 'text-muted-foreground/40')}>
          <CreditCard size={16} /> Cobrar
        </div>
      </div>

      <motion.div
        drag={hasSwipe ? 'x' : false}
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        dragSnapToOrigin
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileTap={tapScale}
        transition={SPRING.drawer}
        onClick={() => onTap?.(order)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(order); } }}
        className={cn(
          'relative bg-card rounded-[var(--mobile-radius-lg)] p-4 active:scale-[0.99] no-tap-highlight cursor-pointer',
          triage === 'overdue' && 'border-l-4 border-l-destructive',
        )}
        style={{
          boxShadow: triage === 'overdue' ? '0 2px 12px oklch(0.62 0.15 27 / 0.15)' : 'var(--elevation-rest)',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">#{order?.orderNumber || '—'}</span>
              {order?.status && order.status !== 'pending' && (
                <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {order?.customerName || 'Cliente sin nombre'} · {relativeTime(order?.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); haptics.tap(); onMore?.(order); }}
            aria-label="Más acciones"
            className="text-muted-foreground tap-target no-tap-highlight"
          >
            <MoreVertical size={18} />
          </button>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight leading-none">
            <AnimatedCurrency value={Number(total) || 0} currency="$" />
          </p>
          <div className={cn('mt-1 flex items-center gap-1.5 text-sm font-medium', balanceState.color)}>
            <BalIcon size={16} />
            <span>
              {triage === 'paid' ? 'Saldo $0.00 ' : `Saldo ${fmtCurrency(balance)} · `}
              {balanceState.label}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewDetail?.(order); }}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium tap-target no-tap-highlight hover:bg-muted/60"
          >
            Ver detalle
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              haptics.select();
              if (cta.action === 'pay') onPay?.(order);
              else onMore?.(order);
            }}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold tap-target no-tap-highlight',
              cta.variant === 'outline'
                ? 'border border-border hover:bg-muted/60'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {cta.label}
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default OrderCardMobile;
