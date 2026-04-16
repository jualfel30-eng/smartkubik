import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-busy="true"
      aria-label="Cargando..."
      className={cn(
        "relative overflow-hidden rounded-md bg-accent",
        "after:absolute after:inset-0 after:translate-x-[-100%]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        "after:animate-[shimmer_1.5s_ease-in-out_infinite]",
        "motion-reduce:after:animate-none motion-reduce:animate-pulse",
        className
      )}
      {...props} />
  );
}

export { Skeleton }
