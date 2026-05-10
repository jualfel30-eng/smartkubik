import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, tapScale } from '@/lib/motion';
import haptics from '@/lib/haptics';

export const FILTER_CHIPS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'overdue', label: 'Vencidas' },
  { key: 'paid', label: 'Pagadas' },
  { key: 'all', label: 'Todas' },
];

export function OrdersFilterChips({
  active = 'today',
  onChange,
  onOpenAdvanced,
  counts = {},
  className,
}) {
  const handleChange = (key) => {
    if (key === active) return;
    haptics.select();
    onChange?.(key);
  };

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <div
        className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto snap-x scroll-px-4 py-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
        role="tablist"
        aria-label="Filtros rápidos de órdenes"
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = chip.key === active;
          const count = counts[chip.key];
          return (
            <motion.button
              key={chip.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChange(chip.key)}
              whileTap={tapScale}
              transition={SPRING.snappy}
              className={cn(
                'snap-start shrink-0 inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium no-tap-highlight transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-muted/60',
              )}
            >
              <span>{chip.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={cn(
                    'ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    isActive
                      ? 'bg-primary-foreground/15 text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {onOpenAdvanced && (
        <motion.button
          type="button"
          aria-label="Filtros avanzados"
          onClick={() => {
            haptics.tap();
            onOpenAdvanced?.();
          }}
          whileTap={tapScale}
          transition={SPRING.snappy}
          className="shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground no-tap-highlight w-10 h-10 hover:bg-muted/60"
        >
          <SlidersHorizontal size={16} />
        </motion.button>
      )}
    </div>
  );
}

export default OrdersFilterChips;
