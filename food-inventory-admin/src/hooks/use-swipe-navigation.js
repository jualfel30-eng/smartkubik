import { useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';

/**
 * useSwipeNavigation — detects edge-initiated horizontal swipes and
 * navigates to the prev/next sibling route in the sidebar order.
 *
 * Constraints (to avoid false triggers):
 *   • Touch must start within EDGE_ZONE px of the screen edge (left = go back, right = go forward)
 *   • OR swipe distance > FULL_SWIPE_THRESHOLD with high horizontal-to-vertical ratio
 *   • Minimum horizontal distance: SWIPE_THRESHOLD
 *   • Maximum vertical drift: MAX_VERT_DRIFT
 *   • Only fires on actual touch devices
 *
 * @param {string[]} routeOrder  Ordered array of base route segments (from sidebar)
 * @returns {{ ref }}  Attach ref to the swipeable container element
 */

const EDGE_ZONE = 28;            // px from screen edge for edge-swipe trigger
const SWIPE_THRESHOLD = 70;      // minimum px horizontal to count as swipe
const MAX_VERT_DRIFT = 50;       // px vertical allowed before cancelling
const FULL_SWIPE_RATIO = 2.5;    // horizontal must be X× vertical for non-edge swipe

export function useSwipeNavigation(routeOrder) {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);
  const touchStart = useRef(null);
  const shouldReduce = useReducedMotion();

  /** Extract base segment from a tenant-prefixed path like /t/slug/section */
  const getBase = useCallback((pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 't' && parts.length >= 3) return parts[2];
    return parts[parts.length - 1] || '';
  }, []);

  /** Get the tenant prefix from the current path */
  const getPrefix = useCallback((pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 't' && parts.length >= 2) return `/t/${parts[1]}`;
    return '';
  }, []);

  useEffect(() => {
    if (shouldReduce) return;

    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        screenEdge: touch.clientX < EDGE_ZONE
          ? 'left'
          : touch.clientX > window.innerWidth - EDGE_ZONE
            ? 'right'
            : null,
        time: Date.now(),
      };
    };

    const onTouchEnd = (e) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const { screenEdge } = touchStart.current;
      touchStart.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Reject: too much vertical drift
      if (absDy > MAX_VERT_DRIFT) return;
      // Reject: too short
      if (absDx < SWIPE_THRESHOLD) return;
      // Reject non-edge swipes with bad ratio
      if (!screenEdge && absDx / Math.max(absDy, 1) < FULL_SWIPE_RATIO) return;

      // Determine direction: swipe RIGHT (dx > 0) = going back (prev), swipe LEFT = forward (next)
      const goingBack = dx > 0;
      const currentBase = getBase(location.pathname);
      const prefix = getPrefix(location.pathname);
      const idx = routeOrder.indexOf(currentBase);
      if (idx === -1) return;

      const targetIdx = goingBack ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= routeOrder.length) return;

      navigate(`${prefix}/${routeOrder[targetIdx]}`);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate, location.pathname, routeOrder, getBase, getPrefix, shouldReduce]);

  return { ref };
}

export default useSwipeNavigation;
