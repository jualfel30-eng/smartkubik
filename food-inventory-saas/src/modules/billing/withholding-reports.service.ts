import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WithholdingDocument,
  WithholdingDocumentDocument,
} from '../../schemas/withholding-document.schema';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface IvaRetentionSummary {
  providerName: string;
  providerTaxId: string;
  retentions: Array<{
    documentNumber: string;
    controlNumber: string;
    date: Date;
    invoiceNumber: string;
    invoiceControlNumber: string;
    baseAmount: number;
    taxAmount: number;
    retentionPercentage: number;
    retentionAmount: number;
  }>;
  totals: {
    baseAmount: number;
    taxAmount: number;
    retentionAmount: number;
    count: number;
  };
}

interface IslrRetentionSummary {
  conceptCode: string;
  conceptDescription: string;
  retentions: Array<{
    providerName: string;
    providerTaxId: string;
    documentNumber: string;
    controlNumber: string;
    date: Date;
    invoiceNumber: string;
    baseAmount: number;
    retentionPercentage: number;
    retentionAmount: number;
    sustraendo?: number;
  }>;
  totals: {
    baseAmount: number;
    retentionAmount: number;
    count: number;
  };
}

@Injectable()
export class WithholdingReportsService {
  private readonly logger = new Logger(WithholdingReportsService.name);

  constructor(
    @InjectModel(WithholdingDocument.name)
    private withholdingModel: Model<WithholdingDocumentDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
  ) {}

  /**
   * Genera Libro de Retenciones IVA mensual
   */
  async generateIvaMonthlyReport(
    tenantId: string,
    year: number,
    month: number,
    format: 'pdf' | 'json' = 'pdf',
  ): Promise<Buffer | IvaRetentionSummary[]> {
    this.logger.log(`Generando libro IVA para ${year}-${month.toString().padStart(2, '0')}`);

    // Validar período
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('Año inválido');
    }
    if (month < 1 || month > 12) {
      throw new BadRequestException('Mes inválido');
    }

    // Calcular rango de fechas
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Obtener retenciones IVA del período
    const retentions = await this.withholdingModel
      .find({
        tenantId,
        type: 'iva',
        status: 'issued',
        issueDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ issueDate: 1, documentNumber: 1 })
      .lean();

    if (retentions.length === 0) {
      throw new BadRequestException('No hay retenciones IVA emitidas en el período seleccionado');
    }

    // Agrupar por proveedor
    const summary = this.groupIvaRetentionsByProvider(retentions);

    // Retornar según formato
    if (format === 'json') {
      return summary;
    }

    // Generar PDF
    const tenant = await this.tenantModel.findById(tenantId).lean();
    return this.generateIvaReportPdf(summary, tenant, year, month);
  }

  /**
   * Genera Relación de Retenciones ISLR anual
   */
  async generateIslrAnnualReport(
    tenantId: string,
    year: number,
    format: 'pdf' | 'json' | 'txt' = 'pdf',
  ): Promise<Buffer | IslrRetentionSummary[] | string> {
    this.logger.log(`Generando relación ISLR para ${year}`);

    // Validar año
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('Año inválido');
    }

    // Calcular rango de fechas
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Obtener retenciones ISLR del período
    const retentions = await this.withholdingModel
      .find({
        tenantId,
        type: 'islr',
        status: 'issued',
        issueDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ issueDate: 1, documentNumber: 1 })
      .lean();

    if (retentions.length === 0) {
      throw new BadRequestException('No hay retenciones ISLR emitidas en el año seleccionado');
    }

    // Agrupar por concepto
    const summary = this.groupIslrRetentionsByConcept(retentions);

    // Retornar según formato
    if (format === 'json') {
      return summary;
    }

    if (format === 'txt') {
      return this.generateIslrReportTxt(summary, year);
    }

    // Generar PDF
    const tenant = await this.tenantModel.findById(tenantId).lean();
    return this.generateIslrReportPdf(summary, tenant, year);
  }

  /**
   * Agrupa retenciones IVA por proveedor
   */
  private groupIvaRetentionsByProvider(
    retentions: any[],
  ): IvaRetentionSummary[] {
    const grouped = new Map<string, IvaRetentionSummary>();

    for (const retention of retentions) {
      const providerId = retention.beneficiary?.taxId || 'SIN-RIF';

      if (!grouped.has(providerId)) {
        grouped.set(providerId, {
          providerName: retention.beneficiary?.name || 'Sin nombre',
          providerTaxId: providerId,
          retentions: [],
          totals: {
            baseAmount: 0,
            taxAmount: 0,
            retentionAmount: 0,
            count: 0,
          },
        });
      }

      const summary = grouped.get(providerId)!;

      summary.retentions.push({
        documentNumber: retention.documentNumber,
        controlNumber: retention.controlNumber || '',
        date: retention.issueDate,
        invoiceNumber: retention.affectedDocument?.documentNumber || '',
        invoiceControlNumber: retention.affectedDocument?.controlNumber || '',
        baseAmount: retention.ivaRetention?.baseAmount || 0,
        taxAmount: retention.ivaRetention?.taxAmount || 0,
        retentionPercentage: retention.ivaRetention?.retentionPercentage || 0,
        retentionAmount: retention.ivaRetention?.retentionAmount || 0,
      });

      summary.totals.baseAmount += retention.ivaRetention?.baseAmount || 0;
      summary.totals.taxAmount += retention.ivaRetention?.taxAmount || 0;
      summary.totals.retentionAmount += retention.ivaRetention?.retentionAmount || 0;
      summary.totals.count++;
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.providerName.localeCompare(b.providerName),
    );
  }

  /**
   * Agrupa retenciones ISLR por concepto
   */
  private groupIslrRetentionsByConcept(
    retentions: any[],
  ): IslrRetentionSummary[] {
    const grouped = new Map<string, IslrRetentionSummary>();

    for (const retention of retentions) {
      const conceptCode = retention.islrRetention?.conceptCode || 'SIN-CONCEPTO';

      if (!grouped.has(conceptCode)) {
        grouped.set(conceptCode, {
          conceptCode,
          conceptDescription: retention.islrRetention?.conceptDescription || 'Sin descripción',
          retentions: [],
          totals: {
            baseAmount: 0,
            retentionAmount: 0,
            count: 0,
          },
        });
      }

      const summary = grouped.get(conceptCode)!;

      summary.retentions.push({
        providerName: retention.beneficiary?.name || 'Sin nombre',
        providerTaxId: retention.beneficiary?.taxId || 'SIN-RIF',
        documentNumber: retention.documentNumber,
        controlNumber: retention.controlNumber || '',
        date: retention.issueDate,
        invoiceNumber: retention.affectedDocument?.documentNumber || '',
        baseAmount: retention.islrRetention?.baseAmount || 0,
        retentionPercentage: retention.islrRetention?.retentionPercentage || 0,
        retentionAmount: retention.islrRetention?.retentionAmount || 0,
        sustraendo: retention.islrRetention?.sustraendo,
      });

      summary.totals.baseAmount += retention.islrRetention?.baseAmount || 0;
      summary.totals.retentionAmount += retention.islrRetention?.retentionAmount || 0;
      summary.totals.count++;
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.conceptCode.localeCompare(b.conceptCode),
    );
  }

  /**
   * Genera PDF del Libro de Retenciones IVA
   */
  private generateIvaReportPdf(
    summary: IvaRetentionSummary[],
    tenant: any,
    year: number,
    month: number,
  ): Buffer {
    const pdf = new jsPDF('landscape');
    const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });

    // Header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LIBRO DE RETENCIONES DE IVA', pdf.internal.pageSize.width / 2, 15, {
      align: 'center',
    });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Período: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
      pdf.internal.pageSize.width / 2,
      22,
      { align: 'center' },
    );

    pdf.setFontSize(10);
    pdf.text(tenant?.name || 'Empresa', 14, 30);
    pdf.text(`RIF: ${tenant?.taxInfo?.rif || 'J-00000000-0'}`, 14, 36);

    let y = 45;

    // Resumen por proveedor
    for (const provider of summary) {
      // Check if we need a new page
      if (y > pdf.internal.pageSize.height - 60) {
        pdf.addPage('landscape');
        y = 20;
      }

      // Provider header
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${provider.providerName} (${provider.providerTaxId})`, 14, y);
      y += 7;

      // Table data
      const tableData = provider.retentions.map((ret) => [
        this.formatDate(ret.date),
        ret.documentNumber,
        ret.controlNumber,
        ret.invoiceNumber,
        ret.invoiceControlNumber,
        this.formatCurrency(ret.baseAmount),
        this.formatCurrency(ret.taxAmount),
        `${ret.retentionPercentage}%`,
        this.formatCurrency(ret.retentionAmount),
      ]);

      autoTable(pdf, {
        startY: y,
        head: [
          [
            'Fecha',
            'N° Retención',
            'N° Control',
            'N° Factura',
            'Control Factura',
            'Base Imponible',
            'IVA',
            '% Ret.',
            'Monto Retenido',
          ],
        ],
        body: tableData,
        foot: [
          [
            { content: 'Subtotales:', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: this.formatCurrency(provider.totals.baseAmount), styles: { fontStyle: 'bold' } },
            { content: this.formatCurrency(provider.totals.taxAmount), styles: { fontStyle: 'bold' } },
            '',
            { content: this.formatCurrency(provider.totals.retentionAmount), styles: { fontStyle: 'bold' } },
          ],
        ],
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: 0 },
        margin: { left: 14, right: 14 },
      });

      y = (pdf as any).lastAutoTable.finalY + 10;
    }

    // Totales generales
    const grandTotals = {
      baseAmount: summary.reduce((sum, p) => sum + p.totals.baseAmount, 0),
      taxAmount: summary.reduce((sum, p) => sum + p.totals.taxAmount, 0),
      retentionAmount: summary.reduce((sum, p) => sum + p.totals.retentionAmount, 0),
      count: summary.reduce((sum, p) => sum + p.totals.count, 0),
    };

    if (y > pdf.internal.pageSize.height - 40) {
      pdf.addPage('landscape');
      y = 20;
    }

    pdf.setFillColor(66, 139, 202);
    pdf.rect(14, y, pdf.internal.pageSize.width - 28, 25, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTALES GENERALES', 20, y + 8);

    pdf.setFontSize(10);
    pdf.text(`Total Retenciones: ${grandTotals.count}`, 20, y + 15);
    pdf.text(`Base Imponible: ${this.formatCurrency(grandTotals.baseAmount)}`, 20, y + 21);

    pdf.text(`IVA Total: ${this.formatCurrency(grandTotals.taxAmount)}`, 120, y + 15);
    pdf.text(
      `Total Retenido: ${this.formatCurrency(grandTotals.retentionAmount)}`,
      120,
      y + 21,
    );

    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Genera PDF de la Relación de Retenciones ISLR
   */
  private generateIslrReportPdf(
    summary: IslrRetentionSummary[],
    tenant: any,
    year: number,
  ): Buffer {
    const pdf = new jsPDF('landscape');

    // Header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RELACIÓN ANUAL DE RETENCIONES DE ISLR', pdf.internal.pageSize.width / 2, 15, {
      align: 'center',
    });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Año Fiscal: ${year}`, pdf.internal.pageSize.width / 2, 22, { align: 'center' });

    pdf.setFontSize(10);
    pdf.text(tenant?.name || 'Empresa', 14, 30);
    pdf.text(`RIF: ${tenant?.taxInfo?.rif || 'J-00000000-0'}`, 14, 36);

    let y = 45;

    // Resumen por concepto
    for (const concept of summary) {
      // Check if we need a new page
      if (y > pdf.internal.pageSize.height - 60) {
        pdf.addPage('landscape');
        y = 20;
      }

      // Concept header
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${concept.conceptCode} - ${concept.conceptDescription}`, 14, y);
      y += 7;

      // Table data
      const tableData = concept.retentions.map((ret) => [
        this.formatDate(ret.date),
        ret.providerName,
        ret.providerTaxId,
        ret.documentNumber,
        ret.controlNumber,
        ret.invoiceNumber,
        this.formatCurrency(ret.baseAmount),
        `${ret.retentionPercentage}%`,
        ret.sustraendo ? this.formatCurrency(ret.sustraendo) : '-',
        this.formatCurrency(ret.retentionAmount),
      ]);

      autoTable(pdf, {
        startY: y,
        head: [
          [
            'Fecha',
            'Proveedor',
            'RIF',
            'N° Retención',
            'N° Control',
            'N° Factura',
            'Base',
            '% Ret.',
            'Sustraendo',
            'Monto Retenido',
          ],
        ],
        body: tableData,
        foot: [
          [
            { content: 'Subtotales:', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: this.formatCurrency(concept.totals.baseAmount), styles: { fontStyle: 'bold' } },
            { content: '', colSpan: 2 },
            { content: this.formatCurrency(concept.totals.retentionAmount), styles: { fontStyle: 'bold' } },
          ],
        ],
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [76, 175, 80], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: 0 },
        margin: { left: 14, right: 14 },
      });

      y = (pdf as any).lastAutoTable.finalY + 10;
    }

    // Totales generales
    const grandTotals = {
      baseAmount: summary.reduce((sum, c) => sum + c.totals.baseAmount, 0),
      retentionAmount: summary.reduce((sum, c) => sum + c.totals.retentionAmount, 0),
      count: summary.reduce((sum, c) => sum + c.totals.count, 0),
    };

    if (y > pdf.internal.pageSize.height - 40) {
      pdf.addPage('landscape');
      y = 20;
    }

    pdf.setFillColor(76, 175, 80);
    pdf.rect(14, y, pdf.internal.pageSize.width - 28, 25, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTALES GENERALES', 20, y + 8);

    pdf.setFontSize(10);
    pdf.text(`Total Retenciones: ${grandTotals.count}`, 20, y + 15);
    pdf.text(`Base Total: ${this.formatCurrency(grandTotals.baseAmount)}`, 20, y + 21);
    pdf.text(
      `Total Retenido: ${this.formatCurrency(grandTotals.retentionAmount)}`,
      120,
      y + 18,
    );

    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Genera archivo TXT de ISLR (formato ARC para SENIAT)
   */
  private generateIslrReportTxt(summary: IslrRetentionSummary[], year: number): string {
    let output = `RELACION DE RETENCIONES ISLR - AÑO ${year}\n`;
    output += '='.repeat(80) + '\n\n';

    for (const concept of summary) {
      output += `CONCEPTO: ${concept.conceptCode} - ${concept.conceptDescription}\n`;
      output += '-'.repeat(80) + '\n';

      output += String('FECHA').padEnd(12);
      output += String('PROVEEDOR').padEnd(30);
      output += String('RIF').padEnd(15);
      output += String('RETENCION').padEnd(15);
      output += String('MONTO').padStart(12) + '\n';
      output += '-'.repeat(80) + '\n';

      for (const ret of concept.retentions) {
        output += this.formatDate(ret.date).padEnd(12);
        output += ret.providerName.substring(0, 29).padEnd(30);
        output += ret.providerTaxId.padEnd(15);
        output += ret.documentNumber.padEnd(15);
        output += this.formatCurrency(ret.retentionAmount).padStart(12) + '\n';
      }

      output += '-'.repeat(80) + '\n';
      output += `Subtotal: ${this.formatCurrency(concept.totals.retentionAmount)}`.padStart(80) + '\n\n';
    }

    const grandTotal = summary.reduce((sum, c) => sum + c.totals.retentionAmount, 0);
    output += '='.repeat(80) + '\n';
    output += `TOTAL GENERAL: ${this.formatCurrency(grandTotal)}`.padStart(80) + '\n';

    return output;
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
