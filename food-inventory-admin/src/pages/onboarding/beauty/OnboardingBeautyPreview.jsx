/**
 * DEV-ONLY preview for the beauty onboarding flow.
 * Navigate to /onboarding-preview in the browser.
 * Remove this file and its route before shipping to production.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING, EASE } from '@/lib/motion';
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

const STEPS = [PainPointStep, OutcomeStep, SalonIdentityStep, TeamStep, ServicesStep, ScheduleStep, BuildingStep, RevealStep, CelebrationStep];
const STEP_NAMES = ['Pain Points', 'Outcome', 'Salon', 'Team', 'Services', 'Schedule', 'Building', 'Reveal', 'Done'];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

const MOCK_TENANT = {
  id: 'preview-tenant',
  code: 'demo-salon',
  name: 'Mi Barbería Demo',
  vertical: 'SERVICES',
  verticalProfile: { key: 'barbershop-salon' },
  currency: 'USD',
  onboardingCompleted: false,
  onboardingStep: 0,
};

const MOCK_USER = { firstName: 'Carlos', lastName: 'Ramírez', email: 'carlos@demo.com' };

export default function OnboardingBeautyPreview() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const goNext = useCallback(() => {
    setDirection(1);
    if (step >= STEPS.length - 1) { alert('Onboarding completado.'); return; }
    setStep((s) => s + 1);
  }, [step]);

  const goBack = useCallback(() => {
    if (step <= 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }, [step]);

  const skipAll = useCallback(() => { alert('Skip: redirige a /dashboard'); }, []);

  const goToStep = useCallback((target) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  }, [step]);

  const StepComponent = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const initialValues = {
    salonName: MOCK_TENANT.name,
    currency: 'USD',
    services: BEAUTY_SERVICES.map((s) => ({ ...s, isSelected: s.preSelected })),
  };

  return (
    <BeautyOnboardingProvider initialValues={initialValues}>
      <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col overflow-hidden">
        {/* Gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,85,247,0.05) 0%, transparent 60%)' }} />

        {/* DEV toolbar */}
        <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0 overflow-x-auto z-50 relative"
          style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="text-purple-400/60 text-[10px] font-semibold tracking-[0.1em] uppercase whitespace-nowrap">Preview</span>
          <div className="flex gap-1 ml-2">
            {STEP_NAMES.map((name, i) => (
              <button key={i} onClick={() => goToStep(i)}
                className="text-[10px] px-2 py-1 rounded-full whitespace-nowrap transition-all duration-200"
                style={{
                  background: i === step ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                  color: i === step ? 'rgb(196,181,253)' : 'rgba(255,255,255,0.25)',
                }}>
                {i + 1}
              </button>
            ))}
          </div>
          <span className="text-white/15 text-[10px] ml-auto whitespace-nowrap flex-shrink-0">mock mode</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-[2px] bg-white/[0.04] flex-shrink-0 relative z-10">
          <motion.div className="h-full rounded-r-full"
            style={{ background: 'linear-gradient(90deg, #a855f7, #6366f1)', boxShadow: '0 0 8px rgba(168,85,247,0.4)' }}
            initial={false} animate={{ width: `${progress}%` }} transition={{ ...SPRING.soft }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 relative z-10">
          {step > 0 && step < 7 ? (
            <button onClick={goBack} className="text-white/25 hover:text-white/60 transition-colors p-2 -ml-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : <div className="w-9" />}
          {step < 6 && (
            <button onClick={skipAll} className="text-white/20 hover:text-white/50 text-xs font-medium tracking-wide transition-colors px-2 py-1">
              Saltar
            </button>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step} custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.35, ease: EASE.out }}
              className="absolute inset-0 overflow-y-auto">
              <div className="max-w-md mx-auto px-5 pb-8 pt-2 min-h-full flex flex-col">
                <StepComponent onNext={goNext} onBack={goBack} onSkip={skipAll} onGoToStep={goToStep}
                  tenant={MOCK_TENANT} user={MOCK_USER} preview />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BeautyOnboardingProvider>
  );
}
