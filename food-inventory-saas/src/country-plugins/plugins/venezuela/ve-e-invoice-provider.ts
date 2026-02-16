import {
  EInvoiceProvider,
  EInvoiceValidationResult,
  EInvoiceSubmissionResult,
  ControlNumberRequest,
  ControlNumberResponse,
  AuthorityBranding,
} from '../../interfaces';

export class VeEInvoiceProvider implements EInvoiceProvider {
  isRequired(): boolean {
    return true;
  }

  validateDocument(doc: any): EInvoiceValidationResult {
    const errors: string[] = [];

    if (!doc.tenantId) errors.push('tenantId is required');
    if (!doc.documentType) errors.push('documentType is required');

    return { valid: errors.length === 0, errors };
  }

  async submitDocument(_doc: any): Promise<EInvoiceSubmissionResult> {
    // Delegates to ImprentaDigitalProvider in Phase 1
    return {
      success: false,
      error: 'E-invoice submission not yet wired. Use ImprentaDigitalProvider directly.',
    };
  }

  async requestControlNumber(
    _payload: ControlNumberRequest,
  ): Promise<ControlNumberResponse> {
    // Delegates to ImprentaDigitalProvider in Phase 1
    throw new Error(
      'Control number request not yet wired. Use ImprentaDigitalProvider directly.',
    );
  }

  generateFiscalFormat(_doc: any): string {
    // SENIAT XML format — to be implemented in Phase 1
    return '';
  }

  getAuthorityName(): string {
    return 'SENIAT';
  }

  getAuthorityBranding(): AuthorityBranding {
    return {
      name: 'Servicio Nacional Integrado de Administración Aduanera y Tributaria',
      abbreviation: 'SENIAT',
      verificationUrl: 'https://declaraciones.seniat.gob.ve',
    };
  }
}
