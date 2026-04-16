import * as React from "react"
import { PackageOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * EmptyState — A polished placeholder for lists/tables with zero results.
 *
 * @param {React.ElementType} icon   - Lucide icon component (default: PackageOpen)
 * @param {string}            title  - Primary message
 * @param {string}            description - Secondary helper text
 * @param {string}            actionLabel - CTA button text (optional)
 * @param {() => void}        onAction    - CTA callback (optional)
 * @param {string}            className   - Extra wrapper classes
 */
function EmptyState({
  icon: Icon = PackageOpen,
  title = "Sin resultados",
  description,
  actionLabel,
  onAction,
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
      {...props}
    >
      {/* Icon — scale-in entrance */}
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-muted/60 text-muted-foreground",
          "animate-in zoom-in-50 duration-300 ease-out"
        )}
      >
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>

      {/* Title — slide-up with slight delay */}
      <h3
        className={cn(
          "text-base font-semibold text-foreground",
          "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out",
        )}
        style={{ animationDelay: "75ms", animationFillMode: "backwards" }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            "mt-1.5 max-w-sm text-sm text-muted-foreground",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out",
          )}
          style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
        >
          {description}
        </p>
      )}

      {/* CTA button */}
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className={cn(
            "mt-5",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out",
          )}
          style={{ animationDelay: "225ms", animationFillMode: "backwards" }}
        >
          {actionLabel}
        </Button>
      )}

      {/* Slot for custom content */}
      {children}
    </div>
  )
}

export { EmptyState }
