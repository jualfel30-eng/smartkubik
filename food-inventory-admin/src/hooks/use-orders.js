import { useState, useCallback, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useCrmContext } from '@/context/CrmContext.jsx';

export const useOrders = () => {
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { loadCustomers } = useCrmContext(); // Obtener la función para recargar clientes

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchApi('/orders');
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    
    setOrdersData(data);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const addOrder = async (orderData) => {
    const { data, error } = await fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });

    if (error) {
      console.error("Error adding order:", error);
      throw error;
    }

    await loadOrders();
    await loadCustomers(); // << RECARGAR DATOS DEL CRM
    return data;
  };

  const updateOrder = async (orderId, orderData) => {
    const { data, error } = await fetchApi(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(orderData),
    });

    if (error) {
      console.error("Error updating order:", error);
      throw error;
    }

    await loadOrders();
    await loadCustomers(); // << RECARGAR DATOS DEL CRM
    return data;
  };

  const deleteOrder = async (orderId) => {
    const { error } = await fetchApi(`/orders/${orderId}`, { method: 'DELETE' });

    if (error) {
      console.error("Error deleting order:", error);
      throw error;
    }

    setOrdersData(prev => prev.filter(o => o._id !== orderId));
    // No es necesario recargar clientes aquí si la orden se elimina por completo
    // a menos que la eliminación de una orden también afecte las métricas.
    // Por ahora, lo dejamos así para consistencia.
    await loadCustomers();
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
