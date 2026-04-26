export const CURRENCY_LABELS = {
  USD: 'USD ($)',
  VES: 'Bolívares (Bs)',
  EUR: 'Euros',
  USD_BCV: '$ BCV',
  EUR_BCV: '€ BCV',
};

export const CURRENCY_COLORS = {
  USD: 'bg-success/5 border-green-200 hover:bg-success/10 dark:bg-green-950/30 dark:border-green-900/50 dark:hover:bg-green-900/40',
  VES: 'bg-blue-50 border-blue-200 hover:bg-info/10 dark:bg-blue-950/30 dark:border-blue-900/50 dark:hover:bg-blue-900/40',
  EUR: 'bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/30 dark:border-purple-900/50 dark:hover:bg-purple-900/40',
  USD_BCV: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:hover:bg-emerald-900/40',
  EUR_BCV: 'bg-violet-50 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:border-violet-900/50 dark:hover:bg-violet-900/40',
};

export const CURRENCY_TEXT_COLORS = {
  USD: 'text-success dark:text-green-400',
  VES: 'text-blue-700 dark:text-blue-400',
  EUR: 'text-purple-700 dark:text-purple-400',
  USD_BCV: 'text-emerald-700 dark:text-emerald-400',
  EUR_BCV: 'text-violet-700 dark:text-violet-400',
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'VES') {
    return `Bs ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'EUR' || currency === 'EUR_BCV') {
    return `€${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
