'use client';

import { motion } from 'framer-motion';
import { Clock3 } from 'lucide-react';
import type { PaymentPortalInfo } from '@/lib/payment-portal';
import AnimatedCheckmark from './AnimatedCheckmark';

interface SubmittedSuccessProps {
  info: PaymentPortalInfo;
  /** Optional close handler — wired when the WhatsApp in-app browser opened
   *  the portal (window.close works there). On a standalone tab it's a no-op
   *  per spec; we hide the button when it's not usable. */
  onClose?: () => void;
}

function formatAmount(amount: number, currency: 'USD' | 'VES'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Bs`;
}

/**
 * Layer 3 — the "you did it" view. The animated checkmark anchors visual
 * attention; the persistent reference card is the takeaway the customer
 * screenshots or remembers. Tone: resolved, not ambiguous (per spec).
 *
 * No order number is shown because PublicPaymentInfoDto deliberately omits
 * entity IDs (defense in depth — prevents portal tokens from leaking the
 * existence of other orders).
 */
export default function SubmittedSuccess({
  info,
  onClose,
}: SubmittedSuccessProps) {
  const tenantName = info.tenant.name || 'El negocio';
  const entityNoun =
    info.entity.type === 'appointment'
      ? 'cita'
      : info.entity.type === 'invoice'
        ? 'factura'
        : 'pedido';

  // Stagger the text/card after the checkmark animation has had a moment
  // to register. Frame budget: 250ms wait → 350ms reveal.
  const reveal = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: 'easeOut' as const },
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <AnimatedCheckmark
        size={96}
        label={`Comprobante recibido para tu ${entityNoun}`}
      />

      <motion.h2
        {...reveal}
        transition={{ ...reveal.transition, delay: 0.25 }}
        className="text-2xl font-semibold tracking-tight text-slate-50"
      >
        ¡Comprobante recibido!
      </motion.h2>

      <motion.p
        {...reveal}
        transition={{ ...reveal.transition, delay: 0.32 }}
        className="max-w-xs text-sm leading-relaxed text-slate-300"
      >
        <span className="text-slate-100">{tenantName}</span> está verificando
        tu pago. Te avisaremos por WhatsApp cuando esté listo.
      </motion.p>

      <motion.div
        {...reveal}
        transition={{ ...reveal.transition, delay: 0.42 }}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"
        role="status"
      >
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Tu {entityNoun}
        </p>
        <p className="mt-1 text-base font-medium text-slate-100">
          Pagaste {formatAmount(info.amountDue, info.currency)}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/[0.08] px-2.5 py-0.5 text-xs text-amber-200">
          <Clock3 className="h-3 w-3" aria-hidden />
          En verificación
        </p>
      </motion.div>

      {onClose && (
        <motion.button
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.5 }}
          type="button"
          onClick={onClose}
          className="mt-1 inline-flex w-full max-w-xs items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
        >
          Cerrar
        </motion.button>
      )}

      <motion.p
        {...reveal}
        transition={{ ...reveal.transition, delay: 0.6 }}
        className="text-xs text-slate-500"
      >
        Puedes cerrar esta ventana — el negocio te escribirá.
      </motion.p>
    </div>
  );
}
