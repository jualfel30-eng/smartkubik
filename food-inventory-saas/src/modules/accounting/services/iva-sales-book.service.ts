import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
  ) {}

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
        const key = e.customerId.toString();
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
    const entries = await this.getBookByPeriod(month, year, tenantId);
    const errors: string[] = [];

    for (const entry of entries) {
      // Validar que el RIF tenga formato válido
      if (!/^[VEJPG]-\d{8,9}-\d$/.test(entry.customerRif)) {
        errors.push(
          `Factura ${entry.invoiceNumber}: RIF ${entry.customerRif} tiene formato inválido`,
        );
      }

      // Validar que tenga número de control
      if (!entry.invoiceControlNumber || entry.invoiceControlNumber.trim() === '') {
        errors.push(`Factura ${entry.invoiceNumber}: Falta número de control`);
      }

      // Validar cálculo de IVA
      const expectedIva = (entry.baseAmount * entry.ivaRate) / 100;
      const diff = Math.abs(expectedIva - entry.ivaAmount);
      if (diff > 0.01) {
        errors.push(
          `Factura ${entry.invoiceNumber}: IVA calculado (${expectedIva.toFixed(2)}) no coincide con IVA registrado (${entry.ivaAmount.toFixed(2)})`,
        );
      }

      // Validar total
      const expectedTotal = entry.baseAmount + entry.ivaAmount - (entry.withheldIvaAmount || 0);
      const totalDiff = Math.abs(expectedTotal - entry.totalAmount);
      if (totalDiff > 0.01) {
        errors.push(
          `Factura ${entry.invoiceNumber}: Total calculado (${expectedTotal.toFixed(2)}) no coincide con total registrado (${entry.totalAmount.toFixed(2)})`,
        );
      }

      // Validar factura electrónica
      if (entry.isElectronic && !entry.electronicCode) {
        errors.push(
          `Factura ${entry.invoiceNumber}: Es electrónica pero falta código de autorización`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
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

    const trimmedRif = rif.trim();

    // E (extranjeros) puede tener 9 dígitos
    const ePattern = /^E-\d{9}-\d$/i;
    if (ePattern.test(trimmedRif)) return true;

    // J, V, G, P deben tener exactamente 8 dígitos
    const standardPattern = /^[VJGP]-\d{8}-\d$/i;
    return standardPattern.test(trimmedRif);
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

    // Validar cálculo de IVA
    const expectedIva = (entry.baseAmount * entry.ivaRate) / 100;
    const diff = Math.abs(expectedIva - entry.ivaAmount);
    if (diff > 0.01) {
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
    // Verificar si ya existe una entrada para este documento
    const existing = await this.ivaSalesBookModel.findOne({
      tenantId: user.tenantId,
      $or: [
        { invoiceNumber: billingDoc.documentNumber },
        { billingDocumentId: billingDocumentId },
      ],
    });

    if (existing) {
      // Ya existe, retornar la entrada existente
      return existing;
    }

    // Extraer datos de impuestos
    const ivaTax = billingDoc.taxDetails?.find((t: any) => t.taxType === 'IVA') ||
      billingDoc.totals?.taxes?.find((t: any) => t.type === 'IVA');

    const ivaRate = ivaTax?.rate || 16;
    const ivaAmount = ivaTax?.amount || 0;
    const baseAmount = ivaTax?.baseAmount || billingDoc.totals?.subtotal || 0;

    // Extraer mes y año
    const issueDate = new Date(billingDoc.issueDate);
    const month = issueDate.getMonth() + 1;
    const year = issueDate.getFullYear();

    // Mapear tipo de transacción
    const transactionTypeMap: Record<string, string> = {
      invoice: 'sale',
      credit_note: 'credit_note',
      debit_note: 'debit_note',
      delivery_note: 'sale',
    };
    const transactionType = transactionTypeMap[billingDoc.type] || 'sale';

    // Crear entrada
    const entryData: CreateIvaSalesBookDto = {
      month,
      year,
      operationDate: billingDoc.issueDate.toISOString
        ? billingDoc.issueDate.toISOString()
        : billingDoc.issueDate,
      customerId: billingDoc.customer?.customerId || `BILLING-${billingDocumentId}`,
      customerName: billingDoc.customer?.name || 'Cliente sin nombre',
      customerRif: billingDoc.customer?.taxId || 'J-00000000-0',
      customerAddress: billingDoc.customer?.address,
      invoiceNumber: billingDoc.documentNumber,
      invoiceControlNumber: billingDoc.controlNumber || '',
      invoiceDate: billingDoc.issueDate.toISOString
        ? billingDoc.issueDate.toISOString()
        : billingDoc.issueDate,
      transactionType,
      baseAmount,
      ivaRate,
      ivaAmount,
      withheldIvaAmount: billingDoc.withheldIvaAmount || 0,
      withholdingCertificate: billingDoc.withholdingCertificate,
      totalAmount: billingDoc.totals?.grandTotal || baseAmount + ivaAmount,
      isElectronic: true,
      electronicCode: billingDoc.controlNumber,
      billingDocumentId: billingDocumentId,
    };

    return await this.create(entryData, user);
  }
}
