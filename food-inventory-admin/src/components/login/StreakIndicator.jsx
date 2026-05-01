import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export default function StreakIndicator({ days }) {
  if (!days || days < 7) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: [0.85, 1, 0.85],
        scale: [1, 1.03, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50/70 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      <Flame className="h-3.5 w-3.5" />
      <span>{days} días consecutivos</span>
    </motion.div>
  );
}
