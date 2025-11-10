import { createContext, useState, useCallback, useContext, useRef } from 'react';
import { fetchApi } from '@/lib/api';

// 1. Crear el Contexto
export const CrmContext = createContext();

// 2. Crear el Proveedor del Contexto
export const CrmProvider = ({ children }) => {
  const [crmData, setCrmData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]); // New state for payment methods
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const lastQueryRef = useRef({
    page: 1,
    limit: 25,
    filters: {},
  });

  const extractCustomers = (payload) => {
    const candidates = [
      payload,
      payload?.data,
      payload?.data?.customers,
      payload?.customers,
      payload?.data?.data,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  };

  const mergeUniqueCustomers = (...lists) => {
    const map = new Map();
    lists.flat().forEach((customer) => {
      if (customer && customer._id) {
        map.set(customer._id, customer);
      }
    });
    return Array.from(map.values());
  };

  const loadCustomers = useCallback(async (page = 1, limit = 25, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.search && filters.search.trim() !== '') {
        params.set('search', filters.search.trim());
      }
      if (filters.customerType && filters.customerType !== 'all') {
        params.set('customerType', filters.customerType);
      }
      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters.assignedTo) {
        params.set('assignedTo', filters.assignedTo);
      }

      const response = await fetchApi(`/customers?${params.toString()}`);

      setCrmData(response.data?.customers || response.data || []);
      setTotalCustomers(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 0);
      setCurrentPage(page);
      setPageLimit(limit);
      lastQueryRef.current = {
        page,
        limit,
        filters: { ...filters },
      };
    } catch (err) {
      console.error("Error loading customers:", err.message);
      setCrmData([]);
      setTotalCustomers(0);
      setTotalPages(0);
      setError(err.message);
    } finally {
      setLoading(false);
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

  // REMOVED AUTO-LOAD: Components now call loadCustomers() manually when needed
  // This prevents loading 1000s of customer records on every page load
  // Performance improvement: ~2-3 seconds saved on initial load

  const addCustomer = async (customerData) => {
    try {
      await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
      const { page, limit, filters } = lastQueryRef.current;
      await loadCustomers(page ?? 1, limit ?? 25, filters ?? {});
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
      const { page, limit, filters } = lastQueryRef.current;
      await loadCustomers(page ?? 1, limit ?? 25, filters ?? {});
    } catch (err) {
      console.error("Error updating customer:", err);
      throw err;
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      await fetchApi(`/customers/${customerId}`, { method: 'DELETE' });
      const { page, limit, filters } = lastQueryRef.current;
      await loadCustomers(page ?? 1, limit ?? 25, filters ?? {}); // Recargar
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
    currentPage,
    pageLimit,
    totalCustomers,
    totalPages,
    setCurrentPage,
    setPageLimit,
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
