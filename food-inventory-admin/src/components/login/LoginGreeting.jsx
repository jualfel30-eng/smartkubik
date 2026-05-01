import { motion } from 'framer-motion';
import { DUR, EASE } from '@/lib/motion';

const greetingFor = (date = new Date()) => {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const subtitleFor = (vertical) => {
  switch ((vertical || '').toLowerCase()) {
    case 'beauty':
    case 'salon':
      return 'Tu salón te está esperando';
    case 'food-service':
    case 'restaurant':
      return 'Tu cocina te está esperando';
    case 'retail':
      return 'Tu tienda te está esperando';
    case 'hotel':
    case 'hospitality':
      return 'Tu hotel te está esperando';
    case 'clinic':
    case 'health':
      return 'Tu consulta te está esperando';
    default:
      return 'Tu negocio te está esperando';
  }
};

export default function LoginGreeting({ firstName, vertical }) {
  const greeting = greetingFor();
  const name = firstName?.trim();
  return (
    <div className="text-center">
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.base, ease: EASE.out, delay: 0.1 }}
        className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight"
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
      >
        {greeting}{name ? `, ${name}` : ''}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.base, ease: EASE.out, delay: 0.18 }}
        className="mt-2 text-base md:text-lg text-gray-600 dark:text-gray-300"
      >
        {subtitleFor(vertical)}
      </motion.p>
    </div>
  );
}

export { greetingFor, subtitleFor };
