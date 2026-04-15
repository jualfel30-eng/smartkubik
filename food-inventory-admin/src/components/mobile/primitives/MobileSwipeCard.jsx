import { useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

/**
 * MobileSwipeCard — generic swipe-left-to-reveal card.
 *
 * Wraps any children and reveals action buttons on swipe-left.
 * Actions are rendered absolutely behind the card.
 *
 * @param {React.ReactNode} children  Card content
 * @param {Array<{icon, label, color, onClick}>} actions  Up to 3 actions revealed on swipe
 * @param {function} onTap   Called on tap (if no drag occurred)
 * @param {string}   className  Additional classes on the outer wrapper
 */
export default function MobileSwipeCard({ children, actions = [], onTap, className = '' }) {
  const REVEAL = actions.length * 72; // 72px per action button
  const x = useMotionValue(0);
  const draggedRef = useRef(false);

  const close = () => animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });

  const onDragEnd = (_, info) => {
    draggedRef.current = Math.abs(info.offset.x) > 6;
    if (info.offset.x < -REVEAL / 2) {
      animate(x, -REVEAL, { type: 'spring', stiffness: 400, damping: 35 });
    } else {
      close();
    }
  };

  const handleTap = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    onTap?.();
  };

  if (!actions.length) {
    return (
      <div className={`rounded-2xl border border-border bg-card overflow-hidden ${className}`} onClick={handleTap}>
        {children}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Action strip (behind the card) */}
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: REVEAL }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { close(); action.onClick?.(); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 no-tap-highlight text-white text-[10px] font-semibold ${action.color || 'bg-primary'}`}
          >
            {action.icon}
            {action.label && <span>{action.label}</span>}
          </button>
        ))}
      </div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.05 }}
        style={{ x }}
        onDragEnd={onDragEnd}
        onClick={handleTap}
        className="relative z-10 rounded-2xl border border-border bg-card overflow-hidden cursor-pointer"
      >
        {children}
      </motion.div>
    </div>
  );
}
