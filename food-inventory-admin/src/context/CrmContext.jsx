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
    console.log('[CrmContext] Ejecutando loadCustomers...');
    const { data, error } = await fetchApi('/customers?limit=100');

    if (error) {
      console.error("Error loading customers:", error);
      return;
    }
    
    console.log('[CrmContext] Datos de clientes recibidos del backend:', data);
    setCrmData(data.data || []);
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    console.log('[CrmContext] Ejecutando loadPaymentMethods...');
    const { data, error } = await fetchApi('/orders/__lookup/payment-methods');

    if (error) {
      console.error("Error loading payment methods:", error);
      return;
    }

    if (data && data.methods) {
      setPaymentMethods(data.methods);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([loadCustomers(), loadPaymentMethods()]);
      setLoading(false);
    }
    loadInitialData();
  }, [loadCustomers, loadPaymentMethods]);

  const addCustomer = async (customerData) => {
    const { data, error } = await fetchApi('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });

    if (error) {
      console.error("Error adding customer:", error);
      throw error;
    }

    await loadCustomers(); // Recargar
    return data;
  };

  const updateCustomer = async (customerId, customerData) => {
    const { data, error } = await fetchApi(`/customers/${customerId}`, {
      method: 'PATCH',
      body: JSON.stringify(customerData),
    });

    if (error) {
      console.error("Error updating customer:", error);
      throw error;
    }

    await loadCustomers(); // Recargar
    return data;
  };

  const deleteCustomer = async (customerId) => {
    const { error } = await fetchApi(`/customers/${customerId}`, { method: 'DELETE' });

    if (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }

    setCrmData(prev => prev.filter(c => c._id !== customerId)); // Actualización optimista
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