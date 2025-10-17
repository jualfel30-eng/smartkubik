import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';

export function ChartCard({ title, description, actions, children }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}

export function ChartEmptyState({ message }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
      <p>{message ?? 'No hay datos suficientes para graficar aún.'}</p>
    </div>
  );
}
