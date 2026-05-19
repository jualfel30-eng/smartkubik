import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronRight, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { fadeUp } from '@/lib/motion';

export default function ARHeroBanner({ overdueCount, overdueTotal, dueSoonTotal, onFilterOverdue, onFilterDueSoon }) {
  const [visible, setVisible] = useState(true);

  const isAllClear = overdueCount === 0 && dueSoonTotal === 0;

  useEffect(() => {
    setVisible(true);
    if (isAllClear) {
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [overdueCount, dueSoonTotal, isAllClear]);

  if (overdueCount === 0 && dueSoonTotal === 0 && !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div {...fadeUp} exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}>
          {overdueCount > 0 ? (
            <button
              type="button"
              onClick={onFilterOverdue}
              className="w-full text-left rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3
                         flex items-center justify-between gap-3 hover:bg-red-500/12 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                  <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                    {overdueCount} {overdueCount === 1 ? 'cobro vencido' : 'cobros vencidos'} · {formatCurrency(overdueTotal)}
                  </p>
                  <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-0.5">
                    Actúa hoy para mantener tu flujo de caja
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-red-500/60 shrink-0" />
            </button>
          ) : dueSoonTotal > 0 ? (
            <button
              type="button"
              onClick={onFilterDueSoon}
              className="w-full text-left rounded-xl border border-blue-500/30 bg-blue-500/8 px-4 py-3
                         flex items-center justify-between gap-3 hover:bg-blue-500/12 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
                  <TrendingUp className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                    {formatCurrency(dueSoonTotal)} por cobrar esta semana
                  </p>
                  <p className="text-xs text-blue-500/70 dark:text-blue-400/60 mt-0.5">
                    Envía recordatorios antes de que venzan
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-500/60 shrink-0" />
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3
                            flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                Sin vencimientos · Todo al día
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
