import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import MobileActionSheet from '../MobileActionSheet.jsx';

const REASONS = ['Compra', 'Venta', 'Merma', 'Corrección', 'Otro'];

export default function MobileAdjustStock({ product, mode = 'add', onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentStock = Number(
    product?.availableQuantity ?? product?.totalQuantity ??
    product?.currentStock ?? product?.quantity ?? 0
  );
  const newStock = mode === 'add'
    ? currentStock + quantity
    : Math.max(0, currentStock - quantity);

  const productName = product?.productName || product?.name || 'Producto';
  const productId = product?.productId?._id || product?.productId || product?._id;

  const handleStep = (delta) => {
    haptics.tap();
    setQuantity((q) => Math.max(1, q + delta));
  };

  const submit = async () => {
    if (quantity <= 0) { toast.error('Cantidad debe ser mayor a 0'); return; }
    try {
      setSubmitting(true);
      await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          quantity: mode === 'add' ? quantity : -quantity,
          reason: reason || (mode === 'add' ? 'Ajuste positivo' : 'Ajuste negativo'),
          notes: note || undefined,
        }),
      });
      haptics.success();
      toast.success(`Stock ajustado: ${productName} → ${newStock}`);
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
        Stock actual: <strong>{currentStock}</strong> → Nuevo: <strong>{newStock}</strong>
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
        {submitting ? 'Ajustando...' : mode === 'add' ? `Agregar ${quantity}` : `Retirar ${quantity}`}
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
        <p className="text-sm font-medium">{productName}</p>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold no-tap-highlight active:scale-95 active:bg-muted transition-all"
          >
            −
          </button>
          <motion.span
            key={quantity}
            initial={{ scale: 1.15, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.1 }}
            className="text-3xl font-bold tabular-nums w-16 text-center"
          >
            {quantity}
          </motion.span>
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
