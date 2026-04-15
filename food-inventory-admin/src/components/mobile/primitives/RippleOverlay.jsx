import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

let nextId = 0;

/**
 * Ripple primitive — wraps any clickable surface and emits a radial pulse
 * at the tap origin. Drop-in usage:
 *
 *   const ripple = useRipple();
 *   <button onPointerDown={ripple.trigger} className="relative overflow-hidden">
 *     {children}
 *     {ripple.element}
 *   </button>
 *
 * Honors prefers-reduced-motion (no-op).
 */
export function useRipple({ color = 'rgba(255,255,255,0.45)', duration = 0.5 } = {}) {
  const [ripples, setRipples] = useState([]);

  const trigger = useCallback((event) => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const target = event.currentTarget;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left;
    const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    const id = ++nextId;
    setRipples((prev) => [...prev, { id, x, y, size }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, duration * 1000 + 50);
  }, [duration]);

  const element = (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0.5, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x - r.size / 2,
              top: r.y - r.size / 2,
              width: r.size,
              height: r.size,
              borderRadius: '9999px',
              background: color,
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );

  return { trigger, element };
}

export default useRipple;
