'use client';

import { createContext, useContext } from 'react';
import { RestaurantConfig } from '@/types';

interface RestaurantContextValue {
  config: RestaurantConfig | null;
  tenantId: string;
}

const RestaurantContext = createContext<RestaurantContextValue>({
  config: null,
  tenantId: '',
});

export function RestaurantProvider({
  children,
  config,
  tenantId,
}: {
  children: React.ReactNode;
  config: RestaurantConfig | null;
  tenantId: string;
}) {
  return (
    <RestaurantContext.Provider value={{ config, tenantId }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}
