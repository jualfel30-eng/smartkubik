import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SPRING, EASE, DUR } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * ShakeOnError — Wraps a form field and shakes horizontally when `error` becomes truthy.
 *
 * Usage:
 *   <ShakeOnError error={!!errors.name}>
 *     <Input {...register("name")} />
 *   </ShakeOnError>
 */
function ShakeOnError({ error, children, className }) {
  const [shouldShake, setShouldShake] = React.useState(false)
  const prevError = React.useRef(false)

  React.useEffect(() => {
    // Only trigger shake on transition from no-error → error
    if (error && !prevError.current) {
      setShouldShake(true)
    }
    prevError.current = error
  }, [error])

  return (
    <motion.div
      className={className}
      animate={
        shouldShake
          ? { x: [0, -8, 8, -4, 4, 0] }
          : { x: 0 }
      }
      transition={
        shouldShake
          ? { duration: 0.4, ease: EASE.out }
          : { duration: 0 }
      }
      onAnimationComplete={() => setShouldShake(false)}
    >
      {children}
    </motion.div>
  )
}

/**
 * SuccessFlash — Brief green glow ring on a wrapped element after save.
 *
 * Usage:
 *   <SuccessFlash flash={saveSuccess}>
 *     <Button>Guardar</Button>
 *   </SuccessFlash>
 */
function SuccessFlash({ flash, children, className }) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="absolute inset-0 rounded-md pointer-events-none"
            initial={{ boxShadow: "0 0 0 0px rgba(16, 185, 129, 0)" }}
            animate={{ boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.4)" }}
            exit={{ boxShadow: "0 0 0 6px rgba(16, 185, 129, 0)", opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * AnimatedFieldError — Animated error message that slides in below an input.
 *
 * Usage:
 *   <Input />
 *   <AnimatedFieldError message={errors.name?.message} />
 */
function AnimatedFieldError({ message }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.p
          key={message}
          className="text-sm text-destructive mt-1.5"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: DUR.fast, ease: EASE.out }}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

export { ShakeOnError, SuccessFlash, AnimatedFieldError }
