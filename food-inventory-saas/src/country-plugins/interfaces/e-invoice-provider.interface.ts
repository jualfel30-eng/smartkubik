export interface EInvoiceValidationResult {
  valid: boolean;
  errors: string[];
}

export interface EInvoiceSubmissionResult {
  success: boolean;
  controlNumber?: string;
  authorizationCode?: string;
  error?: string;
}

export interface ControlNumberRequest {
  documentType: string;
  tenantId: string;
  sequenceId?: string;
}

export interface ControlNumberResponse {
  controlNumber: string;
  expiresAt?: Date;
}

export interface AuthorityBranding {
  name: string;
  abbreviation: string;
  verificationUrl?: string;
}

export interface EInvoiceProvider {
  isRequired(): boolean;
  validateDocument(doc: any): EInvoiceValidationResult;
  submitDocument(doc: any): Promise<EInvoiceSubmissionResult>;
  requestControlNumber(
    payload: ControlNumberRequest,
  ): Promise<ControlNumberResponse>;
  generateFiscalFormat(doc: any): string;
  getAuthorityName(): string;
  getAuthorityBranding(): AuthorityBranding;
}
