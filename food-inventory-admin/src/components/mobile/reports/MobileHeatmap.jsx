import { useState } from 'react';
import { motion } from 'framer-motion';
import { DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileActionSheet from '../MobileActionSheet.jsx';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Peak hours heatmap grid (7 days × configurable hours).
 *
 * Props:
 *  - data: [{day: 0-6, hour: 0-23, count}]  (from beauty-reports/peak-hours API)
 *  - loading: boolean
 *  - minHour: number (default 8)
 *  - maxHour: number (default 20)
 */
export default function MobileHeatmap({ data = [], loading = false, minHour = 8, maxHour = 20 }) {
  const [tooltip, setTooltip] = useState(null);

  if (loading) {
    return (
      <div className="animate-pulse space-y-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-5 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Sin datos de citas en este periodo
      </p>
    );
  }

  // Build lookup map
  const lookup = {};
  let maxCount = 1;
  for (const item of data) {
    const key = `${item.day}-${item.hour}`;
    lookup[key] = item.count;
    if (item.count > maxCount) maxCount = item.count;
  }

  const hours = [];
  for (let h = minHour; h <= maxHour; h++) hours.push(h);

  const cellDelay = (row, col) => (row * 0.02) + (col * 0.015);

  return (
    <>
      <div className="overflow-x-auto -mx-1">
        {/* Grid: label column + 7 day columns */}
        <div
          className="grid gap-[2px] min-w-[280px]"
          style={{ gridTemplateColumns: '28px repeat(7, 1fr)' }}
        >
          {/* Header row */}
          <div /> {/* empty corner */}
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-[9px] text-muted-foreground text-center font-medium">
              {d}
            </div>
          ))}

          {/* Data rows */}
          {hours.map((hour, rowIdx) => (
            <>
              {/* Hour label */}
              <div key={`label-${hour}`} className="text-[9px] text-muted-foreground text-right pr-1 leading-5">
                {hour}:00
              </div>

              {/* Day cells */}
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const count = lookup[`${dayIdx}-${hour}`] || 0;
                const intensity = count / maxCount;

                return (
                  <motion.button
                    key={`${dayIdx}-${hour}`}
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: DUR.base,
                      ease: EASE.out,
                      delay: cellDelay(rowIdx, dayIdx),
                    }}
                    onClick={() => {
                      haptics.select();
                      setTooltip({ day: dayIdx, hour, count });
                    }}
                    aria-label={`${DAY_NAMES[dayIdx]} ${hour}:00, ${count} citas`}
                    className="rounded-sm aspect-square min-h-[20px] transition-colors"
                    style={{
                      backgroundColor: count > 0
                        ? `rgba(99, 102, 241, ${0.15 + intensity * 0.75})`
                        : 'var(--muted)',
                    }}
                  />
                );
              })}
            </>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--muted)' }} />
            Bajo
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(99, 102, 241, 0.45)' }} />
            Medio
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(99, 102, 241, 0.9)' }} />
            Alto
          </div>
        </div>
      </div>

      {/* Tooltip sheet */}
      <MobileActionSheet
        open={!!tooltip}
        onClose={() => setTooltip(null)}
        title="Detalle de hora"
      >
        {tooltip && (
          <div className="text-center py-4">
            <p className="text-lg font-bold">{tooltip.count} citas</p>
            <p className="text-sm text-muted-foreground mt-1">
              {DAY_NAMES[tooltip.day]} a las {tooltip.hour}:00
            </p>
          </div>
        )}
      </MobileActionSheet>
    </>
  );
}
