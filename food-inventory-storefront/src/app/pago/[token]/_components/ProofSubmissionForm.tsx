'use client';

import { AlertCircle, ArrowLeft, Loader2, WifiOff } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PaymentPortalError,
  type PaymentPortalInfo,
  type SubmitProofFields,
  type SubmitProofResult,
  settlesInVes,
  submitPaymentProof,
} from '@/lib/payment-portal';
import BankSelect from './BankSelect';
import ImageUploadField from './ImageUploadField';

interface ProofSubmissionFormProps {
  info: PaymentPortalInfo;
  token: string;
  onBack: () => void;
  onSubmitted: (result: SubmitProofResult) => void;
  /** When re-submitting after a rejection, the previous proof's _id rides
   *  along so the audit trail can link the correction to the rejected one. */
  replacesProofId?: string;
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'error'; message: string; transient: boolean };

const REF_MIN_LENGTH = 6;

export default function ProofSubmissionForm({
  info,
  token,
  onBack,
  onSubmitted,
  replacesProofId,
}: ProofSubmissionFormProps) {
  const [bank, setBank] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [image, setImage] = useState<File | null>(null);

  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  // Decide which currency / amount the proof represents. Same rule as
  // the bank-data card: any method that settles in VES (pago_movil OR
  // methodId ending in _ves) sends VES; everyone else sends the PR's
  // quoted currency. This guarantees `proof.amount` matches what the
  // customer actually transferred — otherwise the reconciliation step
  // fails ("monto no coincide").
  const { amountToSubmit, currencyToSubmit } = useMemo(() => {
    const method = info.selectedMethod;
    if (settlesInVes(method)) {
      const rate = info.exchangeRateSnapshot;
      if (info.currency === 'USD' && rate) {
        return {
          amountToSubmit: Number((info.amountDue * rate).toFixed(2)),
          currencyToSubmit: 'VES' as const,
        };
      }
      if (info.currency === 'VES') {
        return {
          amountToSubmit: info.amountDue,
          currencyToSubmit: 'VES' as const,
        };
      }
    }
    return {
      amountToSubmit: info.amountDue,
      currencyToSubmit: info.currency,
    };
  }, [
    info.amountDue,
    info.currency,
    info.exchangeRateSnapshot,
    info.selectedMethod,
  ]);

  // Soft client-side validation — server-side validators are the source of
  // truth (and they sanitize). We only block here to avoid a round-trip
  // for obvious mistakes.
  const refDigits = reference.replace(/\D/g, '');
  const validReference =
    refDigits.length >= REF_MIN_LENGTH && refDigits.length <= 40;
  const validCedula = cedula.replace(/\D/g, '').length >= 6;
  const validPhone = phone.replace(/\D/g, '').length >= 7;
  const canSubmit =
    bank.trim().length > 1 &&
    validCedula &&
    validPhone &&
    validReference &&
    !!image &&
    state.kind !== 'uploading';

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!canSubmit || !image) return;

      const controller = new AbortController();
      abortRef.current = controller;

      setState({ kind: 'uploading', progress: 0 });

      const fields: SubmitProofFields = {
        amount: amountToSubmit,
        currency: currencyToSubmit,
        method: info.selectedMethod.type,
        originBank: bank.trim(),
        payerIdNumber: cedula.trim(),
        payerPhone: phone.trim(),
        referenceNumber: refDigits,
        replacesProofId,
      };

      try {
        const result = await submitPaymentProof(
          token,
          fields,
          image,
          (fraction) =>
            setState({ kind: 'uploading', progress: fraction }),
          controller.signal,
        );
        abortRef.current = null;
        onSubmitted(result);
      } catch (err) {
        abortRef.current = null;
        if (err instanceof PaymentPortalError) {
          setState({
            kind: 'error',
            message: err.message,
            transient: err.transient,
          });
        } else {
          setState({
            kind: 'error',
            message: 'No pudimos enviar el comprobante. Intenta de nuevo.',
            transient: true,
          });
        }
      }
    },
    [
      amountToSubmit,
      bank,
      canSubmit,
      cedula,
      currencyToSubmit,
      image,
      info.selectedMethod.type,
      onSubmitted,
      phone,
      refDigits,
      replacesProofId,
      token,
    ],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-screen w-full flex-col gap-5 px-5 pb-4 pt-6"
      noValidate
    >
      <button
        type="button"
        onClick={() => {
          abortRef.current?.abort();
          onBack();
        }}
        className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-1 text-sm text-slate-300 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pp-primary,#10b981)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver
      </button>

      <div>
        <h2 className="text-xl font-semibold text-slate-50">
          Casi listo. Cuéntanos del pago.
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Estos datos nos ayudan a confirmar tu transferencia más rápido.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="bank"
          className="px-1 text-xs uppercase tracking-wide text-slate-400"
        >
          Banco de origen
        </label>
        <BankSelect id="bank" value={bank} onChange={setBank} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cedula"
          className="px-1 text-xs uppercase tracking-wide text-slate-400"
        >
          Cédula del titular
        </label>
        <input
          id="cedula"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={20}
          placeholder="V-12345678"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-50 placeholder:text-slate-500 focus:border-[var(--pp-primary,#10b981)] focus:bg-white/10 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="phone"
          className="px-1 text-xs uppercase tracking-wide text-slate-400"
        >
          Teléfono de origen
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          placeholder="0414-555-1234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-50 placeholder:text-slate-500 focus:border-[var(--pp-primary,#10b981)] focus:bg-white/10 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="reference"
          className="px-1 text-xs uppercase tracking-wide text-slate-400"
        >
          Número de referencia
        </label>
        <input
          id="reference"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={40}
          placeholder="0123456789"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          aria-invalid={reference.length > 0 && !validReference}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-50 placeholder:text-slate-500 focus:border-[var(--pp-primary,#10b981)] focus:bg-white/10 focus:outline-none"
        />
        {reference.length > 0 && !validReference && (
          <p className="px-1 text-xs text-amber-300">
            La referencia debe tener al menos {REF_MIN_LENGTH} dígitos.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="px-1 text-xs uppercase tracking-wide text-slate-400">
          Captura del pago
        </span>
        <ImageUploadField
          value={image}
          onChange={setImage}
          disabled={state.kind === 'uploading'}
        />
      </div>

      {state.kind === 'error' && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
            state.transient
              ? 'border-amber-400/30 bg-amber-400/[0.07] text-amber-100'
              : 'border-rose-400/30 bg-rose-400/[0.07] text-rose-100'
          }`}
        >
          {state.transient ? (
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <div className="flex-1 text-sm">
            <p>{state.message}</p>
            {state.transient && (
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-300/40 px-2.5 py-1 text-xs font-medium text-amber-100 hover:bg-amber-300/10"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {state.kind === 'uploading' && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.progress * 100)}
          >
            <div
              className="h-full bg-[var(--pp-primary,#10b981)] transition-[width] duration-150"
              style={{ width: `${Math.max(4, state.progress * 100)}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-xl bg-[var(--pp-primary,#10b981)] px-4 py-3.5 text-base font-semibold text-[var(--pp-primary-fg,#0a0e1a)] shadow-lg shadow-emerald-500/20 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.kind === 'uploading' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Enviando {Math.round(state.progress * 100)}%
            </>
          ) : (
            'Enviar comprobante'
          )}
        </button>
      </div>
    </form>
  );
}
