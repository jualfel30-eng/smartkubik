import { Badge } from '@/components/ui/badge.jsx';
import { AlertTriangle } from 'lucide-react';

export function computeInactiveDays(customer) {
  if (customer?.metrics?.daysSinceLastOrder != null) {
    return customer.metrics.daysSinceLastOrder;
  }
  const lastDate = customer?.metrics?.lastOrderDate || customer?.lastVisit;
  if (!lastDate) return null;
  const diff = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

export function AtRiskBadge({ customer }) {
  const days = computeInactiveDays(customer);
  if (days === null || days < 30) return null;

  const isRed = days >= 60;

  return (
    <Badge
      className={`text-[10px] gap-1 ${
        isRed
          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300'
      } border`}
    >
      <AlertTriangle className="h-3 w-3" />
      {days}d inactivo
    </Badge>
  );
}
