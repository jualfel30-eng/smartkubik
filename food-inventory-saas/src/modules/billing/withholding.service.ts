import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WithholdingDocument,
  WithholdingDocumentDocument,
  IVA_RETENTION_PERCENTAGES,
} from '../../schemas/withholding-document.schema';
import {
  BillingDocument,
  BillingDocumentDocument,
} from '../../schemas/billing-document.schema';
import {
  DocumentSequence,
  DocumentSequenceDocument,
} from '../../schemas/document-sequence.schema';
import {
  CreateIvaRetentionDto,
  CreateIslrRetentionDto,
  CreateArcvRetentionDto,
  IssueWithholdingDto,
  WithholdingFiltersDto,
} from '../../dto/withholding.dto';
import { NumberingService } from './numbering.service';
import { ImprentaProviderFactory } from './providers/imprenta-provider.factory';
import { HkaWithholdingMapper } from './mappers/hka-withholding.mapper';
import { ImprentaFailure, ImprentaFailureDocument } from '../../schemas/imprenta-failure.schema';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';

@Injectable()
export class WithholdingService {
  private readonly logger = new Logger(WithholdingService.name);

  constructor(
    @InjectModel(WithholdingDocument.name)
    private withholdingModel: Model<WithholdingDocumentDocument>,
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocumentDocument>,
    @InjectModel(DocumentSequence.name)
    private sequenceModel: Model<DocumentSequenceDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
    @InjectModel(ImprentaFailure.name)
    private imprentaFailureModel: Model<ImprentaFailureDocument>,
    private readonly numberingService: NumberingService,
    private readonly imprentaProviderFactory: ImprentaProviderFactory,
    private readonly hkaWithholdingMapper: HkaWithholdingMapper,
  ) {}

  /**
   * Crea una retención IVA desde una factura
   */
  async createIvaRetention(
    dto: CreateIvaRetentionDto,
    tenantId: string,
    userId?: string,
  ): Promise<WithholdingDocument> {
    this.logger.log(`Creating IVA retention for document ${dto.affectedDocumentId}`);

    // 1. Validar que la factura existe y está emitida
    const invoice = await this.billingModel.findOne({
      _id: dto.affectedDocumentId,
      tenantId,
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (invoice.status !== 'issued') {
      throw new BadRequestException('Solo se pueden aplicar retenciones a facturas emitidas');
    }

    // 2. Verificar que no exista ya una retención IVA para esta factura
    const existingRetention = await this.withholdingModel.findOne({
      affectedDocumentId: dto.affectedDocumentId,
      type: 'iva',
      tenantId,
      status: { $ne: 'archived' },
    });

    if (existingRetention) {
      throw new BadRequestException('Ya existe una retención IVA para esta factura');
    }

    // 3. Validar que la serie existe
    const series = await this.sequenceModel.findOne({
      _id: dto.seriesId,
      tenantId,
    });

    if (!series) {
      throw new NotFoundException('Serie no encontrada');
    }

    // 4. Calcular la retención
    const calculation = this.calculateIvaRetention(invoice, dto.retentionPercentage);

    // 5. Generar número de documento
    const documentNumber = await this.numberingService.getNextNumber(
      series,
      tenantId,
    );

    // 6. Obtener datos del tenant para emisor
    const issuer = {
      name: (invoice.customer as any)?.name || 'Cliente',
      taxId: (invoice.customer as any)?.taxId || '',
      address: (invoice.customer as any)?.address,
      email: (invoice.customer as any)?.email,
      phone: (invoice.customer as any)?.phone,
    };

    // Beneficiario es el vendedor (datos del tenant)
    const beneficiary = await this.getTenantData(tenantId);

    // 7. Crear documento de retención
    const retention = new this.withholdingModel({
      type: 'iva',
      tenantId,
      seriesId: dto.seriesId,
      documentNumber,
      status: 'draft',
      operationDate: dto.operationDate ? new Date(dto.operationDate) : invoice.issueDate,
      affectedDocumentId: dto.affectedDocumentId,
      affectedDocument: {
        documentNumber: invoice.documentNumber,
        controlNumber: invoice.controlNumber,
        issueDate: invoice.issueDate,
        totalAmount: invoice.totals?.grandTotal || 0,
        series: invoice.metadata?.series,
      },
      issuer,
      beneficiary,
      ivaRetention: {
        baseAmount: calculation.baseAmount,
        taxRate: calculation.taxRate,
        taxAmount: calculation.taxAmount,
        retentionPercentage: dto.retentionPercentage,
        retentionAmount: calculation.retentionAmount,
        taxCode: 'G', // Código para IVA general
      },
      totals: {
        subtotal: invoice.totals?.subtotal || 0,
        totalTax: calculation.taxAmount,
        totalRetention: calculation.retentionAmount,
        currency: invoice.totals?.currency || 'VES',
        exchangeRate: invoice.totals?.exchangeRate,
      },
      metadata: {
        series: series.prefix || '',
        notes: dto.notes,
      },
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    await retention.save();

    this.logger.log(`IVA retention created: ${documentNumber}`);

    return retention;
  }

  /**
   * Calcula la retención IVA sobre una factura
   */
  private calculateIvaRetention(
    invoice: BillingDocumentDocument,
    retentionPercentage: 75 | 100,
  ): {
    baseAmount: number;
    taxRate: number;
    taxAmount: number;
    retentionAmount: number;
  } {
    // Base imponible gravada
    const baseAmount = invoice.totals?.taxableAmount || invoice.totals?.subtotal || 0;

    // Tasa de IVA (normalmente 16%)
    const taxRate =
      invoice.totals?.taxes?.find((t) => t.type === 'IVA')?.rate || 16;

    // Monto total de IVA
    const taxAmount =
      invoice.totals?.taxes?.find((t) => t.type === 'IVA')?.amount ||
      baseAmount * (taxRate / 100);

    // Calcular retención
    const retentionFactor = IVA_RETENTION_PERCENTAGES[retentionPercentage];
    const retentionAmount = taxAmount * retentionFactor;

    return {
      baseAmount,
      taxRate,
      taxAmount,
      retentionAmount: Math.round(retentionAmount * 100) / 100, // Redondear a 2 decimales
    };
  }

  /**
   * Crea una retención ISLR desde una factura
   */
  async createIslrRetention(
    dto: CreateIslrRetentionDto,
    tenantId: string,
    userId?: string,
  ): Promise<WithholdingDocument> {
    this.logger.log(`Creating ISLR retention for document ${dto.affectedDocumentId}`);

    // 1. Validar factura
    const invoice = await this.billingModel.findOne({
      _id: dto.affectedDocumentId,
      tenantId,
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (invoice.status !== 'issued') {
      throw new BadRequestException('Solo se pueden aplicar retenciones a facturas emitidas');
    }

    // 2. Validar serie
    const series = await this.sequenceModel.findOne({
      _id: dto.seriesId,
      tenantId,
    });

    if (!series) {
      throw new NotFoundException('Serie no encontrada');
    }

    // 3. Calcular retención ISLR
    const baseAmount = dto.baseAmount || invoice.totals?.subtotal || 0;
    const retentionAmount = baseAmount * (dto.retentionPercentage / 100);
    const finalRetention = dto.sustraendo
      ? Math.max(0, retentionAmount - dto.sustraendo)
      : retentionAmount;

    // 4. Generar número de documento
    const documentNumber = await this.numberingService.getNextNumber(
      series,
      tenantId,
    );

    // 5. Crear documento
    const retention = new this.withholdingModel({
      type: 'islr',
      tenantId,
      seriesId: dto.seriesId,
      documentNumber,
      status: 'draft',
      operationDate: dto.operationDate ? new Date(dto.operationDate) : invoice.issueDate,
      affectedDocumentId: dto.affectedDocumentId,
      affectedDocument: {
        documentNumber: invoice.documentNumber,
        controlNumber: invoice.controlNumber,
        issueDate: invoice.issueDate,
        totalAmount: invoice.totals?.grandTotal || 0,
        series: invoice.metadata?.series,
      },
      issuer: {
        name: (invoice.customer as any)?.name || 'Cliente',
        taxId: (invoice.customer as any)?.taxId || '',
        address: (invoice.customer as any)?.address,
        email: (invoice.customer as any)?.email,
        phone: (invoice.customer as any)?.phone,
      },
      beneficiary: await this.getTenantData(tenantId),
      islrRetention: {
        conceptCode: dto.conceptCode,
        conceptDescription: dto.conceptDescription,
        baseAmount,
        retentionPercentage: dto.retentionPercentage,
        retentionAmount: Math.round(finalRetention * 100) / 100,
        sustraendo: dto.sustraendo,
      },
      totals: {
        subtotal: invoice.totals?.subtotal || 0,
        totalTax: 0,
        totalRetention: Math.round(finalRetention * 100) / 100,
        currency: invoice.totals?.currency || 'VES',
        exchangeRate: invoice.totals?.exchangeRate,
      },
      metadata: {
        series: series.prefix || '',
        notes: dto.notes,
      },
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    await retention.save();

    this.logger.log(`ISLR retention created: ${documentNumber}`);

    return retention;
  }

  /**
   * Crea una retención varia (ARCV - tipo 07)
   */
  async createArcvRetention(
    dto: CreateArcvRetentionDto,
    tenantId: string,
    userId?: string,
  ): Promise<WithholdingDocument> {
    this.logger.log(`Creating ARCV retention for document ${dto.affectedDocumentId}`);

    // 1. Validar factura
    const invoice = await this.billingModel.findOne({
      _id: dto.affectedDocumentId,
      tenantId,
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (invoice.status !== 'issued') {
      throw new BadRequestException('Solo se pueden aplicar retenciones a facturas emitidas');
    }

    // 2. Validar serie
    const series = await this.sequenceModel.findOne({
      _id: dto.seriesId,
      tenantId,
    });

    if (!series) {
      throw new NotFoundException('Serie no encontrada');
    }

    // 3. Calcular retención ARCV
    const baseAmount = dto.baseAmount || invoice.totals?.subtotal || 0;
    const retentionAmount = baseAmount * (dto.retentionPercentage / 100);

    // 4. Generar número de documento
    const documentNumber = await this.numberingService.getNextNumber(
      series,
      tenantId,
    );

    // 5. Crear documento
    const retention = new this.withholdingModel({
      type: 'arcv',
      tenantId,
      seriesId: dto.seriesId,
      documentNumber,
      status: 'draft',
      operationDate: dto.operationDate ? new Date(dto.operationDate) : invoice.issueDate,
      affectedDocumentId: dto.affectedDocumentId,
      affectedDocument: {
        documentNumber: invoice.documentNumber,
        controlNumber: invoice.controlNumber,
        issueDate: invoice.issueDate,
        totalAmount: invoice.totals?.grandTotal || 0,
        series: invoice.metadata?.series,
      },
      issuer: {
        name: (invoice.customer as any)?.name || 'Cliente',
        taxId: (invoice.customer as any)?.taxId || '',
        address: (invoice.customer as any)?.address,
        email: (invoice.customer as any)?.email,
        phone: (invoice.customer as any)?.phone,
      },
      beneficiary: await this.getTenantData(tenantId),
      arcvRetention: {
        retentionType: dto.retentionType,
        conceptCode: dto.conceptCode,
        conceptDescription: dto.conceptDescription,
        baseAmount,
        retentionPercentage: dto.retentionPercentage,
        retentionAmount: Math.round(retentionAmount * 100) / 100,
        taxCode: dto.taxCode,
        period: dto.period,
        fiscalYearEnd: dto.fiscalYearEnd ? new Date(dto.fiscalYearEnd) : undefined,
      },
      totals: {
        subtotal: invoice.totals?.subtotal || 0,
        totalTax: 0,
        totalRetention: Math.round(retentionAmount * 100) / 100,
        currency: invoice.totals?.currency || 'VES',
        exchangeRate: invoice.totals?.exchangeRate,
      },
      metadata: {
        series: series.prefix || '',
        notes: dto.notes,
      },
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    await retention.save();

    this.logger.log(`ARCV retention created: ${documentNumber}`);

    return retention;
  }

  /**
   * Emite una retención (solicita control number si aplica)
   */
  async issue(
    id: string,
    dto: IssueWithholdingDto,
    tenantId: string,
    userId?: string,
  ): Promise<WithholdingDocument> {
    const retention = await this.withholdingModel.findOne({
      _id: id,
      tenantId,
    });

    if (!retention) {
      throw new NotFoundException('Retención no encontrada');
    }

    if (retention.status !== 'draft' && retention.status !== 'validated') {
      return retention;
    }

    // Actualizar información fiscal
    if (dto.fiscalInfo) {
      if (dto.fiscalInfo.period) {
        retention.taxInfo = {
          ...retention.taxInfo,
          period: dto.fiscalInfo.period,
          ...(dto.fiscalInfo.declarationNumber && { declarationNumber: dto.fiscalInfo.declarationNumber }),
        };
      } else if (dto.fiscalInfo.declarationNumber) {
        if (!retention.taxInfo) {
          // Si no hay taxInfo y solo se provee declarationNumber, necesitamos period
          this.logger.warn('Cannot set declarationNumber without period');
        } else {
          retention.taxInfo.declarationNumber = dto.fiscalInfo.declarationNumber;
        }
      }
    }

    try {
      // Obtener proveedor de imprenta digital
      const imprentaProvider = this.imprentaProviderFactory.getProvider();

      // Mapear retención al formato HKA Factory
      const hkaJson = this.hkaWithholdingMapper.toHkaJson(retention);

      this.logger.log(
        `📄 Emitiendo retención ${retention.type.toUpperCase()} ${retention.documentNumber} a ${imprentaProvider.getProviderName()}...`,
      );

      // Solicitar número de control
      const controlNumberResponse = await imprentaProvider.requestControlNumber({
        documentId: retention._id.toString(),
        tenantId,
        seriesId: retention.seriesId.toString(),
        documentNumber: retention.documentNumber,
        type: retention.type === 'iva' ? '05' : '06',
        metadata: {
          hkaJson,
          retentionType: retention.type,
        },
      });

      // Actualizar retención con número de control
      retention.controlNumber = controlNumberResponse.controlNumber;
      retention.status = 'issued';
      retention.issueDate = new Date();
      retention.issuedBy = userId ? new Types.ObjectId(userId) : undefined;

      // Guardar metadata adicional de HKA
      if (!retention.metadata) {
        retention.metadata = {};
      }
      retention.metadata.hkaTransactionId = controlNumberResponse.metadata?.transaccionId;
      retention.metadata.hkaAssignmentDate = controlNumberResponse.metadata?.fechaAsignacion;

      await retention.save();

      this.logger.log(
        `✅ Retención emitida exitosamente: ${retention.documentNumber} - Control: ${retention.controlNumber}`,
      );

      return retention;
    } catch (error) {
      this.logger.error(
        `❌ Error emitiendo retención ${retention.documentNumber}:`,
        error.message,
      );

      // Registrar fallo para retry posterior
      await this.imprentaFailureModel.create({
        documentId: retention._id.toString(),
        documentType: retention.type === 'iva' ? '05' : '06',
        documentNumber: retention.documentNumber,
        tenantId,
        errorMessage: error.message,
        errorStack: error.stack,
        payload: retention.toObject(),
        retryCount: 0,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
      });

      // Re-throw error para que el cliente sepa que falló
      throw new BadRequestException(
        `Error al emitir retención: ${error.message}`,
      );
    }
  }

  /**
   * Busca retenciones con filtros
   */
  async findAll(
    filters: WithholdingFiltersDto,
    tenantId: string,
  ): Promise<WithholdingDocument[]> {
    const query: any = { tenantId };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.beneficiaryTaxId) {
      query['beneficiary.taxId'] = filters.beneficiaryTaxId;
    }

    if (filters.issuerTaxId) {
      query['issuer.taxId'] = filters.issuerTaxId;
    }

    if (filters.period) {
      query['taxInfo.period'] = filters.period;
    }

    if (filters.startDate || filters.endDate) {
      query.issueDate = {};
      if (filters.startDate) {
        query.issueDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.issueDate.$lte = new Date(filters.endDate);
      }
    }

    return this.withholdingModel
      .find(query)
      .sort({ issueDate: -1 })
      .populate('affectedDocumentId')
      .lean()
      .exec();
  }

  /**
   * Obtiene una retención por ID
   */
  async findOne(id: string, tenantId: string): Promise<WithholdingDocument> {
    const retention = await this.withholdingModel
      .findOne({ _id: id, tenantId })
      .populate('affectedDocumentId')
      .lean()
      .exec();

    if (!retention) {
      throw new NotFoundException('Retención no encontrada');
    }

    return retention;
  }

  /**
   * Obtiene todas las retenciones de una factura
   */
  async findByInvoice(
    invoiceId: string,
    tenantId: string,
  ): Promise<WithholdingDocument[]> {
    return this.withholdingModel
      .find({
        affectedDocumentId: invoiceId,
        tenantId,
        status: { $ne: 'archived' },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Calcula el total de retenciones aplicadas a una factura
   */
  async calculateTotalRetentions(
    invoiceId: string,
    tenantId: string,
  ): Promise<{
    totalIva: number;
    totalIslr: number;
    total: number;
  }> {
    const retentions = await this.findByInvoice(invoiceId, tenantId);

    const totalIva = retentions
      .filter((r) => r.type === 'iva' && r.status === 'issued')
      .reduce((sum, r) => sum + (r.totals?.totalRetention || 0), 0);

    const totalIslr = retentions
      .filter((r) => r.type === 'islr' && r.status === 'issued')
      .reduce((sum, r) => sum + (r.totals?.totalRetention || 0), 0);

    return {
      totalIva,
      totalIslr,
      total: totalIva + totalIslr,
    };
  }

  /**
   * Anula una retención
   *
   * Si la retención está en estado 'draft', solo se marca como cancelada localmente.
   * Si está 'issued', se anula primero en HKA Factory y luego localmente.
   */
  async cancel(
    id: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<WithholdingDocument> {
    const retention = await this.withholdingModel.findOne({
      _id: id,
      tenantId,
    });

    if (!retention) {
      throw new NotFoundException('Retención no encontrada');
    }

    if (retention.status === 'cancelled') {
      throw new BadRequestException('La retención ya está anulada');
    }

    // Validar que la razón no esté vacía
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Debe proporcionar una razón de anulación');
    }

    // Si está en borrador, solo marcar como cancelada localmente
    if (retention.status === 'draft') {
      retention.status = 'cancelled';
      retention.metadata = retention.metadata || {};
      retention.metadata.cancellationReason = reason;
      retention.metadata.cancelledBy = userId;
      retention.metadata.cancelledAt = new Date();
      await retention.save();

      this.logger.log(
        `✅ Retención ${retention.documentNumber} anulada (borrador)`,
      );

      return retention;
    }

    // Si está emitida, anular en HKA Factory primero
    if (retention.status === 'issued') {
      try {
        // Validar que el documento tenga número de control
        if (!retention.controlNumber) {
          throw new BadRequestException(
            'El documento no tiene número de control fiscal',
          );
        }

        const provider = this.imprentaProviderFactory.getProvider();

        this.logger.log(
          `🚫 Anulando retención ${retention.documentNumber} en HKA Factory...`,
        );

        // Anular en HKA Factory
        const cancelled = await provider.cancelDocument(
          retention.controlNumber,
          reason,
          retention.type === 'iva' ? '05' : '06',
          retention.documentNumber,
          retention.metadata?.series || '',
        );

        if (!cancelled) {
          throw new Error('HKA Factory no pudo anular el documento');
        }

        this.logger.log(
          `✅ Documento anulado exitosamente en HKA Factory`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Error anulando en HKA Factory: ${error.message}`,
        );
        throw new BadRequestException(
          `Error al anular en HKA Factory: ${error.message}`,
        );
      }
    }

    // Marcar como cancelada en el sistema local
    retention.status = 'cancelled';
    retention.metadata = retention.metadata || {};
    retention.metadata.cancellationReason = reason;
    retention.metadata.cancelledBy = userId;
    retention.metadata.cancelledAt = new Date();
    await retention.save();

    this.logger.log(`✅ Retención ${retention.documentNumber} anulada`);

    return retention;
  }

  /**
   * Consulta el estado de una retención en HKA Factory
   */
  async queryStatus(id: string, tenantId: string): Promise<any> {
    const retention = await this.withholdingModel.findOne({
      _id: id,
      tenantId,
    });

    if (!retention) {
      throw new NotFoundException('Retención no encontrada');
    }

    if (retention.status !== 'issued') {
      throw new BadRequestException(
        'Solo se puede consultar estado de retenciones emitidas',
      );
    }

    if (!retention.controlNumber) {
      throw new BadRequestException(
        'La retención no tiene número de control fiscal',
      );
    }

    try {
      const provider = this.imprentaProviderFactory.getProvider();

      this.logger.log(
        `🔍 Consultando estado de retención ${retention.documentNumber} en HKA Factory...`,
      );

      const status = await provider.queryDocumentStatus(
        retention.controlNumber,
        retention.type === 'iva' ? '05' : '06',
        retention.documentNumber,
        retention.metadata?.series || '',
      );

      this.logger.log(
        `✅ Estado consultado: ${status.status}`,
      );

      return {
        local: {
          status: retention.status,
          documentNumber: retention.documentNumber,
          controlNumber: retention.controlNumber,
        },
        hka: status,
        synchronized: status.status === retention.status,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error consultando estado en HKA Factory: ${error.message}`,
      );
      throw new BadRequestException(
        `Error al consultar estado en HKA Factory: ${error.message}`,
      );
    }
  }

  /**
   * Descarga el PDF oficial de una retención desde HKA Factory
   */
  async downloadHkaPdf(id: string, tenantId: string): Promise<Buffer> {
    const retention = await this.withholdingModel.findOne({
      _id: id,
      tenantId,
    });

    if (!retention) {
      throw new NotFoundException('Retención no encontrada');
    }

    if (retention.status !== 'issued') {
      throw new BadRequestException(
        'Solo retenciones emitidas tienen PDF en HKA Factory',
      );
    }

    if (!retention.controlNumber) {
      throw new BadRequestException(
        'La retención no tiene número de control fiscal',
      );
    }

    try {
      const provider = this.imprentaProviderFactory.getProvider();

      this.logger.log(
        `📥 Descargando PDF de retención ${retention.documentNumber} desde HKA Factory...`,
      );

      const pdfBuffer = await provider.downloadPdf(
        retention.controlNumber,
        retention.type === 'iva' ? '05' : '06',
        retention.documentNumber,
        retention.metadata?.series || '',
      );

      this.logger.log(`✅ PDF descargado exitosamente (${pdfBuffer.length} bytes)`);

      return pdfBuffer;
    } catch (error) {
      this.logger.error(
        `❌ Error descargando PDF desde HKA Factory: ${error.message}`,
      );
      throw new BadRequestException(
        `Error al descargar PDF desde HKA Factory: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene los datos del tenant para usar como beneficiario en retenciones
   */
  private async getTenantData(tenantId: string): Promise<{
    name: string;
    taxId: string;
    address?: string;
    email?: string;
    phone?: string;
  }> {
    const tenant = await this.tenantModel.findById(tenantId);

    if (!tenant) {
      this.logger.warn(`Tenant ${tenantId} not found, using placeholder data`);
      return {
        name: 'Empresa',
        taxId: 'J-00000000-0',
      };
    }

    return {
      name: tenant.name || 'Empresa',
      taxId: tenant.taxInfo?.rif || 'J-00000000-0',
      address: tenant.contactInfo?.address ?
        `${tenant.contactInfo.address.street}, ${tenant.contactInfo.address.city}, ${tenant.contactInfo.address.state}` :
        undefined,
      email: tenant.contactInfo?.email,
      phone: tenant.contactInfo?.phone,
    };
  }
}
