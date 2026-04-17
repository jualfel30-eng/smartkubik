import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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
 *  - footer: ReactNode (sticky at bottom of scrollable area)
 *  - snapPoints: [number, number]  (percentages of viewport, e.g. [0.4, 0.9])
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

      {/* ── Sheet panel ──
       * The panel IS the scroll container (overflow-y auto).
       * Header and footer use position:sticky so they stay visible
       * while the content between them scrolls.
       * max-height: 85vh keeps the panel from overflowing the viewport.
       * bottom:0 anchors it to the viewport bottom.
       */}
      <motion.div
        className={cn(
          'absolute inset-x-0 bg-card shadow-2xl',
          className,
        )}
        style={{
          bottom: 'calc(var(--mobile-bottomnav-h) + var(--safe-bottom))',
          maxHeight: 'calc(85vh - var(--mobile-bottomnav-h) - var(--safe-bottom))',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          borderTopLeftRadius: 'var(--mobile-radius-xl)',
          borderTopRightRadius: 'var(--mobile-radius-xl)',
          boxShadow: 'var(--elevation-overlay)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING.drawer}
      >
        {/* Sticky header: handle + title — always visible at top */}
        <div
          className="bg-card"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            borderTopLeftRadius: 'var(--mobile-radius-xl)',
            borderTopRightRadius: 'var(--mobile-radius-xl)',
          }}
        >
          <div className="flex justify-center pt-2 pb-1">
            <span className="block w-10 h-1 rounded-full bg-muted-foreground/40" aria-hidden />
          </div>
          <div className="flex items-center justify-between px-4 pb-2">
            <h2 className="text-base font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="tap-target no-tap-highlight text-muted-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content — scrolls naturally inside the panel */}
        <div className="px-4 pb-4 pt-2">{children}</div>

        {/* Sticky footer — always visible at bottom */}
        {footer && (
          <div
            className="bg-card"
            style={{ position: 'sticky', bottom: 0, zIndex: 2 }}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── SnapSheet — framer-motion drag with 40%/90% snap points ─────────────────
function SnapSheet({ onClose, title, children, className, snapPoints, defaultSnap }) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const heights = snapPoints.map((p) => Math.round(p * vh));
  const startH = heights[defaultSnap];

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
      <motion.button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        style={{ opacity: backdropOpacity }}
        className="absolute inset-0 bg-black"
      />

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
        <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
          <span className="block w-10 h-1 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="tap-target no-tap-highlight text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-4 pt-2 overflow-y-auto mobile-scroll h-[calc(100%-64px)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
