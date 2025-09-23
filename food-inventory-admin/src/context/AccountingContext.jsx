import React, { createContext, useState, useContext, useCallback } from 'react';

const AccountingContext = createContext(null);

export const useAccountingContext = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccountingContext must be used within an AccountingProvider');
  }
  return context;
};

export const AccountingProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    console.log('[AccountingContext] Triggering refresh...');
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  const value = {
    refreshKey,
    triggerRefresh,
  };

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
};
