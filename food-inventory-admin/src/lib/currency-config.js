export const CURRENCY_CONFIG = {
  USD: { symbol: '$', label: 'USD', name: 'Dólar' },
  EUR: { symbol: '€', label: 'EUR', name: 'Euro' },
};

export function getCurrencyConfig(code) {
  return CURRENCY_CONFIG[code] || CURRENCY_CONFIG.USD;
}

export function isVesMethod(methodId) {
  return methodId?.includes('_ves') || methodId === 'pago_movil_ves' || methodId === 'pos_ves' || methodId === 'tarjeta_ves';
}

export function formatForeignAmount(amount, code) {
  const cc = getCurrencyConfig(code);
  return `${cc.symbol}${Number(amount || 0).toFixed(2)}`;
}
