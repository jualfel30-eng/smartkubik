import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';

export function usePlaybooks() {
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlaybooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/playbooks');
      setPlaybooks(response.data || []);
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar playbooks', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  const createPlaybook = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await fetchApi('/playbooks', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast.success('Playbook creado', {
        description: 'El playbook se ha creado correctamente'
      });

      await fetchPlaybooks();
      return response.data;
    } catch (err) {
      toast.error('Error al crear playbook', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPlaybooks]);

  const updatePlaybook = useCallback(async (id, data) => {
    setLoading(true);
    try {
      const response = await fetchApi(`/playbooks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      toast.success('Playbook actualizado', {
        description: 'Los cambios se han guardado correctamente'
      });

      await fetchPlaybooks();
      return response.data;
    } catch (err) {
      toast.error('Error al actualizar playbook', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPlaybooks]);

  const deletePlaybook = useCallback(async (id) => {
    setLoading(true);
    try {
      await fetchApi(`/playbooks/${id}`, {
        method: 'DELETE',
      });

      toast.success('Playbook eliminado', {
        description: 'El playbook se ha eliminado correctamente'
      });

      await fetchPlaybooks();
    } catch (err) {
      toast.error('Error al eliminar playbook', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPlaybooks]);

  const executePlaybook = useCallback(async (id, opportunityId) => {
    setLoading(true);
    try {
      await fetchApi(`/playbooks/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ opportunityId }),
      });

      toast.success('Playbook ejecutado', {
        description: 'La secuencia se ha programado correctamente'
      });
    } catch (err) {
      toast.error('Error al ejecutar playbook', {
        description: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    playbooks,
    loading,
    error,
    refetch: fetchPlaybooks,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
    executePlaybook,
  };
}
