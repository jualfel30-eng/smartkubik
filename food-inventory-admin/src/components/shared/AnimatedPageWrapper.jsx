import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * AnimatedPageWrapper — Drop-in replacement for module root divs.
 * Adds fadeUp entry animation. Zero risk.
 *
 * Before: <div className="space-y-6 p-6">
 * After:  <AnimatedPageWrapper className="space-y-6 p-6">
 */
export default function AnimatedPageWrapper({ children, className, ...props }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
