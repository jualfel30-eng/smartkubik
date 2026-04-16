import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * PageLoading — Standardized loading skeletons for different page layouts.
 *
 * @param {"table"|"cards"|"form"|"dashboard"} variant
 * @param {number} rows - Number of skeleton rows/items (default varies by variant)
 * @param {string} className - Extra wrapper classes
 */
function PageLoading({ variant = "table", rows, className }) {
  switch (variant) {
    case "table":
      return <TableSkeleton rows={rows ?? 6} className={className} />
    case "cards":
      return <CardsSkeleton count={rows ?? 6} className={className} />
    case "form":
      return <FormSkeleton fields={rows ?? 5} className={className} />
    case "dashboard":
      return <DashboardSkeleton className={className} />
    default:
      return <TableSkeleton rows={rows ?? 6} className={className} />
  }
}

function TableSkeleton({ rows, className }) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 max-sm:h-11 w-64 max-sm:w-full" />
        <Skeleton className="h-9 max-sm:h-11 w-24 max-sm:hidden" />
        <Skeleton className="h-9 max-sm:h-11 w-24 max-sm:hidden" />
      </div>
      {/* Table header */}
      <div className="flex gap-4 px-4 py-2 max-sm:hidden">
        {[120, 200, 100, 80, 80, 60].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: w }} />
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-48 max-sm:w-full" />
          <Skeleton className="h-4 w-20 max-sm:w-32" />
          <Skeleton className="h-4 w-16 max-sm:hidden" />
          <Skeleton className="h-4 w-16 max-sm:hidden" />
          <Skeleton className="h-8 w-8 rounded-full ml-auto max-sm:hidden" />
        </div>
      ))}
    </div>
  )
}

function CardsSkeleton({ count, className }) {
  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FormSkeleton({ fields, className }) {
  return (
    <div className={cn("space-y-5 max-w-xl", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 max-sm:h-11 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-9 max-sm:h-11 w-24" />
        <Skeleton className="h-9 max-sm:h-11 w-20" />
      </div>
    </div>
  )
}

function DashboardSkeleton({ className }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
      {/* Recent items */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { PageLoading, TableSkeleton, CardsSkeleton, FormSkeleton, DashboardSkeleton }
