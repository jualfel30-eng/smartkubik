'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BankSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * Top 10 VE banks ranked by retail share — covers ~95% of Pago Móvil /
 * transfer traffic in 2026. The list is intentionally curated rather than
 * loaded from the API: bank options rarely change, this works offline,
 * and the customer needs zero round-trips before they can fill the form.
 *
 * If we want to support smaller banks (BFC, Plaza, Activo…) we add them
 * here, not behind a free-text field — typos are the #1 reason proofs get
 * rejected.
 */
const TOP_VE_BANKS = [
  'Banesco',
  'Mercantil',
  'Banco de Venezuela',
  'Provincial (BBVA)',
  'Bicentenario',
  'Banco del Tesoro',
  'Banco Exterior',
  'Banco Caroní',
  'Banco Sofitasa',
  'BNC',
];

/**
 * Native <select> on mobile (per spec). We render our own chevron because
 * the OS chevron sizes/colors are inconsistent across iOS/Android and
 * fighting them is a lost cause.
 */
export default function BankSelect({
  id,
  value,
  onChange,
  required,
}: BankSelectProps) {
  // If the current value isn't in the curated list, treat it as "Otro" with
  // a free-text follow-up. Useful for re-entry flows where the customer's
  // previous bank entry came from a different source.
  const isCustom =
    value.length > 0 && !TOP_VE_BANKS.includes(value);
  const [otroSelected, setOtroSelected] = useState(isCustom);
  const otroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (otroSelected && otroInputRef.current) {
      otroInputRef.current.focus();
    }
  }, [otroSelected]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === '__otro__') {
      setOtroSelected(true);
      onChange('');
    } else {
      setOtroSelected(false);
      onChange(next);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <select
          id={id}
          required={required}
          value={otroSelected ? '__otro__' : value || ''}
          onChange={handleSelectChange}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 pr-10 text-base text-slate-50 focus:border-[var(--pp-primary,#10b981)] focus:bg-white/10 focus:outline-none"
        >
          <option value="" disabled className="bg-slate-900">
            Selecciona tu banco
          </option>
          {TOP_VE_BANKS.map((bank) => (
            <option key={bank} value={bank} className="bg-slate-900">
              {bank}
            </option>
          ))}
          <option value="__otro__" className="bg-slate-900">
            Otro
          </option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>

      {otroSelected && (
        <input
          ref={otroInputRef}
          type="text"
          inputMode="text"
          maxLength={60}
          placeholder="Escribe el nombre del banco"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-slate-50 placeholder:text-slate-500 focus:border-[var(--pp-primary,#10b981)] focus:bg-white/10 focus:outline-none"
        />
      )}
    </div>
  );
}
