import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Eye, DollarSign } from 'lucide-react';

/**
 * KanbanCard — Simplified opportunity card.
 * Shows: name + amount, client, next step + due date.
 * Single action: move to stage. Detail via eye icon.
 * MQL/SQL removed from card (belongs in detail dialog).
 */
export function KanbanCard({ opp, onQuickMove, onOpenDetail, stageOptions }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'OPPORTUNITY_CARD',
    item: { opp },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [opp]);

  const dueDate = opp.nextStepDue ? new Date(opp.nextStepDue) : null;
  const today = new Date();
  const diffDays = dueDate ? Math.floor((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = diffDays !== null && diffDays < 0;
  const isDueSoon = diffDays !== null && diffDays >= 0 && diffDays <= 2;

  return (
    <motion.div
      ref={drag}
      className={`rounded-lg border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'shadow-lg opacity-60' : 'shadow-sm hover:shadow-md'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING.snappy}
      layout={!isDragging}
      layoutId={isDragging ? undefined : opp._id}
    >
      {/* Line 1: Name + Amount */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-foreground leading-tight">
          {opp.name || 'Sin nombre'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {opp.amount ? (
            <span className="text-xs font-bold text-foreground">
              ${opp.amount.toLocaleString()}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(opp); }}
            title="Ver detalle"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Line 2: Client */}
      <p className="text-xs text-muted-foreground truncate">
        {opp.customerId?.name || opp.customerId?.companyName || '—'}
      </p>

      {/* Line 3: Next step + due date */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground truncate flex-1">
          {opp.nextStep || 'Sin próximo paso'}
        </span>
        {opp.nextStepDue && (
          <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
            isOverdue
              ? 'bg-destructive/15 text-destructive'
              : isDueSoon
                ? 'bg-warning/15 text-warning'
                : 'bg-muted text-muted-foreground'
          }`}>
            {dueDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Quick move */}
      <Select value={opp.stage} onValueChange={(value) => onQuickMove(opp._id, value)}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Mover a" />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  );
}
