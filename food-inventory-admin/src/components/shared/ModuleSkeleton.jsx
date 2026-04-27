import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton, CardsSkeleton, DashboardSkeleton } from '@/components/ui/page-loading';
import { cn } from '@/lib/utils';

/**
 * ModuleSkeleton — Module-specific loading skeletons.
 *
 * Usage:
 *   <ModuleSkeleton layout="kpi-table" />
 *   <ModuleSkeleton layout="kpi-cards" />
 *   <ModuleSkeleton layout="chat" />
 *   <ModuleSkeleton layout="reports" />
 */

function KpiRowSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
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
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar */}
      <div className="w-80 space-y-3 border-r pr-4">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      {/* Chat area */}
      <div className="flex-1 space-y-4 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
            <Skeleton className={cn('h-12 rounded-xl', i % 2 === 0 ? 'w-64' : 'w-48')} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <KpiRowSkeleton count={4} />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModuleSkeleton({ layout = 'kpi-table', className }) {
  switch (layout) {
    case 'kpi-table':
      return (
        <div className={cn('space-y-6', className)}>
          <KpiRowSkeleton />
          <TableSkeleton rows={6} />
        </div>
      );
    case 'kpi-cards':
      return (
        <div className={cn('space-y-6', className)}>
          <KpiRowSkeleton />
          <CardsSkeleton count={6} />
        </div>
      );
    case 'chat':
      return <ChatSkeleton />;
    case 'reports':
      return <ReportsSkeleton />;
    default:
      return <DashboardSkeleton className={className} />;
  }
}
