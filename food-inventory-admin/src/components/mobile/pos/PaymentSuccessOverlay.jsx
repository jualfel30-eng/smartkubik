import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { SPRING, DUR, EASE, fadeUp, scaleIn } from '@/lib/motion';
import haptics from '@/lib/haptics';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import { triggerCelebration } from '@/hooks/use-celebration';

// ─── Milestone labels (Spanish) ──────────────────────────────────────────────
const MILESTONE_LABELS = {
  first_sale: 'Primera venta del dia!',
  '10th_sale': '10 servicios hoy — vas volando!',
  '$500_day': 'Medio palo! $500+ hoy',
  new_record: 'Nuevo record!',
};

// ─── Animated SVG checkmark ──────────────────────────────────────────────────
function AnimatedCheckmark() {
  return (
    <svg viewBox="0 0 52 52" className="w-20 h-20 mx-auto">
      {/* Circle */}
      <motion.circle
        cx="26" cy="26" r="24"
        fill="none"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE.out, delay: 0.4 }}
      />
      {/* Checkmark */}
      <motion.path
        d="M15 27l7 7 15-15"
        fill="none"
        stroke="#10B981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: EASE.out, delay: 0.75 }}
      />
    </svg>
  );
}

// ─── Daily revenue card ──────────────────────────────────────────────────────
function DailyRevenueCard({ todayTotal, todayCount, dailyGoal }) {
  const pct = Math.min((todayTotal / dailyGoal) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING.soft, delay: 1.3 }}
      className="rounded-[var(--mobile-radius-lg)] border border-border bg-muted/60 p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Hoy llevas</span>
        <AnimatedNumber
          value={todayTotal}
          format={(n) => `$${n.toFixed(2)}`}
          duration={0.8}
          className="font-bold text-lg tabular-nums"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        en {todayCount} servicio{todayCount !== 1 ? 's' : ''}
      </p>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: EASE.out, delay: 1.5 }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right tabular-nums">
        {Math.round(pct)}% de meta diaria (${dailyGoal})
      </p>
    </motion.div>
  );
}

// ─── Streak badge ────────────────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (streak < 2) return null;
  const flames = streak >= 8 ? '🔥🔥🔥' : streak >= 4 ? '🔥🔥' : '🔥';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...SPRING.bouncy, delay: 1.7 }}
      className="text-center text-sm font-medium text-amber-500"
    >
      {flames} {streak} dias consecutivos sobre $300
    </motion.div>
  );
}

// ─── Milestone badges ────────────────────────────────────────────────────────
function MilestoneBadges({ milestones }) {
  if (!milestones?.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {milestones.map((ms, i) => (
        <motion.span
          key={ms}
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{ ...SPRING.bouncy, delay: 1.8 + i * 0.12 }}
          className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold"
        >
          {ms === 'new_record' ? '🏆 ' : ''}{MILESTONE_LABELS[ms] || ms}
        </motion.span>
      ))}
    </div>
  );
}

// ─── Main overlay ────────────────────────────────────────────────────────────
export default function PaymentSuccessOverlay({
  amount,
  methodLabel,
  customerName,
  customerPhone,
  todayTotal,
  todayCount,
  dailyGoal,
  streak,
  isNewRecord,
  milestones,
  loyaltyPointsEarned,
  onClose,
  onWhatsApp,
}) {
  const [mounted, setMounted] = useState(false);

  // Stage 1: Anticipation haptic
  useEffect(() => {
    haptics.impact();
    setMounted(true);
  }, []);

  // Stage 2: Success haptic after checkmark draws
  useEffect(() => {
    const timer = setTimeout(() => haptics.success(), 900);
    return () => clearTimeout(timer);
  }, []);

  // Confetti for new record milestone
  useEffect(() => {
    if (isNewRecord || milestones?.includes('new_record')) {
      const timer = setTimeout(() => triggerCelebration(), 1800);
      return () => clearTimeout(timer);
    }
  }, [isNewRecord, milestones]);

  const overlay = (
    <AnimatePresence>
      {mounted && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center px-6"
          style={{ zIndex: 10000 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.base }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/97"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Content */}
          <div className="relative z-10 w-full max-w-sm space-y-6">

            {/* Pulse ring — anticipation */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ scale: 0.3, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE.out }}
            >
              <div className="w-20 h-20 rounded-full border-2 border-emerald-500/40" />
            </motion.div>

            {/* Animated checkmark */}
            <AnimatedCheckmark />

            {/* "Pago recibido" */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: DUR.base, ease: EASE.out }}
              className="text-center text-lg font-bold"
            >
              Pago recibido
            </motion.p>

            {/* Amount count-up */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: DUR.base, ease: EASE.out }}
              className="text-center"
            >
              <AnimatedNumber
                value={amount}
                format={(n) => `$${n.toFixed(2)}`}
                duration={0.8}
                className="text-4xl font-bold tabular-nums"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {methodLabel}{customerName ? ` · ${customerName}` : ''}
              </p>
            </motion.div>

            {/* Daily revenue card */}
            <DailyRevenueCard
              todayTotal={todayTotal}
              todayCount={todayCount}
              dailyGoal={dailyGoal}
            />

            {/* Streak badge */}
            <StreakBadge streak={streak} />

            {/* Milestone badges */}
            <MilestoneBadges milestones={milestones} />

            {/* Loyalty points earned */}
            {loyaltyPointsEarned > 0 && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 0, y: -30 }}
                transition={{ delay: 2, duration: 0.8, ease: EASE.out }}
                className="text-center text-xs text-emerald-500 font-medium"
              >
                +{loyaltyPointsEarned} puntos ganados
              </motion.p>
            )}

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: DUR.base, ease: EASE.out }}
              className="flex gap-3 pt-2"
            >
              {customerPhone && onWhatsApp && (
                <button
                  type="button"
                  onClick={onWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[var(--mobile-radius-md)] border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 py-3.5 text-sm font-semibold no-tap-highlight"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'flex-1 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground py-3.5 text-sm font-bold no-tap-highlight',
                  !customerPhone && 'max-w-xs mx-auto',
                )}
              >
                Cerrar
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
