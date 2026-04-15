import { PackageSearch } from 'lucide-react';

/**
 * MobileEmptyState — consistent empty state for list views.
 *
 * @param {React.ElementType} icon  Lucide icon component (default PackageSearch)
 * @param {string} title            Main message
 * @param {string} description      Secondary message (optional)
 * @param {React.ReactNode} action  Optional action button/link
 */
export default function MobileEmptyState({
  icon: Icon = PackageSearch,
  title = 'Sin resultados',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center gap-3">
      <div className="w-14 h-14 rounded-[var(--mobile-radius-lg)] bg-muted flex items-center justify-center">
        <Icon size={26} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
