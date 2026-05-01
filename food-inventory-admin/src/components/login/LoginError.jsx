import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';

/**
 * Maps a raw error message / status to a friendly message + inline action.
 * Keeps the shape API-agnostic: caller passes whatever message came back
 * and we pattern-match on common shapes.
 */
const classify = (raw) => {
  const msg = (raw || '').toString().toLowerCase();
  if (!msg) return null;

  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('sin conexión')) {
    return { kind: 'network', message: 'Sin conexión a internet.', action: 'retry' };
  }
  if (msg.includes('429') || msg.includes('demasiados') || msg.includes('rate')) {
    return { kind: 'rate', message: 'Demasiados intentos. Espera un momento.', action: null };
  }
  if (msg.includes('suspend')) {
    return { kind: 'suspended', message: 'Tu cuenta está suspendida.', action: 'support' };
  }
  if (msg.includes('confirm') || msg.includes('verifica')) {
    return { kind: 'unconfirmed', message: 'Tu cuenta no está confirmada aún.', action: 'resend' };
  }
  if (msg.includes('no encontram') || msg.includes('not found') || msg.includes('no existe') || msg.includes('usuario no')) {
    return { kind: 'notfound', message: 'No encontramos esa cuenta.', action: 'register' };
  }
  if (msg.includes('contraseña') || msg.includes('password') || msg.includes('credencial') || msg.includes('invalid') || msg.includes('incorrect')) {
    return { kind: 'badpwd', message: 'Esa contraseña no es correcta.', action: 'forgot' };
  }
  return { kind: 'generic', message: raw, action: null };
};

export default function LoginError({ message, onRetry }) {
  const item = classify(message);

  return (
    <AnimatePresence mode="wait">
      {item ? (
        <motion.div
          key={item.kind + item.message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: DUR.fast, ease: EASE.out }}
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{item.message}</p>
            {item.action === 'forgot' && (
              <Link
                to="/forgot-password"
                className="mt-1 inline-block text-red-600 underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-100"
              >
                ¿La olvidaste?
              </Link>
            )}
            {item.action === 'register' && (
              <Link
                to="/register"
                className="mt-1 inline-block text-red-600 underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-100"
              >
                Crear cuenta nueva
              </Link>
            )}
            {item.action === 'resend' && (
              <Link
                to="/resend-confirmation"
                className="mt-1 inline-block text-red-600 underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-100"
              >
                Reenviar código
              </Link>
            )}
            {item.action === 'support' && (
              <a
                href="https://wa.me/584140000000"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-red-600 underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-100"
              >
                Contactar soporte
              </a>
            )}
            {item.action === 'retry' && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 inline-block text-red-600 underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-100"
              >
                Reintentar
              </button>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
