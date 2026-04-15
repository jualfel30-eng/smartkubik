import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { DUR, EASE } from '@/lib/motion';

/**
 * Animates numeric value changes with a smooth tween.
 * Use for money totals, counters, KPIs.
 *
 *   <AnimatedNumber value={total} format={(n) => `$${n.toFixed(2)}`} />
 */
export default function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  duration = DUR.slow,
  className,
}) {
  const mv = useMotionValue(Number(value) || 0);
  const display = useTransform(mv, (v) => format(Number.isFinite(v) ? v : 0));

  useEffect(() => {
    const target = Number(value);
    if (!Number.isFinite(target)) return;
    const controls = animate(mv, target, {
      duration,
      ease: EASE.out,
    });
    return () => controls.stop();
  }, [value, duration, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}
