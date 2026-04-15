import { useMemo } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Plus } from 'lucide-react';
import MobileAppointmentCard from './MobileAppointmentCard.jsx';

// Lista cronológica vertical agrupada por franja horaria.
// (Fase 2 luego agregará columnas por recurso con swipe horizontal.)

function groupByHour(items) {
  const groups = new Map();
  for (const it of items) {
    const dt = it.startTime ? new Date(it.startTime) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const hourKey = format(dt, 'HH:00');
    if (!groups.has(hourKey)) groups.set(hourKey, []);
    groups.get(hourKey).push({ ...it, _dt: dt });
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a._dt.getTime() - b._dt.getTime());
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function MobileDayAgenda({ date, items, loading, onSelect, onCreateAt }) {
  const todaysItems = useMemo(
    () => items.filter((it) => it.startTime && isSameDay(new Date(it.startTime), date)),
    [items, date],
  );
  const groups = useMemo(() => groupByHour(todaysItems), [todaysItems]);

  if (loading && items.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">Cargando agenda…</div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <Clock size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Sin citas para este día</p>
        <p className="text-xs text-muted-foreground mt-1">Toca el botón + para agendar</p>
        <button
          type="button"
          onClick={() => {
            const iso = new Date(date);
            iso.setHours(9, 0, 0, 0);
            onCreateAt?.(iso.toISOString());
          }}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary no-tap-highlight"
        >
          <Plus size={16} /> Nueva cita
        </button>
      </div>
    );
  }

  return (
    <div className="py-2 space-y-4">
      {groups.map(([hour, list]) => (
        <section key={hour} aria-label={`Franja ${hour}`}>
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-muted-foreground tabular-nums w-12">
              {hour}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-2">
            {list.map((apt) => (
              <MobileAppointmentCard
                key={apt._id}
                appointment={apt}
                onTap={() => onSelect?.(apt)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
