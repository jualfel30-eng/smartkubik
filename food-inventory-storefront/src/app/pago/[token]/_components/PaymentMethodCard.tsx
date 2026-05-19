'use client';

import {
  type PaymentPortalSelectedMethod,
  type PaymentProofMethod,
  settlesInVes,
} from '@/lib/payment-portal';
import CopyableRow from './CopyableRow';

interface PaymentMethodCardProps {
  method: PaymentPortalSelectedMethod;
  amountVes: number | null;
  amountUsd: number;
  currency: 'USD' | 'VES';
}

interface Row {
  label: string;
  value: string;
  copyValue?: string;
}

/**
 * Maps `accountDetails` (which is a free-form bag of strings keyed by the
 * fields stored in TenantPaymentConfig) into an ordered, labeled list per
 * method type. We render only the fields that the tenant actually filled
 * in — partial setups remain usable.
 *
 * The amount row is appended last and always copies the *plain number*
 * (no symbols/separators) so the bank app accepts it as-is.
 */
function buildRows(method: PaymentPortalSelectedMethod): Row[] {
  const d = method.accountDetails ?? {};
  const type = method.type;

  const v = (key: string) => {
    const raw = d[key];
    return typeof raw === 'string' && raw.trim().length > 0
      ? raw.trim()
      : null;
  };

  const out: Row[] = [];

  if (type === 'transfer') {
    const bank = v('bankName');
    if (bank) out.push({ label: 'Banco', value: bank });

    const accountNumber = v('accountNumber');
    if (accountNumber) {
      // Strip spaces/dashes when copying — banks reject pretty-formatted numbers
      out.push({
        label: 'Cuenta',
        value: accountNumber,
        copyValue: accountNumber.replace(/[\s-]/g, ''),
      });
    }
    const accountType = v('accountType');
    if (accountType) out.push({ label: 'Tipo', value: accountType });

    const holder = v('accountHolderName');
    if (holder) out.push({ label: 'Titular', value: holder });
  } else if (type === 'pago_movil') {
    const bank = v('pagoMovilBank');
    if (bank) out.push({ label: 'Banco', value: bank });

    const ci = v('pagoMovilCI');
    if (ci) {
      out.push({
        label: 'Cédula',
        value: ci,
        copyValue: ci.replace(/[^0-9]/g, ''),
      });
    }
    const phone = v('pagoMovilPhone');
    if (phone) {
      out.push({
        label: 'Teléfono',
        value: phone,
        copyValue: phone.replace(/[\s-]/g, ''),
      });
    }
  } else if (type === 'zelle') {
    const email = v('zelleEmail');
    if (email) out.push({ label: 'Email', value: email });

    const phone = v('zellePhone');
    if (phone) {
      out.push({
        label: 'Teléfono',
        value: phone,
        copyValue: phone.replace(/[\s-]/g, ''),
      });
    }
    const holder = v('accountHolderName');
    if (holder) out.push({ label: 'A nombre de', value: holder });
  }
  // cash / card: no rows — the customer doesn't transfer to an account

  return out;
}

function formatVes(value: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PaymentMethodCard({
  method,
  amountVes,
  amountUsd,
  currency,
}: PaymentMethodCardProps) {
  const rows = buildRows(method);

  // The amount row uses the currency the method settles in: VES for any
  // *_ves method or Pago Móvil, USD for everything else (transferencia_usd,
  // zelle_usd). The customer copies this value into their bank app — wrong
  // currency = wrong payment.
  //
  // `amountVes` can be null if exchange rate wasn't captured at PR creation
  // (older PRs before we started snapshotting). Fall back to USD with a
  // tiny note so the customer knows to confirm the rate manually.
  const wantsVes = settlesInVes(method);
  const hasVesAmount = amountVes != null;

  const amountRow: Row =
    wantsVes && hasVesAmount
      ? {
          label: 'Monto',
          value: `${formatVes(amountVes as number)} Bs`,
          copyValue: (amountVes as number).toFixed(2),
        }
      : currency === 'VES' && hasVesAmount
        ? {
            label: 'Monto',
            value: `${formatVes(amountVes as number)} Bs`,
            copyValue: (amountVes as number).toFixed(2),
          }
        : {
            label: 'Monto',
            value: `$${formatUsd(amountUsd)}`,
            copyValue: amountUsd.toFixed(2),
          };

  return (
    <section aria-labelledby="payment-method-heading" className="flex flex-col gap-2">
      <h2
        id="payment-method-heading"
        className="text-sm font-medium text-slate-300"
      >
        Paga con: <span className="text-slate-50">{method.label}</span>
      </h2>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            El negocio no ha completado los datos de este método de pago.
            Contáctalo antes de pagar.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((row) => (
              <li key={row.label}>
                <CopyableRow
                  label={row.label}
                  value={row.value}
                  copyValue={row.copyValue}
                />
              </li>
            ))}
            <li className="pt-1">
              <CopyableRow
                label={amountRow.label}
                value={amountRow.value}
                copyValue={amountRow.copyValue}
              />
            </li>
          </ul>
        )}
      </div>

      <p className="px-1 text-xs text-slate-500">
        Toca un dato para copiarlo al portapapeles.
      </p>
    </section>
  );
}
