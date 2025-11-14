import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useQualityControl = () => {
  const [qcPlans, setQcPlans] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [nonConformances, setNonConformances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==================== QC PLANS ====================

  const loadQCPlans = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/quality-control/plans${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setQcPlans(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setQcPlans([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getQCPlan = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/quality-control/plans/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createQCPlan = async (planData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/quality-control/plans', {
        method: 'POST',
        body: JSON.stringify(planData),
      });
      await loadQCPlans();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateQCPlan = async (id, planData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/quality-control/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(planData),
      });
      await loadQCPlans();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteQCPlan = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/quality-control/plans/${id}`, { method: 'DELETE' });
      setQcPlans(prev => prev.filter(plan => plan._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getQCPlansForProduct = async (productId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/quality-control/plans/product/${productId}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== INSPECTIONS ====================

  const loadInspections = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/quality-control/inspections${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setInspections(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setInspections([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getInspection = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/quality-control/inspections/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createInspection = async (inspectionData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/quality-control/inspections', {
        method: 'POST',
        body: JSON.stringify(inspectionData),
      });
      await loadInspections();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const recordInspectionResult = async (inspectionId, results) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/quality-control/inspections/${inspectionId}/results`, {
        method: 'POST',
        body: JSON.stringify({ results }),
      });
      await loadInspections();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== NON-CONFORMANCES ====================

  const loadNonConformances = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/quality-control/non-conformances${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setNonConformances(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setNonConformances([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createNonConformance = async (ncData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/quality-control/non-conformances', {
        method: 'POST',
        body: JSON.stringify(ncData),
      });
      await loadNonConformances();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateNonConformance = async (id, ncData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/quality-control/non-conformances/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(ncData),
      });
      await loadNonConformances();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== CERTIFICATE OF ANALYSIS ====================

  const generateCoA = async (lotNumber) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/quality-control/coa/${lotNumber}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // QC Plans
    qcPlans,
    loadQCPlans,
    getQCPlan,
    createQCPlan,
    updateQCPlan,
    deleteQCPlan,
    getQCPlansForProduct,

    // Inspections
    inspections,
    loadInspections,
    getInspection,
    createInspection,
    recordInspectionResult,

    // Non-Conformances
    nonConformances,
    loadNonConformances,
    createNonConformance,
    updateNonConformance,

    // CoA
    generateCoA,

    // Common
    loading,
    error,
  };
};
