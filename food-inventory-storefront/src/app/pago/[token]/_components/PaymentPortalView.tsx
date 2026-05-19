'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  PaymentPortalInfo,
  SubmitProofResult,
} from '@/lib/payment-portal';
import AmountBlock from './AmountBlock';
import OrderSnapshotCard from './OrderSnapshotCard';
import MethodPicker from './MethodPicker';
import PaymentMethodCard from './PaymentMethodCard';
import PortalHeader from './PortalHeader';
import ProofSubmissionForm from './ProofSubmissionForm';
import RejectedBanner from './RejectedBanner';
import SubmittedSuccess from './SubmittedSuccess';
import YaPagueCTA from './YaPagueCTA';

interface PaymentPortalViewProps {
  info: PaymentPortalInfo;
  token: string;
}

type Layer = 1 | 2 | 3;

/**
 * Top-level client orchestrator. Three layers:
 *   Layer 1 — Structure (read-only "before you pay" view)
 *   Layer 2 — Interaction (proof submission form)
 *   Layer 3 — Celebration (success state — Batch D replaces the placeholder)
 *
 * Transitions never navigate. Framer Motion slides Layer 2 up over Layer 1
 * (320ms per spec) and the same URL stays in the address bar so a refresh
 * or share preserves the entry point.
 */
const LAYER_TRANSITION = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 32,
};

export default function PaymentPortalView({
  info: initialInfo,
  token,
}: PaymentPortalViewProps) {
  // The portal info starts as the server-rendered snapshot but lives in
  // local state so client-driven mutations (method override, future
  // refreshes) can update the displayed selectedMethod + accountDetails
  // without a full page reload.
  const [info, setInfo] = useState<PaymentPortalInfo>(initialInfo);

  // Re-entry: if the customer is returning after a tenant rejection, jump
  // straight to the form so they can correct without hunting for a CTA.
  // The diagnostic banner anchors above the form so the reason is visible.
  const startsOnLayer2 =
    initialInfo.diagnostic != null &&
    (initialInfo.status === 'info_mismatch' ||
      initialInfo.status === 'proof_unclear' ||
      initialInfo.status === 'partial');

  const [layer, setLayer] = useState<Layer>(startsOnLayer2 ? 2 : 1);
  const [submitted, setSubmitted] = useState<SubmitProofResult | null>(null);

  // If the page is opened from an in-app WebView (WhatsApp / Instagram),
  // window.close() can actually close the tab. On a standalone Safari tab
  // the call no-ops, so we hide the button when we can't detect a parent
  // or opener. Detection is best-effort.
  const [canClose, setCanClose] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCanClose(
      Boolean(window.opener) ||
        // history.length === 1 means this was opened in a new tab and we
        // can plausibly close it
        window.history.length <= 1,
    );
  }, []);

  const { amountUsd, amountVes, exchangeRate } = useMemo(() => {
    if (info.currency === 'USD') {
      const rate = info.exchangeRateSnapshot ?? null;
      return {
        amountUsd: info.amountDue,
        amountVes: rate ? info.amountDue * rate : null,
        exchangeRate: rate,
      };
    }
    const rate = info.exchangeRateSnapshot ?? null;
    return {
      amountUsd: rate && rate > 0 ? info.amountDue / rate : info.amountDue,
      amountVes: info.amountDue,
      exchangeRate: rate,
    };
  }, [info.amountDue, info.currency, info.exchangeRateSnapshot]);

  const branding = info.tenant.branding;
  const primaryColor = branding?.primaryColor || '#10b981';

  const handleYaPague = useCallback(() => setLayer(2), []);
  const handleBack = useCallback(() => setLayer(1), []);
  const handleSubmitted = useCallback((result: SubmitProofResult) => {
    setSubmitted(result);
    setLayer(3);
  }, []);
  const handleMethodChanged = useCallback((next: PaymentPortalInfo) => {
    // Mutates only the method-related slice — the rest of the info
    // (entity snapshot, amount, status, etc.) didn't change server-side
    // and we don't want to clobber any optimistic client state.
    setInfo((prev) => ({
      ...prev,
      selectedMethod: next.selectedMethod,
      availableMethods: next.availableMethods,
      allowMethodOverride: next.allowMethodOverride,
    }));
  }, []);

  const canOverrideMethod =
    info.allowMethodOverride &&
    Array.isArray(info.availableMethods) &&
    info.availableMethods.length > 0;

  // The customer can re-enter the portal after a tenant rejection. Layer 1
  // keeps its informational role; Layer 2 just gets a `replacesProofId` hint
  // so the audit trail can link the new proof to the rejected one.
  const replacesProofId = info.diagnostic?.rejectedProofId;

  // Hide the CTA in terminal-ish states. PaymentTokenGuard already blocks
  // `confirmed`/`rejected_final`/`expired` at the backend; we guard here
  // too in case the customer keeps the tab open while admin advances state.
  const ctaHidden =
    info.status === 'awaiting_settlement' ||
    info.status === 'submitted' ||
    info.status === 'confirmed' ||
    info.status === 'rejected_final' ||
    info.status === 'expired';

  return (
    <div
      style={
        {
          '--pp-primary': primaryColor,
          '--pp-primary-fg': '#0a0e1a',
        } as React.CSSProperties
      }
      className="relative overflow-x-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {layer === 1 && (
          <motion.div
            key="layer-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 pb-4 pt-6"
          >
            <PortalHeader
              tenantName={info.tenant.name}
              logoUrl={branding?.logoUrl}
            />

            {info.diagnostic && (
              <RejectedBanner
                status={info.status}
                diagnostic={info.diagnostic}
                tenantName={info.tenant.name}
              />
            )}

            {info.entity.snapshot.customerName && (
              <div>
                <p className="text-xl font-medium text-slate-50">
                  Hola, {info.entity.snapshot.customerName.split(' ')[0]} 👋
                </p>
                <p className="text-sm text-slate-400">
                  {info.entity.type === 'appointment'
                    ? 'Tu cita'
                    : info.entity.type === 'invoice'
                      ? 'Tu factura'
                      : 'Tu pedido'}{' '}
                  en{' '}
                  <span className="text-slate-200">
                    {info.tenant.name || 'SmartKubik'}
                  </span>
                </p>
              </div>
            )}

            <OrderSnapshotCard
              entityType={info.entity.type}
              snapshot={info.entity.snapshot}
              amountDue={info.amountDue}
              currency={info.currency}
            />

            <AmountBlock
              amountUsd={amountUsd}
              amountVes={amountVes}
              currency={info.currency}
              exchangeRate={exchangeRate}
            />

            <div className="flex flex-col gap-2">
              {canOverrideMethod && (
                <MethodPicker
                  token={token}
                  selected={info.selectedMethod}
                  available={info.availableMethods!}
                  onChanged={handleMethodChanged}
                />
              )}
              <PaymentMethodCard
                method={info.selectedMethod}
                amountUsd={amountUsd}
                amountVes={amountVes}
                currency={info.currency}
              />
            </div>

            {!ctaHidden && (
              <>
                <div
                  className="flex items-center gap-3 px-2 text-xs uppercase tracking-wide text-slate-500"
                  aria-hidden
                >
                  <span className="h-px flex-1 bg-white/10" />
                  o
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <YaPagueCTA onClick={handleYaPague} />
              </>
            )}
          </motion.div>
        )}

        {layer === 2 && (
          <motion.div
            key="layer-2"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={LAYER_TRANSITION}
            className="mx-auto w-full max-w-md"
          >
            {info.diagnostic && (
              <div className="px-5 pt-6">
                <RejectedBanner
                  status={info.status}
                  diagnostic={info.diagnostic}
                  tenantName={info.tenant.name}
                />
              </div>
            )}
            <ProofSubmissionForm
              info={info}
              token={token}
              onBack={handleBack}
              onSubmitted={handleSubmitted}
              replacesProofId={replacesProofId}
            />
          </motion.div>
        )}

        {layer === 3 && submitted && (
          <motion.div
            key="layer-3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mx-auto w-full max-w-md"
          >
            <SubmittedSuccess
              info={info}
              onClose={
                canClose
                  ? () => {
                      try {
                        window.close();
                      } catch {
                        // No-op — some browsers refuse to close non-script-opened tabs
                      }
                    }
                  : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
