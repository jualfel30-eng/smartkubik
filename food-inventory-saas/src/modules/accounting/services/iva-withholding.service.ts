import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IvaWithholding, IvaWithholdingDocument } from '../../../schemas/iva-withholding.schema';
import {
  CreateIvaWithholdingDto,
  UpdateIvaWithholdingDto,
  AnnulWithholdingDto,
} from '../../../dto/iva-withholding.dto';
import { AccountingService } from '../accounting.service';
import { format } from 'date-fns';

@Injectable()
export class IvaWithholdingService {
  constructor(
    @InjectModel(IvaWithholding.name)
    private ivaWithholdingModel: Model<IvaWithholdingDocument>,
    private accountingService: AccountingService,
  ) {}

  /**
   * Crear retención de IVA
   */
  async create(dto: CreateIvaWithholdingDto, user: any): Promise<IvaWithholding> {
    // Calcular monto de retención
    const withholdingAmount = (dto.ivaAmount * dto.withholdingPercentage) / 100;

    // Validar que withholdingAmount > 0
    if (withholdingAmount <= 0) {
      throw new BadRequestException('El monto de retención debe ser mayor a 0');
    }

    // Generar número de certificado correlativo
    const certificateNumber = await this.generateCertificateNumber(user.tenantId);

    // Crear retención
    const withholding = await this.ivaWithholdingModel.create({
      ...dto,
      certificateNumber,
      withholdingAmount,
      tenantId: user.tenantId,
      createdBy: user._id,
      status: 'draft',
    });

    return withholding;
  }

  /**
   * Generar número correlativo de certificado
   */
  private async generateCertificateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.ivaWithholdingModel.countDocuments({
      tenantId,
      withholdingDate: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });

    const sequential = String(count + 1).padStart(6, '0');
    return `RET-IVA-${year}-${sequential}`;
  }

  /**
   * Obtener todas las retenciones
   */
  async findAll(
    tenantId: string,
    filters?: any,
  ): Promise<{ data: IvaWithholding[]; total: number }> {
    const query: any = { tenantId };

    // Filtros
    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.supplierId) {
      query.supplierId = filters.supplierId;
    }

    if (filters?.startDate && filters?.endDate) {
      query.withholdingDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters?.invoiceNumber) {
      query.invoiceNumber = { $regex: filters.invoiceNumber, $options: 'i' };
    }

    // Paginación
    const page = parseInt(filters?.page) || 1;
    const limit = parseInt(filters?.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.ivaWithholdingModel
        .find(query)
        .populate('supplierId', 'name taxId')
        .populate('journalEntryId')
        .sort({ withholdingDate: -1, certificateNumber: -1 })
        .skip(skip)
        .limit(limit),
      this.ivaWithholdingModel.countDocuments(query),
    ]);

    return { data, total };
  }

  /**
   * Obtener retención por ID
   */
  async findOne(id: string, tenantId: string): Promise<IvaWithholdingDocument> {
    const withholding = await this.ivaWithholdingModel
      .findOne({ _id: id, tenantId })
      .populate('supplierId')
      .populate('purchaseId')
      .populate('payableId')
      .populate('journalEntryId');

    if (!withholding) {
      throw new NotFoundException('Retención de IVA no encontrada');
    }

    return withholding;
  }

  /**
   * Actualizar retención (solo si está en draft)
   */
  async update(
    id: string,
    dto: UpdateIvaWithholdingDto,
    user: any,
  ): Promise<IvaWithholdingDocument> {
    const withholding = await this.findOne(id, user.tenantId);

    if (withholding.status !== 'draft') {
      throw new BadRequestException('Solo se pueden editar retenciones en estado borrador');
    }

    // Recalcular retención si cambió algún monto
    let withholdingAmount = withholding.withholdingAmount;

    if (dto.ivaAmount || dto.withholdingPercentage) {
      const ivaAmount = dto.ivaAmount || withholding.ivaAmount;
      const percentage = dto.withholdingPercentage || withholding.withholdingPercentage;
      withholdingAmount = (ivaAmount * percentage) / 100;
    }

    Object.assign(withholding, dto, { withholdingAmount });
    withholding.updatedBy = user._id;

    return await withholding.save();
  }

  /**
   * Contabilizar retención (cambiar a status='posted' y crear asiento)
   */
  async post(id: string, user: any): Promise<IvaWithholdingDocument> {
    const withholding = await this.findOne(id, user.tenantId);

    if (withholding.status !== 'draft') {
      throw new BadRequestException('Esta retención ya fue contabilizada o anulada');
    }

    // Crear asiento contable:
    // Debe: Cuentas por Pagar (monto retenido)
    // Haber: IVA Retenido por Pagar (monto retenido)
    const journalEntry = await this.accountingService.createJournalEntry(
      {
        date: withholding.withholdingDate.toISOString(),
        description: `Retención IVA #${withholding.certificateNumber} - ${withholding.supplierName}`,
        lines: [
          {
            accountId: '2101', // Cuentas por Pagar
            debit: withholding.withholdingAmount,
            credit: 0,
            description: `Retención IVA ${withholding.withholdingPercentage}% sobre factura ${withholding.invoiceNumber}`,
          },
          {
            accountId: '2104', // IVA Retenido por Pagar
            debit: 0,
            credit: withholding.withholdingAmount,
            description: `Retención IVA ${withholding.withholdingPercentage}% - ${withholding.operationType}`,
          },
        ],
        isAutomatic: true,
      },
      user.tenantId,
    );

    withholding.journalEntryId = journalEntry._id;
    withholding.status = 'posted';
    withholding.updatedBy = user._id;

    return await withholding.save();
  }

  /**
   * Anular retención
   */
  async annul(
    id: string,
    dto: AnnulWithholdingDto,
    user: any,
  ): Promise<IvaWithholdingDocument> {
    const withholding = await this.findOne(id, user.tenantId);

    if (withholding.status === 'annulled') {
      throw new BadRequestException('Esta retención ya está anulada');
    }

    // Si ya estaba posted, crear asiento de reversión
    if (withholding.status === 'posted' && withholding.journalEntryId) {
      await this.accountingService.createJournalEntry(
        {
          date: new Date().toISOString(),
          description: `ANULACIÓN - Retención IVA #${withholding.certificateNumber} - Razón: ${dto.annulmentReason}`,
          lines: [
            {
              accountId: '2104', // IVA Retenido por Pagar
              debit: withholding.withholdingAmount,
              credit: 0,
              description: 'Reversión de retención',
            },
            {
              accountId: '2101', // Cuentas por Pagar
              debit: 0,
              credit: withholding.withholdingAmount,
              description: 'Reversión de retención',
            },
          ],
          isAutomatic: true,
        },
        user.tenantId,
      );
    }

    withholding.status = 'annulled';
    withholding.annulmentReason = dto.annulmentReason;
    withholding.annulmentDate = new Date();
    withholding.updatedBy = user._id;

    return await withholding.save();
  }

  /**
   * Eliminar retención (solo draft)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const withholding = await this.findOne(id, tenantId);

    if (withholding.status !== 'draft') {
      throw new BadRequestException('Solo se pueden eliminar retenciones en estado borrador');
    }

    await this.ivaWithholdingModel.deleteOne({ _id: id });
  }

  /**
   * Obtener retenciones por período (para libro de retenciones)
   */
  async findByPeriod(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<IvaWithholdingDocument[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return await this.ivaWithholdingModel
      .find({
        tenantId,
        withholdingDate: { $gte: startDate, $lte: endDate },
        status: 'posted',
      })
      .populate('supplierId', 'name taxId')
      .sort({ withholdingDate: 1, certificateNumber: 1 });
  }

  /**
   * Exportar retenciones a formato ARC (SENIAT)
   */
  async exportToARC(month: number, year: number, tenantId: string): Promise<string> {
    const withholdings = await this.findByPeriod(month, year, tenantId);

    let arcContent = '';

    for (const w of withholdings) {
      // Formato ARC SENIAT (campos separados por tabuladores)
      const line = [
        format(w.withholdingDate, 'dd/MM/yyyy'), // Fecha
        w.supplierRif.replace(/-/g, ''), // RIF sin guiones
        w.supplierName.substring(0, 50), // Nombre (max 50 chars)
        w.invoiceNumber, // Número de factura
        w.invoiceControlNumber, // Número de control
        w.certificateNumber, // Número de comprobante
        w.baseAmount.toFixed(2), // Base imponible
        w.ivaAmount.toFixed(2), // IVA total
        w.withholdingAmount.toFixed(2), // IVA retenido
        this.getOperationCode(w.operationType), // Código de operación
      ].join('\t');

      arcContent += line + '\n';
    }

    // Marcar como exportadas
    await this.ivaWithholdingModel.updateMany(
      { _id: { $in: withholdings.map((w) => w._id) } },
      { $set: { exportedToARC: true, arcExportDate: new Date() } },
    );

    return arcContent;
  }

  /**
   * Obtener código de operación para formato ARC
   */
  private getOperationCode(operationType: string): string {
    const codes = {
      compra_bienes: '01',
      compra_servicios: '02',
      importacion: '03',
      arrendamiento: '04',
      honorarios_profesionales: '05',
    };

    return codes[operationType] || '99';
  }

  /**
   * Resumen de retenciones por período
   */
  async getSummary(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<{
    totalWithholdings: number;
    totalAmount: number;
    bySupplier: any[];
    byOperationType: any[];
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const withholdings = await this.ivaWithholdingModel.find({
      tenantId,
      withholdingDate: { $gte: startDate, $lte: endDate },
      status: 'posted',
    });

    const totalWithholdings = withholdings.length;
    const totalAmount = withholdings.reduce((sum, w) => sum + w.withholdingAmount, 0);

    // Agrupar por proveedor
    const bySupplier = Object.values(
      withholdings.reduce((acc, w) => {
        const key = w.supplierId.toString();
        if (!acc[key]) {
          acc[key] = {
            supplierId: w.supplierId,
            supplierName: w.supplierName,
            supplierRif: w.supplierRif,
            count: 0,
            totalAmount: 0,
          };
        }
        acc[key].count++;
        acc[key].totalAmount += w.withholdingAmount;
        return acc;
      }, {}),
    );

    // Agrupar por tipo de operación
    const byOperationType = Object.values(
      withholdings.reduce((acc, w) => {
        const key = w.operationType;
        if (!acc[key]) {
          acc[key] = { operationType: key, count: 0, totalAmount: 0 };
        }
        acc[key].count++;
        acc[key].totalAmount += w.withholdingAmount;
        return acc;
      }, {}),
    );

    return {
      totalWithholdings,
      totalAmount,
      bySupplier,
      byOperationType,
    };
  }
}
