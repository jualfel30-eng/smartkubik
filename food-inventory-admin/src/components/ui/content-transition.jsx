import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * ContentTransition — Smooth handoff from loading skeleton to real content.
 *
 * Wraps content and applies a fade+slide entrance animation when `loading`
 * transitions from true → false. Uses CSS animations (no framer-motion)
 * to keep the main bundle lean. Respects prefers-reduced-motion.
 *
 * Usage:
 *   <ContentTransition loading={isLoading} skeleton={<PageLoading variant="table" />}>
 *     <InventoryTable data={data} />
 *   </ContentTransition>
 */
function ContentTransition({ loading, skeleton, children, className }) {
  const [showContent, setShowContent] = React.useState(!loading)
  const [animate, setAnimate] = React.useState(false)
  const prevLoading = React.useRef(loading)

  React.useEffect(() => {
    // Transition: loading → not loading
    if (prevLoading.current && !loading) {
      setAnimate(true)
      setShowContent(true)
    }
    // If loading starts again, reset
    if (!prevLoading.current && loading) {
      setShowContent(false)
      setAnimate(false)
    }
    prevLoading.current = loading
  }, [loading])

  if (loading) {
    return (
      <div
        className={cn(
          "animate-[fadeIn_200ms_ease-out]",
          "motion-reduce:animate-none",
          className
        )}
      >
        {skeleton}
      </div>
    )
  }

  return (
    <div
      className={cn(
        animate && "animate-[fadeInUp_300ms_cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:animate-none",
        className
      )}
      onAnimationEnd={() => setAnimate(false)}
    >
      {showContent ? children : skeleton}
    </div>
  )
}

export { ContentTransition }
