import { createContext, useState, useCallback, useEffect, useContext } from 'react';
import { fetchApi } from '@/lib/api';

// 1. Crear el Contexto
export const CrmContext = createContext();

// 2. Crear el Proveedor del Contexto
export const CrmProvider = ({ children }) => {
  const [crmData, setCrmData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]); // New state for payment methods
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await fetchApi('/customers?limit=100');
      setCrmData(data.data || []);
    } catch (err) {
      console.error("Error loading customers:", err.message);
      setCrmData([]);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const data = await fetchApi('/orders/__lookup/payment-methods');
      setPaymentMethods(data.data.methods || []);
    } catch (err) {
      console.error("Error loading payment methods:", err.message);
      setPaymentMethods([]);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadCustomers(), loadPaymentMethods()]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [loadCustomers, loadPaymentMethods]);

  const addCustomer = async (customerData) => {
    try {
      await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
      await loadCustomers();
    } catch (err) {
      console.error("Error adding customer:", err);
      throw err;
    }
  };

  const updateCustomer = async (customerId, customerData) => {
    try {
      await fetchApi(`/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify(customerData),
      });
      await loadCustomers();
    } catch (err) {
      console.error("Error updating customer:", err);
      throw err;
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      await fetchApi(`/customers/${customerId}`, { method: 'DELETE' });
      await loadCustomers(); // Recargar
    } catch (err) {
      console.error("Error deleting customer:", err);
      throw err;
    }
  };

  const value = {
    crmData,
    paymentMethods, // Export payment methods
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loadCustomers,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
};

// 3. Crear un hook personalizado para usar el contexto
export const useCrmContext = () => {
  const context = useContext(CrmContext);
  if (context === undefined) {
    throw new Error('useCrmContext must be used within a CrmProvider');
  }
  return context;
};