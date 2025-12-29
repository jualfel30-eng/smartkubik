import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Hook para gestionar calendarios del ERP
 * Permite listar, crear, actualizar, eliminar y sincronizar calendarios con Google
 */
export function useCalendars() {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtener todos los calendarios visibles para el usuario
  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/calendars');
      setCalendars(response.data || []);
      return response.data || [];
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar calendarios', {
        description: err.message
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear nuevo calendario
  const createCalendar = useCallback(async (calendarData) => {
    setLoading(true);
    try {
      const response = await fetchApi('/calendars', {
        method: 'POST',
        body: JSON.stringify(calendarData),
      });

      toast.success('Calendario creado', {
        description: `El calendario "${calendarData.name}" ha sido creado exitosamente`
      });

      await fetchCalendars(); // Refrescar lista
      return response.data;
    } catch (err) {
      toast.error('Error al crear calendario', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCalendars]);

  // Actualizar calendario existente
  const updateCalendar = useCallback(async (id, calendarData) => {
    setLoading(true);
    try {
      const response = await fetchApi(`/calendars/${id}`, {
        method: 'PUT',
        body: JSON.stringify(calendarData),
      });

      toast.success('Calendario actualizado', {
        description: 'Los cambios han sido guardados'
      });

      await fetchCalendars(); // Refrescar lista
      return response.data;
    } catch (err) {
      toast.error('Error al actualizar calendario', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCalendars]);

  // Eliminar calendario
  const deleteCalendar = useCallback(async (id) => {
    setLoading(true);
    try {
      await fetchApi(`/calendars/${id}`, {
        method: 'DELETE',
      });

      toast.success('Calendario eliminado', {
        description: 'El calendario ha sido eliminado permanentemente'
      });

      await fetchCalendars(); // Refrescar lista
    } catch (err) {
      toast.error('Error al eliminar calendario', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCalendars]);

  // Sincronizar calendario con Google Calendar
  const syncCalendarWithGoogle = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await fetchApi(`/calendars/${id}/sync-google`, {
        method: 'POST',
      });

      toast.success('Calendario sincronizado', {
        description: 'El calendario ha sido creado en Google Calendar'
      });

      await fetchCalendars(); // Refrescar lista
      return response.data;
    } catch (err) {
      toast.error('Error al sincronizar calendario', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCalendars]);

  // Configurar sincronización bidireccional (solo admin)
  const setupBidirectionalSync = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await fetchApi(`/calendars/${id}/setup-watch`, {
        method: 'POST',
      });

      toast.success('Sincronización bidireccional activada', {
        description: 'Los cambios en Google Calendar se reflejarán automáticamente en el ERP'
      });

      await fetchCalendars(); // Refrescar lista
      return response.data;
    } catch (err) {
      toast.error('Error al configurar sincronización bidireccional', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCalendars]);

  // Sincronizar eventos desde Google hacia el ERP manualmente
  const syncFromGoogle = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await fetchApi(`/calendars/${id}/sync-from-google`, {
        method: 'POST',
      });

      toast.success('Eventos sincronizados', {
        description: `${response.data.synced} eventos importados desde Google Calendar`
      });

      await fetchCalendars(); // Refrescar lista
      return response.data;
    } catch (err) {
      toast.error('Error al sincronizar desde Google', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCalendars]);

  // Cargar calendarios al montar el componente
  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  return {
    calendars,
    loading,
    error,
    refetch: fetchCalendars,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    syncCalendarWithGoogle,
    setupBidirectionalSync,
    syncFromGoogle,
  };
}
