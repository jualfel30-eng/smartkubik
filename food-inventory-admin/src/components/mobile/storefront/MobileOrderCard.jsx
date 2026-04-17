import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageCircle, ChevronDown, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { SPRING, DUR, EASE, listItem } from '@/lib/motion';
import MobileActionSheet from '@/components/mobile/MobileActionSheet';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready:     'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_STYLES = {
  pending:   { bg: 'bg-yellow-500/15', text: 'text-yellow-500', border: 'border-l-yellow-500' },
  confirmed: { bg: 'bg-blue-500/15', text: 'text-blue-500', border: 'border-l-blue-500' },
  preparing: { bg: 'bg-orange-500/15', text: 'text-orange-500', border: 'border-l-orange-500' },
  ready:     { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-l-emerald-500' },
  delivered: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-l-gray-500' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-l-red-500' },
};

const NEXT_ACTION = {
  pending:   { label: 'Confirmar', next: 'confirmed', color: 'bg-blue-600' },
  confirmed: { label: 'Preparar', next: 'preparing', color: 'bg-orange-500' },
  preparing: { label: 'Listo',    next: 'ready',     color: 'bg-emerald-600' },
  ready:     { label: 'Entregado', next: 'delivered', color: 'bg-primary' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function MobileOrderCard({ order, onStatusChange, updatingId }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  const action = NEXT_ACTION[order.status];
  const isUpdating = updatingId === order._id;

  const handleAction = (e) => {
    e.stopPropagation();
    if (!action || isUpdating) return;
    haptics.tap();
    onStatusChange(order._id, action.next);
  };

  const handleCancel = () => {
    haptics.warning();
    onStatusChange(order._id, 'cancelled');
    setCancelOpen(false);
    setCancelReason('');
  };

  const itemsSummary = () => {
    const items = order.items || [];
    if (items.length === 0) return 'Sin ítems';
    const first = items.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`).join(', ');
    const remaining = items.length - 2;
    return remaining > 0 ? `${first} +${remaining} más` : first;
  };

  const isFinal = ['delivered', 'cancelled'].includes(order.status);

  return (
    <>
      <motion.div
        layout
        variants={listItem}
        className={cn(
          'bg-card border border-border overflow-hidden border-l-4',
          status.border,
          isFinal && 'opacity-60',
        )}
        style={{ borderRadius: 'var(--mobile-radius-lg)' }}
      >
        {/* Collapsed — always visible */}
        <button
          onClick={() => { haptics.tap(); setExpanded(!expanded); }}
          className="w-full text-left p-4 no-tap-highlight active:bg-muted/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm">{order.orderRef}</span>
              <span className="text-xs text-muted-foreground">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{timeAgo(order.createdAt)}</span>
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={SPRING.snappy}
              >
                <ChevronDown size={14} className="text-muted-foreground" />
              </motion.div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', status.bg, status.text)}>
              {STATUS_LABELS[order.status]}
            </span>
            <span className="text-sm font-bold">${order.total?.toFixed(2)}</span>
          </div>

          <p className="text-xs text-muted-foreground mt-1.5 truncate">{itemsSummary()}</p>
        </button>

        {/* Action button — only for active orders */}
        {action && !expanded && (
          <div className="px-4 pb-3">
            <button
              onClick={handleAction}
              disabled={isUpdating}
              className={cn(
                'w-full py-2.5 rounded-[var(--mobile-radius-md)] text-sm font-semibold text-white no-tap-highlight active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2',
                action.color,
              )}
            >
              {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
              {action.label}
            </button>
          </div>
        )}

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                {/* Full item list */}
                <div className="space-y-2">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="p-2.5 bg-muted/50 rounded-[var(--mobile-radius-md)]">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        <span className="font-mono text-muted-foreground">${item.final_price?.toFixed(2)}</span>
                      </div>
                      {item.customizations?.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.customizations.map((mod, j) => (
                            <p key={j} className="text-[11px] text-muted-foreground">
                              {mod.action === 'remove' ? 'Sin ' : '+ '}{mod.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between font-bold text-sm border-t border-border pt-2">
                  <span>Total</span>
                  <span>${order.total?.toFixed(2)}</span>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-[var(--mobile-radius-md)]">
                    <p className="text-[11px] font-semibold text-yellow-500 mb-0.5">Notas:</p>
                    <p className="text-xs">{order.notes}</p>
                  </div>
                )}

                {/* Customer contact */}
                {order.customerPhone && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-[var(--mobile-radius-md)] border border-border no-tap-highlight active:scale-[0.97] transition-transform"
                    >
                      <Phone size={14} />
                      Llamar
                    </a>
                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-[var(--mobile-radius-md)] border border-border bg-emerald-600 text-white no-tap-highlight active:scale-[0.97] transition-transform"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  </div>
                )}

                {/* Action + Cancel buttons */}
                <div className="flex gap-2">
                  {action && (
                    <button
                      onClick={handleAction}
                      disabled={isUpdating}
                      className={cn(
                        'flex-1 py-2.5 rounded-[var(--mobile-radius-md)] text-sm font-semibold text-white no-tap-highlight active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2',
                        action.color,
                      )}
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                      {action.label}
                    </button>
                  )}
                  {!isFinal && (
                    <button
                      onClick={(e) => { e.stopPropagation(); haptics.tap(); setCancelOpen(true); }}
                      className="flex items-center justify-center gap-1 px-4 py-2.5 text-sm font-medium rounded-[var(--mobile-radius-md)] border border-destructive/30 text-destructive no-tap-highlight active:scale-[0.97] transition-transform"
                    >
                      <XCircle size={14} />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Cancel confirmation sheet */}
      <MobileActionSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar pedido?"
      >
        <div className="px-4 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            El pedido <span className="font-bold text-foreground">{order.orderRef}</span> de{' '}
            <span className="font-bold text-foreground">{order.customerName}</span> será cancelado.
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Razón (opcional)
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: Cliente no disponible"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-[var(--mobile-radius-md)] bg-destructive text-destructive-foreground text-sm font-semibold no-tap-highlight active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <XCircle size={16} />
            Confirmar cancelación
          </button>
        </div>
      </MobileActionSheet>
    </>
  );
}
