import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import MobileActionSheet from '../MobileActionSheet.jsx';
import {
  allowsFractionalStock,
  getUnitOptions,
  defaultUnitKey,
  findUnitOption,
  hasUnitChoices,
  toBaseUnit,
  fromBaseUnit,
} from '@/lib/inventoryUnits.js';

// Evita basura de coma flotante (0.1 + 0.2) al sumar/restar y al mostrar.
const round3 = (n) => Math.round(n * 1000) / 1000;

const REASONS = ['Compra', 'Venta', 'Merma', 'Corrección', 'Otro'];

export default function MobileAdjustStock({ product, item, mode = 'add', onClose, onSuccess }) {
  const record = product || item; // callers pass either `product` or `item`
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unitKey, setUnitKey] = useState(() => defaultUnitKey(record));

  // El backend (adjustInventory) trata newQuantity como el TOTAL nuevo y calcula
  // el delta contra totalQuantity. Por eso la base DEBE ser totalQuantity: si se
  // usa availableQuantity (= total - reservado), el ajuste real queda desfasado
  // por reservedQuantity y produce sumas/restas incoherentes.
  const currentStock = Number(
    record?.totalQuantity ?? record?.availableQuantity ??
    record?.currentStock ?? record?.quantity ?? 0
  );
  // Unidad elegida para el ajuste (delta tecleado en esta unidad).
  const unitOptions = getUnitOptions(record);
  const showUnitSelector = hasUnitChoices(record);
  const unit = findUnitOption(record, unitKey);
  const factor = unit.conversionFactor;
  const unitSuffix = unit.isBase ? '' : ` ${unit.label}`;
  // Con unidades de venta o stock fraccionario siempre permitimos decimales.
  const allowDecimals = showUnitSelector || allowsFractionalStock(record);
  const minQty = allowDecimals ? 0 : 1;
  // newStock va en unidad base: convertimos el delta antes de sumar/restar.
  const deltaBase = toBaseUnit(quantity, factor);
  const newStock = round3(mode === 'add'
    ? currentStock + deltaBase
    : Math.max(0, currentStock - deltaBase));
  // Para mostrar, expresamos stock actual y nuevo en la unidad seleccionada.
  const currentInUnit = fromBaseUnit(currentStock, factor);
  const newInUnit = round3(mode === 'add'
    ? currentInUnit + Number(quantity)
    : Math.max(0, currentInUnit - Number(quantity)));

  const productName = record?.productName || record?.name || 'Producto';
  // The backend adjusts an inventory record, so it needs the inventory _id
  // (not the product id). In every caller `record` is an inventory document.
  const inventoryId = record?._id;

  const handleStep = (delta) => {
    haptics.tap();
    setQuantity((q) => round3(Math.max(minQty, q + delta)));
  };

  const submit = async () => {
    if (quantity <= 0) { toast.error('Cantidad debe ser mayor a 0'); return; }
    if (!inventoryId) { toast.error('Este producto no tiene inventario registrado'); return; }
    try {
      setSubmitting(true);
      const sign = mode === 'add' ? '+' : '-';
      const deltaNote = `${sign}${quantity}${unitSuffix}`;
      const baseReason = reason || (mode === 'add' ? 'Ajuste positivo' : 'Ajuste negativo');
      const fullReason = note ? `${baseReason} — ${note} (${deltaNote})` : `${baseReason} (${deltaNote})`;
      await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          inventoryId,
          newQuantity: newStock,
          reason: fullReason,
        }),
      });
      haptics.success();
      toast.success(`Stock ajustado: ${productName} → ${newInUnit}${unitSuffix}`);
      onSuccess?.();
      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'No se pudo ajustar el stock');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border">
      <p className="text-xs text-muted-foreground text-center mb-2">
        Stock actual: <strong>{currentInUnit}{unitSuffix}</strong> → Nuevo: <strong>{newInUnit}{unitSuffix}</strong>
      </p>
      <button
        type="button"
        disabled={submitting || quantity <= 0}
        onClick={submit}
        className={cn(
          'w-full py-3.5 rounded-[var(--mobile-radius-md)] text-base font-semibold no-tap-highlight disabled:opacity-40 transition-colors',
          mode === 'add'
            ? 'bg-emerald-600 text-white'
            : 'bg-destructive text-destructive-foreground',
        )}
      >
        {submitting ? 'Ajustando...' : mode === 'add' ? `Agregar ${quantity}${unitSuffix}` : `Retirar ${quantity}${unitSuffix}`}
      </button>
    </div>
  );

  return (
    <MobileActionSheet
      open
      onClose={() => onClose?.(false)}
      title={mode === 'add' ? 'Agregar stock' : 'Retirar stock'}
      footer={footer}
    >
      <div className="space-y-4">
        <p className="text-sm font-medium">
          {productName}
          {unit.label ? <span className="text-muted-foreground font-normal"> · {unit.label}</span> : null}
        </p>

        {/* Unit selector (solo si el producto tiene unidades de venta múltiples) */}
        {showUnitSelector && (
          <section>
            <p className="text-xs font-medium text-muted-foreground mb-2">Unidad</p>
            <div className="flex flex-wrap gap-2">
              {unitOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => { haptics.select(); setUnitKey(o.key); }}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                    unitKey === o.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                  )}
                >
                  {o.label}{o.isBase ? ' (base)' : ''}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold no-tap-highlight active:scale-95 active:bg-muted transition-all"
          >
            −
          </button>
          <input
            type="number"
            inputMode={allowDecimals ? 'decimal' : 'numeric'}
            step={allowDecimals ? '0.001' : '1'}
            value={quantity}
            onChange={(e) => {
              const val = allowDecimals ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
              setQuantity(isNaN(val) ? 0 : Math.max(minQty, val));
            }}
            className="w-20 h-12 text-center text-2xl font-bold tabular-nums bg-transparent border border-border rounded-xl focus:ring-2 focus:ring-primary/30 outline-none"
          />
          <button
            type="button"
            onClick={() => handleStep(1)}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold no-tap-highlight active:scale-95 active:bg-muted transition-all"
          >
            +
          </button>
        </div>

        {/* Reason chips */}
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">Razón</p>
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

        {/* Note */}
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-1">Nota (opcional)</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Detalle del ajuste..."
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
          />
        </section>
      </div>
    </MobileActionSheet>
  );
}
