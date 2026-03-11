import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getBusinessLocations } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

const BusinessLocationContext = createContext(null);

const STORAGE_KEY = 'smartkubik_active_location';

export const BusinessLocationProvider = ({ children }) => {
  const [locations, setLocations] = useState([]);
  const [activeLocationId, setActiveLocationId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, tenant } = useAuth();

  const fetchLocations = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await getBusinessLocations({ isActive: true });
      const data = Array.isArray(response) ? response : response?.data || [];
      setLocations(data);

      // If the stored activeLocationId is not in the list, reset it
      if (data.length > 0) {
        const storedId = localStorage.getItem(STORAGE_KEY);
        const isValid = data.some((loc) => (loc._id || loc.id) === storedId);
        if (!isValid) {
          const firstId = data[0]._id || data[0].id;
          setActiveLocationId(firstId);
          localStorage.setItem(STORAGE_KEY, firstId);
        }
      } else {
        setActiveLocationId(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations, tenant?._id]);

  const switchLocation = useCallback((locationId) => {
    setActiveLocationId(locationId);
    if (locationId) {
      localStorage.setItem(STORAGE_KEY, locationId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activeLocation = locations.find(
    (loc) => (loc._id || loc.id) === activeLocationId,
  ) || null;

  const value = {
    locations,
    activeLocationId,
    activeLocation,
    isLoading,
    switchLocation,
    refreshLocations: fetchLocations,
  };

  return (
    <BusinessLocationContext.Provider value={value}>
      {children}
    </BusinessLocationContext.Provider>
  );
};

export const useBusinessLocation = () => {
  const context = useContext(BusinessLocationContext);
  if (!context) {
    throw new Error('useBusinessLocation must be used within a BusinessLocationProvider');
  }
  return context;
};
