export interface TaxDefinition {
  type: string;
  rate: number;
  name: string;
  appliesTo: string[];
  isTransactional: boolean;
}

export interface TransactionTaxContext {
  paymentMethodId: string;
  currency: string;
  amount: number;
}

export interface TaxResult {
  taxType: string;
  rate: number;
  amount: number;
}

export interface TaxableItem {
  subtotal: number;
  quantity: number;
  unitPrice: number;
}

export interface TaxableDocument {
  items: TaxableItem[];
  documentType: string;
  payments?: { methodId: string; currency: string; amount: number }[];
}

export interface DocumentTaxResult {
  subtotal: number;
  totalTax: number;
  totalTransactionTax: number;
  total: number;
  breakdown: TaxResult[];
}

export interface WithholdingRule {
  type: string;
  rate: number;
  conditions: {
    taxpayerType?: string;
    threshold?: number;
  };
}

export interface TaxEngine {
  getDefaultTaxes(): TaxDefinition[];
  getTransactionTaxes(context: TransactionTaxContext): TaxDefinition[];
  getWithholdingRules(): WithholdingRule[];
  getExemptDocumentTypes(): string[];
  calculateLineTax(item: TaxableItem, taxes: TaxDefinition[]): TaxResult[];
  calculateDocumentTaxes(document: TaxableDocument): DocumentTaxResult;
}
