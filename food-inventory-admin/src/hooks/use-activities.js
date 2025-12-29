import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';

export function useActivities(opportunityId = null) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (opportunityId) {
        params.append('opportunityId', opportunityId);
      }
      params.append('limit', '50');

      const response = await fetchApi(`/activities?${params.toString()}`);
      setActivities(response.data || []);
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar actividades', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const createActivity = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await fetchApi('/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast.success('Actividad creada', {
        description: 'La actividad se ha registrado correctamente'
      });

      await fetchActivities();
      return response.data;
    } catch (err) {
      toast.error('Error al crear actividad', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActivities]);

  const updateActivity = useCallback(async (id, data) => {
    setLoading(true);
    try {
      const response = await fetchApi(`/activities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      toast.success('Actividad actualizada');
      await fetchActivities();
      return response.data;
    } catch (err) {
      toast.error('Error al actualizar actividad', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActivities]);

  const markAsCompleted = useCallback(async (id) => {
    setLoading(true);
    try {
      await fetchApi(`/activities/${id}/complete`, {
        method: 'POST',
      });

      toast.success('Tarea completada');
      await fetchActivities();
    } catch (err) {
      toast.error('Error al completar tarea', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActivities]);

  const deleteActivity = useCallback(async (id) => {
    setLoading(true);
    try {
      await fetchApi(`/activities/${id}`, {
        method: 'DELETE',
      });

      toast.success('Actividad eliminada');
      await fetchActivities();
    } catch (err) {
      toast.error('Error al eliminar actividad', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    createActivity,
    updateActivity,
    markAsCompleted,
    deleteActivity,
  };
}
