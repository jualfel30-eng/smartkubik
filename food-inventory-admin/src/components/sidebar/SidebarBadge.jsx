import { motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';

/**
 * Animated badge that bounces on count change.
 * Uses key={count} to re-mount and trigger entrance animation.
 */
export function SidebarBadge({ count, variant = 'secondary', className = '' }) {
  if (!count || count <= 0) return null;

  const display = count > 99 ? '99+' : count;

  return (
    <motion.span
      key={count}
      initial={{ scale: 1.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING.bouncy}
      className="inline-flex"
    >
      <Badge
        variant={variant}
        className={`rounded-full px-1.5 py-0.5 text-[10px] h-5 min-w-5 flex items-center justify-center ${className}`}
      >
        {display}
      </Badge>
    </motion.span>
  );
}

/**
 * Small colored dot for collapsed sidebar mode.
 * Shows when sidebar is icon-only and a badge count > 0.
 */
export function SidebarBadgeDot({ color = 'destructive' }) {
  const colorClass = color === 'info' ? 'bg-blue-500' : 'bg-destructive';

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={SPRING.bouncy}
      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${colorClass} border-2 border-sidebar`}
    />
  );
}
