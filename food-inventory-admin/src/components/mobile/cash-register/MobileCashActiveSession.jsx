import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical, Plus, Lock, History, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Sun, Sunset, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { SPRING, listItem, scaleIn, fadeUp, STAGGER } from '@/lib/motion';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';

const SHIFT_META = {
  morning: { label: 'Mañana', icon: Sun, color: 'text-amber-400' },
  afternoon: { label: 'Tarde', icon: Sunset, color: 'text-orange-400' },
  night: { label: 'Noche', icon: Moon, color: 'text-indigo-400' },
};

const METHOD_COLORS = {
  cashUsd: 'bg-emerald-500',
  cashVes: 'bg-emerald-400',
  cardUsd: 'bg-amber-500',
  cardVes: 'bg-amber-400',
  transferUsd: 'bg-blue-500',
  transferVes: 'bg-blue-400',
  otherUsd: 'bg-violet-500',
  otherVes: 'bg-violet-400',
};

const METHOD_LABELS = {
  cashUsd: 'Efectivo USD',
  cashVes: 'Efectivo VES',
  cardUsd: 'Tarjeta USD',
  cardVes: 'Tarjeta / POS',
  transferUsd: 'Transferencia USD',
  transferVes: 'Transferencia VES',
  otherUsd: 'Otro USD',
  otherVes: 'Otro VES',
};

const fmt = (n, currency = 'USD') => {
  if (currency === 'VES') return `Bs ${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function useSessionTimer(openedAt) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!openedAt) return;
    const calc = () => {
      const diff = Date.now() - new Date(openedAt).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [openedAt]);
  return elapsed;
}

export default function MobileCashActiveSession({ session, onRefresh, onClose, onMovement, onHistory }) {
  const [showMenu, setShowMenu] = useState(false);
  const elapsed = useSessionTimer(session?.openedAt);

  const totals = session?.calculatedTotals || {};
  const salesUsd = totals.salesUsd || session?.totalSalesUsd || 0;
  const salesVes = totals.salesVes || session?.totalSalesVes || 0;
  const totalOrders = totals.totalOrders || session?.totalTransactions || 0;

  const shift = SHIFT_META[session?.workShift] || SHIFT_META.morning;
  const ShiftIcon = shift.icon;

  // Method breakdown from totals
  const methods = useMemo(() => {
    const raw = [
      { key: 'cashUsd', amount: totals.cashUsd || 0 },
      { key: 'cashVes', amount: totals.cashVes || 0 },
      { key: 'cardUsd', amount: totals.cardUsd || 0 },
      { key: 'cardVes', amount: totals.cardVes || 0 },
      { key: 'transferUsd', amount: totals.transferUsd || 0 },
      { key: 'transferVes', amount: totals.transferVes || 0 },
      { key: 'otherUsd', amount: totals.otherUsd || 0 },
      { key: 'otherVes', amount: totals.otherVes || 0 },
    ].filter(m => m.amount > 0);
    const max = Math.max(...raw.map(m => m.amount), 1);
    return raw
      .sort((a, b) => b.amount - a.amount)
      .map(m => ({ ...m, pct: (m.amount / max) * 100 }));
  }, [totals]);

  // Service payments (beauty vertical — registered automatically when charging a booking)
  const servicePayments = useMemo(() => {
    return (session?.servicePayments || [])
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [session?.servicePayments]);

  // Movements (from session object)
  const movements = useMemo(() => {
    return (session?.cashMovements || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [session?.cashMovements]);

  const openedTime = session?.openedAt
    ? new Date(session.openedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  return (
    <div className="min-h-screen pb-32">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium">Caja · {elapsed}</span>
          <span className={cn('flex items-center gap-1 text-xs', shift.color)}>
            <ShiftIcon className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { haptics.tap(); onRefresh?.(); }}
            className="p-2 rounded-lg text-muted-foreground no-tap-highlight active:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => { haptics.tap(); setShowMenu(p => !p); }}
              className="p-2 rounded-lg text-muted-foreground no-tap-highlight active:bg-muted transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20"
                >
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); haptics.tap(); onHistory?.(); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-muted transition-colors no-tap-highlight"
                  >
                    <History className="w-4 h-4 text-muted-foreground" />
                    Ver historial de cierres
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Close menu on outside click */}
      {showMenu && (
        <div className="fixed inset-0 z-[9]" onClick={() => setShowMenu(false)} />
      )}

      <div className="p-4 space-y-5">
        {/* Hero sales card */}
        <motion.div
          variants={scaleIn}
          initial="initial"
          animate="animate"
          className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-5 text-center"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Ventas totales</p>
          <AnimatedNumber
            value={salesUsd}
            format={n => fmt(n, 'USD')}
            className="text-4xl font-bold tabular-nums"
          />
          <AnimatedNumber
            value={salesVes}
            format={n => fmt(n, 'VES')}
            className="text-base text-muted-foreground tabular-nums block mt-1"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {totalOrders} {totalOrders === 1 ? 'transacción' : 'transacciones'} · desde {openedTime}
          </p>
        </motion.div>

        {/* Method breakdown */}
        {methods.length > 0 && (
          <motion.div
            variants={STAGGER(0.05, 0.15)}
            initial="initial"
            animate="animate"
          >
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Desglose por método</h3>
            <div className="space-y-2.5">
              {methods.map(({ key, amount, pct }) => {
                const isVes = key.endsWith('Ves');
                return (
                  <motion.div key={key} variants={listItem} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
                      {METHOD_LABELS[key] || key}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', METHOD_COLORS[key] || 'bg-primary')}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={SPRING.soft}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-24 text-right">
                      {fmt(amount, isVes ? 'VES' : 'USD')}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Service payments log */}
        {servicePayments.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Cobros del día ({servicePayments.length})
            </h3>
            <motion.div
              variants={STAGGER(0.04, 0.1)}
              initial="initial"
              animate="animate"
              className="space-y-1.5"
            >
              {servicePayments.map((sp, i) => {
                const time = sp.timestamp
                  ? new Date(sp.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : '';
                return (
                  <motion.div
                    key={sp.bookingId || i}
                    variants={listItem}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-500">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sp.clientName || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground truncate">{sp.serviceName || 'Servicio'} · {time}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-emerald-500">
                        +{fmt(sp.amount, sp.currency || 'USD')}
                      </span>
                      <p className="text-[10px] text-muted-foreground">{sp.paymentMethod || ''}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        {/* Movements log */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Movimientos de caja</h3>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos registrados</p>
          ) : (
            <motion.div
              variants={STAGGER(0.04, 0.1)}
              initial="initial"
              animate="animate"
              className="space-y-1.5"
            >
              {movements.map((m, i) => {
                const isIn = (m.type || '').toLowerCase() === 'in';
                const time = new Date(m.createdAt).toLocaleTimeString('es-VE', {
                  hour: '2-digit', minute: '2-digit', hour12: true,
                });
                return (
                  <motion.div
                    key={m._id || i}
                    variants={listItem}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      isIn ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500',
                    )}>
                      {isIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.reason || m.description || (isIn ? 'Entrada' : 'Salida')}</p>
                      <p className="text-xs text-muted-foreground">{time}</p>
                    </div>
                    <span className={cn(
                      'text-sm font-semibold tabular-nums shrink-0',
                      isIn ? 'text-emerald-500' : 'text-red-500',
                    )}>
                      {isIn ? '+' : '-'}{fmt(m.amount, m.currency || 'USD')}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-[var(--mobile-bottomnav-h,3.5rem)] inset-x-0 px-4 py-3 bg-background/90 backdrop-blur-md border-t border-border flex gap-3 z-10" style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom, 0px))' }}>
        <motion.button
          type="button"
          onClick={() => { haptics.tap(); onMovement?.(); }}
          className="flex-1 h-12 rounded-xl bg-card border border-border flex items-center justify-center gap-2 text-sm font-medium no-tap-highlight active:bg-muted transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="w-4 h-4" />
          Movimiento
        </motion.button>
        <motion.button
          type="button"
          onClick={() => { haptics.tap(); onClose?.(); }}
          className="flex-1 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center gap-2 text-sm font-semibold no-tap-highlight active:bg-red-700 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <Lock className="w-4 h-4" />
          Cerrar Caja
        </motion.button>
      </div>
    </div>
  );
}
