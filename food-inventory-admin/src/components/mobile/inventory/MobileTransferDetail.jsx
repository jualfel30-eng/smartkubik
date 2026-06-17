import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Warehouse, PackageCheck, Zap, XCircle, Loader2, ChevronLeft, Check, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getTransferOrder,
  requestTransferOrder,
  approveTransferOrder,
  approveTransferRequest,
  prepareTransferOrder,
  shipTransferOrder,
  receiveTransferOrder,
  cancelTransferOrder,
} from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';

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

const normalizeStatus = (status) => {
  if (status?.includes('requested')) return 'requested';
  if (status?.includes('approved')) return 'approved';
  return status;
};

const TIMELINE = [
  { key: 'created', label: 'Creado', match: ['draft', 'requested', 'approved', 'in_preparation'] },
  { key: 'in_transit', label: 'En camino', match: ['in_transit', 'delivered'] },
  { key: 'received', label: 'Recibido', match: ['received', 'partially_received'] },
];

const stepIndex = (norm) => {
  for (let i = 0; i < TIMELINE.length; i++) if (TIMELINE[i].match.includes(norm)) return i;
  return 0;
};

function Timeline({ status }) {
  const norm = normalizeStatus(status);
  const current = stepIndex(norm);
  const cancelled = status === 'cancelled';
  return (
    <div className="flex items-center justify-between px-2">
      {TIMELINE.map((s, idx) => {
        const active = idx <= current && !cancelled;
        const isCurrent = idx === current && !cancelled;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className={cn('flex flex-col items-center', isCurrent && 'scale-110')}>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {active && idx < current ? <Check size={13} /> : idx + 1}
              </div>
              <span className={cn('text-[10px] mt-1', active ? 'text-foreground font-medium' : 'text-muted-foreground')}>{s.label}</span>
            </div>
            {idx < TIMELINE.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-1.5', idx < current && !cancelled ? 'bg-primary' : 'bg-muted')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MobileTransferDetail({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState('detail'); // 'detail' | 'receive' | 'cancel'
  const [receiveItems, setReceiveItems] = useState([]);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransferOrder(orderId);
      setOrder(data);
    } catch {
      toast.error('No se pudo cargar el traslado');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const close = () => onClose?.(dirty);

  // ── Express dispatch (chains remaining transitions) ──
  const expressDispatch = async () => {
    setBusy(true);
    try {
      const norm = normalizeStatus(order.status);
      const stateOrder = ['draft', 'requested', 'approved', 'in_preparation'];
      const idx = stateOrder.indexOf(norm);
      if (idx < 0) { toast.info('Este traslado ya fue despachado'); return; }
      if (norm === 'draft') await requestTransferOrder(orderId);
      if (idx <= stateOrder.indexOf('requested')) {
        const approveFn = order.type === 'pull' ? approveTransferRequest : approveTransferOrder;
        await approveFn(orderId);
      }
      if (idx <= stateOrder.indexOf('approved')) await prepareTransferOrder(orderId);
      await shipTransferOrder(orderId);
      haptics.success();
      toast.success('Traslado despachado — esperando recepción');
      setDirty(true);
      await load();
    } catch (err) {
      haptics.warning();
      // Mostrar el motivo real del backend (p.ej. "Stock insuficiente para X...")
      toast.warning(err?.message || 'Proceso parcialmente completado. Revisa el estado actual.');
      setDirty(true);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const openReceive = () => {
    setReceiveItems((order.items || []).map((item) => {
      const pending = item.requestedQuantity - (item.receivedQuantity || 0);
      return {
        productId: item.productId?._id || item.productId,
        productName: item.productName || 'Producto',
        selectedUnit: item.selectedUnit || null,
        pending,
        receivedQuantity: pending,
      };
    }));
    setView('receive');
  };

  const submitReceive = async () => {
    const items = receiveItems.filter((i) => i.receivedQuantity > 0).map((i) => ({ productId: i.productId, receivedQuantity: i.receivedQuantity }));
    if (items.length === 0) { toast.error('Ingresa al menos una cantidad recibida'); return; }
    setBusy(true);
    try {
      await receiveTransferOrder(orderId, { items });
      haptics.success();
      toast.success('Recepción registrada');
      setDirty(true);
      setView('detail');
      await load();
    } catch (err) {
      haptics.error();
      toast.error(err?.message || 'Error registrando recepción');
    } finally {
      setBusy(false);
    }
  };

  const submitCancel = async () => {
    setBusy(true);
    try {
      await cancelTransferOrder(orderId, { reason: cancelReason });
      haptics.success();
      toast.success('Traslado cancelado');
      setDirty(true);
      setView('detail');
      await load();
    } catch (err) {
      haptics.error();
      toast.error(err?.message || 'Error cancelando el traslado');
    } finally {
      setBusy(false);
    }
  };

  // ── Derived permissions (mirror desktop) ──
  const status = order?.status;
  const canReceive = ['in_transit', 'delivered'].includes(status);
  const canExpress = ['draft', 'push_requested', 'pull_requested', 'push_approved', 'pull_approved', 'requested', 'approved', 'in_preparation'].includes(status);
  const canCancel = ['draft', 'push_requested', 'pull_requested', 'push_approved', 'pull_approved', 'in_preparation', 'requested', 'approved'].includes(status);

  const meta = STATUS_META[status] || STATUS_META.draft;
  const sourceName = order?.sourceLocationId?.name || order?.sourceTenantId?.name || 'N/A';
  const destName = order?.destinationLocationId?.name || order?.destinationTenantId?.name || order?.sourceTenantId?.name || 'N/A';

  const title = view === 'receive' ? 'Recibir productos' : view === 'cancel' ? 'Cancelar traslado' : (order ? `Traslado ${order.orderNumber}` : 'Traslado');

  // ── Footer per view ──
  let footer = null;
  if (!loading && order) {
    if (view === 'detail') {
      const actions = [];
      if (canCancel) actions.push(
        <button key="cancel" type="button" onClick={() => setView('cancel')} disabled={busy}
          className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-destructive/30 text-destructive text-sm font-medium no-tap-highlight disabled:opacity-40">
          Cancelar
        </button>,
      );
      if (canReceive) actions.push(
        <button key="receive" type="button" onClick={openReceive} disabled={busy}
          className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
          <PackageCheck size={16} /> Recibir
        </button>,
      );
      if (canExpress) actions.push(
        <button key="express" type="button" onClick={expressDispatch} disabled={busy}
          className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-[#FB923C] active:bg-[#F97316] text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <><Zap size={16} /> Enviar ahora</>}
        </button>,
      );
      if (actions.length > 0) {
        footer = <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>{actions}</div>;
      }
    } else if (view === 'receive') {
      footer = (
        <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <button type="button" onClick={() => setView('detail')} disabled={busy} className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight flex items-center gap-1">
            <ChevronLeft size={14} /> Atrás
          </button>
          <button type="button" onClick={submitReceive} disabled={busy} className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Confirmar recepción</>}
          </button>
        </div>
      );
    } else if (view === 'cancel') {
      footer = (
        <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <button type="button" onClick={() => setView('detail')} disabled={busy} className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight flex items-center gap-1">
            <ChevronLeft size={14} /> Atrás
          </button>
          <button type="button" onClick={submitCancel} disabled={busy} className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-destructive active:opacity-90 text-destructive-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <><XCircle size={16} /> Cancelar traslado</>}
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
          <p className="text-sm">Cargando traslado...</p>
        </div>
      ) : !order ? (
        <p className="text-sm text-muted-foreground text-center py-12">Traslado no encontrado.</p>
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
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </span>
                </div>

                {/* Timeline */}
                {status !== 'cancelled' && (
                  <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4">
                    <Timeline status={status} />
                  </div>
                )}
                {status === 'cancelled' && (
                  <div className="bg-destructive/10 text-destructive rounded-[var(--mobile-radius-md)] p-3 text-sm flex items-start gap-2">
                    <XCircle size={16} className="shrink-0 mt-0.5" />
                    <span>Cancelado{order.cancellationReason ? `: ${order.cancellationReason}` : ''}</span>
                  </div>
                )}

                {/* Route */}
                <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Origen</p>
                    <p className="text-sm font-semibold truncate">{sourceName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Warehouse size={11} />{order.sourceWarehouseId?.name || 'N/A'}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Destino</p>
                    <p className="text-sm font-semibold truncate">{destName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end truncate"><Warehouse size={11} />{order.destinationWarehouseId?.name || 'N/A'}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-2.5">
                  <p className="text-xs text-muted-foreground">Productos ({order.items?.length || 0})</p>
                  {(order.items || []).map((item, idx) => {
                    const unit = item.selectedUnit || item.unitOfMeasure || '';
                    return (
                      <div key={idx} className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{item.productName || 'Producto'}</p>
                          {item.productSku && <p className="text-xs text-muted-foreground truncate">{item.productSku}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium tabular-nums">{item.requestedQuantity}{unit ? ` ${unit}` : ''}</p>
                          {item.receivedQuantity != null && (
                            <p className={cn('text-[11px] tabular-nums', item.receivedQuantity < item.requestedQuantity ? 'text-amber-500' : 'text-emerald-600')}>
                              recibido: {item.receivedQuantity}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4">
                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                )}
              </div>
            )}

            {view === 'receive' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Truck size={14} /> Ingresa las cantidades que llegaron a destino.
                </p>
                {receiveItems.map((item) => (
                  <div key={item.productId} className="bg-card border border-border rounded-[var(--mobile-radius-md)] p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium truncate flex-1">{item.productName}{item.selectedUnit ? <span className="text-xs text-muted-foreground ml-1">({item.selectedUnit})</span> : ''}</p>
                      <span className="text-xs text-muted-foreground shrink-0">pend: {item.pending}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button"
                        onClick={() => { haptics.tap(); setReceiveItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, receivedQuantity: Math.max(0, Number((i.receivedQuantity - (i.selectedUnit ? 0.25 : 1)).toFixed(2))) } : i)); }}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95 text-lg">−</button>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.receivedQuantity}
                        onChange={(e) => {
                          const val = Math.min(item.pending, Math.max(0, parseFloat(e.target.value) || 0));
                          setReceiveItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, receivedQuantity: val } : i));
                        }}
                        className="flex-1 h-9 text-center text-sm font-bold tabular-nums rounded-md border border-border bg-background no-spinners"
                      />
                      <button type="button"
                        onClick={() => { haptics.tap(); setReceiveItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, receivedQuantity: Math.min(i.pending, Number((i.receivedQuantity + (i.selectedUnit ? 0.25 : 1)).toFixed(2))) } : i)); }}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95 text-lg">+</button>
                      <button type="button"
                        onClick={() => { haptics.tap(); setReceiveItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, receivedQuantity: i.pending } : i)); }}
                        className="text-xs text-primary font-medium no-tap-highlight px-2 shrink-0">Todo</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'cancel' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">¿Seguro que deseas cancelar este traslado? Esta acción no se puede deshacer.</p>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Motivo (opcional)</p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Motivo de cancelación..."
                    rows={3}
                    className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </MobileActionSheet>
  );
}
