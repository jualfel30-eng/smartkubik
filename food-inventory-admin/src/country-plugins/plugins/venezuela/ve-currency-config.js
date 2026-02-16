export const veCurrencyEngine = {
  getPrimaryCurrency() {
    return { code: 'VES', symbol: 'Bs', name: 'Bolívar', decimals: 2 };
  },

  getSecondaryCurrencies() {
    return [{ code: 'USD', symbol: '$', name: 'Dólar Estadounidense', decimals: 2 }];
  },

  getExchangeRateConfig() {
    return {
      source: 'BCV',
      endpoint: '/exchange-rate/bcv',
      refreshIntervalMs: 3600000,
      isEditable: false,
    };
  },

  getDenominations(currencyCode) {
    const denominations = {
      VES: [500, 200, 100, 50, 20, 10, 5],
      USD: [100, 50, 20, 10, 5, 2, 1],
    };
    return denominations[currencyCode] || [];
  },

  isExchangeRateEditable() {
    return false;
  },
};
