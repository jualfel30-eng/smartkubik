# 📐 Plan de Implementación UoM (Unit of Measure) System
## Sistema Robusto de Conversión de Unidades

> **Fecha:** 2025-01-12
> **Objetivo:** Implementar sistema completo de conversión de unidades siguiendo EXACTAMENTE los patrones del sistema existente que funciona
> **Basado en:** Análisis exhaustivo del código de Products e Inventory que SÍ funciona

---

## 🎯 Fase 0: Preparación y Validación

### 0.1 Verificar Sistema Actual
- [ ] Compilar backend sin errores
- [ ] Todos los tests existentes pasan
- [ ] Crear branch de desarrollo: `feature/uom-system`
- [ ] Backup de schemas actuales

### 0.2 Crear Estructura de Archivos (NO escribir código todavía)
```
food-inventory-saas/src/
├── schemas/
│   └── unit-conversion.schema.ts        (NUEVO)
├── dto/
│   └── unit-conversion.dto.ts           (NUEVO)
├── modules/
│   └── unit-conversions/                (NUEVO MÓDULO)
│       ├── unit-conversions.module.ts
│       ├── unit-conversions.controller.ts
│       ├── unit-conversions.service.ts
│       └── __tests__/
│           └── unit-conversions.service.spec.ts
```

---

## 📋 Fase 1: Schema de UnitConversion (Base de Datos)

### 1.1 Crear Subdocumento ConversionRule

**Archivo:** `src/schemas/unit-conversion.schema.ts`

**Patrón a seguir:** Igual que `SellingUnit` en `product.schema.ts:86-116`

```typescript
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type UnitConversionDocument = UnitConversion & Document;

// Subdocumento para reglas de conversión individuales
@Schema()
export class ConversionRule {
  @Prop({ type: String, required: true })
  unit: string;  // "caja", "paquete", "galón", "unidad"

  @Prop({ type: String, required: true })
  abbreviation: string;  // "cj", "paq", "gal", "und"

  @Prop({ type: Number, required: true })
  factor: number;  // Factor de conversión a la unidad base

  @Prop({
    type: String,
    required: true,
    enum: ["purchase", "stock", "consumption"]
  })
  unitType: string;  // Tipo de unidad

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;  // Unidad por defecto para este tipo
}

const ConversionRuleSchema = SchemaFactory.createForClass(ConversionRule);
```

**✅ Validaciones:**
- Usar `Types` de mongoose (NO importar de otro lado)
- Todos los arrays con `default: []`
- Usar enums para campos con valores limitados
- Boolean con defaults explícitos

### 1.2 Crear Schema Principal

```typescript
@Schema({ timestamps: true })
export class UnitConversion {
  @Prop({ type: String, required: true })
  productSku: string;  // SKU del producto al que pertenece

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;  // ← IMPORTANTE: Types.ObjectId, NO String

  @Prop({ type: String, required: true })
  baseUnit: string;  // Unidad más pequeña (ej: "unidad", "ml", "gramo")

  @Prop({ type: String, required: true })
  baseUnitAbbr: string;  // Abreviación (ej: "und", "ml", "g")

  @Prop({ type: [ConversionRuleSchema], default: [] })  // ← IMPORTANTE: default: []
  conversions: ConversionRule[];

  @Prop({ type: String })
  defaultPurchaseUnit?: string;  // "caja" (unidad en la que se compra)

  @Prop({ type: String })
  defaultStockUnit?: string;  // "paquete" (unidad de almacenamiento)

  @Prop({ type: String })
  defaultConsumptionUnit?: string;  // "unidad" (unidad de consumo)

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;  // ← IMPORTANTE: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;  // ← IMPORTANTE: opcional con ?

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const UnitConversionSchema = SchemaFactory.createForClass(UnitConversion);
```

### 1.3 Crear Índices

**Patrón a seguir:** Igual que `product.schema.ts:464-467`

```typescript
// Índices compuestos para queries comunes
UnitConversionSchema.index({ productId: 1, tenantId: 1 }, { unique: true });
UnitConversionSchema.index({ productSku: 1, tenantId: 1 }, { unique: true });
UnitConversionSchema.index({ tenantId: 1, isActive: 1 });
UnitConversionSchema.index({ tenantId: 1, productId: 1 });
```

**✅ Validaciones de Fase 1:**
- [ ] Schema compila sin errores TypeScript
- [ ] Todos los ObjectId usan `Types.ObjectId`
- [ ] Todos los arrays tienen `default: []`
- [ ] Índices creados correctamente
- [ ] Schema exportado con `SchemaFactory.createForClass()`

---

## 📝 Fase 2: DTOs (Data Transfer Objects)

### 2.1 Crear DTO para ConversionRule

**Archivo:** `src/dto/unit-conversion.dto.ts`

**Patrón a seguir:** Subdocumentos en `product.dto.ts:23-52`

```typescript
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
  IsEnum,
  IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateConversionRuleDto {
  @ApiProperty({
    description: "Nombre de la unidad",
    example: "caja"
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description: "Abreviación",
    example: "cj"
  })
  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @ApiProperty({
    description: "Factor de conversión a la unidad base",
    example: 2000
  })
  @IsNumber()
  @Min(0.001)  // ← IMPORTANTE: validar números positivos
  factor: number;

  @ApiProperty({
    description: "Tipo de unidad",
    enum: ["purchase", "stock", "consumption"]
  })
  @IsEnum(["purchase", "stock", "consumption"])
  unitType: string;

  @ApiPropertyOptional({
    description: "Está activa",
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Es unidad por defecto para su tipo",
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
```

**✅ Validaciones:**
- Todos los campos tienen `@ApiProperty` o `@ApiPropertyOptional`
- Campos opcionales tienen `?` y `@IsOptional()`
- Números validados con `@Min()`
- Enums validados con `@IsEnum()`

### 2.2 Crear DTO de Creación

```typescript
export class CreateUnitConversionDto {
  @ApiProperty({
    description: "SKU del producto"
  })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiProperty({
    description: "ID del producto"
  })
  @IsMongoId()  // ← IMPORTANTE: validar MongoId, pero tipo es string
  productId: string;  // ← IMPORTANTE: string en DTO, se convierte a ObjectId en servicio

  @ApiProperty({
    description: "Unidad base (la más pequeña)",
    example: "unidad"
  })
  @IsString()
  @IsNotEmpty()
  baseUnit: string;

  @ApiProperty({
    description: "Abreviación de la unidad base",
    example: "und"
  })
  @IsString()
  @IsNotEmpty()
  baseUnitAbbr: string;

  @ApiPropertyOptional({
    description: "Reglas de conversión",
    type: [CreateConversionRuleDto],
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })  // ← CRÍTICO: valida cada elemento
  @Type(() => CreateConversionRuleDto)  // ← CRÍTICO: transforma cada elemento
  conversions?: CreateConversionRuleDto[];

  @ApiPropertyOptional({
    description: "Unidad de compra por defecto",
    example: "caja"
  })
  @IsOptional()
  @IsString()
  defaultPurchaseUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de almacenamiento por defecto",
    example: "paquete"
  })
  @IsOptional()
  @IsString()
  defaultStockUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de consumo por defecto",
    example: "unidad"
  })
  @IsOptional()
  @IsString()
  defaultConsumptionUnit?: string;
}
```

**✅ Validaciones Críticas:**
- [ ] Arrays de objetos tienen `@ValidateNested({ each: true })`
- [ ] Arrays de objetos tienen `@Type(() => SubDocumentDto)`
- [ ] MongoIds son `string` en DTO (NO ObjectId)
- [ ] Todos los MongoIds tienen `@IsMongoId()`

### 2.3 Crear DTO de Actualización

**Patrón:** TODOS los campos opcionales (igual que `product.dto.ts:248-350`)

```typescript
export class UpdateUnitConversionDto {
  @ApiPropertyOptional({ description: "Unidad base" })
  @IsOptional()
  @IsString()
  baseUnit?: string;

  @ApiPropertyOptional({ description: "Abreviación unidad base" })
  @IsOptional()
  @IsString()
  baseUnitAbbr?: string;

  @ApiPropertyOptional({
    description: "Reglas de conversión",
    type: [CreateConversionRuleDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConversionRuleDto)
  conversions?: CreateConversionRuleDto[];

  @ApiPropertyOptional({ description: "Unidad de compra" })
  @IsOptional()
  @IsString()
  defaultPurchaseUnit?: string;

  @ApiPropertyOptional({ description: "Unidad de almacenamiento" })
  @IsOptional()
  @IsString()
  defaultStockUnit?: string;

  @ApiPropertyOptional({ description: "Unidad de consumo" })
  @IsOptional()
  @IsString()
  defaultConsumptionUnit?: string;

  @ApiPropertyOptional({ description: "Está activo" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

### 2.4 Crear DTO de Query

```typescript
export class UnitConversionQueryDto {
  @ApiPropertyOptional({ description: "ID del producto" })
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @ApiPropertyOptional({ description: "SKU del producto" })
  @IsOptional()
  @IsString()
  productSku?: string;

  @ApiPropertyOptional({
    description: "Solo activos",
    default: true
  })
  @IsOptional()
  @Transform(({ value }) => value === "true")  // ← Query params son strings
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Página",
    default: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Límite por página",
    default: 20
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
```

**✅ Validaciones de Fase 2:**
- [ ] Todos los DTOs compilan sin errores
- [ ] Arrays con `@ValidateNested` y `@Type`
- [ ] Query params con `@Transform` para conversión de tipos
- [ ] MongoIds validados con `@IsMongoId()`
- [ ] Swagger docs completas

---

## ⚙️ Fase 3: Servicio (Lógica de Negocio)

### 3.1 Crear Servicio Base

**Archivo:** `src/modules/unit-conversions/unit-conversions.service.ts`

**Patrón a seguir:** `products.service.ts` y `inventory.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UnitConversion,
  UnitConversionDocument,
} from "../../schemas/unit-conversion.schema";
import {
  CreateUnitConversionDto,
  UpdateUnitConversionDto,
  UnitConversionQueryDto,
} from "../../dto/unit-conversion.dto";

@Injectable()
export class UnitConversionsService {
  constructor(
    @InjectModel(UnitConversion.name)
    private unitConversionModel: Model<UnitConversionDocument>,
  ) {}

  // Métodos a implementar en secciones siguientes
}
```

### 3.2 Implementar Método Create

**Patrón:** Igual que `products.service.ts:48-91`

```typescript
async create(
  dto: CreateUnitConversionDto,
  user: any,
): Promise<UnitConversionDocument> {
  // PASO 1: Convertir IDs a ObjectId INMEDIATAMENTE
  const productObjectId = new Types.ObjectId(dto.productId);
  const tenantObjectId = new Types.ObjectId(user.tenantId);

  // PASO 2: Verificar que el producto existe
  // (Asumir que tienes ProductsService inyectado)
  const product = await this.productsService.findOne(
    dto.productId,
    user.tenantId
  );

  if (!product) {
    throw new NotFoundException("Producto no encontrado");
  }

  // PASO 3: Verificar que no existe ya una configuración
  const existingConfig = await this.unitConversionModel
    .findOne({
      productId: productObjectId,
      tenantId: tenantObjectId
    })
    .lean()
    .exec();

  if (existingConfig) {
    throw new BadRequestException(
      "Este producto ya tiene configuración de unidades"
    );
  }

  // PASO 4: Preparar datos con conversiones de tipo
  const data = {
    ...dto,
    productId: productObjectId,  // ← Convertido a ObjectId
    tenantId: tenantObjectId,    // ← Convertido a ObjectId
    conversions: dto.conversions || [],  // ← Default a array vacío
    createdBy: user.id,  // ← user.id ya es ObjectId
  };

  // PASO 5: Crear usando new + save (no create directamente)
  const created = new this.unitConversionModel(data);
  return created.save();
}
```

**✅ Validaciones:**
- [ ] Conversión de IDs al INICIO del método
- [ ] Validación de existencia de producto
- [ ] Verificación de duplicados
- [ ] Arrays con default a `[]`
- [ ] Usar `new Model() + save()` (NO `create()`)

### 3.3 Implementar Método FindAll

**Patrón:** Igual que `products.service.ts:321-394`

```typescript
async findAll(
  query: UnitConversionQueryDto,
  tenantId: string,
) {
  const {
    page = 1,
    limit = 20,
    productId,
    productSku,
    isActive = true,
  } = query;

  // PASO 1: Construir filtro con conversión de IDs
  const filter: Record<string, any> = {
    tenantId: new Types.ObjectId(tenantId),  // ← SIEMPRE convertir
  };

  if (productId) {
    filter.productId = new Types.ObjectId(productId);  // ← Convertir si existe
  }

  if (productSku) {
    filter.productSku = productSku;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  // PASO 2: Calcular skip y limit
  const skip = (page - 1) * limit;

  // PASO 3: Query con lean() para lectura
  const [items, total] = await Promise.all([
    this.unitConversionModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean()  // ← IMPORTANTE para lectura
      .exec(),
    this.unitConversionModel.countDocuments(filter).exec(),
  ]);

  // PASO 4: Calcular paginación
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
```

**✅ Validaciones:**
- [ ] Conversión de todos los IDs en filtros
- [ ] Promise.all para queries paralelas
- [ ] lean() para lectura
- [ ] exec() al final de queries
- [ ] Paginación correcta

### 3.4 Implementar Método FindOne

```typescript
async findOne(
  id: string,
  tenantId: string,
): Promise<UnitConversionDocument | null> {
  return this.unitConversionModel
    .findOne({
      _id: new Types.ObjectId(id),  // ← Convertir
      tenantId: new Types.ObjectId(tenantId)  // ← Convertir
    })
    .exec();  // ← Sin lean() porque podríamos necesitar guardar
}
```

### 3.5 Implementar Método Update

```typescript
async update(
  id: string,
  dto: UpdateUnitConversionDto,
  user: any,
): Promise<UnitConversionDocument | null> {
  // PASO 1: Convertir IDs
  const idObjectId = new Types.ObjectId(id);
  const tenantObjectId = new Types.ObjectId(user.tenantId);

  // PASO 2: Preparar datos de actualización
  const updateData = {
    ...dto,
    updatedBy: user.id,
  };

  // PASO 3: Actualizar y retornar nuevo documento
  return this.unitConversionModel
    .findOneAndUpdate(
      {
        _id: idObjectId,
        tenantId: tenantObjectId
      },
      updateData,
      { new: true }  // ← Retorna documento actualizado
    )
    .exec();
}
```

### 3.6 Implementar Método Delete

```typescript
async remove(id: string, tenantId: string): Promise<any> {
  const result = await this.unitConversionModel
    .deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId)
    })
    .exec();

  if (result.deletedCount === 0) {
    throw new NotFoundException("Configuración de unidades no encontrada");
  }

  return result;
}
```

### 3.7 Implementar Método de Conversión (Helper)

```typescript
async convert(
  value: number,
  fromUnit: string,
  toUnit: string,
  productId: string,
  tenantId: string,
): Promise<number> {
  // CASO 1: Misma unidad, retornar valor sin cambios
  if (fromUnit === toUnit) {
    return value;
  }

  // PASO 1: Obtener configuración del producto
  const config = await this.unitConversionModel
    .findOne({
      productId: new Types.ObjectId(productId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    })
    .lean()
    .exec();

  if (!config) {
    throw new NotFoundException(
      "Configuración de unidades no encontrada para este producto"
    );
  }

  // PASO 2: Buscar reglas de conversión
  const fromRule = config.conversions.find(
    (c) => c.unit === fromUnit && c.isActive
  );
  const toRule = config.conversions.find(
    (c) => c.unit === toUnit && c.isActive
  );

  if (!fromRule || !toRule) {
    throw new BadRequestException(
      `No se puede convertir de ${fromUnit} a ${toUnit}`
    );
  }

  // PASO 3: Convertir a unidad base primero, luego a unidad destino
  const valueInBase = value * fromRule.factor;
  const result = valueInBase / toRule.factor;

  return result;
}
```

**✅ Validaciones de Fase 3:**
- [ ] Todos los métodos compilan sin errores
- [ ] IDs convertidos a ObjectId al inicio
- [ ] Queries con lean() + exec()
- [ ] Manejo de errores con excepciones apropiadas
- [ ] Arrays con default values

---

## 🎮 Fase 4: Controlador (Endpoints API)

### 4.1 Crear Controlador

**Archivo:** `src/modules/unit-conversions/unit-conversions.controller.ts`

**Patrón:** Igual que `products.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse
} from "@nestjs/swagger";
import { UnitConversionsService } from "./unit-conversions.service";
import {
  CreateUnitConversionDto,
  UpdateUnitConversionDto,
  UnitConversionQueryDto,
} from "../../dto/unit-conversion.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("unit-conversions")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("unit-conversions")
export class UnitConversionsController {
  constructor(
    private readonly unitConversionsService: UnitConversionsService,
  ) {}

  @Post()
  @Permissions("products_write")  // ← Reusar permiso existente
  @ApiOperation({ summary: "Crear configuración de unidades" })
  @ApiResponse({ status: 201, description: "Creado exitosamente" })
  async create(
    @Body() dto: CreateUnitConversionDto,
    @Request() req,
  ) {
    const data = await this.unitConversionsService.create(
      dto,
      req.user  // ← Pasar user completo
    );
    return { success: true, data };
  }

  @Get()
  @Permissions("products_read")
  @ApiOperation({ summary: "Listar configuraciones de unidades" })
  async findAll(
    @Query() query: UnitConversionQueryDto,
    @Request() req,
  ) {
    const result = await this.unitConversionsService.findAll(
      query,
      req.user.tenantId  // ← Pasar tenantId string
    );
    return {
      success: true,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Get(":id")
  @Permissions("products_read")
  @ApiOperation({ summary: "Obtener configuración por ID" })
  async findOne(
    @Param("id") id: string,
    @Request() req,
  ) {
    const data = await this.unitConversionsService.findOne(
      id,
      req.user.tenantId
    );

    if (!data) {
      throw new NotFoundException("Configuración no encontrada");
    }

    return { success: true, data };
  }

  @Patch(":id")
  @Permissions("products_write")
  @ApiOperation({ summary: "Actualizar configuración" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUnitConversionDto,
    @Request() req,
  ) {
    const data = await this.unitConversionsService.update(
      id,
      dto,
      req.user
    );

    if (!data) {
      throw new NotFoundException("Configuración no encontrada");
    }

    return { success: true, data };
  }

  @Delete(":id")
  @Permissions("products_delete")
  @ApiOperation({ summary: "Eliminar configuración" })
  async remove(
    @Param("id") id: string,
    @Request() req,
  ) {
    await this.unitConversionsService.remove(id, req.user.tenantId);
    return { success: true, message: "Configuración eliminada" };
  }
}
```

**✅ Validaciones de Fase 4:**
- [ ] Decoradores @UseGuards correctos
- [ ] Permissions apropiados
- [ ] ApiTags y ApiOperation para Swagger
- [ ] Manejo de null con NotFoundException
- [ ] Respuestas consistentes con { success, data }

---

## 🔧 Fase 5: Módulo y Configuración

### 5.1 Crear Módulo

**Archivo:** `src/modules/unit-conversions/unit-conversions.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UnitConversionsService } from "./unit-conversions.service";
import { UnitConversionsController } from "./unit-conversions.controller";
import {
  UnitConversion,
  UnitConversionSchema,
} from "../../schemas/unit-conversion.schema";
import { ProductsModule } from "../products/products.module";  // Para validar productos

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnitConversion.name, schema: UnitConversionSchema },
    ]),
    ProductsModule,  // Para inyectar ProductsService
  ],
  controllers: [UnitConversionsController],
  providers: [UnitConversionsService],
  exports: [UnitConversionsService],  // Para usar en otros módulos
})
export class UnitConversionsModule {}
```

### 5.2 Registrar en AppModule

**Archivo:** `src/app.module.ts`

```typescript
// Agregar import
import { UnitConversionsModule } from "./modules/unit-conversions/unit-conversions.module";

@Module({
  imports: [
    // ... otros imports
    UnitConversionsModule,  // ← Agregar aquí
  ],
})
export class AppModule {}
```

**✅ Validaciones de Fase 5:**
- [ ] Módulo exporta el servicio
- [ ] Schema registrado con MongooseModule.forFeature
- [ ] Importa ProductsModule si necesita validar productos
- [ ] Registrado en AppModule

---

## 🧪 Fase 6: Testing

### 6.1 Crear Tests Unitarios

**Archivo:** `src/modules/unit-conversions/__tests__/unit-conversions.service.spec.ts`

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { UnitConversionsService } from "../unit-conversions.service";
import { UnitConversion } from "../../../schemas/unit-conversion.schema";

describe("UnitConversionsService", () => {
  let service: UnitConversionsService;
  let mockModel: any;

  const mockUnitConversion = {
    _id: new Types.ObjectId(),
    productId: new Types.ObjectId(),
    productSku: "TEST-001",
    baseUnit: "unidad",
    baseUnitAbbr: "und",
    conversions: [
      { unit: "paquete", abbreviation: "paq", factor: 50, unitType: "stock", isActive: true },
      { unit: "caja", abbreviation: "cj", factor: 2000, unitType: "purchase", isActive: true },
    ],
    tenantId: new Types.ObjectId(),
    isActive: true,
  };

  beforeEach(async () => {
    mockModel = {
      new: jest.fn().mockResolvedValue(mockUnitConversion),
      constructor: jest.fn().mockResolvedValue(mockUnitConversion),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitConversionsService,
        {
          provide: getModelToken(UnitConversion.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<UnitConversionsService>(UnitConversionsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Agregar más tests...
});
```

**✅ Validaciones de Fase 6:**
- [ ] Tests pasan sin errores
- [ ] Coverage mínimo 70%
- [ ] Tests de conversión de unidades
- [ ] Tests de validaciones

---

## 📱 Fase 7: Frontend (UI)

### 7.1 Crear Hook useUnitConversions

**Archivo:** `food-inventory-admin/src/hooks/use-unit-conversions.js`

```javascript
import { useState, useCallback } from 'react';
import { fetchApi } from '../lib/api';

export function useUnitConversions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/unit-conversions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const list = useCallback(async (query = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(query);
      const response = await fetchApi(`/unit-conversions?${params}`);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/unit-conversions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/unit-conversions/${id}`, {
        method: 'DELETE',
      });
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    create,
    list,
    update,
    remove,
  };
}
```

### 7.2 Crear Componente de Configuración

**Archivo:** `food-inventory-admin/src/components/UnitConversionConfig.jsx`

(Agregar componente UI completo con formularios, validación, etc.)

**✅ Validaciones de Fase 7:**
- [ ] Hook maneja errores correctamente
- [ ] UI funcional y responsive
- [ ] Validación de formularios
- [ ] Mensajes de error claros

---

## ✅ Checklist Final

### Pre-implementación
- [ ] Análisis completo del código existente realizado
- [ ] Plan de ruta aprobado
- [ ] Branch de desarrollo creado

### Backend
- [ ] Schema compilado sin errores
- [ ] DTOs validados completamente
- [ ] Servicio con todos los métodos
- [ ] Controlador con endpoints
- [ ] Módulo registrado
- [ ] Tests pasando

### Frontend
- [ ] Hook implementado
- [ ] Componente UI funcional
- [ ] Integración con backend probada

### Documentación
- [ ] Swagger docs generadas
- [ ] README actualizado
- [ ] Ejemplos de uso documentados

---

## 🚫 Errores a EVITAR Absolutamente

1. ❌ NO usar `string[]` para IDs - usar `Types.ObjectId` en schemas
2. ❌ NO omitir `@ValidateNested` y `@Type` en arrays de objetos
3. ❌ NO usar IDs sin convertir a ObjectId en servicios
4. ❌ NO omitir `default: []` en arrays de schemas
5. ❌ NO usar `.populate()` sin especificar campos
6. ❌ NO olvidar `.exec()` en queries
7. ❌ NO mezclar `ObjectId` y `string` sin conversión explícita
8. ❌ NO crear documentos con `create()` si necesitas el objeto después

---

## 📊 Métricas de Éxito

- ✅ Zero errores de compilación TypeScript
- ✅ 100% de endpoints funcionando
- ✅ Tests con >70% coverage
- ✅ Zero regresiones en funcionalidad existente
- ✅ Documentación Swagger completa
- ✅ UI funcional sin errores de consola

---

**Última actualización:** 2025-01-12
**Creado por:** Análisis exhaustivo del sistema existente
**Aprobado por:** [Pendiente]
