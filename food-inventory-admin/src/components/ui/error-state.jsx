import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * ErrorState — Replaces bare red-text error messages with a polished,
 * actionable error display including retry capability.
 *
 * @param {string}     message  - Error description shown to the user
 * @param {() => void} onRetry  - Callback for retry button (optional)
 * @param {string}     className - Extra wrapper classes
 */
function ErrorState({
  message = "Ocurrió un error inesperado",
  onRetry,
  className,
  ...props
}) {
  const [retrying, setRetrying] = React.useState(false)

  const handleRetry = async () => {
    if (!onRetry) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        "animate-in fade-in-0 duration-300 ease-out",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-destructive/10 text-destructive"
        )}
      >
        <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
      </div>

      <h3 className="text-base font-semibold text-foreground">
        Algo salió mal
      </h3>

      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {message}
      </p>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
          className="mt-5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
          {retrying ? "Reintentando..." : "Reintentar"}
        </Button>
      )}
    </div>
  )
}

export { ErrorState }
