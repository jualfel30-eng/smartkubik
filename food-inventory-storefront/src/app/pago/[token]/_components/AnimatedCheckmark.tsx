'use client';

import { motion } from 'framer-motion';

interface AnimatedCheckmarkProps {
  /** Outer size in px. The stroke scales proportionally. */
  size?: number;
  /** Optional aria-label for screen readers. */
  label?: string;
}

/**
 * Animated success icon for Layer 3. Three coordinated animations:
 *
 *   1. Outer ring scales in with a spring (0.8 → 1.05 → 1.0), arriving
 *      with that satisfying "settle" — this is where the dopamine lives.
 *   2. Solid disk fades + scales inside the ring.
 *   3. Checkmark path strokes from start to end (`pathLength` 0 → 1) over
 *      600 ms, lagging the ring slightly so the eye reads "container
 *      arrives, mark gets drawn into it" instead of "everything together".
 *
 * Pure SVG + Framer Motion — GPU-accelerated, no canvas, no confetti
 * dependency. Respects `prefers-reduced-motion` via Framer's built-in
 * fallback (animations resolve instantly when the OS asks for it).
 */
export default function AnimatedCheckmark({
  size = 96,
  label = 'Comprobante recibido',
}: AnimatedCheckmarkProps) {
  return (
    <motion.div
      role="img"
      aria-label={label}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: [0.8, 1.05, 1], opacity: 1 }}
      transition={{
        scale: { duration: 0.45, times: [0, 0.65, 1], ease: 'easeOut' },
        opacity: { duration: 0.18 },
      }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        aria-hidden
      >
        {/* Ring */}
        <motion.circle
          cx="32"
          cy="32"
          r="30"
          stroke="var(--pp-primary, #10b981)"
          strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        {/* Filled disk */}
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          fill="var(--pp-primary, #10b981)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
          style={{ transformOrigin: '32px 32px' }}
        />
        {/* Checkmark path */}
        <motion.path
          d="M20 33 L29 42 L45 24"
          stroke="var(--pp-primary, #10b981)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}
