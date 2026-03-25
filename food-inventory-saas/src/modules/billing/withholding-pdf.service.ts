import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WithholdingDocumentDocument } from '../../schemas/withholding-document.schema';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as QRCode from 'qrcode';

@Injectable()
export class WithholdingPdfService {
  private readonly logger = new Logger(WithholdingPdfService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  /**
   * Genera PDF del comprobante de retención
   */
  async generate(retention: WithholdingDocumentDocument): Promise<Buffer> {
    const tenant = await this.getTenantData(retention.tenantId.toString());
    const logoData = await this.fetchLogo(tenant);

    const pdf = new jsPDF();
    let y = 20;

    // Logo
    if (logoData) {
      y = this.addLogo(pdf, logoData.data, logoData.format, y);
    }

    // Header - Datos del emisor (beneficiario)
    y = this.addHeader(pdf, retention, tenant, y);

    // Título del documento
    y = this.addTitle(pdf, retention, y);

    // Información del documento
    y = this.addDocumentInfo(pdf, retention, y);

    // Datos del proveedor/agente retenido
    y = this.addWithholdingAgent(pdf, retention, y);

    // Documento afectado (factura)
    y = this.addAffectedDocument(pdf, retention, y);

    // Detalle de retención (IVA o ISLR)
    y = this.addRetentionDetail(pdf, retention, y);

    // Totales
    y = this.addTotals(pdf, retention, y);

    // QR Code
    await this.addQRCode(pdf, retention, y);

    // Footer
    this.addFooter(pdf, retention);

    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Obtiene datos del tenant
   */
  private async getTenantData(tenantId: string): Promise<any> {
    try {
      const tenant = await this.tenantModel.findById(tenantId).lean();
      return tenant;
    } catch (error) {
      this.logger.warn(`Failed to fetch tenant ${tenantId}:`, error.message);
      return null;
    }
  }

  /**
   * Descarga el logo del tenant
   */
  private async fetchLogo(tenant: any): Promise<{ data: string; format: string } | null> {
    if (!tenant?.logo) return null;

    try {
      const response = await fetch(tenant.logo);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = buffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';
        const format = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG';
        return { data, format };
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch logo:`, error.message);
    }
    return null;
  }

  /**
   * Agrega logo al PDF
   */
  private addLogo(pdf: jsPDF, logoData: string, format: string, y: number): number {
    try {
      const props = (pdf as any).getImageProperties(logoData);
      const aspectRatio = props.width / props.height;
      let w = 30;
      let h = 30;

      if (aspectRatio > 1) {
        h = 30 / aspectRatio;
      } else {
        h = 30;
        w = 30 * aspectRatio;
      }

      pdf.addImage(logoData, format, 14, 10, w, h);
      const newY = 10 + h + 10;
      return newY < 40 ? 40 : newY;
    } catch (error) {
      this.logger.warn('Failed to add logo to PDF:', error.message);
      return y;
    }
  }

  /**
   * Agrega header con datos del emisor (beneficiario)
   */
  private addHeader(pdf: jsPDF, retention: WithholdingDocumentDocument, tenant: any, y: number): number {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(retention.beneficiary?.name || tenant?.name || 'EMPRESA', 14, y);
    y += 6;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const taxId = retention.beneficiary?.taxId || tenant?.taxInfo?.rif || '';
    if (taxId) {
      pdf.text(`RIF: ${taxId}`, 14, y);
      y += 5;
    }

    const address = retention.beneficiary?.address ||
      (tenant?.contactInfo?.address ?
        `${tenant.contactInfo.address.street}, ${tenant.contactInfo.address.city}, ${tenant.contactInfo.address.state}` :
        '');
    if (address) {
      const lines = pdf.splitTextToSize(address, 180);
      pdf.text(lines, 14, y);
      y += lines.length * 5;
    }

    const email = retention.beneficiary?.email || tenant?.contactInfo?.email || '';
    const phone = retention.beneficiary?.phone || tenant?.contactInfo?.phone || '';
    if (email || phone) {
      const contact = [email, phone].filter(Boolean).join(' | ');
      pdf.text(contact, 14, y);
      y += 5;
    }

    return y + 5;
  }

  /**
   * Agrega título del documento
   */
  private addTitle(pdf: jsPDF, retention: WithholdingDocumentDocument, y: number): number {
    const title = retention.type === 'iva'
      ? 'COMPROBANTE DE RETENCIÓN DE IVA'
      : 'COMPROBANTE DE RETENCIÓN DE ISLR';

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pdf.internal.pageSize.width - titleWidth) / 2, y);

    return y + 10;
  }

  /**
   * Agrega información del documento
   */
  private addDocumentInfo(pdf: jsPDF, retention: WithholdingDocumentDocument, y: number): number {
    const data = [
      ['Comprobante N°:', retention.documentNumber],
      ['Número de Control:', retention.controlNumber || 'PENDIENTE'],
      ['Fecha de Emisión:', this.formatDate(retention.issueDate)],
      ['Fecha de Operación:', this.formatDate(retention.operationDate)],
    ];

    if (retention.taxInfo?.period) {
      data.push(['Período Fiscal:', retention.taxInfo.period]);
    }

    if (retention.taxInfo?.declarationNumber) {
      data.push(['N° Declaración:', retention.taxInfo.declarationNumber]);
    }

    autoTable(pdf, {
      startY: y,
      head: [],
      body: data,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14 },
    });

    return (pdf as any).lastAutoTable.finalY + 5;
  }

  /**
   * Agrega datos del emisor de la retención
   */
  private addWithholdingAgent(pdf: jsPDF, retention: WithholdingDocumentDocument, y: number): number {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATOS DEL EMISOR (QUIEN RETIENE)', 14, y);
    y += 6;

    const data = [
      ['Nombre/Razón Social:', retention.issuer?.name || ''],
      ['RIF:', retention.issuer?.taxId || ''],
    ];

    autoTable(pdf, {
      startY: y,
      head: [],
      body: data,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14 },
    });

    return (pdf as any).lastAutoTable.finalY + 5;
  }

  /**
   * Agrega información del documento afectado
   */
  private addAffectedDocument(pdf: jsPDF, retention: WithholdingDocumentDocument, y: number): number {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DOCUMENTO AFECTADO', 14, y);
    y += 6;

    const data = [
      ['Tipo de Documento:', 'Factura'],
      ['N° de Documento:', retention.affectedDocument?.documentNumber || ''],
      ['N° de Control:', retention.affectedDocument?.controlNumber || ''],
      ['Fecha de Emisión:', this.formatDate(retention.affectedDocument?.issueDate)],
      ['Monto Total:', this.formatCurrency(retention.affectedDocument?.totalAmount || 0, retention.totals?.currency)],
    ];

    autoTable(pdf, {
      startY: y,
      head: [],
      body: data,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14 },
    });

    return (pdf as any).lastAutoTable.finalY + 5;
  }

  /**
   * Agrega detalle de retención (IVA o ISLR)
   */
  private addRetentionDetail(pdf: jsPDF, retention: WithholdingDocumentDocument, y: number): number {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLE DE RETENCIÓN', 14, y);
    y += 6;

    let data: string[][] = [];

    if (retention.type === 'iva' && retention.ivaRetention) {
      data = [
        ['Base Imponible:', this.formatCurrency(retention.ivaRetention.baseAmount, retention.totals?.currency)],
        ['Alícuota IVA:', `${retention.ivaRetention.taxRate}%`],
        ['Monto IVA:', this.formatCurrency(retention.ivaRetention.taxAmount, retention.totals?.currency)],
        ['% de Retención:', `${retention.ivaRetention.retentionPercentage}%`],
        ['Monto Retenido:', this.formatCurrency(retention.ivaRetention.retentionAmount, retention.totals?.currency)],
      ];
    } else if (retention.type === 'islr' && retention.islrRetention) {
      data = [
        ['Concepto:', `${retention.islrRetention.conceptCode} - ${retention.islrRetention.conceptDescription}`],
        ['Base de Cálculo:', this.formatCurrency(retention.islrRetention.baseAmount, retention.totals?.currency)],
        ['% de Retención:', `${retention.islrRetention.retentionPercentage}%`],
      ];

      if (retention.islrRetention.sustraendo) {
        data.push(['Sustraendo:', this.formatCurrency(retention.islrRetention.sustraendo, retention.totals?.currency)]);
      }

      data.push(['Monto Retenido:', this.formatCurrency(retention.islrRetention.retentionAmount, retention.totals?.currency)]);
    }

    autoTable(pdf, {
      startY: y,
      head: [],
      body: data,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto', halign: 'right' }
      },
      margin: { left: 14, right: 14 },
    });

    return (pdf as any).lastAutoTable.finalY + 5;
  }

  /**
   * Agrega totales
   */
  private addTotals(pdf: jsPDF, retention: WithholdingDocumentDocument, y: number): number {
    const pageWidth = pdf.internal.pageSize.width;
    const boxWidth = 80;
    const boxX = pageWidth - boxWidth - 14;

    // Box background
    pdf.setFillColor(240, 240, 240);
    pdf.rect(boxX, y, boxWidth, 30, 'F');

    // Border
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(boxX, y, boxWidth, 30, 'S');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    y += 7;

    // Subtotal
    pdf.text('Subtotal:', boxX + 5, y);
    pdf.text(
      this.formatCurrency(retention.totals?.subtotal || 0, retention.totals?.currency),
      boxX + boxWidth - 5,
      y,
      { align: 'right' }
    );
    y += 7;

    // IVA si aplica
    if (retention.totals?.totalTax) {
      pdf.setFont('helvetica', 'normal');
      pdf.text('IVA:', boxX + 5, y);
      pdf.text(
        this.formatCurrency(retention.totals.totalTax, retention.totals?.currency),
        boxX + boxWidth - 5,
        y,
        { align: 'right' }
      );
      y += 7;
    }

    // Total Retenido
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL RETENIDO:', boxX + 5, y);
    pdf.text(
      this.formatCurrency(retention.totals?.totalRetention || 0, retention.totals?.currency),
      boxX + boxWidth - 5,
      y,
      { align: 'right' }
    );

    return y + 15;
  }

  /**
   * Agrega QR code con datos de verificación
   */
  private async addQRCode(pdf: jsPDF, retention: WithholdingDocumentDocument, y: number): Promise<void> {
    try {
      // Datos para el QR
      const qrData = {
        type: retention.type.toUpperCase(),
        doc: retention.documentNumber,
        ctrl: retention.controlNumber || '',
        date: this.formatDate(retention.issueDate),
        amount: retention.totals?.totalRetention || 0,
        rif: retention.beneficiary?.taxId || '',
      };

      const qrString = JSON.stringify(qrData);

      // Generar QR code como data URL
      const qrDataUrl = await QRCode.toDataURL(qrString, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      // Agregar QR al PDF
      const qrSize = 35;
      const qrX = 14;
      const qrY = Math.min(y, pdf.internal.pageSize.height - qrSize - 20);

      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Texto junto al QR
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Escanea para verificar', qrX + qrSize + 5, qrY + 10);
      pdf.text('la autenticidad del', qrX + qrSize + 5, qrY + 15);
      pdf.text('comprobante', qrX + qrSize + 5, qrY + 20);
    } catch (error) {
      this.logger.warn('Failed to add QR code:', error.message);
    }
  }

  /**
   * Agrega footer con leyendas
   */
  private addFooter(pdf: jsPDF, retention: WithholdingDocumentDocument): void {
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    let y = pageHeight - 20;

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);

    const footer1 = 'Este comprobante de retención constituye documento legal según la normativa fiscal vigente.';
    pdf.text(footer1, pageWidth / 2, y, { align: 'center' });
    y += 4;

    const footer2 = retention.type === 'iva'
      ? 'Retención de IVA según artículos 10, 11 y 12 del Decreto N° 2.506 del 06/10/2003'
      : 'Retención de ISLR según Decreto N° 1.808 del 23/04/1997 y sus modificaciones';
    pdf.text(footer2, pageWidth / 2, y, { align: 'center' });
    y += 4;

    // Notes removed - not in schema

    // Línea de separación
    pdf.setDrawColor(200, 200, 200);
    pdf.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
  }

  /**
   * Formatea fecha
   */
  private formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea moneda
   */
  private formatCurrency(amount: number, currency: string = 'VES'): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
