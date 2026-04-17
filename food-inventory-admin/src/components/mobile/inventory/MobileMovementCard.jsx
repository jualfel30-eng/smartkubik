import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Receipt, ArrowUpCircle, ArrowDownCircle,
  ArrowLeftRight, ChevronDown, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { DUR, EASE, listItem } from '@/lib/motion';

// ─── Movement type config ───────────────────────────────────────────────────
const TYPE_MAP = {
  purchase:       { icon: ShoppingCart,   color: 'text-emerald-500', sign: '+', label: 'Compra' },
  sale:           { icon: Receipt,        color: 'text-destructive', sign: '-', label: 'Venta' },
  adjustment_in:  { icon: ArrowUpCircle,  color: 'text-blue-500',   sign: '+', label: 'Ajuste entrada' },
  adjustment_out: { icon: ArrowDownCircle, color: 'text-orange-500', sign: '-', label: 'Ajuste salida' },
  transfer_in:    { icon: ArrowLeftRight, color: 'text-violet-500',  sign: '+', label: 'Traslado entrada' },
  transfer_out:   { icon: ArrowLeftRight, color: 'text-violet-500',  sign: '-', label: 'Traslado salida' },
  transfer:       { icon: ArrowLeftRight, color: 'text-violet-500',  sign: '',  label: 'Traslado' },
};

const DEFAULT_TYPE = { icon: HelpCircle, color: 'text-muted-foreground', sign: '', label: 'Movimiento' };

function getTypeConfig(type) {
  return TYPE_MAP[type] || DEFAULT_TYPE;
}

// ─── Date grouping utility ──────────────────────────────────────────────────
export function groupMovementsByDate(movements) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const groups = {};
  const order = [];

  for (const mov of movements) {
    const d = new Date(mov.createdAt || mov.date);
    d.setHours(0, 0, 0, 0);
    const time = d.getTime();

    let label;
    if (time === today.getTime()) label = 'Hoy';
    else if (time === yesterday.getTime()) label = 'Ayer';
    else label = d.toLocaleDateString('es', { day: 'numeric', month: 'long' });

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(mov);
  }

  return order.map((label) => ({ label, items: groups[label] }));
}

// ─── Movement Card ──────────────────────────────────────────────────────────
export default function MobileMovementCard({ mov }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getTypeConfig(mov.type || mov.movementType);
  const Icon = cfg.icon;
  const qty = Math.abs(Number(mov.quantity || 0));
  const date = mov.createdAt || mov.date;

  return (
    <motion.div
      variants={listItem}
      className="bg-card border border-border rounded-[var(--mobile-radius-md)] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => { haptics.tap(); setExpanded((e) => !e); }}
        className="w-full text-left px-4 py-3 no-tap-highlight active:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('shrink-0', cfg.color)}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {mov.productName || mov.productSku || 'Producto'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cfg.label}
              {mov.reason ? ` · ${mov.reason}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('text-sm font-bold tabular-nums', cfg.color)}>
              {cfg.sign}{qty}
            </span>
            <ChevronDown
              size={12}
              className={cn('text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')}
            />
          </div>
        </div>
        {date && (
          <p className="text-[11px] text-muted-foreground mt-1 ml-[30px]">
            {new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-border space-y-1.5 text-xs">
              {mov.userName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuario</span>
                  <span>{mov.userName}</span>
                </div>
              )}
              {mov.notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nota</span>
                  <span className="text-right max-w-[60%]">{mov.notes}</span>
                </div>
              )}
              {mov.reference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referencia</span>
                  <span>{mov.reference}</span>
                </div>
              )}
              {mov.purchaseOrderId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orden de compra</span>
                  <span className="text-primary">{mov.purchaseOrderNumber || mov.purchaseOrderId}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
