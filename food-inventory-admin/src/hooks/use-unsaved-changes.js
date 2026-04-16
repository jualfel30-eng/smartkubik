import { useEffect, useCallback, useRef } from "react"
import { useBlocker } from "react-router-dom"

/**
 * useUnsavedChanges — Warns user when navigating away from a dirty form.
 *
 * Handles both:
 * 1. Browser close/reload (beforeunload event)
 * 2. React Router navigation (useBlocker)
 *
 * @param {boolean} isDirty - Whether the form has unsaved changes
 * @param {string} message - Warning message (only used for beforeunload)
 *
 * Returns:
 * - blocker: the React Router blocker object (for rendering a confirm dialog)
 * - confirmNavigation: call to proceed with blocked navigation
 * - cancelNavigation: call to cancel blocked navigation
 *
 * Usage:
 *   const { blocker, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);
 *
 *   // Render a confirm dialog when blocker.state === "blocked"
 *   {blocker.state === "blocked" && (
 *     <AlertDialog open>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
 *           <AlertDialogDescription>Tienes cambios sin guardar que se perderán.</AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel onClick={cancelNavigation}>Quedarse</AlertDialogCancel>
 *           <AlertDialogAction onClick={confirmNavigation}>Salir</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 *   )}
 */
export function useUnsavedChanges(isDirty, message = "Tienes cambios sin guardar. ¿Seguro que quieres salir?") {
  // Browser close/reload protection
  useEffect(() => {
    if (!isDirty) return

    const handler = (e) => {
      e.preventDefault()
      e.returnValue = message
      return message
    }

    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty, message])

  // React Router navigation blocking
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty]
    )
  )

  const confirmNavigation = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.proceed()
    }
  }, [blocker])

  const cancelNavigation = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset()
    }
  }, [blocker])

  return { blocker, confirmNavigation, cancelNavigation }
}
