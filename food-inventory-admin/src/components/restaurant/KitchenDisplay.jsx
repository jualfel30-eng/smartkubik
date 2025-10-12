import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Clock,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import OrderTicket from './OrderTicket';

/**
 * Kitchen Display System (KDS)
 * Pantalla principal de cocina con tracking de órdenes en tiempo real
 */
export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: null, // null = todas activas
    station: null,
    priority: null,
    isUrgent: null,
  });

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    loadOrders();
    loadStats();

    const interval = setInterval(() => {
      loadOrders();
      loadStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [filters]);

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.station) params.append('station', filters.station);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.isUrgent !== null) params.append('isUrgent', filters.isUrgent);

      const query = params.toString();
      const result = await fetchApi(`/kitchen-display/active${query ? `?${query}` : ''}`);
      setOrders(result?.data || result || []);
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await fetchApi('/kitchen-display/stats');
      setStats(result?.data || result || null);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUpdateItemStatus = async (kitchenOrderId, itemId, status) => {
    try {
      await fetchApi('/kitchen-display/item-status', {
        method: 'PATCH',
        body: JSON.stringify({
          kitchenOrderId,
          itemId,
          status,
        }),
      });
      loadOrders();
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const handleBumpOrder = async (kitchenOrderId) => {
    try {
      await fetchApi('/kitchen-display/bump', {
        method: 'POST',
        body: JSON.stringify({ kitchenOrderId }),
      });
      loadOrders();
      loadStats();
    } catch (error) {
      console.error('Error bumping order:', error);
    }
  };

  const handleMarkUrgent = async (kitchenOrderId, isUrgent) => {
    try {
      await fetchApi('/kitchen-display/urgent', {
        method: 'PATCH',
        body: JSON.stringify({
          kitchenOrderId,
          isUrgent,
        }),
      });
      loadOrders();
    } catch (error) {
      console.error('Error marking urgent:', error);
    }
  };

  const handleCancelOrder = async (kitchenOrderId, reason) => {
    try {
      await fetchApi('/kitchen-display/cancel', {
        method: 'POST',
        body: JSON.stringify({
          kitchenOrderId,
          reason,
        }),
      });
      loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-500',
      preparing: 'bg-yellow-500',
      ready: 'bg-green-500',
      completed: 'bg-gray-400',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-300';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      normal: 'border-gray-300',
      urgent: 'border-orange-500',
      asap: 'border-red-500',
    };
    return colors[priority] || 'border-gray-300';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateElapsedTime = (receivedAt) => {
    const now = new Date();
    const received = new Date(receivedAt);
    const elapsed = Math.floor((now - received) / 1000);
    return elapsed;
  };

  // Separar órdenes por status
  const newOrders = orders.filter((o) => o.status === 'new');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header con estadísticas */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold">Kitchen Display System</h1>
          </div>
          <Button
            onClick={loadOrders}
            variant="outline"
            className="bg-gray-800 border-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-400">
                    {stats.totalOrders}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Órdenes Hoy</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    {preparingOrders.length}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">En Preparación</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">
                    {readyOrders.length}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Listas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400">
                    {stats.avgWaitTime ? formatTime(stats.avgWaitTime) : '0:00'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Tiempo Promedio
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros rápidos */}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => setFilters({ ...filters, status: null })}
            variant={filters.status === null ? 'default' : 'outline'}
            size="sm"
            className="bg-gray-800 border-gray-700"
          >
            Todas
          </Button>
          <Button
            onClick={() => setFilters({ ...filters, status: 'new' })}
            variant={filters.status === 'new' ? 'default' : 'outline'}
            size="sm"
            className="bg-gray-800 border-gray-700"
          >
            Nuevas
          </Button>
          <Button
            onClick={() => setFilters({ ...filters, status: 'preparing' })}
            variant={filters.status === 'preparing' ? 'default' : 'outline'}
            size="sm"
            className="bg-gray-800 border-gray-700"
          >
            En Preparación
          </Button>
          <Button
            onClick={() => setFilters({ ...filters, status: 'ready' })}
            variant={filters.status === 'ready' ? 'default' : 'outline'}
            size="sm"
            className="bg-gray-800 border-gray-700"
          >
            Listas
          </Button>
          <Button
            onClick={() =>
              setFilters({ ...filters, isUrgent: filters.isUrgent ? null : true })
            }
            variant={filters.isUrgent ? 'default' : 'outline'}
            size="sm"
            className="bg-gray-800 border-gray-700"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Urgentes
          </Button>
        </div>
      </div>

      {/* Grid de órdenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ChefHat className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">
              No hay órdenes activas en cocina
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderTicket
              key={order._id}
              order={order}
              onUpdateItemStatus={handleUpdateItemStatus}
              onBump={handleBumpOrder}
              onMarkUrgent={handleMarkUrgent}
              onCancel={handleCancelOrder}
              elapsedTime={calculateElapsedTime(order.receivedAt)}
            />
          ))
        )}
      </div>
    </div>
  );
}
