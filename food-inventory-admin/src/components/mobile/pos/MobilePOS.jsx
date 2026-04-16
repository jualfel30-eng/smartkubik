import { useState, useEffect, useCallback } from 'react';
import { X, Check, Banknote, Smartphone, CreditCard, Zap, ArrowRight, Plus, Trash2, Package } from 'lucide-react';
import { fetchApi, getLoyaltyBalance, getProducts } from '@/lib/api';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/lib/toast';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { emitBadgeUpdate } from '@/lib/badge-events';
import MobileActionSheet from '../MobileActionSheet.jsx';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import { useRipple } from '../primitives/RippleOverlay.jsx';

// ─── loyalty constants ────────────────────────────────────────────────────────
const LOYALTY_POINT_VALUE = 0.01;   // $0.01 per point (default, same as backend)
const LOYALTY_MAX_PCT     = 0.50;   // Max 50% of bill can be covered by points

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
  const { tenant } = useAuth();

  const total = Number(appointment?.totalPrice ?? 0);
  const hasPrefilledAmount = total > 0;
  const defaultTipPct = Number(tenant?.settings?.tips?.defaultTipPercentage ?? 0);

  const [amount, setAmount] = useState(total > 0 ? total.toFixed(2) : '0');
  const [showNumPad, setShowNumPad] = useState(!hasPrefilledAmount);
  const [tipPct, setTipPct] = useState(defaultTipPct);
  const [method, setMethod] = useState('efectivo_usd');
  const [reference, setReference] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Loyalty state
  const [loyaltyBalance, setLoyaltyBalance] = useState(null); // null = not loaded / not applicable
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);

  // Product upsell state
  const [addedProducts, setAddedProducts] = useState([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

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

  // Fetch loyalty balance (beauty vertical only, when client has phone)
  useEffect(() => {
    if (!isBeauty) return;
    const tenantId = tenant?._id || tenant?.id;
    const clientPhone = appointment?.client?.phone || appointment?.customerPhone;
    if (!tenantId || !clientPhone) return;

    getLoyaltyBalance(tenantId, clientPhone)
      .then((res) => {
        const pts = res?.points ?? 0;
        if (pts > 0) setLoyaltyBalance(pts);
      })
      .catch(() => { /* no mostrar error, es opcional */ });
  }, [isBeauty, tenant, appointment]);

  const addonsTotal = addedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const tipAmount = tipPct > 0 ? (Number(amount) * tipPct / 100) : 0;
  const grandTotal = Number(amount) + tipAmount + addonsTotal;
  const isVes = VES_METHODS.has(method);
  const grandTotalVes = exchangeRate ? grandTotal * exchangeRate : null;

  // Loyalty derived values
  const maxLoyaltyDiscount = loyaltyBalance !== null
    ? Math.min(loyaltyBalance * LOYALTY_POINT_VALUE, grandTotal * LOYALTY_MAX_PCT)
    : 0;
  const appliedLoyaltyDiscount = loyaltyApplied ? maxLoyaltyDiscount : 0;
  const loyaltyPointsToRedeem = loyaltyApplied ? Math.round(appliedLoyaltyDiscount / LOYALTY_POINT_VALUE) : 0;
  const effectiveTotal = Math.max(0, grandTotal - appliedLoyaltyDiscount);

  // Mixed: sum of lines
  const linesTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const linesTotalVes = exchangeRate ? linesTotal * exchangeRate : null;
  const mixedBalanced = Math.abs(linesTotal - effectiveTotal) < 0.005;

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

  const searchProducts = useCallback(async (query) => {
    if (!query || query.length < 2) { setProductSearchResults([]); return; }
    setProductSearchLoading(true);
    try {
      const res = await getProducts({ search: query, limit: 20 });
      const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      // Only show products with available stock
      setProductSearchResults(items.filter(p => (p.totalQuantity ?? p.availableQuantity ?? 1) > 0));
    } catch (e) {
      console.error('Product search error:', e);
    } finally {
      setProductSearchLoading(false);
    }
  }, []);

  const addProduct = useCallback((product) => {
    const price = product.sellingPrice ?? product.price?.amount ?? product.price ?? 0;
    setAddedProducts(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) return prev.map(p => p._id === product._id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { ...product, price, quantity: 1 }];
    });
    setProductSearchOpen(false);
    setProductSearchQuery('');
    setProductSearchResults([]);
  }, []);

  const updateProductQty = useCallback((productId, delta) => {
    setAddedProducts(prev =>
      prev
        .map(p => p._id === productId ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p)
        .filter(p => p.quantity > 0)
    );
  }, []);

  const removeProduct = useCallback((productId) => {
    setAddedProducts(prev => prev.filter(p => p._id !== productId));
  }, []);

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

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

  // Task 2.3: 1-tap quick-pay with pre-filled amount
  const quickPay = useCallback(async (methodId) => {
    const aptId = appointment?._id || appointment?.id;
    if (!aptId) { toast.error('Cita no identificada'); return; }
    setSubmitting(true);
    try {
      const methodLabel = METHOD_LABELS[methodId] || methodId;
      if (isBeauty) {
        await fetchApi(`/beauty-bookings/${aptId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            paymentStatus: 'paid',
            paymentMethod: methodLabel,
            amountPaid: effectiveTotal,
            ...(loyaltyPointsToRedeem > 0 && {
              loyaltyPointsRedeemed: loyaltyPointsToRedeem,
              loyaltyDiscount: appliedLoyaltyDiscount,
            }),
            ...(addedProducts.length > 0 && {
              addons: addedProducts.map(p => ({ name: p.name, price: p.price, quantity: p.quantity, productId: p._id })),
            }),
          }),
        });
      } else {
        await fetchApi(`/appointments/${aptId}/manual-deposits`, {
          method: 'POST',
          body: JSON.stringify({
            amount: effectiveTotal,
            currency: VES_METHODS.has(methodId) ? 'VES' : 'USD',
            method: methodId,
            exchangeRate: exchangeRate || undefined,
            status: 'confirmed',
            confirmedAmount: effectiveTotal,
            transactionDate: new Date().toISOString(),
          }),
        });
      }
      haptics.success();
      emitBadgeUpdate({ type: 'pay' });
      showWhatsAppToast(effectiveTotal);
      trackEvent('payment_completed', { mode: 'quickpay', method: methodId, total: effectiveTotal });
      setAddedProducts([]);
      onPaid?.();
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  }, [appointment, isBeauty, effectiveTotal, loyaltyPointsToRedeem, appliedLoyaltyDiscount, exchangeRate, showWhatsAppToast, onPaid]);

  const submit = async () => {
    const aptId = appointment?._id || appointment?.id;
    if (!aptId) { toast.error('Cita no identificada'); return; }

    try {
      setSubmitting(true);

      if (mixedMode) {
        if (!mixedBalanced) {
          toast.error(`La suma de pagos ($${linesTotal.toFixed(2)}) no coincide con el total ($${effectiveTotal.toFixed(2)})`);
          return;
        }
        // Submit each line sequentially
        for (const [idx, line] of lines.entries()) {
          const methodLabel = METHOD_LABELS[line.method] || line.method;
          // Include loyalty fields only on the first line (avoid double-redeeming)
          const loyaltyFields = idx === 0 && isBeauty && loyaltyPointsToRedeem > 0
            ? { loyaltyPointsRedeemed: loyaltyPointsToRedeem, loyaltyDiscount: appliedLoyaltyDiscount }
            : {};
          if (isBeauty) {
            await fetchApi(`/beauty-bookings/${aptId}/status`, {
              method: 'PATCH',
              body: JSON.stringify({
                paymentStatus: 'paid',
                paymentMethod: methodLabel,
                amountPaid: Number(line.amount),
                ...loyaltyFields,
                ...(idx === 0 && addedProducts.length > 0 && {
                  addons: addedProducts.map(p => ({ name: p.name, price: p.price, quantity: p.quantity, productId: p._id })),
                }),
              }),
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
            body: JSON.stringify({
              paymentStatus: 'paid',
              paymentMethod: methodLabel,
              amountPaid: effectiveTotal,
              ...(loyaltyPointsToRedeem > 0 && {
                loyaltyPointsRedeemed: loyaltyPointsToRedeem,
                loyaltyDiscount: appliedLoyaltyDiscount,
              }),
              ...(addedProducts.length > 0 && {
                addons: addedProducts.map(p => ({ name: p.name, price: p.price, quantity: p.quantity, productId: p._id })),
              }),
            }),
          });
        } else {
          await fetchApi(`/appointments/${aptId}/manual-deposits`, {
            method: 'POST',
            body: JSON.stringify({
              amount: effectiveTotal, currency: isVes ? 'VES' : 'USD', method,
              reference: reference || undefined, exchangeRate: exchangeRate || undefined,
              status: 'confirmed', confirmedAmount: effectiveTotal, transactionDate: new Date().toISOString(),
            }),
          });
        }
        showWhatsAppToast(effectiveTotal);
        trackEvent('payment_completed', { mode: 'single', method, total: effectiveTotal });
      }

      haptics.success();
      emitBadgeUpdate({ type: 'pay' });
      setAddedProducts([]);
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

        {/* Product upsell — beauty vertical only */}
        {isBeauty && (
          <div className="border-t pt-3 mt-1">
            {addedProducts.length > 0 && (
              <div className="space-y-1 mb-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Productos adicionales</p>
                {addedProducts.map(p => (
                  <div key={p._id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{p.name}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateProductQty(p._id, -1)}
                        className="w-5 h-5 rounded border text-xs flex items-center justify-center">-</button>
                      <span className="w-4 text-center text-xs">{p.quantity}</span>
                      <button type="button" onClick={() => updateProductQty(p._id, 1)}
                        className="w-5 h-5 rounded border text-xs flex items-center justify-center">+</button>
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{formatCurrency(p.price * p.quantity)}</span>
                    <button type="button" onClick={() => removeProduct(p._id)} className="text-red-400 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setProductSearchOpen(true)}
              className="w-full text-xs text-muted-foreground border border-dashed rounded-md py-1.5 flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-colors"
            >
              <Package className="h-3 w-3" /> Agregar producto
            </button>

            {/* Product search bottom sheet */}
            {productSearchOpen && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setProductSearchOpen(false)}>
                <div className="bg-background w-full rounded-t-xl p-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="font-medium mb-3 text-sm">Buscar producto</h3>
                  <input
                    autoFocus
                    className="w-full border rounded-md px-3 py-2 text-sm mb-3 bg-background"
                    placeholder="Nombre o código..."
                    value={productSearchQuery}
                    onChange={e => { setProductSearchQuery(e.target.value); searchProducts(e.target.value); }}
                  />
                  {productSearchLoading && <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>}
                  {productSearchResults.map(p => {
                    const price = p.sellingPrice ?? p.price?.amount ?? p.price ?? 0;
                    return (
                      <button key={p._id} type="button" onClick={() => addProduct(p)}
                        className="w-full text-left p-2 hover:bg-accent rounded-md flex justify-between items-center mb-1">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {p.availableQuantity ?? p.totalQuantity ?? '—'}
                          </p>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(price)}</span>
                      </button>
                    );
                  })}
                  {!productSearchLoading && productSearchResults.length === 0 && productSearchQuery.length >= 2 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                  )}
                  <button type="button" onClick={() => setProductSearchOpen(false)}
                    className="mt-2 w-full text-sm text-muted-foreground py-2 border rounded-md">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loyalty points — only shown for beauty vertical when client has points */}
        {isBeauty && loyaltyBalance > 0 && (
          <div className="rounded-[var(--mobile-radius-md)] border border-border bg-amber-50 dark:bg-amber-950/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  🎁 {loyaltyBalance} puntos disponibles
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {loyaltyApplied
                    ? `Descuento aplicado: -$${appliedLoyaltyDiscount.toFixed(2)}`
                    : `Vale hasta $${(loyaltyBalance * LOYALTY_POINT_VALUE).toFixed(2)} de descuento`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoyaltyApplied((v) => !v)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors no-tap-highlight',
                  loyaltyApplied
                    ? 'bg-amber-600 text-white'
                    : 'border border-amber-400 text-amber-700 dark:text-amber-300 bg-transparent',
                )}
              >
                {loyaltyApplied ? 'Quitar' : 'Aplicar'}
              </button>
            </div>
            {loyaltyApplied && (
              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 text-xs space-y-0.5">
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>Subtotal</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800 dark:text-amber-300 font-semibold">
                  <span>Puntos ({loyaltyPointsToRedeem} pts)</span>
                  <span>-${appliedLoyaltyDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-900 dark:text-amber-200">
                  <span>Total a cobrar</span>
                  <span>${effectiveTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

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
            {/* Amount display — tappable to edit when pre-filled */}
            <div
              className="text-center"
              onClick={hasPrefilledAmount && !showNumPad ? () => setShowNumPad(true) : undefined}
              style={hasPrefilledAmount && !showNumPad ? { cursor: 'pointer' } : {}}
            >
              <p className="text-xs text-muted-foreground">
                Monto{hasPrefilledAmount && !showNumPad && <span className="text-primary"> · toca para editar</span>}
              </p>
              <div className="text-5xl font-bold tabular-nums mt-1">${amount}</div>
              {isVes && grandTotalVes && (
                <p className="text-sm text-muted-foreground mt-1">≈ Bs. {grandTotalVes.toFixed(2)}</p>
              )}
            </div>

            {/* NumPad — hidden by default when amount is pre-filled */}
            {showNumPad && <NumPad value={amount} onChange={setAmount} />}

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

            {/* Quick-pay buttons — pre-filled amount, not editing */}
            {hasPrefilledAmount && !showNumPad && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Pago rápido</p>
                <div className="space-y-2">
                  {methods.slice(0, 4).map(m => {
                    const Icon = METHOD_ICONS[m.id] || Banknote;
                    return (
                      <button key={m.id} type="button" disabled={submitting} onClick={() => quickPay(m.id)}
                        className="w-full flex items-center justify-between rounded-[var(--mobile-radius-md)] border px-4 py-3.5 text-sm font-semibold no-tap-highlight bg-card border-border active:scale-95 transition-transform disabled:opacity-50">
                        <div className="flex items-center gap-2">
                          <Icon size={18} />
                          <span>{m.name || METHOD_LABELS[m.id] || m.id}</span>
                        </div>
                        <span className="font-bold tabular-nums text-base">${effectiveTotal.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular method + reference — when editing amount or no pre-fill */}
            {(!hasPrefilledAmount || showNumPad) && (
              <>
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
            )}
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
              <span className="font-bold tabular-nums">${linesTotal.toFixed(2)} / ${effectiveTotal.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Sticky confirm */}
      <div className="absolute inset-x-0 bottom-0 px-4 pt-3 pb-4 bg-card border-t border-border" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
        <div className="flex items-center justify-between mb-2 text-sm" aria-live="polite" aria-atomic="true">
          <span className="text-muted-foreground">Total a cobrar</span>
          <AnimatedNumber
            value={effectiveTotal}
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
