/**
 * Motion language — SmartKubik mobile (beauty-first)
 * Shared easings, durations, springs and variants for framer-motion.
 * Mirrors CSS vars in styles/mobile-tokens.css so JS and CSS stay coherent.
 */

export const EASE = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
};

export const DUR = {
  fast: 0.15,
  base: 0.25,
  slow: 0.35,
  hero: 0.6,
};

export const SPRING = {
  snappy: { type: 'spring', stiffness: 500, damping: 40, mass: 0.9 },
  soft: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  drawer: { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 },
  bouncy: { type: 'spring', stiffness: 420, damping: 22, mass: 0.8 },
};

export const STAGGER = (delay = 0.04, delayChildren = 0.02) => ({
  animate: {
    transition: {
      staggerChildren: delay,
      delayChildren,
    },
  },
});

export const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DUR.fast, ease: EASE.out },
  },
};

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE.out },
  },
  exit: { opacity: 0, y: 4, transition: { duration: DUR.fast, ease: EASE.out } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: DUR.base, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: DUR.fast, ease: EASE.out },
  },
};

export const tapScale = { scale: 0.96 };
export const tapScaleStrong = { scale: 0.92 };

export const pulseGlow = {
  animate: {
    opacity: [0.4, 0.85, 0.4],
    scale: [1, 1.04, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};
