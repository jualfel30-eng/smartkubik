import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SortableList — Reorderable list powered by framer-motion.
 * Works on both desktop (drag handle) and mobile (drag handle).
 *
 * Usage:
 *   <SortableList
 *     items={services}
 *     onReorder={setServices}
 *     keyExtractor={(item) => item._id}
 *     renderItem={(item) => <ServiceRow service={item} />}
 *   />
 */
export function SortableList({
  items,
  onReorder,
  keyExtractor,
  renderItem,
  className,
}) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className={cn('space-y-0', className)}
    >
      {items.map((item) => (
        <SortableItem key={keyExtractor(item)} value={item}>
          {renderItem(item)}
        </SortableItem>
      ))}
    </Reorder.Group>
  );
}

function SortableItem({ value, children }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      className={cn(
        'flex items-center bg-card border-b border-border',
        'data-[dragging]:z-10 data-[dragging]:shadow-lg data-[dragging]:bg-accent/50',
        'transition-shadow duration-150',
      )}
    >
      {/* Drag handle */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-center w-8 h-full cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-none"
      >
        <GripVertical size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </Reorder.Item>
  );
}

export { SortableItem };
