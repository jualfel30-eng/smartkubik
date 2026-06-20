/**
 * InlineStockAdjust.jsx
 * Compact +/- button pair that expands inline for quick stock adjustments.
 * Calls POST /inventory/adjust — same endpoint as InventoryEditDialog.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchApi } from '@/lib/api';
import { SPRING } from '@/lib/motion';
import { toast } from 'sonner';
import { recordActivity } from '@/components/inventory/DailyStreak.jsx';
import {
  allowsFractionalStock,
  getUnitOptions,
  defaultUnitKey,
  findUnitOption,
  hasUnitChoices,
  toBaseUnit,
} from '@/lib/inventoryUnits.js';

const round4 = (n) => Math.round(Number(n) * 10000) / 10000;

const REASONS = [
  { value: 'Compra', label: 'Compra' },
  { value: 'Conteo físico', label: 'Conteo físico' },
  { value: 'Devolución', label: 'Devolución' },
  { value: 'Daño', label: 'Daño' },
  { value: 'Merma', label: 'Merma' },
  { value: 'Otro', label: 'Otro' },
];

export default function InlineStockAdjust({ item, onAdjustComplete }) {
  const [mode, setMode] = useState(null); // null | 'add' | 'subtract'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Conteo físico');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null); // 'green' | 'amber' | null
  const [unitKey, setUnitKey] = useState(() => defaultUnitKey(item));
  const inputRef = useRef(null);
  const unitOptions = getUnitOptions(item);
  const showUnitSelector = hasUnitChoices(item);
  const unit = findUnitOption(item, unitKey);
  // Con unidades de venta o stock fraccionario siempre permitimos decimales.
  const allowDecimals = showUnitSelector || allowsFractionalStock(item);

  useEffect(() => {
    if (mode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleOpen = (type) => {
    setMode(type);
    setQuantity('');
    setReason('Conteo físico');
    setUnitKey(defaultUnitKey(item));
  };

  const handleCancel = () => {
    setMode(null);
    setQuantity('');
  };

  const handleConfirm = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }

    // El backend ajusta sobre totalQuantity (newQuantity = nuevo total) y aplica
    // el delta contra el total. La base debe ser totalQuantity; usar
    // availableQuantity desfasa el ajuste por reservedQuantity.
    // El delta se teclea en la unidad elegida; se convierte a base antes de enviar.
    const currentQty = item.totalQuantity ?? item.availableQuantity ?? 0;
    const deltaBase = toBaseUnit(qty, unit.conversionFactor);
    const newQuantity = round4(mode === 'add' ? currentQty + deltaBase : Math.max(0, currentQty - deltaBase));
    const unitSuffix = unit.isBase ? '' : ` ${unit.label}`;

    setSaving(true);
    try {
      await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          inventoryId: item._id,
          newQuantity,
          reason: `${mode === 'add' ? '+' : '-'}${qty}${unitSuffix} — ${reason}`,
        }),
      });

      // Flash feedback
      setFlash(mode === 'add' ? 'green' : 'amber');
      setTimeout(() => setFlash(null), 600);

      toast.success(
        `Stock ajustado: ${mode === 'add' ? '+' : '-'}${qty}${unitSuffix} ${item.productName || ''}`,
      );

      recordActivity();
      setMode(null);
      setQuantity('');
      onAdjustComplete?.();
    } catch (err) {
      toast.error('Error al ajustar inventario', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="flex items-center gap-1">
      <AnimatePresence mode="wait">
        {!mode ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-0.5"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => handleOpen('add')}
              title="Aumentar stock"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              onClick={() => handleOpen('subtract')}
              title="Reducir stock"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={SPRING.snappy}
            className="flex items-center gap-1.5 overflow-hidden"
          >
            <span className="text-xs font-medium shrink-0">
              {mode === 'add' ? '+' : '-'}
            </span>
            <Input
              ref={inputRef}
              type="number"
              min="0"
              step={allowDecimals ? '0.001' : '1'}
              inputMode={allowDecimals ? 'decimal' : 'numeric'}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 w-16 text-xs"
              placeholder="Cant."
            />
            {showUnitSelector && (
              <Select value={unitKey} onValueChange={setUnitKey}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((o) => (
                    <SelectItem key={o.key} value={o.key} className="text-xs">
                      {o.label}{o.isBase ? ' (base)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-muted"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash overlay for the parent row */}
      {flash && (
        <div
          className={`absolute inset-0 pointer-events-none rounded transition-colors duration-600 ${
            flash === 'green' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
          }`}
          style={{ animation: 'fadeOut 600ms ease-out forwards' }}
        />
      )}
    </div>
  );
}
