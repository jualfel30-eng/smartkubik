import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * Tira horizontal de 7 días con dots de ocupación.
 * Permite navegar al día tocando. El día seleccionado está resaltado.
 *
 * Props:
 *  - date: Date  (día actualmente seleccionado)
 *  - items: appointment[]  (todas las citas cargadas, para contar por día)
 *  - onSelect: (date: Date) => void
 */
export default function MobileWeekStrip({ date, items = [], onSelect }) {
  const weekStart = useMemo(
    () => startOfWeek(date, { weekStartsOn: 1 }), // lunes
    [date],
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Count appointments per day
  const countByDay = useMemo(() => {
    const map = new Map();
    for (const apt of items) {
      if (!apt.startTime) continue;
      const key = format(new Date(apt.startTime), 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  return (
    <div className="flex items-end justify-between px-1 py-2 gap-1">
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const selected = isSameDay(d, date);
        const today = isToday(d);
        const count = countByDay.get(key) ?? 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(d)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-1 flex-1 no-tap-highlight transition-colors',
              selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            {/* Day letter */}
            <span className={cn(
              'text-[10px] font-medium uppercase',
              selected ? 'text-primary-foreground' : 'text-muted-foreground',
            )}>
              {format(d, 'EEEEE', { locale: es })}
            </span>
            {/* Day number */}
            <span className={cn(
              'text-sm font-bold leading-none',
              today && !selected ? 'text-primary' : '',
            )}>
              {format(d, 'd')}
            </span>
            {/* Occupation dots */}
            <div className="flex gap-0.5 h-1.5 items-center justify-center mt-0.5">
              {count === 0 ? (
                <span className="w-1 h-1 rounded-full bg-transparent" />
              ) : count <= 3 ? (
                Array.from({ length: count }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-1 h-1 rounded-full',
                      selected ? 'bg-primary-foreground/70' : 'bg-primary',
                    )}
                  />
                ))
              ) : (
                <>
                  <span className={cn('w-1 h-1 rounded-full', selected ? 'bg-primary-foreground/70' : 'bg-primary')} />
                  <span className={cn('w-1 h-1 rounded-full', selected ? 'bg-primary-foreground/70' : 'bg-primary')} />
                  <span className={cn('text-[8px] font-bold leading-none', selected ? 'text-primary-foreground/70' : 'text-primary')}>+</span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
