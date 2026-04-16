import { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * PageTransition — direction-aware fade+slide on navigation,
 * with edge-swipe gesture support for mobile navigation.
 *
 * Three transition modes (pure CSS — no framer-motion for main bundle lean):
 *   • Drill-down  (path gets deeper)   → slide up   (y: 12px → 0)
 *   • Go back     (path gets shallower) → slide down (y: -8px → 0)
 *   • Sibling     (same depth, diff)   → slide left/right based on sidebar order
 *
 * Swipe gestures (mobile only):
 *   • Edge-swipe from left  → go to previous sibling route
 *   • Edge-swipe from right → go to next sibling route
 *
 *   <PageTransition>
 *     <Routes>...</Routes>
 *   </PageTransition>
 */

const DURATION = 250;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Top-level route segments in sidebar order — used for left/right sibling detection
// and for swipe navigation target resolution.
const ROUTE_ORDER = [
  'dashboard',
  'subsidiaries',
  'orders',
  'inventory-management',
  'fulfillment',
  'driver',
  'whatsapp',
  'purchases',
  'production',
  'storefront',
  'restaurant',
  'hospitality',
  'resources',
  'services',
  'appointments',
  'crm',
  'waste-control',
  'business-locations',
  'cash-register',
  'accounting',
  'billing',
  'bank-accounts',
  'fixed-assets',
  'investments',
  'accounts-payable',
  'receivables',
  'payroll',
  'organizations',
  'settings',
];

// Swipe thresholds
const EDGE_ZONE = 28;          // px from screen edge to initiate edge-swipe
const SWIPE_THRESHOLD = 70;    // minimum horizontal px to count as swipe
const MAX_VERT_DRIFT = 50;     // max vertical drift before cancelling
const FULL_SWIPE_RATIO = 2.5;  // horiz/vert ratio required for non-edge swipe

function getBaseSegment(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 't' && parts.length >= 3) return parts[2];
  return parts[parts.length - 1] || '';
}

function getPrefix(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 't' && parts.length >= 2) return `/t/${parts[1]}`;
  return '';
}

export default function PageTransition({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [phase, setPhase] = useState('visible');
  const [axis, setAxis] = useState('y');
  const [direction, setDirection] = useState(1);
  const prevPath = useRef(location.pathname);
  const timerRef = useRef(null);

  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  // ─── Page transition on route change ───────────────────────────────────────
  useEffect(() => {
    const current = location.pathname;
    const prev = prevPath.current;
    if (current === prev) return;

    const currentDepth = current.split('/').filter(Boolean).length;
    const prevDepth = prev.split('/').filter(Boolean).length;
    const currentBase = getBaseSegment(current);
    const prevBase = getBaseSegment(prev);

    let newAxis = 'y';
    let newDir = 1;

    if (currentDepth !== prevDepth) {
      newAxis = 'y';
      newDir = currentDepth > prevDepth ? 1 : -1;
    } else if (currentBase !== prevBase) {
      const ci = ROUTE_ORDER.indexOf(currentBase);
      const pi = ROUTE_ORDER.indexOf(prevBase);
      newAxis = 'x';
      newDir = (ci === -1 || pi === -1 || ci > pi) ? 1 : -1;
    } else {
      newAxis = 'y';
      newDir = 1;
    }

    setAxis(newAxis);
    setDirection(newDir);

    if (reducedMotion.current) {
      prevPath.current = current;
      return;
    }

    setPhase('exiting');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPhase('entering');
      prevPath.current = current;
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('visible')));
    }, DURATION * 0.4);

    return () => clearTimeout(timerRef.current);
  }, [location.pathname]);

  // ─── Mobile edge-swipe navigation ──────────────────────────────────────────
  const touchStart = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (reducedMotion.current) return;
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      screenEdge: touch.clientX < EDGE_ZONE
        ? 'left'
        : touch.clientX > window.innerWidth - EDGE_ZONE
          ? 'right'
          : null,
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current || reducedMotion.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const { screenEdge } = touchStart.current;
    touchStart.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDy > MAX_VERT_DRIFT) return;
    if (absDx < SWIPE_THRESHOLD) return;
    if (!screenEdge && absDx / Math.max(absDy, 1) < FULL_SWIPE_RATIO) return;

    // Swipe RIGHT (dx > 0) = go back (prev sibling)
    const goingBack = dx > 0;
    const currentBase = getBaseSegment(location.pathname);
    const prefix = getPrefix(location.pathname);
    const idx = ROUTE_ORDER.indexOf(currentBase);
    if (idx === -1) return;

    const targetIdx = goingBack ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= ROUTE_ORDER.length) return;

    navigate(`${prefix}/${ROUTE_ORDER[targetIdx]}`);
  }, [location.pathname, navigate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // ─── CSS transition styles ──────────────────────────────────────────────────
  const SLIDE_Y_ENTER = 12;
  const SLIDE_Y_BACK  = -8;
  const SLIDE_X       = 20;

  const getStyles = () => {
    switch (phase) {
      case 'exiting': {
        const t = axis === 'x'
          ? `translateX(${direction > 0 ? `-${SLIDE_X * 0.4}px` : `${SLIDE_X * 0.4}px`})`
          : `translateY(${direction > 0 ? '-4px' : '4px'})`;
        return {
          opacity: 0,
          transform: t,
          transition: `opacity ${DURATION * 0.4}ms ${EASE}, transform ${DURATION * 0.4}ms ${EASE}`,
          willChange: 'opacity, transform',
        };
      }
      case 'entering': {
        const t = axis === 'x'
          ? `translateX(${direction > 0 ? `${SLIDE_X}px` : `-${SLIDE_X}px`})`
          : `translateY(${direction > 0 ? `${SLIDE_Y_ENTER}px` : `${SLIDE_Y_BACK}px`})`;
        return {
          opacity: 0,
          transform: t,
          transition: 'none',
          willChange: 'opacity, transform',
        };
      }
      default:
        return {
          opacity: 1,
          transform: 'translate(0, 0)',
          transition: `opacity ${DURATION}ms ${EASE}, transform ${DURATION}ms ${EASE}`,
          willChange: 'auto',
        };
    }
  };

  return (
    <div ref={containerRef} style={getStyles()}>
      {children}
    </div>
  );
}
