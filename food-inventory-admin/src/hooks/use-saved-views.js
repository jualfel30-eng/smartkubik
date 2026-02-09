import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * Hook for managing saved analytics views (Phase 3)
 * Handles CRUD operations for saved views and templates
 */
export function useSavedViews() {
  const [views, setViews] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load saved views and templates
  const loadViews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [viewsRes, templatesRes] = await Promise.all([
        fetchApi('/analytics/saved-views'),
        fetchApi('/analytics/saved-views/templates'),
      ]);

      setViews(viewsRes?.data || []);
      setTemplates(templatesRes?.data || []);
    } catch (err) {
      setError(err?.message || 'Error al cargar vistas guardadas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new saved view
  const createView = useCallback(async (data) => {
    try {
      const res = await fetchApi('/analytics/saved-views', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res?.success) {
        await loadViews(); // Reload views
        return { success: true, data: res.data };
      }

      return { success: false, error: 'Failed to create view' };
    } catch (err) {
      return { success: false, error: err?.message || 'Error al crear vista' };
    }
  }, [loadViews]);

  // Update an existing saved view
  const updateView = useCallback(async (id, data) => {
    try {
      const res = await fetchApi(`/analytics/saved-views/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res?.success) {
        await loadViews(); // Reload views
        return { success: true, data: res.data };
      }

      return { success: false, error: 'Failed to update view' };
    } catch (err) {
      return { success: false, error: err?.message || 'Error al actualizar vista' };
    }
  }, [loadViews]);

  // Delete a saved view
  const deleteView = useCallback(async (id) => {
    try {
      const res = await fetchApi(`/analytics/saved-views/${id}`, {
        method: 'DELETE',
      });

      if (res?.success) {
        await loadViews(); // Reload views
        return { success: true };
      }

      return { success: false, error: 'Failed to delete view' };
    } catch (err) {
      return { success: false, error: err?.message || 'Error al eliminar vista' };
    }
  }, [loadViews]);

  // Load views on mount
  useEffect(() => {
    loadViews();
  }, [loadViews]);

  return {
    views,
    templates,
    loading,
    error,
    createView,
    updateView,
    deleteView,
    reload: loadViews,
  };
}
