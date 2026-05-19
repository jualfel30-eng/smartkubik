'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type {
  PaymentPortalEntitySnapshot,
  PaymentRequestEntityType,
} from '@/lib/payment-portal';

interface OrderSnapshotCardProps {
  entityType: PaymentRequestEntityType;
  snapshot: PaymentPortalEntitySnapshot;
  amountDue: number;
  currency: 'USD' | 'VES';
}

const ENTITY_LABEL: Record<PaymentRequestEntityType, string> = {
  order: 'Pedido',
  appointment: 'Cita',
  invoice: 'Factura',
};

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

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
  });
}

export default function OrderSnapshotCard({
  entityType,
  snapshot,
  amountDue,
  currency,
}: OrderSnapshotCardProps) {
  // Per spec: collapsed by default if more than 3 items. The summary line
  // shows enough info to confirm "this is the right order" without scrolling.
  const isLongList = snapshot.items.length > 3;
  const [expanded, setExpanded] = useState(!isLongList);

  const date = formatDate(snapshot.createdAt);
  const itemCount = snapshot.items.length;

  return (
    <section
      aria-labelledby="snapshot-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.03]"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pp-primary,#10b981)] rounded-2xl"
      >
        <div className="min-w-0">
          <p
            id="snapshot-heading"
            className="text-xs uppercase tracking-wide text-slate-400"
          >
            {ENTITY_LABEL[entityType]}
            {date ? <span className="ml-1.5 normal-case">· {date}</span> : null}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-100">
            {itemCount === 0
              ? 'Sin detalle de productos'
              : itemCount === 1
                ? '1 producto'
                : `${itemCount} productos`}
            <span className="ml-1.5 text-slate-400">
              · {formatAmount(amountDue, currency)}
            </span>
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && itemCount > 0 && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-white/5 border-t border-white/5 px-4 py-2">
              {snapshot.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-baseline justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">
                      {item.name || 'Producto'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.qty} ·{' '}
                      {formatAmount(item.unitPrice, currency)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums text-slate-200">
                    {formatAmount(item.total, currency)}
                  </p>
                </li>
              ))}
            </ul>

            {(snapshot.tax > 0 || snapshot.subtotal !== snapshot.total) && (
              <dl className="border-t border-white/5 px-4 py-3 text-xs text-slate-400">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatAmount(snapshot.subtotal, currency)}
                  </dd>
                </div>
                {snapshot.tax > 0 && (
                  <div className="mt-1 flex justify-between">
                    <dt>Impuesto</dt>
                    <dd className="tabular-nums">
                      {formatAmount(snapshot.tax, currency)}
                    </dd>
                  </div>
                )}
                <div className="mt-1 flex justify-between text-slate-100">
                  <dt>Total</dt>
                  <dd className="tabular-nums font-semibold">
                    {formatAmount(snapshot.total, currency)}
                  </dd>
                </div>
              </dl>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
