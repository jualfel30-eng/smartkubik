import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useRipple } from '../primitives/RippleOverlay.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';

// ─── NumPad (shared with MobileCashCloseSession) ─────────────────────────────
export function NumPadKey({ k, onPress }) {
  const ripple = useRipple({ color: k === 'backspace' ? 'rgba(120,120,120,0.3)' : 'rgba(99,102,241,0.25)' });
  return (
    <button
      type="button"
      onPointerDown={ripple.trigger}
      onClick={() => onPress(k)}
      className={cn(
        'relative overflow-hidden tap-target no-tap-highlight no-select font-semibold text-xl flex items-center justify-center h-14 active:scale-95 transition-transform',
        k === 'backspace' ? 'bg-muted text-muted-foreground' : 'bg-card border border-border',
      )}
      style={{ borderRadius: 'var(--mobile-radius-md)' }}
    >
      {k === 'backspace' ? '⌫' : k}
      {ripple.element}
    </button>
  );
}

export function NumPad({ value, onChange }) {
  const press = (key) => {
    haptics.tap();
    if (key === 'backspace') { onChange(value.slice(0, -1) || '0'); }
    else if (key === '.') { if (!value.includes('.')) onChange(value + '.'); }
    else {
      const next = value === '0' ? key : value + key;
      if (next.split('.')[1]?.length > 2) return;
      onChange(next);
    }
  };
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'backspace'];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map(k => <NumPadKey key={k} k={k} onPress={press} />)}
    </div>
  );
}

// ─── Reason chips ────────────────────────────────────────────────────────────
const REASONS = [
  { key: 'change_request', label: 'Cambio' },
  { key: 'petty_cash', label: 'Caja chica' },
  { key: 'supplier_payment', label: 'Pago proveedor' },
  { key: 'tip', label: 'Propina' },
  { key: 'other', label: 'Otro' },
];

export default function MobileCashMovement({ open, onClose, session, onSuccess }) {
  const [type, setType] = useState('IN');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [reason, setReason] = useState('change_request');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType('IN');
    setAmount('0');
    setCurrency('USD');
    setReason('change_request');
    setDescription('');
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      haptics.error();
      toast.error('Ingresa un monto válido');
      return;
    }
    if (!session?._id) return;

    setSubmitting(true);
    try {
      await fetchApi(`/cash-register/sessions/${session._id}/movements`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          amount: parsed,
          currency,
          reason,
          description: description.trim(),
        }),
      });
      haptics.success();
      toast.success('Movimiento registrado');
      reset();
      onSuccess?.();
    } catch (err) {
      haptics.error();
      toast.error('Error al registrar movimiento', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const isIn = type === 'IN';
  const prefix = currency === 'USD' ? '$' : 'Bs';

  return (
    <MobileActionSheet
      open={open}
      onClose={handleClose}
      title="Movimiento de Efectivo"
      snapPoints={[0.75, 0.92]}
      defaultSnap={0}
      footer={
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={cn(
            'w-full h-12 rounded-xl text-white font-semibold no-tap-highlight transition-colors',
            isIn
              ? (submitting ? 'bg-emerald-600/50' : 'bg-emerald-600 active:bg-emerald-700')
              : (submitting ? 'bg-red-600/50' : 'bg-red-600 active:bg-red-700'),
          )}
          whileTap={{ scale: 0.97 }}
        >
          {submitting ? 'Registrando…' : isIn ? 'Registrar Entrada' : 'Registrar Salida'}
        </motion.button>
      }
    >
      <div className="space-y-4">
        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { haptics.select(); setType('IN'); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-medium transition-colors no-tap-highlight',
              isIn ? 'bg-emerald-600 text-white' : 'bg-card border border-border text-muted-foreground',
            )}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Entrada
          </button>
          <button
            type="button"
            onClick={() => { haptics.select(); setType('OUT'); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-medium transition-colors no-tap-highlight',
              !isIn ? 'bg-red-600 text-white' : 'bg-card border border-border text-muted-foreground',
            )}
          >
            <ArrowUpRight className="w-4 h-4" />
            Salida
          </button>
        </div>

        {/* Currency toggle */}
        <div className="flex gap-2">
          {['USD', 'VES'].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { haptics.select(); setCurrency(c); }}
              className={cn(
                'flex-1 py-2 rounded-full text-sm font-medium transition-colors no-tap-highlight',
                currency === c ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Amount display */}
        <div className="text-center py-3">
          <span className="text-muted-foreground text-lg mr-1">{prefix}</span>
          <span className="text-3xl font-bold tabular-nums">{amount === '0' ? '0.00' : amount}</span>
        </div>

        {/* NumPad */}
        <NumPad value={amount} onChange={setAmount} />

        {/* Reason chips */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Razón</label>
          <div className="flex flex-wrap gap-2">
            {REASONS.map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => { haptics.select(); setReason(r.key); }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors no-tap-highlight',
                  reason === r.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description (shown for "other") */}
        {reason === 'other' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Detalle del movimiento..."
            />
          </div>
        )}
      </div>
    </MobileActionSheet>
  );
}
