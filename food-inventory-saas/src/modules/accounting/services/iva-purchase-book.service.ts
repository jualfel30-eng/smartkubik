import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IvaPurchaseBook, IvaPurchaseBookDocument } from '../../../schemas/iva-purchase-book.schema';
import {
  CreateIvaPurchaseBookDto,
  UpdateIvaPurchaseBookDto,
} from '../../../dto/iva-books.dto';
import { format } from 'date-fns';

@Injectable()
export class IvaPurchaseBookService {
  constructor(
    @InjectModel(IvaPurchaseBook.name)
    private ivaPurchaseBookModel: Model<IvaPurchaseBookDocument>,
  ) {}

  /**
   * Crear entrada en libro de compras
   */
  async create(dto: CreateIvaPurchaseBookDto, user: any): Promise<IvaPurchaseBook> {
    // Calcular totalAmount si no viene
    const totalAmount = dto.totalAmount || (dto.baseAmount + dto.ivaAmount - (dto.withheldIvaAmount || 0));

    const entry = await this.ivaPurchaseBookModel.create({
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
  ): Promise<{ data: IvaPurchaseBook[]; total: number }> {
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

    if (filters?.supplierId) {
      query.supplierId = filters.supplierId;
    }

    if (filters?.supplierRif) {
      query.supplierRif = { $regex: filters.supplierRif, $options: 'i' };
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
      this.ivaPurchaseBookModel
        .find(query)
        .populate('supplierId', 'name taxId')
        .populate('withholdingId')
        .sort({ operationDate: -1, invoiceNumber: -1 })
        .skip(skip)
        .limit(limit),
      this.ivaPurchaseBookModel.countDocuments(query),
    ]);

    return { data, total };
  }

  /**
   * Obtener entrada por ID
   */
  async findOne(id: string, tenantId: string): Promise<IvaPurchaseBookDocument> {
    const entry = await this.ivaPurchaseBookModel
      .findOne({ _id: id, tenantId })
      .populate('supplierId')
      .populate('withholdingId')
      .populate('purchaseOrderId')
      .populate('payableId')
      .populate('journalEntryId');

    if (!entry) {
      throw new NotFoundException('Entrada de libro de compras no encontrada');
    }

    return entry;
  }

  /**
   * Actualizar entrada (solo si no está exportada)
   */
  async update(
    id: string,
    dto: UpdateIvaPurchaseBookDto,
    user: any,
  ): Promise<IvaPurchaseBookDocument> {
    const entry = await this.findOne(id, user.tenantId);

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
   * Eliminar entrada (solo si no está exportada)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const entry = await this.findOne(id, tenantId);

    if (entry.exportedToSENIAT) {
      throw new BadRequestException(
        'No se puede eliminar una entrada que ya fue exportada a SENIAT',
      );
    }

    await this.ivaPurchaseBookModel.deleteOne({ _id: id });
  }

  /**
   * Obtener libro completo por período
   */
  async getBookByPeriod(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<IvaPurchaseBookDocument[]> {
    return await this.ivaPurchaseBookModel
      .find({
        tenantId,
        month,
        year,
        status: { $in: ['confirmed', 'exported'] },
      })
      .populate('supplierId', 'name taxId')
      .populate('withholdingId', 'certificateNumber withholdingAmount')
      .sort({ operationDate: 1, invoiceNumber: 1 });
  }

  /**
   * Exportar libro a formato TXT SENIAT
   */
  async exportToTXT(month: number, year: number, tenantId: string): Promise<string> {
    const entries = await this.getBookByPeriod(month, year, tenantId);

    let txtContent = '';

    for (const entry of entries) {
      // Formato TXT SENIAT para libro de compras (campos separados por tabuladores)
      const line = [
        format(entry.operationDate, 'dd/MM/yyyy'), // Fecha
        entry.transactionType === 'import' ? 'I' : 'R', // Tipo (Importación o Regular)
        entry.supplierRif.replace(/-/g, ''), // RIF sin guiones
        entry.supplierName.substring(0, 50), // Nombre (max 50 chars)
        entry.invoiceNumber, // Número de factura
        entry.invoiceControlNumber, // Número de control
        entry.baseAmount.toFixed(2), // Base imponible
        entry.ivaRate.toFixed(2), // % IVA
        entry.ivaAmount.toFixed(2), // IVA
        entry.withheldIvaAmount?.toFixed(2) || '0.00', // IVA retenido
        entry.withholdingCertificate || '', // Comprobante retención
        entry.totalAmount.toFixed(2), // Total
      ].join('\t');

      txtContent += line + '\n';
    }

    // Marcar como exportadas
    await this.ivaPurchaseBookModel.updateMany(
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
    bySupplier: any[];
    byIvaRate: any[];
  }> {
    const entries = await this.getBookByPeriod(month, year, tenantId);

    const totalEntries = entries.length;
    const totalBaseAmount = entries.reduce((sum, e) => sum + e.baseAmount, 0);
    const totalIvaAmount = entries.reduce((sum, e) => sum + e.ivaAmount, 0);
    const totalWithheldIva = entries.reduce((sum, e) => sum + (e.withheldIvaAmount || 0), 0);
    const totalAmount = entries.reduce((sum, e) => sum + e.totalAmount, 0);

    // Agrupar por proveedor
    const bySupplier = Object.values(
      entries.reduce((acc, e) => {
        const key = e.supplierId.toString();
        if (!acc[key]) {
          acc[key] = {
            supplierId: e.supplierId,
            supplierName: e.supplierName,
            supplierRif: e.supplierRif,
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
      bySupplier,
      byIvaRate,
    };
  }

  /**
   * Sincronizar desde Purchase Order (cuando se recibe una compra)
   */
  async syncFromPurchaseOrder(purchaseOrderId: string, user: any): Promise<IvaPurchaseBook> {
    // Este método se llamaría cuando se confirma una orden de compra
    // y automáticamente crea la entrada en el libro de compras

    // TODO: Implementar lógica completa cuando tengamos el módulo de compras integrado
    throw new Error('Not implemented yet - requires Purchase module integration');
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
      if (!/^[VEJPG]-\d{8,9}-\d$/.test(entry.supplierRif)) {
        errors.push(
          `Factura ${entry.invoiceNumber}: RIF ${entry.supplierRif} tiene formato inválido`,
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
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
