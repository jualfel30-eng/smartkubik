import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Loader2, ShoppingBag } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import toast from '@/lib/toast';
import { SPRING, listItem, STAGGER } from '@/lib/motion';
import MobileOrderCard from './MobileOrderCard.jsx';

const FILTER_PILLS = [
  { id: 'active', label: 'Activos' },
  { id: 'completed', label: 'Completados' },
  { id: 'all', label: 'Todos' },
];

export default function MobileStorefrontOrders({ onCountChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [updatingId, setUpdatingId] = useState(null);
  const prevOrderIds = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/restaurant-orders?limit=100');
      const data = res.data ?? [];
      setOrders(data);
      const activeCount = data.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
      onCountChange?.(activeCount);

      // Detect new orders
      const currentIds = new Set(data.map((o) => o._id));
      if (prevOrderIds.current.size > 0) {
        const newOrders = data.filter((o) => !prevOrderIds.current.has(o._id));
        if (newOrders.length > 0) {
          haptics.tap();
          toast.info(`${newOrders.length} nuevo(s) pedido(s)`);
        }
      }
      prevOrderIds.current = currentIds;
    } catch {
      toast.error('Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    // Optimistic update
    const prevOrders = [...orders];
    setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
    try {
      const updated = await fetchApi(`/restaurant-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
      haptics.success();
      toast.success(`Estado: ${status === 'cancelled' ? 'Cancelado' : status}`);
    } catch {
      // Revert on error
      setOrders(prevOrders);
      haptics.error();
      toast.error('Error actualizando estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    if (filter === 'completed') return ['delivered', 'cancelled'].includes(o.status);
    return true;
  });

  const activeCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  const handleShare = async () => {
    // Attempt to share storefront URL
    try {
      const storefrontRes = await fetchApi('/admin/storefront').catch(() => null);
      const domain = storefrontRes?.data?.domain || storefrontRes?.domain || '';
      if (!domain) {
        toast.info('Configura tu sitio primero');
        return;
      }
      const url = `https://${domain}.smartkubik.com`;
      if (navigator.share) {
        await navigator.share({ title: 'Mi sitio web', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace copiado');
      }
      haptics.success();
    } catch {
      // user cancelled
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 py-3 safe-bottom">
      {/* Filter pills */}
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-hide">
        {FILTER_PILLS.map((pill) => {
          const active = filter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => { haptics.tap(); setFilter(pill.id); }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap no-tap-highlight transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {pill.label}
              {pill.id === 'active' && activeCount > 0 && (
                <span className="ml-0.5 bg-white/20 text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingBag size={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">Sin pedidos</p>
          <p className="text-xs text-muted-foreground mb-4">
            Comparte tu enlace para empezar a recibir pedidos
          </p>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground no-tap-highlight active:scale-[0.97] transition-transform"
          >
            <Share2 size={14} />
            Compartir enlace
          </button>
        </div>
      ) : (
        <motion.div
          variants={STAGGER(0.04, 0.02)}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((order) => (
              <MobileOrderCard
                key={order._id}
                order={order}
                onStatusChange={updateStatus}
                updatingId={updatingId}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
