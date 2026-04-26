import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target } from 'lucide-react';
import { SPRING, DUR, EASE, fadeUp, scaleIn } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';

// ─── Milestone labels (Spanish) ──────────────────────────────────────────────
const MILESTONE_LABELS = {
  first_sale: 'Primera venta del dia!',
  '10th_sale': '10 ordenes hoy!',
  '$500_day': '$500+ hoy!',
  '$1000_day': '$1,000+ hoy!',
  '50_orders': '50 ordenes hoy!',
  new_record: 'Nuevo record diario!',
};

// ─── Animated SVG checkmark (faster for POS speed) ──────────────────────────
function AnimatedCheckmark() {
  return (
    <svg viewBox="0 0 52 52" className="w-16 h-16 mx-auto">
      <motion.circle
        cx="26" cy="26" r="24"
        fill="none"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE.out, delay: 0.1 }}
      />
      <motion.path
        d="M15 27l7 7 15-15"
        fill="none"
        stroke="#10B981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2, ease: EASE.out, delay: 0.35 }}
      />
    </svg>
  );
}

// ─── Main overlay ────────────────────────────────────────────────────────────
export default function SaleCompleteOverlay({
  orderNumber,
  amount,
  customerName,
  todayTotal,
  todayCount,
  milestones = [],
  isNewRecord = false,
  onComplete,
}) {
  // Auto-dismiss after 1.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const activeMilestones = milestones
    .filter((m) => MILESTONE_LABELS[m])
    .slice(0, 2); // max 2 badges

  const overlay = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DUR.fast }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 backdrop-blur-sm"
        onClick={() => onComplete?.()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={SPRING.soft}
          className="max-w-md w-full mx-4 rounded-xl border bg-card p-6 shadow-2xl text-center space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Checkmark */}
          <AnimatedCheckmark />

          {/* Order info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out, delay: 0.4 }}
          >
            <p className="text-lg font-semibold text-foreground">
              Orden #{orderNumber} completada
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              <AnimatedNumber
                value={amount}
                format={(n) => `$${n.toFixed(2)}`}
                duration={0.5}
                className="font-bold text-foreground text-base"
              />
              {customerName && (
                <span className="ml-1">· {customerName}</span>
              )}
            </p>
          </motion.div>

          {/* Daily summary */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out, delay: 0.6 }}
            className="rounded-lg border bg-muted/40 px-4 py-3"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Hoy:</span>
              <AnimatedNumber
                value={todayTotal}
                format={(n) => `$${n.toFixed(2)}`}
                duration={0.6}
                className="font-bold text-foreground"
              />
              <span>en {todayCount} {todayCount === 1 ? 'orden' : 'ordenes'}</span>
              {todayTotal >= 1000 && (
                <Target className="h-4 w-4 text-emerald-500" />
              )}
            </div>
          </motion.div>

          {/* Milestone badges */}
          {activeMilestones.length > 0 && (
            <motion.div
              className="flex items-center justify-center gap-2 flex-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {activeMilestones.map((m) => (
                <motion.span
                  key={m}
                  {...scaleIn}
                  transition={SPRING.bouncy}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                >
                  {MILESTONE_LABELS[m]}
                </motion.span>
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
