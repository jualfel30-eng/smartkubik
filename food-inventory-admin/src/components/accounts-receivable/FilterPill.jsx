import { cn } from '@/lib/utils';

const COLOR_MAP = {
  red:     { base: 'border-red-500/30 text-red-600 dark:text-red-400',     active: 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400',     badge: 'bg-red-500/20 text-red-700 dark:text-red-300' },
  amber:   { base: 'border-amber-500/30 text-amber-600 dark:text-amber-400', active: 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400', badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  emerald: { base: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400', active: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  muted:   { base: 'border-border text-muted-foreground',                   active: 'bg-muted border-border text-foreground',                               badge: 'bg-muted-foreground/20 text-muted-foreground' },
};

export default function FilterPill({ label, count, color = 'muted', active = false, onClick }) {
  const colors = COLOR_MAP[color] || COLOR_MAP.muted;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
        'transition-all duration-150 shrink-0 whitespace-nowrap',
        active ? colors.active : cn('bg-transparent hover:bg-muted/50', colors.base)
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums', colors.badge)}>
          {count}
        </span>
      )}
    </button>
  );
}
