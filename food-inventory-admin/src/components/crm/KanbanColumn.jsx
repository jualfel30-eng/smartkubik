import { useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge.jsx';
import { KanbanCard } from './KanbanCard.jsx';

export function KanbanColumn({ stage, cards, onDrop, onQuickMove, onMqlDecision, onSqlDecision, onOpenDetail, stageOptions }) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'OPPORTUNITY_CARD',
      drop: (item) => onDrop(item.opp),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [onDrop],
  );

  return (
    <motion.div
      ref={drop}
      className={`rounded-lg border bg-muted/40 p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
      animate={{ backgroundColor: isOver ? 'rgba(59,130,246,0.08)' : 'transparent' }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{stage}</div>
        <Badge variant="outline">{cards.length}</Badge>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {cards.length === 0 && (
          <div className="text-sm text-muted-foreground">Sin oportunidades</div>
        )}
        {cards.map((opp) => (
          <KanbanCard
            key={opp._id}
            opp={opp}
            onQuickMove={onQuickMove}
            onMqlDecision={onMqlDecision}
            onSqlDecision={onSqlDecision}
            onOpenDetail={onOpenDetail}
            stageOptions={stageOptions}
          />
        ))}
      </div>
    </motion.div>
  );
}
