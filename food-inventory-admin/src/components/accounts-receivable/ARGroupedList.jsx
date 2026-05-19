import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUrgency } from '@/lib/invoice-constants';
import { STAGGER } from '@/lib/motion';
import ARReceivableCard from './ARReceivableCard';

const GROUPS = [
  { key: 'overdue',  label: 'Vencidas',          color: 'text-red-500 dark:text-red-400',     divider: 'bg-red-500/20' },
  { key: 'due-soon', label: 'Por vencer',         color: 'text-amber-500 dark:text-amber-400', divider: 'bg-amber-500/20' },
  { key: 'current',  label: 'Al día',             color: 'text-emerald-500 dark:text-emerald-400', divider: 'bg-emerald-500/20' },
];

export default function ARGroupedList({ data, onAction, onOpenCustomer, isPaidView = false }) {
  const grouped = useMemo(() => {
    if (isPaidView) return [{ key: 'paid', label: 'Pagadas', color: 'text-muted-foreground', divider: 'bg-muted', items: data }];

    const map = { overdue: [], 'due-soon': [], current: [] };
    data.forEach(row => {
      const u = getUrgency(row.dueDate);
      map[u]?.push(row);
    });
    return GROUPS
      .map(g => ({ ...g, items: map[g.key] || [] }))
      .filter(g => g.items.length > 0);
  }, [data, isPaidView]);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {grouped.map(group => (
          <div key={group.key}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-px flex-1 ${group.divider}`} />
              <span className={`text-xs font-semibold uppercase tracking-widest shrink-0 ${group.color}`}>
                {group.label} ({group.items.length})
              </span>
              <div className={`h-px flex-1 ${group.divider}`} />
            </div>

            {/* Cards */}
            <motion.div
              className="space-y-2"
              variants={STAGGER(0.04)}
              initial="initial"
              animate="animate"
            >
              {group.items.map(row => (
                <ARReceivableCard
                  key={row.orderNumber ?? row.orderId}
                  row={row}
                  onAction={onAction}
                  onOpenCustomer={onOpenCustomer}
                  isPaidView={isPaidView}
                />
              ))}
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
