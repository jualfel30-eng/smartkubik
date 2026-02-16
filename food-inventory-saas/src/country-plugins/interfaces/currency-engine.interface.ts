export interface CurrencyDefinition {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface ExchangeRateConfig {
  source: string;
  endpoint?: string;
  refreshIntervalMs: number;
  isEditable: boolean;
}

export interface CurrencyEngine {
  getPrimaryCurrency(): CurrencyDefinition;
  getSecondaryCurrencies(): CurrencyDefinition[];
  getExchangeRateConfig(): ExchangeRateConfig | null;
  getDenominations(currencyCode: string): number[];
  isExchangeRateEditable(): boolean;
}
