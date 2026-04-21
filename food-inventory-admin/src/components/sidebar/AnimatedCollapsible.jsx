import { AnimatePresence, motion } from 'framer-motion';
import { CollapsibleContent } from '@/components/ui/collapsible';
import { SPRING, DUR, EASE } from '@/lib/motion';

/**
 * Animated wrapper for Radix CollapsibleContent.
 * Uses forceMount + AnimatePresence so Framer Motion can animate both
 * enter (height 0→auto) and exit (height auto→0).
 */
export function AnimatedCollapsibleContent({ isOpen, children }) {
  return (
    <CollapsibleContent forceMount>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { ...SPRING.snappy, clamp: true },
              opacity: { duration: DUR.fast, ease: EASE.out },
            }}
            style={{ overflow: 'hidden' }}
            aria-hidden={!isOpen}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: { staggerChildren: 0.03, delayChildren: 0.02 },
                },
                hidden: {},
              }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CollapsibleContent>
  );
}

/** Variant for staggered child items inside AnimatedCollapsibleContent */
export const sidebarChildItem = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DUR.fast, ease: EASE.out },
  },
};
