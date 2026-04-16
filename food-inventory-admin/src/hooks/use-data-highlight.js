import { useRef, useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Flashes a CSS class on an element when its tracked value changes.
 * Useful for table cells or KPI cards that update in real-time.
 *
 * Returns a ref to attach to the element + the active flash class string.
 *
 * @param {*}      value          — The value to watch (any primitive)
 * @param {object} options
 *   flashClass   CSS class(es) to apply during the flash (default: data-highlight-flash)
 *   duration     How long the class stays on (ms, default 600)
 *   skipInitial  Don't flash on first render (default true)
 *
 * Usage:
 *   const { ref, flashing } = useDataHighlight(row.stock);
 *   <td ref={ref} className={cn('...', flashing && 'bg-success/10 transition-colors duration-500')}>
 *
 * Or use the DataHighlight wrapper component in data-highlight.jsx.
 */
export function useDataHighlight(value, {
  duration = 600,
  skipInitial = true,
} = {}) {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(undefined);
  const timerRef = useRef(null);
  const mountedRef = useRef(false);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    // First render — store initial value, skip flash
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = value;
      return;
    }

    // Value didn't change
    if (value === prevRef.current) return;

    prevRef.current = value;

    // Respect prefers-reduced-motion
    if (shouldReduce) return;

    // Clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setFlashing(true);
    timerRef.current = setTimeout(() => {
      setFlashing(false);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, duration, shouldReduce]);

  return { flashing };
}

export default useDataHighlight;
