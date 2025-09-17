import { createContext, useState, useCallback, useEffect, useContext } from 'react';
import { fetchApi } from '@/lib/api';

// 1. Crear el Contexto
const CrmContext = createContext();

// 2. Crear el Proveedor del Contexto
export const CrmProvider = ({ children }) => {
  const [crmData, setCrmData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCustomers = useCallback(async () => {
    console.log('[CrmContext] Ejecutando loadCustomers...');
    try {
      setLoading(true);
      const response = await fetchApi('/customers?limit=100');
      console.log('[CrmContext] Datos de clientes recibidos del backend:', response.data);
      if (response.data) {
        setCrmData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch customers');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const addCustomer = async (customerData) => {
    try {
      const response = await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
      await loadCustomers(); // Recargar
      return response;
    } catch (err) {
      console.error("Error adding customer:", err);
      throw err;
    }
  };

  const updateCustomer = async (customerId, customerData) => {
    try {
      const response = await fetchApi(`/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify(customerData),
      });
      await loadCustomers(); // Recargar
      return response;
    } catch (err) {
      console.error("Error updating customer:", err);
      throw err;
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      await fetchApi(`/customers/${customerId}`, { method: 'DELETE' });
      setCrmData(prev => prev.filter(c => c._id !== customerId)); // Actualización optimista
    } catch (err) {
      console.error("Error deleting customer:", err);
      throw err;
    }
  };

  const value = {
    crmData,
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
