import { useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge.jsx';
import { GripVertical } from 'lucide-react';
import { KanbanCard } from './KanbanCard.jsx';
import { getStageColor } from './badges.jsx';

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

  const stageColor = getStageColor(stage);

  // Sum total amount in this column
  const totalAmount = cards.reduce((sum, opp) => sum + (opp.amount || 0), 0);

  return (
    <motion.div
      ref={drop}
      className={`rounded-xl border ${stageColor.bg} p-3 border-t-2 ${stageColor.border} transition-all ${
        isOver ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10' : ''
      }`}
      animate={{ scale: isOver ? 1.01 : 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm ${stageColor.text}`}>{stage}</span>
          <Badge variant="outline" className="text-[11px] px-1.5">{cards.length}</Badge>
        </div>
        {totalAmount > 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            ${totalAmount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
        {cards.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <GripVertical className="h-5 w-5 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Arrastra aquí</p>
          </div>
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
