import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, ChevronRight, Package, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTransferOrders } from '@/lib/api';
import { toast } from '@/lib/toast';
import { STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileTransferDetail from './MobileTransferDetail.jsx';

const STATUS_META = {
  draft: { label: 'Borrador', cls: 'bg-muted text-muted-foreground' },
  push_requested: { label: 'Solicitado', cls: 'bg-blue-500/10 text-blue-500' },
  pull_requested: { label: 'Solicitado', cls: 'bg-blue-500/10 text-blue-500' },
  push_approved: { label: 'Aprobado', cls: 'bg-violet-500/10 text-violet-500' },
  pull_approved: { label: 'Aprobado', cls: 'bg-violet-500/10 text-violet-500' },
  pull_rejected: { label: 'Rechazado', cls: 'bg-destructive/10 text-destructive' },
  in_preparation: { label: 'En preparación', cls: 'bg-amber-500/10 text-amber-500' },
  in_transit: { label: 'En tránsito', cls: 'bg-blue-500/10 text-blue-500' },
  delivered: { label: 'Entregado', cls: 'bg-emerald-500/10 text-emerald-600' },
  received: { label: 'Recibido', cls: 'bg-emerald-500/10 text-emerald-600' },
  partially_received: { label: 'Parcial', cls: 'bg-amber-500/10 text-amber-500' },
  cancelled: { label: 'Cancelado', cls: 'bg-destructive/10 text-destructive' },
};

function TransferCard({ order, onOpen }) {
  const meta = STATUS_META[order.status] || STATUS_META.draft;
  const source = order.sourceLocationId?.name || order.sourceTenantId?.name || order.sourceWarehouseId?.name || 'N/A';
  const dest = order.destinationLocationId?.name || order.destinationTenantId?.name || order.sourceTenantId?.name || order.destinationWarehouseId?.name || 'N/A';
  const itemCount = order.items?.length || 0;

  return (
    <motion.button
      type="button"
      variants={listItem}
      onClick={() => { haptics.tap(); onOpen(order._id || order.id); }}
      className="w-full text-left bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 no-tap-highlight active:bg-muted/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-xs text-muted-foreground">{order.orderNumber}</span>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', meta.cls)}>{meta.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{source}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Warehouse size={10} />{order.sourceWarehouseId?.name || '—'}</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-semibold truncate">{dest}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end truncate"><Warehouse size={10} />{order.destinationWarehouseId?.name || '—'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Package size={11} />{itemCount} producto{itemCount !== 1 ? 's' : ''}</span>
        <span className="text-[11px] text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : ''}</span>
      </div>
    </motion.button>
  );
}

export default function MobileTransfersTab({ refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTransferOrders({ page: 1, limit: 30 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOrders(list);
    } catch {
      toast.error('No se pudieron cargar los traslados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="px-4 pb-24">
      {loading && orders.length === 0 ? (
        <MobileListSkeleton count={4} height="h-24" className="pt-4" />
      ) : orders.length === 0 ? (
        <MobileEmptyState
          icon={ArrowRightLeft}
          title="Sin traslados"
          description="Crea un traslado para mover inventario entre sedes o almacenes"
        />
      ) : (
        <motion.div className="space-y-2 pt-4" variants={STAGGER(0.03)} initial="initial" animate="animate">
          {orders.map((order) => (
            <TransferCard key={order._id || order.id} order={order} onOpen={setSelectedId} />
          ))}
        </motion.div>
      )}

      {selectedId && (
        <MobileTransferDetail
          orderId={selectedId}
          onClose={(changed) => { setSelectedId(null); if (changed) load(); }}
        />
      )}
    </div>
  );
}
