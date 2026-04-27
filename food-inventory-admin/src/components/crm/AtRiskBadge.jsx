import { Badge } from '@/components/ui/badge.jsx';
import { AlertTriangle } from 'lucide-react';

/**
 * Compute days since last customer activity.
 * Uses daysSinceLastOrder from metrics, or computes from lastOrderDate/lastVisit.
 */
export function computeInactiveDays(customer) {
  if (customer?.metrics?.daysSinceLastOrder != null) {
    return customer.metrics.daysSinceLastOrder;
  }
  const lastDate = customer?.metrics?.lastOrderDate || customer?.lastVisit;
  if (!lastDate) return null;
  const diff = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

/**
 * AtRiskBadge — Shows warning for inactive clients.
 * Uses semantic design tokens for dark mode compatibility.
 * - Amber: 30-59 days inactive
 * - Red: 60+ days inactive
 */
export function AtRiskBadge({ customer }) {
  const days = computeInactiveDays(customer);
  if (days === null || days < 30) return null;

  const isRed = days >= 60;

  return (
    <Badge
      className={`text-xs gap-1 border ${
        isRed
          ? 'bg-destructive/10 text-destructive border-destructive/20'
          : 'bg-warning/10 text-warning border-warning/20'
      }`}
    >
      <AlertTriangle className="h-3 w-3" />
      {days}d
    </Badge>
  );
}
