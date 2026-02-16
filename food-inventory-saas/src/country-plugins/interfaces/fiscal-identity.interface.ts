export interface FiscalIdType {
  code: string;
  name: string;
  pattern: RegExp;
  example: string;
}

export interface ValidationResult {
  valid: boolean;
  type?: string;
  error?: string;
}

export interface ParsedFiscalId {
  type: string;
  number: string;
  checkDigit?: string;
  formatted: string;
}

export interface FiscalIdentity {
  getIdTypes(): FiscalIdType[];
  validate(taxId: string, type?: string): ValidationResult;
  format(taxId: string, type?: string): string;
  parse(rawInput: string): ParsedFiscalId;
  getFieldLabel(): string;
}
