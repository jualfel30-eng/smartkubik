import { useState, useEffect, useCallback } from 'react';
import { X, Check, Package, Scissors } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchApi, getLoyaltyBalance, getProducts, getTenantSettings } from '@/lib/api';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { useAuth } from '@/hooks/use-auth';
import { useSmartPaymentDefaults } from '@/hooks/useSmartPaymentDefaults';
import { useDailyRevenue } from '@/hooks/useDailyRevenue';
import { toast } from '@/lib/toast';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { emitBadgeUpdate } from '@/lib/badge-events';
import { DUR, EASE, pulseGlow } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import { useRipple } from '../primitives/RippleOverlay.jsx';
import MobilePaymentMethods, { METHOD_LABELS, VES_METHODS } from './MobilePaymentMethods.jsx';
import MobileMixedPayment from './MobileMixedPayment.jsx';
import PaymentSuccessOverlay from './PaymentSuccessOverlay.jsx';

// ─── Loyalty constants ───────────────────────────────────────────────────────
const LOYALTY_POINT_VALUE = 0.01;
const LOYALTY_MAX_PCT = 0.50;

// ─── NumPad ──────────────────────────────────────────────────────────────────
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

// ─── TipPicker ───────────────────────────────────────────────────────────────
function TipPicker({ value, onChange }) {
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

// ─── Main component ──────────────────────────────────────────────────────────
export default function MobilePOS({ appointment, onClose, onPaid }) {
  const { isBeauty } = useMobileVertical();
  const { tenant } = useAuth();
  const tenantId = tenant?._id || tenant?.id;
  const clientPhone = appointment?.client?.phone || appointment?.customerPhone;
  const clientName = appointment?.customerName || appointment?.client?.name || '';

  // Smart defaults + daily revenue hooks
  const smartDefaults = useSmartPaymentDefaults(tenantId, clientPhone);
  const dailyRevenue = useDailyRevenue(tenantId);

  const total = Number(appointment?.totalPrice ?? 0);
  const hasPrefilledAmount = total > 0;

  // Resolve initial tip: client preference > global preference > tenant default > 0
  const defaultTipPct = smartDefaults.clientTipPct
    ?? smartDefaults.preferredTipPct
    ?? Number(tenant?.settings?.tips?.defaultTipPercentage ?? 0);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('bill'); // 'bill' | 'success'
  const [successData, setSuccessData] = useState(null);

  const [amount, setAmount] = useState(total > 0 ? total.toFixed(2) : '0');
  const [showNumPad, setShowNumPad] = useState(!hasPrefilledAmount);
  const [tipPct, setTipPct] = useState(defaultTipPct);
  const [method, setMethod] = useState('efectivo_usd');
  const [reference, setReference] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Loyalty
  const [loyaltyBalance, setLoyaltyBalance] = useState(null);
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);

  // Product upsell
  const [addedProducts, setAddedProducts] = useState([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  // Service upsell
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [serviceSearchResults, setServiceSearchResults] = useState([]);
  const [serviceSearchLoading, setServiceSearchLoading] = useState(false);

  // Mixed payment
  const [mixedMode, setMixedMode] = useState(false);
  const [lines, setLines] = useState([
    { idx: 0, method: 'efectivo_usd', amount: total > 0 ? total.toFixed(2) : '' },
  ]);

  // ─── Init: fetch payment methods, exchange rate, loyalty ───────────────────
  useEffect(() => {
    getTenantSettings()
      .then(res => {
        const data = res?.data || res;
        const saved = data?.settings?.paymentMethods;
        if (Array.isArray(saved) && saved.length > 0) {
          const enabled = saved.filter(m => m.enabled).map(m => ({ id: m.id, name: m.name }));
          if (enabled.length > 0) {
            setPaymentMethods(enabled);
            setMethod(enabled[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    if (!isBeauty) return;
    const tId = tenantId;
    const phone = clientPhone;
    if (!tId || !phone) return;
    getLoyaltyBalance(tId, phone)
      .then((res) => {
        const pts = res?.points ?? 0;
        if (pts > 0) setLoyaltyBalance(pts);
      })
      .catch(() => {});
  }, [isBeauty, tenantId, clientPhone]);

  // ─── Derived values ────────────────────────────────────────────────────────
  const addonsTotal = addedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const tipAmount = tipPct > 0 ? (Number(amount) * tipPct / 100) : 0;
  const grandTotal = Number(amount) + tipAmount + addonsTotal;
  const isVes = VES_METHODS.has(method);
  const grandTotalVes = exchangeRate ? grandTotal * exchangeRate : null;

  const maxLoyaltyDiscount = loyaltyBalance !== null
    ? Math.min(loyaltyBalance * LOYALTY_POINT_VALUE, grandTotal * LOYALTY_MAX_PCT)
    : 0;
  const appliedLoyaltyDiscount = loyaltyApplied ? maxLoyaltyDiscount : 0;
  const loyaltyPointsToRedeem = loyaltyApplied ? Math.round(appliedLoyaltyDiscount / LOYALTY_POINT_VALUE) : 0;
  const effectiveTotal = Math.max(0, grandTotal - appliedLoyaltyDiscount);

  const linesTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const mixedBalanced = Math.abs(linesTotal - effectiveTotal) < 0.005;

  const methods = paymentMethods.length
    ? paymentMethods.filter(m => m.id !== 'pago_mixto')
    : Object.entries(METHOD_LABELS).map(([id, name]) => ({ id, name }));

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  // ─── Mixed payment helpers ─────────────────────────────────────────────────
  const addLine = useCallback(() => {
    setLines(prev => [...prev, { idx: prev.length, method: 'efectivo_usd', amount: '' }]);
  }, []);
  const removeLine = useCallback((idx) => {
    setLines(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, idx: i })));
  }, []);
  const updateLine = useCallback((idx, updated) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...updated, idx: i } : l));
  }, []);

  // ─── Upsell: product search ────────────────────────────────────────────────
  const searchProducts = useCallback(async (query) => {
    if (!query || query.length < 2) { setProductSearchResults([]); return; }
    setProductSearchLoading(true);
    try {
      const res = await getProducts({ search: query, limit: 20 });
      const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setProductSearchResults(items.filter(p => (p.totalQuantity ?? p.availableQuantity ?? 1) > 0));
    } catch (e) { console.error('Product search error:', e); }
    finally { setProductSearchLoading(false); }
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

  // ─── Upsell: service search ────────────────────────────────────────────────
  const searchServices = useCallback(async (query) => {
    if (!query || query.length < 2) { setServiceSearchResults([]); return; }
    setServiceSearchLoading(true);
    try {
      const res = await fetchApi('/beauty-services');
      const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const q = query.toLowerCase();
      setServiceSearchResults(items.filter(s => s.isActive !== false && s.name?.toLowerCase().includes(q)));
    } catch (e) { console.error('Service search error:', e); }
    finally { setServiceSearchLoading(false); }
  }, []);

  const addService = useCallback((service) => {
    const price = service.price?.amount ?? service.price ?? 0;
    const id = service._id;
    setAddedProducts(prev => {
      if (prev.find(p => p._id === id)) return prev;
      return [...prev, { _id: id, name: service.name, price, quantity: 1, isService: true, duration: service.duration }];
    });
    setServiceSearchOpen(false);
    setServiceSearchQuery('');
    setServiceSearchResults([]);
  }, []);

  const updateProductQty = useCallback((productId, delta) => {
    setAddedProducts(prev =>
      prev.map(p => p._id === productId ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p).filter(p => p.quantity > 0),
    );
  }, []);

  const removeProduct = useCallback((productId) => {
    setAddedProducts(prev => prev.filter(p => p._id !== productId));
  }, []);

  // ─── Payment success handler (shared between quickPay and submit) ──────────
  const handlePaymentSuccess = useCallback((paidTotal, methodId) => {
    const methodLabel = METHOD_LABELS[methodId] || methodId;

    // Record smart defaults
    smartDefaults.recordPayment(methodId, tipPct, clientPhone, clientName);

    // Optimistically update daily revenue
    dailyRevenue.commitDay(paidTotal);

    // Capture success data snapshot
    setSuccessData({
      amount: paidTotal,
      methodLabel,
      customerName: clientName,
      customerPhone: clientPhone,
      todayTotal: dailyRevenue.todayTotal + paidTotal,
      todayCount: dailyRevenue.todayCount + 1,
      dailyGoal: dailyRevenue.dailyGoal,
      streak: dailyRevenue.streak,
      isNewRecord: (dailyRevenue.todayTotal + paidTotal) > dailyRevenue.record && dailyRevenue.record > 0,
      milestones: dailyRevenue.milestones,
      loyaltyPointsEarned: isBeauty ? Math.round(paidTotal * 10) : null, // 10 pts per $1 (example)
    });

    emitBadgeUpdate({ type: 'pay' });
    trackEvent('payment_completed', { method: methodId, total: paidTotal });
    setAddedProducts([]);
    setPhase('success');
  }, [smartDefaults, dailyRevenue, tipPct, clientPhone, clientName, isBeauty]);

  // ─── Quick-pay (one-tap, pre-filled amount) ───────────────────────────────
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
              addons: addedProducts.map(p => ({ name: p.name, price: p.price, quantity: p.quantity, ...(p.isService ? {} : { productId: p._id }) })),
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
      handlePaymentSuccess(effectiveTotal, methodId);
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  }, [appointment, isBeauty, effectiveTotal, loyaltyPointsToRedeem, appliedLoyaltyDiscount, addedProducts, exchangeRate, handlePaymentSuccess]);

  // ─── Full submit (manual amount or mixed) ──────────────────────────────────
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
        for (const [idx, line] of lines.entries()) {
          const methodLabel = METHOD_LABELS[line.method] || line.method;
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
                  addons: addedProducts.map(p => ({ name: p.name, price: p.price, quantity: p.quantity, ...(p.isService ? {} : { productId: p._id }) })),
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
        handlePaymentSuccess(linesTotal, lines[0].method);
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
                addons: addedProducts.map(p => ({ name: p.name, price: p.price, quantity: p.quantity, ...(p.isService ? {} : { productId: p._id }) })),
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
        handlePaymentSuccess(effectiveTotal, method);
      }
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error(err.message || 'Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── WhatsApp handler for success overlay ──────────────────────────────────
  const openWhatsApp = useCallback(() => {
    const phone = clientPhone?.replace(/\D/g, '');
    if (!phone) return;
    const svcName = appointment?.serviceName || 'el servicio';
    const msg = encodeURIComponent(
      `Hola ${clientName}, hemos registrado tu pago de $${successData?.amount?.toFixed(2) || '0.00'} por ${svcName}. ¡Gracias por visitarnos!`,
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }, [clientPhone, clientName, appointment, successData]);

  // ─── Dismiss success → tell parent we're done ─────────────────────────────
  const handleDismissSuccess = useCallback(() => {
    onPaid?.();
  }, [onPaid]);

  // ─── Success overlay ───────────────────────────────────────────────────────
  if (phase === 'success' && successData) {
    return (
      <PaymentSuccessOverlay
        {...successData}
        onClose={handleDismissSuccess}
        onWhatsApp={clientPhone ? openWhatsApp : undefined}
      />
    );
  }

  // ─── Bill phase (main POS UI) ──────────────────────────────────────────────
  return (
    <MobileActionSheet
      open
      onClose={onClose}
      title={`Cobrar${clientName ? ` · ${clientName}` : ''}`}
      className="max-h-[94vh]"
      footer={
        <div className="px-4 pt-3 pb-4 bg-card border-t border-border" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <div className="flex items-center justify-between mb-2 text-sm" aria-live="polite" aria-atomic="true">
            <span className="text-muted-foreground">Total a cobrar</span>
            <AnimatedNumber
              value={effectiveTotal}
              format={(n) => `$${n.toFixed(2)}`}
              className="font-bold text-lg tabular-nums"
            />
          </div>

          {/* Confirm button — only when NOT using mega-button quick-pay */}
          {(!hasPrefilledAmount || showNumPad || mixedMode) && (
            <motion.button
              type="button"
              disabled={submitting || (mixedMode ? !mixedBalanced || linesTotal <= 0 : Number(amount) <= 0)}
              onClick={submit}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-[var(--mobile-radius-md)] bg-emerald-600 text-white py-4 text-base font-bold no-tap-highlight flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
            >
              {submitting && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <Check size={20} />
              {submitting ? 'Procesando...' : mixedMode ? 'Confirmar pago dividido' : 'Confirmar pago'}
            </motion.button>
          )}
        </div>
      }
    >
      <div className="space-y-4 pb-4">

        {/* Service details card */}
        <div className="rounded-[var(--mobile-radius-md)] bg-muted px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{appointment?.serviceName || 'Servicio'}</p>
              <p className="text-sm text-muted-foreground">
                {appointment?.resourceName || appointment?.professionalName || ''}
                {appointment?.duration ? ` · ${appointment.duration} min` : ''}
              </p>
            </div>
            {total > 0 && (
              <span className="text-base font-bold tabular-nums shrink-0 ml-3">
                ${total.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Product & Service upsell — beauty only, ALWAYS VISIBLE */}
        {isBeauty && (
          <div>
            {addedProducts.length > 0 && (
              <div className="space-y-1 mb-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Adicionales</p>
                {addedProducts.map(p => (
                  <div key={p._id} className="flex items-center gap-2 text-sm">
                    {p.isService
                      ? <Scissors className="h-3 w-3 text-primary shrink-0" />
                      : <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                    }
                    <span className="flex-1 truncate">{p.name}</span>
                    {!p.isService && (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateProductQty(p._id, -1)}
                          className="w-5 h-5 rounded border text-xs flex items-center justify-center">-</button>
                        <span className="w-4 text-center text-xs">{p.quantity}</span>
                        <button type="button" onClick={() => updateProductQty(p._id, 1)}
                          className="w-5 h-5 rounded border text-xs flex items-center justify-center">+</button>
                      </div>
                    )}
                    {p.isService && p.duration && (
                      <span className="text-[10px] text-muted-foreground">{p.duration}min</span>
                    )}
                    <span className="text-xs text-muted-foreground w-16 text-right">{formatCurrency(p.price * p.quantity)}</span>
                    <button type="button" onClick={() => removeProduct(p._id)} className="text-red-400 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setProductSearchOpen(true)}
                className="flex-1 text-xs font-medium text-muted-foreground border border-primary/20 bg-primary/5 rounded-[var(--mobile-radius-md)] py-2 flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary transition-colors no-tap-highlight">
                <Package className="h-3.5 w-3.5" /> Agregar producto
              </button>
              <button type="button" onClick={() => setServiceSearchOpen(true)}
                className="flex-1 text-xs font-medium text-muted-foreground border border-primary/20 bg-primary/5 rounded-[var(--mobile-radius-md)] py-2 flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary transition-colors no-tap-highlight">
                <Scissors className="h-3.5 w-3.5" /> Agregar servicio
              </button>
            </div>

            {/* Product search bottom sheet */}
            {productSearchOpen && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setProductSearchOpen(false)}>
                <div className="bg-background w-full rounded-t-xl p-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="font-medium mb-3 text-sm">Buscar producto</h3>
                  <input autoFocus className="w-full border rounded-md px-3 py-2 text-sm mb-3 bg-background"
                    placeholder="Nombre o código..." value={productSearchQuery}
                    onChange={e => { setProductSearchQuery(e.target.value); searchProducts(e.target.value); }} />
                  {productSearchLoading && <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>}
                  {productSearchResults.map(p => {
                    const price = p.sellingPrice ?? p.price?.amount ?? p.price ?? 0;
                    return (
                      <button key={p._id} type="button" onClick={() => addProduct(p)}
                        className="w-full text-left p-2 hover:bg-accent rounded-md flex justify-between items-center mb-1">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Stock: {p.availableQuantity ?? p.totalQuantity ?? '—'}</p>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(price)}</span>
                      </button>
                    );
                  })}
                  {!productSearchLoading && productSearchResults.length === 0 && productSearchQuery.length >= 2 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                  )}
                  <button type="button" onClick={() => setProductSearchOpen(false)}
                    className="mt-2 w-full text-sm text-muted-foreground py-2 border rounded-md">Cancelar</button>
                </div>
              </div>
            )}

            {/* Service search bottom sheet */}
            {serviceSearchOpen && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setServiceSearchOpen(false)}>
                <div className="bg-background w-full rounded-t-xl p-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="font-medium mb-3 text-sm">Agregar servicio</h3>
                  <input autoFocus className="w-full border rounded-md px-3 py-2 text-sm mb-3 bg-background"
                    placeholder="Buscar servicio..." value={serviceSearchQuery}
                    onChange={e => { setServiceSearchQuery(e.target.value); searchServices(e.target.value); }} />
                  {serviceSearchLoading && <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>}
                  {serviceSearchResults.map(s => {
                    const price = s.price?.amount ?? s.price ?? 0;
                    const alreadyAdded = addedProducts.some(p => p._id === s._id);
                    return (
                      <button key={s._id} type="button" onClick={() => !alreadyAdded && addService(s)}
                        disabled={alreadyAdded}
                        className={cn("w-full text-left p-2 rounded-md flex justify-between items-center mb-1",
                          alreadyAdded ? "opacity-40 cursor-default" : "hover:bg-accent")}>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.duration}min · {s.category || 'Servicio'}</p>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(price)}</span>
                      </button>
                    );
                  })}
                  {!serviceSearchLoading && serviceSearchResults.length === 0 && serviceSearchQuery.length >= 2 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                  )}
                  <button type="button" onClick={() => setServiceSearchOpen(false)}
                    className="mt-2 w-full text-sm text-muted-foreground py-2 border rounded-md">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tip picker */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Propina</p>
          <TipPicker value={tipPct} onChange={setTipPct} />
          {tipPct > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              +${tipAmount.toFixed(2)} propina
            </p>
          )}
        </div>

        {/* Loyalty points — beauty only, balance > 0 */}
        {isBeauty && loyaltyBalance > 0 && (
          <div className="rounded-[var(--mobile-radius-md)] border border-border bg-amber-50 dark:bg-amber-950/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {clientName ? `${clientName} tiene` : ''} {loyaltyBalance} puntos
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {loyaltyApplied
                    ? `Descuento aplicado: -$${appliedLoyaltyDiscount.toFixed(2)}`
                    : `Descuento disponible: $${maxLoyaltyDiscount.toFixed(2)}`}
                </p>
              </div>
              <button type="button" onClick={() => setLoyaltyApplied((v) => !v)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors no-tap-highlight',
                  loyaltyApplied
                    ? 'bg-amber-600 text-white'
                    : 'border border-amber-400 text-amber-700 dark:text-amber-300 bg-transparent',
                )}>
                {loyaltyApplied ? 'Quitar' : 'Aplicar puntos'}
              </button>
            </div>
            {loyaltyApplied && (
              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 text-xs space-y-0.5">
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>Subtotal</span><span>${grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800 dark:text-amber-300 font-semibold">
                  <span>Puntos ({loyaltyPointsToRedeem} pts)</span><span>-${appliedLoyaltyDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-900 dark:text-amber-200">
                  <span>Total a cobrar</span><span>${effectiveTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Large animated total */}
        <div className="text-center py-2">
          <AnimatedNumber
            value={effectiveTotal}
            format={(n) => `$${n.toFixed(2)}`}
            className="text-4xl font-bold tabular-nums"
          />
          {exchangeRate && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DUR.fast }}
              className="text-sm text-muted-foreground mt-1"
            >
              ≈ Bs. {(effectiveTotal * exchangeRate).toFixed(2)}
            </motion.p>
          )}
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
            {/* Amount display — tappable to edit when pre-filled */}
            {hasPrefilledAmount && !showNumPad && (
              <div className="text-center" onClick={() => setShowNumPad(true)} style={{ cursor: 'pointer' }}>
                <p className="text-xs text-muted-foreground">
                  Monto <span className="text-primary">· toca para editar</span>
                </p>
              </div>
            )}

            {/* NumPad — hidden by default when pre-filled */}
            {showNumPad && <NumPad value={amount} onChange={setAmount} />}

            {/* Smart payment methods */}
            <MobilePaymentMethods
              methods={methods}
              selected={method}
              onSelect={setMethod}
              preferredMethod={smartDefaults.preferredMethod}
              clientMethod={smartDefaults.clientMethod}
              clientHint={smartDefaults.clientHint}
              effectiveTotal={effectiveTotal}
              onQuickPay={quickPay}
              submitting={submitting}
              hasPrefilledAmount={hasPrefilledAmount && !showNumPad}
            />

            {/* Reference — only when NOT using quick-pay and method requires it */}
            {(!hasPrefilledAmount || showNumPad) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Referencia (opcional)</p>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="Nro. de confirmación..."
                  className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
              </div>
            )}
          </>
        ) : (
          <MobileMixedPayment
            lines={lines}
            methods={methods}
            effectiveTotal={effectiveTotal}
            exchangeRate={exchangeRate}
            onAddLine={addLine}
            onRemoveLine={removeLine}
            onUpdateLine={updateLine}
          />
        )}
      </div>
    </MobileActionSheet>
  );
}
