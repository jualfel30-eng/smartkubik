import { useRef, useEffect, useCallback, useMemo } from 'react';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

/**
 * WheelTimePicker — iOS-style scroll-snap wheel for selecting time slots.
 *
 * @param {string[]}  slots         - All available time slots (e.g. ['08:00', '08:30', ...])
 * @param {string}    value         - Currently selected slot (e.g. '10:00')
 * @param {function}  onChange      - (slot: string) => void
 * @param {string[]}  [occupiedSlots] - Slots that are booked (shown but not selectable)
 * @param {string}    [className]
 */
export default function WheelTimePicker({ slots = [], value, onChange, occupiedSlots = [], className = '' }) {
  const scrollRef = useRef(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  const occupiedSet = useMemo(() => new Set(occupiedSlots), [occupiedSlots]);

  // Scroll to the selected value on mount and when value changes externally
  useEffect(() => {
    if (isUserScrolling.current) return;
    const idx = slots.indexOf(value);
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }
  }, [value, slots]);

  // Handle scroll-snap end: determine which slot is centered
  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const scrollTop = scrollRef.current.scrollTop;
      let idx = Math.round(scrollTop / ITEM_HEIGHT);
      idx = Math.max(0, Math.min(idx, slots.length - 1));

      // If the snapped slot is occupied, find the nearest available
      if (occupiedSet.has(slots[idx])) {
        // Search forward then backward
        let found = false;
        for (let offset = 1; offset < slots.length; offset++) {
          if (idx + offset < slots.length && !occupiedSet.has(slots[idx + offset])) {
            idx = idx + offset;
            found = true;
            break;
          }
          if (idx - offset >= 0 && !occupiedSet.has(slots[idx - offset])) {
            idx = idx - offset;
            found = true;
            break;
          }
        }
        if (!found) idx = 0; // All occupied — fallback
      }

      // Snap to position
      scrollRef.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: 'smooth',
      });

      if (slots[idx] !== value) {
        onChange?.(slots[idx]);
      }
      isUserScrolling.current = false;
    }, 80);
  }, [slots, value, onChange, occupiedSet]);

  // Cleanup timeout
  useEffect(() => () => clearTimeout(scrollTimeout.current), []);

  return (
    <div className={`relative select-none ${className}`} style={{ height: CONTAINER_HEIGHT }}>
      {/* Gradient overlays for fade effect */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none dark:from-gray-900" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none dark:from-gray-900" />

      {/* Selection highlight band */}
      <div
        className="absolute inset-x-2 z-[5] rounded-lg border border-primary/30 bg-primary/5 pointer-events-none"
        style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }}
      />

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-none"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Top padding to center first item */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />

        {slots.map((slot) => {
          const isOccupied = occupiedSet.has(slot);
          const isSelected = slot === value;
          return (
            <div
              key={slot}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'center',
              }}
              className={`flex items-center justify-center text-sm font-mono transition-all ${
                isOccupied
                  ? 'text-muted-foreground/30 cursor-not-allowed line-through'
                  : isSelected
                    ? 'text-primary font-semibold text-base'
                    : 'text-muted-foreground cursor-pointer hover:text-foreground'
              }`}
              onClick={() => {
                if (isOccupied) return;
                onChange?.(slot);
                // Scroll to center this item
                const idx = slots.indexOf(slot);
                scrollRef.current?.scrollTo({
                  top: idx * ITEM_HEIGHT,
                  behavior: 'smooth',
                });
              }}
            >
              {slot}
              {isOccupied && (
                <span className="ml-2 text-[9px] text-red-400/60 font-sans no-underline" style={{ textDecoration: 'none' }}>
                  ocupado
                </span>
              )}
            </div>
          );
        })}

        {/* Bottom padding to center last item */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  );
}
