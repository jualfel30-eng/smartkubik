import { TaxEngine } from './tax-engine.interface';
import { FiscalIdentity } from './fiscal-identity.interface';
import { CurrencyEngine } from './currency-engine.interface';
import { PaymentEngine } from './payment-engine.interface';
import { EInvoiceProvider } from './e-invoice-provider.interface';
import { DocumentTypes } from './document-types.interface';
import { LocaleProvider } from './locale-provider.interface';

export interface CountryPlugin {
  readonly countryCode: string;
  readonly countryName: string;
  readonly taxEngine: TaxEngine;
  readonly fiscalIdentity: FiscalIdentity;
  readonly currencyEngine: CurrencyEngine;
  readonly paymentEngine: PaymentEngine;
  readonly eInvoiceProvider: EInvoiceProvider;
  readonly documentTypes: DocumentTypes;
  readonly localeProvider: LocaleProvider;
}
