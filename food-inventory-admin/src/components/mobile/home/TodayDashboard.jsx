import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  TrendingUp, CalendarDays, Clock, CheckCircle2,
  AlertCircle, RefreshCw, ChevronRight, Scissors, DollarSign, Receipt,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { listItem, STAGGER, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import MobilePushPrompt from '../MobilePushPrompt.jsx';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import Sparkline from '../primitives/Sparkline.jsx';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';

// ─── appointment mini-card ────────────────────────────────────────────────────
const STATUS_COLOR = {
  pending: 'bg-amber-500',
  confirmed: 'bg-info',
  in_progress: 'bg-emerald-500',
  completed: 'bg-muted-foreground',
};

function UpcomingCard({ apt, onAction }) {
  const navigate = useNavigate();
  const start = apt.startTime ? new Date(apt.startTime) : null;
  const dot = STATUS_COLOR[apt.status] || 'bg-muted-foreground';
  const isInProgress = apt.status === 'in_progress';

  return (
    <motion.button
      type="button"
      variants={listItem}
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptics.tap(); navigate('/appointments'); }}
      className={cn(
        'relative w-full text-left border border-border bg-card p-3',
        'flex items-center gap-3 no-tap-highlight',
      )}
      style={{
        borderRadius: 'var(--mobile-radius-lg)',
        boxShadow: isInProgress ? 'var(--ring-active-glow)' : 'var(--elevation-rest)',
      }}
    >
      <div className="shrink-0 flex flex-col items-center justify-center w-12">
        <div className="text-base font-bold tabular-nums leading-none">
          {start ? format(start, 'HH:mm') : '--:--'}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('inline-block w-1.5 h-1.5 rounded-full', dot)} />
          <span className="font-semibold truncate">{apt.customerName || 'Sin cliente'}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {apt.serviceName || 'Servicio'}{apt.resourceName ? ` · ${apt.resourceName}` : ''}
        </div>
      </div>
      {(apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'in_progress') && (
        <div className="shrink-0">
          <button
            type="button"
            aria-label="Cobrar"
            onClick={(e) => { e.stopPropagation(); onAction?.(apt); }}
            className="tap-target rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold no-tap-highlight"
          >
            {apt.status === 'in_progress' ? 'Cobrar' : 'Iniciar'}
          </button>
        </div>
      )}
    </motion.button>
  );
}

// ─── alert card ──────────────────────────────────────────────────────────────
function AlertCard({ icon: Icon, color, label, action, onAction }) {
  return (
    <button
      type="button"
      onClick={onAction}
      className={cn(
        'flex items-center gap-3 rounded-[var(--mobile-radius-lg)] border px-3 py-2.5 w-full text-left no-tap-highlight',
        color === 'amber' && 'border-amber-500/30 bg-amber-500/5',
        color === 'orange' && 'border-orange-500/30 bg-orange-500/5',
        color === 'red' && 'border-destructive/30 bg-destructive/5',
        color === 'blue' && 'border-blue-500/30 bg-info/5',
      )}
    >
      <Icon size={16} className={cn(
        color === 'amber' && 'text-amber-500',
        color === 'orange' && 'text-orange-500',
        color === 'red' && 'text-destructive',
        color === 'blue' && 'text-blue-500',
      )} />
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
function safeDateOnly(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function transformBeautyBooking(b) {
  const dateOnly = safeDateOnly(b.date);
  return {
    ...b,
    _id: b._id || b.id,
    customerName: b.client?.name || '',
    serviceName: b.services?.map(s => s.name).join(' + ') || '',
    resourceName: b.professionalName || '',
    startTime: dateOnly && b.startTime
      ? `${dateOnly}T${b.startTime}:00`
      : b.startTime || null,
    status: b.status || 'pending',
  };
}

export default function TodayDashboard() {
  const { tenant } = useAuth();
  const { isBeauty } = useMobileVertical();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [cashSession, setCashSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const apptEndpoint = isBeauty ? '/beauty-bookings' : '/appointments';

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);

    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

    try {
      const [dashRes, apptRes, cashRes] = await Promise.allSettled([
        fetchApi('/dashboard/summary'),
        fetchApi(`${apptEndpoint}?startDate=${today}&endDate=${tomorrow}`),
        fetchApi('/cash-register/sessions/open'),
      ]);

      if (dashRes.status === 'fulfilled') setSummary(dashRes.value?.data ?? dashRes.value);
      if (apptRes.status === 'fulfilled') {
        const raw = Array.isArray(apptRes.value?.data) ? apptRes.value.data
          : Array.isArray(apptRes.value) ? apptRes.value : [];
        setAppointments(isBeauty ? raw.map(transformBeautyBooking) : raw);
      }
      if (cashRes.status === 'fulfilled') setCashSession(cashRes.value?.data ?? cashRes.value);
    } catch (err) {
      toast.error('Error al cargar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apptEndpoint, isBeauty]);

  useEffect(() => { load(); }, [load]);

  const pending = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const inProgress = appointments.filter(a => a.status === 'in_progress');
  const done = appointments.filter(a => a.status === 'completed');
  const unpaid = appointments.filter(a => a.status === 'completed' && a.paymentStatus !== 'paid');
  const upcoming = [...inProgress, ...pending].slice(0, 4);

  const paidToday = isBeauty
    ? appointments.filter(a => a.paymentStatus === 'paid')
    : [];
  const salesToday = isBeauty
    ? paidToday.reduce((sum, a) => sum + Number(a.amountPaid || a.totalPrice || 0), 0)
    : (summary?.salesToday ?? summary?.todaySales ?? 0);
  const weekValues = summary?.weeklyRevenue ?? summary?.revenueByDay ?? [];

  // Alerts
  const alerts = [];
  if (pending.length > 0)
    alerts.push({ id: 'pending', icon: Clock, color: 'amber', label: `${pending.length} cita${pending.length > 1 ? 's' : ''} sin confirmar hoy`, to: '/appointments' });
  if (unpaid.length > 0)
    alerts.push({ id: 'unpaid', icon: Receipt, color: 'orange', label: `${unpaid.length} cita${unpaid.length > 1 ? 's' : ''} completada${unpaid.length > 1 ? 's' : ''} sin cobrar`, to: '/appointments' });
  if (!cashSession)
    alerts.push({ id: 'cash', icon: DollarSign, color: 'red', label: 'Caja no abierta', to: '/cash-register' });

  const { v: rv, t: rt } = useReducedMotionSafe();
  const ownerName = tenant?.ownerFirstName || 'Bienvenido';
  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? 'Buenos días' : hourNow < 19 ? 'Buenas tardes' : 'Buenas noches';

  if (loading) {
    return (
      <div className="mobile-content-pad px-1 space-y-3">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-muted rounded-full" />
          <div className="h-32 bg-muted rounded-[var(--mobile-radius-lg)]" />
        </div>
        <MobileListSkeleton count={3} height="h-16" />
      </div>
    );
  }

  return (
    <motion.div
      className="md:hidden mobile-content-pad space-y-4 pb-2"
      initial="initial"
      animate="animate"
      variants={rv(STAGGER(0.05, 0.05))}
    >
      {/* Greeting */}
      <motion.div variants={listItem} className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground capitalize">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="text-xl font-bold leading-tight">
            {greeting}, {ownerName} 👋
          </h1>
        </div>
        <button
          type="button"
          onClick={() => { haptics.tap(); load(true); }}
          aria-label="Actualizar"
          className="tap-target no-tap-highlight text-muted-foreground"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* Hero revenue card */}
      <motion.div
        variants={listItem}
        className="bg-card border border-border p-4"
        style={{
          borderRadius: 'var(--mobile-radius-lg)',
          boxShadow: 'var(--elevation-raised)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Ingresos hoy</p>
            <p className="text-3xl font-bold tabular-nums mt-0.5">
              <AnimatedNumber
                value={Number(salesToday)}
                format={(n) => `$${n.toFixed(2)}`}
              />
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-emerald-500">
              <TrendingUp size={14} />
              <span className="text-xs font-medium">Esta semana</span>
            </div>
            <Sparkline values={weekValues.map(Number)} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-border">
          <div className="text-center px-2">
            <div className="text-lg font-bold">{appointments.length}</div>
            <div className="text-[11px] text-muted-foreground">Citas</div>
          </div>
          <div className="text-center px-2">
            <div className="text-lg font-bold text-emerald-500">{done.length}</div>
            <div className="text-[11px] text-muted-foreground">Completadas</div>
          </div>
          <div className="text-center px-2">
            <div className="text-lg font-bold text-amber-500">{pending.length}</div>
            <div className="text-[11px] text-muted-foreground">Pendientes</div>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div variants={STAGGER(0.04)} className="space-y-2">
          {alerts.map(a => (
            <motion.div key={a.id} variants={listItem}>
              <AlertCard
                icon={a.icon}
                color={a.color}
                label={a.label}
                onAction={() => { haptics.tap(); navigate(a.to); }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <motion.section variants={listItem}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarDays size={14} /> Próximas citas
            </h2>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="text-xs text-primary font-medium no-tap-highlight"
            >
              Ver agenda
            </button>
          </div>
          <motion.div className="space-y-2" variants={STAGGER(0.035)}>
            {upcoming.map(apt => (
              <UpcomingCard
                key={apt._id}
                apt={apt}
                onAction={(a) => navigate(`/appointments?cobrar=${a._id}`)}
              />
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* Completed today */}
      {done.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{done.length} cita{done.length > 1 ? 's' : ''} completada{done.length > 1 ? 's' : ''} hoy</span>
        </div>
      )}

      {/* Recent payments — beauty only */}
      {isBeauty && paidToday.length > 0 && (
        <motion.section variants={listItem}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Receipt size={14} /> Cobros de hoy
            </h2>
            <span className="text-xs text-emerald-600 font-semibold tabular-nums">
              ${salesToday.toFixed(2)}
            </span>
          </div>
          <div
            className="border border-border bg-card divide-y divide-border overflow-hidden"
            style={{ borderRadius: 'var(--mobile-radius-lg)' }}
          >
            {paidToday.slice(0, 6).map(apt => {
              const start = apt.startTime ? new Date(apt.startTime) : null;
              return (
                <div key={apt._id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="text-xs font-medium tabular-nums text-muted-foreground w-10 shrink-0">
                    {start ? format(start, 'HH:mm') : '--:--'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{apt.customerName || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.serviceName || '—'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-emerald-600">
                      ${Number(apt.amountPaid || apt.totalPrice || 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{apt.paymentMethod || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Push notifications prompt — aparece con contexto, no al entrar */}
      <MobilePushPrompt />

      {/* Quick nav */}
      <motion.section variants={listItem}>
        <h2 className="text-sm font-semibold mb-2">Acceso rápido</h2>
        <motion.div className="grid grid-cols-2 gap-2" variants={STAGGER(0.03)}>
          {[
            { label: 'Agenda', icon: CalendarDays, to: '/appointments' },
            { label: 'Caja', icon: DollarSign, to: '/cash-register' },
            { label: isBeauty ? 'Servicios' : 'Productos', icon: Scissors, to: isBeauty ? '/services' : '/products' },
            { label: 'Clientes', icon: CheckCircle2, to: '/crm' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.to}
                type="button"
                variants={listItem}
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptics.tap(); navigate(item.to); }}
                className="border border-border bg-card p-4 flex flex-col items-start gap-2 no-tap-highlight"
                style={{
                  borderRadius: 'var(--mobile-radius-lg)',
                  boxShadow: 'var(--elevation-rest)',
                }}
              >
                <Icon size={20} className="text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
