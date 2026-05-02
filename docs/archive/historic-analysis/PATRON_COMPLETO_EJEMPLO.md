# EJEMPLO COMPLETO: CREACIÓN DE NUEVO MÓDULO SIGUIENDO PATRONES

Supongamos que quieres crear un módulo `invoices` (Facturas). Aquí está el paso a paso:

## 1. CREAR SCHEMA

**src/schemas/invoice.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type InvoiceDocument = Invoice & Document;

@Schema()
export class InvoiceItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: true })
  productSku: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @Prop({ type: Number, required: true })
  ivaAmount: number;
}

const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ timestamps: true })
export class Invoice {
  // Identificación
  @Prop({ type: String, required: true, unique: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  customerName: string;

  // Items
  @Prop({ type: [InvoiceItemSchema], required: true })
  items: InvoiceItem[];

  // Totales
  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, required: true })
  ivaTotal: number;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  paidAmount: number;

  // Estado
  @Prop({
    type: String,
    enum: ["draft", "issued", "paid", "cancelled"],
    default: "draft",
  })
  status: string;

  // Referencias
  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId?: Types.ObjectId;

  // Auditoría
  @Prop({ type: String, required: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Índices CRÍTICOS
InvoiceSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
InvoiceSchema.index({ tenantId: 1, customerId: 1 });
InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 });
InvoiceSchema.index({ tenantId: 1, orderId: 1 });
```

## 2. CREAR DTOs

**src/dto/invoice.dto.ts**

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
  Max,
  IsEnum,
  IsMongoId,
  ArrayMinSize,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Subdocumento item
export class CreateInvoiceItemDto {
  @ApiProperty({ description: "ID del producto" })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: "Nombre del producto" })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: "SKU del producto" })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiProperty({ description: "Cantidad" })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: "Precio unitario" })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: "Precio total" })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiPropertyOptional({ description: "Descuento aplicado" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: "IVA aplicado" })
  @IsNumber()
  @Min(0)
  ivaAmount: number;
}

// DTO para crear factura
export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: "ID del cliente" })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: "Nombre del cliente" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerName?: string;

  @ApiProperty({ description: "Items de la factura", type: [CreateInvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiPropertyOptional({ description: "ID de la orden asociada" })
  @IsOptional()
  @IsMongoId()
  orderId?: string;

  @ApiPropertyOptional({ description: "Notas" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para actualizar
export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: "Estado de la factura" })
  @IsOptional()
  @IsEnum(["draft", "issued", "paid", "cancelled"])
  status?: string;

  @ApiPropertyOptional({ description: "Monto pagado" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional({ description: "Notas" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para consultas
export class InvoiceQueryDto {
  @ApiPropertyOptional({ description: "Página", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Límite por página", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Búsqueda" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Estado" })
  @IsOptional()
  @IsEnum(["draft", "issued", "paid", "cancelled"])
  status?: string;

  @ApiPropertyOptional({ description: "ID del cliente" })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: "Campo para ordenar", default: "createdAt" })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ description: "Orden", enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}
```

## 3. CREAR SERVICIO

**src/modules/invoices/invoices.service.ts**

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Invoice, InvoiceDocument } from "../../schemas/invoice.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
} from "../../dto/invoice.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    createInvoiceDto: CreateInvoiceDto,
    user: any,
  ): Promise<InvoiceDocument> {
    this.logger.log(`Creating invoice for customer`);

    // 1. Validar cliente
    let customer: CustomerDocument | null = null;

    if (createInvoiceDto.customerId) {
      customer = await this.customerModel
        .findById(createInvoiceDto.customerId)
        .exec();
    } else if (createInvoiceDto.customerName) {
      customer = await this.customerModel
        .findOne({
          name: createInvoiceDto.customerName,
          tenantId: user.tenantId,
        })
        .exec();
    }

    if (!customer) {
      throw new BadRequestException(
        "Cliente no encontrado. Debe proporcionar customerName o customerId válido.",
      );
    }

    // 2. Validar orden si se proporciona
    let orderId: Types.ObjectId | undefined;
    if (createInvoiceDto.orderId) {
      const order = await this.orderModel
        .findById(createInvoiceDto.orderId)
        .exec();
      if (!order) {
        throw new NotFoundException("Orden no encontrada");
      }
      orderId = order._id;
    }

    // 3. Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;

    for (const item of createInvoiceDto.items) {
      subtotal += item.totalPrice;
      ivaTotal += item.ivaAmount;
    }

    const totalAmount = subtotal + ivaTotal;

    // 4. Crear documento
    const invoiceNumber = await this.generateInvoiceNumber(user.tenantId);

    const invoiceData = {
      invoiceNumber,
      customerId: customer._id,
      customerName: customer.name,
      items: createInvoiceDto.items,
      subtotal,
      ivaTotal,
      totalAmount,
      paidAmount: 0,
      status: "draft",
      orderId,
      tenantId: user.tenantId,
      createdBy: user.id,
    };

    const invoice = new this.invoiceModel(invoiceData);
    const savedInvoice = await invoice.save();

    this.logger.log(`Invoice ${invoiceNumber} created successfully`);

    // 5. Emitir evento
    this.eventEmitter.emit("invoice.created", {
      invoiceId: savedInvoice._id.toString(),
      invoiceNumber,
      tenantId: user.tenantId,
      customerId: customer._id.toString(),
      totalAmount,
    });

    return savedInvoice;
  }

  async findAll(
    query: InvoiceQueryDto,
    tenantId: string,
  ) {
    const { filter, sortOptions, page, limit } = this.buildQuery(
      query,
      tenantId,
    );
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name email")
        .populate("createdBy", "firstName lastName")
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);

    return {
      invoices,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<InvoiceDocument | null> {
    return this.invoiceModel
      .findOne({ _id: id, tenantId })
      .populate("customerId", "name email")
      .populate("createdBy", "firstName lastName")
      .exec();
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    user: any,
  ): Promise<InvoiceDocument | null> {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException("Factura no encontrada");
    }

    // Validaciones de estado
    if (
      invoice.status === "cancelled" ||
      (invoice.status === "paid" && updateInvoiceDto.status !== "cancelled")
    ) {
      throw new BadRequestException(
        "No se puede modificar una factura cancelada o pagada",
      );
    }

    const updated = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        ...updateInvoiceDto,
        updatedBy: user.id,
      },
      { new: true },
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException("Factura no encontrada");
    }

    if (invoice.status !== "draft") {
      throw new BadRequestException(
        "Solo se pueden eliminar facturas en estado borrador",
      );
    }

    await this.invoiceModel.findByIdAndDelete(id);
  }

  private buildQuery(query: InvoiceQueryDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      customerId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter: any = { tenantId };

    if (status) {
      filter.status = status;
    }

    if (customerId) {
      filter.customerId = new Types.ObjectId(customerId);
    }

    if (search) {
      const regex = new RegExp(this.escapeRegExp(search), "i");
      filter.$or = [{ invoiceNumber: regex }, { customerName: regex }];
    }

    const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    return { filter, sortOptions, page, limit };
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    const lastInvoice = await this.invoiceModel
      .findOne({ tenantId })
      .sort({ createdAt: -1 })
      .exec();

    let sequence = 1;
    if (lastInvoice) {
      const lastNumber = lastInvoice.invoiceNumber;
      const match = lastNumber.match(/INV-\d{4}(\d{4})/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `INV-${year}${month}${day}${sequence.toString().padStart(4, "0")}`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
```

## 4. CREAR CONTROLLER

**src/modules/invoices/invoices.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { InvoicesService } from "./invoices.service";
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
} from "../../dto/invoice.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("invoices")
@Controller("invoices")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Permissions("invoices_create")
  @ApiOperation({ summary: "Crear nueva factura" })
  async create(@Body() createInvoiceDto: CreateInvoiceDto, @Request() req) {
    try {
      const invoice = await this.invoicesService.create(
        createInvoiceDto,
        req.user,
      );
      return {
        success: true,
        message: "Factura creada exitosamente",
        data: invoice.toObject(),
      };
    } catch (error) {
      this.logger.error("Error creating invoice", error.stack);
      throw new HttpException(
        error.message || "Error al crear la factura",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permissions("invoices_read")
  @ApiOperation({ summary: "Listar facturas" })
  async findAll(@Query() query: InvoiceQueryDto, @Request() req) {
    try {
      return await this.invoicesService.findAll(query, req.user.tenantId);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar facturas",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @Permissions("invoices_read")
  @ApiOperation({ summary: "Obtener factura por ID" })
  async findOne(@Param("id") id: string, @Request() req) {
    try {
      const invoice = await this.invoicesService.findOne(
        id,
        req.user.tenantId,
      );

      if (!invoice) {
        throw new HttpException(
          "Factura no encontrada",
          HttpStatus.NOT_FOUND,
        );
      }

      return { success: true, data: invoice.toObject() };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener la factura",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(":id")
  @Permissions("invoices_update")
  @ApiOperation({ summary: "Actualizar factura" })
  async update(
    @Param("id") id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Request() req,
  ) {
    try {
      const invoice = await this.invoicesService.update(
        id,
        updateInvoiceDto,
        req.user,
      );

      return {
        success: true,
        message: "Factura actualizada exitosamente",
        data: invoice?.toObject(),
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar la factura",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(":id")
  @Permissions("invoices_delete")
  @ApiOperation({ summary: "Eliminar factura" })
  async delete(@Param("id") id: string) {
    try {
      await this.invoicesService.delete(id);

      return {
        success: true,
        message: "Factura eliminada exitosamente",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar la factura",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

## 5. CREAR MÓDULO

**src/modules/invoices/invoices.module.ts**

```typescript
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { AuthModule } from "../../auth/auth.module";
import { Invoice, InvoiceSchema } from "../../schemas/invoice.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService], // Exportar para uso en otros módulos
})
export class InvoicesModule {}
```

## 6. REGISTRAR EN APP.MODULE

En `src/app.module.ts`, añade:

```typescript
import { InvoicesModule } from "./modules/invoices/invoices.module";

@Module({
  imports: [
    // ... otros módulos
    InvoicesModule,  // Añadir aquí
  ],
})
export class AppModule {}
```

## 7. PATRONES APLICADOS

El ejemplo anterior demuestra:

1. **Schema**: Uso de `Types.ObjectId` con referencias, timestamps automáticos, índices compuestos
2. **DTOs**: Validadores multi-nivel, `@Type()` para transformación, `@ValidateNested()` para anidamiento
3. **Servicio**:
   - Manejo de errores con excepciones NestJS
   - Inyección de dependencias
   - Métodos privados para reutilización
   - Event emitter para desacoplamiento
   - Consultas con filtrado, paginación y sorting
   - Conversión de ObjectId a string con `.toObject()`
4. **Controller**:
   - Guards para autenticación y autorización
   - Decorador `@Permissions` para control granular
   - Manejo de errores en endpoints
   - Documentación Swagger
5. **Módulo**: Patrón estándar con forFeature, exports
