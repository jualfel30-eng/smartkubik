import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';

const BLOCKS = [
  { key: 'weekdays', label: 'Lunes — Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function ScheduleStep({ onNext }) {
  const { state, dispatch } = useBeautyOnboarding();
  const { schedule } = state;

  const updateBlock = (key, updates) => dispatch({ type: 'SET_SCHEDULE', payload: { [key]: { ...schedule[key], ...updates } } });
  const toggleBlock = (key) => { haptics.select(); updateBlock(key, { enabled: !schedule[key].enabled }); };

  return (
    <>
      <div className="flex-1 pt-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3">
          Tu horario
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center text-white/30 text-[15px] mb-10">
          Ajústalo después en Configuración
        </motion.p>

        <div className="space-y-4">
          {BLOCKS.map((block, i) => {
            const data = schedule[block.key];
            return (
              <motion.div key={block.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4, ease: EASE.out }}
                className="rounded-[20px] p-5 transition-all duration-300"
                style={{
                  background: data.enabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[15px] font-semibold transition-colors duration-300 ${data.enabled ? 'text-white/90' : 'text-white/25'}`}>
                    {block.label}
                  </span>

                  <button onClick={() => toggleBlock(block.key)}
                    className="relative w-12 h-7 rounded-full transition-all duration-300"
                    style={{
                      background: data.enabled
                        ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: data.enabled ? '0 2px 12px rgba(168,85,247,0.25)' : 'none',
                    }}>
                    <motion.div
                      className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white"
                      animate={{ left: data.enabled ? 24 : 3 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                    />
                  </button>
                </div>

                {data.enabled ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
                    className="flex items-center gap-3">
                    <input type="time" value={data.start} onChange={(e) => updateBlock(block.key, { start: e.target.value })}
                      className="flex-1 py-3 px-3.5 rounded-xl text-sm text-white bg-white/[0.04] focus:outline-none [color-scheme:dark]" />
                    <span className="text-white/10">—</span>
                    <input type="time" value={data.end} onChange={(e) => updateBlock(block.key, { end: e.target.value })}
                      className="flex-1 py-3 px-3.5 rounded-xl text-sm text-white bg-white/[0.04] focus:outline-none [color-scheme:dark]" />
                  </motion.div>
                ) : (
                  <p className="text-white/15 text-sm">Cerrado</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="pt-8 pb-safe">
        <button onClick={onNext}
          className="w-full py-4 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 4px 24px -4px rgba(168,85,247,0.35)' }}>
          Continuar <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </motion.div>
    </>
  );
}
