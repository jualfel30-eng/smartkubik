import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * ContentTransition — Smooth handoff from loading skeleton to real content.
 *
 * Uses Framer Motion AnimatePresence mode="wait" so the skeleton fully
 * fades+slides out before the content fades+slides in. Respects
 * prefers-reduced-motion automatically via framer-motion.
 *
 * Usage:
 *   <ContentTransition loading={isLoading} skeleton={<PageLoading variant="table" />}>
 *     <InventoryTable data={data} />
 *   </ContentTransition>
 */
function ContentTransition({ loading, skeleton, children, className }) {
  const variants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="skeleton"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { ContentTransition }
