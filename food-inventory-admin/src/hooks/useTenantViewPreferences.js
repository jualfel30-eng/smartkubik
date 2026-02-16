import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Hook para manejar las preferencias de vista de productos en órdenes
 * Lee la configuración del tenant y permite actualizarla
 */
const useTenantViewPreferences = () => {
  // Initialize from localStorage for instant result
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('tenant_view_prefs');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse view prefs', e);
    }
    return {
      productViewType: 'search', // 'search' | 'grid' | 'list'
      gridColumns: 3,
      showProductImages: true,
      showProductDescription: false,
      enableCategoryFilter: true,
    };
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener el tenant del localStorage
  const getTenantId = useCallback(() => {
    try {
      const tenantStr = localStorage.getItem('tenant');
      if (tenantStr && tenantStr !== 'undefined') {
        const tenant = JSON.parse(tenantStr);
        return tenant.id || tenant._id;
      }
    } catch (err) {
      console.error('Error parsing tenant:', err);
    }
    return null;
  }, []);

  // Cargar preferencias del tenant (Sync with Backend)
  const loadPreferences = useCallback(async () => {
    const tenantId = getTenantId();
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/tenant/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const tenantSettings = response.data?.data?.orders || {};

      // Get current local preference to compare
      let localPrefs = {};
      try {
        const local = localStorage.getItem('tenant_view_prefs');
        if (local) localPrefs = JSON.parse(local);
      } catch (e) { }

      const newPrefs = {
        productViewType: localPrefs.productViewType || tenantSettings.productViewType || 'search',
        gridColumns: tenantSettings.gridColumns || 3,
        showProductImages: tenantSettings.showProductImages !== false,
        showProductDescription: tenantSettings.showProductDescription || false,
        enableCategoryFilter: tenantSettings.enableCategoryFilter !== false,
      };

      setPreferences(newPrefs);
      // Sync backend source of truth to local storage
      localStorage.setItem('tenant_view_prefs', JSON.stringify(newPrefs));

      setError(null);
    } catch (err) {
      console.error('Error loading tenant preferences:', err);
      // On error, we rely on the initial localStorage value, so we don't break UI
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getTenantId]);

  // Actualizar preferencias
  const updatePreferences = useCallback(async (newPreferences) => {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new Error('No tenant ID found');
    }

    // 1. Optimistic Update (Instant)
    setPreferences(prev => {
      const next = { ...prev, ...newPreferences };
      localStorage.setItem('tenant_view_prefs', JSON.stringify(next));
      return next;
    });

    try {
      const token = localStorage.getItem('accessToken');

      // Primero obtenemos la configuración actual completa
      const currentResponse = await axios.get(`${API_BASE_URL}/tenant/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const currentSettings = currentResponse.data?.data || {};
      const currentOrders = currentSettings.orders || {};

      // Actualizamos solo la sección de orders con las nuevas preferencias
      await axios.put(
        `${API_BASE_URL}/tenant/settings`,
        {
          settings: {
            ...currentSettings,
            orders: {
              ...currentOrders,
              ...newPreferences,
            }
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setError(null);
      return true;
    } catch (err) {
      console.error('Error updating tenant preferences:', err);
      setError(err.message);
      // Start silent rollback or just warn? For UX, we usually keep the optimistic state unless critical
      throw err;
    }
  }, [getTenantId]);

  // Cambiar vista (shortcut)
  const setViewType = useCallback((viewType) => {
    return updatePreferences({ productViewType: viewType });
  }, [updatePreferences]);

  // Cargar preferencias al montar
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    setViewType,
    reload: loadPreferences,
  };
};

export default useTenantViewPreferences;
