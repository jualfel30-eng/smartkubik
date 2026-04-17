import { useState, useCallback, useRef } from 'react';

/**
 * Tracks dirty state for forms by comparing current data against an initial snapshot.
 * @param {any} initialData - The initial form data (deep-copied internally)
 * @returns {{ data, setData, isDirty, resetDirty }}
 */
export function useDirtyState(initialData) {
  const snapshot = useRef(JSON.stringify(initialData));
  const [data, setData] = useState(initialData);

  const isDirty = JSON.stringify(data) !== snapshot.current;

  const resetDirty = useCallback((newData) => {
    const d = newData !== undefined ? newData : data;
    snapshot.current = JSON.stringify(d);
    if (newData !== undefined) setData(d);
  }, [data]);

  const initialize = useCallback((freshData) => {
    snapshot.current = JSON.stringify(freshData);
    setData(freshData);
  }, []);

  return { data, setData, isDirty, resetDirty, initialize };
}
