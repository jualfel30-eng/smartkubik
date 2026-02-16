import { veTaxConfig } from './ve-tax-config';
import { vePaymentEngine } from './ve-payment-methods';
import { veCurrencyEngine } from './ve-currency-config';
import { veFiscalIdentity } from './ve-fiscal-identity';
import { veLocaleProvider } from './ve-locale';

export const venezuelaPlugin = {
  countryCode: 'VE',
  countryName: 'Venezuela',
  taxEngine: veTaxConfig,
  fiscalIdentity: veFiscalIdentity,
  currencyEngine: veCurrencyEngine,
  paymentEngine: vePaymentEngine,
  localeProvider: veLocaleProvider,
};
