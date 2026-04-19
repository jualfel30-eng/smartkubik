import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share2, ArrowRight } from 'lucide-react';
import { SPRING, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { triggerCelebration } from '@/hooks/use-celebration';
import Celebration, { useCelebration } from '@/components/Celebration';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';

export default function RevealStep({ onNext, tenant }) {
  const { state } = useBeautyOnboarding();
  const [copied, setCopied] = useState(false);
  const { celebrating, stop } = useCelebration();

  const bookingUrl = state.bookingUrl || `${(tenant?.code || '').toLowerCase()}.smartkubik.com`;
  const selectedServices = state.services.filter(s => s.isSelected);
  const sym = state.currency === 'VES' ? 'Bs.' : '$';

  useEffect(() => {
    haptics.success();
    const t = setTimeout(() => triggerCelebration(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(`https://${bookingUrl}`); }
    catch { const el = document.createElement('textarea'); el.value = `https://${bookingUrl}`; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true); haptics.success();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    haptics.tap();
    const text = encodeURIComponent(`Reserva tu cita conmigo:\nhttps://${bookingUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <>
      <Celebration active={celebrating} onComplete={stop} />

      <div className="flex-1 flex flex-col items-center pt-8">
        {/* Ambient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)', filter: 'blur(50px)' }} />

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3 relative z-10">
          Tu página{'\n'}está lista
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="text-white/30 text-[15px] text-center mb-8 relative z-10">
          Tus clientes ya pueden reservar 24/7
        </motion.p>

        {/* Preview card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: EASE.out }}
          className="w-full rounded-[24px] overflow-hidden mb-8 relative z-10"
          style={{
            background: 'rgba(255,255,255,0.04)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 60px -15px rgba(168,85,247,0.12)',
          }}>
          <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            {state.logoPreview ? (
              <img src={state.logoPreview} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))' }}>
                <span className="text-purple-300 text-sm font-bold">{(state.salonName || 'S').charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <p className="text-white text-[14px] font-semibold">{state.salonName || 'Tu Salón'}</p>
              <p className="text-white/20 text-[11px]">smartkubik.com</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2.5">
            {selectedServices.slice(0, 3).map(svc => (
              <div key={svc.id} className="flex items-center justify-between">
                <span className="text-white/45 text-sm">{svc.name}</span>
                <span className="text-white/25 text-sm tabular-nums">{sym}{svc.price}</span>
              </div>
            ))}
          </div>
          <div className="px-5 pb-4">
            <div className="text-center py-3 rounded-xl text-[14px] font-semibold"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))', color: 'rgb(196,181,253)' }}>
              Reservar cita
            </div>
          </div>
        </motion.div>

        {/* URL */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="text-center font-semibold tracking-tight mb-8 relative z-10"
          style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {bookingUrl}
        </motion.p>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="w-full flex gap-3 relative z-10">
          <button onClick={handleCopy}
            className="flex-1 py-3.5 rounded-2xl text-[13px] font-medium flex items-center justify-center gap-2 transition-all duration-300"
            style={{
              background: copied ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
              color: copied ? 'rgb(74,222,128)' : 'rgba(255,255,255,0.5)',
            }}>
            <Copy size={14} strokeWidth={1.5} />
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button onClick={handleShare}
            className="flex-1 py-3.5 rounded-2xl text-[13px] font-medium flex items-center justify-center gap-2"
            style={{ background: 'rgba(37,211,102,0.06)', color: 'rgb(74,222,128)' }}>
            <Share2 size={14} strokeWidth={1.5} />
            WhatsApp
          </button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }} className="pt-8 pb-safe">
        <button onClick={onNext}
          className="w-full py-4 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 4px 24px -4px rgba(168,85,247,0.35)' }}>
          Continuar <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </motion.div>
    </>
  );
}
