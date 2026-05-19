import { useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  PencilLine,
  Phone,
  Send,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/api';
import {
  entityNoun,
  formatProofAmount,
  getPendingProof,
  resolveProofImageUrl,
  timeAgo,
} from './_utils';
import { RejectReasonPicker } from './RejectReasonPicker';

/**
 * Per-data-row copy button. The reference number is by far the most
 * frequently copied — it's the bank statement match key — so the row
 * gets `copy` semantics even when other rows might just be informational.
 */
function CopyableField({ label, value, important = false }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="group flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-sm ${
            important ? 'font-semibold tabular-nums' : ''
          }`}
        >
          {value}
        </p>
      </div>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
          copied
            ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-400'
            : 'border-border bg-muted/40 text-muted-foreground group-hover:border-foreground/30'
        }`}
        aria-hidden
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}

/**
 * Full-screen image preview. Lightweight inline modal — no zoom lib needed
 * for PR3; native pinch-zoom on mobile + click-to-close is enough.
 */
function ImagePreview({ url, alt, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="max-h-[92vh] max-w-[94vw] object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

/**
 * Detail view rendered inside the sheet — header + image + data + 3 actions.
 *
 * The flow privileges the happy path: "Confirmar pago" is the primary
 * CTA, secondary actions are linked underneath. Per spec, the reject
 * button says "Pedir corrección" not "Rechazar" — we're asking the
 * customer to fix something, not refusing them.
 */
export function PaymentReviewDetail({
  paymentRequest,
  onBack,
  actions,
  onMutated,
}) {
  const pr = paymentRequest;
  const proof = getPendingProof(pr);
  const apiBase = getApiBaseUrl();
  const imageUrl = proof?.imageUrl
    ? resolveProofImageUrl(proof.imageUrl, apiBase)
    : null;

  const [zoomOpen, setZoomOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  if (!proof) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
        <ImageIcon className="h-8 w-8 opacity-60" aria-hidden />
        Esta solicitud no tiene comprobantes para revisar.
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Volver
        </Button>
      </div>
    );
  }

  const handleAccept = async () => {
    try {
      // Auto-accept-then-confirm is the 2-tap happy path. If the cashier
      // needs the awaiting_settlement escape hatch they'll use the
      // secondary action below.
      await actions.acceptProof(pr._id, proof._id);
      const updated = await actions.confirmRequest(pr._id);
      onMutated?.(updated);
    } catch {
      // Toast already surfaced by the hook
    }
  };

  const handleAwaiting = async () => {
    try {
      const updated = await actions.markAwaiting(pr._id);
      onMutated?.(updated);
    } catch {
      /* toast surfaced by hook */
    }
  };

  const handleRejectSubmit = async ({ reason, note }) => {
    try {
      const updated = await actions.rejectProof(
        pr._id,
        proof._id,
        reason,
        note,
      );
      setRejectOpen(false);
      onMutated?.(updated);
    } catch {
      /* toast surfaced by hook */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a la lista
      </button>

      <div className="mt-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {entityNoun(pr.entityType)}
        </p>
        <h3 className="text-lg font-semibold leading-tight">
          {pr.entitySnapshot?.customerName || 'Cliente'}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatProofAmount(proof.amount, proof.currency)} · enviado{' '}
          {timeAgo(proof.submittedAt)}
        </p>
      </div>

      {pr.delivery?.channel === 'pending_manual' && pr.portalUrl && (
        <PendingManualCallout
          portalUrl={pr.portalUrl}
          lastError={pr.delivery?.lastError}
        />
      )}

      {imageUrl && (
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          className="mt-4 overflow-hidden rounded-xl border bg-muted/30 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Ampliar comprobante"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Comprobante del cliente"
            className="block max-h-[44vh] w-full object-contain"
            referrerPolicy="no-referrer"
          />
        </button>
      )}

      <div className="mt-4 rounded-xl border bg-card/40 p-2">
        <CopyableField label="Banco" value={proof.originBank} />
        <CopyableField label="Cédula" value={proof.payerIdNumber} />
        <CopyableField label="Teléfono" value={proof.payerPhone} />
        <CopyableField label="Referencia" value={proof.referenceNumber} important />
        <CopyableField
          label="Monto"
          value={formatProofAmount(proof.amount, proof.currency)}
          important
        />
      </div>

      <div className="mt-4 space-y-2 pb-2">
        <Button
          onClick={handleAccept}
          disabled={actions.busy}
          size="lg"
          className="w-full gap-2"
        >
          {actions.busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          )}
          Confirmar pago
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={actions.busy}
            onClick={handleAwaiting}
            className="gap-1.5"
          >
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Aún no acreditado
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={actions.busy}
            onClick={() => setRejectOpen(true)}
            className="gap-1.5"
          >
            <PencilLine className="h-3.5 w-3.5" aria-hidden />
            Pedir corrección
          </Button>
        </div>
      </div>

      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Phone className="h-3 w-3" aria-hidden />
        Las correcciones se envían al cliente por WhatsApp.
      </p>

      {zoomOpen && imageUrl && (
        <ImagePreview
          url={imageUrl}
          alt="Comprobante completo"
          onClose={() => setZoomOpen(false)}
        />
      )}

      <RejectReasonPicker
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onSubmit={handleRejectSubmit}
        busy={actions.busy}
      />
    </div>
  );
}

/**
 * Inline callout when delivery never reached the customer (Whapi failed,
 * phone missing, or tenant explicitly chose "manual"). Surfaces the link
 * and a one-tap copy so the cashier can share it via Instagram, in person,
 * SMS, anything — without leaving the sheet.
 */
function PendingManualCallout({ portalUrl, lastError }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/[0.07] p-3">
      <div className="flex items-start gap-3">
        <Send className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-rose-50">
            El enlace no llegó al cliente
          </p>
          <p className="mt-0.5 text-xs text-rose-100/80">
            {lastError === 'phone_missing'
              ? 'No teníamos un teléfono válido. Cópialo y compártelo manualmente.'
              : lastError
                ? `El envío por WhatsApp falló (${lastError}). Cópialo y compártelo manualmente.`
                : 'Cópialo y compártelo manualmente.'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-rose-950/40 px-2 py-1 text-[11px] text-rose-100">
              {portalUrl}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCopy}
              className="gap-1.5 border-rose-400/40 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.16]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              ) : (
                <LinkIcon className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
