/**
 * POReceivedCeremony.jsx
 * 3-stage celebration overlay when a Purchase Order is marked as received.
 * Stage 1: Anticipation (animated checklist)
 * Stage 2: Reveal (summary)
 * Stage 3: Celebration (confetti for POs > $1,000)
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Package, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SPRING, DUR, EASE } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { triggerCelebration } from '@/hooks/use-celebration';

const STEPS = [
  'Verificando cantidades',
  'Actualizando inventario',
  'Registrando movimientos',
  'Finalizando',
];

export default function POReceivedCeremony({ active, poData, onComplete }) {
  const [stage, setStage] = useState(0); // 0=inactive, 1=anticipation, 2=reveal, 3=celebration
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStage(0);
      setCurrentStep(0);
      return;
    }

    // Stage 1: Anticipation — step through checklist
    setStage(1);
    setCurrentStep(0);

    const stepTimers = STEPS.map((_, i) =>
      setTimeout(() => setCurrentStep(i + 1), 300 * (i + 1))
    );

    // Stage 2: Reveal
    const revealTimer = setTimeout(() => setStage(2), 300 * STEPS.length + 400);

    // Stage 3: Celebration
    const celebrateTimer = setTimeout(() => {
      setStage(3);
      const total = poData?.totalValue || 0;
      if (total >= 1000) {
        triggerCelebration();
      }
    }, 300 * STEPS.length + 1200);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(revealTimer);
      clearTimeout(celebrateTimer);
    };
  }, [active, poData]);

  if (!active && stage === 0) return null;

  const itemCount = poData?.itemCount || 0;
  const totalValue = poData?.totalValue || 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={SPRING.soft}
            className="bg-card border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl"
          >
            {/* Stage 1: Anticipation */}
            {stage === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <Package className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h3 className="font-semibold text-lg">Actualizando stock...</h3>
                </div>
                <div className="space-y-2">
                  {STEPS.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15, duration: DUR.base, ease: EASE.out }}
                      className="flex items-center gap-2 text-sm"
                    >
                      {currentStep > i ? (
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : currentStep === i ? (
                        <div className="h-4 w-4 rounded-full border-2 border-primary animate-pulse shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={currentStep > i ? 'text-foreground' : 'text-muted-foreground'}>
                        {step}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Stage 2: Reveal */}
            {stage >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE.out }}
                className="text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING.bouncy}
                >
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-lg">Pedido recibido</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {itemCount} producto{itemCount !== 1 ? 's' : ''} actualizado{itemCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Mercancia ingresada</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    $<AnimatedNumber value={totalValue} format={(n) => n.toLocaleString('es-VE', { minimumFractionDigits: 2 })} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Stage 3: Celebration — show close button */}
            {stage === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 flex justify-center"
              >
                <Button variant="outline" onClick={onComplete}>
                  Cerrar
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
