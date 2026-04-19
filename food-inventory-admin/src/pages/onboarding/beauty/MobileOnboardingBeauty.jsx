import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { fetchApi } from '@/lib/api';
import { SPRING, DUR, EASE } from '@/lib/motion';
import { BeautyOnboardingProvider } from './BeautyOnboardingContext';
import { BEAUTY_SERVICES } from './data/beautyServicesSuggestions';
import PainPointStep from './steps/PainPointStep';
import OutcomeStep from './steps/OutcomeStep';
import SalonIdentityStep from './steps/SalonIdentityStep';
import TeamStep from './steps/TeamStep';
import ServicesStep from './steps/ServicesStep';
import ScheduleStep from './steps/ScheduleStep';
import BuildingStep from './steps/BuildingStep';
import RevealStep from './steps/RevealStep';
import CelebrationStep from './steps/CelebrationStep';

const STEP_KEYS = [
  'pain_points',
  'outcome',
  'salon_identity',
  'team',
  'services',
  'schedule',
  'building',
  'reveal',
  'celebration',
];

const STEPS = [
  PainPointStep,
  OutcomeStep,
  SalonIdentityStep,
  TeamStep,
  ServicesStep,
  ScheduleStep,
  BuildingStep,
  RevealStep,
  CelebrationStep,
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

export default function MobileOnboardingBeauty() {
  const { tenant, user, updateTenantContext } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(() => {
    const saved = tenant?.onboardingStep || 0;
    // Don't resume into building/reveal/celebration — restart from schedule
    return saved >= 6 ? 6 : saved;
  });
  const [direction, setDirection] = useState(1);

  // Redirect if already completed
  useEffect(() => {
    if (tenant?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [tenant?.onboardingCompleted, navigate]);

  const persistProgress = useCallback(
    async (newStep, opts = {}) => {
      const stepsCompleted = STEP_KEYS.slice(0, newStep);
      const payload = { step: newStep, stepsCompleted, ...opts };

      try {
        await fetchApi('/tenant/onboarding-progress', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch {
        // Non-blocking
      }

      updateTenantContext({
        onboardingStep: newStep,
        onboardingStepsCompleted: stepsCompleted,
        ...(opts.completed ? { onboardingCompleted: true } : {}),
        ...(opts.skipped ? { onboardingCompleted: true } : {}),
      });
    },
    [updateTenantContext],
  );

  const goNext = useCallback(() => {
    const next = step + 1;
    setDirection(1);

    if (next >= STEPS.length) {
      persistProgress(next, { completed: true });
      navigate('/dashboard', { replace: true });
      return;
    }

    setStep(next);
    persistProgress(next);
  }, [step, persistProgress, navigate]);

  const goBack = useCallback(() => {
    if (step <= 0) return;
    setDirection(-1);
    setStep(step - 1);
  }, [step]);

  const skipAll = useCallback(() => {
    persistProgress(STEPS.length, { skipped: true });
    navigate('/dashboard', { replace: true });
  }, [persistProgress, navigate]);

  const goToStep = useCallback((target) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  }, [step]);

  const StepComponent = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  // Initial values from registration
  const initialValues = {
    salonName: tenant?.name || '',
    currency: tenant?.currency || 'USD',
    services: BEAUTY_SERVICES.map((s) => ({ ...s, isSelected: s.preSelected })),
  };

  return (
    <BeautyOnboardingProvider initialValues={initialValues}>
      <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col overflow-hidden">
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,85,247,0.05) 0%, transparent 60%)',
          }}
        />

        {/* Progress bar */}
        <div className="w-full h-[2px] bg-white/[0.04] flex-shrink-0 relative z-10">
          <motion.div
            className="h-full rounded-r-full"
            style={{
              background: 'linear-gradient(90deg, #a855f7, #6366f1)',
              boxShadow: '0 0 8px rgba(168,85,247,0.4)',
            }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ ...SPRING.soft }}
          />
        </div>

        {/* Header with back + skip */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 relative z-10">
          {step > 0 && step < 7 ? (
            <button
              onClick={goBack}
              className="text-white/25 hover:text-white/60 transition-colors p-2 -ml-2"
              aria-label="Volver"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <div className="w-9" />
          )}

          {step < 6 && (
            <button
              onClick={skipAll}
              className="text-white/20 hover:text-white/50 text-xs font-medium tracking-wide transition-colors px-2 py-1"
            >
              Saltar
            </button>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: EASE.out }}
              className="absolute inset-0 overflow-y-auto"
            >
              <div className="max-w-md mx-auto px-5 pb-8 pt-2 min-h-full flex flex-col">
                <StepComponent
                  onNext={goNext}
                  onBack={goBack}
                  onSkip={skipAll}
                  onGoToStep={goToStep}
                  tenant={tenant}
                  user={user}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BeautyOnboardingProvider>
  );
}
