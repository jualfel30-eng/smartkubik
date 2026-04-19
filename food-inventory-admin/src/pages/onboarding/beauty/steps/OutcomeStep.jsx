import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';
import { PAIN_POINTS } from '../data/painPoints';

export default function OutcomeStep({ onNext }) {
  const { state } = useBeautyOnboarding();
  const { painPoints } = state;

  const selectedPains = useMemo(
    () => PAIN_POINTS.filter((p) => painPoints.includes(p.key)),
    [painPoints],
  );

  const totalROI = useMemo(
    () => selectedPains.reduce((sum, p) => sum + p.roiAmount, 0),
    [selectedPains],
  );

  return (
    <>
      <div className="flex-1 pt-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-10"
        >
          Tu plan{'\n'}personalizado
        </motion.h1>

        <motion.div className="space-y-5 mb-12">
          {selectedPains.map((pain, i) => (
            <motion.div
              key={pain.key}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: EASE.out }}
              className="flex items-start gap-4"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))',
                }}
              >
                <Check size={13} strokeWidth={2.5} className="text-emerald-400" />
              </div>
              <p className="text-[16px] text-white/70 leading-relaxed">
                {pain.outcome}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ROI — big centered number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: EASE.out }}
          className="text-center rounded-[28px] py-8 px-6"
          style={{
            background: 'linear-gradient(160deg, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.04) 100%)',
          }}
        >
          <p className="text-white/30 text-[13px] font-medium tracking-wider uppercase mb-4">
            Estás perdiendo
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-white/25 text-2xl">~$</span>
            <AnimatedNumber
              value={totalROI}
              format={(n) => Math.round(n).toLocaleString()}
              duration={1.2}
              className="text-white text-5xl font-extrabold tracking-tight"
            />
          </div>
          <p className="text-white/25 text-[14px] mt-2">al mes</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: EASE.out }}
        className="pt-8 pb-safe"
      >
        <button
          onClick={onNext}
          className="w-full py-4 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            boxShadow: '0 4px 24px -4px rgba(168,85,247,0.35)',
          }}
        >
          Configurar mi salón
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </motion.div>
    </>
  );
}
