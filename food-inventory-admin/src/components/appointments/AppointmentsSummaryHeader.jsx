import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, Clock, TrendingUp } from 'lucide-react';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { fadeUp, SPRING, STAGGER } from '@/lib/motion';

/**
 * Today's Pulse — live summary header showing KPIs for the current day.
 * Appointment count, estimated revenue, pending count, occupancy bar.
 */
export default function AppointmentsSummaryHeader({
  appointments = [],
  resources = [],
  businessHours = { start: '08:00', end: '20:00' },
  labels = {},
}) {
  const today = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  const stats = useMemo(() => {
    const todayApts = appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime).toISOString().split('T')[0];
      return aptDate === today && apt.status !== 'cancelled';
    });

    const count = todayApts.length;
    const pending = todayApts.filter((a) => a.status === 'pending').length;
    const completed = todayApts.filter((a) => a.status === 'completed').length;
    const revenue = todayApts.reduce((sum, a) => sum + (Number(a.totalPrice) || 0), 0);

    // Occupancy: booked slots / total available slots
    const startH = parseInt(businessHours.start?.split(':')[0] || '8', 10);
    const endH = parseInt(businessHours.end?.split(':')[0] || '20', 10);
    const totalSlots = (endH - startH) * 2; // 30-min slots
    const resourceCount = Math.max(resources.length, 1);
    const totalCapacity = totalSlots * resourceCount;
    const occupancy = totalCapacity > 0 ? Math.min((count / totalCapacity) * 100, 100) : 0;

    return { count, pending, completed, revenue, occupancy };
  }, [appointments, today, businessHours, resources]);

  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  const occupancyColor = stats.occupancy >= 75
    ? 'bg-emerald-500'
    : stats.occupancy >= 50
      ? 'bg-amber-500'
      : 'bg-red-400';

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 dark:bg-gray-900/50 dark:border-gray-800"
    >
      {/* Date + summary line */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {stats.count} {labels.cita?.pluralLower || 'citas'} &middot;{' '}
            <span className="text-emerald-400">
              $<AnimatedNumber value={stats.revenue} format={(n) => n.toFixed(2)} className="inline" />
            </span>{' '}
            estimado
            {stats.pending > 0 && (
              <span className="text-amber-400"> &middot; {stats.pending} pendiente{stats.pending > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <motion.div
        variants={STAGGER(0.04)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-3"
      >
        <KpiCell icon={Calendar} label="Hoy" value={stats.count} />
        <KpiCell
          icon={DollarSign}
          label="Revenue"
          value={stats.revenue}
          format={(n) => `$${n.toFixed(0)}`}
          color="text-emerald-400"
        />
        <KpiCell icon={Clock} label="Pendientes" value={stats.pending} color="text-amber-400" />
        <KpiCell icon={TrendingUp} label="Ocupación" value={stats.occupancy} format={(n) => `${n.toFixed(0)}%`} />
      </motion.div>

      {/* Occupancy bar + milestones */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${occupancyColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${stats.occupancy}%` }}
            transition={SPRING.soft}
          />
        </div>
        {stats.occupancy >= 100 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={SPRING.bouncy}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase tracking-wider"
          >
            Completa
          </motion.span>
        )}
        {stats.occupancy >= 80 && stats.occupancy < 100 && (
          <span className="text-[10px] text-amber-400/70">Casi lleno</span>
        )}
      </div>
    </motion.div>
  );
}

function KpiCell({ icon: Icon, label, value, format, color = 'text-foreground' }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center gap-0.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
      <span className={`text-lg font-semibold ${color}`}>
        <AnimatedNumber value={value} format={format} />
      </span>
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</span>
    </motion.div>
  );
}
