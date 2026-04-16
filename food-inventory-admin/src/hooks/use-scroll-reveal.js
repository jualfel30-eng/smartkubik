import { useRef, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Triggers a boolean when an element scrolls into the viewport.
 * Returns a ref to attach to the target element + inView state.
 *
 * Options:
 *   threshold  — 0–1, how much of the element must be visible (default 0.12)
 *   once       — only fire once, never reset (default true)
 *   rootMargin — IntersectionObserver rootMargin (default '-40px 0px')
 *
 * Usage:
 *   const { ref, inView } = useScrollReveal();
 *   <motion.div ref={ref} animate={inView ? 'animate' : 'initial'} variants={fadeUp} />
 */
export function useScrollReveal({
  threshold = 0.12,
  once = true,
  rootMargin = '-40px 0px',
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    // Respect reduced-motion: skip animation, treat as always visible
    if (shouldReduce) {
      setInView(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin, shouldReduce]);

  return { ref, inView };
}

export default useScrollReveal;
