import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobilePurchaseDetail from './MobilePurchaseDetail.jsx';

const STATUS_META = {
  pending: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Aprobada', cls: 'bg-violet-500/10 text-violet-500' },
  partially_received: { label: 'Parcial', cls: 'bg-amber-500/10 text-amber-500' },
  received: { label: 'Recibida', cls: 'bg-emerald-500/10 text-emerald-600' },
  completed: { label: 'Completada', cls: 'bg-emerald-500/10 text-emerald-600' },
  cancelled: { label: 'Cancelada', cls: 'bg-destructive/10 text-destructive' },
  rejected: { label: 'Rechazada', cls: 'bg-destructive/10 text-destructive' },
};

function PurchaseCard({ po, onOpen }) {
  const meta = STATUS_META[po.status] || STATUS_META.pending;
  const itemCount = po.items?.length || 0;
  const total = Number(po.totalAmount || 0);
  const date = po.purchaseDate || po.createdAt;

  return (
    <motion.button
      type="button"
      variants={listItem}
      onClick={() => { haptics.tap(); onOpen(po); }}
      className="w-full text-left bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 no-tap-highlight active:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{po.supplierName || 'Proveedor'}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {po.poNumber}
            {po.invoiceNumber && ` · Fact. ${po.invoiceNumber}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tabular-nums">${total.toFixed(2)}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Package size={11} />{itemCount} producto{itemCount !== 1 ? 's' : ''}
          {date && ` · ${new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`}
        </span>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', meta.cls)}>{meta.label}</span>
      </div>
    </motion.button>
  );
}

export default function MobilePurchasesTab({ refreshKey }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/purchases?limit=30&sort=-createdAt');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPurchases(list);
    } catch {
      toast.error('No se pudieron cargar las compras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="px-4 pb-24">
      {loading && purchases.length === 0 ? (
        <MobileListSkeleton count={4} height="h-24" className="pt-4" />
      ) : purchases.length === 0 ? (
        <MobileEmptyState
          icon={ShoppingCart}
          title="Sin compras registradas"
          description="Crea tu primera orden de compra desde el botón +"
        />
      ) : (
        <motion.div className="space-y-2 pt-4" variants={STAGGER(0.03)} initial="initial" animate="animate">
          {purchases.map((po) => (
            <PurchaseCard key={po._id} po={po} onOpen={setSelected} />
          ))}
        </motion.div>
      )}

      {selected && (
        <MobilePurchaseDetail
          purchaseId={selected._id}
          initialPurchase={selected}
          onClose={(changed) => { setSelected(null); if (changed) load(); }}
        />
      )}
    </div>
  );
}
