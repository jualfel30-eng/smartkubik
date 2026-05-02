# REFERENCIAS DE CÓDIGO - SISTEMA DE IMPUESTOS

Documento que mapea exactamente dónde encontrar cada componente del sistema de impuestos en el código.

---

## 1. CONFIGURACIÓN DE TASAS Y PARÁMETROS

### Tasas de Impuestos en Tenant

**Archivo**: `FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/schemas/tenant.schema.ts`

**Líneas**: 35-42

```typescript
@Prop({ type: Object })
taxes: {
  ivaRate: number;           // 16
  igtfRate: number;          // 3
  retentionRates: {
    iva: number;
    islr: number;
  };
};
```

**Ubicación en BD**: `tenants.settings.taxes`

---

## 2. IVA - IMPUESTO AL VALOR AGREGADO

### Definición en Producto

**Archivo**: `food-inventory-saas/src/schemas/product.schema.ts`

**Línea**: 226-227

```typescript
@Prop({ type: Boolean, required: true, default: true })
ivaApplicable: boolean;
```

**Ubicación en BD**: `products.ivaApplicable`

---

### Cálculo del IVA en Órdenes

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

**Línea**: 209

```typescript
const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
```

**Contexto**: En el método `create()` de la clase `OrdersService`, al procesar cada item

---

### Registro en Order Item

**Archivo**: `food-inventory-saas/src/schemas/order.schema.ts`

**Líneas**: 113-120

```typescript
@Prop({ type: Number, required: true })
ivaAmount: number;           // IVA por este item

@Prop({ type: Number, required: true })
igtfAmount: number;          // IGTF por este item (siempre 0 a nivel de item)

@Prop({ type: Number, required: true })
finalPrice: number;          // Precio final
```

**Ubicación en BD**: `orders.items[].ivaAmount`

---

### Total de IVA en Orden

**Archivo**: `food-inventory-saas/src/schemas/order.schema.ts`

**Línea**: 205

```typescript
@Prop({ type: Number, required: true })
ivaTotal: number;
```

**Ubicación en BD**: `orders.ivaTotal`

**Cálculo**: Sumatoria de todos los `ivaAmount` de los items

---

## 3. IGTF - IMPUESTO A GRANDES TRANSACCIONES FINANCIERAS

### Métodos de Pago Sujetos a IGTF

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

**Líneas**: 61-87 (en el método `getPaymentMethods()`)

```typescript
const baseMethods = [
  { id: "efectivo_usd", name: "Efectivo (USD)", igtfApplicable: true },
  { id: "transferencia_usd", name: "Transferencia (USD)", igtfApplicable: true },
  { id: "zelle_usd", name: "Zelle (USD)", igtfApplicable: true },
  { id: "efectivo_ves", name: "Efectivo (VES)", igtfApplicable: false },
  { id: "transferencia_ves", name: "Transferencia (VES)", igtfApplicable: false },
  { id: "pago_movil_ves", name: "Pago Móvil (VES)", igtfApplicable: false },
  { id: "pos_ves", name: "Punto de Venta (VES)", igtfApplicable: false },
  { id: "tarjeta_ves", name: "Tarjeta (VES)", igtfApplicable: false },
  { id: "pago_mixto", name: "Pago Mixto", igtfApplicable: false },
];
```

**Ubicación en BD**: `tenants.settings.paymentMethods[]`

---

### Cálculo del IGTF

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

**Línea**: 300-303 (en el método `create()`)

```typescript
const foreignCurrencyPaymentAmount = (payments || [])
  .filter((p) => p.method.includes("_usd"))
  .reduce((sum, p) => sum + p.amount, 0);
const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
```

**Lógica**: 
1. Filtra pagos cuyo `method` contiene "_usd"
2. Suma los montos
3. Multiplica por 0.03 (3%)

---

### Total de IGTF en Orden

**Archivo**: `food-inventory-saas/src/schemas/order.schema.ts`

**Línea**: 208

```typescript
@Prop({ type: Number, required: true })
igtfTotal: number;
```

**Ubicación en BD**: `orders.igtfTotal`

---

## 4. INFORMACIÓN FISCAL DEL CLIENTE

### DTO para Información Fiscal

**Archivo**: `food-inventory-saas/src/dto/customer.dto.ts`

**Líneas**: 46-67

```typescript
export class CustomerTaxInfoDto {
  @ApiProperty({
    description: "Número de Identificación Fiscal (Cédula o RIF)",
  })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  taxId: string;

  @ApiProperty({
    description: "Tipo de Identificación",
    enum: ["V", "E", "J", "G"],
  })
  @IsEnum(["V", "E", "J", "G"])
  taxType: string;

  @ApiPropertyOptional({ description: "Nombre fiscal o razón social" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  taxName?: string;
}
```

**Ubicación en BD**: `customers.taxInfo`

---

### Registro en Orden

**Archivo**: `food-inventory-saas/src/schemas/order.schema.ts`

**Líneas**: 323-330

```typescript
@Prop({ type: Object })
taxInfo: {
  customerTaxId?: string;
  customerTaxType?: string;
  invoiceRequired: boolean;
  invoiceNumber?: string;
  invoiceDate?: Date;
};
```

**Ubicación en BD**: `orders.taxInfo`

---

## 5. CONTABILIZACIÓN DE IMPUESTOS

### Asiento de Venta (con IVA e IGTF)

**Archivo**: `food-inventory-saas/src/modules/accounting/accounting.service.ts`

**Líneas**: 239-344 (método `createJournalEntryForSale()`)

**Extracto clave (líneas 304-312)**:

```typescript
const totalTax = order.ivaTotal + order.igtfTotal;
if (totalTax > 0) {
  lines.push({
    accountId: taxPayableAcc._id.toString(),
    debit: 0,
    credit: totalTax,
    description: `Impuestos (IVA/IGTF) por venta ${order.orderNumber}`,
  });
}
```

**Cuenta Contable Usada**: 
- Código: `2102`
- Nombre: "Impuestos por Pagar"
- Naturaleza: Crédito (Pasivo)

---

### Asiento de COGS (Costo de Mercancía Vendida)

**Archivo**: `food-inventory-saas/src/modules/accounting/accounting.service.ts`

**Líneas**: 346-424 (método `createJournalEntryForCOGS()`)

**Lógica de Cálculo (líneas 354-357)**:

```typescript
const totalCost = order.items.reduce(
  (sum, item) => sum + (item.costPrice || 0) * item.quantity,
  0,
);
```

**Cuentas Contables**:
- Deuda: Código `5101` - "Costo de Mercancía Vendida" (Gasto)
- Crédito: Código `1103` - "Inventario" (Activo)

---

### Ejecución Asincrónica

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

**Líneas**: 422-439 (en el método `create()`)

```typescript
setImmediate(async () => {
  try {
    await this.accountingService.createJournalEntryForSale(
      savedOrder,
      user.tenantId,
    );
    await this.accountingService.createJournalEntryForCOGS(
      savedOrder,
      user.tenantId,
    );
  } catch (accountingError) {
    this.logger.error(
      `Error en la contabilidad automática para la orden ${savedOrder.orderNumber}`,
      accountingError.stack,
    );
  }
});
```

**Nota**: Se ejecuta después de crear la orden (no bloquea)

---

## 6. DTOs Y VALIDACIÓN

### Order DTO - Campos de Impuestos

**Archivo**: `food-inventory-saas/src/dto/order.dto.ts`

**Líneas**: 159-162 (taxType)

```typescript
@ApiPropertyOptional({ description: "Tipo de documento fiscal (V, E, J, G)" })
@IsOptional()
@IsEnum(["V", "E", "J", "G"])
taxType?: string;
```

**Líneas**: 205-213 (IVA e IGTF)

```typescript
@ApiPropertyOptional({ description: "Monto total de IVA de la orden" })
@IsOptional()
@IsNumber()
ivaTotal?: number;

@ApiPropertyOptional({ description: "Monto total de IGTF de la orden" })
@IsOptional()
@IsNumber()
igtfTotal?: number;
```

---

### Product DTO - Campos Fiscales

**Archivo**: `food-inventory-saas/src/dto/product.dto.ts`

**Líneas**: 381-394

```typescript
@ApiPropertyOptional({ description: "Aplica IVA 16%", default: true })
@IsOptional()
@IsBoolean()
ivaApplicable?: boolean;

@ApiPropertyOptional({ description: "Exento de IGTF 3%", default: false })
@IsOptional()
@IsBoolean()
igtfExempt?: boolean;

@ApiProperty({ description: "Categoría fiscal del producto" })
@IsString()
@IsNotEmpty()
taxCategory: string;
```

---

### Tax Info DTO

**Archivo**: `food-inventory-saas/src/dto/tax-info.dto.ts`

**Líneas**: 1-19 (completo)

```typescript
import { IsString, IsOptional, IsBoolean } from "class-validator";

export class TaxInfoDto {
  @IsString()
  @IsOptional()
  rif?: string;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsBoolean()
  @IsOptional()
  isRetentionAgent?: boolean;

  @IsString()
  @IsOptional()
  taxRegime?: string;
}
```

---

## 7. REPORTES

### Reporte A/R Aging

**Archivo**: `food-inventory-saas/src/modules/reports/reports.service.ts`

**Líneas**: 43-126 (método `generateAccountsReceivableAging()`)

**Lógica de Filtro (líneas 49-56)**:

```typescript
const unpaidOrders = await this.orderModel
  .find({
    tenantId: new Types.ObjectId(tenantId),
    paymentStatus: { $in: ["pending", "partial"] },
    createdAt: { $lte: endDate },
  })
  .populate("customerId", "name")
  .exec();
```

**Estructura de Salida (líneas 77-87)**:

```typescript
report.set(customerId, {
  customerId,
  customerName,
  totalDue: 0,
  current: 0,
  "1-30": 0,
  "31-60": 0,
  "61-90": 0,
  ">90": 0,
});
```

---

### DTO para Reportes

**Archivo**: `food-inventory-saas/src/modules/reports/dto/reports.dto.ts`

**Líneas**: 35-39

```typescript
export class AccountsReceivableReportQueryDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
```

---

## 8. MÉTODOS Y FUNCIONES CLAVE

### Crear Orden con Impuestos

**Método**: `OrdersService.create()`

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

**Línea Inicio**: 89

**Procesos**:
- Líneas 144-252: Procesar items y calcular IVA
- Línea 303: Calcular IGTF
- Línea 304-309: Calcular total
- Línea 386: Guardar orden
- Líneas 422-439: Crear asientos contables

---

### Obtener Métodos de Pago

**Método**: `OrdersService.getPaymentMethods()`

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

**Línea Inicio**: 61

**Retorna**: Array de métodos con flag `igtfApplicable`

---

### Crear Asiento de Venta

**Método**: `AccountingService.createJournalEntryForSale()`

**Archivo**: `food-inventory-saas/src/modules/accounting/accounting.service.ts`

**Línea Inicio**: 239

**Lógica**: Crea asiento con ingresos, envío y impuestos

---

### Crear Asiento de COGS

**Método**: `AccountingService.createJournalEntryForCOGS()`

**Archivo**: `food-inventory-saas/src/modules/accounting/accounting.service.ts`

**Línea Inicio**: 346

**Lógica**: Crea asiento de costo de mercancía

---

## 9. BÚSQUEDA Y VALIDACIÓN

### Encontrar Cuenta Contable por Código

**Método**: `AccountingService.findAccountByCode()`

**Archivo**: `food-inventory-saas/src/modules/accounting/accounting.service.ts`

**Línea Inicio**: 193

```typescript
private async findAccountByCode(
  code: string,
  tenantId: string,
): Promise<ChartOfAccountsDocument>
```

**Uso**: Busca cuentas con códigos como `2102`, `4101`, `4102`, etc.

---

## 10. ÍNDICES DE BASE DE DATOS

### Índice de Órdenes por Impuestos

**Archivo**: `food-inventory-saas/src/schemas/order.schema.ts`

**Línea**: 368-377

```typescript
OrderSchema.index({ paymentStatus: 1, tenantId: 1 });
OrderSchema.index({ totalAmount: -1, createdAt: -1, tenantId: 1 });
```

**Propósito**: Optimizar búsquedas de órdenes impagadas y por monto total

---

## 11. COMPOSITE PRODUCT DTO

**Archivo**: `food-inventory-saas/src/dto/composite.dto.ts`

**Campos Fiscales**:

```typescript
@IsBoolean() ivaApplicable: boolean;
@IsString() @IsNotEmpty() taxCategory: string;
```

---

## 12. RUTAS Y CONTROLADORES

### Crear Orden

**Archivo**: `food-inventory-saas/src/modules/orders/orders-public.controller.ts`

**Método HTTP**: `POST /orders`

**Usa**: `OrdersService.create()`

**DTO**: `CreateOrderDto`

---

### Obtener Métodos de Pago

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

**Método HTTP**: `GET /orders/payment-methods`

**Usa**: `OrdersService.getPaymentMethods()`

---

## 13. VARIABLES DE ENTORNO Y CONFIG

### Ubicación de Configuración de Features

**Archivo**: `food-inventory-saas/src/config/features.config.ts`

**Nota**: Activa/desactiva módulos del sistema

---

## 14. UTILIDADES DE CONVERSIÓN

### Unit Conversion Util

**Archivo**: `food-inventory-saas/src/utils/unit-conversion.util.ts`

**Uso**: Validar unidades de venta y conversiones

**Impacto en Impuestos**: Afecta el cálculo de cantidad base para IVA

---

## 15. SERVICIOS RELACIONADOS

### Exchange Rate Service

**Archivo**: `food-inventory-saas/src/modules/exchange-rate/exchange-rate.service.ts`

**Uso**: Obtener tasa BCV para calcular `totalAmountVes`

**Línea en OrdersService**: 314-321

---

### Discount Service

**Archivo**: `food-inventory-saas/src/modules/orders/services/discount.service.ts`

**Uso**: Calcular descuentos antes de aplicar IVA

**Impacto**: Reduce la base de cálculo del IVA

---

## CONCLUSIÓN

Este documento mapea **exactamente** dónde encontrar cada componente del sistema de impuestos. Todos los archivos están ubicados en:

```
FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/
```

Los archivos clave son:
- `schemas/tenant.schema.ts` - Configuración
- `schemas/product.schema.ts` - Control por producto
- `schemas/order.schema.ts` - Datos de órdenes
- `modules/orders/orders.service.ts` - Cálculo
- `modules/accounting/accounting.service.ts` - Contabilidad
- `modules/reports/reports.service.ts` - Reportes

