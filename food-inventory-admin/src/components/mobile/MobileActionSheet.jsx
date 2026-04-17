import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, DUR, EASE } from '@/lib/motion';

/**
 * Bottom sheet mobile.
 *
 * Props:
 *  - open: bool
 *  - onClose: fn
 *  - title: string
 *  - children
 *  - className: string (applied to the sheet panel)
 *  - snapPoints: [number, number]  (percentages of viewport, e.g. [0.4, 0.9])
 *    When provided, the sheet starts at the first snap point and can drag to the second.
 *    Dragging down past 20% of the first snap closes the sheet.
 *  - defaultSnap: 0 | 1  (index into snapPoints, default 0)
 */
export default function MobileActionSheet({
  open,
  onClose,
  title,
  children,
  className,
  footer,
  snapPoints,
  defaultSnap = 0,
}) {
  // Body lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  if (snapPoints) {
    return (
      <SnapSheet
        onClose={onClose}
        title={title}
        className={className}
        snapPoints={snapPoints}
        defaultSnap={defaultSnap}
      >
        {children}
      </SnapSheet>
    );
  }

  return (
    <div
      className="fixed inset-0 md:hidden"
      style={{ zIndex: 'var(--z-mobile-sheet)' }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DUR.base, ease: EASE.out }}
      />
      <motion.div
        className={cn(
          'absolute bottom-0 inset-x-0 bg-card shadow-2xl safe-bottom flex flex-col',
          className,
        )}
        style={{
          borderTopLeftRadius: 'var(--mobile-radius-xl)',
          borderTopRightRadius: 'var(--mobile-radius-xl)',
          boxShadow: 'var(--elevation-overlay)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING.drawer}
      >
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <span className="block w-10 h-1 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 pb-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="tap-target no-tap-highlight text-muted-foreground">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-scroll px-4 pb-4 pt-2">
          {children}
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
}

// ─── SnapSheet — framer-motion drag with 40%/90% snap points ─────────────────
function SnapSheet({ onClose, title, children, className, snapPoints, defaultSnap }) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  // Heights from bottom: snapPoints[0] = 40% → sheet height = 0.4 * vh
  const heights = snapPoints.map((p) => Math.round(p * vh));
  const startH = heights[defaultSnap];

  // y = translateY applied to a full-height (h-screen) sheet anchored at top:0.
  // y = 0 → fully open; y = vh - heights[i] → only heights[i] visible at the top.
  const y = useMotionValue(vh - startH);
  const backdropOpacity = useTransform(y, [0, vh - heights[0] * 0.3], [0.5, 0]);

  const dragStartY = useRef(0);

  const snapTo = (idx) => {
    animate(y, vh - heights[idx], SPRING.drawer);
  };

  const onDragStart = () => { dragStartY.current = y.get(); };

  const onDragEnd = (_, info) => {
    const currentY = y.get();
    const vel = info.velocity.y;
    if (currentY > vh - heights[0] * 0.7 || vel > 600) { onClose?.(); return; }
    const currentH = vh - currentY;
    const nearest = heights.reduce((prev, h) => Math.abs(h - currentH) < Math.abs(prev - currentH) ? h : prev, heights[0]);
    const idx = heights.indexOf(nearest);
    snapTo(idx >= 0 ? idx : 0);
  };

  const topHeight = heights[heights.length - 1];

  return (
    <div className="fixed inset-0 md:hidden" style={{ zIndex: 'var(--z-mobile-sheet)' }} role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <motion.button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        style={{ opacity: backdropOpacity }}
        className="absolute inset-0 bg-black"
      />

      {/* Sheet */}
      <motion.div
        drag="y"
        dragConstraints={{ top: vh - topHeight, bottom: vh - heights[0] * 0.3 }}
        dragElastic={0.1}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        style={{
          y,
          height: topHeight,
          borderTopLeftRadius: 'var(--mobile-radius-xl)',
          borderTopRightRadius: 'var(--mobile-radius-xl)',
          boxShadow: 'var(--elevation-overlay)',
        }}
        className={cn(
          'absolute top-0 inset-x-0 bg-card overflow-hidden safe-bottom',
          className,
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
          <span className="block w-10 h-1 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="tap-target no-tap-highlight text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Scroll content */}
        <div className="px-4 pb-4 pt-2 overflow-y-auto mobile-scroll h-[calc(100%-64px)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
