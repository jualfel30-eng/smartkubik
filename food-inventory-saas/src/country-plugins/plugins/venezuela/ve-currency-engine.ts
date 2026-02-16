import {
  CurrencyEngine,
  CurrencyDefinition,
  ExchangeRateConfig,
} from '../../interfaces';

export class VeCurrencyEngine implements CurrencyEngine {
  getPrimaryCurrency(): CurrencyDefinition {
    return {
      code: 'VES',
      symbol: 'Bs',
      name: 'Bolívar',
      decimals: 2,
    };
  }

  getSecondaryCurrencies(): CurrencyDefinition[] {
    return [
      {
        code: 'USD',
        symbol: '$',
        name: 'Dólar Estadounidense',
        decimals: 2,
      },
    ];
  }

  getExchangeRateConfig(): ExchangeRateConfig {
    return {
      source: 'BCV',
      endpoint: '/exchange-rate/bcv',
      refreshIntervalMs: 3600000,
      isEditable: false,
    };
  }

  getDenominations(currencyCode: string): number[] {
    const denominations: Record<string, number[]> = {
      VES: [500, 200, 100, 50, 20, 10, 5],
      USD: [100, 50, 20, 10, 5, 2, 1],
    };
    return denominations[currencyCode] || [];
  }

  isExchangeRateEditable(): boolean {
    return false;
  }
}
