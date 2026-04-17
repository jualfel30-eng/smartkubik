import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CalendarDays, Receipt, Banknote } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { subDays, differenceInDays, format } from 'date-fns';
import { listItem, tapScale, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { getBeautyRevenueByProfessional } from '@/lib/api';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import Sparkline from '../primitives/Sparkline.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';

const fmtCurrency = (n) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/**
 * Hero revenue card with sparkline and period comparison.
 *
 * Props:
 *  - startDate: string (YYYY-MM-DD)
 *  - endDate: string (YYYY-MM-DD)
 */
export default function MobileRevenueCard({ startDate, endDate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState(null);

  // Compute previous period dates (mirror length)
  const prevDates = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = differenceInDays(end, start);
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, days);
    return {
      startDate: format(prevStart, 'yyyy-MM-dd'),
      endDate: format(prevEnd, 'yyyy-MM-dd'),
    };
  }, [startDate, endDate]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [current, prev] = await Promise.all([
          getBeautyRevenueByProfessional({ startDate, endDate }),
          prevDates ? getBeautyRevenueByProfessional(prevDates).catch(() => null) : null,
        ]);
        if (cancelled) return;
        setData(current);
        setPrevData(prev);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Error al cargar ingresos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [startDate, endDate, prevDates]);

  if (loading) {
    return (
      <motion.div
        variants={listItem}
        className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-5"
        style={{ boxShadow: 'var(--elevation-raised)' }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-10 w-36 bg-muted rounded" />
          <div className="h-7 w-full bg-muted rounded" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        variants={listItem}
        className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-5"
        style={{ boxShadow: 'var(--elevation-rest)' }}
      >
        <p className="text-sm text-red-400 mb-2">{error}</p>
        <button
          onClick={() => { setLoading(true); setError(null); }}
          className="text-xs text-primary font-medium"
        >
          Reintentar
        </button>
      </motion.div>
    );
  }

  const totals = data?.totals || { totalRevenue: 0, totalBookings: 0, averageTicket: 0 };
  const professionals = data?.professionals || [];

  // Comparison delta
  const prevRevenue = prevData?.totals?.totalRevenue;
  const trend = prevRevenue && prevRevenue > 0
    ? ((totals.totalRevenue - prevRevenue) / prevRevenue) * 100
    : null;

  // Sparkline: daily revenue from professionals aggregated per day (approximate: use per-professional totals)
  const sparklineValues = professionals.map((p) => p.totalRevenue).length > 1
    ? professionals.map((p) => p.totalRevenue)
    : [0, totals.totalRevenue];

  return (
    <>
      <motion.div
        variants={listItem}
        whileTap={tapScale}
        onClick={() => { haptics.tap(); setShowDetail(true); }}
        role="button"
        aria-label="Ingresos Totales"
        className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-5 active:bg-muted/30 transition-colors"
        style={{ boxShadow: 'var(--elevation-raised)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-400" />
            <span className="text-sm font-medium text-muted-foreground">Ingresos Totales</span>
          </div>

          {trend != null && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: DUR.base, ease: EASE.spring, delay: 0.3 }}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                trend >= 0
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </motion.span>
          )}
        </div>

        {/* Big number */}
        <AnimatedNumber
          value={totals.totalRevenue}
          format={fmtCurrency}
          className="text-4xl font-bold tabular-nums text-foreground"
        />

        {/* Sparkline */}
        <div className="mt-3">
          <Sparkline
            values={sparklineValues}
            color="#22c55e"
            width={280}
            height={36}
          />
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 divide-x divide-border mt-3">
          <div className="text-center pr-2">
            <p className="text-lg font-bold tabular-nums">{totals.totalBookings}</p>
            <p className="text-[10px] text-muted-foreground">Citas</p>
          </div>
          <div className="text-center px-2">
            <p className="text-lg font-bold tabular-nums">{fmtCurrency(totals.averageTicket)}</p>
            <p className="text-[10px] text-muted-foreground">Ticket Prom.</p>
          </div>
          <div className="text-center pl-2">
            <p className="text-lg font-bold tabular-nums">{professionals.length}</p>
            <p className="text-[10px] text-muted-foreground">Profesionales</p>
          </div>
        </div>
      </motion.div>

      {/* Detail sheet */}
      <MobileActionSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title="Detalle de Ingresos"
      >
        <div className="space-y-3">
          {professionals
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .map((p) => (
              <div key={p.professionalName} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.professionalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.totalBookings} citas · {p.hoursWorked ? `${p.hoursWorked}h` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums">{fmtCurrency(p.totalRevenue)}</span>
              </div>
            ))}
          {!professionals.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin datos de ingresos en este periodo
            </p>
          )}
        </div>
      </MobileActionSheet>
    </>
  );
}
