import { useState, useCallback, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useCrmContext } from '@/context/CrmContext.jsx';

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

  const addOrder = async (orderData, cashRegisterInfo = null) => {
    try {
      // Si hay info de caja, agregarla a los datos de la orden
      const orderWithCashRegister = cashRegisterInfo
        ? {
          ...orderData,
          cashSessionId: cashRegisterInfo.sessionId,
          cashRegisterId: cashRegisterInfo.registerId,
        }
        : orderData;

      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(orderWithCashRegister),
      });
      await loadOrders();
      await loadCustomers(); // << RECARGAR DATOS DEL CRM
    } catch (err) {
      console.error("Error adding order:", err);
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
      console.error("Error updating order:", err);
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
      console.error("Error deleting order:", err);
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
