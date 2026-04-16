import { useDataHighlight } from '@/hooks/use-data-highlight';
import { cn } from '@/lib/utils';

/**
 * DataHighlight — wraps any element and flashes a success tint when
 * the `value` prop changes. Perfect for live-updating table cells or KPI cards.
 *
 * Props:
 *   value     — The value to watch. Flash triggers on any change.
 *   as        — HTML tag or component to render (default: 'span')
 *   duration  — Flash duration in ms (default: 600)
 *   className — Additional classes forwarded to the element
 *
 * Usage (table cell):
 *   <DataHighlight as="td" value={row.stock} className="px-4 py-2">
 *     {row.stock}
 *   </DataHighlight>
 *
 * Usage (KPI number):
 *   <DataHighlight value={salesToday} className="text-2xl font-bold">
 *     ${salesToday.toFixed(2)}
 *   </DataHighlight>
 */
export function DataHighlight({
  value,
  as: Tag = 'span',
  duration = 600,
  className,
  children,
  ...props
}) {
  const { flashing } = useDataHighlight(value, { duration });

  return (
    <Tag
      className={cn(
        'transition-colors',
        flashing && 'rounded bg-success/15',
        className
      )}
      style={flashing ? { transitionDuration: `${duration}ms` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default DataHighlight;
