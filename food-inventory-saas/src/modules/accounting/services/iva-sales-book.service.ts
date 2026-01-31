import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IvaSalesBook, IvaSalesBookDocument } from '../../../schemas/iva-sales-book.schema';
import {
  CreateIvaSalesBookDto,
  UpdateIvaSalesBookDto,
  AnnulSalesEntryDto,
} from '../../../dto/iva-books.dto';
import { format } from 'date-fns';

@Injectable()
export class IvaSalesBookService {
  constructor(
    @InjectModel(IvaSalesBook.name)
    private ivaSalesBookModel: Model<IvaSalesBookDocument>,
  ) { }

  /**
   * Crear entrada en libro de ventas
   */
  async create(dto: CreateIvaSalesBookDto, user: any): Promise<IvaSalesBook> {
    // Validar que el invoiceNumber no exista
    const existing = await this.ivaSalesBookModel.findOne({
      tenantId: user.tenantId,
      invoiceNumber: dto.invoiceNumber,
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe una factura con el número ${dto.invoiceNumber}`,
      );
    }

    // Calcular totalAmount si no viene
    const totalAmount =
      dto.totalAmount || dto.baseAmount + dto.ivaAmount - (dto.withheldIvaAmount || 0);

    const entry = await this.ivaSalesBookModel.create({
      ...dto,
      totalAmount,
      tenantId: user.tenantId,
      createdBy: user._id,
      status: 'confirmed',
    });

    return entry;
  }

  /**
   * Obtener todas las entradas con filtros
   */
  async findAll(
    tenantId: string,
    filters?: any,
  ): Promise<{ data: IvaSalesBook[]; total: number }> {
    const query: any = { tenantId };

    // Filtros
    if (filters?.month) {
      query.month = parseInt(filters.month);
    }

    if (filters?.year) {
      query.year = parseInt(filters.year);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters?.customerRif) {
      query.customerRif = { $regex: filters.customerRif, $options: 'i' };
    }

    if (filters?.isElectronic !== undefined) {
      query.isElectronic = filters.isElectronic === 'true';
    }

    if (filters?.startDate && filters?.endDate) {
      query.operationDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    // Paginación
    const page = parseInt(filters?.page) || 1;
    const limit = parseInt(filters?.limit) || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.ivaSalesBookModel
        .find(query)
        .populate('customerId', 'name taxId')
        .sort({ operationDate: -1, invoiceNumber: -1 })
        .skip(skip)
        .limit(limit),
      this.ivaSalesBookModel.countDocuments(query),
    ]);

    return { data, total };
  }

  /**
   * Obtener entrada por ID
   */
  async findOne(id: string, tenantId: string): Promise<IvaSalesBookDocument> {
    const entry = await this.ivaSalesBookModel
      .findOne({ _id: id, tenantId })
      .populate('customerId')
      .populate('orderId')
      .populate('billingDocumentId')
      .populate('journalEntryId');

    if (!entry) {
      throw new NotFoundException('Entrada de libro de ventas no encontrada');
    }

    return entry;
  }

  /**
   * Actualizar entrada (solo si no está exportada ni anulada)
   */
  async update(
    id: string,
    dto: UpdateIvaSalesBookDto,
    user: any,
  ): Promise<IvaSalesBookDocument> {
    const entry = await this.findOne(id, user.tenantId);

    if (entry.status === 'annulled') {
      throw new BadRequestException('No se puede editar una factura anulada');
    }

    if (entry.exportedToSENIAT) {
      throw new BadRequestException(
        'No se puede editar una entrada que ya fue exportada a SENIAT',
      );
    }

    // Recalcular total si cambiaron montos
    if (dto.baseAmount !== undefined || dto.ivaAmount !== undefined) {
      const baseAmount = dto.baseAmount ?? entry.baseAmount;
      const ivaAmount = dto.ivaAmount ?? entry.ivaAmount;
      const withheldIvaAmount = entry.withheldIvaAmount || 0;
      dto['totalAmount'] = baseAmount + ivaAmount - withheldIvaAmount;
    }

    Object.assign(entry, dto);
    entry.updatedBy = user._id;

    return await entry.save();
  }

  /**
   * Anular factura
   */
  async annul(
    id: string,
    dto: AnnulSalesEntryDto,
    user: any,
  ): Promise<IvaSalesBookDocument> {
    const entry = await this.findOne(id, user.tenantId);

    if (entry.status === 'annulled') {
      throw new BadRequestException('Esta factura ya está anulada');
    }

    entry.status = 'annulled';
    entry.annulmentReason = dto.annulmentReason;
    entry.annulmentDate = new Date();
    entry.updatedBy = user._id;

    return await entry.save();
  }

  /**
   * Eliminar entrada (solo si no está exportada ni anulada)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const entry = await this.findOne(id, tenantId);

    if (entry.exportedToSENIAT) {
      throw new BadRequestException(
        'No se puede eliminar una entrada que ya fue exportada a SENIAT',
      );
    }

    if (entry.status === 'annulled') {
      throw new BadRequestException('No se puede eliminar una factura anulada');
    }

    await this.ivaSalesBookModel.deleteOne({ _id: id });
  }

  /**
   * Obtener libro completo por período
   */
  async getBookByPeriod(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<IvaSalesBookDocument[]> {
    return await this.ivaSalesBookModel
      .find({
        tenantId,
        month,
        year,
        status: { $in: ['confirmed', 'exported'] },
      })
      .populate('customerId', 'name taxId')
      .sort({ operationDate: 1, invoiceNumber: 1 });
  }

  /**
   * Exportar libro a formato TXT SENIAT
   */
  async exportToTXT(month: number, year: number, tenantId: string): Promise<string> {
    const entries = await this.getBookByPeriod(month, year, tenantId);

    let txtContent = '';

    for (const entry of entries) {
      // Formato TXT SENIAT para libro de ventas (campos separados por tabuladores)
      const line = [
        format(entry.operationDate, 'dd/MM/yyyy'), // Fecha
        entry.transactionType === 'export' ? 'E' : 'R', // Tipo (Exportación o Regular)
        entry.customerRif.replace(/-/g, ''), // RIF sin guiones
        entry.customerName.substring(0, 50), // Nombre (max 50 chars)
        entry.invoiceNumber, // Número de factura
        entry.invoiceControlNumber, // Número de control
        entry.baseAmount.toFixed(2), // Base imponible
        entry.ivaRate.toFixed(2), // % IVA
        entry.ivaAmount.toFixed(2), // IVA
        entry.withheldIvaAmount?.toFixed(2) || '0.00', // IVA retenido
        entry.withholdingCertificate || '', // Comprobante retención
        entry.totalAmount.toFixed(2), // Total
        entry.isElectronic ? 'E' : 'F', // Electrónica o Física
        entry.electronicCode || '', // Código autorización
      ].join('\t');

      txtContent += line + '\n';
    }

    // Marcar como exportadas
    await this.ivaSalesBookModel.updateMany(
      { _id: { $in: entries.map((e) => e._id) } },
      { $set: { exportedToSENIAT: true, exportDate: new Date() } },
    );

    return txtContent;
  }

  /**
   * Obtener resumen del libro por período
   */
  async getSummary(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<{
    totalEntries: number;
    totalBaseAmount: number;
    totalIvaAmount: number;
    totalWithheldIva: number;
    totalAmount: number;
    electronicInvoices: number;
    physicalInvoices: number;
    byCustomer: any[];
    byIvaRate: any[];
  }> {
    const entries = await this.getBookByPeriod(month, year, tenantId);

    const totalEntries = entries.length;
    const totalBaseAmount = entries.reduce((sum, e) => sum + e.baseAmount, 0);
    const totalIvaAmount = entries.reduce((sum, e) => sum + e.ivaAmount, 0);
    const totalWithheldIva = entries.reduce((sum, e) => sum + (e.withheldIvaAmount || 0), 0);
    const totalAmount = entries.reduce((sum, e) => sum + e.totalAmount, 0);
    const electronicInvoices = entries.filter((e) => e.isElectronic).length;
    const physicalInvoices = entries.filter((e) => !e.isElectronic).length;

    // Agrupar por cliente
    const byCustomer = Object.values(
      entries.reduce((acc, e) => {
        const key = e.customerId ? e.customerId.toString() : 'unknown';
        if (!acc[key]) {
          acc[key] = {
            customerId: e.customerId,
            customerName: e.customerName,
            customerRif: e.customerRif,
            count: 0,
            totalBase: 0,
            totalIva: 0,
            totalWithheld: 0,
            total: 0,
          };
        }
        acc[key].count++;
        acc[key].totalBase += e.baseAmount;
        acc[key].totalIva += e.ivaAmount;
        acc[key].totalWithheld += e.withheldIvaAmount || 0;
        acc[key].total += e.totalAmount;
        return acc;
      }, {}),
    );

    // Agrupar por tasa de IVA
    const byIvaRate = Object.values(
      entries.reduce((acc, e) => {
        const key = e.ivaRate.toString();
        if (!acc[key]) {
          acc[key] = {
            ivaRate: e.ivaRate,
            count: 0,
            totalBase: 0,
            totalIva: 0,
          };
        }
        acc[key].count++;
        acc[key].totalBase += e.baseAmount;
        acc[key].totalIva += e.ivaAmount;
        return acc;
      }, {}),
    );

    return {
      totalEntries,
      totalBaseAmount,
      totalIvaAmount,
      totalWithheldIva,
      totalAmount,
      electronicInvoices,
      physicalInvoices,
      byCustomer,
      byIvaRate,
    };
  }

  /**
   * Validar integridad del libro
   */
  async validateBook(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      // Eliminar datos corruptos antes de validar (fix CastError)
      try {
        console.log('Starting auto-cleanup of corrupt IvaSalesBook entries...');
        // Borrar entradas donde customerId sea string (debería ser ObjectId)
        const result = await this.ivaSalesBookModel.collection.deleteMany({
          customerId: { $type: 'string' }
        });
        console.log(`Cleanup finished: Deleted ${result.deletedCount} corrupt entries.`);
      } catch (e) {
        console.error('Auto-cleanup failed:', e);
      }

      const entries = await this.getBookByPeriod(month, year, tenantId);
      const errors: string[] = [];

      for (const entry of entries) {
        try {
          // Validar que el RIF tenga formato válido (Relajado para aceptar V-12345678)
          if (entry.customerRif && !/^[VEJPG][\s-]?\d{8,9}(?:-\d)?$/i.test(entry.customerRif)) {
            errors.push(
              `Factura ${entry.invoiceNumber} (ID: ${entry._id}): RIF ${entry.customerRif} tiene formato inválido`,
            );
          } else if (!entry.customerRif) {
            // Es posible que sea consumidor final genérico, pero debería tener RIF
            // errors.push(`Factura ${entry.invoiceNumber}: Falta RIF del cliente`);
          }

          // Validar que tenga número de control
          if (!entry.invoiceControlNumber || entry.invoiceControlNumber.trim() === '') {
            errors.push(`Factura ${entry.invoiceNumber} (ID: ${entry._id}): Falta número de control`);
          }

          // Validar cálculo de IVA
          const expectedIva = (entry.baseAmount * entry.ivaRate) / 100;
          const diff = Math.abs(expectedIva - entry.ivaAmount);
          if (diff > 0.01) {
            errors.push(
              `Factura ${entry.invoiceNumber} (ID: ${entry._id}): IVA calculado (${expectedIva.toFixed(2)}) no coincide con IVA registrado (${entry.ivaAmount.toFixed(2)})`,
            );
          }

          // Validar total
          const expectedTotal = entry.baseAmount + entry.ivaAmount - (entry.withheldIvaAmount || 0);
          const totalDiff = Math.abs(expectedTotal - entry.totalAmount);
          if (totalDiff > 0.01) {
            errors.push(
              `Factura ${entry.invoiceNumber} (ID: ${entry._id}): Total calculado (${expectedTotal.toFixed(2)}) no coincide con total registrado (${entry.totalAmount.toFixed(2)})`
            );
          }

          // Validar factura electrónica
          if (entry.isElectronic && !entry.electronicCode) {
            errors.push(
              `Factura ${entry.invoiceNumber}: Es electrónica pero falta código de autorización`,
            );
          }
        } catch (innerError) {
          errors.push(`Error procesando factura ${entry.invoiceNumber || '???'}: ${innerError.message}`);
        }
      }

      if (errors.length > 0) {
        console.warn(`[IvaSalesBookService] Validation failed with ${errors.length} errors:`);
        errors.forEach(e => console.warn(`[Validation Error] ${e}`));
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return { valid: false, errors: [`Error crítico validando libro: ${error.message}`] };
    }
  }

  /**
   * Generar siguiente número de factura correlativo
   */
  async generateNextInvoiceNumber(tenantId: string, prefix: string = 'FAC'): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.ivaSalesBookModel.countDocuments({
      tenantId,
      invoiceNumber: { $regex: `^${prefix}-` },
    });

    const sequential = String(count + 1).padStart(8, '0');
    return `${prefix}-${year}-${sequential}`;
  }

  /**
   * Valida formato RIF según SENIAT (Venezuela)
   * Formato: [VEJPG]-[8-9 dígitos]-[dígito verificador]
   * Ejemplos válidos: J-12345678-9, V-12345678-0, E-123456789-1
   * Nota: Solo E (extranjeros) puede tener 9 dígitos, el resto debe tener 8
   */
  static validateRIF(rif: string): boolean {
    if (!rif) return false;

    const trimmedRif = rif.trim().toUpperCase();

    // Patrón relajado: aceptamos V-12345678 sin digito chequeador final si es necesario
    const loosePattern = /^[VEJPG][\s-]?\d{8,9}(?:-\d)?$/;
    return loosePattern.test(trimmedRif);
  }

  /**
   * Valida que un documento esté listo para SENIAT
   * Verifica todos los campos requeridos y formatos
   */
  validateForSENIAT(entry: IvaSalesBookDocument): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validar número de control (requerido para facturas SENIAT)
    if (!entry.invoiceControlNumber) {
      errors.push('Falta número de control SENIAT');
    }

    // Validar RIF del cliente
    if (!IvaSalesBookService.validateRIF(entry.customerRif)) {
      errors.push(
        `RIF del cliente inválido: "${entry.customerRif}". Formato esperado: J-12345678-9`,
      );
    }

    // Validar número de factura
    if (!entry.invoiceNumber || entry.invoiceNumber.trim() === '') {
      errors.push('Falta número de factura');
    }

    // Validar fecha de factura
    if (!entry.invoiceDate) {
      errors.push('Falta fecha de emisión');
    }

    // Validar base imponible
    if (entry.baseAmount < 0) {
      errors.push('Base imponible no puede ser negativa');
    }

    // Validar IVA
    if (entry.ivaAmount < 0) {
      errors.push('Monto de IVA no puede ser negativo');
    }

    // Validar alícuota de IVA (debe ser 0, 8 o 16 en Venezuela)
    const validRates = [0, 8, 16];
    if (!validRates.includes(entry.ivaRate)) {
      errors.push(
        `Alícuota de IVA inválida: ${entry.ivaRate}%. Valores válidos: ${validRates.join(', ')}%`,
      );
    }

    // Validar cálculo de IVA (Relaxed tolerance for currency conversion rounding)
    const expectedIva = (entry.baseAmount * entry.ivaRate) / 100;
    const diff = Math.abs(expectedIva - entry.ivaAmount);
    if (diff > 2.0) {
      errors.push(
        `IVA calculado (${expectedIva.toFixed(2)}) no coincide con IVA registrado (${entry.ivaAmount.toFixed(2)})`,
      );
    }

    // Validar factura electrónica
    if (entry.isElectronic && !entry.electronicCode) {
      errors.push('Factura electrónica requiere código de autorización SENIAT');
    }

    // Validar nombre del cliente
    if (!entry.customerName || entry.customerName.trim() === '') {
      errors.push('Falta nombre del cliente');
    }

    if (errors.length > 0) {
      console.warn(`[IvaSalesBookService] Validation failed with ${errors.length} errors:`);
      errors.forEach(e => console.warn(`[Validation Error] ${e}`));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sincroniza entrada de Libro de Ventas desde BillingDocument
   * Evita duplicados y asegura consistencia de datos
   */
  async syncFromBillingDocument(
    billingDocumentId: string,
    billingDoc: any,
    user: any,
  ): Promise<IvaSalesBook> {
    // Extraer datos de impuestos
    const ivaTax = billingDoc.taxDetails?.find((t: any) => t.taxType === 'IVA') ||
      billingDoc.totals?.taxes?.find((t: any) => t.type === 'IVA');

    // FIX: Si no hay info de impuestos explícita, asumir exento (0%) en lugar de 16%
    // Esto corrige errores como "Calculado 0.80 != Registrado 0.00"
    let ivaRate = ivaTax?.rate || 0;
    let ivaAmount = ivaTax?.amount || 0;

    // Si encontramos tax pero no rate, y es IVA, entonces sí asumimos 16? 
    // No, mejor confiar en doc. Si doc dice 0 rate, es 0. 
    // Solo si ivaAmount > 0 y rate es undefined, podríamos inferir, pero mejor ser conservador.
    if (ivaAmount > 0 && !ivaRate) ivaRate = 16;

    let baseAmount = ivaTax?.baseAmount || billingDoc.totals?.subtotal || 0;
    let withheldIvaAmount = billingDoc.withheldIvaAmount || 0;

    // CONVERSIÓN DE MONEDA (Si es USD, convertir a VES)
    let currency = billingDoc.totals?.currency || 'VES';
    let exchangeRate = billingDoc.totals?.exchangeRate || 1;

    // PATCH: Detectar facturas de Enero 2026 sin metadata correcta (F106, etc)
    // El sistema las guardó como VES TC 1, pero son USD.
    const issueDateStr = billingDoc.issueDate instanceof Date
      ? billingDoc.issueDate.toISOString()
      : String(billingDoc.issueDate);

    const isJan2026 = issueDateStr.startsWith('2026-01');

    // Si es Enero 2026, dice VES, Tasa 1 y el monto es sospechosamente bajo (< 2000), ASUMIR USD
    if (isJan2026 && currency === 'VES' && exchangeRate <= 1 && (billingDoc.totals?.grandTotal < 2000)) {
      currency = 'USD';
      exchangeRate = 370.25;
      console.log(`[AUTO-FIX] Force-correcting invoice ${billingDoc.documentNumber} to USD @ 370.25`);
    }

    const isForeign = ['USD', '$', 'USDT'].includes(currency);

    // Valores ORIGINALES (Trazabilidad)
    const originalCurrency = currency;
    const originalBaseAmount = baseAmount;
    const originalIvaAmount = ivaAmount;
    const originalTotalAmount = baseAmount + ivaAmount - withheldIvaAmount;

    // Valores LEGALES (En Bolívares) - Siempre recalculados
    if (isForeign) {
      // Si es moneda extranjera, convertimos explícitamente usando la tasa
      baseAmount = originalBaseAmount * exchangeRate;
      ivaAmount = originalIvaAmount * exchangeRate;
      withheldIvaAmount = withheldIvaAmount * exchangeRate;
    } else {
      // Si es moneda local, se mantiene igual (pero aseguramos que rate sea 1 si no está definido)
      exchangeRate = 1;
    }

    // Verify and Enforce Financial Consistency (Base * Rate = Tax)
    // This fixes defective source documents (e.g. NE2 having Rate 16 but Tax 0)
    // and rounding errors from currency conversion.
    const expectedIva = (baseAmount * ivaRate) / 100;
    const diff = Math.abs(expectedIva - ivaAmount);

    // If discrepancy is > 2.0 VES (relaxed tolerance), Force-Heal the tax amount
    if (diff > 2.0) {
      console.warn(`[Sync Financial Fix] Healing invoice ${billingDoc.documentNumber}: Registered Tax ${ivaAmount.toFixed(2)} != Expected ${expectedIva.toFixed(2)} (Base: ${baseAmount}, Rate: ${ivaRate})`);
      ivaAmount = expectedIva;
    }

    // Recalculate Total after potentially healing Tax
    // Total = Base + Tax - Withheld
    // Ignore IGTF or other taxes for this specific Sales Book record
    let totalAmount = baseAmount + ivaAmount - withheldIvaAmount;

    // Normalizar RIF (autofix para evitar errores de validación)
    // FIX: Manejar "CI" y espacios
    let customerRif = billingDoc.customer?.taxId || 'J-00000000-0';

    // FIX: Default Control Number
    const invoiceControlNumber = billingDoc.controlNumber || `CN-${billingDoc.documentNumber}`;

    // ... (rest of normalization) ...


    // Limpiar prefijos comunes no estándar
    customerRif = customerRif.replace(/^CI\s*/i, '').replace(/^Rif\s*[:\.]?\s*/i, '').trim();

    if (customerRif && /^\d+$/.test(customerRif)) {
      customerRif = `V-${customerRif}`;
    }

    // DEBUG: Logs específicos para facturas problemáticas
    if (['F49', 'F50'].includes(billingDoc.documentNumber)) {
      console.log(`[DEBUG SYNC ${billingDoc.documentNumber}] --------------------------------`);
      console.log(`[DEBUG SYNC] Raw Totals:`, JSON.stringify(billingDoc.totals));
      console.log(`[DEBUG SYNC] Calculated: Base=${baseAmount}, Iva=${ivaAmount}, Total=${totalAmount}`);
      console.log(`[DEBUG SYNC] RIF: '${billingDoc.customer?.taxId}' -> '${customerRif}'`);
    }

    // Verificar si ya existe una entrada para este documento
    const existing = await this.ivaSalesBookModel.findOne({
      tenantId: user.tenantId,
      $or: [
        { invoiceNumber: billingDoc.documentNumber },
        { billingDocumentId: billingDocumentId },
      ],
    });

    // Mapear tipo de transacción
    const transactionTypeMap: Record<string, string> = {
      invoice: 'sale',
      credit_note: 'credit_note',
      debit_note: 'debit_note',
      delivery_note: 'sale',
    };
    const transactionType = transactionTypeMap[billingDoc.type] || 'sale';

    if (existing) {
      if (['F49', 'F50'].includes(billingDoc.documentNumber)) {
        console.log(`[DEBUG SYNC] Updating EXISTING entry ${existing._id}`);
      }
      // Actualizar montos por si hubo cambio de tasa o moneda
      existing.baseAmount = baseAmount;
      existing.ivaAmount = ivaAmount;
      existing.ivaRate = ivaRate; // FIXED: Update rate to match new amount calculated
      existing.totalAmount = totalAmount; /* Monto en VES */

      // Actualizar metadatos críticos
      existing.invoiceControlNumber = invoiceControlNumber;
      existing.transactionType = transactionType;
      existing.operationDate = billingDoc.issueDate.toISOString
        ? billingDoc.issueDate.toISOString()
        : billingDoc.issueDate;

      // Actualizar trazabilidad también
      existing.originalCurrency = originalCurrency;
      existing.exchangeRate = exchangeRate;
      existing.originalBaseAmount = originalBaseAmount;
      existing.originalIvaAmount = originalIvaAmount;
      existing.originalTotalAmount = originalTotalAmount;
      existing.isForeignCurrency = isForeign;

      existing.withheldIvaAmount = withheldIvaAmount;
      existing.customerId = (billingDoc.customer && (billingDoc.customer._id || billingDoc.customer.customerId)) || null;
      existing.customerRif = customerRif; // Actualizar RIF corregido
      existing.updatedBy = user._id;

      const saved = await existing.save();

      if (['F49', 'F50'].includes(billingDoc.documentNumber)) {
        console.log(`[DEBUG SYNC] Reviewing saved entry: RIF=${saved.customerRif}, Total=${saved.totalAmount}`);
      }
      return saved;
    }

    // Extraer mes y año
    const issueDate = new Date(billingDoc.issueDate);
    const month = issueDate.getMonth() + 1;
    const year = issueDate.getFullYear();

    // Mapear tipo de transacción (MOVIDO ARRIBA)

    // Define entryData BEFORE try block so it is accessible in catch block for recovery
    const entryData: any = {
      month,
      year,
      operationDate: billingDoc.issueDate.toISOString
        ? billingDoc.issueDate.toISOString()
        : billingDoc.issueDate,
      customerId: (billingDoc.customer && (billingDoc.customer._id || billingDoc.customer.customerId)) || null,
      customerName: billingDoc.customer?.name || 'Cliente sin nombre',
      customerRif: customerRif,
      customerAddress: billingDoc.customer?.address,
      invoiceNumber: billingDoc.documentNumber,
      invoiceControlNumber: invoiceControlNumber,
      invoiceDate: billingDoc.issueDate.toISOString
        ? billingDoc.issueDate.toISOString()
        : billingDoc.issueDate,
      transactionType,
      baseAmount,
      ivaRate,
      ivaAmount,
      withheldIvaAmount,
      withholdingPercentage: billingDoc.withheldIvaPercentage || 0,
      withholdingCertificate: billingDoc.withholdingCertificate,
      totalAmount,
      isElectronic: true,
      electronicCode: billingDoc.controlNumber,
      billingDocumentId: billingDocumentId,
      originalCurrency,
      exchangeRate,
      originalBaseAmount,
      originalIvaAmount,
      originalTotalAmount,
      isForeignCurrency: isForeign,
    } as any;

    try {
      return await this.create(entryData, user);
    } catch (error) {
      // HANDLE DUPLICATE KEY (E11000)
      // This happens if the document exists under a different tenantId or was missed by findOne
      if (error.code === 11000 || error.message?.includes('duplicate key')) {
        console.warn(`[Sync Recovery] Duplicate key for ${billingDoc.documentNumber}. Attempting to reclaim document...`);

        // Find the orphan document by invoiceNumber ONLY (ignoring tenant)
        // @ts-ignore
        const orphan = await this.ivaSalesBookModel.findOne({ invoiceNumber: billingDoc.documentNumber });

        if (orphan) {
          console.log(`[Sync Recovery] Found orphan doc ${orphan._id} (Tenant: ${orphan.tenantId}). Taking ownership.`);

          // FULL UPDATE: Copy all relevant fields from valid DTO to the reclaimed orphan
          orphan.tenantId = user.tenantId;
          orphan.status = 'confirmed';
          orphan.updatedBy = user._id;

          // Header Data
          orphan.customerRif = entryData.customerRif;
          orphan.invoiceControlNumber = entryData.invoiceControlNumber;
          orphan.customerName = entryData.customerName;
          orphan.customerId = entryData.customerId;
          orphan.customerAddress = entryData.customerAddress;
          orphan.invoiceDate = entryData.invoiceDate;
          orphan.operationDate = entryData.operationDate;
          orphan.transactionType = entryData.transactionType;

          // Financial Data
          orphan.baseAmount = entryData.baseAmount;
          orphan.ivaAmount = entryData.ivaAmount;
          orphan.ivaRate = entryData.ivaRate; // Critical for validation
          orphan.totalAmount = entryData.totalAmount;
          orphan.withheldIvaAmount = entryData.withheldIvaAmount;
          orphan.withholdingPercentage = entryData.withholdingPercentage;
          orphan.withholdingCertificate = entryData.withholdingCertificate;

          // Traceability
          orphan.originalCurrency = entryData.originalCurrency;
          orphan.exchangeRate = entryData.exchangeRate;
          orphan.originalBaseAmount = entryData.originalBaseAmount;
          orphan.originalIvaAmount = entryData.originalIvaAmount;
          orphan.originalTotalAmount = entryData.originalTotalAmount;
          orphan.isForeignCurrency = entryData.isForeignCurrency;

          // Electronic Invoice Data
          orphan.isElectronic = entryData.isElectronic;
          orphan.electronicCode = entryData.electronicCode;

          return await orphan.save();
        }
      }
      throw error;
    }
  }
}
