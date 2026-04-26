import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Eye } from 'lucide-react';

export function KanbanCard({ opp, onQuickMove, onMqlDecision, onSqlDecision, onOpenDetail, stageOptions }) {
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
      className="rounded-md border bg-background p-2 shadow-sm space-y-1 cursor-grab active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING.snappy}
      layout={!isDragging}
      layoutId={isDragging ? undefined : opp._id}
    >
      <div className="flex justify-between items-start">
        <div className="font-medium text-sm">{opp.name || 'Sin nombre'}</div>
        <Button variant="ghost" size="xs" className="h-4 w-4 p-0" onClick={() => onOpenDetail && onOpenDetail(opp)}>
          <Eye className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        Cliente: {opp.customerId?.name || opp.customerId?.companyName || '—'}
      </div>
      <div className="text-xs text-muted-foreground">
        Owner: {opp.ownerId?.name || opp.ownerId?.email || '—'}
      </div>
      <div className="text-xs flex items-center gap-2">
        <span>Next: {opp.nextStep || '—'}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${isOverdue ? 'bg-destructive/20 text-destructive dark:bg-destructive/30 dark:text-destructive' : isDueSoon ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
          {opp.nextStepDue ? new Date(opp.nextStepDue).toISOString().slice(0, 10) : '—'}
        </span>
      </div>
      <Select
        value={opp.stage}
        onValueChange={(value) => onQuickMove(opp._id, value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Mover a" />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="xs"
          onClick={() => onMqlDecision && onMqlDecision(opp._id, 'accepted')}
        >
          MQL
        </Button>
        <Button
          variant="secondary"
          size="xs"
          onClick={() => onSqlDecision && onSqlDecision(opp._id, 'accepted')}
        >
          SQL
        </Button>
      </div>
    </motion.div>
  );
}
