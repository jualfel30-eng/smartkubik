import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * OnboardingTour — Step-by-step guided tour with spotlight highlights.
 *
 * Usage:
 *   <OnboardingTour
 *     steps={[
 *       { target: '#settings-button', title: 'Configuración', description: 'Ajusta tu negocio aquí' },
 *       { target: '[data-sidebar]', title: 'Navegación', description: 'Accede a todos los módulos' },
 *     ]}
 *     active={showTour}
 *     onComplete={() => setShowTour(false)}
 *     storageKey="onboarding-main"
 *   />
 *
 * Each step.target is a CSS selector. The tour highlights that element.
 */

export default function OnboardingTour({
  steps = [],
  active = false,
  onComplete,
  storageKey = 'onboarding-tour',
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'done'; } catch { return false; }
  });

  const updateRect = useCallback(() => {
    if (!steps[currentStep]?.target) return;
    const el = document.querySelector(steps[currentStep].target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setRect(null);
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (!active || dismissed) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, dismissed, updateRect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const finish = () => {
    try { localStorage.setItem(storageKey, 'done'); } catch {}
    setDismissed(true);
    setCurrentStep(0);
    onComplete?.();
  };

  if (!active || dismissed || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Position tooltip relative to highlighted element
  const tooltipStyle = rect
    ? {
        top: rect.top + rect.height + 12,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
      }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90]" aria-modal="true" role="dialog">
        {/* Backdrop with cutout */}
        <div
          className="absolute inset-0 bg-black/50 transition-all duration-300"
          onClick={finish}
        />

        {/* Spotlight on target */}
        {rect && (
          <motion.div
            className="absolute rounded-lg ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
            initial={false}
            animate={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          className="absolute z-[91] w-80 bg-card border rounded-xl shadow-xl p-4"
          style={tooltipStyle}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          key={currentStep}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">
                Paso {currentStep + 1} de {steps.length}
              </p>
              <h4 className="text-sm font-semibold mt-0.5">{step.title}</h4>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1" onClick={finish}>
              <X size={14} />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    i === currentStep ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30',
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev}>
                  <ChevronLeft size={14} />
                  Atrás
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLast ? 'Entendido' : 'Siguiente'}
                {!isLast && <ChevronRight size={14} />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
