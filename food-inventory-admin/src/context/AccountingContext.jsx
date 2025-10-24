import React, { createContext, useState, useContext, useCallback } from 'react';
import { createScopedLogger } from '@/lib/logger';

const logger = createScopedLogger('accounting-context');

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
    logger.debug('Triggering refresh');
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
