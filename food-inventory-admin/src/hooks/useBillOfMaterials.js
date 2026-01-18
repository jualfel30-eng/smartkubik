import { useState, useCallback } from 'react';
import {
  getBillOfMaterials,
  getBillOfMaterialsById,
  getBillOfMaterialsByProduct,
  createBillOfMaterials,
  updateBillOfMaterials,
  deleteBillOfMaterials,
  calculateBillOfMaterialsCost,
  checkBillOfMaterialsAvailability,
  explodeBillOfMaterials,
  getBillOfMaterialsStructure
} from '@/lib/api';

export const useBillOfMaterials = () => {
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBoms = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBillOfMaterials(params);
      setBoms(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setBoms([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBom = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBillOfMaterialsById(id);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBomByProduct = useCallback(async (productId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBillOfMaterialsByProduct(productId);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBom = async (bomData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await createBillOfMaterials(bomData);
      await loadBoms();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBom = async (id, bomData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await updateBillOfMaterials(id, bomData);
      await loadBoms();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBom = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await deleteBillOfMaterials(id);
      setBoms(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await calculateBillOfMaterialsCost(id);
      return response.data?.cost ?? 0;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAvailability = useCallback(async (id, quantity) => {
    try {
      setLoading(true);
      setError(null);
      const response = await checkBillOfMaterialsAvailability(id, quantity);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const explodeBom = useCallback(async (id, quantity) => {
    try {
      setLoading(true);
      setError(null);
      const response = await explodeBillOfMaterials(id, quantity);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStructure = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBillOfMaterialsStructure(id);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    boms,
    loading,
    error,
    loadBoms,
    getBom,
    getBomByProduct,
    createBom,
    updateBom,
    deleteBom,
    calculateTotalCost,
    checkAvailability,
    explodeBom,
    getStructure
  };
};

