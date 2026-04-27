import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { SPRING, scaleIn } from '@/lib/motion';

/**
 * CompletionOverlay — brief celebration when an appointment is marked as completed.
 * Shows checkmark, service name, revenue amount, and daily total.
 * Auto-dismisses after 2.5 seconds.
 */
export default function CompletionOverlay({ appointment, dailyTotal, onPayment, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!appointment) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [appointment]);

  if (!appointment) return null;

  const price = Number(appointment.totalPrice) || 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -5 }}
          transition={SPRING.soft}
          className="absolute inset-x-3 top-3 z-50 rounded-xl border border-emerald-500/30 bg-emerald-950/90 backdrop-blur-md p-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            {/* Animated checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING.bouncy}
              className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"
            >
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-100">Servicio completado</p>
              <p className="text-xs text-emerald-300/70 truncate">
                {appointment.customerName} &middot; {appointment.serviceName || 'Servicio'}
              </p>
              {price > 0 && (
                <p className="text-lg font-bold text-emerald-300 mt-0.5">
                  $<AnimatedNumber value={price} format={(n) => n.toFixed(2)} />
                </p>
              )}
            </div>
          </div>

          {/* Daily total */}
          {dailyTotal > 0 && (
            <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
              <span className="text-xs text-emerald-400/60">
                Hoy: $<AnimatedNumber value={dailyTotal} format={(n) => n.toFixed(2)} className="text-emerald-300" />
              </span>
              {onPayment && price > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-emerald-300 hover:text-emerald-100 hover:bg-emerald-800/50 h-7 text-xs"
                  onClick={() => { onPayment(appointment); onDismiss?.(); }}
                >
                  <DollarSign className="h-3 w-3 mr-1" /> Cobrar
                </Button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
