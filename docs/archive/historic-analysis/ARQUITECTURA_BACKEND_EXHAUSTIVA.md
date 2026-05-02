# ANÁLISIS EXHAUSTIVO: ARQUITECTURA DEL BACKEND NESTJS

## 1. ESTRUCTURA DE MÓDULOS NESTJS

### 1.1 Módulos Principales Identificados

```
src/modules/
├── accounting/              # Contabilidad (diarios, cuentas)
├── analytics/               # Análisis y reportes
├── appointments/            # Citas y agendas
├── assistant/               # IA/Asistente
├── audit-log/               # Auditoría
├── bank-accounts/           # Cuentas bancarias
├── bank-reconciliation/     # Reconciliación bancaria
├── bill-splits/             # División de cuentas
├── consumables/             # Consumibles
├── customers/               # Gestión de clientes
├── dashboard/               # Dashboards
├── delivery/                # Entregas
├── exchange-rate/           # Tasas de cambio
├── feature-flags/           # Banderas de características
├── hospitality-integrations/# Integraciones hotelería
├── inventory/               # Inventario
├── kitchen-display/         # Display de cocina
├── locations/               # Ubicaciones
├── loyalty/                 # Programas de fidelización
├── modifier-groups/         # Grupos de modificadores
├── notifications/           # Notificaciones
├── orders/                  # Órdenes/Ventas
├── payments/                # Pagos
├── payables/                # Cuentas por pagar
├── payroll/                 # Nómina
├── payroll-employees/       # Empleados de nómina
├── payroll-runs/            # Corridas de nómina
├── permissions/             # Permisos
├── products/                # Productos
├── production/              # Producción (BOM, Routing, MO)
├── purchases/               # Compras
├── reports/                 # Reportes
├── roles/                   # Roles
├── shifts/                  # Turnos
├── storefront/              # Tienda online
├── supplies/                # Suministros
├── suppliers/               # Proveedores
├── unit-conversions/        # Conversión de unidades
└── users/                   # Usuarios
```

### 1.2 Patrón de Módulo Estándar

```typescript
// customers.module.ts
@Module({
  imports: [
    AuthModule,
    RolesModule,
    LoyaltyModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      // ... otras entidades
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService], // Importante para reutilización
})
export class CustomersModule {}
```

**Patrones observados:**
- Cada módulo maneja su propio dominio
- Exportan servicios para inyección en otros módulos
- Registran schemas locales con forFeature()
- Importan AuthModule para seguridad

---

## 2. PATRONES DE DTos

### 2.1 Decoradores Estándar Usados

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
  IsDate,
  ArrayMinSize,
  IsObject,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SanitizeString, SanitizeText } from "../decorators/sanitize.decorator";
```

### 2.2 Ejemplo DTO Complejo: CreateOrderDto

```typescript
export class CreateOrderItemDto {
  @ApiProperty({ description: "ID del producto" })
  @IsMongoId()
  productId: string;

  @ApiPropertyOptional({ description: "ID de la variante seleccionada" })
  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @ApiProperty({ description: "Cantidad solicitada" })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ description: "Unidad de venta seleccionada" })
  @IsOptional()
  @IsString()
  selectedUnit?: string; // Ej: "kg", "g", "lb"

  @ApiPropertyOptional({ description: "Factor de conversión usado" })
  @IsOptional()
  @IsNumber()
  conversionFactor?: number;

  @ApiPropertyOptional({ description: "Atributos específicos del item" })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class RegisterPaymentDto {
  @ApiProperty({ description: "Monto del pago en USD" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: "Monto del pago en VES" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountVes?: number;

  @ApiProperty({ description: "Método de pago" })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: "Fecha del pago" })
  @IsDate()
  @Type(() => Date)  // IMPORTANTE: Convierte string a Date
  date: Date;

  @ApiPropertyOptional({ description: "ID de la cuenta bancaria" })
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: "Indica si el pago está confirmado" })
  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: "ID del cliente existente" })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: "Nombre del cliente" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @SanitizeString()  // SANITIZACIÓN
  customerName?: string;

  @ApiProperty({ description: "Items de la orden", type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })  // Valida cada elemento del array
  @Type(() => CreateOrderItemDto)  // Transforma a clase
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: "Dirección de envío para la orden" })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({ description: "Pagos de la orden" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterPaymentDto)
  payments?: RegisterPaymentDto[];

  @ApiPropertyOptional({
    description: "Canal de la orden",
    enum: ["online", "phone", "whatsapp", "in_store", "in_person", "web"],
    default: "in_person",
  })
  @IsOptional()
  @IsEnum(["online", "phone", "whatsapp", "in_store", "in_person", "web"])
  channel?: string = "in_person";
}
```

### 2.3 Validadores Personalizados

```typescript
@ValidatorConstraint({ name: "isContactMandatoryForSupplier", async: false })
export class IsContactMandatoryForSupplier
  implements ValidatorConstraintInterface
{
  validate(contacts: any[], args: ValidationArguments) {
    const object = args.object as CreateCustomerDto;
    if (object.customerType === "supplier") {
      return (
        Array.isArray(contacts) &&
        contacts.length > 0 &&
        contacts.some((c) => c.value && c.value.trim() !== "")
      );
    }
    return true;
  }

  defaultMessage(_args: ValidationArguments) {
    return "Debe proporcionar al menos un método de contacto para los proveedores.";
  }
}

// Uso en DTO:
export class CreateCustomerDto {
  @Validate(IsContactMandatoryForSupplier)
  contacts: CustomerContactDto[];
}
```

### 2.4 Patrones de Transformación

```typescript
// 1. @Type() para conversión de tipos
@Type(() => Date)
date: Date;

@Type(() => Number)
quantity: number;

// 2. @Transform() para lógica personalizada
@Transform(({ value }) => parseInt(value, 10))
port: number;

@Transform(({ value }) => value === "true" || value === true)
isActive: boolean;

// 3. Sanitización personalizada
@SanitizeString()
@SanitizeText()
@SanitizeStringArray()
```

### 2.5 DTOs de Paginación y Filtrado

```typescript
export class OrderQueryDto {
  @ApiPropertyOptional({ description: "Página", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Límite por página", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Término de búsqueda" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Campo para ordenar",
    default: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Orden de clasificación",
    enum: ["asc", "desc"],
    default: "desc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}
```

---

## 3. PATRONES DE ENTITIES/SCHEMAS

### 3.1 Patrón Base de Schema

```typescript
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })  // Agrega createdAt, updatedAt
export class Payment {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({
    type: String,
    required: true,
    enum: ["sale", "payable"],
    index: true,
  })
  paymentType: string;

  // ObjectId con referencia a otro documento
  @Prop({ type: Types.ObjectId, ref: "Order", required: false })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Payable", required: false })
  payableId?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: Types.ObjectId, ref: "BankAccount", required: false })
  bankAccountId?: Types.ObjectId;

  @Prop({ type: String, required: true, default: "confirmed" })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  confirmedBy?: Types.ObjectId;

  // Objetos anidados
  @Prop({ type: Object })
  cardDetails?: {
    last4?: string;
    brand?: string;
    cardholderName?: string;
  };

  @Prop({ type: Boolean, default: false })
  receiptSent?: boolean;

  @Prop({ type: Number })
  serviceFee?: number;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Índices compuestos (muy importantes para performance)
PaymentSchema.index({ tenantId: 1, paymentType: 1, date: -1 });
PaymentSchema.index({ tenantId: 1, orderId: 1 });
PaymentSchema.index({ tenantId: 1, payableId: 1 });
PaymentSchema.index({ tenantId: 1, method: 1, date: -1 });
```

### 3.2 Schemas Anidados

```typescript
@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productSku: string;

  @Prop({ type: String, required: true })
  productName: string;

  // Variante (opcional)
  @Prop({ type: Types.ObjectId, ref: "ProductVariant" })
  variantId?: Types.ObjectId;

  @Prop({ type: String })
  variantSku?: string;

  // Atributos dinámicos
  @Prop({ type: Object })
  attributes?: Record<string, any>;

  @Prop({ type: String })
  attributeSummary?: string;

  // Cantidades (soporte multi-unidad)
  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String })
  selectedUnit?: string; // Ej: "kg", "g", "lb"

  @Prop({ type: Number })
  conversionFactor?: number;

  @Prop({ type: Number })
  quantityInBaseUnit?: number;

  // Precios
  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Number, required: true })
  costPrice: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  // Descuentos
  @Prop({ type: Number, default: 0 })
  discountPercentage: number;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @Prop({ type: String })
  discountReason?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  discountApprovedBy?: Types.ObjectId;

  // Impuestos
  @Prop({ type: Number, required: true })
  ivaAmount: number;

  @Prop({ type: Number, required: true })
  igtfAmount: number;

  @Prop({ type: Number, required: true })
  finalPrice: number;

  // Estado y metadatos
  @Prop({ type: String, required: true, default: "pending" })
  status: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: String, required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  customerName: string;

  // Array de items anidados
  @Prop({ type: [OrderItemSchema] })
  items: OrderItem[];

  // Totales
  @Prop({ type: Number })
  subtotal: number;

  @Prop({ type: Number })
  ivaTotal: number;

  @Prop({ type: Number })
  igtfTotal: number;

  @Prop({ type: Number })
  totalAmount: number;

  // Estados
  @Prop({
    type: String,
    enum: ["draft", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  })
  status: string;

  @Prop({
    type: String,
    enum: ["pending", "partial", "paid", "overpaid", "refunded"],
    default: "pending",
  })
  paymentStatus: string;

  // Tenancy
  @Prop({ type: String, required: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
```

### 3.3 Conversión ObjectId vs String

**En Schemas (BD):**
```typescript
@Prop({ type: Types.ObjectId, ref: "Product" })
productId: Types.ObjectId;  // Se almacena como ObjectId en BD
```

**En DTOs (API):**
```typescript
@IsMongoId()
productId: string;  // Llega como string del cliente
```

**En Servicios (transformación):**
```typescript
// Convertir string a ObjectId:
const productObjectId = new Types.ObjectId(itemDto.productId);

// Convertir ObjectId a string:
const stringId = savedOrder._id.toString();

// En eventos y respuestas:
this.eventEmitter.emit("order.created", {
  orderId: savedOrder._id.toString(),  // Convertir a string
  items: savedOrder.items.map((item) => ({
    productId: item.productId.toString(),
  })),
});

// Al retornar:
return savedOrder.toObject();  // Convierte todos los ObjectIds a strings automáticamente
```

### 3.4 Relaciones Entre Entidades

```typescript
// 1-a-muchos: Order -> OrderItems
@Prop({ type: [OrderItemSchema] })
items: OrderItem[];

// Muchos-a-1: OrderItem -> Product (referencia)
@Prop({ type: Types.ObjectId, ref: "Product", required: true })
productId: Types.ObjectId;

// Muchos-a-muchos: Order -> Payments
// Se maneja con array de referencias
@Prop({ type: [Types.ObjectId], ref: "Payment" })
paymentIds?: Types.ObjectId[];

// Populating en queries:
await this.orderModel
  .findById(id)
  .populate("customerId", "name email")
  .populate("payments")
  .populate("assignedTo", "firstName lastName")
  .exec();
```

---

## 4. PATRONES DE TRANSFORMACIÓN

### 4.1 @Type para Conversión

```typescript
// Conversión de tipos básicos
export class RegisterPaymentDto {
  @Type(() => Date)
  date: Date;  // String JSON -> Date

  @Type(() => Number)
  amount: number;  // String URL -> Number

  @Type(() => Boolean)
  isConfirmed: boolean;
}
```

### 4.2 @Transform para Lógica Personalizada

```typescript
// Transformar durante deserialización
export class WorkCenterDto {
  @Transform(({ value }) => parseInt(value, 10))
  capacity: number;

  @Transform(({ value }) => value === "true" || value === true)
  isActive: boolean;

  @Transform(({ value }) => value?.trim?.() || value)
  name: string;
}
```

### 4.3 Sanitización (Decoradores Personalizados)

```typescript
// En decorators/sanitize.decorator.ts
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== "string") return value;

    const sanitized = sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    });

    return sanitized.trim();
  });
}

export function SanitizeText() {
  return Transform(({ value }) => {
    if (typeof value !== "string") return value;

    // Permite saltos de línea
    const sanitized = sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    });

    return sanitized.replace(/^\s+|\s+$/g, "");
  });
}

// Uso en DTOs:
export class CreateOrderDto {
  @IsString()
  @SanitizeString()
  customerName: string;

  @IsString()
  @SanitizeText()
  notes: string;
}
```

### 4.4 Conversión en Servicios

```typescript
// 1. Entrada (string -> ObjectId)
async create(dto: CreateOrderDto, user: any) {
  const productIds = dto.items.map(i => new Types.ObjectId(i.productId));
  const products = await this.productModel.find({
    _id: { $in: productIds }
  });

  // 2. Comparación de ObjectIds
  const product = products.find(
    (p) => p._id.toString() === itemDto.productId  // Comparar como strings
  );

  // 3. Salida (ObjectId -> string)
  const order = new this.orderModel(orderData);
  const savedOrder = await order.save();

  // Emitir como strings
  this.eventEmitter.emit("order.created", {
    orderId: savedOrder._id.toString(),
    items: savedOrder.items.map((item) => ({
      productId: item.productId.toString(),
    })),
  });

  // Retornar como objeto plano (ObjectIds se convierten a strings)
  return savedOrder.toObject();
}
```

---

## 5. PATRONES DE SERVICIOS

### 5.1 Estructura Típica de Servicio

```typescript
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly paymentsService: PaymentsService,
    private readonly eventEmitter: EventEmitter2,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    user: any,
  ): Promise<OrderDocument> {
    // Lógica de creación
  }

  async findAll(query: OrderQueryDto, tenantId: string) {
    // Búsqueda con filtrado
  }

  async findOne(id: string, tenantId: string): Promise<OrderDocument | null> {
    // Búsqueda única
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    user: any,
  ): Promise<OrderDocument | null> {
    // Actualización
  }

  private buildOrderQuery(query: OrderQueryDto, tenantId: string) {
    // Métodos privados para lógica compartida
  }
}
```

### 5.2 Manejo de Errores

```typescript
async create(createOrderDto: CreateOrderDto, user: any) {
  // Validación de existencia
  const tenant = await this.tenantModel.findById(user.tenantId);
  if (!tenant) {
    throw new NotFoundException("Tenant no encontrado");
  }

  // Validación de límites
  if (tenant.usage.currentOrders >= tenant.limits.maxOrders) {
    throw new BadRequestException(
      "Límite de órdenes alcanzado o tenant no encontrado.",
    );
  }

  // Validación de datos
  let customer: CustomerDocument | null = null;
  if (customerId) {
    customer = await this.customerModel.findById(customerId).exec();
  } else if (customerRif && customerName) {
    // lógica...
  }

  if (!customer) {
    throw new BadRequestException(
      "Se debe proporcionar un ID de cliente o los datos para crear uno nuevo.",
    );
  }

  // Try-catch para operaciones externas
  try {
    const deliveryCostResult = await this.deliveryService.calculateDeliveryCost({
      // ...
    });
  } catch (error) {
    this.logger.warn(`Error calculating delivery cost: ${error.message}`);
    // Continuar sin fallar la orden
  }

  // Try-catch para contabilidad no bloqueante
  setImmediate(async () => {
    try {
      await this.accountingService.createJournalEntryForSale(
        savedOrder,
        user.tenantId,
      );
    } catch (accountingError) {
      this.logger.error(
        `Error en la contabilidad automática`,
        accountingError.stack,
      );
    }
  });
}
```

### 5.3 Transacciones

```typescript
// 1. Inyectar conexión
@InjectConnection() private readonly connection: Connection,

// 2. Crear sesión y ejecutar operaciones
async createWithTransaction(dto: CreateProductDto, user: any) {
  const session = await this.connection.startSession();
  session.startTransaction();

  try {
    const product = new this.productModel(productData);
    const savedProduct = await product.save({ session });

    // Todas las operaciones usan la sesión
    await this.inventoryService.create(inventoryDto, user, session);

    await session.commitTransaction();
    return savedProduct;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

// 3. Recibir sesión como parámetro
async createMovementRecord(
  movementDto: any,
  user: any,
  session?: ClientSession,
) {
  const movement = new this.movementModel(movementDto);
  return await movement.save({ session });  // session puede ser null
}
```

### 5.4 Inyección de Dependencias

```typescript
constructor(
  // Modelos
  @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,

  // Servicios
  private readonly inventoryService: InventoryService,
  private readonly accountingService: AccountingService,
  private readonly paymentsService: PaymentsService,

  // Conexión
  @InjectConnection() private readonly connection: Connection,

  // EventEmitter
  private readonly eventEmitter: EventEmitter2,
) {}
```

### 5.5 Métodos de Búsqueda y Filtrado

```typescript
async findAll(query: OrderQueryDto, tenantId: string) {
  const { filter, sortOptions, page, limit } = this.buildOrderQuery(
    query,
    tenantId,
  );
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    this.orderModel
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate("customerId", "name")
      .populate("payments")
      .populate("assignedTo", "firstName lastName email")
      .exec(),
    this.orderModel.countDocuments(filter),
  ]);

  return {
    orders,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

private buildOrderQuery(query: OrderQueryDto, tenantId: string) {
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
  const andConditions: any[] = [];

  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;

  if (search) {
    const regex = new RegExp(this.escapeRegExp(search), "i");
    filter.$or = [
      { orderNumber: regex },
      { customerName: regex },
    ];
  }

  if (andConditions.length) {
    filter.$and = andConditions;
  }

  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  return { filter, sortOptions, page, limit };
}

private escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

### 5.6 Operaciones Asincrónicas Optimizadas

```typescript
// Promise.all para paralelize operaciones independientes
const [orders, total] = await Promise.all([
  this.orderModel.find(filter).skip(skip).limit(limit).exec(),
  this.orderModel.countDocuments(filter),
]);

// setImmediate para no bloquear respuesta
setImmediate(async () => {
  try {
    await this.accountingService.createJournalEntryForSale(
      savedOrder,
      user.tenantId,
    );
  } catch (error) {
    this.logger.error("Error en contabilidad", error.stack);
  }
});

// Manejo de errores sin fallar
try {
  const result = await this.deliveryService.calculateDeliveryCost(data);
} catch (error) {
  this.logger.warn(`Advertencia: ${error.message}`);
  // Continuar con valor por defecto
}
```

---

## 6. REGLAS Y CONVENCIONES CRÍTICAS

### 6.1 Tenancy (Multi-tenant)

```typescript
// Siempre filtrar por tenantId
const filter: any = { tenantId };

@Prop({ type: String, required: true })
tenantId: string;  // En cada schema

// Obtener del contexto de usuario
const user = request.user;
const tenantId = user.tenantId;  // Asegurado por TenantGuard
```

### 6.2 Índices en Schemas

```typescript
// Índices simples
PaymentSchema.index({ tenantId: 1, paymentType: 1, date: -1 });
PaymentSchema.index({ tenantId: 1, orderId: 1 });

// El primero casi siempre incluye tenantId
// Orden importa: campos más frecuentes primero
```

### 6.3 Tipos de Datos

```typescript
// Fechas
@Prop({ type: Date })
createdAt: Date;

// Objetos anidados
@Prop({ type: Object })
metadata?: Record<string, any>;

// Arrays
@Prop({ type: [String] })
tags: string[];

@Prop({ type: [OrderItemSchema] })
items: OrderItem[];

// Enums
@Prop({
  type: String,
  enum: ["draft", "pending", "confirmed"],
  default: "draft",
})
status: string;
```

### 6.4 Validación en Cascada

```typescript
// Nivel 1: Validadores básicos
@IsString()
@IsNotEmpty()
name: string;

// Nivel 2: Transformación de tipos
@Type(() => Date)
date: Date;

// Nivel 3: Validadores personalizados
@Validate(IsContactMandatoryForSupplier)
contacts: CustomerContactDto[];

// Nivel 4: Anidamiento
@ValidateNested({ each: true })
@Type(() => CreateOrderItemDto)
items: CreateOrderItemDto[];
```

### 6.5 Controllers

```typescript
@Controller("orders")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Permissions("orders_create")
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    try {
      const order = await this.ordersService.create(createOrderDto, req.user);
      return {
        success: true,
        message: "Orden creada exitosamente",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear la orden",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permissions("orders_read")
  async findAll(@Query() query: OrderQueryDto, @Request() req) {
    return this.ordersService.findAll(query, req.user.tenantId);
  }

  @Get(":id")
  @Permissions("orders_read")
  async findOne(@Param("id") id: string, @Request() req) {
    return this.ordersService.findOne(id, req.user.tenantId);
  }
}
```

---

## 7. PATRONES AVANZADOS

### 7.1 Event Emitter para Desacoplamiento

```typescript
// Emitir evento
this.eventEmitter.emit("order.created", {
  orderId: savedOrder._id.toString(),
  tenantId: user.tenantId,
  items: savedOrder.items.map((item) => ({
    productId: item.productId.toString(),
    quantity: item.quantityInBaseUnit ?? item.quantity,
  })),
});

// Escuchar evento en otro servicio
@OnEvent("order.created")
async handleOrderCreated(payload: any) {
  // Procesar orden creada
  await this.deductConsumables(payload);
}
```

### 7.2 Servicios Inyectados

```typescript
// Patrón: Servicios de diferentes módulos se inyectan mutuamente
export class OrdersService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly paymentsService: PaymentsService,
    private readonly deliveryService: DeliveryService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async create(dto: CreateOrderDto, user: any) {
    // 1. Reservar inventario
    await this.inventoryService.reserveInventory(reservation, user);

    // 2. Crear asientos contables
    await this.accountingService.createJournalEntryForSale(order, user.tenantId);

    // 3. Registrar pagos
    await this.paymentsService.create(paymentDto, user);

    // 4. Calcular envío
    const shippingCost = await this.deliveryService.calculateDeliveryCost(data);

    // 5. Obtener tasa de cambio
    const rate = await this.exchangeRateService.getBCVRate();
  }
}
```

### 7.3 Métodos Auxiliares Privados

```typescript
private resolveVariant(product: ProductDocument, itemDto: CreateOrderItemDto) {
  if (itemDto.variantId && product.variants?.length) {
    return product.variants.find((v: any) => v._id?.toString() === itemDto.variantId);
  }
  if (itemDto.variantSku && product.variants?.length) {
    return product.variants.find((v: any) => v.sku === itemDto.variantSku);
  }
  return product.variants?.[0];
}

private buildAttributeSummary(attributes: Record<string, any>): string | undefined {
  const entries = Object.entries(attributes || {}).filter(
    ([, value]) => value !== undefined && value !== null && `${value}`.trim().length > 0,
  );
  if (!entries.length) return undefined;
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}
```

---

## 8. CHECKLIST PARA NUEVOS MÓDULOS

Cuando crees un nuevo módulo, asegúrate de:

- [ ] Crear schema con @Schema y exportar Document type
- [ ] Añadir tenantId a filtros de búsqueda siempre
- [ ] Crear DTOs con validadores apropiados
- [ ] Usar @Type y @Transform donde sea necesario
- [ ] Implementar servicio con CRUD básico
- [ ] Crear controller con @UseGuards y @Permissions
- [ ] Manejar errores con try-catch
- [ ] Usar transactions si hay múltiples escrituras
- [ ] Inyectar dependencias externas si necesario
- [ ] Emitir eventos para operaciones importantes
- [ ] Retornar .toObject() para ObjectIds automáticos
- [ ] Documentar con @ApiProperty y @ApiPropertyOptional
- [ ] Crear índices en schemas
- [ ] Exportar servicio desde módulo para reutilización

