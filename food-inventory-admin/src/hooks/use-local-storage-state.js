import { useState, useCallback } from 'react';

export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    setValue((prev) => {
      const resolved = typeof newValue === 'function' ? newValue(prev) : newValue;
      try {
        if (resolved === null || resolved === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(resolved));
        }
      } catch {
        // localStorage full or blocked — silently continue with in-memory state
      }
      return resolved;
    });
  }, [key]);

  return [value, setStoredValue];
}
