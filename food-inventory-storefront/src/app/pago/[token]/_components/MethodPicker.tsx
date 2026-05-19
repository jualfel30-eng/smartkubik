'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  PaymentPortalError,
  type PaymentPortalAvailableMethod,
  type PaymentPortalSelectedMethod,
  submitMethodOverride,
} from '@/lib/payment-portal';

interface MethodPickerProps {
  token: string;
  selected: PaymentPortalSelectedMethod;
  available: PaymentPortalAvailableMethod[];
  onChanged: (next: Awaited<ReturnType<typeof submitMethodOverride>>) => void;
}

/**
 * Inline dropdown above the bank-data card that lets the customer switch
 * methods. Renders only when the portal exposed `availableMethods` (i.e.
 * the tenant allowed override on this PR). The native `<select>` keeps
 * accessibility free and matches phone OS conventions — no fancy combobox.
 *
 * The change call returns the freshly-rebuilt portal info; the parent
 * orchestrator drops it into state so the bank fields update in place.
 */
export default function MethodPicker({
  token,
  selected,
  available,
  onChanged,
}: MethodPickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const methodId = e.target.value;
    if (!methodId || methodId === selected.methodId) return;

    setBusy(true);
    setError(null);
    try {
      const next = await submitMethodOverride(token, methodId);
      onChanged(next);
    } catch (err) {
      const message =
        err instanceof PaymentPortalError
          ? err.message
          : 'No pudimos cambiar el método. Inténtalo de nuevo.';
      setError(message);
      // Reset the select to the previously-selected method
      e.target.value = selected.methodId || '';
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <select
          id="payment-method-override"
          aria-label="Cambiar método de pago"
          disabled={busy}
          value={selected.methodId || ''}
          onChange={handleChange}
          className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 pr-10 text-sm font-medium text-slate-50 focus:border-[var(--pp-primary,#10b981)] focus:bg-white/10 focus:outline-none disabled:opacity-60"
        >
          <option value={selected.methodId || ''} className="bg-slate-900">
            {selected.label}
          </option>
          {available.map((m) => (
            <option
              key={m.methodId}
              value={m.methodId || ''}
              className="bg-slate-900"
            >
              {m.label}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="px-1 text-xs text-rose-300"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
