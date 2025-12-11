import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createHash } from "crypto";
import {
  BillingDocument,
  BillingDocumentDocument,
} from "../../schemas/billing-document.schema";
import {
  DocumentSequence,
  DocumentSequenceDocument,
} from "../../schemas/document-sequence.schema";
import { BillingEvidence } from "../../schemas/billing-evidence.schema";
import { BillingAuditLog } from "../../schemas/billing-audit-log.schema";
import { TaxSettings } from "../../schemas/tax-settings.schema";
import {
  CreateBillingDocumentDto,
  IssueBillingDocumentDto,
} from "../../dto/billing.dto";
import { NumberingService } from "./numbering.service";
import { ImprentaDigitalProvider } from "./imprenta-digital.provider";
import { SeniatValidationService } from "./services/seniat-validation.service";
import { SeniatExportService } from "./services/seniat-export.service";
import { ValidationResult } from "./services/seniat-validation.service";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocumentDocument>,
    @InjectModel(DocumentSequence.name)
    private sequenceModel: Model<DocumentSequenceDocument>,
    @InjectModel(BillingEvidence.name)
    private evidenceModel: Model<BillingEvidence>,
    @InjectModel(BillingAuditLog.name)
    private auditModel: Model<BillingAuditLog>,
    @InjectModel(TaxSettings.name)
    private taxSettingsModel: Model<TaxSettings>,
    private readonly numberingService: NumberingService,
    private readonly imprentaProvider: ImprentaDigitalProvider,
    private readonly eventEmitter: EventEmitter2,
    private readonly seniatValidation: SeniatValidationService,
    private readonly seniatExport: SeniatExportService,
  ) {}

  async getById(id: string, tenantId: string) {
    return this.billingModel.findOne({ _id: id, tenantId }).lean();
  }

  async create(dto: CreateBillingDocumentDto, tenantId: string) {
    const series = await this.sequenceModel.findOne({
      _id: dto.seriesId,
      tenantId,
    });
    if (!series) {
      throw new NotFoundException("Serie no encontrada");
    }
    const documentNumber = await this.numberingService.getNextNumber(
      series,
      tenantId,
    );
    let original: BillingDocumentDocument | null = null;
    if (
      (dto.type === "credit_note" || dto.type === "debit_note") &&
      !dto.originalDocumentId
    ) {
      throw new BadRequestException(
        "Notas requieren documento original referenciado",
      );
    }
    if (dto.originalDocumentId) {
      original = await this.billingModel.findOne({
        _id: dto.originalDocumentId,
        tenantId,
      });
      if (!original) {
        throw new NotFoundException("Documento original no encontrado");
      }
    }
    const billing = new this.billingModel({
      type: dto.type,
      seriesId: series._id,
      documentNumber,
      status: "draft",
      customer: {
        name: dto.customerName || original?.customer?.name,
        taxId: dto.customerTaxId || original?.customer?.taxId,
      },
      references: dto.originalDocumentId
        ? { originalDocumentId: dto.originalDocumentId }
        : undefined,
      tenantId,
    });
    await billing.save();
    await this.auditModel.create({
      documentId: billing._id,
      event: "created",
      tenantId,
    });
    return billing;
  }

  async issue(id: string, dto: IssueBillingDocumentDto, tenantId: string) {
    const doc = await this.billingModel.findOne({ _id: id, tenantId });
    if (!doc) {
      throw new NotFoundException("Documento no encontrado");
    }
    if (doc.status !== "draft" && doc.status !== "validated") {
      return doc;
    }
    await this.auditModel.create({
      documentId: doc._id,
      event: "sent_to_imprenta",
      payload: dto,
      tenantId,
    });

    const control = await this.imprentaProvider.requestControlNumber({
      documentId: doc._id.toString(),
      tenantId,
      seriesId: doc.seriesId.toString(),
      documentNumber: doc.documentNumber,
      type: doc.type,
    });

    doc.controlNumber = control.controlNumber;
    doc.status = "issued";
    doc.issueDate = new Date();
    await doc.save();

    const hashPayload = createHash("sha256")
      .update(
        JSON.stringify({
          id: doc._id.toString(),
          documentNumber: doc.documentNumber,
          controlNumber: control.controlNumber,
          totals: doc.totals,
          customer: doc.customer,
        }),
      )
      .digest("hex");

    const taxesSnapshot =
      (doc.totals?.taxes || []).map((t) => ({
        type: t.type,
        rate: t.rate,
        amount: t.amount,
        base:
          t.rate && t.rate > 0
            ? Number((t.amount / t.rate).toFixed(4))
            : undefined,
        currency: doc.totals?.currency,
      })) || [];

    await this.evidenceModel.create({
      documentId: doc._id,
      hash: control.hash || hashPayload,
      imprenta: {
        controlNumber: control.controlNumber,
        provider: control.provider,
        assignedAt: control.assignedAt,
        metadata: control.metadata,
      },
      totalsSnapshot: {
        ...doc.totals,
        taxes: taxesSnapshot,
      },
      imprentaRequest: {
        documentId: doc._id.toString(),
        seriesId: doc.seriesId.toString(),
        documentNumber: doc.documentNumber,
        type: doc.type,
      },
      imprentaResponse: control,
      verificationUrl: control.verificationUrl,
      tenantId,
    });

    await this.auditModel.create({
      documentId: doc._id,
      event: "issued",
      payload: { controlNumber: control.controlNumber },
      tenantId,
    });

    await this.auditModel.create({
      documentId: doc._id,
      event: "control_assigned",
      payload: {
        request: {
          documentNumber: doc.documentNumber,
          seriesId: doc.seriesId,
          type: doc.type,
        },
        response: control,
      },
      tenantId,
    });

    // Calcular totales para contabilidad
    const taxAmount = (doc.totals?.taxes || []).reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const subtotal = doc.totals?.subtotal || 0;
    const total = doc.totals?.grandTotal || 0;

    this.eventEmitter.emit("billing.document.issued", {
      documentId: doc._id.toString(),
      tenantId,
      seriesId: doc.seriesId.toString(),
      controlNumber: doc.controlNumber,
      type: doc.type,
      documentNumber: doc.documentNumber,
      issueDate: doc.issueDate.toISOString(),
      customerName: doc.customer?.name,
      customerRif: doc.customer?.taxId,
      customerAddress: doc.customer?.address,
      subtotal,
      taxAmount,
      total,
      taxes: doc.totals?.taxes || [],
    });

    return doc;
  }

  /**
   * Calcula impuestos según TaxSettings del tenant
   * Retorna array de taxDetails con referencia a TaxSettings
   */
  async calculateTaxes(
    subtotal: number,
    tenantId: string,
  ): Promise<
    Array<{
      taxType: string;
      taxSettingsId: Types.ObjectId;
      rate: number;
      baseAmount: number;
      amount: number;
    }>
  > {
    const taxSettings = await this.taxSettingsModel
      .find({
        tenantId,
        isActive: true,
        $or: [{ isDefault: true }, { appliesTo: 'sales' }],
      })
      .exec();

    const taxes: Array<{
      taxType: string;
      taxSettingsId: Types.ObjectId;
      rate: number;
      baseAmount: number;
      amount: number;
    }> = [];

    // IVA
    const ivaSetting = taxSettings.find((t) => t.taxType === 'IVA' && t.isDefault);
    if (ivaSetting) {
      const ivaAmount = (subtotal * ivaSetting.rate) / 100;
      taxes.push({
        taxType: 'IVA',
        taxSettingsId: ivaSetting._id as Types.ObjectId,
        rate: ivaSetting.rate,
        baseAmount: subtotal,
        amount: ivaAmount,
      });
    }

    // IGTF (si aplica para divisas)
    const igtfSetting = taxSettings.find((t) => t.taxType === 'IGTF');
    if (igtfSetting) {
      const igtfAmount = (subtotal * igtfSetting.rate) / 100;
      taxes.push({
        taxType: 'IGTF',
        taxSettingsId: igtfSetting._id as Types.ObjectId,
        rate: igtfSetting.rate,
        baseAmount: subtotal,
        amount: igtfAmount,
      });
    }

    return taxes;
  }

  /**
   * Validate billing document for SENIAT electronic invoicing
   * @param documentId - ID of the document to validate
   * @param tenantId - Tenant ID
   * @returns Validation result with errors and warnings
   */
  async validateForSENIAT(
    documentId: string,
    tenantId: string,
  ): Promise<ValidationResult> {
    this.logger.debug(`Validating document ${documentId} for SENIAT`);

    const doc = await this.billingModel.findOne({
      _id: documentId,
      tenantId,
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Convert to format expected by validation service
    const validationDoc = this.mapToValidationFormat(doc);

    // Run SENIAT validation
    const result = await this.seniatValidation.validateForSENIAT(validationDoc);

    // Save validation errors in document if any
    if (!result.valid && result.errors.length > 0) {
      doc.seniat = {
        ...doc.seniat,
        validationErrors: result.errors,
      };
      await doc.save();

      await this.auditModel.create({
        documentId: doc._id,
        event: 'seniat_validation_failed',
        payload: { errors: result.errors, warnings: result.warnings },
        tenantId,
      });
    } else {
      // Clear previous validation errors
      if (doc.seniat) {
        doc.seniat.validationErrors = [];
        await doc.save();
      }

      await this.auditModel.create({
        documentId: doc._id,
        event: 'seniat_validation_passed',
        payload: { warnings: result.warnings },
        tenantId,
      });
    }

    this.logger.log(
      `SENIAT validation for ${documentId}: ${result.valid ? 'PASSED' : 'FAILED'}`,
    );

    return result;
  }

  /**
   * Generate SENIAT XML for electronic invoicing
   * @param documentId - ID of the document
   * @param tenantId - Tenant ID
   * @returns Generated XML export result
   */
  async generateSENIATXML(
    documentId: string,
    tenantId: string,
  ): Promise<{ xml: string; hash: string; qrCode: string; verificationUrl: string }> {
    this.logger.debug(`Generating SENIAT XML for document ${documentId}`);

    const doc = await this.billingModel.findOne({
      _id: documentId,
      tenantId,
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Validate before generating XML
    const validation = await this.validateForSENIAT(documentId, tenantId);
    if (!validation.valid) {
      throw new BadRequestException(
        `No se puede generar XML. Errores de validación: ${validation.errors.join(', ')}`,
      );
    }

    // Convert to format expected by export service
    const exportDoc = this.mapToValidationFormat(doc);

    // Generate complete SENIAT export
    const exportResult = await this.seniatExport.generateCompleteExport(exportDoc);

    // Update document with SENIAT information
    doc.seniat = {
      xmlGenerated: true,
      xmlGeneratedAt: new Date(),
      xmlHash: exportResult.hash,
      qrCode: exportResult.qrCode,
      verificationUrl: exportResult.verificationUrl,
      validationErrors: [],
    };

    // Also update taxInfo for backward compatibility
    doc.taxInfo = {
      ...doc.taxInfo,
      qrCode: exportResult.qrCode,
      verificationUrl: exportResult.verificationUrl,
    };

    await doc.save();

    // Create evidence record with XML
    await this.evidenceModel.create({
      documentId: doc._id,
      hash: exportResult.hash,
      xml: exportResult.xml,
      qrCode: exportResult.qrCode,
      verificationUrl: exportResult.verificationUrl,
      tenantId,
    });

    await this.auditModel.create({
      documentId: doc._id,
      event: 'seniat_xml_generated',
      payload: {
        hash: exportResult.hash,
        verificationUrl: exportResult.verificationUrl,
      },
      tenantId,
    });

    this.logger.log(`SENIAT XML generated successfully for ${documentId}`);

    return exportResult;
  }

  /**
   * Download SENIAT XML for a billing document
   * @param documentId - ID of the document
   * @param tenantId - Tenant ID
   * @returns XML as Buffer
   */
  async downloadXML(documentId: string, tenantId: string): Promise<Buffer> {
    this.logger.debug(`Downloading SENIAT XML for document ${documentId}`);

    const doc = await this.billingModel.findOne({
      _id: documentId,
      tenantId,
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (!doc.seniat?.xmlGenerated) {
      throw new BadRequestException(
        'XML no ha sido generado para este documento',
      );
    }

    // Get XML from evidence
    const evidence = await this.evidenceModel
      .findOne({ documentId: doc._id, tenantId })
      .sort({ createdAt: -1 })
      .exec();

    if (!evidence || !evidence.xml) {
      // If XML not found in evidence, generate it again
      this.logger.warn(
        `XML not found in evidence for ${documentId}, regenerating`,
      );
      const result = await this.generateSENIATXML(documentId, tenantId);
      return Buffer.from(result.xml, 'utf-8');
    }

    await this.auditModel.create({
      documentId: doc._id,
      event: 'seniat_xml_downloaded',
      tenantId,
    });

    return Buffer.from(evidence.xml, 'utf-8');
  }

  /**
   * Get statistics for electronic invoices
   * @param filters - Filters for statistics
   * @param tenantId - Tenant ID
   * @returns Electronic invoice statistics
   */
  async getElectronicInvoiceStats(
    filters: {
      startDate?: string;
      endDate?: string;
      status?: string;
      documentType?: string;
    },
    tenantId: string,
  ): Promise<{
    totalInvoices: number;
    issuedInvoices: number;
    draftInvoices: number;
    sentInvoices: number;
    withXmlGenerated: number;
    totalAmount: number;
    totalTaxAmount: number;
    byDocumentType: { [key: string]: { count: number; amount: number } };
    byMonth?: Array<{ month: string; count: number; amount: number }>;
    averageInvoiceAmount?: number;
    startDate: string;
    endDate: string;
  }> {
    this.logger.debug('Generating electronic invoice statistics');

    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(new Date().getFullYear(), 0, 1); // Start of year

    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : new Date(); // Today

    const query: any = {
      tenantId,
      issueDate: { $gte: startDate, $lte: endDate },
    };

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.documentType && filters.documentType !== 'all') {
      query.type = filters.documentType;
    }

    const documents = await this.billingModel.find(query).exec();

    // Calculate statistics
    const stats = {
      totalInvoices: documents.length,
      issuedInvoices: documents.filter((d) => d.status === 'issued').length,
      draftInvoices: documents.filter((d) => d.status === 'draft').length,
      sentInvoices: documents.filter((d) => d.status === 'sent').length,
      withXmlGenerated: documents.filter((d) => d.seniat?.xmlGenerated).length,
      totalAmount: 0,
      totalTaxAmount: 0,
      byDocumentType: {} as { [key: string]: { count: number; amount: number } },
      byMonth: [] as Array<{ month: string; count: number; amount: number }>,
      averageInvoiceAmount: 0,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    // Calculate amounts and group by type
    documents.forEach((doc) => {
      const total = doc.totals?.grandTotal || 0;
      const taxAmount = (doc.totals?.taxes || []).reduce(
        (sum, t) => sum + (t.amount || 0),
        0,
      );

      stats.totalAmount += total;
      stats.totalTaxAmount += taxAmount;

      // By document type
      if (!stats.byDocumentType[doc.type]) {
        stats.byDocumentType[doc.type] = { count: 0, amount: 0 };
      }
      stats.byDocumentType[doc.type].count++;
      stats.byDocumentType[doc.type].amount += total;
    });

    // Calculate average
    if (stats.totalInvoices > 0) {
      stats.averageInvoiceAmount = stats.totalAmount / stats.totalInvoices;
    }

    // Group by month
    const byMonth: { [key: string]: { count: number; amount: number } } = {};
    documents.forEach((doc) => {
      if (doc.issueDate) {
        const monthKey = doc.issueDate.toISOString().substring(0, 7); // YYYY-MM
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { count: 0, amount: 0 };
        }
        byMonth[monthKey].count++;
        byMonth[monthKey].amount += doc.totals?.grandTotal || 0;
      }
    });

    stats.byMonth = Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    this.logger.log(
      `Generated stats: ${stats.totalInvoices} invoices, ${stats.withXmlGenerated} with XML`,
    );

    return stats;
  }

  /**
   * Helper method to map BillingDocument to format expected by validation/export services
   * This handles the mismatch between schema property names and service expectations
   */
  private mapToValidationFormat(doc: BillingDocumentDocument): any {
    return {
      _id: doc._id,
      documentNumber: doc.documentNumber,
      controlNumber: doc.controlNumber,
      type: doc.type,
      status: doc.status,
      documentDate: doc.issueDate || new Date(),
      issueDate: doc.issueDate,
      dueDate: doc.paymentTerms?.dueDate,
      paymentTermDays: this.calculatePaymentTermDays(doc),
      currency: doc.totals?.currency || 'VES',
      exchangeRate: doc.totals?.exchangeRate || 1,
      subtotalAmount: doc.totals?.subtotal || 0,
      discountAmount: doc.totals?.discounts || 0,
      taxAmount: this.calculateTotalTax(doc),
      totalAmount: doc.totals?.grandTotal || 0,
      notes: '',
      customerInfo: {
        taxId: doc.customer?.taxId || '',
        name: doc.customer?.name || '',
        address: doc.customer?.address || '',
        phone: '',
      },
      issuerInfo: {
        taxId: doc.emitter?.taxId || '',
        name: doc.emitter?.businessName || '',
        address: doc.emitter?.fiscalAddress || '',
        phone: '',
      },
      lines: this.mapDocumentLines(doc),
      requiresIvaWithholding: doc.requiresIvaWithholding || false,
      seriesId: doc.seriesId,
      tenantId: doc.tenantId,
    };
  }

  private calculatePaymentTermDays(doc: BillingDocumentDocument): number {
    if (!doc.paymentTerms?.dueDate || !doc.issueDate) {
      return 0;
    }
    const diffMs =
      new Date(doc.paymentTerms.dueDate).getTime() -
      new Date(doc.issueDate).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private calculateTotalTax(doc: BillingDocumentDocument): number {
    return (doc.totals?.taxes || []).reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
  }

  private mapDocumentLines(doc: BillingDocumentDocument): any[] {
    // If lines are stored in doc, map them
    // Otherwise return empty array (will need to be populated from related documents)
    return [];
  }
}
