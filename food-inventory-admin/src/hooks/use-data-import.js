import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  uploadImportFile,
  getImportFieldDefinitions,
  getImportPresets,
  downloadImportTemplate,
  updateImportMapping,
  validateImportJob,
  executeImportJob,
  getImportJob,
  getImportErrors,
  downloadImportErrors,
  getImportHistory,
  rollbackImport,
  deleteImportJob,
} from '../lib/api';

export function useDataImport() {
  const [importJob, setImportJob] = useState(null);
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [presets, setPresets] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [history, setHistory] = useState({ data: [], pagination: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file, entityType, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      if (options.mappingPreset) formData.append('mappingPreset', options.mappingPreset);
      if (options.updateExisting !== undefined) formData.append('updateExisting', options.updateExisting);
      if (options.skipErrors !== undefined) formData.append('skipErrors', options.skipErrors);

      const result = await uploadImportFile(formData);
      setImportJob(result.data);
      toast.success(`Archivo cargado: ${result.data.totalRows} filas detectadas`);
      return result.data;
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar archivo', { description: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFieldDefinitions = useCallback(async (entityType) => {
    try {
      const result = await getImportFieldDefinitions(entityType);
      setFieldDefinitions(result.data || []);
      return result.data;
    } catch (err) {
      console.error('Error loading field definitions:', err);
      return [];
    }
  }, []);

  const loadPresets = useCallback(async (entityType) => {
    try {
      const result = await getImportPresets(entityType);
      setPresets(result.data || []);
      return result.data;
    } catch (err) {
      console.error('Error loading presets:', err);
      return [];
    }
  }, []);

  const downloadTemplate = useCallback(async (entityType, preset) => {
    try {
      setLoading(true);
      await downloadImportTemplate(entityType, preset);
      toast.success('Plantilla descargada');
    } catch (err) {
      toast.error('Error al descargar plantilla', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMapping = useCallback(async (jobId, columnMapping, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      await updateImportMapping(jobId, columnMapping, options);
      toast.success('Mapeo guardado');
      return true;
    } catch (err) {
      setError(err.message);
      toast.error('Error al guardar mapeo', { description: err.message });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const validate = useCallback(async (jobId) => {
    try {
      setLoading(true);
      setError(null);
      const result = await validateImportJob(jobId);
      setValidationResult(result.data);
      const { summary } = result.data;
      toast.success(
        `Validación completa: ${summary.valid} válidos, ${summary.errors} errores`,
      );
      return result.data;
    } catch (err) {
      setError(err.message);
      toast.error('Error al validar datos', { description: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const execute = useCallback(async (jobId) => {
    try {
      setLoading(true);
      setError(null);
      const result = await executeImportJob(jobId);
      setExecutionResult(result.data);
      if (result.data.queued) {
        toast.info('Importación encolada para procesamiento en segundo plano');
      } else {
        toast.success(
          `Importación completada: ${result.data.created} creados, ${result.data.updated} actualizados`,
        );
      }
      return result.data;
    } catch (err) {
      setError(err.message);
      toast.error('Error al ejecutar importación', { description: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshJob = useCallback(async (jobId) => {
    try {
      const result = await getImportJob(jobId);
      setImportJob(result.data);
      return result.data;
    } catch (err) {
      console.error('Error refreshing job:', err);
      return null;
    }
  }, []);

  const fetchErrors = useCallback(async (jobId) => {
    try {
      const result = await getImportErrors(jobId);
      return result.data;
    } catch (err) {
      console.error('Error fetching errors:', err);
      return { errors: [], totalErrors: 0 };
    }
  }, []);

  const downloadErrors = useCallback(async (jobId) => {
    try {
      await downloadImportErrors(jobId);
      toast.success('Reporte de errores descargado');
    } catch (err) {
      toast.error('Error al descargar reporte', { description: err.message });
    }
  }, []);

  const loadHistory = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const result = await getImportHistory(params);
      setHistory({ data: result.data || [], pagination: result.pagination || {} });
      return result;
    } catch (err) {
      console.error('Error loading history:', err);
      setHistory({ data: [], pagination: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  const rollback = useCallback(async (jobId) => {
    try {
      setLoading(true);
      const result = await rollbackImport(jobId);
      toast.success(
        `Importación revertida: ${result.data.deleted} registros eliminados`,
      );
      return result.data;
    } catch (err) {
      toast.error('Error al revertir importación', { description: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteJob = useCallback(async (jobId) => {
    try {
      await deleteImportJob(jobId);
      toast.success('Trabajo eliminado');
    } catch (err) {
      toast.error('Error al eliminar trabajo', { description: err.message });
    }
  }, []);

  const reset = useCallback(() => {
    setImportJob(null);
    setFieldDefinitions([]);
    setPresets([]);
    setValidationResult(null);
    setExecutionResult(null);
    setError(null);
  }, []);

  return {
    importJob,
    fieldDefinitions,
    presets,
    validationResult,
    executionResult,
    history,
    loading,
    error,
    upload,
    loadFieldDefinitions,
    loadPresets,
    downloadTemplate,
    saveMapping,
    validate,
    execute,
    refreshJob,
    fetchErrors,
    downloadErrors,
    loadHistory,
    rollback,
    deleteJob,
    reset,
  };
}
