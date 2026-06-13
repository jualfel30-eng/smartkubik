import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageCheck, Truck, Loader2, ChevronLeft, Check, FileText, Receipt, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPurchaseOrder, receivePurchaseOrder } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';

const STATUS_META = {
  pending: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Aprobada', cls: 'bg-violet-500/10 text-violet-500' },
  partially_received: { label: 'Parcial', cls: 'bg-amber-500/10 text-amber-500' },
  received: { label: 'Recibida', cls: 'bg-emerald-500/10 text-emerald-600' },
  completed: { label: 'Completada', cls: 'bg-emerald-500/10 text-emerald-600' },
  cancelled: { label: 'Cancelada', cls: 'bg-destructive/10 text-destructive' },
  rejected: { label: 'Rechazada', cls: 'bg-destructive/10 text-destructive' },
};

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function MobilePurchaseDetail({ purchaseId, initialPurchase, onClose }) {
  const [po, setPo] = useState(initialPurchase || null);
  const [loading, setLoading] = useState(!initialPurchase);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState('detail'); // 'detail' | 'receive'

  const load = useCallback(async () => {
    try {
      const res = await getPurchaseOrder(purchaseId);
      setPo(res?.data || res);
    } catch {
      toast.error('No se pudo cargar la compra');
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => { load(); }, [load]);

  const close = () => onClose?.(dirty);

  const confirmReceive = async () => {
    setBusy(true);
    try {
      await receivePurchaseOrder(purchaseId);
      haptics.success();
      toast.success('Mercancía recibida — inventario actualizado');
      setDirty(true);
      setView('detail');
      await load();
    } catch (err) {
      haptics.error();
      toast.error(err?.message || 'Error registrando la recepción');
    } finally {
      setBusy(false);
    }
  };

  const status = po?.status;
  const canReceive = status === 'pending' || status === 'approved';
  const meta = STATUS_META[status] || STATUS_META.pending;
  const items = po?.items || [];
  const isFiscal = po?.documentType === 'factura_fiscal';
  const docLabel = po?.documentType === 'nota_entrega' ? 'Nº Nota de entrega' : 'Nº Factura';

  const title = view === 'receive' ? 'Recibir mercancía' : (po ? `Compra ${po.poNumber || ''}`.trim() : 'Compra');

  let footer = null;
  if (!loading && po) {
    if (view === 'detail' && canReceive) {
      footer = (
        <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <button type="button" onClick={() => setView('receive')} disabled={busy}
            className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
            <PackageCheck size={16} /> Recibir mercancía
          </button>
        </div>
      );
    } else if (view === 'receive') {
      footer = (
        <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <button type="button" onClick={() => setView('detail')} disabled={busy}
            className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight flex items-center gap-1">
            <ChevronLeft size={14} /> Atrás
          </button>
          <button type="button" onClick={confirmReceive} disabled={busy}
            className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Confirmar recepción</>}
          </button>
        </div>
      );
    }
  }

  return (
    <MobileActionSheet open onClose={close} title={title} footer={footer}>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">Cargando compra...</p>
        </div>
      ) : !po ? (
        <p className="text-sm text-muted-foreground text-center py-12">Compra no encontrada.</p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
          >
            {view === 'detail' && (
              <div className="space-y-4">
                {/* Status + date */}
                <div className="flex items-center justify-between">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', meta.cls)}>{meta.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {po.purchaseDate ? new Date(po.purchaseDate).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </span>
                </div>

                {/* Supplier + document */}
                <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold truncate">{po.supplierName || 'Proveedor'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isFiscal ? <Receipt size={13} className="shrink-0" /> : <FileText size={13} className="shrink-0" />}
                    <span>{isFiscal ? 'Factura fiscal' : 'Nota de entrega'}</span>
                    {po.invoiceNumber && <span>· {docLabel}: {po.invoiceNumber}</span>}
                  </div>
                </div>

                {/* Items */}
                <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-2.5">
                  <p className="text-xs text-muted-foreground">Productos ({items.length})</p>
                  {items.map((item, idx) => (
                    <div key={item.productId || idx} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{item.productName || 'Producto'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.quantity} × {fmt(item.costPrice)}{item.productSku ? ` · ${item.productSku}` : ''}
                        </p>
                      </div>
                      <span className="font-medium tabular-nums shrink-0">{fmt(item.totalCost ?? item.quantity * item.costPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-1.5 text-sm">
                  {po.subtotal != null && (
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{fmt(po.subtotal)}</span></div>
                  )}
                  {po.ivaTotal > 0 && (
                    <div className="flex justify-between text-muted-foreground"><span>IVA</span><span className="tabular-nums">{fmt(po.ivaTotal)}</span></div>
                  )}
                  {po.igtfTotal > 0 && (
                    <div className="flex justify-between text-muted-foreground"><span>IGTF</span><span className="tabular-nums">{fmt(po.igtfTotal)}</span></div>
                  )}
                  <div className="flex justify-between font-bold pt-1.5 border-t border-border">
                    <span>Total</span><span className="tabular-nums">{fmt(po.totalAmount)}</span>
                  </div>
                </div>

                {/* Payment terms */}
                {po.paymentTerms?.isCredit && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-[var(--mobile-radius-md)] p-3 text-xs text-amber-600 flex items-center gap-2">
                    <Receipt size={13} />
                    Compra a crédito{po.paymentTerms.paymentDueDate ? ` · vence ${new Date(po.paymentTerms.paymentDueDate).toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : ''}
                  </div>
                )}

                {/* Notes */}
                {po.notes && (
                  <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4">
                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm">{po.notes}</p>
                  </div>
                )}

                {!canReceive && status === 'received' && (
                  <p className="text-xs text-emerald-600 text-center flex items-center justify-center gap-1.5">
                    <PackageCheck size={13} /> Esta compra ya fue recibida y sumada al inventario.
                  </p>
                )}
              </div>
            )}

            {view === 'receive' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Truck size={15} /> Confirma que recibiste esta mercancía. El inventario se sumará automáticamente.
                </p>
                <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.productId || idx} className="flex items-center justify-between text-sm gap-2">
                      <span className="truncate flex-1">{item.productName || 'Producto'}</span>
                      <span className="font-medium tabular-nums shrink-0">{item.quantity}{item.selectedUnitAbbr ? ` ${item.selectedUnitAbbr}` : ''}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Total de la compra: <span className="font-semibold text-foreground">{fmt(po.totalAmount)}</span>
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </MobileActionSheet>
  );
}
