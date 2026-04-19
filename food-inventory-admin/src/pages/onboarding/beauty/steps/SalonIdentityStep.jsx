import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowRight } from 'lucide-react';
import { SPRING, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';

export default function SalonIdentityStep({ onNext }) {
  const { state, dispatch } = useBeautyOnboarding();
  const fileInputRef = useRef(null);

  const update = (payload) => dispatch({ type: 'SET_SALON_IDENTITY', payload });

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update({ logoFile: file, logoPreview: ev.target.result });
      haptics.success();
    };
    reader.readAsDataURL(file);
  };

  const canContinue = state.salonName.trim().length > 0;

  const inputClass = `w-full py-4 px-5 rounded-2xl text-[16px] text-white placeholder:text-white/20
    bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] transition-colors duration-300`;

  return (
    <>
      <div className="flex-1 pt-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-10"
        >
          Cuéntanos de{'\n'}tu negocio
        </motion.h1>

        <div className="space-y-5">
          {/* Logo — large centered */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex flex-col items-center mb-2"
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-[22px] flex items-center justify-center overflow-hidden transition-all duration-300 mb-2"
              style={{
                background: state.logoPreview
                  ? 'transparent'
                  : 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.06))',
              }}
            >
              {state.logoPreview ? (
                <motion.img
                  src={state.logoPreview}
                  alt=""
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera size={24} strokeWidth={1.5} className="text-white/20" />
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[13px] text-white/30 hover:text-white/50 transition-colors"
            >
              {state.logoPreview ? 'Cambiar logo' : 'Agregar logo'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
          </motion.div>

          {/* Name */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <input
              type="text"
              value={state.salonName}
              onChange={(e) => update({ salonName: e.target.value })}
              placeholder="Nombre de tu negocio"
              className={inputClass}
              autoFocus
            />
          </motion.div>

          {/* Currency */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="flex gap-3"
          >
            {[
              { value: 'USD', label: 'Dólar (USD)' },
              { value: 'VES', label: 'Bolívar (VES)' },
            ].map((opt) => {
              const active = state.currency === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { haptics.select(); update({ currency: opt.value }); }}
                  className="flex-1 py-3.5 rounded-2xl text-[14px] font-medium transition-all duration-300"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))'
                      : 'rgba(255,255,255,0.03)',
                    color: active ? 'rgba(196,181,253,0.9)' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </motion.div>

          {/* WhatsApp */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <span className="text-white/20 text-[14px] py-4 px-4 rounded-2xl bg-white/[0.03] flex-shrink-0">
              +58
            </span>
            <input
              type="tel"
              value={state.whatsappNumber}
              onChange={(e) => update({ whatsappNumber: e.target.value.replace(/\D/g, '') })}
              placeholder="WhatsApp del negocio"
              className={inputClass}
              inputMode="tel"
            />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE.out }}
        className="pt-8 pb-safe"
      >
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-400"
          style={{
            background: canContinue
              ? 'linear-gradient(135deg, #a855f7, #6366f1)'
              : 'rgba(255,255,255,0.05)',
            color: canContinue ? 'white' : 'rgba(255,255,255,0.15)',
            boxShadow: canContinue ? '0 4px 24px -4px rgba(168,85,247,0.35)' : 'none',
          }}
        >
          Continuar
          {canContinue && <ArrowRight size={16} strokeWidth={2.5} />}
        </button>
      </motion.div>
    </>
  );
}
