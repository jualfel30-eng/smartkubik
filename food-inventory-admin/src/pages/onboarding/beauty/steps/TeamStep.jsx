import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, User, ArrowRight } from 'lucide-react';
import { SPRING, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';
import { PROFESSIONAL_COLORS } from '../data/beautyServicesSuggestions';

export default function TeamStep({ onNext, user }) {
  const { state, dispatch } = useBeautyOnboarding();
  const { professionals } = state;

  const [name, setName] = useState('');
  const [color, setColor] = useState(PROFESSIONAL_COLORS[professionals.length % PROFESSIONAL_COLORS.length]);

  const addProfessional = () => {
    if (!name.trim()) return;
    haptics.success();
    dispatch({ type: 'ADD_PROFESSIONAL', payload: { name: name.trim(), color, isOwner: false } });
    setName('');
    setColor(PROFESSIONAL_COLORS[(professionals.length + 1) % PROFESSIONAL_COLORS.length]);
  };

  const removeProfessional = (i) => { haptics.tap(); dispatch({ type: 'REMOVE_PROFESSIONAL', payload: i }); };

  const handleSolo = () => {
    haptics.success();
    const ownerName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Yo';
    dispatch({ type: 'SET_SOLO_PROFESSIONAL', payload: { name: ownerName, color: PROFESSIONAL_COLORS[0], isOwner: true } });
    onNext();
  };

  const canContinue = professionals.length > 0;

  return (
    <>
      <div className="flex-1 pt-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3"
        >
          Tu equipo
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center text-white/30 text-[15px] mb-10"
        >
          Agrega a quienes trabajan contigo
        </motion.p>

        {/* Added */}
        <AnimatePresence mode="popLayout">
          {professionals.map((pro, i) => (
            <motion.div
              key={`${pro.name}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: EASE.out }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-3 bg-white/[0.04]"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${pro.color}CC, ${pro.color}88)`, boxShadow: `0 4px 12px ${pro.color}30` }}>
                {pro.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-white/80 text-[15px] flex-1">{pro.name}</span>
              {pro.isOwner && <span className="text-[11px] text-purple-300/60 font-medium">Tú</span>}
              <button onClick={() => removeProfessional(i)} className="text-white/15 hover:text-white/40 transition-colors p-1">
                <X size={14} strokeWidth={1.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add form */}
        {professionals.length < 5 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-5 bg-white/[0.03] mb-5">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              onKeyDown={(e) => e.key === 'Enter' && addProfessional()}
              className="w-full py-3.5 px-4 rounded-xl text-[15px] text-white placeholder:text-white/20 bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] transition-colors mb-4" />

            {/* Colors */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {PROFESSIONAL_COLORS.map((c) => {
                const active = color === c;
                return (
                  <button key={c} onClick={() => { haptics.tap(); setColor(c); }}
                    className="w-8 h-8 rounded-full transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${c}CC, ${c}88)`,
                      transform: active ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: active ? `0 0 0 2.5px #0a0e1a, 0 0 0 4px ${c}80, 0 4px 12px ${c}30` : 'none',
                    }}
                  />
                );
              })}
            </div>

            <button onClick={addProfessional} disabled={!name.trim()}
              className="w-full py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-1.5 transition-all duration-300"
              style={{
                background: name.trim() ? 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))' : 'rgba(255,255,255,0.03)',
                color: name.trim() ? 'rgb(196,181,253)' : 'rgba(255,255,255,0.12)',
              }}>
              <Plus size={14} strokeWidth={2} /> Agregar
            </button>
          </motion.div>
        )}

        {/* Solo */}
        {professionals.length === 0 && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            onClick={handleSolo}
            className="w-full rounded-2xl px-4 py-4 text-white/30 text-[15px] text-center bg-white/[0.02] flex items-center justify-center gap-2 hover:bg-white/[0.04] transition-colors">
            <User size={16} strokeWidth={1.5} /> Yo trabajo solo/a
          </motion.button>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5, ease: EASE.out }} className="pt-8 pb-safe">
        <button onClick={onNext} disabled={!canContinue}
          className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-400"
          style={{
            background: canContinue ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255,255,255,0.05)',
            color: canContinue ? 'white' : 'rgba(255,255,255,0.15)',
            boxShadow: canContinue ? '0 4px 24px -4px rgba(168,85,247,0.35)' : 'none',
          }}>
          Continuar
          {canContinue && <ArrowRight size={16} strokeWidth={2.5} />}
        </button>
      </motion.div>
    </>
  );
}
