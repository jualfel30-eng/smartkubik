/**
 * MobileListSkeleton — animated pulse rows for any list view.
 * @param {number} count    Number of skeleton rows (default 5)
 * @param {string} height   Tailwind height class per row (default 'h-16')
 * @param {string} className Additional classes on the container
 */
export default function MobileListSkeleton({ count = 5, height = 'h-16', className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} rounded-[var(--mobile-radius-lg)] bg-muted animate-pulse`} />
      ))}
    </div>
  );
}
