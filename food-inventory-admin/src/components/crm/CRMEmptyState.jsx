import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { Button } from '@/components/ui/button.jsx';

/**
 * CRMEmptyState — Illustrated empty state with icon, title, description and CTA.
 * Uses the same pattern as ErrorState component for visual consistency.
 */
export function CRMEmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center py-16 px-6 text-center"
    >
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1.5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
