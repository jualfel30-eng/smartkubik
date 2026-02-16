export interface DocumentTypeDefinition {
  code: string;
  name: string;
  hasTaxes: boolean;
  requiresControlNumber: boolean;
  requiresFiscalId: boolean;
}

export interface BillingChannel {
  code: string;
  name: string;
}

export interface NumberingScope {
  code: string;
  name: string;
}

export interface NumberingRule {
  format: string;
  padLength: number;
  prefixSeparator: string;
}

export interface DocumentTypes {
  getTypes(): DocumentTypeDefinition[];
  getChannels(): BillingChannel[];
  getNumberingScopes(): NumberingScope[];
  getNumberingRules(documentType: string): NumberingRule;
}
