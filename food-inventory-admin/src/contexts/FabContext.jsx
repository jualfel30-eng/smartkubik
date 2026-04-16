import React, { createContext, useContext, useState, useCallback } from 'react';

const FabContext = createContext({
  contextAction: null,
  setContextAction: () => {},
  clearContextAction: () => {},
});

export function FabProvider({ children }) {
  const [contextAction, setContextActionRaw] = useState(null);

  const setContextAction = useCallback((action) => {
    setContextActionRaw(action);
  }, []);

  const clearContextAction = useCallback(() => {
    setContextActionRaw(null);
  }, []);

  return (
    <FabContext.Provider value={{ contextAction, setContextAction, clearContextAction }}>
      {children}
    </FabContext.Provider>
  );
}

export function useFabContext() {
  return useContext(FabContext);
}
