# SCHEMAS Y DTOs - MÓDULO FISCAL
## Especificación Técnica Completa

**Fecha**: 14 de Noviembre de 2025
**Versión**: 1.0

---

## ÍNDICE

1. [Principios de Diseño](#principios-de-diseño)
2. [Schemas Mongoose](#schemas-mongoose)
3. [DTOs de Entrada](#dtos-de-entrada)
4. [DTOs de Salida](#dtos-de-salida)
5. [Validaciones Custom](#validaciones-custom)
6. [Índices de Base de Datos](#índices-de-base-de-datos)
7. [Migración de Schemas Existentes](#migración-de-schemas-existentes)

---

## PRINCIPIOS DE DISEÑO

### Reglas de Oro (Aprendidas de Errores Históricos)

#### 1. ObjectId vs String - PATRÓN DEFINITIVO

```typescript
// ✅ CORRECTO - Patrón consistente en TODO el sistema

// En DTO (entrada desde frontend):
export class CreateTaxDto {
  @IsMongoId()
  @IsString()
  productId: string;  // ⭐ Siempre STRING en DTOs
}

// En Schema (almacenamiento en MongoDB):
@Schema()
export class TaxTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;  // ⭐ Siempre ObjectId en Schemas
}

// En Service (conversión):
async create(dto: CreateTaxDto) {
  const productObjectId = new Types.ObjectId(dto.productId);  // ⭐ Convertir al recibir

  const taxTransaction = new this.taxTransactionModel({
    productId: productObjectId,  // Guardar como ObjectId
    // ...
  });

  const saved = await taxTransaction.save();
  return saved.toObject();  // ⭐ .toObject() convierte ObjectIds a strings automáticamente
}
```

#### 2. Validación de Arrays Anidados

```typescript
// ❌ MAL - No valida elementos internos
@IsArray()
taxLines: TaxLineDto[];

// ✅ CORRECTO - Valida cada elemento
@IsArray()
@ValidateNested({ each: true })
@Type(() => TaxLineDto)
taxLines: TaxLineDto[];
```

#### 3. TenantId SIEMPRE

```typescript
// ⭐ EN TODOS LOS SCHEMAS sin excepción
@Prop({ type: String, required: true, index: true })
tenantId: string;

// ⭐ TODOS LOS ÍNDICES deben incluir tenantId
SchemaName.index({ tenantId: 1, otherField: 1 });
```

#### 4. Timestamps Automáticos

```typescript
// ⭐ EN TODOS LOS SCHEMAS
@Schema({ timestamps: true })  // Agrega createdAt y updatedAt automáticamente
export class TaxTransaction { }
```

#### 5. Sanitización de Strings

```typescript
// ⭐ Para TODOS los strings de usuario
@IsString()
@SanitizeString()  // Custom decorator que evita XSS
description: string;
```

---

## SCHEMAS MONGOOSE

### 1. TaxConfiguration Schema

**Archivo**: `src/schemas/tax-configuration.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

// Sub-schema para reglas de aplicación
@Schema({ _id: false })
export class TaxRules {
  @Prop({ type: Number })
  minimumAmount?: number;  // Monto mínimo para aplicar impuesto

  @Prop({ type: Number })
  maximumAmount?: number;  // Monto máximo (techo)

  @Prop({ type: [String] })
  exemptCustomerTypes?: string[];  // Tipos de cliente exentos: ["gobierno", "diplomático"]

  @Prop({ type: [String] })
  exemptProductCategories?: string[];  // Categorías exentas: ["alimentos_basicos", "medicinas"]

  @Prop({ type: [String] })
  requiredDocuments?: string[];  // Documentos requeridos: ["factura_fiscal", "orden_compra"]

  @Prop({ type: Boolean, default: false })
  requiresApproval?: boolean;  // Requiere aprobación manual

  @Prop({ type: Boolean, default: false })
  isCompound?: boolean;  // Se calcula sobre base + otros impuestos

  @Prop({ type: [String] })
  appliesAfter?: string[];  // IDs de impuestos que deben aplicarse antes
}

const TaxRulesSchema = SchemaFactory.createForClass(TaxRules);

// Sub-schema para metadata
@Schema({ _id: false })
export class TaxMetadata {
  @Prop({ type: String })
  legalReference?: string;  // Ley o decreto que establece el impuesto

  @Prop({ type: [String] })
  reportingRequirements?: string[];  // ["libro_ventas", "declaracion_mensual"]

  @Prop({ type: String, enum: ['monthly', 'bimonthly', 'quarterly', 'annual', 'none'] })
  declarationFrequency?: string;

  @Prop({ type: Number })
  withholdingThreshold?: number;  // Umbral para retención

  @Prop({ type: String })
  accountingAccount?: string;  // Código de cuenta contable sugerido

  @Prop({ type: Object })
  customFields?: Record<string, any>;  // Campos adicionales por país
}

const TaxMetadataSchema = SchemaFactory.createForClass(TaxMetadata);

// Schema principal
@Schema({ timestamps: true })
export class TaxConfiguration {
  @Prop({ type: String, required: true, index: true })
  country: string;  // Código ISO: "VE", "MX", "CO", "US"

  @Prop({ type: String, required: true, index: true })
  taxType: string;  // "IVA", "ISLR", "IGTF", "ISR", "Sales_Tax", "Withholding_IVA"

  @Prop({ type: String, required: true, unique: true })
  code: string;  // Código único: "VE-IVA-GENERAL", "VE-IVA-REDUCIDO", "MX-IVA-GENERAL"

  @Prop({ type: String, required: true, trim: true })
  name: string;  // Nombre descriptivo: "IVA General 16%"

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, required: true })
  rate: number;  // 0.16, 0.03, 0.75 (porcentajes como decimales)

  @Prop({ type: String, required: true, enum: ['percentage', 'fixed_amount'] })
  rateType: string;

  @Prop({
    type: String,
    required: true,
    enum: ['sales', 'purchases', 'payroll', 'financial', 'both', 'all']
  })
  applicability: string;

  @Prop({ type: [String] })
  applicableCategories?: string[];  // Categorías de productos aplicables

  @Prop({ type: TaxRulesSchema })
  rules?: TaxRules;

  @Prop({ type: Date, required: true, index: true })
  effectiveDate: Date;  // Fecha desde la cual es vigente

  @Prop({ type: Date, index: true })
  expirationDate?: Date;  // null = indefinido

  @Prop({ type: Boolean, required: true, default: true, index: true })
  isActive: boolean;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: TaxMetadataSchema })
  metadata?: TaxMetadata;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type TaxConfigurationDocument = TaxConfiguration & Document;
export const TaxConfigurationSchema = SchemaFactory.createForClass(TaxConfiguration);

// Índices compuestos
TaxConfigurationSchema.index({ tenantId: 1, country: 1, taxType: 1 });
TaxConfigurationSchema.index({ tenantId: 1, isActive: 1, effectiveDate: -1 });
TaxConfigurationSchema.index({ code: 1 }, { unique: true });
TaxConfigurationSchema.index({
  tenantId: 1,
  taxType: 1,
  effectiveDate: -1,
  expirationDate: 1
});  // Para obtener configuración vigente
```

### 2. TaxTransaction Schema

**Archivo**: `src/schemas/tax-transaction.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class TaxTransaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'TaxConfiguration', required: true, index: true })
  taxConfigurationId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  taxType: string;  // "IVA", "ISLR", "IGTF", etc. (desnormalizado para queries rápidas)

  @Prop({ type: String, required: true })
  taxCode: string;  // Código de la configuración (desnormalizado)

  @Prop({
    type: String,
    required: true,
    enum: ['sale', 'purchase', 'payroll', 'financial', 'adjustment', 'other']
  })
  transactionType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  sourceDocumentId?: Types.ObjectId;  // ID de Order, Purchase, Payment, etc.

  @Prop({ type: String, index: true })
  sourceDocumentType?: string;  // "Order", "PurchaseOrder", "Payment", "Payable"

  @Prop({ type: String, index: true })
  sourceDocumentNumber?: string;  // ORD-123, PO-456 (desnormalizado)

  @Prop({ type: Number, required: true })
  baseAmount: number;  // Monto base imponible (sin impuesto)

  @Prop({ type: Number, required: true })
  taxRate: number;  // Tasa aplicada (guardada por si cambia en el futuro)

  @Prop({ type: Number, required: true })
  taxAmount: number;  // Impuesto calculado

  @Prop({ type: Date, required: true, index: true })
  taxDate: Date;  // Fecha fiscal de la transacción

  @Prop({ type: String, required: true, index: true })
  taxPeriod: string;  // "2025-01", "2025-Q1", "2025" (para agrupación)

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'declared', 'paid', 'cancelled', 'adjusted'],
    default: 'pending',
    index: true
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', index: true })
  customerId?: Types.ObjectId;

  @Prop({ type: String })
  customerTaxId?: string;  // RIF o identificación fiscal

  @Prop({ type: String })
  customerName?: string;  // Desnormalizado para reportes

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', index: true })
  supplierId?: Types.ObjectId;

  @Prop({ type: String })
  supplierTaxId?: string;

  @Prop({ type: String })
  supplierName?: string;

  @Prop({ type: String })
  invoiceNumber?: string;

  @Prop({ type: String })
  controlNumber?: string;  // Venezuela: número de control de factura

  @Prop({ type: String })
  exemptionReason?: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId?: Types.ObjectId;  // Asiento contable relacionado

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type TaxTransactionDocument = TaxTransaction & Document;
export const TaxTransactionSchema = SchemaFactory.createForClass(TaxTransaction);

// Índices compuestos críticos para reportes
TaxTransactionSchema.index({ tenantId: 1, taxPeriod: 1, taxType: 1 });
TaxTransactionSchema.index({ tenantId: 1, status: 1, taxDate: -1 });
TaxTransactionSchema.index({ tenantId: 1, transactionType: 1, taxDate: -1 });
TaxTransactionSchema.index({ sourceDocumentId: 1, tenantId: 1 });
TaxTransactionSchema.index({ customerId: 1, tenantId: 1, taxDate: -1 });
TaxTransactionSchema.index({ supplierId: 1, tenantId: 1, taxDate: -1 });

// Índice de texto para búsqueda
TaxTransactionSchema.index({
  sourceDocumentNumber: 'text',
  invoiceNumber: 'text',
  customerName: 'text',
  supplierName: 'text'
});
```

### 3. Withholding Schema

**Archivo**: `src/schemas/withholding.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Withholding {
  @Prop({ type: String, required: true, index: true })
  withholdingType: string;  // "IVA", "ISLR", "ISR"

  @Prop({ type: String, required: true })
  withholdingCode: string;  // Código de retención según ley

  @Prop({ type: String })
  withholdingName?: string;  // Nombre descriptivo

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  sourcePaymentId: Types.ObjectId;  // Pago que genera la retención

  @Prop({ type: String })
  sourcePaymentNumber?: string;  // Desnormalizado

  @Prop({ type: String, required: true, enum: ['outgoing', 'incoming'] })
  direction: string;  // outgoing: retenemos a proveedor, incoming: nos retienen

  @Prop({ type: Number, required: true })
  baseAmount: number;  // Base sobre la que se calcula

  @Prop({ type: Number, required: true })
  withholdingRate: number;  // Porcentaje de retención (0.75 = 75%)

  @Prop({ type: Number, required: true })
  withholdingAmount: number;  // Monto retenido

  @Prop({ type: Date, required: true, index: true })
  withholdingDate: Date;

  @Prop({ type: String })
  certificateNumber?: string;  // Número de comprobante de retención

  @Prop({ type: Date })
  certificateIssueDate?: Date;

  @Prop({ type: String })
  certificateUrl?: string;  // URL del PDF del comprobante

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', required: true, index: true })
  agentId: Types.ObjectId;  // Quién retiene (puede ser tenant o cliente)

  @Prop({ type: String, required: true })
  agentTaxId: string;

  @Prop({ type: String })
  agentName?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', required: true, index: true })
  beneficiaryId: Types.ObjectId;  // A quién retienen

  @Prop({ type: String, required: true })
  beneficiaryTaxId: string;

  @Prop({ type: String })
  beneficiaryName?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'certified', 'declared', 'offset', 'cancelled'],
    default: 'pending',
    index: true
  })
  status: string;

  @Prop({ type: String })
  taxPeriod?: string;  // Período fiscal al que pertenece

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId?: Types.ObjectId;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  certifiedBy?: Types.ObjectId;  // Quién emitió el certificado

  @Prop({ type: Date })
  certifiedAt?: Date;
}

export type WithholdingDocument = Withholding & Document;
export const WithholdingSchema = SchemaFactory.createForClass(Withholding);

// Índices
WithholdingSchema.index({ tenantId: 1, withholdingDate: -1 });
WithholdingSchema.index({ tenantId: 1, status: 1, withholdingDate: -1 });
WithholdingSchema.index({ tenantId: 1, withholdingType: 1, taxPeriod: 1 });
WithholdingSchema.index({ sourcePaymentId: 1, tenantId: 1 });
WithholdingSchema.index({ agentId: 1, tenantId: 1 });
WithholdingSchema.index({ beneficiaryId: 1, tenantId: 1 });
WithholdingSchema.index({ certificateNumber: 1, tenantId: 1 }, { sparse: true });
```

### 4. TaxAuditLog Schema

**Archivo**: `src/schemas/tax-audit-log.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class TaxAuditLog {
  @Prop({ type: String, required: true, index: true })
  action: string;  // "tax_rate_changed", "tax_applied", "declaration_generated", "certificate_issued"

  @Prop({ type: String, required: true, index: true })
  entityType: string;  // "TaxConfiguration", "TaxTransaction", "Withholding", "FiscalReport"

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  entityId?: Types.ObjectId;

  @Prop({ type: String })
  entityReference?: string;  // Número o código de referencia

  @Prop({ type: Object })
  before?: Record<string, any>;  // Estado anterior (JSON snapshot)

  @Prop({ type: Object })
  after?: Record<string, any>;  // Estado nuevo (JSON snapshot)

  @Prop({ type: Object })
  changes?: Record<string, { from: any; to: any }>;  // Detalle de cambios específicos

  @Prop({ type: Date, required: true, index: true })
  timestamp: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String })
  userName?: string;  // Desnormalizado

  @Prop({ type: String })
  userEmail?: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  reason?: string;  // Por qué se hizo el cambio

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String, enum: ['info', 'warning', 'error', 'critical'] })
  severity?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;
}

export type TaxAuditLogDocument = TaxAuditLog & Document;
export const TaxAuditLogSchema = SchemaFactory.createForClass(TaxAuditLog);

// Índices para auditoría
TaxAuditLogSchema.index({ tenantId: 1, timestamp: -1 });
TaxAuditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1, timestamp: -1 });
TaxAuditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });
TaxAuditLogSchema.index({ userId: 1, tenantId: 1, timestamp: -1 });

// TTL index (opcional): borrar logs después de 7 años
// TaxAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 220752000 });
```

---

## DTOS DE ENTRADA

### 1. CreateTaxConfigurationDto

**Archivo**: `src/dto/tax/create-tax-configuration.dto.ts`

```typescript
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  IsObject,
  Min,
  Max,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeString } from '../../decorators/sanitize-string.decorator';

// Sub-DTO para reglas
export class TaxRulesDto {
  @ApiPropertyOptional({ description: 'Monto mínimo para aplicar impuesto' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @ApiPropertyOptional({ description: 'Monto máximo (techo)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumAmount?: number;

  @ApiPropertyOptional({ description: 'Tipos de cliente exentos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptCustomerTypes?: string[];

  @ApiPropertyOptional({ description: 'Categorías de producto exentas' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptProductCategories?: string[];

  @ApiPropertyOptional({ description: 'Documentos requeridos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'Requiere aprobación manual' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Se calcula sobre base + otros impuestos' })
  @IsOptional()
  @IsBoolean()
  isCompound?: boolean;

  @ApiPropertyOptional({ description: 'IDs de impuestos que deben aplicarse antes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesAfter?: string[];
}

// Sub-DTO para metadata
export class TaxMetadataDto {
  @ApiPropertyOptional({ description: 'Referencia legal' })
  @IsOptional()
  @IsString()
  @SanitizeString()
  legalReference?: string;

  @ApiPropertyOptional({ description: 'Requerimientos de reporte' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportingRequirements?: string[];

  @ApiPropertyOptional({
    description: 'Frecuencia de declaración',
    enum: ['monthly', 'bimonthly', 'quarterly', 'annual', 'none']
  })
  @IsOptional()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'annual', 'none'])
  declarationFrequency?: string;

  @ApiPropertyOptional({ description: 'Umbral para retención' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  withholdingThreshold?: number;

  @ApiPropertyOptional({ description: 'Código de cuenta contable' })
  @IsOptional()
  @IsString()
  accountingAccount?: string;

  @ApiPropertyOptional({ description: 'Campos custom' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

// DTO principal
export class CreateTaxConfigurationDto {
  @ApiProperty({ description: 'Código de país ISO', example: 'VE' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  country: string;

  @ApiProperty({ description: 'Tipo de impuesto', example: 'IVA' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  taxType: string;

  @ApiProperty({ description: 'Código único', example: 'VE-IVA-GENERAL' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  code: string;

  @ApiProperty({ description: 'Nombre descriptivo', example: 'IVA General 16%' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  @SanitizeString()
  description?: string;

  @ApiProperty({ description: 'Tasa del impuesto', example: 0.16 })
  @IsNumber()
  @Min(0)
  @Max(1)
  rate: number;

  @ApiProperty({ description: 'Tipo de tasa', enum: ['percentage', 'fixed_amount'] })
  @IsEnum(['percentage', 'fixed_amount'])
  rateType: string;

  @ApiProperty({
    description: 'Aplicabilidad',
    enum: ['sales', 'purchases', 'payroll', 'financial', 'both', 'all']
  })
  @IsEnum(['sales', 'purchases', 'payroll', 'financial', 'both', 'all'])
  applicability: string;

  @ApiPropertyOptional({ description: 'Categorías aplicables' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @ApiPropertyOptional({ description: 'Reglas de aplicación' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxRulesDto)
  rules?: TaxRulesDto;

  @ApiProperty({ description: 'Fecha efectiva', example: '2025-01-01' })
  @IsDateString()
  effectiveDate: string;

  @ApiPropertyOptional({ description: 'Fecha de expiración' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Está activo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Metadata adicional' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxMetadataDto)
  metadata?: TaxMetadataDto;
}
```

### 2. CalculateTaxDto

**Archivo**: `src/dto/tax/calculate-tax.dto.ts`

```typescript
import {
  IsString,
  IsNumber,
  IsMongoId,
  IsOptional,
  IsArray,
  ValidateNested,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaxCalculationLineDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Monto base' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Categoría fiscal del producto' })
  @IsOptional()
  @IsString()
  taxCategory?: string;

  @ApiPropertyOptional({ description: 'Cantidad' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}

export class CalculateTaxDto {
  @ApiProperty({ description: 'Tipo de impuesto a calcular', example: 'IVA' })
  @IsString()
  taxType: string;

  @ApiPropertyOptional({ description: 'Monto total (si se calcula sobre total)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Líneas individuales (si se calcula por línea)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxCalculationLineDto)
  lines?: TaxCalculationLineDto[];

  @ApiPropertyOptional({ description: 'ID del cliente' })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Fecha de la transacción' })
  @IsOptional()
  @IsString()
  transactionDate?: string;

  @ApiPropertyOptional({ description: 'Tipo de transacción' })
  @IsOptional()
  @IsString()
  transactionType?: string;
}
```

### 3. CreateWithholdingDto

**Archivo**: `src/dto/withholding/create-withholding.dto.ts`

```typescript
import {
  IsString,
  IsNumber,
  IsMongoId,
  IsEnum,
  IsOptional,
  IsDateString,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeString } from '../../decorators/sanitize-string.decorator';

export class CreateWithholdingDto {
  @ApiProperty({ description: 'Tipo de retención', example: 'IVA' })
  @IsString()
  @SanitizeString()
  withholdingType: string;

  @ApiProperty({ description: 'Código de retención' })
  @IsString()
  @SanitizeString()
  withholdingCode: string;

  @ApiPropertyOptional({ description: 'Nombre de la retención' })
  @IsOptional()
  @IsString()
  @SanitizeString()
  withholdingName?: string;

  @ApiProperty({ description: 'ID del pago' })
  @IsMongoId()
  sourcePaymentId: string;

  @ApiProperty({ description: 'Dirección', enum: ['outgoing', 'incoming'] })
  @IsEnum(['outgoing', 'incoming'])
  direction: string;

  @ApiProperty({ description: 'Monto base' })
  @IsNumber()
  @Min(0)
  baseAmount: number;

  @ApiProperty({ description: 'Tasa de retención', example: 0.75 })
  @IsNumber()
  @Min(0)
  @Max(1)
  withholdingRate: number;

  @ApiProperty({ description: 'Monto retenido' })
  @IsNumber()
  @Min(0)
  withholdingAmount: number;

  @ApiProperty({ description: 'Fecha de retención' })
  @IsDateString()
  withholdingDate: string;

  @ApiProperty({ description: 'ID del agente (quien retiene)' })
  @IsMongoId()
  agentId: string;

  @ApiProperty({ description: 'RIF del agente' })
  @IsString()
  @SanitizeString()
  agentTaxId: string;

  @ApiProperty({ description: 'ID del beneficiario (a quien retienen)' })
  @IsMongoId()
  beneficiaryId: string;

  @ApiProperty({ description: 'RIF del beneficiario' })
  @IsString()
  @SanitizeString()
  beneficiaryTaxId: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  @SanitizeString()
  notes?: string;
}
```

---

## DTOS DE SALIDA

### TaxCalculationResultDto

**Archivo**: `src/dto/tax/tax-calculation-result.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaxBreakdownDto {
  taxType: string;
  taxCode: string;
  taxName: string;
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  taxConfigurationId: string;
}

export class TaxCalculationResultDto {
  @ApiProperty({ description: 'Total de impuestos calculados' })
  totalTaxAmount: number;

  @ApiProperty({ description: 'Monto base total' })
  totalBaseAmount: number;

  @ApiProperty({ description: 'Monto final (base + impuestos)' })
  totalAmount: number;

  @ApiProperty({ description: 'Desglose por tipo de impuesto', type: [TaxBreakdownDto] })
  breakdown: TaxBreakdownDto[];

  @ApiPropertyOptional({ description: 'Advertencias' })
  warnings?: string[];

  @ApiPropertyOptional({ description: 'Exenciones aplicadas' })
  exemptions?: string[];
}
```

---

## VALIDACIONES CUSTOM

### SanitizeString Decorator

**Archivo**: `src/decorators/sanitize-string.decorator.ts`

```typescript
import { Transform } from 'class-transformer';

/**
 * Sanitiza strings para prevenir XSS
 * Elimina HTML tags y caracteres peligrosos
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    return value
      .replace(/<[^>]*>/g, '')  // Eliminar tags HTML
      .replace(/[<>'"]/g, '')   // Eliminar caracteres peligrosos
      .trim();
  });
}
```

### IsValidTaxRate Decorator

**Archivo**: `src/decorators/is-valid-tax-rate.decorator.ts`

```typescript
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidTaxRateConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'number') return false;

    // Tasa debe ser entre 0 y 1 (0% a 100%)
    if (value < 0 || value > 1) return false;

    // Máximo 4 decimales (ej: 0.1625 = 16.25%)
    const decimals = (value.toString().split('.')[1] || '').length;
    if (decimals > 4) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Tax rate must be between 0 and 1 with max 4 decimals';
  }
}

export function IsValidTaxRate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTaxRateConstraint,
    });
  };
}
```

---

## ÍNDICES DE BASE DE DATOS

### Script de Creación de Índices

**Archivo**: `scripts/create-tax-indexes.js`

```javascript
// Ejecutar en MongoDB shell o via script Node.js

db.taxconfigurations.createIndex({ tenantId: 1, country: 1, taxType: 1 });
db.taxconfigurations.createIndex({ tenantId: 1, isActive: 1, effectiveDate: -1 });
db.taxconfigurations.createIndex({ code: 1 }, { unique: true });
db.taxconfigurations.createIndex({
  tenantId: 1,
  taxType: 1,
  effectiveDate: -1,
  expirationDate: 1
});

db.taxtransactions.createIndex({ tenantId: 1, taxPeriod: 1, taxType: 1 });
db.taxtransactions.createIndex({ tenantId: 1, status: 1, taxDate: -1 });
db.taxtransactions.createIndex({ tenantId: 1, transactionType: 1, taxDate: -1 });
db.taxtransactions.createIndex({ sourceDocumentId: 1, tenantId: 1 });
db.taxtransactions.createIndex({ customerId: 1, tenantId: 1, taxDate: -1 });
db.taxtransactions.createIndex({ supplierId: 1, tenantId: 1, taxDate: -1 });
db.taxtransactions.createIndex({
  sourceDocumentNumber: 'text',
  invoiceNumber: 'text',
  customerName: 'text',
  supplierName: 'text'
});

db.withholdings.createIndex({ tenantId: 1, withholdingDate: -1 });
db.withholdings.createIndex({ tenantId: 1, status: 1, withholdingDate: -1 });
db.withholdings.createIndex({ tenantId: 1, withholdingType: 1, taxPeriod: 1 });
db.withholdings.createIndex({ sourcePaymentId: 1, tenantId: 1 });
db.withholdings.createIndex({ agentId: 1, tenantId: 1 });
db.withholdings.createIndex({ beneficiaryId: 1, tenantId: 1 });
db.withholdings.createIndex({ certificateNumber: 1, tenantId: 1 }, { sparse: true });

db.taxauditlogs.createIndex({ tenantId: 1, timestamp: -1 });
db.taxauditlogs.createIndex({ tenantId: 1, entityType: 1, entityId: 1, timestamp: -1 });
db.taxauditlogs.createIndex({ tenantId: 1, action: 1, timestamp: -1 });
db.taxauditlogs.createIndex({ userId: 1, tenantId: 1, timestamp: -1 });

console.log('✅ Índices fiscales creados exitosamente');
```

---

## MIGRACIÓN DE SCHEMAS EXISTENTES

### Agregar Campos a Product Schema

**Archivo modificar**: `src/schemas/product.schema.ts`

```typescript
// AGREGAR estos campos (sin eliminar los existentes):

@Prop({ type: [String], default: [] })
applicableTaxTypes?: string[];  // ["IVA", "IGTF"] - Lista de impuestos que aplican

@Prop({ type: Object, default: {} })
taxExemptions?: Record<string, { reason: string; certificateNumber?: string }>;
// Ej: { "IVA": { reason: "Alimento básico", certificateNumber: "EX-123" } }
```

### Agregar Campos a Order Schema

**Archivo modificar**: `src/schemas/order.schema.ts`

```typescript
// AGREGAR estos campos (SIN romper backward compatibility):

@Prop({ type: Number })
appliedIVARate?: number;  // Tasa de IVA aplicada (guardada para auditoría)

@Prop({ type: Number })
appliedIGTFRate?: number;  // Tasa de IGTF aplicada

@Prop({ type: [String], default: [] })
appliedTaxTypes?: string[];  // ["IVA", "IGTF"] - Impuestos aplicados

@Prop({ type: Object, default: {} })
taxBreakdown?: Record<string, number>;  // { "IVA": 16.00, "IGTF": 3.48 }
```

### Agregar Campos a Customer Schema

**Archivo modificar**: `src/schemas/customer.schema.ts`

```typescript
// AGREGAR en taxInfo:

@Prop({ type: Boolean, default: false })
isGovernment?: boolean;  // Es entidad gubernamental (exenta)

@Prop({ type: Boolean, default: false })
isDiplomatic?: boolean;  // Es diplomático (exento)

@Prop({ type: [String], default: [] })
taxExemptionCertificates?: string[];  // Certificados de exención

@Prop({ type: Object })
withholdingInfo?: {
  isSubjectTo: boolean;      // Está sujeto a retención
  withholdingPercentage?: number;
  certificateNumber?: string;
};
```

---

**Siguiente documento**: [ROADMAP_FASE_1_VENEZUELA.md](./ROADMAP_FASE_1_VENEZUELA.md)
