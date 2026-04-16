import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Celebration — Lightweight confetti-like burst animation.
 * No external libraries. Uses framer-motion particles.
 *
 * Usage:
 *   const [celebrate, setCelebrate] = useState(false);
 *   <Celebration active={celebrate} onComplete={() => setCelebrate(false)} />
 *
 * Trigger from anywhere:
 *   import { triggerCelebration } from '@/lib/celebration';
 *   triggerCelebration(); // fires a custom event
 */

const PARTICLE_COUNT = 24;
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function Particle({ color, delay }) {
  const angle = randomBetween(0, 360);
  const distance = randomBetween(60, 180);
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance - randomBetween(40, 120); // bias upward
  const rotation = randomBetween(-180, 180);
  const scale = randomBetween(0.4, 1);
  const size = randomBetween(6, 10);

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        x,
        y: [0, y, y + 60],
        scale: [0, scale, scale * 0.5],
        rotate: rotation,
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        backgroundColor: color,
      }}
    />
  );
}

export default function Celebration({ active, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) return;

    const newParticles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: randomBetween(0, 0.15),
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
          aria-hidden="true"
        >
          {particles.map((p) => (
            <Particle key={p.id} color={p.color} delay={p.delay} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Re-export from hook file for convenience
export { triggerCelebration, useCelebration } from '@/hooks/use-celebration';
