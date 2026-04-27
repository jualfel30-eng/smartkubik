import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';

/**
 * CollapsibleSection — reusable collapsible card for POS right column.
 * Shows header with title + summary (when collapsed) + toggle.
 * Animates height with Framer Motion.
 */
export function CollapsibleSection({
  title,
  summary,
  icon: Icon,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
  className = '',
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen !== undefined) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  return (
    <div className={`border rounded-lg bg-card overflow-hidden ${className}`}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-semibold">{title}</span>

        {/* Summary — shown only when collapsed */}
        {!isOpen && summary && (
          <span className="flex-1 flex items-center gap-2 ml-2 text-xs text-muted-foreground truncate min-w-0">
            {summary}
          </span>
        )}

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Content — animated height */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
