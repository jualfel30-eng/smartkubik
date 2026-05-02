# ANÁLISIS COMPLETO DEL SISTEMA DE IMPUESTOS EN EL ERP

## Fecha del Análisis
**13 de Noviembre de 2025**

---

## 1. RESUMEN EJECUTIVO

El ERP implementa un sistema de gestión de impuestos específicamente diseñado para el contexto fiscal venezolano, incluyendo:

- **IVA (Impuesto al Valor Agregado)**: 16% (configuración estándar)
- **IGTF (Impuesto a Grandes Transacciones Financieras)**: 3% (solo en transacciones en USD)
- **Retenciones**: Estructura base implementada pero no completamente activa
- **Configuración Centralizada**: Definida en nivel de Tenant

---

## 2. ARQUITECTURA DEL SISTEMA DE IMPUESTOS

### 2.1 Configuración de Impuestos a Nivel de Tenant

**Archivo**: `/src/schemas/tenant.schema.ts` (líneas 35-42)

```typescript
@Prop({ type: Object })
taxes: {
  ivaRate: number;           // Tasa de IVA (16% por defecto)
  igtfRate: number;          // Tasa de IGTF (3% por defecto)
  retentionRates: {
    iva: number;             // Retención sobre IVA
    islr: number;            // Retención sobre Impuesto a la Renta
  };
};
```

**Ubicación en la Base de Datos**: 
- Se almacena en el documento `Tenant` bajo `settings.taxes`
- Permite configuración independiente por cada tenant/empresa

### 2.2 Información Fiscal del Tenant

**Archivo**: `/src/schemas/tenant.schema.ts` (líneas 184-190)

```typescript
@Prop({ type: Object })
taxInfo: {
  rif: string;                    // RIF (Registro de Información Fiscal)
  businessName: string;           // Razón Social
  isRetentionAgent: boolean;      // ¿Es agente de retención?
  taxRegime: string;              // Régimen fiscal
};
```

---

## 3. IVA - IMPUESTO AL VALOR AGREGADO

### 3.1 Configuración del IVA

**Tasa Estándar**: 16%

**Aplicación por Producto**:
- `ivaApplicable`: Boolean en el esquema `Product` (línea 226-227)
- Por defecto: `true` (se aplica IVA)

```typescript
@Prop({ type: Boolean, required: true, default: true })
ivaApplicable: boolean;
```

**Cálculo del IVA en Órdenes**:

**Archivo**: `/src/modules/orders/orders.service.ts` (línea 209)

```typescript
// Cálculo simple: IVA = Total de Precio * 0.16
const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
```

### 3.2 Registro de IVA por Item

**Esquema de OrderItem**: `/src/schemas/order.schema.ts` (líneas 113-120)

```typescript
@Prop({ type: Number, required: true })
ivaAmount: number;           // IVA calculado para este item

@Prop({ type: Number, required: true })
igtfAmount: number;          // IGTF calculado para este item

@Prop({ type: Number, required: true })
finalPrice: number;          // Precio final (incluye impuestos)
```

### 3.3 IVA a Nivel de Orden

**Esquema de Order**: `/src/schemas/order.schema.ts` (líneas 204-208)

```typescript
@Prop({ type: Number, required: true })
subtotal: number;            // Subtotal sin impuestos

@Prop({ type: Number, required: true })
ivaTotal: number;            // IVA total acumulado de todos los items

@Prop({ type: Number, required: true })
igtfTotal: number;           // IGTF total (solo pagos en USD)
```

### 3.4 Contabilización del IVA

**Archivo**: `/src/modules/accounting/accounting.service.ts` (líneas 304-312)

```typescript
// En el asiento de venta automático
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

**Cuenta Contable**: 
- **Código**: `2102`
- **Nombre**: "Impuestos por Pagar" (Pasivo)
- **Naturaleza**: Crédito (cuando se generan impuestos)

---

## 4. IGTF - IMPUESTO A GRANDES TRANSACCIONES FINANCIERAS

### 4.1 Configuración del IGTF

**Tasa**: 3%

**Aplicación**: SOLO en transacciones donde se paga en **divisa extranjera (USD)**

**Métodos de Pago Sujetos a IGTF**:

**Archivo**: `/src/modules/orders/orders.service.ts` (líneas 66-84)

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

### 4.2 Cálculo del IGTF

**Archivo**: `/src/modules/orders/orders.service.ts` (línea 303)

**Fórmula**:
```
IGTF Total = Suma de montos pagados en USD × 0.03
```

**Implementación**:

```typescript
const foreignCurrencyPaymentAmount = (payments || [])
  .filter((p) => p.method.includes("_usd"))
  .reduce((sum, p) => sum + p.amount, 0);

const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
```

### 4.3 DTO del IGTF

**Archivo**: `/src/dto/order.dto.ts` (líneas 205-213)

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

### 4.4 Casos de No Aplicación del IGTF

El IGTF **NO se aplica** en:
- Pagos en efectivo en VES
- Transferencias en VES
- Transacciones internas en VES
- Pagos mixtos donde no hay USD

---

## 5. CONFIGURACIÓN DE IMPUESTOS POR PRODUCTO

### 5.1 Campos de Control Fiscal

**Archivo**: `/src/schemas/product.schema.ts` (líneas 226-230)

```typescript
@Prop({ type: Boolean, required: true, default: true })
ivaApplicable: boolean;        // Aplica IVA 16%

@Prop({ type: Boolean, required: true, default: false })
igtfExempt: boolean;           // Exento de IGTF 3%

@Prop({ type: String, required: true })
taxCategory: string;           // Categoría fiscal del producto
```

### 5.2 DTO del Producto

**Archivo**: `/src/dto/product.dto.ts` (líneas 381-394)

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

## 6. INFORMACIÓN FISCAL DEL CLIENTE

### 6.1 Estructura de Datos Fiscal

**Archivo**: `/src/dto/customer.dto.ts` (líneas 46-67)

```typescript
export class CustomerTaxInfoDto {
  @ApiProperty({
    description: "Número de Identificación Fiscal (Cédula o RIF)",
  })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  taxId: string;                    // RIF o Cédula

  @ApiProperty({
    description: "Tipo de Identificación",
    enum: ["V", "E", "J", "G"],
  })
  @IsEnum(["V", "E", "J", "G"])
  taxType: string;                  // V=Venezolano, E=Extranjero, J=Jurídica, G=Gubernamental

  @ApiPropertyOptional({ description: "Nombre fiscal o razón social" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  taxName?: string;
}
```

### 6.2 Registro en Órdenes

**Archivo**: `/src/schemas/order.schema.ts` (líneas 323-330)

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

---

## 7. CÁLCULO DE TOTALES EN ÓRDENES

### 7.1 Flujo de Cálculo

**Archivo**: `/src/modules/orders/orders.service.ts` (líneas 148-252)

**Proceso**:

1. **Para cada item en la orden**:
   ```
   Precio Total = Cantidad × Precio Unitario
   ```

2. **Aplicar descuentos**:
   ```
   Precio Final = Precio Total - Descuento Aplicado
   ```

3. **Calcular IVA por item**:
   ```
   IVA Item = Precio Final × 0.16 (si ivaApplicable = true)
   ```

4. **Acumular subtotal**:
   ```
   Subtotal Total = Σ(Precio Final de todos los items)
   IVA Total = Σ(IVA de todos los items)
   ```

5. **Agregar costos adicionales**:
   ```
   Monto Envío = Costo de Envío
   Descuento General = Descuento de orden
   ```

6. **Calcular IGTF**:
   ```
   IGTF Total = Σ(Pagos en USD) × 0.03
   ```

7. **Total Final**:
   ```
   Total = Subtotal + IVA Total + IGTF Total + Envío - Descuento
   ```

### 7.2 Ejemplo Numérico

Orden con los siguientes items:
- Item 1: Producto A, Cantidad 2, Precio Unitario 100 USD, IVA Aplicable
- Item 2: Producto B, Cantidad 1, Precio Unitario 50 USD, SIN IVA

```
Cálculo:
--------
Item 1: 2 × 100 = 200 USD
  IVA: 200 × 0.16 = 32 USD

Item 2: 1 × 50 = 50 USD
  IVA: 0 USD (no aplica)

Subtotal: 200 + 50 = 250 USD
IVA Total: 32 + 0 = 32 USD

Si pago en USD (efectivo_usd):
  IGTF: 250 × 0.03 = 7.50 USD

TOTAL FINAL: 250 + 32 + 7.50 = 289.50 USD
```

---

## 8. RETENCIONES

### 8.1 Estructura de Retenciones

**Archivo**: `/src/schemas/tenant.schema.ts` (líneas 38-41)

```typescript
retentionRates: {
  iva: number;     // Retención sobre IVA (porcentaje)
  islr: number;    // Retención sobre Impuesto a la Renta (porcentaje)
};
```

### 8.2 Estado Actual

**Implementación**: Estructura base definida pero **NO COMPLETAMENTE ACTIVA**

- Los campos de configuración existen en el Tenant
- El DTO básico existe: `/src/dto/tax-info.dto.ts`
- **Falta**: Lógica de cálculo y registro en transacciones

**Campos en TaxInfoDto**:

```typescript
@IsString()
@IsOptional()
rif?: string;

@IsString()
@IsOptional()
businessName?: string;

@IsBoolean()
@IsOptional()
isRetentionAgent?: boolean;    // Identifica agentes de retención

@IsString()
@IsOptional()
taxRegime?: string;            // Régimen fiscal (si aplica)
```

---

## 9. CONTABILIZACIÓN DE IMPUESTOS

### 9.1 Asiento Automático de Venta (con Impuestos)

**Archivo**: `/src/modules/accounting/accounting.service.ts` (líneas 239-344)

**Estructura del Asiento**:

```
DEBE:
  1102 - Cuentas por Cobrar          XXX.XX (total de la orden)
  [4103 - Descuentos sobre Venta]    XXX.XX (si aplica)

HABER:
  4101 - Ingresos por Venta          XXX.XX (subtotal)
  4102 - Ingresos por Envío          XXX.XX (si aplica)
  2102 - Impuestos por Pagar         XXX.XX (IVA + IGTF)
```

### 9.2 Plan de Cuentas para Impuestos

**Cuentas Utilizadas**:

| Código | Nombre | Tipo | Uso |
|--------|--------|------|-----|
| 2102 | Impuestos por Pagar | Pasivo | Crédito de IVA y IGTF generados |
| 4101 | Ingresos por Venta | Ingreso | Venta de bienes/servicios |
| 4102 | Ingresos por Envío | Ingreso | Cargo por envío |
| 4103 | Descuentos sobre Venta | Ingreso (contra) | Descuentos otorgados |

### 9.3 Asiento de COGS (Costo de Mercancía Vendida)

**Archivo**: `/src/modules/accounting/accounting.service.ts` (líneas 346-424)

```
DEBE:
  5101 - Costo de Mercancía Vendida   XXX.XX

HABER:
  1103 - Inventario                   XXX.XX
```

---

## 10. REPORTES DE IMPUESTOS

### 10.1 Reportes Disponibles

**Archivo**: `/src/modules/reports/reports.service.ts`

**Reportes Implementados**:

1. **Accounts Receivable Aging** (Antigüedad de Cuentas por Cobrar)
   - Agrupa órdenes impagadas
   - Categoriza por días vencidos
   - Incluye totales

2. **Appointments/Hospitality Reports**
   - Exportación en CSV y PDF
   - Filtración por rango de fechas

### 10.2 Estructura del Reporte A/R

```typescript
{
  asOfDate: "2025-11-13",
  data: [
    {
      customerId: "...",
      customerName: "...",
      totalDue: 1000.00,
      current: 500.00,
      "1-30": 300.00,
      "31-60": 200.00,
      "61-90": 0.00,
      ">90": 0.00
    }
  ],
  totals: {
    totalDue: 1000.00,
    current: 500.00,
    "1-30": 300.00,
    "31-60": 200.00,
    "61-90": 0.00,
    ">90": 0.00
  }
}
```

### 10.3 DTO para Reportes

**Archivo**: `/src/modules/reports/dto/reports.dto.ts`

```typescript
export class HospitalityAppointmentsReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  includeHousekeeping?: boolean;

  @IsOptional()
  @IsIn(["csv", "pdf"])
  format?: "csv" | "pdf";
}
```

---

## 11. MÉTODOS DE PAGO Y SUS IMPLICACIONES FISCALES

### 11.1 Matriz de Métodos de Pago

**Archivo**: `/src/modules/orders/orders.service.ts` (líneas 61-87)

| Método | ID | Divisa | IGTF |
|--------|-----|--------|------|
| Efectivo | efectivo_usd | USD | SÍ |
| Transferencia | transferencia_usd | USD | SÍ |
| Zelle | zelle_usd | USD | SÍ |
| Efectivo | efectivo_ves | VES | NO |
| Transferencia | transferencia_ves | VES | NO |
| Pago Móvil | pago_movil_ves | VES | NO |
| POS | pos_ves | VES | NO |
| Tarjeta | tarjeta_ves | VES | NO |
| Mixto | pago_mixto | Mixto | NO |

### 11.2 Configuración Dinámica de Métodos

Los métodos de pago pueden ser configurados a nivel de Tenant:

```typescript
settings.paymentMethods: [{
  id: "custom_method",
  name: "Método Personalizado",
  enabled: true,
  igtfApplicable: boolean  // Personalizable
}]
```

---

## 12. INTEGRACIÓN CON CONTABILIDAD

### 12.1 Flujo de Creación de Asientos Automáticos

**Archivo**: `/src/modules/orders/orders.service.ts` (líneas 422-439)

```typescript
// Se ejecuta de forma asíncrona após la creación de la orden
setImmediate(async () => {
  try {
    // 1. Crear asiento de venta (ingresos e impuestos)
    await this.accountingService.createJournalEntryForSale(
      savedOrder,
      user.tenantId,
    );
    
    // 2. Crear asiento de COGS (costo de mercancía vendida)
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

### 12.2 Validación de Cuentas

Antes de crear asientos, el sistema valida que existan las cuentas contables:

```typescript
private async findAccountByCode(
  code: string,
  tenantId: string,
): Promise<ChartOfAccountsDocument> {
  const account = await this.chartOfAccountsModel
    .findOne({ code, tenantId: tenantId })
    .exec();
    
  if (!account) {
    throw new InternalServerErrorException(
      `Configuración de cuenta contable automática faltante: 
       No se encontró la cuenta con código ${code}.`,
    );
  }
  return account;
}
```

---

## 13. FLUJOS DE DATOS DETALLADOS

### 13.1 Creación de Orden con Impuestos

```
1. Cliente crea orden con items
   └─ OrderDTO contiene items, pagos, cliente

2. Sistema valida y precarga productos
   └─ Obtiene ivaApplicable, igtfExempt, taxCategory

3. Para cada item:
   └─ Calcular precio final
   └─ Aplicar descuentos
   └─ Calcular IVA (si aplica)

4. Calcular IGTF:
   └─ Filtrar pagos en USD
   └─ Multiplicar por 0.03

5. Crear orden en base de datos
   └─ Guardar subtotal, ivaTotal, igtfTotal

6. Crear asientos contables automáticos
   └─ Asiento de venta (ingresos + impuestos)
   └─ Asiento de COGS (costo de venta)

7. Actualizar inventario
   └─ Reservar items
   └─ Deducir del stock si es aplicable
```

### 13.2 Pago de Órdenes

```
1. Cliente registra pago
   └─ Especifica método (USD/VES)
   └─ Especifica monto

2. Sistema valida:
   └─ Monto no exceda total pendiente
   └─ Método de pago válido

3. Registra pago en array paymentRecords
   └─ Guarda método, monto, fecha, estado

4. Actualiza paymentStatus:
   └─ pending → partial (pago parcial)
   └─ partial → paid (pago completo)

5. Crear asiento contable de pago (opcional)
   └─ Registrar entrada de dinero
   └─ Actualizar cuentas por cobrar
```

---

## 14. ESTADOS Y TRANSICIONES FISCALES

### 14.1 Estados de Pago de Órdenes

```
pending  ─→ partial  ─→ paid
         └───→ paid (pago completo directo)
         
paid     ─→ overpaid (pago en exceso)
```

### 14.2 Estados de Órdenes

```
draft ─→ pending ─→ confirmed ─→ processing ─→ shipped ─→ delivered
                  └→ cancelled
delivered ─→ refunded
```

---

## 15. LIMITACIONES Y GAPS IDENTIFICADOS

### 15.1 No Implementado

1. **Retenciones en Compras**: 
   - Estructura existe pero no se calcula automáticamente
   - Falta integración en módulo de compras

2. **Retenciones en Ventas**:
   - No se aplican retenciones sobre facturación
   - No se registran payables de retención

3. **Impuestos en Compras**:
   - Aunque existe `createJournalEntryForPurchase`, 
   - No hay cálculo automático de IVA en órdenes de compra

4. **Exención de IGTF por Producto**:
   - Campo `igtfExempt` existe pero no se utiliza en cálculos
   - IGTF se aplica globalmente a todos los USD

5. **Reportes Fiscales Específicos**:
   - No existe reporte de IVA por período
   - No existe reporte de IGTF pagado
   - No hay conciliación fiscal

6. **Auditoría de Cambios Fiscales**:
   - No se registran cambios en tasas de impuestos
   - No hay historial de modificaciones

### 15.2 Posibles Mejoras

1. Implementar cálculo de retenciones en compras
2. Crear reportes de IVA por período (declaración fiscal)
3. Integrar validación de RIF/CI
4. Implementar categorías de exención fiscal
5. Crear reportes de IGTF por período
6. Auditoría de cambios en configuración de impuestos

---

## 16. ARCHIVOS RELEVANTES - RESUMEN

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `/src/schemas/tenant.schema.ts` | 35-42 | Configuración de tasas de impuestos |
| `/src/schemas/tenant.schema.ts` | 184-190 | Información fiscal del tenant |
| `/src/schemas/product.schema.ts` | 226-230 | Control fiscal de productos |
| `/src/schemas/order.schema.ts` | 113-120 | IVA e IGTF por item |
| `/src/schemas/order.schema.ts` | 204-208 | Totales fiscales de orden |
| `/src/schemas/order.schema.ts` | 323-330 | Información fiscal de cliente |
| `/src/dto/order.dto.ts` | 159-162 | DTO taxType y documentos |
| `/src/dto/order.dto.ts` | 205-213 | DTO IVA e IGTF total |
| `/src/dto/customer.dto.ts` | 46-67 | DTO Información fiscal cliente |
| `/src/dto/product.dto.ts` | 381-394 | DTO control fiscal producto |
| `/src/dto/tax-info.dto.ts` | 1-19 | DTO información fiscal básica |
| `/src/modules/orders/orders.service.ts` | 61-87 | Métodos de pago y IGTF |
| `/src/modules/orders/orders.service.ts` | 209 | Cálculo de IVA por item |
| `/src/modules/orders/orders.service.ts` | 303 | Cálculo de IGTF total |
| `/src/modules/accounting/accounting.service.ts` | 239-344 | Asiento de venta con impuestos |
| `/src/modules/accounting/accounting.service.ts` | 346-424 | Asiento de COGS |
| `/src/modules/reports/reports.service.ts` | 43-126 | Reporte A/R |

---

## 17. CONCLUSIONES

### 17.1 Fortalezas del Sistema Actual

1. ✓ **Estructura sólida** para gestión de IVA
2. ✓ **IGTF bien implementado** en transacciones USD
3. ✓ **Contabilización automática** de impuestos
4. ✓ **Configuración flexible** por tenant
5. ✓ **Información fiscal** del cliente registrada

### 17.2 Áreas de Mejora

1. ⚠ Retenciones no completamente implementadas
2. ⚠ Falta reportes fiscales específicos (IVA, IGTF)
3. ⚠ IGTF aplica globalmente (sin excepciones por producto)
4. ⚠ Sin auditoría de cambios en tasas
5. ⚠ Limitado soporte para múltiples regímenes fiscales

### 17.3 Recomendaciones

1. Completar implementación de retenciones (IVA e ISLR)
2. Crear reportes de declaración fiscal periódica
3. Implementar historial de cambios en tasas
4. Validar RIF/CI según SENIAT
5. Crear auditoría de transacciones fiscales
6. Soportar diferentes tasas de IVA por categoría

---

**Análisis realizado**: 13 de noviembre de 2025
**Generador**: Claude Code - Análisis de Sistemas ERP
