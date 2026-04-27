import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listItem, STAGGER, scaleIn, DUR, EASE } from '../../lib/motion';
import { triggerCelebration } from '../../hooks/use-celebration';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import {
  Clock, CheckCircle2, ChefHat, PackageSearch, Truck, XCircle,
  RefreshCw, Loader2,
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preparing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  ready:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  pending:   <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle2 className="w-3.5 h-3.5" />,
  preparing: <ChefHat className="w-3.5 h-3.5" />,
  ready:     <PackageSearch className="w-3.5 h-3.5" />,
  delivered: <Truck className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

const NEXT_STATUS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
};

const ALL_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

// ─── Main component ──────────────────────────────────────────────────────────
export function RestaurantOrdersPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/restaurant-orders?limit=100');
      setOrders(res.data ?? []);
    } catch {
      toast.error('Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const updated = await fetchApi(`/restaurant-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
      if (selectedOrder?._id === id) setSelectedOrder(updated);
      toast.success(`Estado actualizado: ${STATUS_LABELS[status]}`);

      // Celebrate delivery
      if (status === 'delivered') {
        triggerCelebration();
      }
    } catch {
      toast.error('Error actualizando estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) =>
    filter === 'active'
      ? !['delivered', 'cancelled'].includes(o.status)
      : filter === 'completed'
      ? ['delivered', 'cancelled'].includes(o.status)
      : o.status === filter,
  );

  const countByStatus = (s: string) => orders.filter((o) => o.status === s).length;
  const activeCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{orders.length} pedido(s) total</p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs text-gray-400 hover:bg-white/[0.08] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'active', label: 'Activos', count: activeCount },
          { key: 'completed', label: 'Completados', count: null },
          ...ALL_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], count: countByStatus(s) })),
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === key
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            {label}
            {count !== null && count > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Order list */}
          <motion.div
            className="space-y-2"
            variants={STAGGER(0.04)}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  variants={listItem}
                  className="text-center py-12 text-gray-500 border-2 border-dashed border-white/[0.06] rounded-xl"
                >
                  No hay pedidos en este estado.
                </motion.div>
              ) : (
                filtered.map((order) => (
                  <motion.button
                    key={order._id}
                    variants={listItem}
                    layout
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedOrder?._id === order._id
                        ? 'bg-white/[0.06] border-white/[0.12]'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-gray-100 text-sm">
                        {order.orderRef}
                      </span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={order.status}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: DUR.fast }}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}
                        >
                          {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <p className="text-sm font-medium text-gray-200">{order.customerName}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-500">{order.items?.length} item(s)</span>
                      <span className="text-sm font-bold text-gray-100">${order.total?.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleString('es')}
                    </p>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </motion.div>

          {/* Order detail */}
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder._id}
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-fit sticky top-6 p-5 rounded-xl border border-white/[0.08] bg-white/[0.03]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-mono font-bold text-gray-100">{selectedOrder.orderRef}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedOrder.customerName} · {selectedOrder.customerPhone}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[selectedOrder.status]}`}>
                    {STATUS_ICONS[selectedOrder.status]} {STATUS_LABELS[selectedOrder.status]}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {selectedOrder.items?.map((item: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-white/[0.04]">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-100">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-mono text-gray-300">${item.final_price?.toFixed(2)}</span>
                      </div>
                      {item.customizations?.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.customizations.map((mod: any, j: number) => (
                            <p key={j} className="text-xs text-gray-500">
                              {mod.action === 'remove' ? 'Sin ' : '+ '}{mod.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between font-bold text-gray-100 border-t border-white/[0.06] pt-3 mb-4">
                  <span>Total</span>
                  <span>${selectedOrder.total?.toFixed(2)}</span>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-4">
                    <p className="text-xs font-medium text-amber-400 mb-1">Notas del cliente:</p>
                    <p className="text-sm text-gray-300">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Status pipeline */}
                {NEXT_STATUS[selectedOrder.status]?.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                    {NEXT_STATUS[selectedOrder.status].map((next) => (
                      <button
                        key={next}
                        disabled={updatingId === selectedOrder._id}
                        onClick={() => updateStatus(selectedOrder._id, next)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                          next === 'cancelled'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                        }`}
                      >
                        {updatingId === selectedOrder._id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : STATUS_ICONS[next]}
                        {STATUS_LABELS[next]}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="hidden lg:flex items-center justify-center border-2 border-dashed border-white/[0.06] rounded-xl text-gray-500 text-sm min-h-[200px]">
                Selecciona un pedido para ver el detalle
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
