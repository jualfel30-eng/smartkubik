import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';

const formatRelative = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.round(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs} h`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleString('es-VE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    year: sameYear ? undefined : 'numeric',
  });
};

/**
 * Tiny "last visit" preview rendered above the form.
 * Stats may be null when the dashboard has not yet cached anything;
 * in that case we still render the relative timestamp.
 */
export default function WelcomeBackStats({ lastLoginAt, stats }) {
  const relative = formatRelative(lastLoginAt);
  if (!relative && (!stats || Object.keys(stats || {}).length === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out, delay: 0.5 }}
      className="rounded-lg border border-gray-200/70 bg-white/60 p-3 text-xs text-gray-600 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-gray-300"
    >
      {relative && (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 opacity-70" />
          <span>Última vez: {relative}</span>
        </div>
      )}
      {stats?.salesText && (
        <div className="mt-1 flex items-center gap-2">
          <span className="opacity-70">💰</span>
          <span>{stats.salesText}</span>
        </div>
      )}
      {stats?.servicesText && (
        <div className="mt-1 flex items-center gap-2">
          <span className="opacity-70">✂️</span>
          <span>{stats.servicesText}</span>
        </div>
      )}
    </motion.div>
  );
}
