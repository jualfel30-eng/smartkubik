'use client';

import { AlertTriangle, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import type {
  PaymentPortalDiagnostic,
  PaymentRequestStatus,
} from '@/lib/payment-portal';

interface RejectedBannerProps {
  status: PaymentRequestStatus;
  diagnostic: PaymentPortalDiagnostic;
  tenantName?: string;
}

const STATUS_HEADLINE: Record<string, string> = {
  info_mismatch: 'necesita corregir un dato',
  proof_unclear: 'necesita una foto más clara',
  partial: 'recibió parte del pago',
};

const REASON_HINT: Record<string, string> = {
  info_mismatch:
    'Revisa los datos del comprobante (cédula, banco, teléfono o monto).',
  proof_unclear: 'Sube una foto más clara o desde mejor ángulo.',
  partial: 'Falta completar el monto de tu pago.',
};

/**
 * Top-of-page diagnostic banner shown when the customer re-enters the
 * portal after a tenant rejection. Per spec it should be visible above the
 * form, with the tenant's note quoted, and dismissable.
 *
 * The banner's headline + hint adapt to the reason; the tenant's own
 * `note` (if any) is shown verbatim because they wrote it specifically
 * for this customer.
 */
export default function RejectedBanner({
  status,
  diagnostic,
  tenantName,
}: RejectedBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/[0.10]"
        aria-label="Mostrar detalles del rechazo"
      >
        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        Ver por qué el comprobante anterior no se aceptó
      </button>
    );
  }

  const headline =
    STATUS_HEADLINE[diagnostic.reason] ||
    STATUS_HEADLINE[status] ||
    'necesita revisar tu comprobante';
  const hint = REASON_HINT[diagnostic.reason] || REASON_HINT[status];

  return (
    <div
      role="alert"
      className="relative rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3.5 text-amber-100"
    >
      <div className="flex items-start gap-3 pr-7">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <p className="font-medium text-amber-50">
            {tenantName || 'El negocio'} {headline}.
          </p>
          {diagnostic.note ? (
            <p className="mt-1 text-amber-100/90">
              <span className="text-amber-300">Nota:</span>{' '}
              <span className="italic">&ldquo;{diagnostic.note}&rdquo;</span>
            </p>
          ) : null}
          {hint ? (
            <p className="mt-1 text-amber-100/80">{hint}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Ocultar"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-amber-200/80 hover:bg-amber-300/10 hover:text-amber-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
