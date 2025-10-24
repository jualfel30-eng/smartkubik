import { useState, useCallback, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { createScopedLogger } from '@/lib/logger';

const logger = createScopedLogger('use-orders');

export const useOrders = () => {
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { loadCustomers } = useCrmContext(); // Obtener la función para recargar clientes

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi('/orders');
      setOrdersData(data.orders || data || []);
    } catch (err) {
      setError(err.message);
      setOrdersData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const addOrder = async (orderData) => {
    try {
      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      await loadOrders();
      await loadCustomers(); // << RECARGAR DATOS DEL CRM
    } catch (err) {
      logger.error('Failed to add order', { error: err?.message ?? err });
      throw err;
    }
  };

  const updateOrder = async (orderId, orderData) => {
    try {
      await fetchApi(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(orderData),
      });
      await loadOrders();
      await loadCustomers(); // << RECARGAR DATOS DEL CRM
    } catch (err) {
      logger.error('Failed to update order', { error: err?.message ?? err });
      throw err;
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await fetchApi(`/orders/${orderId}`, { method: 'DELETE' });
      setOrdersData(prev => prev.filter(o => o._id !== orderId));
      // No es necesario recargar clientes aquí si la orden se elimina por completo
      // a menos que la eliminación de una orden también afecte las métricas.
      // Por ahora, lo dejamos así para consistencia.
      await loadCustomers();
    } catch (err) {
      logger.error('Failed to delete order', { error: err?.message ?? err });
      throw err;
    }
  };

  return { 
    ordersData, 
    loading, 
    error, 
    addOrder, 
    updateOrder, 
    deleteOrder, 
    loadOrders, // <-- Add this
  };
};
