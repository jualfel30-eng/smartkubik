interface AmountBlockProps {
  amountUsd: number;
  amountVes: number | null;
  currency: 'USD' | 'VES';
  exchangeRate: number | null;
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVes(value: number): string {
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * BIG amount display — anchors the page. The currency the PR is quoted in
 * gets the primary slot; the converted value (if we have a frozen rate)
 * sits below as a smaller hint.
 *
 * Pure server component (no client state) — keeps it in the initial HTML
 * so LCP fires before hydration.
 */
export default function AmountBlock({
  amountUsd,
  amountVes,
  currency,
  exchangeRate,
}: AmountBlockProps) {
  const primary =
    currency === 'USD'
      ? `$${formatUsd(amountUsd)}`
      : `${formatVes(amountVes ?? 0)} Bs`;

  const secondary =
    currency === 'USD' && amountVes != null
      ? `${formatVes(amountVes)} Bs`
      : currency === 'VES'
        ? `$${formatUsd(amountUsd)}`
        : null;

  return (
    <section
      aria-labelledby="amount-heading"
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-5 py-5"
    >
      <p
        id="amount-heading"
        className="text-xs uppercase tracking-wide text-slate-400"
      >
        Monto a pagar
      </p>
      <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-50 tabular-nums">
        {primary}
      </p>
      {secondary && (
        <p className="mt-1 text-sm text-slate-400 tabular-nums">
          ≈ {secondary}
          {exchangeRate ? (
            <span className="ml-2 text-xs text-slate-500">
              tasa {exchangeRate.toLocaleString('es-VE', {
                maximumFractionDigits: 2,
              })}
            </span>
          ) : null}
        </p>
      )}
    </section>
  );
}
