import { CountryPlugin } from '../../interfaces';
import { VeTaxEngine } from './ve-tax-engine';
import { VeFiscalIdentity } from './ve-fiscal-identity';
import { VeCurrencyEngine } from './ve-currency-engine';
import { VePaymentEngine } from './ve-payment-engine';
import { VeEInvoiceProvider } from './ve-e-invoice-provider';
import { VeDocumentTypes } from './ve-document-types';
import { VeLocaleProvider } from './ve-locale-provider';

export class VenezuelaPlugin implements CountryPlugin {
  readonly countryCode = 'VE';
  readonly countryName = 'Venezuela';
  readonly taxEngine = new VeTaxEngine();
  readonly fiscalIdentity = new VeFiscalIdentity();
  readonly currencyEngine = new VeCurrencyEngine();
  readonly paymentEngine = new VePaymentEngine();
  readonly eInvoiceProvider = new VeEInvoiceProvider();
  readonly documentTypes = new VeDocumentTypes();
  readonly localeProvider = new VeLocaleProvider();
}
