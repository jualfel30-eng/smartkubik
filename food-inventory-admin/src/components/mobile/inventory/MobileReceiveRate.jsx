import { useState } from 'react';
import { Star, PackageCheck, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import MobileActionSheet from '../MobileActionSheet.jsx';

const ONE_STAR_REASONS = [
  'Malos tiempos de entrega',
  'No pasó control de calidad',
  'Pedido incompleto',
  'Mala comunicación',
  'Procesos problemáticos',
  'No cumplió con lo acordado',
  'Monto a pagar superior a lo acordado',
  'Otro',
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MobileReceiveRate({ po, onClose }) {
  const [rating, setRating] = useState(0);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const isOneStar = rating === 1;
  const isOther = reason === 'Otro';
  const canSubmit = rating > 0 && invoiceDate && (!isOneStar || (reason && (!isOther || comments.trim())));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const isoInvoiceDate = new Date(`${invoiceDate}T12:00:00`).toISOString();
      await fetchApi('/ratings', {
        method: 'POST',
        body: JSON.stringify({
          purchaseOrderId: po._id,
          supplierId: po.supplierId,
          rating,
          reason: isOneStar ? reason : undefined,
          comments: comments.trim() || undefined,
          receivedBy: receivedBy.trim() || undefined,
          invoiceDate: isoInvoiceDate,
        }),
      });
      await fetchApi(`/purchases/${po._id}/receive`, {
        method: 'PATCH',
        body: JSON.stringify({ receivedBy: receivedBy.trim() || undefined, invoiceDate: isoInvoiceDate }),
      });
      haptics.success();
      toast.success('Compra recibida e inventario actualizado');
      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err?.message || 'Error al registrar la recepción');
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    toast.info('Puedes recibir esta compra desde el Historial cuando llegue la mercancía');
    onClose?.(false);
  };

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
      <button type="button" onClick={skip} disabled={busy}
        className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight disabled:opacity-40">
        Recibir después
      </button>
      <button type="button" onClick={submit} disabled={!canSubmit || busy}
        className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Recibir y calificar</>}
      </button>
    </div>
  );

  return (
    <MobileActionSheet open onClose={skip} title="¿Ya recibiste esta compra?" footer={footer}>
      <div className="space-y-5">
        {/* Context */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[var(--mobile-radius-lg)] p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <PackageCheck size={18} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Compra {po.poNumber || ''} registrada</p>
            <p className="text-xs text-muted-foreground truncate">
              {po.supplierName || 'Proveedor'}
              {po.documentType && ` · ${po.documentType === 'factura_fiscal' ? 'Factura fiscal' : 'Nota de entrega'}`}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Si la mercancía ya llegó, recíbela ahora y el inventario se sumará. Si llegará después, usa "Recibir después".
        </p>

        {/* Invoice date */}
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Fecha de factura</p>
          <input type="date" value={invoiceDate} max={todayStr()} onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
        </section>

        {/* Rating */}
        <section className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Califica al proveedor</p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => { haptics.tap(); setRating(star); if (star !== 1) setReason(''); }}
                className="no-tap-highlight active:scale-90 transition-transform">
                <Star size={32} className={cn(rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30')} />
              </button>
            ))}
          </div>
        </section>

        {/* Reason for 1-star */}
        {isOneStar && (
          <section className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Motivo del mal puntaje</p>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm">
              <option value="">Selecciona un motivo...</option>
              {ONE_STAR_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </section>
        )}

        {/* Received by */}
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Recibido por (opcional)</p>
          <input type="text" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Nombre de quien recibe"
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
        </section>

        {/* Comments */}
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Comentarios {isOneStar && isOther ? '' : '(opcional)'}
          </p>
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Observaciones..." rows={2}
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm resize-none" />
        </section>
      </div>
    </MobileActionSheet>
  );
}
