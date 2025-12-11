import { Injectable, Logger } from '@nestjs/common';
import { BillingDocument } from '../../../schemas/billing-document.schema';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

export interface SeniatXMLResult {
  xml: string;
  hash: string;
  qrCode: string;
  verificationUrl: string;
}

@Injectable()
export class SeniatExportService {
  private readonly logger = new Logger(SeniatExportService.name);

  // Base URL for SENIAT verification (configurable via env)
  private readonly SENIAT_VERIFICATION_BASE_URL =
    process.env.SENIAT_VERIFICATION_URL || 'https://seniat.gob.ve/verify';

  /**
   * Generate XML in SENIAT format for electronic invoicing
   * @param invoice - Billing document
   * @returns Generated XML string
   */
  async generateXML(invoice: BillingDocument): Promise<string> {
    this.logger.debug(`Generating SENIAT XML for invoice ${invoice.documentNumber}`);

    try {
      // Build XML structure according to SENIAT specification
      const xml = this.buildSeniatXML(invoice);

      this.logger.log(`XML generated successfully for ${invoice.documentNumber}`);
      return xml;
    } catch (error) {
      this.logger.error(`Error generating XML for ${invoice.documentNumber}`, error);
      throw error;
    }
  }

  /**
   * Build SENIAT XML structure
   * Format follows Venezuelan SENIAT electronic invoicing standard
   */
  private buildSeniatXML(invoice: BillingDocument): string {
    const documentDate = new Date(invoice.documentDate).toISOString().split('T')[0];
    const issueDate = invoice.issueDate
      ? new Date(invoice.issueDate).toISOString().split('T')[0]
      : documentDate;

    // Escape XML special characters
    const escape = (str: string) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<FacturaElectronica xmlns="http://www.seniat.gob.ve/factura/v1" version="1.0">\n';

    // Header section
    xml += '  <Encabezado>\n';
    xml += `    <TipoDocumento>${this.mapDocumentType(invoice.type)}</TipoDocumento>\n`;
    xml += `    <NumeroDocumento>${escape(invoice.documentNumber)}</NumeroDocumento>\n`;
    xml += `    <NumeroControl>${escape(invoice.controlNumber || '')}</NumeroControl>\n`;
    xml += `    <FechaEmision>${issueDate}</FechaEmision>\n`;
    xml += `    <FechaDocumento>${documentDate}</FechaDocumento>\n`;
    xml += '  </Encabezado>\n';

    // Issuer section (empresa emisora)
    xml += '  <Emisor>\n';
    xml += `    <RIF>${escape(invoice.issuerInfo?.taxId || '')}</RIF>\n`;
    xml += `    <RazonSocial>${escape(invoice.issuerInfo?.name || '')}</RazonSocial>\n`;
    if (invoice.issuerInfo?.address) {
      xml += `    <Direccion>${escape(invoice.issuerInfo.address)}</Direccion>\n`;
    }
    if (invoice.issuerInfo?.phone) {
      xml += `    <Telefono>${escape(invoice.issuerInfo.phone)}</Telefono>\n`;
    }
    xml += '  </Emisor>\n';

    // Customer section (cliente)
    xml += '  <Receptor>\n';
    xml += `    <RIF>${escape(invoice.customerInfo?.taxId || '')}</RIF>\n`;
    xml += `    <RazonSocial>${escape(invoice.customerInfo?.name || '')}</RazonSocial>\n`;
    if (invoice.customerInfo?.address) {
      xml += `    <Direccion>${escape(invoice.customerInfo.address)}</Direccion>\n`;
    }
    if (invoice.customerInfo?.phone) {
      xml += `    <Telefono>${escape(invoice.customerInfo.phone)}</Telefono>\n`;
    }
    xml += '  </Receptor>\n';

    // Line items
    xml += '  <Detalle>\n';
    invoice.lines.forEach((line, index) => {
      xml += `    <Linea numero="${index + 1}">\n`;
      xml += `      <CodigoProducto>${escape(line.productCode || '')}</CodigoProducto>\n`;
      xml += `      <Descripcion>${escape(line.description)}</Descripcion>\n`;
      xml += `      <Cantidad>${line.quantity}</Cantidad>\n`;
      xml += `      <UnidadMedida>${escape(line.unitOfMeasure || 'UND')}</UnidadMedida>\n`;
      xml += `      <PrecioUnitario>${line.unitPrice.toFixed(2)}</PrecioUnitario>\n`;

      if (line.discountAmount && line.discountAmount > 0) {
        xml += `      <Descuento>${line.discountAmount.toFixed(2)}</Descuento>\n`;
      }

      const lineTotal = (line.quantity * line.unitPrice) - (line.discountAmount || 0);
      xml += `      <MontoLinea>${lineTotal.toFixed(2)}</MontoLinea>\n`;
      xml += '    </Linea>\n';
    });
    xml += '  </Detalle>\n';

    // Totals section
    xml += '  <Totales>\n';
    xml += `    <SubTotal>${invoice.subtotalAmount.toFixed(2)}</SubTotal>\n`;

    if (invoice.discountAmount && invoice.discountAmount > 0) {
      xml += `    <DescuentoGlobal>${invoice.discountAmount.toFixed(2)}</DescuentoGlobal>\n`;
    }

    xml += `    <BaseImponible>${(invoice.subtotalAmount - (invoice.discountAmount || 0)).toFixed(2)}</BaseImponible>\n`;
    xml += `    <MontoImpuesto>${invoice.taxAmount.toFixed(2)}</MontoImpuesto>\n`;
    xml += `    <MontoTotal>${invoice.totalAmount.toFixed(2)}</MontoTotal>\n`;
    xml += `    <Moneda>${escape(invoice.currency)}</Moneda>\n`;

    if (invoice.exchangeRate && invoice.exchangeRate !== 1) {
      xml += `    <TasaCambio>${invoice.exchangeRate.toFixed(4)}</TasaCambio>\n`;
    }

    xml += '  </Totales>\n';

    // Tax information
    if (invoice.taxAmount > 0) {
      xml += '  <Impuestos>\n';
      xml += '    <Impuesto>\n';
      xml += '      <Tipo>IVA</Tipo>\n';

      const taxBase = invoice.subtotalAmount - (invoice.discountAmount || 0);
      const taxRate = taxBase > 0 ? (invoice.taxAmount / taxBase) * 100 : 0;

      xml += `      <Alicuota>${taxRate.toFixed(2)}</Alicuota>\n`;
      xml += `      <BaseImponible>${taxBase.toFixed(2)}</BaseImponible>\n`;
      xml += `      <Monto>${invoice.taxAmount.toFixed(2)}</Monto>\n`;
      xml += '    </Impuesto>\n';
      xml += '  </Impuestos>\n';
    }

    // Withholding information (if applicable)
    if (invoice.requiresIvaWithholding) {
      xml += '  <Retenciones>\n';
      xml += '    <Retencion>\n';
      xml += '      <Tipo>IVA</Tipo>\n';
      xml += '      <Aplica>true</Aplica>\n';
      xml += '    </Retencion>\n';
      xml += '  </Retenciones>\n';
    }

    // Payment information
    xml += '  <CondicionesPago>\n';
    xml += `    <TerminosPago>${invoice.paymentTermDays || 0} días</TerminosPago>\n`;

    if (invoice.dueDate) {
      const dueDateStr = new Date(invoice.dueDate).toISOString().split('T')[0];
      xml += `    <FechaVencimiento>${dueDateStr}</FechaVencimiento>\n`;
    }

    xml += '  </CondicionesPago>\n';

    // Additional notes
    if (invoice.notes) {
      xml += '  <Observaciones>\n';
      xml += `    <Nota>${escape(invoice.notes)}</Nota>\n`;
      xml += '  </Observaciones>\n';
    }

    xml += '</FacturaElectronica>\n';

    return xml;
  }

  /**
   * Map internal document type to SENIAT type code
   */
  private mapDocumentType(type: string): string {
    const typeMap: Record<string, string> = {
      invoice: '01', // Factura
      credit_note: '02', // Nota de Crédito
      debit_note: '03', // Nota de Débito
    };

    return typeMap[type] || '01';
  }

  /**
   * Generate QR code for invoice verification
   * @param invoice - Billing document
   * @returns Base64 encoded QR code image
   */
  async generateQRCode(invoice: BillingDocument): Promise<string> {
    this.logger.debug(`Generating QR code for invoice ${invoice.documentNumber}`);

    try {
      // Build verification URL with invoice data
      const verificationData = {
        rif: invoice.issuerInfo?.taxId,
        type: this.mapDocumentType(invoice.type),
        number: invoice.documentNumber,
        control: invoice.controlNumber,
        date: new Date(invoice.documentDate).toISOString().split('T')[0],
        amount: invoice.totalAmount.toFixed(2),
      };

      // Create URL with query parameters
      const queryString = Object.entries(verificationData)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const verificationUrl = `${this.SENIAT_VERIFICATION_BASE_URL}?${queryString}`;

      // Generate QR code as base64
      const qrCodeBase64 = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1,
      });

      this.logger.log(`QR code generated for ${invoice.documentNumber}`);
      return qrCodeBase64;
    } catch (error) {
      this.logger.error(`Error generating QR code for ${invoice.documentNumber}`, error);
      throw error;
    }
  }

  /**
   * Sign XML document digitally (placeholder for future implementation)
   * @param xml - XML string to sign
   * @param certificate - Optional certificate for signing
   * @returns Signed XML
   */
  async signDocument(xml: string, certificate?: any): Promise<string> {
    this.logger.debug('Digital signature requested');

    // TODO: Implement XML digital signature when certificates are available
    // This would use xmldsig or similar library with X.509 certificates

    if (certificate) {
      this.logger.warn('Digital signature requested but not yet implemented');
      // Future implementation would:
      // 1. Load certificate and private key
      // 2. Create XML signature
      // 3. Embed signature in XML
      // 4. Return signed XML
    }

    // For now, return unsigned XML
    return xml;
  }

  /**
   * Validate XML against SENIAT XSD schema
   * @param xml - XML string to validate
   * @returns Validation result
   */
  validateXML(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Basic XML validation
      if (!xml || xml.trim() === '') {
        errors.push('XML vacío');
        return { valid: false, errors };
      }

      // Check for XML declaration
      if (!xml.trim().startsWith('<?xml')) {
        errors.push('XML debe comenzar con declaración <?xml');
      }

      // Check for root element
      if (!xml.includes('<FacturaElectronica')) {
        errors.push('XML debe contener elemento raíz FacturaElectronica');
      }

      // Check for required sections
      const requiredSections = [
        'Encabezado',
        'Emisor',
        'Receptor',
        'Detalle',
        'Totales',
      ];

      requiredSections.forEach((section) => {
        if (!xml.includes(`<${section}`)) {
          errors.push(`Sección requerida faltante: ${section}`);
        }
      });

      // TODO: Implement full XSD validation when schema is available
      // This would use libxmljs2 or similar to validate against XSD

      this.logger.debug(`XML validation: ${errors.length} errors found`);

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Error validating XML', error);
      errors.push(`Error de validación: ${error.message}`);
      return { valid: false, errors };
    }
  }

  /**
   * Generate complete SENIAT export package
   * @param invoice - Billing document
   * @returns Complete export result with XML, hash, QR code, and URL
   */
  async generateCompleteExport(invoice: BillingDocument): Promise<SeniatXMLResult> {
    this.logger.log(`Generating complete SENIAT export for ${invoice.documentNumber}`);

    try {
      // 1. Generate XML
      const xml = await this.generateXML(invoice);

      // 2. Validate XML
      const validation = this.validateXML(xml);
      if (!validation.valid) {
        throw new Error(
          `XML validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // 3. Calculate XML hash for integrity
      const hash = this.calculateHash(xml);

      // 4. Generate QR code
      const qrCode = await this.generateQRCode(invoice);

      // 5. Build verification URL
      const verificationUrl = this.buildVerificationUrl(invoice);

      this.logger.log(`Complete export generated for ${invoice.documentNumber}`);

      return {
        xml,
        hash,
        qrCode,
        verificationUrl,
      };
    } catch (error) {
      this.logger.error(`Error generating complete export for ${invoice.documentNumber}`, error);
      throw error;
    }
  }

  /**
   * Calculate SHA-256 hash of XML for integrity verification
   * @param xml - XML string
   * @returns Hex encoded hash
   */
  private calculateHash(xml: string): string {
    return crypto.createHash('sha256').update(xml, 'utf8').digest('hex');
  }

  /**
   * Build verification URL for invoice
   * @param invoice - Billing document
   * @returns Verification URL
   */
  private buildVerificationUrl(invoice: BillingDocument): string {
    const params = {
      rif: invoice.issuerInfo?.taxId || '',
      type: this.mapDocumentType(invoice.type),
      number: invoice.documentNumber,
      control: invoice.controlNumber || '',
    };

    const queryString = Object.entries(params)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    return `${this.SENIAT_VERIFICATION_BASE_URL}?${queryString}`;
  }
}
