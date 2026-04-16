import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';

/**
 * BulkActionBar — Floating bar that appears when rows are selected.
 * Renders at the bottom of the table container.
 *
 * @param {number}    count    - Number of selected items
 * @param {() => void} onClear  - Deselect all
 * @param {Array}     actions  - [{ label, icon, onClick, variant }]
 */
export function BulkActionBar({ count, onClear, actions = [], className }) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-2.5 rounded-xl",
        "bg-card border shadow-lg",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
        className,
      )}
    >
      <span className="text-sm font-medium">
        {count} seleccionado{count !== 1 ? 's' : ''}
      </span>

      <div className="h-4 w-px bg-border" />

      {actions.map((action, i) => (
        <Button
          key={i}
          variant={action.variant || 'outline'}
          size="sm"
          onClick={action.onClick}
          className="gap-1.5"
        >
          {action.icon && <action.icon size={14} />}
          {action.label}
        </Button>
      ))}

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
        <X size={14} />
      </Button>
    </div>
  );
}
