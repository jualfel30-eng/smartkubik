import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { Button } from '@/components/ui/button.jsx';

export function CRMEmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center py-12 text-center"
    >
      {Icon && <Icon className="h-12 w-12 text-muted-foreground/40 mb-4" />}
      <h3 className="font-semibold text-lg text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
