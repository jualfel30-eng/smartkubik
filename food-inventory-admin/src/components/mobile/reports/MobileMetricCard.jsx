import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { listItem, tapScale, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';

/**
 * Reusable metric card with big number, trend badge, and optional chart slot.
 *
 * Props:
 *  - title: string
 *  - icon: LucideIcon (optional)
 *  - value: number
 *  - format: (n) => string  (formatter for AnimatedNumber)
 *  - trend: number|null  (delta % vs previous period)
 *  - trendInverted: boolean  (if true, negative = green, e.g. no-show rate)
 *  - subtitle: string (optional, e.g. definition text)
 *  - loading: boolean
 *  - children: ReactNode (chart slot below metric)
 *  - onTap: () => void (opens drill-down sheet)
 */
export default function MobileMetricCard({
  title,
  icon: Icon,
  value,
  format,
  trend,
  trendInverted = false,
  subtitle,
  loading = false,
  children,
  onTap,
}) {
  const handleTap = onTap
    ? () => { haptics.tap(); onTap(); }
    : undefined;

  if (loading) {
    return (
      <motion.div
        variants={listItem}
        className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
        style={{ boxShadow: 'var(--elevation-rest)' }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-16 w-full bg-muted rounded" />
        </div>
      </motion.div>
    );
  }

  // Trend logic: positive delta → green for normal metrics, red for inverted
  const trendIsGood = trend != null
    ? trendInverted ? trend <= 0 : trend >= 0
    : null;

  return (
    <motion.div
      variants={listItem}
      whileTap={onTap ? tapScale : undefined}
      onClick={handleTap}
      role={onTap ? 'button' : 'region'}
      aria-label={title}
      tabIndex={onTap ? 0 : undefined}
      className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 active:bg-muted/30 transition-colors"
      style={{ boxShadow: 'var(--elevation-rest)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-muted-foreground" />}
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>

        {trend != null && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DUR.base, ease: EASE.spring, delay: 0.3 }}
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
              trendIsGood
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
        value={value}
        format={format}
        className="text-3xl font-bold tabular-nums text-foreground"
      />

      {/* Subtitle / definition */}
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}

      {/* Chart / visualization slot */}
      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  );
}
