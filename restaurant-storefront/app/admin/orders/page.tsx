'use client';

import { useState, useEffect } from 'react';
import { restaurantAdminApi } from '@/lib/api';
import { Order, OrderStatus } from '@/types';
import { Clock, CheckCircle2, PackageSearch, ChefHat, Truck, XCircle } from 'lucide-react';

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  confirmed: <CheckCircle2 className="w-4 h-4" />,
  preparing: <ChefHat className="w-4 h-4" />,
  ready: <PackageSearch className="w-4 h-4" />,
  delivered: <Truck className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preparing: 'bg-accent/10 text-accent border-accent/20',
  ready: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const NEXT_STATUS_MAP: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('admin_token')!;
      const res = await restaurantAdminApi.getOrders(token, { limit: 100 }) as { data: Order[]; total: number };
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const token = localStorage.getItem('admin_token')!;
      const updated = await restaurantAdminApi.updateOrderStatus(token, id, status) as Order;
      setOrders(prev => prev.map(o => o._id === id ? updated : o));
      if (selectedOrder?._id === id) setSelectedOrder(updated);
    } catch {
      alert('Error actualizando estado');
    }
  };

  const filteredOrders = orders.filter(o =>
    activeTab === 'active'
      ? !['delivered', 'cancelled'].includes(o.status)
      : ['delivered', 'cancelled'].includes(o.status),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl text-white">Pedidos</h1>
          <p className="text-muted text-sm">Gestiona y actualiza el estado de los pedidos en tiempo real.</p>
        </div>
        <div className="flex p-1 bg-surface border border-white/5 rounded-xl w-fit">
          {(['active', 'completed'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}>
              {tab === 'active' ? 'Activos' : 'Completados'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted animate-pulse bg-surface border border-white/5 rounded-2xl">Cargando pedidos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Lista */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-muted bg-surface border border-white/5 rounded-2xl">
                No hay pedidos {activeTab === 'active' ? 'activos' : 'completados'}.
              </div>
            ) : filteredOrders.map(order => (
              <button
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedOrder?._id === order._id ? 'bg-white/10 border-accent/30' : 'bg-surface border-white/5 hover:bg-white/5'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-white text-sm">{order.orderRef}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                    {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 font-semibold">{order.customerName}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted">{order.items.length} ítem(s)</p>
                  <p className="text-sm font-bold text-accent">${order.total.toFixed(2)}</p>
                </div>
                <p className="text-xs text-muted/60 mt-1">{new Date(order.createdAt).toLocaleString('es')}</p>
              </button>
            ))}
          </div>

          {/* Detalle */}
          {selectedOrder ? (
            <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-5 h-fit sticky top-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display font-bold text-xl text-white">{selectedOrder.orderRef}</h2>
                  <p className="text-muted text-sm">{selectedOrder.customerName} · {selectedOrder.customerPhone}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_COLORS[selectedOrder.status]}`}>
                  {STATUS_ICONS[selectedOrder.status]} {STATUS_LABELS[selectedOrder.status]}
                </span>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-4">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex justify-between">
                      <span className="font-bold text-white">{item.quantity}x {item.name}</span>
                      <span className="text-accent font-mono">${item.final_price.toFixed(2)}</span>
                    </div>
                    {item.customizations.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {item.customizations.map((mod, i) => (
                          <p key={i} className="text-xs text-muted">
                            {mod.action === 'remove' ? '❌ Sin ' : '➕ '}{mod.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-white pt-2 border-t border-white/5">
                <span>Total</span>
                <span className="text-accent">${selectedOrder.total.toFixed(2)}</span>
              </div>

              {NEXT_STATUS_MAP[selectedOrder.status].length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                  {NEXT_STATUS_MAP[selectedOrder.status].map(nextStatus => (
                    <button
                      key={nextStatus}
                      onClick={() => updateStatus(selectedOrder._id, nextStatus)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${nextStatus === 'cancelled' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-accent/30 text-accent hover:bg-accent/10'}`}
                    >
                      {STATUS_ICONS[nextStatus]} Marcar: {STATUS_LABELS[nextStatus]}
                    </button>
                  ))}
                </div>
              )}

              {selectedOrder.notes && (
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <p className="text-xs text-yellow-400 font-semibold mb-1">Notas del cliente:</p>
                  <p className="text-sm text-foreground/80">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center p-12 bg-surface border border-dashed border-white/10 rounded-2xl text-muted">
              Selecciona un pedido para ver el detalle
            </div>
          )}
        </div>
      )}
    </div>
  );
}
