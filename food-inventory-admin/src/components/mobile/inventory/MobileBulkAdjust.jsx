import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { recordActivity } from '@/components/inventory/DailyStreak.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { normalizeItem } from './MobileProductCard.jsx';

const REASONS = ['Conteo físico', 'Compra', 'Devolución', 'Daño', 'Merma', 'Otro'];

/**
 * MobileBulkAdjust — conteo masivo en móvil con patrón "stepper uno-por-uno".
 *
 * Recibe los registros de inventario seleccionados y los recorre uno a la vez
 * (producto grande, +/- o input, Anterior/Siguiente). Cada cambio se aplica vía
 * POST /inventory/adjust (por inventoryId), el mismo camino que MobileAdjustStock:
 * fija cantidad absoluta y deja un movimiento de auditoría por producto.
 */
export default function MobileBulkAdjust({ items, reasonDefault = 'Conteo físico', onClose }) {
  // El backend ajusta sobre totalQuantity (newQuantity = nuevo total fisico).
  // normalizeItem.stock devuelve availableQuantity para el badge de las cards,
  // pero para el conteo la base debe ser totalQuantity, o el delta aplicado
  // queda desfasado por reservedQuantity. Sobreescribimos stock con el total.
  const records = useMemo(
    () => items.map((it) => {
      const n = normalizeItem(it);
      const total = Number(it.totalQuantity ?? n.stock);
      return { ...n, stock: total };
    }),
    [items],
  );
  const [index, setIndex] = useState(0);
  // Map id -> nueva cantidad contada (number). Parte del stock actual.
  const [counts, setCounts] = useState(() => {
    const init = {};
    for (const r of records) init[r.id] = r.stock;
    return init;
  });
  const [reason, setReason] = useState(reasonDefault);
  const [submitting, setSubmitting] = useState(false);
  const [failedIds, setFailedIds] = useState(new Set());

  const total = records.length;
  const current = records[index];

  const changedCount = useMemo(
    () => records.filter((r) => Number(counts[r.id]) !== r.stock).length,
    [records, counts],
  );

  const setCount = (id, value) => {
    setCounts((prev) => ({ ...prev, [id]: value }));
  };

  const step = (delta) => {
    haptics.tap();
    setCount(current.id, Math.max(0, Number(counts[current.id] || 0) + delta));
  };

  const go = (delta) => {
    haptics.select();
    setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)));
  };

  const submit = async () => {
    const edits = records
      .map((r) => ({ r, newQuantity: Number(counts[r.id]) }))
      .filter(({ r, newQuantity }) => !Number.isNaN(newQuantity) && newQuantity >= 0 && newQuantity !== r.stock);

    if (edits.length === 0) {
      toast.info('No hay cambios de cantidad por aplicar.');
      return;
    }

    setSubmitting(true);
    const results = await Promise.allSettled(
      edits.map(({ r, newQuantity }) =>
        fetchApi('/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({ inventoryId: r.id, newQuantity, reason }),
        }).then(() => r.id),
      ),
    );
    setSubmitting(false);

    const failed = new Set();
    let ok = 0;
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') ok += 1;
      else failed.add(edits[i].r.id);
    });
    setFailedIds(failed);

    if (ok > 0) recordActivity();

    if (failed.size === 0) {
      haptics.success();
      toast.success(`Inventario ajustado: ${ok} producto(s).`);
      onClose?.(true);
    } else if (ok > 0) {
      haptics.error();
      toast.error(`${ok} ajustado(s), ${failed.size} con error. Revisa los marcados.`);
      // Salta al primer producto que falló para corregir.
      const firstFailedIdx = records.findIndex((r) => failed.has(r.id));
      if (firstFailedIdx >= 0) setIndex(firstFailedIdx);
    } else {
      haptics.error();
      toast.error('No se pudo ajustar ningún producto. Revisa tu conexión.');
    }
  };

  if (!current) return null;

  const currentChanged = Number(counts[current.id]) !== current.stock;
  const currentFailed = failedIds.has(current.id);

  const footer = (
    <div
      className="px-4 pt-3 bg-card border-t border-border space-y-3"
      style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => go(-1)}
          className="flex-1 flex items-center justify-center gap-1 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight disabled:opacity-30 active:scale-[0.97] transition-transform"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <button
          type="button"
          disabled={index >= total - 1}
          onClick={() => go(1)}
          className="flex-1 flex items-center justify-center gap-1 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight disabled:opacity-30 active:scale-[0.97] transition-transform"
        >
          Siguiente <ChevronRight size={16} />
        </button>
      </div>
      <button
        type="button"
        disabled={submitting || changedCount === 0}
        onClick={submit}
        className="w-full py-3.5 rounded-[var(--mobile-radius-md)] text-base font-semibold bg-primary text-primary-foreground no-tap-highlight disabled:opacity-40 transition-colors"
      >
        {submitting ? 'Guardando...' : `Guardar ${changedCount} ajuste${changedCount === 1 ? '' : 's'}`}
      </button>
    </div>
  );

  return (
    <MobileActionSheet open onClose={() => onClose?.(false)} title="Conteo masivo" footer={footer}>
      <div className="space-y-5">
        {/* Progreso */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {index + 1} de {total} · {changedCount} con cambios
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((index + 1) / total) * 100}%` }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          />
        </div>

        {/* Razón (compartida para todo el conteo) */}
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">Razón del ajuste</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { haptics.select(); setReason(r); }}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                  reason === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        {/* Producto actual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'rounded-[var(--mobile-radius-lg)] border p-4 text-center',
              currentFailed ? 'border-destructive bg-destructive/5' : 'border-border bg-card',
            )}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {currentFailed && <AlertCircle size={14} className="text-destructive" />}
              {!currentFailed && currentChanged && <CheckCircle2 size={14} className="text-emerald-500" />}
              <p className="font-semibold text-base">{current.name}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{current.sku}</p>
            <p className="text-xs text-muted-foreground mb-3">
              Stock actual: <strong className="text-foreground">{current.stock}</strong>
              {current.unit !== 'unidad' ? ` ${current.unit}` : ''}
            </p>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => step(-1)}
                className="w-14 h-14 rounded-full border border-border flex items-center justify-center text-2xl font-bold no-tap-highlight active:scale-95 active:bg-muted transition-all"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={counts[current.id] ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCount(current.id, Number.isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="w-24 h-16 text-center text-3xl font-bold tabular-nums bg-transparent border border-border rounded-xl focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <button
                type="button"
                onClick={() => step(1)}
                className="w-14 h-14 rounded-full border border-border flex items-center justify-center text-2xl font-bold no-tap-highlight active:scale-95 active:bg-muted transition-all"
              >
                +
              </button>
            </div>

            {currentChanged && (
              <p className="text-xs text-muted-foreground mt-3">
                {current.stock} → <strong className="text-foreground">{counts[current.id]}</strong>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </MobileActionSheet>
  );
}
