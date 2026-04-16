import { useReducedMotion } from 'framer-motion';

/**
 * Wraps framer-motion's useReducedMotion.
 * Returns helpers to pick variants / transitions that respect user preference.
 *
 *   const rm = useReducedMotionSafe();
 *   <motion.div {...rm.v(listItem)} transition={rm.t({ duration: 0.3 })} />
 */
export function useReducedMotionSafe() {
  const shouldReduce = useReducedMotion();

  const v = (variants) => {
    if (!shouldReduce || !variants) return variants;
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0, staggerChildren: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  };

  const t = (transition) => (shouldReduce ? { duration: 0 } : transition);

  return { shouldReduce, v, t };
}

export default useReducedMotionSafe;
