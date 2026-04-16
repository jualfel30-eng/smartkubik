import { useMemo } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { listItem, STAGGER } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';

const STATUS_COLOR = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-emerald-500',
  completed: 'bg-muted-foreground',
  cancelled: 'bg-destructive',
};

const STATUS_LABEL = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

function dayLabel(d) {
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  return format(d, "EEEE d 'de' MMM", { locale: es });
}

/**
 * Vista lista de próximas citas agrupadas por día.
 * Muestra días con citas, ordena por hora.
 */
export default function MobileAgendaList({ items = [], onSelect, loading = false }) {
  const { v: rv } = useReducedMotionSafe();
  if (loading && items.length === 0) {
    return (
      <div className="py-4">
        <MobileListSkeleton count={6} height="h-20" />
      </div>
    );
  }

  const groups = useMemo(() => {
    const future = items
      .filter((a) => a.startTime && a.status !== 'cancelled')
      .map((a) => ({ ...a, _dt: new Date(a.startTime) }))
      .filter((a) => !Number.isNaN(a._dt.getTime()))
      .sort((a, b) => a._dt - b._dt);

    const map = new Map();
    for (const apt of future) {
      const key = format(apt._dt, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, { date: apt._dt, items: [] });
      map.get(key).items.push(apt);
    }
    return Array.from(map.values());
  }, [items]);

  if (groups.length === 0) {
    return (
      <div className="py-12 text-center">
        <CalendarDays size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Sin citas próximas</p>
      </div>
    );
  }

  return (
    <motion.div
      className="py-2 space-y-5"
      initial="initial"
      animate="animate"
      variants={rv(STAGGER(0.04))}
    >
      {groups.map(({ date: d, items: dayItems }) => (
        <section key={format(d, 'yyyy-MM-dd')}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-bold text-foreground capitalize">{dayLabel(d)}</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{dayItems.length} cita{dayItems.length !== 1 ? 's' : ''}</span>
          </div>
          <motion.div className="space-y-2" variants={rv(STAGGER(0.035))}>
            {dayItems.map((apt) => {
              const dot = STATUS_COLOR[apt.status] || 'bg-muted';
              return (
                <motion.button
                  key={apt._id}
                  type="button"
                  variants={listItem}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => { haptics.tap(); onSelect?.(apt); }}
                  className="w-full text-left border border-border bg-card p-3 flex items-center gap-3 no-tap-highlight"
                  style={{
                    borderRadius: 'var(--mobile-radius-lg)',
                    boxShadow: 'var(--elevation-rest)',
                  }}
                >
                  <div className="shrink-0 text-center w-12">
                    <p className="text-base font-bold tabular-nums leading-none">
                      {format(apt._dt, 'HH:mm')}
                    </p>
                  </div>
                  <div className="w-px h-full bg-muted shrink-0 self-stretch" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        {STATUS_LABEL[apt.status] || apt.status}
                      </span>
                    </div>
                    <p className="font-semibold truncate">{apt.customerName || 'Sin cliente'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {apt.serviceName}{apt.resourceName ? ` · ${apt.resourceName}` : ''}
                    </p>
                  </div>
                  {apt.totalPrice != null && (
                    <div className="shrink-0 text-sm font-semibold tabular-nums">
                      ${Number(apt.totalPrice).toFixed(2)}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </section>
      ))}
    </motion.div>
  );
}
