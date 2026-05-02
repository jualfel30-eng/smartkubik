# FASE 1: VENEZUELA 100% COMPLETO
## Implementación Detallada Sprint por Sprint

**Duración**: 8 sprints (16 semanas)
**Fecha**: 14 de Noviembre de 2025
**Versión**: 1.0

---

## ÍNDICE

1. [Objetivos de la Fase](#objetivos-de-la-fase)
2. [Sprint 1-2: Fundación](#sprint-1-2-fundación)
3. [Sprint 3-4: Retenciones](#sprint-3-4-retenciones)
4. [Sprint 5-6: Reportes Fiscales](#sprint-5-6-reportes-fiscales)
5. [Sprint 7-8: Testing y Refinamiento](#sprint-7-8-testing-y-refinamiento)
6. [Criterios de Aceptación](#criterios-de-aceptación)

---

## OBJETIVOS DE LA FASE

### Funcionalidades Completas

✅ **IVA Mejorado**
- Múltiples tasas (16%, 8%, exento)
- Reglas por categoría de producto
- Exenciones configurables
- Validación contra certificados

✅ **IGTF Completo**
- Respeto de exenciones por producto
- Exenciones por cliente (diplomáticos, gobierno)
- Cálculo correcto con múltiples pagos
- Registro separado por transacción

✅ **Retenciones IVA**
- Cálculo automático (75% o 100%)
- Validación de agente de retención
- Generación de comprobantes
- Registro contable automático

✅ **Retenciones ISLR**
- Tarifas según Ley de ISLR
- Códigos de retención por tipo de servicio
- Cálculo por escalas (si aplica)
- Comprobantes firmados digitalmente

✅ **Reportes Fiscales**
- Libro de Ventas (formato SENIAT)
- Libro de Compras (formato SENIAT)
- Declaración IVA (Forma 30)
- Relación de retenciones IVA
- Relación de retenciones ISLR
- Exportación a TXT/XML oficial

✅ **Auditoría Total**
- Log de cada cambio fiscal
- Trazabilidad desde transacción hasta declaración
- Reconciliación automática

---

## SPRINT 1-2: FUNDACIÓN

**Duración**: 4 semanas
**Objetivo**: Crear infraestructura base del módulo fiscal

### Historia de Usuario 1.1: Módulo Tax Core

**Como** desarrollador del sistema
**Quiero** tener un módulo fiscal separado y bien estructurado
**Para** gestionar impuestos de forma centralizada

**Tareas**:

#### 1. Crear estructura de módulos

```bash
# Ejecutar comandos NestJS CLI:
nest g module modules/tax
nest g service modules/tax/tax
nest g controller modules/tax/tax
nest g service modules/tax/tax-configuration
nest g service modules/tax/tax-calculation
nest g service modules/tax/tax-audit
```

#### 2. Implementar TaxModule

**Archivo**: `src/modules/tax/tax.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { TaxConfigurationService } from './tax-configuration.service';
import { TaxCalculationService } from './tax-calculation.service';
import { TaxAuditService } from './tax-audit.service';
import {
  TaxConfiguration,
  TaxConfigurationSchema,
} from '../../schemas/tax-configuration.schema';
import {
  TaxTransaction,
  TaxTransactionSchema,
} from '../../schemas/tax-transaction.schema';
import {
  TaxAuditLog,
  TaxAuditLogSchema,
} from '../../schemas/tax-audit-log.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { AuthModule } from '../auth/auth.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaxConfiguration.name, schema: TaxConfigurationSchema },
      { name: TaxTransaction.name, schema: TaxTransactionSchema },
      { name: TaxAuditLog.name, schema: TaxAuditLogSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    AuthModule,
    AccountingModule,
  ],
  providers: [
    TaxService,
    TaxConfigurationService,
    TaxCalculationService,
    TaxAuditService,
  ],
  controllers: [TaxController],
  exports: [TaxService, TaxCalculationService],
})
export class TaxModule {}
```

#### 3. Implementar TaxConfigurationService

**Archivo**: `src/modules/tax/tax-configuration.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TaxConfiguration,
  TaxConfigurationDocument,
} from '../../schemas/tax-configuration.schema';
import { CreateTaxConfigurationDto } from '../../dto/tax/create-tax-configuration.dto';
import { UpdateTaxConfigurationDto } from '../../dto/tax/update-tax-configuration.dto';
import { TaxAuditService } from './tax-audit.service';

@Injectable()
export class TaxConfigurationService {
  private readonly logger = new Logger(TaxConfigurationService.name);

  constructor(
    @InjectModel(TaxConfiguration.name)
    private taxConfigModel: Model<TaxConfigurationDocument>,
    private taxAuditService: TaxAuditService,
  ) {}

  /**
   * Crea una nueva configuración de impuesto
   */
  async create(
    dto: CreateTaxConfigurationDto,
    userId: string,
    tenantId: string,
  ): Promise<TaxConfigurationDocument> {
    // Validar que no exista código duplicado
    const existing = await this.taxConfigModel.findOne({ code: dto.code }).exec();
    if (existing) {
      throw new ConflictException(`Tax configuration with code ${dto.code} already exists`);
    }

    const taxConfig = new this.taxConfigModel({
      ...dto,
      effectiveDate: new Date(dto.effectiveDate),
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      tenantId,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    const saved = await taxConfig.save();

    // Auditar creación
    await this.taxAuditService.log({
      action: 'tax_config_created',
      entityType: 'TaxConfiguration',
      entityId: saved._id.toString(),
      entityReference: saved.code,
      after: saved.toObject(),
      userId,
      tenantId,
      reason: `Created tax configuration: ${saved.name}`,
    });

    this.logger.log(`Tax configuration created: ${saved.code} for tenant ${tenantId}`);
    return saved;
  }

  /**
   * Obtiene la configuración vigente para un tipo de impuesto en una fecha específica
   */
  async getActiveConfiguration(
    tenantId: string,
    taxType: string,
    date: Date = new Date(),
    productCategory?: string,
  ): Promise<TaxConfigurationDocument | null> {
    const filter: any = {
      tenantId,
      taxType,
      isActive: true,
      effectiveDate: { $lte: date },
      $or: [
        { expirationDate: null },
        { expirationDate: { $gte: date } },
      ],
    };

    // Si hay categoría, filtrar por ella
    if (productCategory) {
      filter.$or = [
        { applicableCategories: { $exists: false } },
        { applicableCategories: { $size: 0 } },
        { applicableCategories: productCategory },
      ];
    }

    const config = await this.taxConfigModel
      .findOne(filter)
      .sort({ effectiveDate: -1 })  // Más reciente primero
      .exec();

    return config;
  }

  /**
   * Lista todas las configuraciones de un tenant
   */
  async findAll(
    tenantId: string,
    filters?: {
      country?: string;
      taxType?: string;
      isActive?: boolean;
    },
  ): Promise<TaxConfigurationDocument[]> {
    const query: any = { tenantId };

    if (filters?.country) query.country = filters.country;
    if (filters?.taxType) query.taxType = filters.taxType;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;

    return this.taxConfigModel
      .find(query)
      .sort({ taxType: 1, effectiveDate: -1 })
      .exec();
  }

  /**
   * Obtiene una configuración por ID
   */
  async findOne(id: string, tenantId: string): Promise<TaxConfigurationDocument> {
    const config = await this.taxConfigModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .exec();

    if (!config) {
      throw new NotFoundException(`Tax configuration with ID ${id} not found`);
    }

    return config;
  }

  /**
   * Actualiza una configuración
   */
  async update(
    id: string,
    dto: UpdateTaxConfigurationDto,
    userId: string,
    tenantId: string,
  ): Promise<TaxConfigurationDocument> {
    const existing = await this.findOne(id, tenantId);
    const before = existing.toObject();

    // Actualizar campos
    Object.assign(existing, dto);
    if (dto.effectiveDate) existing.effectiveDate = new Date(dto.effectiveDate);
    if (dto.expirationDate) existing.expirationDate = new Date(dto.expirationDate);
    existing.updatedBy = new Types.ObjectId(userId);

    const saved = await existing.save();

    // Auditar cambio
    await this.taxAuditService.log({
      action: 'tax_config_updated',
      entityType: 'TaxConfiguration',
      entityId: saved._id.toString(),
      entityReference: saved.code,
      before,
      after: saved.toObject(),
      userId,
      tenantId,
      reason: dto.reason || 'Tax configuration updated',
    });

    this.logger.log(`Tax configuration updated: ${saved.code}`);
    return saved;
  }

  /**
   * Desactiva una configuración (soft delete)
   */
  async deactivate(id: string, userId: string, tenantId: string, reason: string): Promise<void> {
    const config = await this.findOne(id, tenantId);
    const before = config.toObject();

    config.isActive = false;
    config.updatedBy = new Types.ObjectId(userId);
    await config.save();

    await this.taxAuditService.log({
      action: 'tax_config_deactivated',
      entityType: 'TaxConfiguration',
      entityId: config._id.toString(),
      entityReference: config.code,
      before,
      after: config.toObject(),
      userId,
      tenantId,
      reason,
    });

    this.logger.warn(`Tax configuration deactivated: ${config.code}`);
  }

  /**
   * Carga configuraciones iniciales para Venezuela
   */
  async seedVenezuelaDefaults(tenantId: string, userId: string): Promise<void> {
    this.logger.log(`Seeding default tax configurations for Venezuela (tenant: ${tenantId})`);

    const defaults: CreateTaxConfigurationDto[] = [
      {
        country: 'VE',
        taxType: 'IVA',
        code: 'VE-IVA-GENERAL',
        name: 'IVA General 16%',
        description: 'Impuesto al Valor Agregado tasa general',
        rate: 0.16,
        rateType: 'percentage',
        applicability: 'sales',
        effectiveDate: '2025-01-01',
        isActive: true,
        metadata: {
          legalReference: 'Ley de IVA Art. 27',
          declarationFrequency: 'monthly',
          accountingAccount: '2102',
        },
      },
      {
        country: 'VE',
        taxType: 'IVA',
        code: 'VE-IVA-REDUCIDO',
        name: 'IVA Reducido 8%',
        description: 'IVA para alimentos básicos y medicinas',
        rate: 0.08,
        rateType: 'percentage',
        applicability: 'sales',
        applicableCategories: ['alimentos_basicos', 'medicinas'],
        effectiveDate: '2025-01-01',
        isActive: true,
        metadata: {
          legalReference: 'Ley de IVA Art. 27',
          declarationFrequency: 'monthly',
          accountingAccount: '2102',
        },
      },
      {
        country: 'VE',
        taxType: 'IGTF',
        code: 'VE-IGTF-3',
        name: 'IGTF 3%',
        description: 'Impuesto a las Grandes Transacciones Financieras',
        rate: 0.03,
        rateType: 'percentage',
        applicability: 'financial',
        effectiveDate: '2025-01-01',
        isActive: true,
        metadata: {
          legalReference: 'Ley IGTF',
          declarationFrequency: 'monthly',
          accountingAccount: '599',
        },
      },
      {
        country: 'VE',
        taxType: 'Withholding_IVA',
        code: 'VE-RET-IVA-75',
        name: 'Retención IVA 75%',
        description: 'Retención del 75% del IVA',
        rate: 0.75,
        rateType: 'percentage',
        applicability: 'purchases',
        effectiveDate: '2025-01-01',
        isActive: true,
        metadata: {
          legalReference: 'Providencia 0049',
          declarationFrequency: 'monthly',
        },
      },
      {
        country: 'VE',
        taxType: 'Withholding_IVA',
        code: 'VE-RET-IVA-100',
        name: 'Retención IVA 100%',
        description: 'Retención del 100% del IVA para servicios profesionales',
        rate: 1.00,
        rateType: 'percentage',
        applicability: 'purchases',
        applicableCategories: ['servicios_profesionales'],
        effectiveDate: '2025-01-01',
        isActive: true,
        metadata: {
          legalReference: 'Providencia 0049',
          declarationFrequency: 'monthly',
        },
      },
    ];

    for (const config of defaults) {
      try {
        await this.create(config, userId, tenantId);
      } catch (error) {
        if (error instanceof ConflictException) {
          this.logger.warn(`Tax config ${config.code} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    this.logger.log('✅ Venezuela default tax configurations seeded');
  }
}
```

#### 4. Implementar TaxCalculationService

**Archivo**: `src/modules/tax/tax-calculation.service.ts`

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { TaxConfigurationService } from './tax-configuration.service';
import { CalculateTaxDto } from '../../dto/tax/calculate-tax.dto';
import { TaxCalculationResultDto, TaxBreakdownDto } from '../../dto/tax/tax-calculation-result.dto';
import Decimal from 'decimal.js';

// Configurar precisión de Decimal.js
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class TaxCalculationService {
  private readonly logger = new Logger(TaxCalculationService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private taxConfigService: TaxConfigurationService,
  ) {}

  /**
   * Calcula todos los impuestos aplicables a una transacción
   */
  async calculateAllTaxes(
    dto: CalculateTaxDto,
    tenantId: string,
  ): Promise<TaxCalculationResultDto> {
    this.logger.debug(`Calculating taxes for ${dto.taxType} (tenant: ${tenantId})`);

    const result: TaxCalculationResultDto = {
      totalTaxAmount: 0,
      totalBaseAmount: 0,
      totalAmount: 0,
      breakdown: [],
      warnings: [],
      exemptions: [],
    };

    // Si se calcula sobre monto total
    if (dto.amount !== undefined && dto.amount !== null) {
      const taxBreakdown = await this.calculateTaxForAmount(
        dto.taxType,
        dto.amount,
        tenantId,
        dto.customerId,
        dto.transactionDate,
      );

      result.breakdown.push(taxBreakdown);
      result.totalBaseAmount = dto.amount;
      result.totalTaxAmount = taxBreakdown.taxAmount;
    }

    // Si se calcula por líneas
    if (dto.lines && dto.lines.length > 0) {
      let totalBase = new Decimal(0);
      let totalTax = new Decimal(0);

      for (const line of dto.lines) {
        const product = await this.productModel.findById(line.productId).exec();
        if (!product) {
          result.warnings.push(`Product ${line.productId} not found, skipping`);
          continue;
        }

        // Verificar si el producto está exento
        if (this.isProductExempt(product, dto.taxType)) {
          result.exemptions.push(
            `Product ${product.name} is exempt from ${dto.taxType}`,
          );
          continue;
        }

        const taxBreakdown = await this.calculateTaxForAmount(
          dto.taxType,
          line.amount,
          tenantId,
          dto.customerId,
          dto.transactionDate,
          product.taxCategory,
        );

        totalBase = totalBase.plus(line.amount);
        totalTax = totalTax.plus(taxBreakdown.taxAmount);

        // Agregar al breakdown si no existe ya
        const existing = result.breakdown.find(b => b.taxCode === taxBreakdown.taxCode);
        if (existing) {
          existing.baseAmount += taxBreakdown.baseAmount;
          existing.taxAmount += taxBreakdown.taxAmount;
        } else {
          result.breakdown.push(taxBreakdown);
        }
      }

      result.totalBaseAmount = totalBase.toNumber();
      result.totalTaxAmount = totalTax.toNumber();
    }

    result.totalAmount = result.totalBaseAmount + result.totalTaxAmount;

    this.logger.debug(
      `Tax calculation complete: base=${result.totalBaseAmount}, tax=${result.totalTaxAmount}`,
    );

    return result;
  }

  /**
   * Calcula impuesto para un monto específico
   */
  private async calculateTaxForAmount(
    taxType: string,
    amount: number,
    tenantId: string,
    customerId?: string,
    transactionDate?: string,
    productCategory?: string,
  ): Promise<TaxBreakdownDto> {
    const date = transactionDate ? new Date(transactionDate) : new Date();

    // Verificar exención del cliente
    if (customerId) {
      const customer = await this.customerModel.findById(customerId).exec();
      if (customer && this.isCustomerExempt(customer, taxType)) {
        return {
          taxType,
          taxCode: `${taxType}-EXEMPT`,
          taxName: `${taxType} (Exempt)`,
          baseAmount: amount,
          taxRate: 0,
          taxAmount: 0,
          taxConfigurationId: null,
        };
      }
    }

    // Obtener configuración vigente
    const taxConfig = await this.taxConfigService.getActiveConfiguration(
      tenantId,
      taxType,
      date,
      productCategory,
    );

    if (!taxConfig) {
      throw new BadRequestException(
        `No active tax configuration found for ${taxType} on ${date.toISOString()}`,
      );
    }

    // Calcular impuesto con precisión
    const baseDecimal = new Decimal(amount);
    const rateDecimal = new Decimal(taxConfig.rate);
    const taxDecimal = baseDecimal.times(rateDecimal);
    const taxAmount = taxDecimal.toDecimalPlaces(2).toNumber();

    return {
      taxType: taxConfig.taxType,
      taxCode: taxConfig.code,
      taxName: taxConfig.name,
      baseAmount: amount,
      taxRate: taxConfig.rate,
      taxAmount,
      taxConfigurationId: taxConfig._id.toString(),
    };
  }

  /**
   * Verifica si un producto está exento de un impuesto
   */
  private isProductExempt(product: ProductDocument, taxType: string): boolean {
    // Verificar exención explícita
    if (product.taxExemptions && product.taxExemptions[taxType]) {
      return true;
    }

    // IGTF: verificar igtfExempt
    if (taxType === 'IGTF' && product.igtfExempt === true) {
      return true;
    }

    // IVA: verificar ivaApplicable
    if (taxType === 'IVA' && product.ivaApplicable === false) {
      return true;
    }

    return false;
  }

  /**
   * Verifica si un cliente está exento de un impuesto
   */
  private isCustomerExempt(customer: CustomerDocument, taxType: string): boolean {
    // Clientes gubernamentales o diplomáticos están exentos de ciertos impuestos
    if (taxType === 'IVA' || taxType === 'IGTF') {
      if (customer.taxInfo?.isGovernment || customer.taxInfo?.isDiplomatic) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calcula IVA (método legacy para backward compatibility)
   */
  async calculateIVA(
    amount: number,
    tenantId: string,
    productCategory?: string,
  ): Promise<number> {
    const result = await this.calculateAllTaxes(
      { taxType: 'IVA', amount },
      tenantId,
    );

    return result.totalTaxAmount;
  }

  /**
   * Calcula IGTF (método legacy para backward compatibility)
   */
  async calculateIGTF(amount: number, tenantId: string): Promise<number> {
    const result = await this.calculateAllTaxes(
      { taxType: 'IGTF', amount },
      tenantId,
    );

    return result.totalTaxAmount;
  }
}
```

**Criterio de aceptación**:
- [ ] Tests unitarios pasan al 100%
- [ ] TaxConfigurationService crea y recupera configuraciones
- [ ] TaxCalculationService calcula IVA correctamente (comparar con cálculo actual)
- [ ] Seed de Venezuela crea 5 configuraciones default
- [ ] Auditoría registra cada cambio en configuración

---

### Historia de Usuario 1.2: Integración con OrdersService

**Como** sistema de órdenes
**Quiero** usar TaxCalculationService para calcular impuestos
**Para** mantener backward compatibility y migrar gradualmente

**Tareas**:

#### 1. Agregar Feature Flag en Tenant

**Archivo modificar**: `src/schemas/tenant.schema.ts`

```typescript
// AGREGAR este campo:
@Prop({ type: Object, default: {} })
featureFlags?: {
  useNewTaxModule?: boolean;      // default: false
  enableWithholdings?: boolean;   // default: false
  enableFiscalReports?: boolean;  // default: false
};
```

#### 2. Modificar OrdersService para usar TaxCalculationService

**Archivo modificar**: `src/modules/orders/orders.service.ts`

```typescript
// En el constructor, inyectar TaxCalculationService:
constructor(
  // ... existentes
  @Inject(forwardRef(() => TaxCalculationService))
  private taxCalculationService: TaxCalculationService,
) {}

// Modificar método que calcula IVA (línea ~209):
async calculateItemTaxes(
  item: any,
  product: ProductDocument,
  tenant: TenantDocument,
): Promise<{ ivaAmount: number; igtfAmount: number }> {
  const totalPrice = item.quantity * item.price;

  // Si feature flag está activo, usar nuevo módulo
  if (tenant.featureFlags?.useNewTaxModule) {
    try {
      const result = await this.taxCalculationService.calculateAllTaxes(
        {
          taxType: 'IVA',
          amount: totalPrice,
          customerId: item.customerId,
          lines: [
            {
              productId: product._id.toString(),
              amount: totalPrice,
              taxCategory: product.taxCategory,
            },
          ],
        },
        tenant._id.toString(),
      );

      const ivaBreakdown = result.breakdown.find(b => b.taxType === 'IVA');
      return {
        ivaAmount: ivaBreakdown ? ivaBreakdown.taxAmount : 0,
        igtfAmount: 0, // IGTF se calcula sobre pagos, no sobre items
      };
    } catch (error) {
      this.logger.error('Error using new tax module, falling back to legacy', error);
      // Fallback a lógica actual
    }
  }

  // Lógica actual (LEGACY - backward compatible)
  const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
  return { ivaAmount, igtfAmount: 0 };
}
```

**Criterio de aceptación**:
- [ ] Con feature flag OFF, sistema funciona como antes (0 regresiones)
- [ ] Con feature flag ON, usa TaxCalculationService
- [ ] Resultados de ambos métodos son idénticos (validar con 100 órdenes reales)
- [ ] Performance no se degrada (máximo +50ms por orden)

---

## SPRINT 3-4: RETENCIONES

**Duración**: 4 semanas
**Objetivo**: Implementar sistema completo de retenciones IVA e ISLR

### Historia de Usuario 2.1: Módulo Withholdings

**Como** sistema de pagos
**Quiero** calcular y registrar retenciones automáticamente
**Para** cumplir con obligaciones fiscales

**Tareas**:

#### 1. Crear módulo Withholdings

```bash
nest g module modules/withholdings
nest g service modules/withholdings/withholdings
nest g controller modules/withholdings/withholdings
nest g service modules/withholdings/certificates
```

#### 2. Implementar WithholdingsService

**Archivo**: `src/modules/withholdings/withholdings.service.ts`

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Withholding, WithholdingDocument } from '../../schemas/withholding.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { TaxConfigurationService } from '../tax/tax-configuration.service';
import { TaxAuditService } from '../tax/tax-audit.service';
import { CreateWithholdingDto } from '../../dto/withholding/create-withholding.dto';
import Decimal from 'decimal.js';

@Injectable()
export class WithholdingsService {
  private readonly logger = new Logger(WithholdingsService.name);

  constructor(
    @InjectModel(Withholding.name)
    private withholdingModel: Model<WithholdingDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    private taxConfigService: TaxConfigurationService,
    private taxAuditService: TaxAuditService,
  ) {}

  /**
   * Calcula y crea retención automáticamente al pagar a proveedor
   */
  async calculateAndCreate(
    paymentId: string,
    payableAmount: number,
    supplierId: string,
    tenantId: string,
    userId: string,
  ): Promise<WithholdingDocument | null> {
    this.logger.debug(`Calculating withholding for payment ${paymentId}`);

    // Obtener información del proveedor
    const supplier = await this.customerModel.findById(supplierId).exec();
    if (!supplier) {
      throw new BadRequestException(`Supplier ${supplierId} not found`);
    }

    // Verificar si el tenant es agente de retención
    // (esto debería venir del tenant, simplificado aquí)
    const isRetentionAgent = true; // TODO: obtener de tenant.taxInfo.isRetentionAgent

    if (!isRetentionAgent) {
      this.logger.debug('Tenant is not a retention agent, skipping withholding');
      return null;
    }

    // Determinar tipo de retención y tasa
    const withholdingType = this.determineWithholdingType(supplier, payableAmount);
    if (!withholdingType) {
      this.logger.debug('No withholding required for this supplier/amount');
      return null;
    }

    // Obtener configuración de retención
    const taxConfig = await this.taxConfigService.getActiveConfiguration(
      tenantId,
      withholdingType,
    );

    if (!taxConfig) {
      this.logger.warn(`No active tax config for ${withholdingType}, skipping withholding`);
      return null;
    }

    // Calcular retención
    const baseDecimal = new Decimal(payableAmount);
    const rateDecimal = new Decimal(taxConfig.rate);
    const withholdingDecimal = baseDecimal.times(rateDecimal);
    const withholdingAmount = withholdingDecimal.toDecimalPlaces(2).toNumber();

    // Crear registro de retención
    const withholding = new this.withholdingModel({
      withholdingType: taxConfig.taxType,
      withholdingCode: taxConfig.code,
      withholdingName: taxConfig.name,
      sourcePaymentId: new Types.ObjectId(paymentId),
      direction: 'outgoing', // Retenemos nosotros
      baseAmount: payableAmount,
      withholdingRate: taxConfig.rate,
      withholdingAmount,
      withholdingDate: new Date(),
      agentId: new Types.ObjectId(tenantId), // Nosotros somos el agente
      agentTaxId: 'TENANT-RIF', // TODO: obtener de tenant
      beneficiaryId: new Types.ObjectId(supplierId),
      beneficiaryTaxId: supplier.taxInfo?.rif || supplier.taxInfo?.taxId,
      beneficiaryName: supplier.name,
      status: 'pending',
      tenantId,
      createdBy: new Types.ObjectId(userId),
    });

    const saved = await withholding.save();

    // Auditar
    await this.taxAuditService.log({
      action: 'withholding_calculated',
      entityType: 'Withholding',
      entityId: saved._id.toString(),
      after: saved.toObject(),
      userId,
      tenantId,
      reason: `Withholding calculated for payment ${paymentId}`,
    });

    this.logger.log(
      `Withholding created: ${saved._id} (${withholdingType} ${withholdingAmount})`,
    );

    return saved;
  }

  /**
   * Determina el tipo de retención según proveedor y monto
   */
  private determineWithholdingType(
    supplier: CustomerDocument,
    amount: number,
  ): string | null {
    // Lógica simplificada, en producción esto debe ser más complejo
    // basándose en el tipo de servicio, categoría del proveedor, etc.

    // Si es persona natural y presta servicios profesionales
    if (supplier.taxInfo?.taxType === 'V' && amount > 100) {
      return 'Withholding_IVA'; // 100% de IVA
    }

    // Si es jurídica
    if (supplier.taxInfo?.taxType === 'J' && amount > 1000) {
      return 'Withholding_IVA'; // 75% de IVA
    }

    return null;
  }

  /**
   * Genera comprobante de retención en PDF
   */
  async generateCertificate(
    withholdingId: string,
    tenantId: string,
    userId: string,
  ): Promise<string> {
    const withholding = await this.withholdingModel
      .findOne({ _id: new Types.ObjectId(withholdingId), tenantId })
      .exec();

    if (!withholding) {
      throw new BadRequestException(`Withholding ${withholdingId} not found`);
    }

    // TODO: Generar PDF con jsPDF o similar
    // Por ahora retornamos URL simulada
    const certificateNumber = `RET-${Date.now()}`;
    const certificateUrl = `/certificates/${certificateNumber}.pdf`;

    withholding.certificateNumber = certificateNumber;
    withholding.certificateIssueDate = new Date();
    withholding.certificateUrl = certificateUrl;
    withholding.status = 'certified';
    withholding.certifiedBy = new Types.ObjectId(userId);
    withholding.certifiedAt = new Date();

    await withholding.save();

    await this.taxAuditService.log({
      action: 'certificate_issued',
      entityType: 'Withholding',
      entityId: withholding._id.toString(),
      entityReference: certificateNumber,
      after: withholding.toObject(),
      userId,
      tenantId,
      reason: `Certificate ${certificateNumber} issued`,
    });

    this.logger.log(`Certificate issued: ${certificateNumber}`);
    return certificateUrl;
  }

  /**
   * Lista retenciones con filtros
   */
  async findAll(
    tenantId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      withholdingType?: string;
      status?: string;
      supplierId?: string;
    },
  ): Promise<WithholdingDocument[]> {
    const query: any = { tenantId };

    if (filters?.startDate || filters?.endDate) {
      query.withholdingDate = {};
      if (filters.startDate) {
        query.withholdingDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.withholdingDate.$lte = new Date(filters.endDate);
      }
    }

    if (filters?.withholdingType) {
      query.withholdingType = filters.withholdingType;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.supplierId) {
      query.beneficiaryId = new Types.ObjectId(filters.supplierId);
    }

    return this.withholdingModel.find(query).sort({ withholdingDate: -1 }).exec();
  }
}
```

#### 3. Integrar con PaymentsService

**Archivo modificar**: `src/modules/payments/payments.service.ts`

```typescript
// En el constructor:
constructor(
  // ... existentes
  @Inject(forwardRef(() => WithholdingsService))
  private withholdingsService: WithholdingsService,
) {}

// Modificar handlePayablePayment (línea ~150):
async handlePayablePayment(
  payment: PaymentDocument,
  payable: PayableDocument,
  tenantId: string,
  user: any,
): Promise<void> {
  // ... lógica existente

  // NUEVO: Calcular retención si aplica
  let withholding: WithholdingDocument | null = null;
  if (user.tenant?.featureFlags?.enableWithholdings && payable.supplierId) {
    withholding = await this.withholdingsService.calculateAndCreate(
      payment._id.toString(),
      payment.amount,
      payable.supplierId.toString(),
      tenantId,
      user._id,
    );

    if (withholding) {
      // Actualizar monto neto del pago
      payment.netAmount = payment.amount - withholding.withholdingAmount;
      payment.withholdingAmount = withholding.withholdingAmount;
      await payment.save();
    }
  }

  // ... resto de lógica (crear asiento contable, etc.)
}
```

**Criterio de aceptación**:
- [ ] Retención se calcula automáticamente al pagar a proveedor
- [ ] Se genera comprobante en PDF
- [ ] Se registra asiento contable de retención
- [ ] Proveedor recibe monto neto (monto - retención)
- [ ] Tests cubren casos: con retención, sin retención, diferentes tasas

---

## SPRINT 5-6: REPORTES FISCALES

**Duración**: 4 semanas
**Objetivo**: Generar todos los reportes fiscales requeridos por SENIAT

### Historia de Usuario 3.1: Libro de Ventas

**Como** contador
**Quiero** generar el Libro de Ventas mensual
**Para** preparar la declaración de IVA

**Tareas**:

#### 1. Crear FiscalReportsModule

```bash
nest g module modules/fiscal-reports
nest g service modules/fiscal-reports/sales-book
nest g service modules/fiscal-reports/purchase-book
nest g service modules/fiscal-reports/tax-declarations
nest g controller modules/fiscal-reports/fiscal-reports
```

#### 2. Implementar SalesBookService

**Archivo**: `src/modules/fiscal-reports/sales-book.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { TaxTransaction, TaxTransactionDocument } from '../../schemas/tax-transaction.schema';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface SalesBookEntry {
  date: Date;
  transactionType: string; // 01=Venta, 02=Nota débito, 03=Nota crédito
  invoiceNumber: string;
  controlNumber: string;
  documentNumber: string; // Factura afectada (para N/D o N/C)
  customerTaxType: string; // V, E, J, G, P
  customerTaxId: string;
  customerName: string;
  totalAmount: number;
  baseAmount: number; // Base imponible
  ivaRate: number;
  ivaAmount: number;
  taxExemptAmount: number;
  taxableBase: number;
  ivaRetainedAmount: number;
  adjustedAmount: number;
}

@Injectable()
export class SalesBookService {
  private readonly logger = new Logger(SalesBookService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(TaxTransaction.name)
    private taxTransactionModel: Model<TaxTransactionDocument>,
  ) {}

  /**
   * Genera el Libro de Ventas para un período
   */
  async generate(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<{
    entries: SalesBookEntry[];
    summary: {
      totalSales: number;
      totalTaxable: number;
      totalExempt: number;
      totalIVA: number;
    };
  }> {
    this.logger.log(`Generating Sales Book for ${year}-${month} (tenant: ${tenantId})`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Obtener todas las órdenes del período
    const orders = await this.orderModel
      .find({
        tenantId,
        orderDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
      })
      .populate('customerId')
      .sort({ orderDate: 1 })
      .exec();

    const entries: SalesBookEntry[] = [];
    let totalSales = 0;
    let totalTaxable = 0;
    let totalExempt = 0;
    let totalIVA = 0;

    for (const order of orders) {
      const customer = order.customerId as any;

      // Determinar base imponible y exenta
      const taxableBase = order.ivaTotal > 0 ? order.subtotal : 0;
      const taxExemptAmount = order.ivaTotal === 0 ? order.subtotal : 0;

      const entry: SalesBookEntry = {
        date: order.orderDate,
        transactionType: '01', // Venta normal
        invoiceNumber: order.taxInfo?.invoiceNumber || order.orderNumber,
        controlNumber: order.taxInfo?.controlNumber || '',
        documentNumber: '',
        customerTaxType: customer?.taxInfo?.taxType || 'V',
        customerTaxId: customer?.taxInfo?.taxId || customer?.taxInfo?.rif || '',
        customerName: customer?.name || 'Consumidor Final',
        totalAmount: order.totalAmount,
        baseAmount: order.subtotal,
        ivaRate: order.appliedIVARate || 0.16,
        ivaAmount: order.ivaTotal,
        taxExemptAmount,
        taxableBase,
        ivaRetainedAmount: 0, // TODO: obtener de retenciones
        adjustedAmount: 0,
      };

      entries.push(entry);

      totalSales += order.totalAmount;
      totalTaxable += taxableBase;
      totalExempt += taxExemptAmount;
      totalIVA += order.ivaTotal;
    }

    this.logger.log(
      `Sales Book generated: ${entries.length} entries, total sales: ${totalSales}`,
    );

    return {
      entries,
      summary: {
        totalSales,
        totalTaxable,
        totalExempt,
        totalIVA,
      },
    };
  }

  /**
   * Exporta Libro de Ventas a formato TXT de SENIAT
   */
  async exportToTXT(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<string> {
    const { entries, summary } = await this.generate(tenantId, year, month);

    const lines: string[] = [];

    // Cabecera (formato SENIAT)
    lines.push(`RIF|${tenantId}|PERIODO|${year}${month.toString().padStart(2, '0')}`);

    // Detalle
    for (const entry of entries) {
      const line = [
        entry.transactionType,
        entry.invoiceNumber,
        entry.controlNumber,
        entry.date.toISOString().split('T')[0],
        entry.customerTaxType,
        entry.customerTaxId.replace(/\D/g, ''),
        entry.customerName.substring(0, 100),
        entry.totalAmount.toFixed(2),
        entry.taxableBase.toFixed(2),
        entry.taxExemptAmount.toFixed(2),
        entry.ivaAmount.toFixed(2),
        (entry.ivaRate * 100).toFixed(0),
        entry.ivaRetainedAmount.toFixed(2),
      ].join('|');

      lines.push(line);
    }

    // Totales
    lines.push(
      [
        'TOTALES',
        summary.totalSales.toFixed(2),
        summary.totalTaxable.toFixed(2),
        summary.totalExempt.toFixed(2),
        summary.totalIVA.toFixed(2),
      ].join('|'),
    );

    const content = lines.join('\n');

    // Guardar archivo
    const filename = `libro_ventas_${year}_${month.toString().padStart(2, '0')}.txt`;
    const filepath = join(process.cwd(), 'reports', filename);
    await writeFile(filepath, content, 'utf-8');

    this.logger.log(`Sales Book exported to ${filepath}`);
    return filepath;
  }
}
```

**Criterio de aceptación**:
- [ ] Genera libro con todas las ventas del período
- [ ] Formato TXT cumple con especificación SENIAT
- [ ] Totales cuadran con órdenes reales
- [ ] Incluye datos fiscales del cliente
- [ ] Maneja casos especiales (notas de crédito, débito)

---

## SPRINT 7-8: TESTING Y REFINAMIENTO

**Duración**: 4 semanas
**Objetivo**: Testing exhaustivo, corrección de bugs, documentación

### Testing Plan

#### 1. Tests Unitarios (Coverage >80%)

**Archivo**: `src/modules/tax/tax-calculation.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TaxCalculationService } from './tax-calculation.service';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from '../../schemas/product.schema';
import { Customer } from '../../schemas/customer.schema';
import { TaxConfigurationService } from './tax-configuration.service';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;
  let mockProductModel: any;
  let mockCustomerModel: any;
  let mockTaxConfigService: any;

  beforeEach(async () => {
    mockProductModel = {
      findById: jest.fn(),
    };

    mockCustomerModel = {
      findById: jest.fn(),
    };

    mockTaxConfigService = {
      getActiveConfiguration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxCalculationService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
        {
          provide: TaxConfigurationService,
          useValue: mockTaxConfigService,
        },
      ],
    }).compile();

    service = module.get<TaxCalculationService>(TaxCalculationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateAllTaxes', () => {
    it('should calculate 16% IVA correctly', async () => {
      mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
        _id: '123',
        taxType: 'IVA',
        code: 'VE-IVA-GENERAL',
        name: 'IVA 16%',
        rate: 0.16,
      });

      const result = await service.calculateAllTaxes(
        {
          taxType: 'IVA',
          amount: 100,
        },
        'tenant123',
      );

      expect(result.totalBaseAmount).toBe(100);
      expect(result.totalTaxAmount).toBe(16);
      expect(result.totalAmount).toBe(116);
    });

    it('should handle exempt products', async () => {
      mockProductModel.findById.mockResolvedValue({
        _id: 'prod123',
        name: 'Medicine',
        ivaApplicable: false,
      });

      mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
        taxType: 'IVA',
        rate: 0.16,
      });

      const result = await service.calculateAllTaxes(
        {
          taxType: 'IVA',
          lines: [{ productId: 'prod123', amount: 100 }],
        },
        'tenant123',
      );

      expect(result.exemptions).toHaveLength(1);
      expect(result.totalTaxAmount).toBe(0);
    });

    it('should calculate correctly with decimal precision', async () => {
      mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
        taxType: 'IVA',
        rate: 0.16,
      });

      const result = await service.calculateAllTaxes(
        {
          taxType: 'IVA',
          amount: 33.33,
        },
        'tenant123',
      );

      // 33.33 * 0.16 = 5.3328 → 5.33
      expect(result.totalTaxAmount).toBe(5.33);
    });
  });
});
```

#### 2. Tests de Integración

**Archivo**: `test/tax.integration.spec.ts`

```typescript
describe('Tax Module Integration Tests', () => {
  it('should create order with new tax calculation', async () => {
    // Crear configuración de impuestos
    // Crear producto
    // Crear orden
    // Verificar que impuestos se calcularon correctamente
    // Verificar asiento contable
    // Verificar TaxTransaction creada
  });

  it('should calculate withholding on payment', async () => {
    // Crear proveedor
    // Crear payable
    // Crear pago
    // Verificar retención calculada
    // Verificar comprobante generado
    // Verificar monto neto correcto
  });
});
```

#### 3. Tests de Regresión

**Archivo**: `test/regression/tax-legacy-comparison.spec.ts`

```typescript
describe('Tax Legacy vs New Comparison', () => {
  it('should produce same results as legacy system', async () => {
    // Cargar 100 órdenes reales
    // Calcular con sistema legacy
    // Calcular con sistema nuevo
    // Comparar resultados (deben ser idénticos)
  });
});
```

**Criterio de aceptación**:
- [ ] Coverage >80% en módulo fiscal
- [ ] 0 regresiones en funcionalidad existente
- [ ] Performance: calcular impuestos de orden 100 líneas en <2s
- [ ] Documentación completa en Swagger
- [ ] Guía de usuario para contadores

---

## CRITERIOS DE ACEPTACIÓN GLOBALES

### Funcionales

- [ ] IVA se calcula con múltiples tasas (16%, 8%, exento)
- [ ] IGTF respeta exenciones por producto y cliente
- [ ] Retenciones IVA se calculan automáticamente
- [ ] Retenciones ISLR se calculan automáticamente
- [ ] Libro de Ventas genera archivo TXT válido
- [ ] Libro de Compras genera archivo TXT válido
- [ ] Declaración IVA genera Forma 30
- [ ] Comprobantes de retención en PDF
- [ ] Auditoría completa de todas las operaciones fiscales

### Técnicos

- [ ] Tests unitarios >80% coverage
- [ ] Tests de integración pasan 100%
- [ ] 0 regresiones en funcionalidad existente
- [ ] Performance: <2s para calcular impuestos
- [ ] Backward compatibility 100%
- [ ] Documentación Swagger completa
- [ ] Guías de usuario para contadores

### Negocio

- [ ] Validado por contador venezolano certificado
- [ ] Archivos aceptados por sistema SENIAT
- [ ] Reducción 50% tiempo de cierre mensual
- [ ] 0 multas fiscales atribuibles al sistema

---

**Siguiente**: [ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md](./ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md)
