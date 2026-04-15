import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';

/**
 * Tira horizontal de 7 días con dots de ocupación.
 * Props: date, items[], onSelect(date)
 */
export default function MobileWeekStrip({ date, items = [], onSelect }) {
  const weekStart = useMemo(
    () => startOfWeek(date, { weekStartsOn: 1 }),
    [date],
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const countByDay = useMemo(() => {
    const map = new Map();
    for (const apt of items) {
      if (!apt.startTime) continue;
      const dt = new Date(apt.startTime);
      if (Number.isNaN(dt.getTime())) continue;
      const key = format(dt, 'yyyy-MM-dd');
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
            onClick={() => { if (!selected) haptics.select(); onSelect(d); }}
            className={cn(
              'relative flex flex-col items-center gap-0.5 py-1.5 px-1 flex-1 no-tap-highlight',
              !selected && 'hover:bg-muted rounded-[var(--mobile-radius-md)]',
            )}
            style={selected ? { color: 'var(--primary-foreground, #fff)' } : undefined}
          >
            {selected && (
              <motion.span
                layoutId="week-strip-pill"
                className="absolute inset-0 bg-primary"
                style={{ borderRadius: 'var(--mobile-radius-md)' }}
                transition={SPRING.soft}
                aria-hidden
              />
            )}
            <span className={cn(
              'relative z-[1] text-[10px] font-medium uppercase',
              selected ? 'text-primary-foreground' : 'text-muted-foreground',
            )}>
              {format(d, 'EEEEE', { locale: es })}
            </span>
            <span className={cn(
              'relative z-[1] text-sm font-bold leading-none',
              selected ? 'text-primary-foreground' : (today ? 'text-primary' : ''),
            )}>
              {format(d, 'd')}
            </span>
            <div className="relative z-[1] flex gap-0.5 h-1.5 items-center justify-center mt-0.5">
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
