import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function OrdersIntelligenceCard({ insight, className }) {
  if (!insight) return null;
  return (
    <motion.div
      key={insight.id}
      initial="initial"
      animate="animate"
      variants={fadeUp}
      className={cn(
        'rounded-xl border border-border/70 bg-gradient-to-r from-primary/5 to-card p-3 flex items-start gap-3',
        className,
      )}
    >
      <span className="text-lg" aria-hidden>{insight.icon || <Sparkles size={16} />}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Inteligencia del negocio
        </p>
        <p className="mt-0.5 text-sm text-foreground">{insight.text}</p>
      </div>
    </motion.div>
  );
}

export default OrdersIntelligenceCard;
