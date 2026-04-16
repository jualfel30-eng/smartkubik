import { Badge } from '@/components/ui/badge.jsx';

export default function ConfidenceBadge({ score }) {
  let variant = 'outline';
  let className = '';

  if (score >= 90) {
    variant = 'destructive';
    className = 'bg-destructive/10 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  } else if (score >= 70) {
    variant = 'outline';
    className = 'bg-warning/10 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
  } else {
    variant = 'outline';
    className = 'bg-warning/10 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
  }

  return (
    <Badge variant={variant} className={className}>
      {score}% confianza
    </Badge>
  );
}
