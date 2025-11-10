import { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

const FeatureFlagsContext = createContext(null);

const STORAGE_KEY = 'featureFlags';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en ms

/**
 * Proveedor de Feature Flags
 *
 * Este componente carga los feature flags desde el backend y los cachea
 * en localStorage por 5 minutos. Esto permite hot-reload sin rebuild.
 */
export const FeatureFlagsProvider = ({ children }) => {
  const [flags, setFlags] = useState(() => {
    // Intentar cargar desde cache
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Si el cache es válido (menos de 5 minutos), usarlo
        if (now - timestamp < CACHE_DURATION) {
          console.log('📦 Using cached feature flags:', data);
          return data;
        } else {
          console.log('⏰ Cache expired, will fetch from backend');
        }
      } else {
        console.log('🆕 No cache found, will fetch from backend');
      }
    } catch (error) {
      console.error('Error loading feature flags from cache:', error);
    }

    // Fallback a variables de entorno mientras carga
    const envFlags = {
      EMPLOYEE_PERFORMANCE_TRACKING: import.meta.env.VITE_ENABLE_EMPLOYEE_PERFORMANCE === 'true',
      BANK_ACCOUNTS_MOVEMENTS: import.meta.env.VITE_ENABLE_BANK_MOVEMENTS === 'true',
      BANK_ACCOUNTS_RECONCILIATION: import.meta.env.VITE_ENABLE_BANK_RECONCILIATION === 'true',
      BANK_ACCOUNTS_TRANSFERS: import.meta.env.VITE_ENABLE_BANK_TRANSFERS === 'true',
      DASHBOARD_CHARTS: import.meta.env.VITE_ENABLE_DASHBOARD_CHARTS === 'true',
      ADVANCED_REPORTS: import.meta.env.VITE_ENABLE_ADVANCED_REPORTS === 'true',
      PREDICTIVE_ANALYTICS: import.meta.env.VITE_ENABLE_PREDICTIVE_ANALYTICS === 'true',
      CUSTOMER_SEGMENTATION: import.meta.env.VITE_ENABLE_CUSTOMER_SEGMENTATION === 'true',
      MULTI_TENANT_LOGIN: import.meta.env.VITE_ENABLE_MULTI_TENANT_LOGIN === 'true',
      SERVICE_BOOKING_PORTAL: import.meta.env.VITE_ENABLE_SERVICE_BOOKING_PORTAL === 'true',
      APPOINTMENT_REMINDERS: import.meta.env.VITE_ENABLE_APPOINTMENT_REMINDERS === 'true',
    };
    console.log('🔧 Using env vars as initial flags:', envFlags);
    return envFlags;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFeatureFlags = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('📡 Fetching feature flags from backend...');
        const response = await fetchApi('/feature-flags');
        console.log('📦 Backend response:', response);

        if (response?.data) {
          const newFlags = response.data;

          // Guardar en cache
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            data: newFlags,
            timestamp: Date.now()
          }));

          setFlags(newFlags);

          // Log en desarrollo
          console.log('🎛️  Feature Flags loaded from backend:', newFlags);
          console.log('✅ DASHBOARD_CHARTS flag:', newFlags.DASHBOARD_CHARTS);
        } else {
          console.warn('⚠️ No data in response:', response);
        }
      } catch (err) {
        console.error('❌ Error loading feature flags from backend:', err);
        setError(err.message);

        // En caso de error, mantener los flags actuales (cache o env vars)
      } finally {
        setLoading(false);
      }
    };

    loadFeatureFlags();

    // Recargar cada 5 minutos
    const interval = setInterval(loadFeatureFlags, CACHE_DURATION);

    return () => clearInterval(interval);
  }, []);

  const isFeatureEnabled = (featureName) => {
    return flags[featureName] === true;
  };

  const value = {
    flags,
    loading,
    error,
    isFeatureEnabled,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

/**
 * Hook para acceder a los feature flags
 *
 * @returns {Object} - { flags, loading, error, isFeatureEnabled }
 */
export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }

  return context;
};

/**
 * Limpia el caché de feature flags (útil para debugging)
 */
export const clearFeatureFlagsCache = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Feature flags cache cleared. Reload the page to fetch fresh flags.');
};

// Exponer función en window para debugging en consola
if (typeof window !== 'undefined') {
  window.clearFeatureFlagsCache = clearFeatureFlagsCache;
}

/**
 * Función helper standalone (compatible con código existente)
 */
export const isFeatureEnabled = (featureName) => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp < CACHE_DURATION) {
        return data[featureName] === true;
      }
    }
  } catch (error) {
    console.error('Error checking feature flag:', error);
  }

  // Fallback a variable de entorno
  const envMap = {
    EMPLOYEE_PERFORMANCE_TRACKING: 'VITE_ENABLE_EMPLOYEE_PERFORMANCE',
    BANK_ACCOUNTS_MOVEMENTS: 'VITE_ENABLE_BANK_MOVEMENTS',
    BANK_ACCOUNTS_RECONCILIATION: 'VITE_ENABLE_BANK_RECONCILIATION',
    BANK_ACCOUNTS_TRANSFERS: 'VITE_ENABLE_BANK_TRANSFERS',
    DASHBOARD_CHARTS: 'VITE_ENABLE_DASHBOARD_CHARTS',
    ADVANCED_REPORTS: 'VITE_ENABLE_ADVANCED_REPORTS',
    PREDICTIVE_ANALYTICS: 'VITE_ENABLE_PREDICTIVE_ANALYTICS',
    CUSTOMER_SEGMENTATION: 'VITE_ENABLE_CUSTOMER_SEGMENTATION',
    MULTI_TENANT_LOGIN: 'VITE_ENABLE_MULTI_TENANT_LOGIN',
    SERVICE_BOOKING_PORTAL: 'VITE_ENABLE_SERVICE_BOOKING_PORTAL',
    APPOINTMENT_REMINDERS: 'VITE_ENABLE_APPOINTMENT_REMINDERS',
  };

  const envVar = envMap[featureName];
  return envVar ? import.meta.env[envVar] === 'true' : false;
};
