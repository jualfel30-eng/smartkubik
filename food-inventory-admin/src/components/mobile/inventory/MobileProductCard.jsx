import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Minus, History, Edit3, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { DUR, EASE, listItem } from '@/lib/motion';

/**
 * Normalize inconsistent API field names into a stable shape.
 * Inventory API may return populated `productId` object OR flat fields.
 */
export function normalizeItem(raw) {
  const pid = raw.productId;
  const populated = pid && typeof pid === 'object';
  return {
    id: raw._id,
    productId: populated ? pid._id : (typeof pid === 'string' ? pid : raw._id),
    name: raw.productName || (populated ? pid.name : '') || raw.name || 'Sin nombre',
    sku: raw.productSku || (populated ? pid.sku : '') || raw.sku || '—',
    stock: Number(raw.availableQuantity ?? raw.totalQuantity ?? raw.currentStock ?? raw.quantity ?? 0),
    minStock: Number(raw.minStock ?? raw.minimumStock ?? raw.reorderPoint ?? 5),
    maxStock: Number(raw.maxStock ?? raw.maximumStock ?? 0),
    unit: raw.unitOfMeasure || (populated ? pid.unitOfMeasure : '') || 'unidad',
    location: raw.warehouseName || 'Principal',
    cost: Number(raw.averageCostPrice ?? raw.lastCostPrice ?? 0),
    lastMovement: raw.lastMovementDate,
    category: populated ? pid.category : raw.category,
    brand: populated ? pid.brand : raw.brand,
    _raw: raw,
  };
}

export default function MobileProductCard({ item, onAction, expanded, onToggle }) {
  const p = normalizeItem(item);
  const maxForBar = Math.max(p.minStock * 3, p.stock * 1.5, 30);
  const pct = Math.min(100, (p.stock / maxForBar) * 100);
  const isLow = p.stock > 0 && p.stock <= p.minStock;
  const isOut = p.stock <= 0;

  const badgeColor = isOut
    ? 'text-destructive bg-destructive/10'
    : isLow
      ? 'text-amber-500 bg-amber-500/10'
      : null;
  const badgeLabel = isOut ? 'SIN STOCK' : isLow ? 'BAJO' : null;
  const barColor = isOut || isLow ? 'bg-destructive' : 'bg-emerald-500';

  return (
    <motion.div
      layout
      variants={listItem}
      className="bg-card border border-border rounded-[var(--mobile-radius-lg)] overflow-hidden"
    >
      {/* Compact row */}
      <button
        type="button"
        onClick={() => { haptics.tap(); onToggle?.(p.id); }}
        className="w-full text-left p-4 no-tap-highlight active:bg-muted/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.sku}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('text-sm font-bold tabular-nums', (isLow || isOut) ? 'text-destructive' : 'text-foreground')}>
              {p.stock}
            </span>
            {badgeLabel && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', badgeColor)}>
                {badgeLabel}
              </span>
            )}
            <ChevronDown
              size={14}
              className={cn('text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')}
            />
          </div>
        </div>
        {/* Stock bar */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', barColor)}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: DUR.slow, ease: EASE.out }}
          />
        </div>
        {p.unit !== 'unidad' && (
          <p className="text-[11px] text-muted-foreground mt-1">{p.unit}</p>
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
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-2">
              <Row label="Ubicación" value={p.location} />
              {p.lastMovement && (
                <Row
                  label="Último movimiento"
                  value={new Date(p.lastMovement).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                />
              )}
              <Row label="Stock mín / máx" value={`${p.minStock} / ${p.maxStock || '—'}`} />
              {p.cost > 0 && <Row label="Costo promedio" value={`$${p.cost.toFixed(2)}`} />}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <ActionBtn
                  icon={Plus}
                  label="Ajustar"
                  onClick={() => onAction?.(item, 'adjust')}
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                />
                <ActionBtn
                  icon={History}
                  label="Movimientos"
                  onClick={() => onAction?.(item, 'movements')}
                  className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                />
                <ActionBtn
                  icon={Edit3}
                  label="Editar"
                  onClick={() => onAction?.(item, 'edit')}
                  className="bg-muted text-muted-foreground border-border"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); haptics.tap(); onClick?.(); }}
      className={cn(
        'flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium',
        'rounded-[var(--mobile-radius-md)] border no-tap-highlight active:scale-[0.97] transition-transform',
        className,
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
