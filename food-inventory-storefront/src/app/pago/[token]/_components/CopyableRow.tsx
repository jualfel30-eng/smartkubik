'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface CopyableRowProps {
  label: string;
  value: string;
  /** Optional copy override — useful when the displayed value differs from
   *  what we want on the clipboard (e.g. "V-12345678" displayed, "12345678" copied). */
  copyValue?: string;
}

/**
 * One row of the payment-method panel. Whole row is the tap target — the
 * spec mandates ≥48px touch height, so the row is padded vertically and
 * `cursor-copy` confirms the affordance on hover-capable devices.
 *
 * Tap behavior:
 *   1. `navigator.clipboard.writeText()` (modern path)
 *   2. Falls back to a hidden <textarea> + execCommand for older Safari /
 *      Samsung Internet that gate Clipboard API behind permissions.
 *   3. Triggers a brief haptic via `navigator.vibrate()` (no-op on iOS).
 *   4. Inline check icon swaps in for 1.4s + floating "Copiado" toast.
 */
export default function CopyableRow({
  label,
  value,
  copyValue,
}: CopyableRowProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    const text = (copyValue ?? value).toString();
    if (!text) return;

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        // Legacy fallback — required for some embedded WebViews
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // Clipboard might be blocked in unusual sandboxes — fail silently
      // rather than alarming the customer.
      return;
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // some browsers throw if vibration is gated by permission
      }
    }

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }, [copyValue, value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group relative flex w-full min-h-[52px] items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pp-primary,#10b981)]"
      aria-label={`Copiar ${label}: ${value}`}
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span className="truncate text-base font-medium text-slate-50">
          {value}
        </span>
      </div>

      <span
        className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
          copied
            ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'
            : 'border-white/10 bg-white/5 text-slate-300 group-hover:border-white/20'
        }`}
        aria-hidden
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </span>

      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -4 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="pointer-events-none absolute right-3 top-0 -translate-y-full rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300"
          >
            Copiado
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
