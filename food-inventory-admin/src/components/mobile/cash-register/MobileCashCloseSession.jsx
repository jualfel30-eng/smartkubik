import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle, AlertTriangle, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { SPRING, scaleIn } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { NumPad } from './MobileCashMovement.jsx';

const fmt = (n, currency = 'USD') => {
  if (currency === 'VES') return `Bs ${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function VarianceRow({ label, expected, counted, currency }) {
  const diff = counted - expected;
  const absDiff = Math.abs(diff);

  let color, Icon, statusText;
  if (absDiff < 0.01) {
    color = 'text-emerald-500';
    Icon = CheckCircle;
    statusText = 'Exacto';
  } else if (absDiff <= 5) {
    color = 'text-amber-500';
    Icon = AlertTriangle;
    statusText = 'Diferencia menor';
  } else {
    color = 'text-red-500';
    Icon = XCircle;
    statusText = 'Diferencia significativa';
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-2">
      <h4 className="text-sm font-medium">{label}</h4>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Esperado</span>
        <span className="tabular-nums font-medium">{fmt(expected, currency)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Contado</span>
        <span className="tabular-nums font-medium">{fmt(counted, currency)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Diferencia</span>
        <span className={cn('flex items-center gap-1 text-sm font-semibold tabular-nums', color)}>
          <Icon className="w-4 h-4" />
          {diff >= 0 ? '+' : ''}{fmt(diff, currency)}
        </span>
      </div>
      <p className={cn('text-xs', color)}>{statusText}</p>
    </div>
  );
}

export default function MobileCashCloseSession({ open, onClose, session, onSuccess }) {
  const [step, setStep] = useState(1);
  const [closingAmountUsd, setClosingAmountUsd] = useState('0');
  const [closingAmountVes, setClosingAmountVes] = useState('0');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [notes, setNotes] = useState('');
  const [activeInput, setActiveInput] = useState('usd');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setClosingAmountUsd('0');
    setClosingAmountVes('0');
    setNotes('');
    setActiveInput('usd');
    setSubmitting(false);
    setShowSuccess(false);
  }, []);

  // Fetch exchange rate when sheet opens
  useEffect(() => {
    if (!open) return;
    reset();
    fetchApi('/exchange-rate/bcv')
      .then(data => setExchangeRate(data?.rate || data?.exchangeRate || null))
      .catch(() => {});
  }, [open, reset]);

  const refreshRate = async () => {
    try {
      const data = await fetchApi('/exchange-rate/bcv');
      setExchangeRate(data?.rate || data?.exchangeRate || null);
      haptics.success();
      toast.success('Tasa actualizada');
    } catch {
      toast.error('Error al actualizar tasa');
    }
  };

  // Expected totals (same formula as CashRegisterDashboard.jsx:525-557)
  const { expectedUsd, expectedVes } = useMemo(() => {
    if (!session) return { expectedUsd: 0, expectedVes: 0 };
    const totals = session.calculatedTotals || {};
    const openingUsd = session.openingAmountUsd || 0;
    const openingVes = session.openingAmountVes || 0;
    const salesCashUsd = totals.cashUsd || 0;
    const salesCashVes = totals.cashVes || 0;

    const movements = session.cashMovements || [];
    const cashInUsd = movements.filter(m => (m.type || '').toLowerCase() === 'in' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
    const cashOutUsd = movements.filter(m => (m.type || '').toLowerCase() === 'out' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
    const cashInVes = movements.filter(m => (m.type || '').toLowerCase() === 'in' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);
    const cashOutVes = movements.filter(m => (m.type || '').toLowerCase() === 'out' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);

    return {
      expectedUsd: openingUsd + salesCashUsd + cashInUsd - cashOutUsd,
      expectedVes: openingVes + salesCashVes + cashInVes - cashOutVes,
    };
  }, [session]);

  const countedUsd = parseFloat(closingAmountUsd) || 0;
  const countedVes = parseFloat(closingAmountVes) || 0;

  // NumPad routes to active input
  const handleNumPadChange = (val) => {
    if (activeInput === 'usd') setClosingAmountUsd(val);
    else setClosingAmountVes(val);
  };

  const numPadValue = activeInput === 'usd' ? closingAmountUsd : closingAmountVes;

  // Session duration
  const duration = useMemo(() => {
    if (!session?.openedAt) return '';
    const diff = Date.now() - new Date(session.openedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [session?.openedAt]);

  const totalSales = (session?.calculatedTotals?.salesUsd || session?.totalSalesUsd || 0);
  const totalOrders = (session?.calculatedTotals?.totalOrders || session?.totalTransactions || 0);

  const handleConfirm = async () => {
    if (!session?._id || submitting) return;
    setSubmitting(true);
    try {
      await fetchApi(`/cash-register/sessions/${session._id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          closingAmountUsd: countedUsd,
          closingAmountVes: countedVes,
          exchangeRate: exchangeRate || 0,
          notes: notes.trim(),
        }),
      });
      haptics.success();
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        reset();
      }, 2200);
    } catch (err) {
      haptics.error();
      toast.error('Error al cerrar caja', { description: err.message });
      setSubmitting(false);
    }
  };

  const handleSheetClose = () => {
    if (showSuccess) return;
    reset();
    onClose?.();
  };

  return (
    <>
      <MobileActionSheet
        open={open}
        onClose={handleSheetClose}
        title={step === 1 ? 'Cerrar Caja' : 'Resumen de Cierre'}
        snapPoints={[0.88, 0.96]}
        defaultSnap={0}
        footer={
          step === 1 ? (
            <motion.button
              type="button"
              onClick={() => { haptics.tap(); setStep(2); }}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold no-tap-highlight active:opacity-90 transition-opacity"
              whileTap={{ scale: 0.97 }}
            >
              Revisar Cierre
            </motion.button>
          ) : (
            <div className="flex gap-3">
              <motion.button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-12 rounded-xl bg-card border border-border font-medium no-tap-highlight active:bg-muted transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Volver
              </motion.button>
              <motion.button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className={cn(
                  'flex-[2] h-12 rounded-xl text-white font-semibold no-tap-highlight transition-colors',
                  submitting ? 'bg-red-600/50' : 'bg-red-600 active:bg-red-700',
                )}
                whileTap={{ scale: 0.97 }}
              >
                {submitting ? 'Cerrando…' : 'Confirmar Cierre'}
              </motion.button>
            </div>
          )
        }
      >
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">Cuenta el efectivo en caja</p>

              {/* USD input card */}
              <button
                type="button"
                onClick={() => { haptics.select(); setActiveInput('usd'); }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-colors',
                  activeInput === 'usd' ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Efectivo USD en caja</span>
                  <span className="text-xs text-muted-foreground">Esperado: {fmt(expectedUsd)}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-muted-foreground">$</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {closingAmountUsd === '0' ? '0.00' : closingAmountUsd}
                  </span>
                </div>
              </button>

              {/* VES input card */}
              <button
                type="button"
                onClick={() => { haptics.select(); setActiveInput('ves'); }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-colors',
                  activeInput === 'ves' ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Efectivo VES en caja</span>
                  <span className="text-xs text-muted-foreground">Esperado: {fmt(expectedVes, 'VES')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-muted-foreground text-sm">Bs</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {closingAmountVes === '0' ? '0.00' : closingAmountVes}
                  </span>
                </div>
              </button>

              {/* NumPad */}
              <NumPad value={numPadValue} onChange={handleNumPadChange} />

              {/* Exchange rate */}
              {exchangeRate && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-muted-foreground">
                    Tasa BCV: <span className="font-medium">{exchangeRate}</span>
                  </span>
                  <button
                    type="button"
                    onClick={refreshRate}
                    className="flex items-center gap-1 text-xs text-primary no-tap-highlight"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Actualizar
                  </button>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Notas de cierre (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Observaciones..."
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Variance cards */}
              <VarianceRow
                label="Efectivo USD"
                expected={expectedUsd}
                counted={countedUsd}
                currency="USD"
              />
              <VarianceRow
                label="Efectivo VES"
                expected={expectedVes}
                counted={countedVes}
                currency="VES"
              />

              {/* Day summary */}
              <div className="rounded-xl bg-card border border-border p-4 space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Resumen del día</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total ventas</span>
                  <span className="font-semibold tabular-nums">{fmt(totalSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transacciones</span>
                  <span className="font-semibold tabular-nums">{totalOrders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duración</span>
                  <span className="font-semibold">{duration}</span>
                </div>
              </div>

              {/* Notes preview */}
              {notes.trim() && (
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </MobileActionSheet>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-background flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING.bouncy}
              className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4"
            >
              <Lock className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold"
            >
              Caja Cerrada
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground mt-2"
            >
              Cierre registrado exitosamente
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
