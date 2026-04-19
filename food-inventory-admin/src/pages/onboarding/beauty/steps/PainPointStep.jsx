import { motion } from 'framer-motion';
import {
  MessageCircle, UserX, Calculator, TrendingDown, UserMinus, PackageX,
} from 'lucide-react';
import { SPRING, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';

const PAINS = [
  { key: 'whatsapp_citas', Icon: MessageCircle, label: 'Citas por WhatsApp\na las 11pm', gradient: ['#c084fc', '#a855f7'] },
  { key: 'no_shows', Icon: UserX, label: 'Clientes que no\nllegan (no-show)', gradient: ['#fb923c', '#f97316'] },
  { key: 'comisiones', Icon: Calculator, label: 'Calcular comisiones\na mano', gradient: ['#38bdf8', '#0ea5e9'] },
  { key: 'ingresos', Icon: TrendingDown, label: 'No sé cuánto gané\nrealmente hoy', gradient: ['#4ade80', '#22c55e'] },
  { key: 'clientes_desaparecen', Icon: UserMinus, label: 'Clientes que\ndesaparecen', gradient: ['#f472b6', '#ec4899'] },
  { key: 'producto_desaparece', Icon: PackageX, label: 'Producto que\ndesaparece', gradient: ['#facc15', '#eab308'] },
];

export default function PainPointStep({ onNext }) {
  const { state, dispatch } = useBeautyOnboarding();
  const { painPoints } = state;

  const toggle = (key) => {
    haptics.select();
    dispatch({ type: 'TOGGLE_PAIN_POINT', payload: key });
  };

  return (
    <>
      <div className="flex-1 pt-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3"
        >
          ¿Qué te quita{'\n'}el sueño?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center text-white/35 text-[15px] mb-10"
        >
          Selecciona todos los que apliquen
        </motion.p>

        {/* 2-column grid */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
        >
          {PAINS.map((p) => {
            const selected = painPoints.includes(p.key);
            return (
              <motion.button
                key={p.key}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.95 },
                  show: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ duration: 0.4, ease: EASE.out }}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggle(p.key)}
                className="relative flex flex-col items-center text-center rounded-3xl px-3 pt-5 pb-4 transition-all duration-300"
                style={{
                  background: selected
                    ? `linear-gradient(135deg, ${p.gradient[0]}18, ${p.gradient[1]}10)`
                    : 'rgba(255,255,255,0.03)',
                  boxShadow: selected
                    ? `0 0 0 1.5px ${p.gradient[0]}60, 0 4px 20px -6px ${p.gradient[0]}25`
                    : 'none',
                }}
              >
                {/* Icon orb */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300"
                  style={{
                    background: selected
                      ? `linear-gradient(135deg, ${p.gradient[0]}30, ${p.gradient[1]}20)`
                      : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <p.Icon
                    size={22}
                    strokeWidth={1.5}
                    className="transition-colors duration-300"
                    style={{ color: selected ? p.gradient[0] : 'rgba(255,255,255,0.3)' }}
                  />
                </div>

                <span className={`text-[13px] leading-snug whitespace-pre-line transition-colors duration-300 ${
                  selected ? 'text-white/90' : 'text-white/40'
                }`}>
                  {p.label}
                </span>

                {/* Check dot */}
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: p.gradient[0] }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5, ease: EASE.out }}
        className="pt-8 pb-safe"
      >
        <button
          onClick={onNext}
          disabled={painPoints.length === 0}
          className="w-full py-4 rounded-full text-[15px] font-bold transition-all duration-400"
          style={{
            background: painPoints.length > 0
              ? 'linear-gradient(135deg, #a855f7, #6366f1)'
              : 'rgba(255,255,255,0.05)',
            color: painPoints.length > 0 ? 'white' : 'rgba(255,255,255,0.15)',
            boxShadow: painPoints.length > 0
              ? '0 4px 24px -4px rgba(168,85,247,0.35)'
              : 'none',
          }}
        >
          Continuar
        </button>
      </motion.div>
    </>
  );
}
