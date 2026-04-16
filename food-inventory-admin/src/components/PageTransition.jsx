import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition — wraps route content with a direction-aware fade+slide on navigation.
 *
 * Uses CSS transitions (no framer-motion) to keep the main bundle lean.
 * Direction detection: compares route depth to determine forward (slide up) vs back (slide down).
 *
 *   <PageTransition>
 *     <Routes>...</Routes>
 *   </PageTransition>
 */

const DURATION = 250; // ms — matches DUR.base from motion.js
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // matches EASE.out from motion.js

export default function PageTransition({ children }) {
  const location = useLocation();
  const [phase, setPhase] = useState('visible'); // 'visible' | 'exiting' | 'entering'
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const prevPath = useRef(location.pathname);
  const timerRef = useRef(null);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const currentBase = location.pathname.split('/').slice(0, 3).join('/');
    const prevBase = prevPath.current.split('/').slice(0, 3).join('/');

    if (currentBase !== prevBase) {
      // Determine direction
      const currentDepth = location.pathname.split('/').filter(Boolean).length;
      const prevDepth = prevPath.current.split('/').filter(Boolean).length;
      setDirection(currentDepth >= prevDepth ? 1 : -1);

      if (reducedMotion.current) {
        // Skip animation
        prevPath.current = location.pathname;
        return;
      }

      // Phase 1: exit (fade out + slight slide)
      setPhase('exiting');

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Phase 2: instant reset to entering position, then animate in
        setPhase('entering');
        prevPath.current = location.pathname;

        // A microtask later, become visible
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase('visible');
          });
        });
      }, DURATION * 0.4); // Exit is faster (40% of duration)
    } else {
      prevPath.current = location.pathname;
    }

    return () => clearTimeout(timerRef.current);
  }, [location.pathname]);

  const getStyles = () => {
    switch (phase) {
      case 'exiting':
        return {
          opacity: 0,
          transform: `translateY(${direction > 0 ? '-4px' : '4px'})`,
          transition: `opacity ${DURATION * 0.4}ms ${EASE}, transform ${DURATION * 0.4}ms ${EASE}`,
          willChange: 'opacity, transform',
        };
      case 'entering':
        // Instant jump to starting position (no transition)
        return {
          opacity: 0,
          transform: `translateY(${direction > 0 ? '12px' : '-8px'})`,
          transition: 'none',
          willChange: 'opacity, transform',
        };
      case 'visible':
      default:
        return {
          opacity: 1,
          transform: 'translateY(0)',
          transition: `opacity ${DURATION}ms ${EASE}, transform ${DURATION}ms ${EASE}`,
          willChange: 'auto',
        };
    }
  };

  return <div style={getStyles()}>{children}</div>;
}
