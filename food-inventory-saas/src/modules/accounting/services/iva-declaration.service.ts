import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IvaDeclaration, IvaDeclarationDocument } from '../../../schemas/iva-declaration.schema';
import { IvaPurchaseBookService } from './iva-purchase-book.service';
import { IvaSalesBookService } from './iva-sales-book.service';
import { BillingDocument, BillingDocumentDocument } from '../../../schemas/billing-document.schema';
import {
  CalculateIvaDeclarationDto,
  UpdateIvaDeclarationDto,
  FileIvaDeclarationDto,
  RecordPaymentDto,
} from '../../../dto/iva-declaration.dto';
import { format, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class IvaDeclarationService {
  private readonly logger = new Logger(IvaDeclarationService.name);

  constructor(
    @InjectModel(IvaDeclaration.name)
    private ivaDeclarationModel: Model<IvaDeclarationDocument>,
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocumentDocument>,
    private purchaseBookService: IvaPurchaseBookService,
    private salesBookService: IvaSalesBookService,
  ) { }

  /**
   * Calcular declaración de IVA automáticamente desde los libros
   */
  async calculate(dto: CalculateIvaDeclarationDto, user: any): Promise<IvaDeclaration> {
    try {
      const { month, year, previousCreditBalance = 0 } = dto;

      // Verificar si ya existe una declaración para este período
      const existing = await this.ivaDeclarationModel.findOne({
        tenantId: user.tenantId,
        month,
        year,
      });

      // Permitir recalcular siempre, EXCEPTO si ya está PAGADA.
      // Si está 'filed' (presentada), permitimos recalcular para correcciones (generará un reemplazo).
      if (existing && existing.status === 'paid') {
        throw new BadRequestException(
          `Ya existe una declaración PAGADA para ${month}/${year}. No se puede modificar.`,
        );
      }

      // Auto-Curación: Sincronizar documentos de facturación al libro de ventas
      try {
        await this.syncBillingToSalesBook(month, year, user);
      } catch (error) {
        this.logger.error(`Error durante auto-curación de libros: ${error.message}`);
        // Continuar con el cálculo aunque falle la sincronización parcial
      }

      // Validar libros de compras y ventas
      const [purchasesValidation, salesValidation] = await Promise.all([
        this.purchaseBookService.validateBook(month, year, user.tenantId),
        this.salesBookService.validateBook(month, year, user.tenantId),
      ]);

      const validationErrors = [
        ...purchasesValidation.errors.map((e) => `[Compras] ${e}`),
        ...salesValidation.errors.map((e) => `[Ventas] ${e}`),
      ];

      // Obtener resúmenes de libros
      const [purchasesSummary, salesSummary] = await Promise.all([
        this.purchaseBookService.getSummary(month, year, user.tenantId),
        this.salesBookService.getSummary(month, year, user.tenantId),
      ]);

      // Calcular débito fiscal (IVA de ventas)
      const salesBaseAmount = salesSummary.totalBaseAmount;
      const salesIvaAmount = salesSummary.totalIvaAmount;
      // ... rest of calculation logic matches previous logic ...
      const totalDebitFiscal = salesIvaAmount;

      // Calcular crédito fiscal (IVA de compras)
      const purchasesBaseAmount = purchasesSummary.totalBaseAmount;
      const purchasesIvaAmount = purchasesSummary.totalIvaAmount;
      const totalCreditFiscal = purchasesIvaAmount;

      // Retenciones
      const ivaWithheldOnSales = salesSummary.totalWithheldIva; // IVA retenido por clientes
      const ivaWithheldOnPurchases = purchasesSummary.totalWithheldIva; // IVA retenido a proveedores

      // Cálculo final
      const totalCreditToApply = totalCreditFiscal + ivaWithheldOnSales + previousCreditBalance;
      const netAmount = totalDebitFiscal - totalCreditToApply;

      const ivaToPay = netAmount > 0 ? netAmount : 0;
      const creditBalance = netAmount < 0 ? Math.abs(netAmount) : 0;

      // Generar número de declaración
      const declarationNumber = existing
        ? existing.declarationNumber // Mantener número si existe
        : await this.generateDeclarationNumber(month, year, user.tenantId);

      // Desglose por alícuota
      const rateBreakdown = this.calculateRateBreakdown(
        purchasesSummary.byIvaRate,
        salesSummary.byIvaRate,
      );

      // Crear o actualizar declaración
      const declarationData = {
        tenantId: user.tenantId,
        month,
        year,
        declarationNumber,
        salesBaseAmount,
        salesIvaAmount,
        totalDebitFiscal,
        purchasesBaseAmount,
        purchasesIvaAmount,
        totalCreditFiscal,
        ivaWithheldOnSales,
        ivaWithheldOnPurchases,
        previousCreditBalance,
        totalCreditToApply,
        ivaToPay,
        creditBalance,
        totalToPay: ivaToPay,
        rateBreakdown,
        totalSalesTransactions: salesSummary.totalEntries,
        totalPurchasesTransactions: purchasesSummary.totalEntries,
        electronicInvoices: salesSummary.electronicInvoices || 0,
        physicalInvoices: salesSummary.physicalInvoices || 0,
        validated: validationErrors.length === 0,
        validationErrors,
        status: 'calculated', // Forzar estado a calculado (reseteando 'filed')
        exportedToSENIAT: false, // Resetear flag de exportación
        filingDate: null, // Limpiar fecha de presentación
        xmlContent: null, // Limpiar XML anterior
        createdBy: existing ? existing.createdBy : user._id,
        updatedBy: user._id,
      };

      if (existing) {
        Object.assign(existing, declarationData);
        return await existing.save();
      }

      return await this.ivaDeclarationModel.create(declarationData);
    } catch (error) {
      this.logger.error(`Error crítico en cálculo de IVA: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error interno al calcular: ${error.message}`);
    }
  }

  /**
   * Sincroniza facturas emitidas en el período seleccionado hacia el libro de ventas
   */
  private async syncBillingToSalesBook(month: number, year: number, user: any) {
    this.logger.log(`Syncing billing details for ${month}/${year}`);

    // Crear rango de fechas para el mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate); // from date-fns

    console.log(`[Sync DIAGNOSTIC] Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`[Sync DIAGNOSTIC] Tenant: ${user.tenantId}`);

    // DIAGNOSTICO ESPECIFICO PARA F50
    const probeF50 = await this.billingModel.findOne({ documentNumber: 'F50', tenantId: user.tenantId });
    if (probeF50) {
      console.log(`[Sync DIAGNOSTIC F50] FOUND in Billing! Status=${probeF50.status}, Date=${probeF50.issueDate}, Type=${probeF50.type}`);
    } else {
      console.log(`[Sync DIAGNOSTIC F50] NOT FOUND in BillingModel with tenant ${user.tenantId}`);
    }

    // Buscar facturas emitidas o validadas en el rango
    const billingDocs = await this.billingModel.find({
      tenantId: user.tenantId,
      issueDate: { $gte: startDate, $lte: endDate },
      // Solo facturas fiscales (emitidas) - Ampliado para asegurar cobertura
      status: { $in: ['issued', 'paid', 'partially_paid', 'sent', 'validated', 'closed'] },
      // Excluir cotizaciones
      type: { $ne: 'quote' }
    });

    console.log(`[Sync] Found ${billingDocs.length} billing documents to sync for period ${month}/${year}`);

    let syncedCount = 0;
    for (const doc of billingDocs) {
      try {
        await this.salesBookService.syncFromBillingDocument(doc._id.toString(), doc, user);
        syncedCount++;
      } catch (error) {
        this.logger.error(`Failed to sync billing doc ${doc.documentNumber}: ${error.message}`);
        // No detener el proceso, intentar con los demás
      }
    }

    this.logger.log(`Synced ${syncedCount} documents to Sales Book`);
  }

  /**
   * Obtener todas las declaraciones
   */
  async findAll(
    tenantId: string,
    filters?: any,
  ): Promise<{ data: IvaDeclaration[]; total: number }> {
    const query: any = { tenantId };

    if (filters?.year) {
      query.year = parseInt(filters.year);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    const page = parseInt(filters?.page) || 1;
    const limit = parseInt(filters?.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.ivaDeclarationModel
        .find(query)
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit),
      this.ivaDeclarationModel.countDocuments(query),
    ]);

    return { data, total };
  }

  /**
   * Obtener una declaración por ID
   */
  async findOne(id: string, tenantId: string): Promise<IvaDeclarationDocument> {
    const declaration = await this.ivaDeclarationModel.findOne({ _id: id, tenantId });

    if (!declaration) {
      throw new NotFoundException('Declaración no encontrada');
    }

    return declaration;
  }

  /**
   * Obtener declaración por período
   */
  async findByPeriod(month: number, year: number, tenantId: string): Promise<IvaDeclaration> {
    const declaration = await this.ivaDeclarationModel.findOne({
      tenantId,
      month,
      year,
    });

    if (!declaration) {
      throw new NotFoundException(`No hay declaración para ${month}/${year}`);
    }

    return declaration;
  }

  /**
   * Actualizar valores manualmente
   */
  async update(
    id: string,
    dto: UpdateIvaDeclarationDto,
    user: any,
  ): Promise<IvaDeclarationDocument> {
    const declaration = await this.findOne(id, user.tenantId);

    if (declaration.status === 'filed' || declaration.status === 'paid') {
      throw new BadRequestException(
        'No se puede editar una declaración presentada o pagada',
      );
    }

    Object.assign(declaration, dto);

    // Recalcular totales si cambiaron valores base
    this.recalculateTotals(declaration);

    declaration.updatedBy = user._id;

    return await declaration.save();
  }

  /**
   * Presentar declaración a SENIAT
   */
  async file(
    id: string,
    dto: FileIvaDeclarationDto,
    user: any,
  ): Promise<IvaDeclarationDocument> {
    const declaration = await this.findOne(id, user.tenantId);

    if (declaration.status === 'filed' || declaration.status === 'paid') {
      throw new BadRequestException('Esta declaración ya fue presentada');
    }

    // Validar antes de presentar
    if (dto.validateBeforeFiling !== false && !declaration.validated) {
      throw new BadRequestException(
        `No se puede presentar: ${declaration.validationErrors.length} errores encontrados`,
      );
    }

    // Generar XML si se solicita
    if (dto.generateXML !== false) {
      declaration.xmlContent = this.generateXML(declaration);
    }

    declaration.filingDate = dto.filingDate ? new Date(dto.filingDate) : new Date();
    declaration.status = 'filed';
    declaration.exportedToSENIAT = true;
    declaration.filedBy = user._id;
    declaration.updatedBy = user._id;

    return await declaration.save();
  }

  /**
   * Registrar pago de declaración
   */
  async recordPayment(
    id: string,
    dto: RecordPaymentDto,
    user: any,
  ): Promise<IvaDeclarationDocument> {
    const declaration = await this.findOne(id, user.tenantId);

    if (declaration.status !== 'filed') {
      throw new BadRequestException('Solo se puede pagar una declaración presentada');
    }

    if (dto.amountPaid < declaration.totalToPay) {
      throw new BadRequestException(
        `El monto pagado (${dto.amountPaid}) es menor al total a pagar (${declaration.totalToPay})`,
      );
    }

    declaration.paymentDate = new Date(dto.paymentDate);
    declaration.paymentReference = dto.paymentReference;
    declaration.status = 'paid';
    declaration.updatedBy = user._id;

    if (dto.notes) {
      declaration.notes = `${declaration.notes || ''}\n[PAGO] ${dto.notes}`.trim();
    }

    return await declaration.save();
  }

  /**
   * Eliminar declaración (solo draft o calculated)
   */
  /**
   * Eliminar declaración (solo draft, calculated o filed si no está pagada)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const declaration = await this.findOne(id, tenantId);

    // Permitir borrar 'filed' para permitir correcciones/reprocesamiento
    if (declaration.status === 'paid') {
      throw new BadRequestException('No se puede eliminar una declaración PAGADA');
    }

    await this.ivaDeclarationModel.deleteOne({ _id: id });
  }

  /**
   * Generar número de declaración único
   */
  private async generateDeclarationNumber(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<string> {
    const prefix = `DEC-IVA-${String(month).padStart(2, '0')}${year}`;
    const count = await this.ivaDeclarationModel.countDocuments({
      tenantId,
      declarationNumber: { $regex: `^${prefix}` },
    });

    const sequential = String(count + 1).padStart(6, '0');
    return `${prefix}-${sequential}`;
  }

  /**
   * Calcular desglose por alícuota
   */
  private calculateRateBreakdown(purchasesByRate: any[], salesByRate: any[]): any[] {
    const rates = new Set([
      ...purchasesByRate.map((r) => r.ivaRate),
      ...salesByRate.map((r) => r.ivaRate),
    ]);

    return Array.from(rates).map((rate) => {
      const purchaseData = purchasesByRate.find((r) => r.ivaRate === rate) || {
        totalBase: 0,
        totalIva: 0,
      };
      const salesData = salesByRate.find((r) => r.ivaRate === rate) || {
        totalBase: 0,
        totalIva: 0,
      };

      return {
        rate,
        salesBase: salesData.totalBase,
        salesIva: salesData.totalIva,
        purchasesBase: purchaseData.totalBase,
        purchasesIva: purchaseData.totalIva,
      };
    });
  }

  /**
   * Recalcular totales
   */
  private recalculateTotals(declaration: IvaDeclarationDocument): void {
    declaration.totalDebitFiscal = declaration.salesIvaAmount;
    declaration.totalCreditFiscal = declaration.purchasesIvaAmount;

    declaration.totalCreditToApply =
      declaration.totalCreditFiscal +
      declaration.ivaWithheldOnSales +
      declaration.previousCreditBalance;

    const netAmount =
      declaration.totalDebitFiscal - declaration.totalCreditToApply + declaration.adjustments;

    declaration.ivaToPay = netAmount > 0 ? netAmount : 0;
    declaration.creditBalance = netAmount < 0 ? Math.abs(netAmount) : 0;

    declaration.totalToPay = declaration.ivaToPay + declaration.penalties + declaration.interests;
  }

  /**
   * Generar XML para SENIAT (simplificado)
   */
  private generateXML(declaration: IvaDeclarationDocument): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DeclaracionIVA>
  <Periodo>
    <Mes>${String(declaration.month).padStart(2, '0')}</Mes>
    <Año>${declaration.year}</Año>
  </Periodo>
  <NumeroDeclaracion>${declaration.declarationNumber}</NumeroDeclaracion>
  <DebitoFiscal>
    <BaseImponible>${declaration.salesBaseAmount.toFixed(2)}</BaseImponible>
    <IVA>${declaration.salesIvaAmount.toFixed(2)}</IVA>
    <Total>${declaration.totalDebitFiscal.toFixed(2)}</Total>
  </DebitoFiscal>
  <CreditoFiscal>
    <BaseImponible>${declaration.purchasesBaseAmount.toFixed(2)}</BaseImponible>
    <IVA>${declaration.purchasesIvaAmount.toFixed(2)}</IVA>
    <Total>${declaration.totalCreditFiscal.toFixed(2)}</Total>
  </CreditoFiscal>
  <Retenciones>
    <RetencionesRecibidas>${declaration.ivaWithheldOnSales.toFixed(2)}</RetencionesRecibidas>
    <RetencionesPracticadas>${declaration.ivaWithheldOnPurchases.toFixed(2)}</RetencionesPracticadas>
  </Retenciones>
  <Calculo>
    <ExcedentePeriodoAnterior>${declaration.previousCreditBalance.toFixed(2)}</ExcedentePeriodoAnterior>
    <TotalCreditoAplicar>${declaration.totalCreditToApply.toFixed(2)}</TotalCreditoAplicar>
    <IVAaPagar>${declaration.ivaToPay.toFixed(2)}</IVAaPagar>
    <Excedente>${declaration.creditBalance.toFixed(2)}</Excedente>
  </Calculo>
  <Estadisticas>
    <OperacionesVenta>${declaration.totalSalesTransactions}</OperacionesVenta>
    <OperacionesCompra>${declaration.totalPurchasesTransactions}</OperacionesCompra>
    <FacturasElectronicas>${declaration.electronicInvoices}</FacturasElectronicas>
  </Estadisticas>
  <FechaPresentacion>${declaration.filingDate ? format(declaration.filingDate, 'dd/MM/yyyy') : ''}</FechaPresentacion>
</DeclaracionIVA>`;

    return xml;
  }
}
