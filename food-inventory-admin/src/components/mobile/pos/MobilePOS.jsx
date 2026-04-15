import { useState, useEffect, useCallback } from 'react';
import { X, Check, Banknote, Smartphone, CreditCard, Zap, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { toast } from '@/lib/toast';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import MobileActionSheet from '../MobileActionSheet.jsx';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import { useRipple } from '../primitives/RippleOverlay.jsx';

// ─── constants ────────────────────────────────────────────────────────────────
const METHOD_LABELS = {
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  transferencia_usd: 'Transf. USD',
  transferencia_ves: 'Transf. VES',
  zelle_usd: 'Zelle',
  pago_movil_ves: 'Pago móvil',
  pos_ves: 'POS',
  tarjeta_ves: 'Tarjeta',
  otros_usd: 'Otro USD',
  otros_ves: 'Otro VES',
};

const METHOD_ICONS = {
  efectivo_usd: Banknote, efectivo_ves: Banknote,
  transferencia_usd: ArrowRight, transferencia_ves: ArrowRight,
  zelle_usd: Zap, pago_movil_ves: Smartphone,
  pos_ves: CreditCard, tarjeta_ves: CreditCard,
  otros_usd: Banknote, otros_ves: Banknote,
};

const VES_METHODS = new Set(['efectivo_ves', 'transferencia_ves', 'pago_movil_ves', 'pos_ves', 'tarjeta_ves', 'otros_ves']);

// ─── NumPad ───────────────────────────────────────────────────────────────────
function NumPadKey({ k, onPress }) {
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

function NumPad({ value, onChange }) {
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
  const keys = ['7','8','9','4','5','6','1','2','3','.','0','backspace'];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map(k => <NumPadKey key={k} k={k} onPress={press} />)}
    </div>
  );
}

// ─── TipPicker ────────────────────────────────────────────────────────────────
function TipPicker({ base, value, onChange }) {
  return (
    <div className="flex gap-2">
      {[0, 10, 15, 20].map(pct => (
        <button key={pct} type="button" onClick={() => { haptics.select(); onChange(pct); }}
          className={cn('flex-1 rounded-[var(--mobile-radius-md)] border py-2.5 text-sm font-medium no-tap-highlight transition-colors',
            value === pct ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
          {pct === 0 ? 'Sin propina' : `${pct}%`}
        </button>
      ))}
    </div>
  );
}

// ─── PaymentLine (for mixed payments) ────────────────────────────────────────
function PaymentLine({ line, methods, onChange, onRemove, canRemove }) {
  return (
    <div className="rounded-[var(--mobile-radius-md)] border border-border bg-muted/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Pago {line.idx + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="tap-target no-tap-highlight text-destructive">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {/* Method */}
      <div className="flex flex-wrap gap-1.5">
        {methods.slice(0, 6).map(m => {
          const Icon = METHOD_ICONS[m.id] || Banknote;
          return (
            <button key={m.id} type="button" onClick={() => onChange({ ...line, method: m.id })}
              className={cn('flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border no-tap-highlight transition-colors',
                line.method === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
              <Icon size={11} />
              {m.name || METHOD_LABELS[m.id] || m.id}
            </button>
          );
        })}
      </div>
      {/* Amount */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">$</span>
        <input
          type="number"
          inputMode="decimal"
          value={line.amount}
          onChange={(e) => onChange({ ...line, amount: e.target.value })}
          className="flex-1 rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-base font-semibold tabular-nums"
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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

  // Mixed payment state
  const [mixedMode, setMixedMode] = useState(false);
  const [lines, setLines] = useState([
    { idx: 0, method: 'efectivo_usd', amount: total > 0 ? total.toFixed(2) : '' },
  ]);

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
        const list = Array.isArray(pmRes.value?.data) ? pmRes.value.data : Array.isArray(pmRes.value) ? pmRes.value : [];
        if (list.length) setPaymentMethods(list);
      }
    });
  }, []);

  const tipAmount = tipPct > 0 ? (Number(amount) * tipPct / 100) : 0;
  const grandTotal = Number(amount) + tipAmount;
  const isVes = VES_METHODS.has(method);
  const grandTotalVes = exchangeRate ? grandTotal * exchangeRate : null;

  // Mixed: sum of lines
  const linesTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const linesTotalVes = exchangeRate ? linesTotal * exchangeRate : null;
  const mixedBalanced = Math.abs(linesTotal - grandTotal) < 0.005;

  const methods = paymentMethods.length
    ? paymentMethods.filter(m => m.id !== 'pago_mixto')
    : Object.entries(METHOD_LABELS).map(([id, name]) => ({ id, name }));

  const addLine = useCallback(() => {
    setLines(prev => [...prev, { idx: prev.length, method: 'efectivo_usd', amount: '' }]);
  }, []);

  const removeLine = useCallback((idx) => {
    setLines(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, idx: i })));
  }, []);

  const updateLine = useCallback((idx, updated) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...updated, idx: i } : l));
  }, []);

  const showWhatsAppToast = useCallback((paidTotal) => {
    const phone = appointment?.customerPhone?.replace(/\D/g, '');
    if (!phone) return;
    const svcName = appointment?.serviceName || 'el servicio';
    const msg = encodeURIComponent(
      `Hola ${appointment?.customerName || ''}, hemos registrado tu pago de $${paidTotal.toFixed(2)} por ${svcName}. ¡Gracias por visitarnos!`,
    );
    toast.success('Pago registrado', {
      description: `${appointment?.customerName || ''} · $${paidTotal.toFixed(2)}`,
      action: {
        label: 'Enviar recibo WhatsApp',
        onClick: () => window.open(`https://wa.me/${phone}?text=${msg}`, '_blank'),
      },
      duration: 9000,
    });
  }, [appointment]);

  const submit = async () => {
    const aptId = appointment?._id || appointment?.id;
    if (!aptId) { toast.error('Cita no identificada'); return; }

    try {
      setSubmitting(true);

      if (mixedMode) {
        if (!mixedBalanced) {
          toast.error(`La suma de pagos ($${linesTotal.toFixed(2)}) no coincide con el total ($${grandTotal.toFixed(2)})`);
          return;
        }
        // Submit each line sequentially
        for (const line of lines) {
          const methodLabel = METHOD_LABELS[line.method] || line.method;
          if (isBeauty) {
            await fetchApi(`/beauty-bookings/${aptId}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ paymentStatus: 'paid', paymentMethod: methodLabel, amountPaid: Number(line.amount) }),
            });
          } else {
            await fetchApi(`/appointments/${aptId}/manual-deposits`, {
              method: 'POST',
              body: JSON.stringify({
                amount: Number(line.amount),
                currency: VES_METHODS.has(line.method) ? 'VES' : 'USD',
                method: line.method,
                exchangeRate: exchangeRate || undefined,
                status: 'confirmed',
                confirmedAmount: Number(line.amount),
                transactionDate: new Date().toISOString(),
              }),
            });
          }
        }
        showWhatsAppToast(linesTotal);
        trackEvent('payment_completed', { mode: 'mixed', total: linesTotal });
      } else {
        const methodLabel = METHOD_LABELS[method] || method;
        if (isBeauty) {
          await fetchApi(`/beauty-bookings/${aptId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ paymentStatus: 'paid', paymentMethod: methodLabel, amountPaid: grandTotal }),
          });
        } else {
          await fetchApi(`/appointments/${aptId}/manual-deposits`, {
            method: 'POST',
            body: JSON.stringify({
              amount: grandTotal, currency: isVes ? 'VES' : 'USD', method,
              reference: reference || undefined, exchangeRate: exchangeRate || undefined,
              status: 'confirmed', confirmedAmount: grandTotal, transactionDate: new Date().toISOString(),
            }),
          });
        }
        showWhatsAppToast(grandTotal);
        trackEvent('payment_completed', { mode: 'single', method, total: grandTotal });
      }

      haptics.success();
      onPaid?.();
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error(err.message || 'Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileActionSheet open onClose={onClose} title="Cobrar" className="max-h-[94vh] flex flex-col">
      <div className="flex-1 overflow-y-auto mobile-scroll space-y-4 pb-28">

        {/* Summary */}
        <div className="rounded-[var(--mobile-radius-md)] bg-muted px-3 py-2.5">
          <p className="font-semibold">{appointment?.customerName || 'Sin cliente'}</p>
          <p className="text-sm text-muted-foreground">{appointment?.serviceName || 'Servicio'}</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setMixedMode(false)}
            className={cn('flex-1 rounded-[var(--mobile-radius-md)] border py-2.5 text-sm font-medium no-tap-highlight transition-colors',
              !mixedMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
            Un método
          </button>
          <button type="button" onClick={() => setMixedMode(true)}
            className={cn('flex-1 rounded-[var(--mobile-radius-md)] border py-2.5 text-sm font-medium no-tap-highlight transition-colors',
              mixedMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
            Pago mixto
          </button>
        </div>

        {!mixedMode ? (
          <>
            {/* Amount display */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Monto</p>
              <div className="text-5xl font-bold tabular-nums mt-1">${amount}</div>
              {isVes && grandTotalVes && (
                <p className="text-sm text-muted-foreground mt-1">≈ Bs. {grandTotalVes.toFixed(2)}</p>
              )}
            </div>

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
                  return (
                    <button key={m.id} type="button" onClick={() => { haptics.select(); setMethod(m.id); }}
                      className={cn('flex items-center gap-2 rounded-[var(--mobile-radius-md)] border px-3 py-2.5 text-sm font-medium no-tap-highlight transition-colors',
                        method === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
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
              <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                placeholder="Nro. de confirmación…"
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          </>
        ) : (
          <>
            {/* Mixed payment lines */}
            <div className="space-y-2">
              {lines.map((line, i) => (
                <PaymentLine
                  key={i}
                  line={line}
                  methods={methods}
                  onChange={(updated) => updateLine(i, updated)}
                  onRemove={() => removeLine(i)}
                  canRemove={lines.length > 1}
                />
              ))}
            </div>

            <button type="button" onClick={addLine}
              className="w-full rounded-[var(--mobile-radius-md)] border border-dashed border-border py-3 text-sm font-medium text-primary no-tap-highlight flex items-center justify-center gap-2">
              <Plus size={14} /> Agregar línea de pago
            </button>

            {/* Balance indicator */}
            <div className={cn('rounded-[var(--mobile-radius-md)] px-3 py-2 text-sm flex items-center justify-between',
              mixedBalanced ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700')}>
              <span>Suma de pagos</span>
              <span className="font-bold tabular-nums">${linesTotal.toFixed(2)} / ${grandTotal.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Sticky confirm */}
      <div className="absolute inset-x-0 bottom-0 px-4 pt-3 pb-4 bg-card border-t border-border" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
        <div className="flex items-center justify-between mb-2 text-sm" aria-live="polite" aria-atomic="true">
          <span className="text-muted-foreground">Total a cobrar</span>
          <AnimatedNumber
            value={grandTotal}
            format={(n) => `$${n.toFixed(2)}`}
            className="font-bold text-lg tabular-nums"
          />
        </div>
        <button type="button" disabled={submitting || (mixedMode ? !mixedBalanced || linesTotal <= 0 : Number(amount) <= 0)} onClick={submit}
          className="w-full rounded-[var(--mobile-radius-md)] bg-emerald-600 text-white py-4 text-base font-bold no-tap-highlight flex items-center justify-center gap-2 disabled:opacity-50">
          <Check size={20} />
          {submitting ? 'Procesando…' : 'Confirmar pago'}
        </button>
      </div>
    </MobileActionSheet>
  );
}
