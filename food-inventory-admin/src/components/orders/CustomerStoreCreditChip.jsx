import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Chip que muestra el saldo a favor (store credit) de un cliente. Se usa en el
 * POS (al seleccionar el cliente en una orden nueva) y en el CRM (perfil).
 *
 * Sólo se renderiza si el cliente tiene saldo > 0 (o `showZero` para el CRM,
 * donde interesa ver "$0.00" explícito). Silencioso ante errores: si la
 * consulta falla, no muestra nada (no debe romper el formulario que lo hospeda).
 */
export function CustomerStoreCreditChip({ customerId, className, showZero = false }) {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!customerId) {
      setBalance(null);
      return;
    }
    let active = true;
    fetchApi(`/store-credit/${customerId}`)
      .then((res) => {
        if (active) setBalance(Number(res?.data?.balance) || 0);
      })
      .catch(() => {
        if (active) setBalance(null);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  if (balance == null) return null;
  if (balance <= 0 && !showZero) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60',
        className,
      )}
      title="Saldo a favor disponible para pagar"
    >
      <Wallet size={13} />
      Saldo a favor: $
      {balance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}

export default CustomerStoreCreditChip;
