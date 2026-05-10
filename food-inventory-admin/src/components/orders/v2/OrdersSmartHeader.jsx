import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, AlertTriangle, Sun, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, fadeUp, tapScale } from '@/lib/motion';
import { AnimatedCurrency, AnimatedNumber } from '@/components/ui/animated-number';
import { classifyOrder } from '@/hooks/useOrderTriage';

function fmtCurrency(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d) {
  const x = startOfDay(d);
  const dayIdx = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dayIdx);
  return x;
}

export function computeKPIs(orders = [], { now } = {}) {
  const reference = now || new Date();
  const today = startOfDay(reference);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const week = startOfWeek(reference);

  let todayCount = 0;
  let yesterdayCount = 0;
  let pendingTotal = 0;
  let overdueCount = 0;
  let collectedThisWeek = 0;

  orders.forEach((order) => {
    const created = order.createdAt ? new Date(order.createdAt) : null;
    if (created && !Number.isNaN(created.getTime())) {
      if (created >= today) todayCount += 1;
      else if (created >= yesterday && created < today) yesterdayCount += 1;
    }
    const triage = classifyOrder(order, reference);
    if (triage === 'overdue') overdueCount += 1;
    const balance = (order.totalAmount || 0) - (order.paidAmount || 0);
    if (triage !== 'paid' && triage !== 'cancelled' && balance > 0) {
      pendingTotal += balance;
    }
    if (created && created >= week) {
      collectedThisWeek += order.paidAmount || 0;
    }
  });

  return {
    today: { count: todayCount, deltaVsYesterday: todayCount - yesterdayCount },
    pending: { total: pendingTotal },
    overdue: { count: overdueCount },
    collectedWeek: { total: collectedThisWeek },
  };
}

export function OrdersSmartHeader({
  userName,
  orders = [],
  streakDays = 0,
  streakBroken = false,
  ritual,
  onFilterChange,
  onCreateOrder,
}) {
  const kpis = useMemo(() => computeKPIs(orders), [orders]);
  const overdueCount = kpis.overdue.count;

  const greeting = ritual?.isFirstOpenToday ? 'Buenos días' : 'Hola';
  const showRitualBanner = ritual?.isFirstOpenToday && ritual?.lastClose;
  const showWelcomeBack = ritual?.shouldShowWelcomeBack && !showRitualBanner;
  const showOverdueBanner = overdueCount > 0 && !showRitualBanner && !showWelcomeBack;

  return (
    <motion.div initial="initial" animate="animate" variants={fadeUp} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            {ritual?.isFirstOpenToday ? <Sun size={18} className="text-amber-500" /> : <Sparkles size={18} className="text-primary" />}
            {greeting}, {userName || 'Usuario'}
          </h1>
          {streakDays > 1 && !streakBroken && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {streakDays} días seguidos sin órdenes vencidas
            </p>
          )}
          {streakBroken && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recupera el ritmo hoy — cobra una para arrancar la próxima racha.
            </p>
          )}
        </div>
        {onCreateOrder && (
          <motion.button
            type="button"
            onClick={onCreateOrder}
            whileTap={tapScale}
            transition={SPRING.snappy}
            className="inline-flex items-center gap-1.5 rounded-lg text-primary-foreground px-3 py-2 text-sm font-semibold tap-target no-tap-highlight"
            style={{
              background: 'var(--gradient-primary)',
              boxShadow: '0 2px 12px oklch(0.62 0.22 268 / 0.25)',
            }}
          >
            <Plus size={16} /> Nueva orden
          </motion.button>
        )}
      </div>

      {showRitualBanner && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground flex items-start gap-3">
          <span className="text-base">☀</span>
          <div className="flex-1">
            <p className="font-medium">
              Ayer cerraste con ${fmtCurrency(ritual.lastClose.collected)} cobrados en {ritual.lastClose.ordersCount} órdenes.
            </p>
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange?.('overdue')}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Hoy hay {overdueCount} {overdueCount === 1 ? 'vencida' : 'vencidas'} — Verlas <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {showWelcomeBack && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground">
          <p className="font-medium">Bienvenida de vuelta. Esto pasó mientras estuviste fuera:</p>
          <p className="mt-1 text-muted-foreground">
            {kpis.today.count} {kpis.today.count === 1 ? 'orden nueva' : 'órdenes nuevas'} hoy · {overdueCount} {overdueCount === 1 ? 'vencida' : 'vencidas'} · ${fmtCurrency(kpis.collectedWeek.total)} cobrados esta semana
          </p>
        </div>
      )}

      {showOverdueBanner && (
        <button
          type="button"
          onClick={() => onFilterChange?.('overdue')}
          className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground hover:bg-amber-500/15"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Tienes {overdueCount} {overdueCount === 1 ? 'orden vencida' : 'órdenes vencidas'} hace +5 días
          </span>
          <span className="font-semibold inline-flex items-center gap-1 text-primary">Ver ahora <ArrowRight size={14} /></span>
        </button>
      )}

      {/* Hero financial card — peak-end KPI + 3 stat boxes (mirror del hero de TodayDashboard) */}
      <motion.div
        className="bg-card p-5"
        style={{
          borderRadius: 'var(--mobile-radius-xl)',
          boxShadow: 'var(--elevation-raised)',
        }}
      >
        <button
          type="button"
          onClick={() => onFilterChange?.('paid')}
          className="w-full text-left no-tap-highlight"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide uppercase">Cobrado semana</p>
              <p className="text-[32px] font-extrabold tabular-nums tracking-tight mt-0.5 leading-none">
                <AnimatedCurrency value={Number(kpis.collectedWeek.total) || 0} currency="$" />
              </p>
            </div>
            <div className="flex items-center gap-1 text-emerald-500/80 mt-1">
              <TrendingUp size={13} strokeWidth={1.5} />
              <span className="text-[11px] font-medium">Esta semana</span>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'today', label: 'Hoy', value: kpis.today.count, filter: 'today', color: 'text-foreground', isCurrency: false },
            { key: 'pending', label: 'Pendientes', value: kpis.pending.total, filter: 'pending', color: 'text-amber-500', isCurrency: true },
            { key: 'overdue', label: 'Vencidas', value: kpis.overdue.count, filter: 'overdue', color: kpis.overdue.count > 0 ? 'text-destructive' : 'text-foreground', isCurrency: false },
          ].map((stat) => (
            <button
              key={stat.key}
              type="button"
              onClick={() => onFilterChange?.(stat.filter)}
              className="text-center rounded-xl py-2.5 no-tap-highlight transition-colors"
              style={{ background: 'var(--glass-subtle)' }}
            >
              <div className={cn('text-lg font-bold tabular-nums', stat.color)}>
                {stat.isCurrency
                  ? <AnimatedCurrency value={Number(stat.value) || 0} currency="$" />
                  : <AnimatedNumber value={Number(stat.value) || 0} />}
              </div>
              <div className="text-[10px] text-muted-foreground/60 font-medium">{stat.label}</div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default OrdersSmartHeader;
