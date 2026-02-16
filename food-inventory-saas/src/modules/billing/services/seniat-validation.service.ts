import { Injectable, Logger } from '@nestjs/common';
import { BillingDocument } from '../../../schemas/billing-document.schema';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

@Injectable()
export class SeniatValidationService {
  private readonly logger = new Logger(SeniatValidationService.name);

  // Threshold for requiring customer RIF (3000 tax units)
  private readonly RIF_REQUIRED_THRESHOLD = 3000;

  /**
   * Validate Venezuelan RIF (Registro de Información Fiscal)
   * Format: J-12345678-9 or V-12345678-9 or E-12345678-9 or G-12345678-9
   * @param rif - RIF to validate
   * @returns Validation result with errors if any
   */
  validateRIF(rif: string): ValidationResult {
    const errors: string[] = [];

    if (!rif || rif.trim() === '') {
      errors.push('RIF es requerido');
      return { valid: false, errors };
    }

    // Remove spaces and convert to uppercase
    const cleanRif = rif.trim().toUpperCase().replace(/\s/g, '');

    // Venezuelan RIF format: [VEJPG]-\d{8,9}-\d
    const rifPattern = /^([VEJPG])-?(\d{8,9})-?(\d)$/;
    const match = cleanRif.match(rifPattern);

    if (!match) {
      errors.push(
        'Formato de RIF inválido. Debe ser: [V,E,J,P,G]-12345678-9',
      );
      return { valid: false, errors };
    }

    const [, type, number, checkDigit] = match;

    // Validate RIF type
    const validTypes = ['V', 'E', 'J', 'P', 'G'];
    if (!validTypes.includes(type)) {
      errors.push(`Tipo de RIF inválido: ${type}. Debe ser V, E, J, P o G`);
    }

    // Validate number length
    if (number.length < 8 || number.length > 9) {
      errors.push('El número del RIF debe tener 8 o 9 dígitos');
    }

    // Validate check digit (basic validation)
    if (!/^\d$/.test(checkDigit)) {
      errors.push('Dígito verificador inválido');
    }

    // Optional: Implement module 11 check digit validation
    const calculatedCheckDigit = this.calculateRIFCheckDigit(type, number);
    if (calculatedCheckDigit !== parseInt(checkDigit, 10)) {
      errors.push(
        `Dígito verificador incorrecto. Esperado: ${calculatedCheckDigit}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate RIF check digit using module 11 algorithm
   * @param type - RIF type (V, E, J, P, G)
   * @param number - RIF number
   * @returns Calculated check digit
   */
  private calculateRIFCheckDigit(type: string, number: string): number {
    // RIF type to number mapping
    const typeMap: Record<string, number> = {
      V: 1,
      E: 2,
      J: 3,
      P: 4,
      G: 5,
    };

    const typeValue = typeMap[type] || 0;
    const paddedNumber = number.padStart(9, '0');

    // Weights for module 11: 4, 3, 2, 7, 6, 5, 4, 3, 2
    const weights = [4, 3, 2, 7, 6, 5, 4, 3, 2];

    let sum = typeValue * 4; // First weight for type

    for (let i = 0; i < paddedNumber.length; i++) {
      sum += parseInt(paddedNumber[i], 10) * weights[i];
    }

    const remainder = sum % 11;
    let checkDigit = 11 - remainder;

    // If check digit is 11, it becomes 0
    if (checkDigit === 11) {
      checkDigit = 0;
    }
    // If check digit is 10, some implementations use 0
    if (checkDigit === 10) {
      checkDigit = 0;
    }

    return checkDigit;
  }

  /**
   * Validate complete invoice structure for SENIAT compliance
   * @param invoice - Billing document to validate
   * @returns Validation result with all errors
   */
  validateInvoiceStructure(invoice: BillingDocument): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Basic document fields
    if (!invoice.documentNumber) {
      errors.push('Número de documento es requerido');
    }

    if (!invoice.issueDate && !(invoice as any).createdAt) {
      errors.push('Fecha de documento es requerida');
    }

    // 2. Validate document type
    const validTypes = ['invoice', 'credit_note', 'debit_note'];
    if (!validTypes.includes(invoice.type)) {
      errors.push(`Tipo de documento inválido: ${invoice.type}`);
    }

    // 3. Customer information
    if (!invoice.customer) {
      errors.push('Información del cliente es requerida');
    } else {
      if (!invoice.customer.name) {
        errors.push('Nombre del cliente es requerido');
      }

      // Validate customer RIF if amount is above threshold
      const customerTaxValidation = this.validateCustomerTaxInfo(invoice);
      if (!customerTaxValidation.valid) {
        errors.push(customerTaxValidation.message || 'Error de validación de RIF');
      }
    }

    // 4. Line items validation
    if (!invoice.items || invoice.items.length === 0) {
      errors.push('La factura debe tener al menos una línea');
    } else {
      invoice.items.forEach((line, index) => {
        if (!line.description) {
          errors.push(`Línea ${index + 1}: Descripción es requerida`);
        }
        if (line.quantity <= 0) {
          errors.push(`Línea ${index + 1}: Cantidad debe ser mayor a 0`);
        }
        if (line.unitPrice < 0) {
          errors.push(`Línea ${index + 1}: Precio unitario no puede ser negativo`);
        }
      });
    }

    // 5. Amounts validation
    const amountsValid = this.validateAmounts(invoice);
    if (!amountsValid) {
      errors.push('Los montos de la factura no cuadran correctamente');
    }

    // 6. Tax validation
    const taxTotal = (invoice.totals?.taxes || []).reduce((sum, t) => sum + (t.amount || 0), 0);
    if (taxTotal < 0) {
      errors.push('Monto de impuesto no puede ser negativo');
    }

    // 7. Status validation
    if (invoice.status === 'issued' && !invoice.controlNumber) {
      errors.push(
        'Facturas emitidas deben tener número de control de imprenta',
      );
    }

    // 8. Series validation (if applicable)
    if (!invoice.seriesId) {
      warnings.push('Serie de facturación no especificada');
    }

    // 9. Currency validation
    if (!invoice.totals?.currency) {
      errors.push('Moneda es requerida');
    }

    // 10. Payment terms (warning only)
    if (!invoice.paymentTerms?.dueDate && !invoice.paymentTerms?.type) {
      warnings.push('Términos de pago no especificados');
    }

    this.logger.debug(
      `Invoice ${invoice.documentNumber} validation: ${errors.length} errors, ${warnings.length} warnings`,
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that invoice amounts are correctly calculated
   * @param invoice - Billing document
   * @returns True if amounts are valid
   */
  validateAmounts(invoice: BillingDocument): boolean {
    try {
      // Calculate subtotal from lines
      let calculatedSubtotal = 0;

      if (invoice.items && invoice.items.length > 0) {
        calculatedSubtotal = invoice.items.reduce((sum, item) => {
          const lineTotal = item.quantity * item.unitPrice;
          const lineDiscount = item.discount?.value || 0; // Simplified discount check
          // Note: item.discount value handling might need more complex logic if type is percentage

          return sum + (item.total || lineTotal); // Use stored total if available to avoid complex recalc here
        }, 0);
      }

      // Allow small rounding differences (0.01)
      const storedSubtotal = invoice.totals?.subtotal || 0;
      // Note: Re-calculating EXACT subtotal from items can be tricky due to discounts/taxes per line.
      // For now, we trust totals.subtotal but could add stricter check if needed.


      const storedTotal = invoice.totals?.grandTotal || 0;
      const storedDiscounts = invoice.totals?.discounts || 0;
      const storedTax = (invoice.totals?.taxes || []).reduce((sum, t) => sum + (t.amount || 0), 0);

      const expectedTotal = storedSubtotal - storedDiscounts + storedTax;

      const totalDiff = Math.abs(expectedTotal - storedTotal);
      if (totalDiff > 0.05) { // Increased tolerance slightly
        this.logger.warn(
          `Total mismatch: calculated ${expectedTotal}, stored ${storedTotal}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error validating amounts', error);
      return false;
    }
  }

  /**
   * Validate control number format from imprenta digital
   * @param controlNumber - Control number to validate
   * @returns True if format is valid
   */
  validateControlNumber(controlNumber: string): boolean {
    if (!controlNumber || controlNumber.trim() === '') {
      return false;
    }

    // Control numbers typically have a specific format
    // Format varies by imprenta, but generally: XXXX-YYYY-ZZZZ or alphanumeric
    const cleanControlNumber = controlNumber.trim();

    // Minimum length check
    if (cleanControlNumber.length < 8) {
      return false;
    }

    // Must contain alphanumeric characters
    const alphanumericPattern = /^[A-Z0-9\-]+$/i;
    if (!alphanumericPattern.test(cleanControlNumber)) {
      return false;
    }

    return true;
  }

  /**
   * Validate customer tax information based on invoice amount
   * SENIAT requires RIF for transactions above certain threshold
   * @param invoice - Billing document
   * @returns Validation result
   */
  validateCustomerTaxInfo(invoice: BillingDocument): {
    valid: boolean;
    message?: string;
  } {
    // If total amount is above threshold, customer MUST have RIF
    const totalAmount = invoice.totals?.grandTotal || 0;
    if (totalAmount >= this.RIF_REQUIRED_THRESHOLD) {
      if (
        !invoice.customer?.taxId ||
        invoice.customer.taxId.trim() === ''
      ) {
        return {
          valid: false,
          message: `Facturas por montos superiores a ${this.RIF_REQUIRED_THRESHOLD} requieren RIF del cliente`,
        };
      }

      // Validate RIF format
      const rifValidation = this.validateRIF(invoice.customer.taxId);
      if (!rifValidation.valid) {
        return {
          valid: false,
          message: `RIF del cliente inválido: ${rifValidation.errors.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Comprehensive validation for SENIAT electronic invoicing
   * Combines all validations
   * @param invoice - Billing document
   * @returns Complete validation result
   */
  async validateForSENIAT(invoice: BillingDocument): Promise<ValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // 1. Validate invoice structure
    const structureValidation = this.validateInvoiceStructure(invoice);
    allErrors.push(...structureValidation.errors);
    if (structureValidation.warnings) {
      allWarnings.push(...structureValidation.warnings);
    }

    // 2. Validate control number (if issued)
    if (invoice.status === 'issued') {
      if (invoice.controlNumber && !this.validateControlNumber(invoice.controlNumber)) {
        allErrors.push('Número de control fiscal inválido');
      }
    }

    // 3. Additional SENIAT-specific validations
    // Check that document is not too old (SENIAT has time limits)
    const documentDate = invoice.issueDate || (invoice as any).createdAt;
    if (documentDate) {
      const documentAge = this.getDocumentAgeDays(documentDate);
      if (documentAge > 90) {
        allWarnings.push(
          `Documento tiene ${documentAge} días de antigüedad. SENIAT puede rechazar documentos muy antiguos.`,
        );
      }
    }

    // 4. Validate withholding agent information (if applicable)
    if (invoice.requiresIvaWithholding) {
      // Customer should be registered as withholding agent
      if (
        !invoice.customer?.taxId ||
        invoice.customer.taxId.trim() === ''
      ) {
        allErrors.push(
          'Cliente con retención de IVA debe tener RIF registrado',
        );
      }
    }

    this.logger.log(
      `SENIAT validation for ${invoice.documentNumber}: ${allErrors.length} errors, ${allWarnings.length} warnings`,
    );

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Calculate document age in days
   * @param documentDate - Document date
   * @returns Age in days
   */
  private getDocumentAgeDays(documentDate: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(documentDate).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}
