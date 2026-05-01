import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';

const ctaForTime = (date = new Date()) => {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'Empezar el día';
  if (h >= 11 && h < 17) return 'Ir a mi día';
  if (h >= 17 && h < 22) return 'Cerrar el día';
  return 'Revisar el día';
};

/**
 * Multi-state submit button.
 *
 * status:
 *   idle     → enabled, hover reveals arrow
 *   loading  → spinner + "Entrando..."
 *   success  → green flash + check icon
 *   error    → shake (handled by parent via key change)
 *
 * tenantName, when provided, replaces the generic CTA with
 * "Entrar a {tenantName}" as a personalized invitation.
 */
export default function LoginButton({
  status = 'idle',
  tenantName,
  preview,
  errorKey = 0,
  type = 'submit',
  disabled = false,
  onClick,
}) {
  const baseLabel = tenantName
    ? `Entrar a ${tenantName}`
    : ctaForTime();
  const label = preview ? `${baseLabel} (${preview})` : baseLabel;

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <motion.button
      key={`login-btn-${errorKey}`}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading || isSuccess}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      animate={
        status === 'error'
          ? { x: [0, -8, 8, -4, 4, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.4, ease: EASE.inOut }}
      className={`group relative w-full overflow-hidden rounded-md px-4 py-3 font-semibold text-white shadow-md transition-shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-90 ${
        isSuccess
          ? 'bg-emerald-500'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isSuccess ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            className="flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" /> ¡Listo!
          </motion.span>
        ) : isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            className="flex items-center justify-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            className="flex items-center justify-center gap-2"
          >
            <span>{label}</span>
            <motion.span
              initial={{ x: -4, opacity: 0 }}
              animate={{ x: 0, opacity: 0 }}
              whileHover={{ x: 4, opacity: 1 }}
              className="inline-flex group-hover:opacity-100 group-hover:translate-x-1 transition-all"
            >
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export { ctaForTime };
