import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SplitView — Responsive master-detail layout.
 *
 * - Below `breakpoint` (default 1440px): full-width list, detail opens as overlay/replaces list
 * - Above `breakpoint`: side-by-side with resizable proportions
 *
 * Usage:
 *   <SplitView
 *     list={<AppointmentsList onSelect={setSelected} />}
 *     detail={selected ? <AppointmentDetail data={selected} /> : null}
 *     onCloseDetail={() => setSelected(null)}
 *   />
 */
export function SplitView({
  list,
  detail,
  onCloseDetail,
  listWidth = 'w-[420px] min-w-[360px]',
  className,
}) {
  const hasDetail = !!detail;

  return (
    <div className={cn('flex h-full', className)}>
      {/* List panel */}
      <div
        className={cn(
          'flex-shrink-0 overflow-y-auto border-r border-border transition-all duration-200',
          hasDetail
            ? `hidden xl:block ${listWidth}`
            : 'w-full',
        )}
      >
        {list}
      </div>

      {/* Detail panel */}
      {hasDetail && (
        <div className="flex-1 min-w-0 overflow-y-auto relative animate-in fade-in-0 slide-in-from-right-2 duration-200">
          {/* Close button — only on narrow viewports where list is hidden */}
          {onCloseDetail && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10 xl:hidden"
              onClick={onCloseDetail}
            >
              <X size={16} />
            </Button>
          )}
          {detail}
        </div>
      )}
    </div>
  );
}

/**
 * SplitViewTrigger — Wraps a list item to make it selectable.
 * Highlights the active item.
 */
export function SplitViewItem({
  children,
  isActive,
  onClick,
  className,
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border transition-colors',
        'hover:bg-accent/50',
        isActive && 'bg-accent border-l-2 border-l-primary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
