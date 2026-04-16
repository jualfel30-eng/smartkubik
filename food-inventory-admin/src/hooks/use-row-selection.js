import { useState, useCallback, useMemo } from 'react';

/**
 * useRowSelection — Manages multi-row selection state for tables.
 *
 * Usage:
 *   const { selected, toggle, toggleAll, clear, isSelected, isAllSelected, count } = useRowSelection();
 *
 *   <Checkbox checked={isAllSelected(rows)} onCheckedChange={() => toggleAll(rows)} />
 *   <Checkbox checked={isSelected(row._id)} onCheckedChange={() => toggle(row._id)} />
 *
 *   {count > 0 && <BulkActionBar count={count} onDelete={...} onClear={clear} />}
 */
export function useRowSelection() {
  const [selected, setSelected] = useState(new Set());

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((items) => {
    setSelected((prev) => {
      const ids = items.map((item) => item._id || item.id);
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(ids);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id) => selected.has(id), [selected]);

  const isAllSelected = useCallback(
    (items) => {
      if (!items || items.length === 0) return false;
      return items.every((item) => selected.has(item._id || item.id));
    },
    [selected]
  );

  const count = selected.size;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return { selected, selectedIds, toggle, toggleAll, clear, isSelected, isAllSelected, count };
}
