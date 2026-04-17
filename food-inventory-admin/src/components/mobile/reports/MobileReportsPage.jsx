import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, startOfMonth } from 'date-fns';
import {
  BarChart3, Users, Scissors, UserX, Heart, Clock, Gauge, Banknote,
  ChevronDown, RefreshCw,
} from 'lucide-react';
import { listItem, STAGGER, DUR, EASE, tapScale } from '@/lib/motion';
import haptics from '@/lib/haptics';
import {
  getBeautyRevenueByProfessional,
  getBeautyPopularServices,
  getBeautyNoShowRate,
  getBeautyClientRetention,
  getBeautyPeakHours,
  getBeautyUtilization,
  getTipsReport,
} from '@/lib/api';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import PullProgress from '../primitives/PullProgress.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileRevenueCard from './MobileRevenueCard.jsx';
import MobileMetricCard from './MobileMetricCard.jsx';
import MobileBarChart from './MobileBarChart.jsx';
import MobileHeatmap from './MobileHeatmap.jsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtCurrency = (n) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtPercent = (n) => `${(n || 0).toFixed(1)}%`;

const today = () => format(new Date(), 'yyyy-MM-dd');

const PILLS = [
  { id: '0d', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'custom', label: 'Personalizado' },
];

function computeDates(range, customStart, customEnd) {
  if (range === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }
  const end = today();
  if (range === '0d') return { startDate: end, endDate: end };
  if (range === 'month') {
    return { startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: end };
  }
  const daysMap = { '7d': 7, '30d': 30 };
  const days = daysMap[range] || 7;
  return { startDate: format(subDays(new Date(), days), 'yyyy-MM-dd'), endDate: end };
}

// ─── Pull-to-refresh hook ───────────────────────────────────────────────────

function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const THRESHOLD = 64;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPulling(true);
      setDistance(Math.min(dy, THRESHOLD * 1.5));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (distance >= THRESHOLD) {
      setDistance(0); setPulling(false); startY.current = null;
      await onRefresh();
    } else {
      setDistance(0); setPulling(false); startY.current = null;
    }
  }, [distance, onRefresh]);

  return { pulling, distance, THRESHOLD, onTouchStart, onTouchMove, onTouchEnd };
}

// ─── Generic data-fetching hook per card ────────────────────────────────────

function useCardData(fetcher, startDate, endDate, refreshKey) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher({ startDate, endDate })
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Error'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [startDate, endDate, refreshKey]);

  const retry = () => { setLoading(true); setError(null); fetcher({ startDate, endDate }).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)); };

  return { loading, data, error, retry };
}

// ─── Error state ────────────────────────────────────────────────────────────

function CardError({ error, onRetry }) {
  return (
    <motion.div
      variants={listItem}
      className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
      style={{ boxShadow: 'var(--elevation-rest)' }}
    >
      <p className="text-sm text-red-400 mb-2">{error}</p>
      <button onClick={onRetry} className="text-xs text-primary font-medium">
        Reintentar
      </button>
    </motion.div>
  );
}

// ─── Sub-card: Revenue by Professional ──────────────────────────────────────

function RevenueByProfessionalCard({ startDate, endDate, refreshKey }) {
  const { loading, data, error, retry } = useCardData(getBeautyRevenueByProfessional, startDate, endDate, refreshKey);
  const [detail, setDetail] = useState(null);

  if (error) return <CardError error={error} onRetry={retry} />;

  const professionals = data?.professionals || [];
  const barData = professionals
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((p) => ({
      label: p.professionalName,
      value: p.totalRevenue,
      sublabel: `${p.totalBookings} citas`,
      _raw: p,
    }));

  return (
    <>
      <motion.div
        variants={listItem}
        className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
        style={{ boxShadow: 'var(--elevation-rest)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Ingresos por Profesional</span>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded" />)}
          </div>
        ) : (
          <>
            <MobileBarChart
              data={barData}
              maxBars={6}
              formatValue={fmtCurrency}
              onBarTap={(item) => setDetail(item._raw)}
            />
            {barData.length > 6 && (
              <button className="text-xs text-primary font-medium mt-2" onClick={() => setDetail({ _showAll: true })}>
                Ver todos ({barData.length})
              </button>
            )}
          </>
        )}
      </motion.div>

      <MobileActionSheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?._showAll ? 'Todos los Profesionales' : detail?.professionalName || 'Detalle'}
      >
        {detail?._showAll ? (
          <div className="space-y-2">
            {barData.map((b) => (
              <div key={b.label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-sm">{b.label}</span>
                <span className="text-sm font-bold tabular-nums">{fmtCurrency(b.value)}</span>
              </div>
            ))}
          </div>
        ) : detail ? (
          <div className="space-y-3 py-2">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Ingresos</span><span className="font-bold">{fmtCurrency(detail.totalRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Citas</span><span className="font-bold">{detail.totalBookings}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Ticket Promedio</span><span className="font-bold">{fmtCurrency(detail.averageTicket || 0)}</span></div>
            {detail.hoursWorked != null && (
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Horas Trabajadas</span><span className="font-bold">{detail.hoursWorked}h</span></div>
            )}
          </div>
        ) : null}
      </MobileActionSheet>
    </>
  );
}

// ─── Sub-card: Popular Services ────────���────────────────────────────────────

function PopularServicesCard({ startDate, endDate, refreshKey }) {
  const { loading, data, error, retry } = useCardData(getBeautyPopularServices, startDate, endDate, refreshKey);
  const [expanded, setExpanded] = useState(false);

  if (error) return <CardError error={error} onRetry={retry} />;

  const services = data?.services || [];
  const visible = expanded ? services : services.slice(0, 5);

  return (
    <motion.div
      variants={listItem}
      className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
      style={{ boxShadow: 'var(--elevation-rest)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Scissors size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Servicios Populares</span>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-muted rounded" />)}
        </div>
      ) : !services.length ? (
        <p className="text-xs text-muted-foreground text-center py-4">Sin datos de servicios</p>
      ) : (
        <>
          <div className="space-y-1">
            {visible.map((s, i) => (
              <motion.div
                key={s.name}
                variants={listItem}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                </div>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full tabular-nums flex-shrink-0">
                  {s.totalBookings} veces
                </span>
                {s.totalRevenue != null && (
                  <span className="text-xs font-bold tabular-nums flex-shrink-0">
                    {fmtCurrency(s.totalRevenue)}
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {services.length > 5 && (
            <button
              onClick={() => { haptics.tap(); setExpanded(!expanded); }}
              className="text-xs text-primary font-medium mt-2 flex items-center gap-1"
            >
              {expanded ? 'Ver menos' : `Ver todos (${services.length})`}
              <ChevronDown size={12} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Sub-card: No-Show Rate ─────────────────────────────────────────────────

function NoShowCard({ startDate, endDate, refreshKey }) {
  const { loading, data, error, retry } = useCardData(
    (p) => getBeautyNoShowRate({ ...p, groupBy: 'week' }),
    startDate, endDate, refreshKey,
  );
  const [showDetail, setShowDetail] = useState(false);

  if (error) return <CardError error={error} onRetry={retry} />;

  const rate = data?.averages?.noShowRate || 0;
  const periods = data?.periods || [];
  const barData = periods.slice(-6).map((p) => ({
    label: p.period,
    value: p.noShowRate || 0,
  }));

  return (
    <>
      <MobileMetricCard
        title="Tasa de No-Show"
        icon={UserX}
        value={rate}
        format={fmtPercent}
        trendInverted
        loading={loading}
        onTap={() => setShowDetail(true)}
      >
        {barData.length > 0 && (
          <MobileBarChart data={barData} formatValue={fmtPercent} barHeight={16} maxBars={6} />
        )}
      </MobileMetricCard>

      <MobileActionSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title="Detalle No-Show"
      >
        <div className="space-y-2">
          <div className="flex justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Tasa promedio</span>
            <span className="font-bold">{fmtPercent(data?.averages?.noShowRate)}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Tasa de cancelación</span>
            <span className="font-bold">{fmtPercent(data?.averages?.cancellationRate)}</span>
          </div>
          <hr className="border-border" />
          {periods.map((p) => (
            <div key={p.period} className="flex justify-between py-1">
              <span className="text-xs text-muted-foreground">{p.period}</span>
              <span className="text-xs font-semibold tabular-nums">
                {p.noShows}/{p.total} ({fmtPercent(p.noShowRate)})
              </span>
            </div>
          ))}
        </div>
      </MobileActionSheet>
    </>
  );
}

// ─── Sub-card: Client Retention ��────────────────────────────────────────────

function RetentionCard({ startDate, endDate, refreshKey }) {
  const { loading, data, error, retry } = useCardData(getBeautyClientRetention, startDate, endDate, refreshKey);
  const [showDetail, setShowDetail] = useState(false);

  if (error) return <CardError error={error} onRetry={retry} />;

  const summary = data?.summary || {};
  const total = (summary.newClients || 0) + (summary.returningClients || 0) + (summary.lostClients || 0);

  // Radial chart segments
  const segments = [
    { label: 'Recurrentes', value: summary.returningClients || 0, color: '#22c55e' },
    { label: 'Nuevos', value: summary.newClients || 0, color: '#6366f1' },
    { label: 'Perdidos', value: summary.lostClients || 0, color: '#ef4444' },
  ];

  return (
    <>
      <MobileMetricCard
        title="Retención de Clientes"
        icon={Heart}
        value={summary.retentionRate || 0}
        format={fmtPercent}
        subtitle="Clientes que regresaron al menos 1 vez en el periodo"
        loading={loading}
        onTap={() => setShowDetail(true)}
      >
        {total > 0 && <DonutChart segments={segments} total={total} />}
      </MobileMetricCard>

      <MobileActionSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title="Detalle de Retención"
      >
        <div className="space-y-3 py-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm">{s.label}</span>
              </div>
              <span className="font-bold">{s.value}</span>
            </div>
          ))}
          <hr className="border-border" />
          {data?.topClients?.slice(0, 10).map((c) => (
            <div key={c.phone || c.name} className="flex justify-between py-1 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.visitCount} visitas · {c.type === 'new' ? 'Nuevo' : 'Recurrente'}</p>
              </div>
              <span className="text-sm font-bold tabular-nums">{fmtCurrency(c.totalSpent)}</span>
            </div>
          ))}
        </div>
      </MobileActionSheet>
    </>
  );
}

// ─── Mini donut chart (SVG) ─────────────────────────────────────────────────

function DonutChart({ segments, total }) {
  const size = 80;
  const r = 30;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => {
          const pct = total > 0 ? seg.value / total : 0;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;

          return (
            <motion.circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={10}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DUR.slow, ease: EASE.out, delay: 0.2 }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.label}:</span>
            <span className="font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-card: Peak Hours ───────────────��──────────────────────────��────────

function PeakHoursCard({ startDate, endDate, refreshKey }) {
  const { loading, data, error, retry } = useCardData(getBeautyPeakHours, startDate, endDate, refreshKey);

  if (error) return <CardError error={error} onRetry={retry} />;

  return (
    <motion.div
      variants={listItem}
      className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
      style={{ boxShadow: 'var(--elevation-rest)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Horas Pico</span>
      </div>

      {data?.insights && (
        <p className="text-xs text-muted-foreground mb-2">
          Día más ocupado: <strong>{data.insights.busiestDay}</strong> · Hora pico: <strong>{data.insights.busiestHour}</strong>
        </p>
      )}

      <MobileHeatmap data={data?.heatmap || []} loading={loading} />
    </motion.div>
  );
}

// ─── Sub-card: Utilization ─────────────���──────────────────────���─────────────

function UtilizationCard({ startDate, endDate, refreshKey }) {
  const { loading, data, error, retry } = useCardData(getBeautyUtilization, startDate, endDate, refreshKey);

  if (error) return <CardError error={error} onRetry={retry} />;

  const professionals = data?.professionals || [];
  const barData = professionals
    .sort((a, b) => b.utilizationRate - a.utilizationRate)
    .map((p) => ({
      label: p.name,
      value: p.utilizationRate || 0,
      color: p.utilizationRate >= 75 ? '#22c55e' : p.utilizationRate >= 50 ? '#f59e0b' : '#ef4444',
      sublabel: `${p.totalBookings} citas`,
    }));

  return (
    <motion.div
      variants={listItem}
      className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
      style={{ boxShadow: 'var(--elevation-rest)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Utilización de Profesionales</span>
        </div>
        {data?.averageUtilization != null && (
          <span className="text-xs font-bold tabular-nums">{fmtPercent(data.averageUtilization)} prom.</span>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded" />)}
        </div>
      ) : (
        <>
          <MobileBarChart data={barData} maxBars={8} formatValue={fmtPercent} />
          <p className="text-[10px] text-muted-foreground mt-2">
            % de horas disponibles con cita asignada
          </p>
        </>
      )}
    </motion.div>
  );
}

// ─── Sub-card: Tips ─────────────────────────────────────────────────────────

function TipsCard({ startDate, endDate, refreshKey }) {
  const { loading, data, error, retry } = useCardData(getTipsReport, startDate, endDate, refreshKey);

  // If tips module returns no data or errors, hide entirely
  if (error || (!loading && (!data?.summary?.totalTips && data?.summary?.totalTips !== 0))) return null;
  if (!loading && data?.summary?.totalTips === 0 && !data?.employees?.length) return null;

  const summary = data?.summary || {};
  const employees = data?.employees || [];
  const barData = employees
    .sort((a, b) => b.totalTips - a.totalTips)
    .slice(0, 6)
    .map((e) => ({
      label: e.employeeName,
      value: e.totalTips,
      sublabel: `${e.ordersServed} órdenes`,
    }));

  return (
    <MobileMetricCard
      title="Propinas"
      icon={Banknote}
      value={summary.totalTips || 0}
      format={fmtCurrency}
      loading={loading}
    >
      {barData.length > 0 && (
        <MobileBarChart data={barData} formatValue={fmtCurrency} maxBars={6} />
      )}
      {summary.averageTipPerOrder != null && summary.averageTipPerOrder > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Propina promedio por orden: {fmtCurrency(summary.averageTipPerOrder)}
        </p>
      )}
    </MobileMetricCard>
  );
}

// ─── Main Page Component ────────────────���───────────────────────────────────

export default function MobileReportsPage() {
  const [range, setRange] = useState('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { startDate, endDate } = useMemo(
    () => computeDates(range, customStart, customEnd),
    [range, customStart, customEnd],
  );

  const pull = usePullToRefresh(() => {
    setRefreshKey((k) => k + 1);
  });

  const handlePillTap = (id) => {
    haptics.select();
    if (id === 'custom') {
      setShowCustomSheet(true);
      return;
    }
    setRange(id);
  };

  const handleCustomConfirm = () => {
    if (customStart && customEnd) {
      setRange('custom');
      setShowCustomSheet(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-24"
      onTouchStart={pull.onTouchStart}
      onTouchMove={pull.onTouchMove}
      onTouchEnd={pull.onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pull.pulling && (
        <div
          className="flex justify-center pt-2 pb-1"
          style={{ height: pull.distance, overflow: 'hidden' }}
        >
          <PullProgress
            progress={pull.distance / pull.THRESHOLD}
            spinning={false}
          />
        </div>
      )}

      {/* Sticky date range pills */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div
          className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {PILLS.map((pill) => {
            const active = range === pill.id;
            return (
              <motion.button
                key={pill.id}
                type="button"
                onClick={() => handlePillTap(pill.id)}
                whileTap={{ scale: 1.05 }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap no-tap-highlight transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {pill.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Cards container */}
      <motion.div
        variants={STAGGER(0.05, 0.05)}
        initial="initial"
        animate="animate"
        key={`cards-${refreshKey}-${range}-${startDate}`}
        className="space-y-4 px-4 pt-4"
      >
        {/* 1. Hero: Total Revenue */}
        <MobileRevenueCard
          startDate={startDate}
          endDate={endDate}
          key={`rev-${refreshKey}`}
        />

        {/* 2. Revenue by Professional */}
        <RevenueByProfessionalCard
          startDate={startDate}
          endDate={endDate}
          refreshKey={refreshKey}
        />

        {/* 3. Popular Services */}
        <PopularServicesCard
          startDate={startDate}
          endDate={endDate}
          refreshKey={refreshKey}
        />

        {/* 4. No-Show Rate */}
        <NoShowCard
          startDate={startDate}
          endDate={endDate}
          refreshKey={refreshKey}
        />

        {/* 5. Client Retention */}
        <RetentionCard
          startDate={startDate}
          endDate={endDate}
          refreshKey={refreshKey}
        />

        {/* 6. Peak Hours */}
        <PeakHoursCard
          startDate={startDate}
          endDate={endDate}
          refreshKey={refreshKey}
        />

        {/* 7. Utilization */}
        <UtilizationCard
          startDate={startDate}
          endDate={endDate}
          refreshKey={refreshKey}
        />

        {/* 8. Tips (conditional) */}
        <TipsCard
          startDate={startDate}
          endDate={endDate}
          refreshKey={refreshKey}
        />
      </motion.div>

      {/* Custom date range sheet */}
      <MobileActionSheet
        open={showCustomSheet}
        onClose={() => setShowCustomSheet(false)}
        title="Rango personalizado"
        footer={
          <div className="px-4 pb-4">
            <button
              onClick={handleCustomConfirm}
              disabled={!customStart || !customEnd}
              className="w-full py-3 rounded-[var(--mobile-radius-lg)] bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-lg)] bg-muted border border-border text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              max={today()}
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-lg)] bg-muted border border-border text-sm text-foreground"
            />
          </div>
        </div>
      </MobileActionSheet>
    </div>
  );
}
