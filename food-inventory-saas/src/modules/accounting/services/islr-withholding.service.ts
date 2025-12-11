import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IslrWithholding,
  IslrWithholdingDocument,
} from '../../../schemas/islr-withholding.schema';
import {
  CreateIslrWithholdingDto,
  UpdateIslrWithholdingDto,
  AnnulIslrWithholdingDto,
} from '../../../dto/islr-withholding.dto';
import { AccountingService } from '../accounting.service';
import { format } from 'date-fns';

@Injectable()
export class IslrWithholdingService {
  constructor(
    @InjectModel(IslrWithholding.name)
    private islrWithholdingModel: Model<IslrWithholdingDocument>,
    private accountingService: AccountingService,
  ) {}

  /**
   * Crear retención ISLR
   */
  async create(
    dto: CreateIslrWithholdingDto,
    user: any,
  ): Promise<IslrWithholding> {
    // Validar RIF
    if (!this.validateRIF(dto.beneficiaryRif)) {
      throw new BadRequestException('RIF del beneficiario inválido');
    }

    // Calcular monto de retención
    const withholdingAmount = this.calculateWithholding(
      dto.baseAmount,
      dto.withholdingPercentage,
    );

    // Validar que withholdingAmount > 0
    if (withholdingAmount <= 0) {
      throw new BadRequestException('El monto de retención debe ser mayor a 0');
    }

    // Validar que el tipo de beneficiario tenga el ID correspondiente
    if (dto.beneficiaryType === 'supplier' && !dto.supplierId) {
      throw new BadRequestException(
        'Debe especificar supplierId para beneficiario tipo supplier',
      );
    }

    if (dto.beneficiaryType === 'employee' && !dto.employeeId) {
      throw new BadRequestException(
        'Debe especificar employeeId para beneficiario tipo employee',
      );
    }

    // Generar número de certificado correlativo
    const certificateNumber = await this.generateCertificateNumber(
      user.tenantId,
    );

    // Crear retención
    const withholding = await this.islrWithholdingModel.create({
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
   * Generar número correlativo de certificado RET-ISLR-YYYY-XXXXXX
   */
  async generateCertificateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.islrWithholdingModel.countDocuments({
      tenantId,
      withholdingDate: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });

    const sequential = String(count + 1).padStart(6, '0');
    return `RET-ISLR-${year}-${sequential}`;
  }

  /**
   * Validar RIF venezolano (formato J-12345678-9, V-12345678-9, etc.)
   */
  validateRIF(rif: string): boolean {
    // Remover espacios y convertir a mayúsculas
    const cleanRIF = rif.replace(/\s/g, '').toUpperCase();

    // Formato: [V,E,J,P,G]-XXXXXXXX-X
    const rifRegex = /^[VEJPG]-\d{8,9}-\d$/;

    if (!rifRegex.test(cleanRIF)) {
      return false;
    }

    // Validar dígito verificador usando módulo 11
    const parts = cleanRIF.split('-');
    const type = parts[0];
    const number = parts[1];
    const checkDigit = parseInt(parts[2], 10);

    return this.calculateRIFCheckDigit(type, number) === checkDigit;
  }

  /**
   * Calcular dígito verificador de RIF usando módulo 11
   */
  private calculateRIFCheckDigit(type: string, number: string): number {
    const typeMap: Record<string, number> = {
      V: 1,
      E: 2,
      J: 3,
      P: 4,
      G: 5,
    };

    const typeValue = typeMap[type] || 0;
    const weights = [4, 3, 2, 7, 6, 5, 4, 3, 2];

    let sum = typeValue * 4; // El tipo se multiplica por 4

    // Multiplicar cada dígito del número por su peso correspondiente
    for (let i = 0; i < number.length && i < weights.length; i++) {
      sum += parseInt(number[i], 10) * weights[i];
    }

    const remainder = sum % 11;
    let checkDigit = 11 - remainder;

    if (checkDigit === 11) checkDigit = 0;
    if (checkDigit === 10) checkDigit = 0;

    return checkDigit;
  }

  /**
   * Calcular monto de retención
   */
  calculateWithholding(baseAmount: number, percentage: number): number {
    return Math.round((baseAmount * percentage) / 100 * 100) / 100;
  }

  /**
   * Obtener todas las retenciones ISLR
   */
  async findAll(
    tenantId: string,
    filters?: any,
  ): Promise<{ data: IslrWithholding[]; total: number }> {
    const query: any = { tenantId };

    // Filtros
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters?.beneficiaryType && filters.beneficiaryType !== 'all') {
      query.beneficiaryType = filters.beneficiaryType;
    }

    if (filters?.operationType && filters.operationType !== 'all') {
      query.operationType = filters.operationType;
    }

    if (filters?.beneficiaryRif) {
      query.beneficiaryRif = { $regex: filters.beneficiaryRif, $options: 'i' };
    }

    if (filters?.startDate && filters?.endDate) {
      query.withholdingDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters?.exportedToARC) {
      if (filters.exportedToARC === 'yes') {
        query.exportedToARC = true;
      } else if (filters.exportedToARC === 'no') {
        query.exportedToARC = { $ne: true };
      }
    }

    // Paginación
    const page = parseInt(filters?.page) || 1;
    const limit = parseInt(filters?.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.islrWithholdingModel
        .find(query)
        .populate('supplierId', 'name taxId')
        .populate('employeeId', 'firstName lastName')
        .populate('journalEntryId')
        .sort({ withholdingDate: -1, certificateNumber: -1 })
        .skip(skip)
        .limit(limit),
      this.islrWithholdingModel.countDocuments(query),
    ]);

    return { data, total };
  }

  /**
   * Obtener retención ISLR por ID
   */
  async findOne(
    id: string,
    tenantId: string,
  ): Promise<IslrWithholdingDocument> {
    const withholding = await this.islrWithholdingModel
      .findOne({ _id: id, tenantId })
      .populate('supplierId')
      .populate('employeeId')
      .populate('journalEntryId');

    if (!withholding) {
      throw new NotFoundException('Retención ISLR no encontrada');
    }

    return withholding;
  }

  /**
   * Actualizar retención ISLR (solo si está en draft)
   */
  async update(
    id: string,
    dto: UpdateIslrWithholdingDto,
    user: any,
  ): Promise<IslrWithholdingDocument> {
    const withholding = await this.findOne(id, user.tenantId);

    if (withholding.status !== 'draft') {
      throw new BadRequestException(
        'Solo se pueden editar retenciones en estado borrador',
      );
    }

    // Validar RIF si se está actualizando
    if (dto.beneficiaryRif && !this.validateRIF(dto.beneficiaryRif)) {
      throw new BadRequestException('RIF del beneficiario inválido');
    }

    // Recalcular retención si cambió algún monto
    let withholdingAmount = withholding.withholdingAmount;

    if (dto.baseAmount !== undefined || dto.withholdingPercentage !== undefined) {
      const baseAmount = dto.baseAmount ?? withholding.baseAmount;
      const percentage =
        dto.withholdingPercentage ?? withholding.withholdingPercentage;
      withholdingAmount = this.calculateWithholding(baseAmount, percentage);
    }

    Object.assign(withholding, dto, { withholdingAmount });
    withholding.updatedBy = user._id;

    return await withholding.save();
  }

  /**
   * Contabilizar retención ISLR (cambiar a status='posted' y crear asiento)
   * Asiento:
   * Debe: ISLR Retenido (Activo - por cobrar/recuperar)
   * Haber: Cuentas por Pagar (reducir deuda con beneficiario)
   */
  async post(id: string, user: any): Promise<IslrWithholdingDocument> {
    const withholding = await this.findOne(id, user.tenantId);

    if (withholding.status !== 'draft') {
      throw new BadRequestException(
        'Esta retención ya fue contabilizada o anulada',
      );
    }

    // Crear asiento contable
    const journalEntry = await this.accountingService.createJournalEntry(
      {
        date: withholding.withholdingDate.toISOString(),
        description: `Retención ISLR #${withholding.certificateNumber} - ${withholding.beneficiaryName}`,
        lines: [
          {
            accountId: '1106', // ISLR Retenido (Activo)
            debit: withholding.withholdingAmount,
            credit: 0,
            description: `Retención ISLR ${withholding.withholdingPercentage}% - ${withholding.operationType}`,
          },
          {
            accountId: '2101', // Cuentas por Pagar
            debit: 0,
            credit: withholding.withholdingAmount,
            description: `Retención ISLR a ${withholding.beneficiaryName} - Doc. ${withholding.documentNumber}`,
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
   * Anular retención ISLR
   */
  async annul(
    id: string,
    dto: AnnulIslrWithholdingDto,
    user: any,
  ): Promise<IslrWithholdingDocument> {
    const withholding = await this.findOne(id, user.tenantId);

    if (withholding.status === 'annulled') {
      throw new BadRequestException('Esta retención ya está anulada');
    }

    // Si ya estaba posted, crear asiento de reversión
    if (withholding.status === 'posted' && withholding.journalEntryId) {
      await this.accountingService.createJournalEntry(
        {
          date: new Date().toISOString(),
          description: `ANULACIÓN - Retención ISLR #${withholding.certificateNumber} - Razón: ${dto.annulmentReason}`,
          lines: [
            {
              accountId: '2101', // Cuentas por Pagar
              debit: withholding.withholdingAmount,
              credit: 0,
              description: 'Reversión de retención ISLR',
            },
            {
              accountId: '1106', // ISLR Retenido
              debit: 0,
              credit: withholding.withholdingAmount,
              description: 'Reversión de retención ISLR',
            },
          ],
          isAutomatic: true,
        },
        user.tenantId,
      );
    }

    withholding.status = 'annulled';
    withholding.annulmentReason = dto.annulmentReason;
    withholding.annulledAt = new Date();
    withholding.annulledBy = user._id;
    withholding.updatedBy = user._id;

    return await withholding.save();
  }

  /**
   * Eliminar retención ISLR (solo draft)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const withholding = await this.findOne(id, tenantId);

    if (withholding.status !== 'draft') {
      throw new BadRequestException(
        'Solo se pueden eliminar retenciones en estado borrador',
      );
    }

    await this.islrWithholdingModel.deleteOne({ _id: id });
  }

  /**
   * Obtener retenciones ISLR por período
   */
  async findByPeriod(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<IslrWithholdingDocument[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return await this.islrWithholdingModel
      .find({
        tenantId,
        withholdingDate: { $gte: startDate, $lte: endDate },
        status: 'posted',
      })
      .populate('supplierId', 'name taxId')
      .populate('employeeId', 'firstName lastName')
      .sort({ withholdingDate: 1, certificateNumber: 1 });
  }

  /**
   * Resumen de retenciones ISLR por período
   */
  async getSummary(
    month: number,
    year: number,
    tenantId: string,
  ): Promise<{
    month: number;
    year: number;
    totalWithholdings: number;
    totalAmount: number;
    totalBaseAmount: number;
    byBeneficiary: any[];
    byOperationType: any[];
    exportedCount: number;
    pendingExportCount: number;
  }> {
    const withholdings = await this.findByPeriod(month, year, tenantId);

    const totalWithholdings = withholdings.length;
    const totalAmount = withholdings.reduce(
      (sum, w) => sum + w.withholdingAmount,
      0,
    );
    const totalBaseAmount = withholdings.reduce(
      (sum, w) => sum + w.baseAmount,
      0,
    );

    const exportedCount = withholdings.filter((w) => w.exportedToARC).length;
    const pendingExportCount = totalWithholdings - exportedCount;

    // Agrupar por beneficiario
    const beneficiaryMap = new Map();
    withholdings.forEach((w) => {
      const key = w.beneficiaryRif;
      if (!beneficiaryMap.has(key)) {
        beneficiaryMap.set(key, {
          beneficiaryRif: w.beneficiaryRif,
          beneficiaryName: w.beneficiaryName,
          count: 0,
          totalAmount: 0,
        });
      }
      const entry = beneficiaryMap.get(key);
      entry.count++;
      entry.totalAmount += w.withholdingAmount;
    });

    const byBeneficiary = Array.from(beneficiaryMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );

    // Agrupar por tipo de operación
    const operationMap = new Map();
    withholdings.forEach((w) => {
      const key = w.operationType;
      if (!operationMap.has(key)) {
        operationMap.set(key, {
          operationType: key,
          count: 0,
          totalAmount: 0,
        });
      }
      const entry = operationMap.get(key);
      entry.count++;
      entry.totalAmount += w.withholdingAmount;
    });

    const byOperationType = Array.from(operationMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );

    return {
      month,
      year,
      totalWithholdings,
      totalAmount,
      totalBaseAmount,
      byBeneficiary,
      byOperationType,
      exportedCount,
      pendingExportCount,
    };
  }

  /**
   * Exportar retenciones ISLR a formato ARC (SENIAT)
   * Formato de archivo para declaración ISLR
   */
  async exportToARC(
    month: number,
    year: number,
    tenantId: string,
    onlyNotExported = true,
  ): Promise<string> {
    let withholdings = await this.findByPeriod(month, year, tenantId);

    // Filtrar solo no exportadas si se especifica
    if (onlyNotExported) {
      withholdings = withholdings.filter((w) => !w.exportedToARC);
    }

    if (withholdings.length === 0) {
      throw new BadRequestException(
        'No hay retenciones ISLR para exportar en el período seleccionado',
      );
    }

    let arcContent = '';

    // Encabezado
    arcContent += `RETENCIONES ISLR - PERÍODO ${month.toString().padStart(2, '0')}/${year}\n`;
    arcContent += `FECHA GENERACIÓN: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n`;
    arcContent += `TOTAL RETENCIONES: ${withholdings.length}\n`;
    arcContent += `MONTO TOTAL: ${withholdings.reduce((sum, w) => sum + w.withholdingAmount, 0).toFixed(2)}\n`;
    arcContent += '\n';

    // Cabecera de columnas
    arcContent += [
      'RIF_BENEFICIARIO',
      'NOMBRE_BENEFICIARIO',
      'CONCEPTO',
      'TIPO_OPERACION',
      'BASE_IMPONIBLE',
      'PORCENTAJE',
      'MONTO_RETENIDO',
      'FECHA_RETENCION',
      'NRO_CERTIFICADO',
      'NRO_DOCUMENTO',
    ].join('\t');
    arcContent += '\n';

    // Detalle
    for (const w of withholdings) {
      const line = [
        w.beneficiaryRif.replace(/-/g, ''), // RIF sin guiones
        w.beneficiaryName.substring(0, 100), // Nombre (max 100 chars)
        w.conceptCode, // Código de concepto
        this.getOperationTypeCode(w.operationType), // Código de tipo de operación
        w.baseAmount.toFixed(2), // Base imponible
        w.withholdingPercentage.toFixed(2), // Porcentaje
        w.withholdingAmount.toFixed(2), // Monto retenido
        format(w.withholdingDate, 'dd/MM/yyyy'), // Fecha
        w.certificateNumber, // Número de certificado
        w.documentNumber, // Número de documento fuente
      ].join('\t');

      arcContent += line + '\n';
    }

    // Marcar como exportadas
    const ids = withholdings.map((w) => w._id);
    await this.islrWithholdingModel.updateMany(
      { _id: { $in: ids } },
      { $set: { exportedToARC: true, exportDate: new Date() } },
    );

    return arcContent;
  }

  /**
   * Obtener código de tipo de operación para formato ARC SENIAT
   */
  private getOperationTypeCode(operationType: string): string {
    const codes: Record<string, string> = {
      salarios: '01',
      honorarios_profesionales: '02',
      comisiones: '03',
      intereses: '04',
      dividendos: '05',
      arrendamiento: '06',
      regalias: '07',
      servicio_transporte: '08',
      otros_servicios: '99',
    };

    return codes[operationType] || '99';
  }
}
