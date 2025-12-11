import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaxSettings, TaxSettingsDocument } from '../../../schemas/tax-settings.schema';
import { CreateTaxSettingsDto, UpdateTaxSettingsDto } from '../../../dto/tax-settings.dto';

@Injectable()
export class TaxSettingsService {
  constructor(
    @InjectModel(TaxSettings.name)
    private taxSettingsModel: Model<TaxSettingsDocument>,
  ) {}

  /**
   * Crear configuración de impuesto
   */
  async create(dto: CreateTaxSettingsDto, user: any): Promise<TaxSettings> {
    // Validar que el código sea único por tenant
    const existing = await this.taxSettingsModel.findOne({
      tenantId: user.tenantId,
      code: dto.code,
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe una configuración de impuesto con el código ${dto.code}`,
      );
    }

    // Si se marca como default, desmarcar otros defaults del mismo tipo
    if (dto.isDefault) {
      await this.taxSettingsModel.updateMany(
        {
          tenantId: user.tenantId,
          taxType: dto.taxType,
          isDefault: true,
        },
        { $set: { isDefault: false } },
      );
    }

    // Validar que si es retención, tenga withholdingRate y withholdingAccountCode
    if (dto.isWithholding && (!dto.withholdingRate || !dto.withholdingAccountCode)) {
      throw new BadRequestException(
        'Las retenciones deben especificar withholdingRate y withholdingAccountCode',
      );
    }

    const taxSetting = await this.taxSettingsModel.create({
      ...dto,
      tenantId: user.tenantId,
      createdBy: user._id,
      status: 'active',
    });

    return taxSetting;
  }

  /**
   * Obtener todas las configuraciones de impuestos
   */
  async findAll(tenantId: string, filters?: any): Promise<TaxSettings[]> {
    const query: any = { tenantId };

    if (filters?.taxType) {
      query.taxType = filters.taxType;
    }

    if (filters?.status) {
      query.status = filters.status;
    } else {
      query.status = 'active'; // Por defecto solo activos
    }

    if (filters?.isWithholding !== undefined) {
      query.isWithholding = filters.isWithholding;
    }

    return await this.taxSettingsModel.find(query).sort({ taxType: 1, code: 1 });
  }

  /**
   * Obtener una configuración por ID
   */
  async findOne(id: string, tenantId: string): Promise<TaxSettings> {
    const taxSetting = await this.taxSettingsModel.findOne({ _id: id, tenantId });

    if (!taxSetting) {
      throw new NotFoundException('Configuración de impuesto no encontrada');
    }

    return taxSetting;
  }

  /**
   * Obtener configuración por código
   */
  async findByCode(code: string, tenantId: string): Promise<TaxSettings> {
    const taxSetting = await this.taxSettingsModel.findOne({
      tenantId,
      code,
      status: 'active',
    });

    if (!taxSetting) {
      throw new NotFoundException(`Configuración de impuesto ${code} no encontrada`);
    }

    return taxSetting;
  }

  /**
   * Obtener configuración por defecto de un tipo de impuesto
   */
  async findDefault(taxType: string, tenantId: string): Promise<TaxSettings> {
    const taxSetting = await this.taxSettingsModel.findOne({
      tenantId,
      taxType,
      isDefault: true,
      status: 'active',
    });

    if (!taxSetting) {
      throw new NotFoundException(
        `No se encontró una configuración por defecto para ${taxType}`,
      );
    }

    return taxSetting;
  }

  /**
   * Actualizar configuración de impuesto
   */
  async update(
    id: string,
    dto: UpdateTaxSettingsDto,
    user: any,
  ): Promise<TaxSettings> {
    const taxSettingDoc = await this.taxSettingsModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });

    if (!taxSettingDoc) {
      throw new NotFoundException('Configuración de impuesto no encontrada');
    }

    // Si se marca como default, desmarcar otros defaults del mismo tipo
    if (dto.isDefault && !taxSettingDoc.isDefault) {
      await this.taxSettingsModel.updateMany(
        {
          tenantId: user.tenantId,
          taxType: taxSettingDoc.taxType,
          isDefault: true,
        },
        { $set: { isDefault: false } },
      );
    }

    Object.assign(taxSettingDoc, dto);
    taxSettingDoc.updatedBy = user._id;

    return await taxSettingDoc.save();
  }

  /**
   * Eliminar configuración de impuesto (soft delete)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const taxSettingDoc = await this.taxSettingsModel.findOne({
      _id: id,
      tenantId,
    });

    if (!taxSettingDoc) {
      throw new NotFoundException('Configuración de impuesto no encontrada');
    }

    // No permitir eliminar si es default
    if (taxSettingDoc.isDefault) {
      throw new BadRequestException(
        'No se puede eliminar una configuración marcada como predeterminada',
      );
    }

    taxSettingDoc.status = 'archived';
    await taxSettingDoc.save();
  }

  /**
   * Calcular impuesto sobre un monto
   */
  calculateTax(amount: number, rate: number): number {
    return (amount * rate) / 100;
  }

  /**
   * Calcular retención sobre un impuesto
   */
  calculateWithholding(taxAmount: number, withholdingRate: number): number {
    return (taxAmount * withholdingRate) / 100;
  }

  /**
   * Obtener todas las tasas de IVA activas
   */
  async getIvaRates(tenantId: string): Promise<TaxSettings[]> {
    return await this.taxSettingsModel.find({
      tenantId,
      taxType: 'IVA',
      status: 'active',
    }).sort({ rate: -1 });
  }

  /**
   * Obtener todas las configuraciones de retención activas
   */
  async getWithholdingSettings(tenantId: string): Promise<TaxSettings[]> {
    return await this.taxSettingsModel.find({
      tenantId,
      isWithholding: true,
      status: 'active',
    }).sort({ taxType: 1, withholdingRate: -1 });
  }

  /**
   * Seed inicial de impuestos venezolanos típicos
   */
  async seedDefaultTaxes(tenantId: string, userId: string): Promise<void> {
    const existing = await this.taxSettingsModel.countDocuments({ tenantId });

    if (existing > 0) {
      return; // Ya existen configuraciones
    }

    const defaultTaxes = [
      // IVA
      {
        taxType: 'IVA',
        name: 'IVA General',
        code: 'IVA-16',
        rate: 16,
        description: 'IVA tasa general del 16%',
        accountCode: '2102',
        accountName: 'IVA por Pagar',
        applicableTo: 'all',
        isDefault: true,
      },
      {
        taxType: 'IVA',
        name: 'IVA Reducido',
        code: 'IVA-8',
        rate: 8,
        description: 'IVA tasa reducida del 8% (alimentos básicos)',
        accountCode: '2102',
        accountName: 'IVA por Pagar',
        applicableTo: 'products',
        isDefault: false,
      },
      {
        taxType: 'IVA',
        name: 'IVA Exento',
        code: 'IVA-0',
        rate: 0,
        description: 'Productos exentos de IVA',
        accountCode: '2102',
        accountName: 'IVA por Pagar',
        applicableTo: 'products',
        isDefault: false,
      },
      // Retención IVA 75%
      {
        taxType: 'IVA',
        name: 'Retención IVA 75%',
        code: 'RET-IVA-75',
        rate: 16,
        description: 'Retención del 75% del IVA (personas naturales)',
        accountCode: '2102',
        accountName: 'IVA por Pagar',
        applicableTo: 'all',
        isWithholding: true,
        withholdingRate: 75,
        withholdingAccountCode: '2104',
        isDefault: false,
      },
      // Retención IVA 100%
      {
        taxType: 'IVA',
        name: 'Retención IVA 100%',
        code: 'RET-IVA-100',
        rate: 16,
        description: 'Retención del 100% del IVA (contribuyentes especiales)',
        accountCode: '2102',
        accountName: 'IVA por Pagar',
        applicableTo: 'all',
        isWithholding: true,
        withholdingRate: 100,
        withholdingAccountCode: '2104',
        isDefault: false,
      },
      // IGTF
      {
        taxType: 'IGTF',
        name: 'IGTF Transacciones Extranjeras',
        code: 'IGTF-3',
        rate: 3,
        description: 'Impuesto a las Grandes Transacciones Financieras (3%)',
        accountCode: '2102',
        accountName: 'Impuestos por Pagar',
        applicableTo: 'all',
        isDefault: true,
      },
      // ISLR comunes
      {
        taxType: 'ISLR',
        name: 'ISLR Honorarios Profesionales',
        code: 'ISLR-HP-5',
        rate: 5,
        description: 'Retención ISLR del 5% sobre honorarios profesionales',
        accountCode: '2105',
        accountName: 'ISLR Retenido por Pagar',
        applicableTo: 'services',
        isWithholding: true,
        withholdingRate: 100,
        withholdingAccountCode: '2105',
        isDefault: false,
      },
      {
        taxType: 'ISLR',
        name: 'ISLR Arrendamiento',
        code: 'ISLR-ARR-3',
        rate: 3,
        description: 'Retención ISLR del 3% sobre arrendamientos',
        accountCode: '2105',
        accountName: 'ISLR Retenido por Pagar',
        applicableTo: 'services',
        isWithholding: true,
        withholdingRate: 100,
        withholdingAccountCode: '2105',
        isDefault: false,
      },
    ];

    for (const tax of defaultTaxes) {
      await this.taxSettingsModel.create({
        ...tax,
        tenantId,
        createdBy: userId,
        status: 'active',
        effectiveDate: new Date(),
      });
    }
  }
}
