import { motion } from 'framer-motion';
import { SPRING, STAGGER, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316', '#14b8a6'];

/**
 * Horizontal bar chart built with SVG + Framer Motion.
 *
 * Props:
 *  - data: [{label, value, color?, sublabel?}]
 *  - maxBars: number (default 6)
 *  - formatValue: (n) => string
 *  - onBarTap: (item, index) => void
 *  - barHeight: number (default 24)
 *  - showLabels: boolean (default true)
 */
export default function MobileBarChart({
  data = [],
  maxBars = 6,
  formatValue = (n) => n.toLocaleString(),
  onBarTap,
  barHeight = 24,
  showLabels = true,
}) {
  if (!data.length) return null;

  const visible = data.slice(0, maxBars);
  const maxValue = Math.max(...visible.map((d) => d.value), 1);
  const rowHeight = barHeight + 8; // bar + gap
  const labelHeight = showLabels ? 18 : 0;
  const totalHeight = visible.length * (rowHeight + labelHeight);

  const handleBarTap = (item, idx) => {
    if (!onBarTap) return;
    haptics.tap();
    onBarTap(item, idx);
  };

  return (
    <motion.div
      variants={STAGGER(0.05, 0.05)}
      initial="initial"
      animate="animate"
    >
      {visible.map((item, idx) => {
        const barColor = item.color || COLORS[idx % COLORS.length];
        const widthPct = (item.value / maxValue) * 100;

        return (
          <motion.div
            key={item.label + idx}
            variants={{
              initial: { opacity: 0, x: -8 },
              animate: {
                opacity: 1,
                x: 0,
                transition: { duration: DUR.base, ease: EASE.out },
              },
            }}
            onClick={() => handleBarTap(item, idx)}
            role={onBarTap ? 'button' : undefined}
            tabIndex={onBarTap ? 0 : undefined}
            aria-label={`${item.label}: ${formatValue(item.value)}`}
            className={`mb-2 ${onBarTap ? 'cursor-pointer active:opacity-70' : ''}`}
          >
            {/* Label row */}
            {showLabels && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                  {item.label}
                </span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {formatValue(item.value)}
                </span>
              </div>
            )}

            {/* Bar */}
            <div
              className="relative w-full rounded-full overflow-hidden"
              style={{ height: barHeight, backgroundColor: 'var(--muted)' }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ backgroundColor: barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={SPRING.soft}
              />
            </div>

            {/* Sublabel */}
            {item.sublabel && (
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {item.sublabel}
              </span>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
