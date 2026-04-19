import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Scissors, Calendar, Globe, MessageCircle, Camera, UserPlus, CreditCard, Award, ArrowRight, ChevronRight } from 'lucide-react';
import { EASE } from '@/lib/motion';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';

const NEXT_STEPS = [
  { label: 'Fotos de tu trabajo', Icon: Camera, gradient: ['#fb923c', '#f97316'] },
  { label: 'Invitar a tu equipo', Icon: UserPlus, gradient: ['#38bdf8', '#0ea5e9'] },
  { label: 'Señas y depósitos', Icon: CreditCard, gradient: ['#4ade80', '#22c55e'] },
  { label: 'Programa de lealtad', Icon: Award, gradient: ['#f472b6', '#ec4899'] },
];

export default function CelebrationStep({ onNext, preview = false }) {
  const { state } = useBeautyOnboarding();
  const { updateTenantContext } = useAuth();
  const navigate = useNavigate();
  const didComplete = useRef(false);

  const selectedServices = state.services.filter(s => s.isSelected);
  const enabledDays = [state.schedule.weekdays.enabled && 'Lun-Vie', state.schedule.saturday.enabled && 'Sáb', state.schedule.sunday.enabled && 'Dom'].filter(Boolean);

  useEffect(() => {
    if (didComplete.current || preview) return;
    didComplete.current = true;
    (async () => {
      try { await fetchApi('/tenant/onboarding-progress', { method: 'PATCH', body: JSON.stringify({ completed: true }) }); } catch {}
      updateTenantContext({ onboardingCompleted: true });
    })();
  }, [preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = [
    { Icon: Users, label: 'profesionales', value: state.professionals.length, gradient: ['#c084fc', '#a855f7'] },
    { Icon: Scissors, label: 'servicios', value: selectedServices.length, gradient: ['#fb923c', '#f97316'] },
    { Icon: Calendar, label: enabledDays.join(', '), value: null, gradient: ['#38bdf8', '#0ea5e9'] },
    { Icon: Globe, label: 'Página activa', value: null, gradient: ['#4ade80', '#22c55e'] },
    state.whatsappNumber && { Icon: MessageCircle, label: 'WhatsApp', value: null, gradient: ['#f472b6', '#ec4899'] },
  ].filter(Boolean);

  return (
    <>
      <div className="flex-1 pt-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-10">
          Todo listo
        </motion.h1>

        {/* Summary — horizontal pills */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2.5 mb-12">
          {summary.map((item, i) => {
            const Icon = item.Icon;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 300, damping: 22 }}
                className="flex items-center gap-2 rounded-full px-4 py-2.5"
                style={{ background: `linear-gradient(135deg, ${item.gradient[0]}10, ${item.gradient[1]}06)` }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${item.gradient[0]}25, ${item.gradient[1]}15)` }}>
                  <Icon size={12} strokeWidth={2} style={{ color: item.gradient[0] }} />
                </div>
                <span className="text-[13px] text-white/60">
                  {item.value != null && (
                    <AnimatedNumber value={item.value} format={n => Math.round(n).toString()} duration={0.6} className="font-bold text-white/90" />
                  )}
                  {item.value != null ? ' ' : ''}{item.label}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Next steps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
          <p className="text-center text-white/20 text-[12px] font-medium tracking-[0.2em] uppercase mb-4">Próximos pasos</p>
          <div className="space-y-2.5">
            {NEXT_STEPS.map((step, i) => {
              const Icon = step.Icon;
              return (
                <button key={i} onClick={() => navigate('/settings')}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${step.gradient[0]}12, ${step.gradient[1]}08)` }}>
                    <Icon size={14} strokeWidth={1.5} style={{ color: `${step.gradient[0]}80` }} />
                  </div>
                  <span className="text-white/35 text-[14px] flex-1 group-hover:text-white/55 transition-colors">{step.label}</span>
                  <ChevronRight size={14} strokeWidth={1.5} className="text-white/10 group-hover:text-white/20 transition-colors" />
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.5 }} className="pt-8 pb-safe">
        <button onClick={() => navigate('/dashboard', { replace: true })}
          className="w-full py-4 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 4px 24px -4px rgba(168,85,247,0.35)' }}>
          Ir a mi dashboard <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </motion.div>
    </>
  );
}
