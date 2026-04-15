import { useState, useEffect, useCallback } from 'react';
import { X, Check, Banknote, Smartphone, CreditCard, Zap, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MobileActionSheet from '../MobileActionSheet.jsx';

// ─── constants (mirror de AppointmentsPaymentDialog) ─────────────────────────
const METHOD_LABELS = {
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  transferencia_usd: 'Transferencia USD',
  transferencia_ves: 'Transferencia VES',
  zelle_usd: 'Zelle',
  pago_movil_ves: 'Pago móvil',
  pos_ves: 'POS',
  tarjeta_ves: 'Tarjeta',
  otros_usd: 'Otro USD',
  otros_ves: 'Otro VES',
};

const METHOD_ICONS = {
  efectivo_usd: Banknote,
  efectivo_ves: Banknote,
  transferencia_usd: ArrowRight,
  transferencia_ves: ArrowRight,
  zelle_usd: Zap,
  pago_movil_ves: Smartphone,
  pos_ves: CreditCard,
  tarjeta_ves: CreditCard,
  otros_usd: Banknote,
  otros_ves: Banknote,
};

const VES_METHODS = new Set([
  'efectivo_ves', 'transferencia_ves', 'pago_movil_ves', 'pos_ves', 'tarjeta_ves', 'otros_ves',
]);

// ─── numpad ──────────────────────────────────────────────────────────────────
function NumPad({ value, onChange }) {
  const press = (key) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1) || '0');
    } else if (key === '.') {
      if (!value.includes('.')) onChange(value + '.');
    } else {
      const next = value === '0' ? key : value + key;
      if (next.split('.')[1]?.length > 2) return; // max 2 decimals
      onChange(next);
    }
  };

  const keys = ['7','8','9','4','5','6','1','2','3','.','0','backspace'];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map(k => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className={cn(
            'tap-target no-tap-highlight no-select rounded-xl font-semibold text-xl',
            'flex items-center justify-center h-14',
            k === 'backspace' ? 'bg-muted text-muted-foreground' : 'bg-card border border-border',
            'active:scale-95 transition-transform',
          )}
        >
          {k === 'backspace' ? '⌫' : k}
        </button>
      ))}
    </div>
  );
}

// ─── tip picker ──────────────────────────────────────────────────────────────
function TipPicker({ base, value, onChange }) {
  const presets = [0, 10, 15, 20];
  return (
    <div className="flex gap-2">
      {presets.map(pct => {
        const amount = pct === 0 ? 0 : (Number(base) * pct / 100);
        const active = value === pct;
        return (
          <button
            key={pct}
            type="button"
            onClick={() => onChange(pct)}
            className={cn(
              'flex-1 rounded-xl border py-2.5 text-sm font-medium no-tap-highlight transition-colors',
              active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
            )}
          >
            {pct === 0 ? 'Sin propina' : `${pct}%`}
          </button>
        );
      })}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function MobilePOS({ appointment, onClose, onPaid }) {
  const { isBeauty } = useMobileVertical();

  const total = Number(appointment?.totalPrice ?? 0);
  const [amount, setAmount] = useState(total > 0 ? total.toFixed(2) : '0');
  const [tipPct, setTipPct] = useState(0);
  const [method, setMethod] = useState('efectivo_usd');
  const [reference, setReference] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      fetchApi('/exchange-rate/bcv'),
      fetchApi('/payment-methods'),
    ]).then(([rateRes, pmRes]) => {
      if (rateRes.status === 'fulfilled') {
        const rate = rateRes.value?.rate ?? rateRes.value?.bcvRate ?? rateRes.value;
        if (Number(rate) > 0) setExchangeRate(Number(rate));
      }
      if (pmRes.status === 'fulfilled') {
        const list = Array.isArray(pmRes.value?.data) ? pmRes.value.data
          : Array.isArray(pmRes.value) ? pmRes.value : [];
        if (list.length) setPaymentMethods(list);
      }
    });
  }, []);

  const tipAmount = tipPct > 0 ? (Number(amount) * tipPct / 100) : 0;
  const grandTotal = Number(amount) + tipAmount;
  const isVes = VES_METHODS.has(method);
  const grandTotalVes = exchangeRate ? grandTotal * exchangeRate : null;

  const submit = async () => {
    if (!appointment?._id && !appointment?.id) {
      toast.error('Cita no identificada');
      return;
    }
    const aptId = appointment._id || appointment.id;
    try {
      setSubmitting(true);
      const methodLabel = METHOD_LABELS[method] || method;

      if (isBeauty) {
        await fetchApi(`/beauty-bookings/${aptId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            paymentStatus: 'paid',
            paymentMethod: methodLabel,
            amountPaid: grandTotal,
          }),
        });
      } else {
        await fetchApi(`/appointments/${aptId}/manual-deposits`, {
          method: 'POST',
          body: JSON.stringify({
            amount: grandTotal,
            currency: isVes ? 'VES' : 'USD',
            method,
            reference: reference || undefined,
            exchangeRate: exchangeRate || undefined,
            status: 'confirmed',
            confirmedAmount: grandTotal,
            transactionDate: new Date().toISOString(),
          }),
        });
      }
      toast.success('Pago registrado');
      onPaid?.();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  // Build method list: use paymentMethods from API or fallback to defaults
  const methods = paymentMethods.length
    ? paymentMethods.filter(m => m.id !== 'pago_mixto')
    : Object.entries(METHOD_LABELS).map(([id, name]) => ({ id, name }));

  return (
    <MobileActionSheet
      open
      onClose={onClose}
      title="Cobrar"
      className="max-h-[94vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto mobile-scroll space-y-4 pb-28">
        {/* Client + service summary */}
        <div className="rounded-xl bg-muted px-3 py-2.5">
          <p className="font-semibold">{appointment?.customerName || 'Sin cliente'}</p>
          <p className="text-sm text-muted-foreground">{appointment?.serviceName || 'Servicio'}</p>
        </div>

        {/* Amount display */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Monto</p>
          <div className="text-5xl font-bold tabular-nums mt-1">
            ${amount}
          </div>
          {isVes && grandTotalVes && (
            <p className="text-sm text-muted-foreground mt-1">
              ≈ Bs. {grandTotalVes.toFixed(2)}
            </p>
          )}
        </div>

        {/* Numpad */}
        <NumPad value={amount} onChange={setAmount} />

        {/* Tip */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Propina</p>
          <TipPicker base={amount} value={tipPct} onChange={setTipPct} />
          {tipPct > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              +${tipAmount.toFixed(2)} propina · Total: ${grandTotal.toFixed(2)}
            </p>
          )}
        </div>

        {/* Payment method */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            {methods.slice(0, 8).map(m => {
              const Icon = METHOD_ICONS[m.id] || Banknote;
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium no-tap-highlight transition-colors',
                    active ? 'bg-primary text-primary-foreground border-primary'
                           : 'bg-card border-border',
                  )}
                >
                  <Icon size={14} />
                  <span className="truncate">{m.name || METHOD_LABELS[m.id] || m.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reference */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Referencia (opcional)</p>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Nro. de confirmación, aprobación…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* Sticky confirm button */}
      <div
        className="absolute inset-x-0 bottom-0 px-4 pt-3 pb-4 bg-card border-t border-border"
        style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}
      >
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Total a cobrar</span>
          <span className="font-bold text-lg tabular-nums">${grandTotal.toFixed(2)}</span>
        </div>
        <button
          type="button"
          disabled={submitting || Number(amount) <= 0}
          onClick={submit}
          className="w-full rounded-xl bg-emerald-600 text-white py-4 text-base font-bold no-tap-highlight flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check size={20} />
          {submitting ? 'Procesando…' : 'Confirmar pago'}
        </button>
      </div>
    </MobileActionSheet>
  );
}
