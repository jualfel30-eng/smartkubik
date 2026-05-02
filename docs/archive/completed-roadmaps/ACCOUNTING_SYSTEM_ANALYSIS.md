# ANÁLISIS COMPLETO DEL SISTEMA DE CONTABILIDAD

## 1. ESTRUCTURA DEL PLAN DE CUENTAS (CHART OF ACCOUNTS)

### 1.1 Tipos de Cuentas Definidas

El sistema maneja **5 tipos de cuentas principales**:
- **Activo (1xxx)**: Recursos de la empresa
- **Pasivo (2xxx)**: Obligaciones 
- **Patrimonio (3xxx)**: Capital y utilidades
- **Ingreso (4xxx)**: Ingresos de operaciones
- **Gasto (5xxx)**: Costos y gastos operacionales

### 1.2 Codificación del Plan de Cuentas

```typescript
// Estructura de codificación:
// [Tipo][Número secuencial de 2 dígitos]
// Ej: 1101 = Activo, cuenta 01 (Caja/Banco)

Prefix mapping:
- "Activo" → "1"
- "Pasivo" → "2" 
- "Patrimonio" → "3"
- "Ingreso" → "4"
- "Gasto" → "5"
```

### 1.3 Cuentas del Sistema Configuradas

#### Cuentas de Activo (1xxx):
- **1101**: Caja y Bancos (Cash or Bank Account)
- **1102**: Cuentas por Cobrar (Accounts Receivable)
- **1103**: Inventario (Inventory)

#### Cuentas de Pasivo (2xxx):
- **2101**: Cuentas por Pagar (Accounts Payable)
- **2102**: Impuestos por Pagar (IVA/IGTF Tax Payable)
- **2103**: Anticipos de Clientes (Customer Advances)
- **2104-2106**: Cuentas de Nómina y Prestaciones (Payroll)

#### Cuentas de Ingreso (4xxx):
- **4101**: Ingresos por Ventas (Sales Revenue)
- **4102**: Ingresos por Envío (Shipping Income)
- **4103**: Descuentos sobre Venta (Sales Discounts - Contra-revenue)

#### Cuentas de Gasto (5xxx):
- **5101**: Costo de Mercancía Vendida (COGS)
- **5205-5207**: Gastos de Nómina
- **599**: Gasto IGTF (IGTF Expense)

### 1.4 Schema de Cuenta

```typescript
@Schema({ timestamps: true })
export class ChartOfAccounts {
  @Prop({ type: String, required: true, trim: true })
  name: string;                    // Nombre descriptivo

  @Prop({ type: String, required: true, trim: true })
  code: string;                    // Código único por tenant (1101, 2102, etc)

  @Prop({ type: String, required: true, enum: ACCOUNT_TYPES })
  type: string;                    // Tipo de cuenta

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "ChartOfAccounts" })
  parent?: MongooseSchema.Types.ObjectId;  // Para cuentas jerárquicas

  @Prop({ type: Boolean, default: false })
  isSystemAccount?: boolean;       // Si es cuenta del sistema

  @Prop({ type: Boolean, default: true })
  isEditable?: boolean;            // Si se puede editar

  @Prop({ type: Object })
  metadata?: Record<string, any>;  // Información adicional
}

// Índice para garantizar código único por tenant
ChartOfAccountsSchema.index({ tenantId: 1, code: 1 }, { unique: true });
```

---

## 2. ASIENTOS CONTABLES (JOURNAL ENTRIES)

### 2.1 Estructura del Asiento Contable

```typescript
@Schema({ timestamps: true })
export class JournalEntry {
  @Prop({ type: Date, required: true })
  date: Date;                       // Fecha del asiento

  @Prop({ type: String, required: true, trim: true })
  description: string;              // Descripción del asiento

  @Prop({ type: [JournalLineSchema] })
  lines: JournalLine[];             // Líneas débito/crédito

  @Prop({ type: Boolean, required: true, default: false })
  isAutomatic: boolean;             // ¿Generado automáticamente?

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;   // Info sobre origen (transacción, etc)
}

@Schema()
class JournalLine {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "ChartOfAccounts" })
  account: MongooseSchema.Types.ObjectId;  // Cuenta débito/crédito

  @Prop({ type: String, required: true })
  description: string;              // Descripción de la línea

  @Prop({ type: Number, default: 0 })
  debit: number;                    // Monto débito (positivo)

  @Prop({ type: Number, default: 0 })
  credit: number;                   // Monto crédito (positivo)
}
```

### 2.2 Validaciones de Asientos

1. **Ecuación Contable**: Total débitos DEBE IGUALAR total créditos
   - Tolerancia: ±0.001 para errores de redondeo
   
2. **Mínimo de Líneas**: Cada asiento requiere mínimo 2 líneas

3. **Montos No-Cero**: Débito total > 0 O crédito total > 0

```typescript
async createJournalEntry(createDto, tenantId) {
  const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  // Validación ecuación contable
  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new BadRequestException("Total debits must equal total credits.");
  }

  // Validación monto
  if (totalDebits === 0 && totalCredits === 0) {
    throw new BadRequestException("Journal entry must have non-zero values.");
  }

  // Líneas mínimo
  if (lines.length < 2) {
    throw new BadRequestException("Minimum 2 lines required.");
  }
}
```

---

## 3. FLUJO DE DATOS: TRANSACCIONES → ASIENTOS CONTABLES

### 3.1 Flujo de Venta (Sales Order)

**ENTRADA**: Cliente crea orden de venta
```
CreateOrderDto {
  items: [{ productId, quantity, ... }]
  subtotal: 100
  ivaTotal: 16 (16% IVA)
  igtfTotal: 0 (sin divisa extranjera)
  totalAmount: 116
}
```

**PROCESAMIENTO**:
```
1. OrdersService.create() 
   ↓
2. Calcula subtotal, IVA, descuentos
   ↓
3. Guarda orden en DB
   ↓
4. Ejecuta contabilidad (setImmediate - no bloqueante):
   a) createJournalEntryForSale()
   b) createJournalEntryForCOGS()
```

**SALIDA - ASIENTO POR VENTA (createJournalEntryForSale)**:

```
Fecha: Hoy
Descripción: "Asiento automático por venta de orden #ORD-123"

Líneas:
┌─────────────────────────────────────────────────┐
│ DÉBITO:                                         │
│ 1102 Cuentas por Cobrar    │ 116.00            │
└─────────────────────────────────────────────────┘
│ CRÉDITO:                                        │
│ 4101 Ingresos por Venta    │ 100.00            │
│ 2102 Impuestos por Pagar   │ 16.00             │
└─────────────────────────────────────────────────┘

Si hay descuento:
│ 4103 Descuentos sobre Venta│ (descuento) DÉBITO
│ Cuentas por Cobrar ajustada│ (subtotal + descto)

Si hay envío:
│ 4102 Ingresos por Envío    │ (costo envío) CRÉDITO
```

**CÓDIGO RELEVANTE**:
```typescript
async createJournalEntryForSale(order: OrderDocument, tenantId: string) {
  // Obtiene cuentas
  const accountsReceivable = findAccountByCode("1102", tenantId);
  const salesRevenue = findAccountByCode("4101", tenantId);
  const taxPayable = findAccountByCode("2102", tenantId);

  // Construye líneas
  const lines = [
    { account: 1102, debit: 116, credit: 0, desc: "Cuentas por cobrar" },
    { account: 4101, debit: 0, credit: 100, desc: "Ingreso por venta" },
    { account: 2102, debit: 0, credit: 16, desc: "IVA por pagar" }
  ];

  // Crea asiento
  return journalEntryModel.create({
    date: new Date(),
    description: `Asiento automático por venta ${order.orderNumber}`,
    lines,
    tenantId,
    isAutomatic: true
  });
}
```

---

### 3.2 Flujo de Costo de Ventas (COGS)

**ENTRADA**: Misma orden, con información de costo

```
order.items[].costPrice = costo unitario
quantity = cantidad vendida
```

**PROCESAMIENTO**:
```
1. Calcula: Total Cost = SUM(costPrice × quantity)
2. Si Total Cost > 0:
   → createJournalEntryForCOGS()
```

**SALIDA - ASIENTO COGS**:

```
Fecha: Hoy
Descripción: "Asiento de costo de venta para orden #ORD-123"

Líneas:
┌─────────────────────────────────────────────────┐
│ DÉBITO:                                         │
│ 5101 Costo Mercancía Vendida│ 50.00            │
├─────────────────────────────────────────────────┤
│ CRÉDITO:                                        │
│ 1103 Inventario             │ 50.00            │
└─────────────────────────────────────────────────┘
```

---

### 3.3 Flujo de Pago (Payment)

**ENTRADA**: Se registra pago de orden
```
Payment {
  orderId: "ORD-123"
  amount: 116
  method: "transferencia_usd"
  date: hoy
}
```

**PROCESAMIENTO**:
```
1. PaymentsService.create()
   ↓
2. handleSalePayment()
   ├─ Actualiza estado de orden (pending/partial/paid)
   └─ Crea asiento: createJournalEntryForPayment()
```

**SALIDA - ASIENTO PAGO**:

```
Fecha: Fecha de pago
Descripción: "Asiento automático por cobro de orden #ORD-123"

Líneas:
┌─────────────────────────────────────────────────┐
│ DÉBITO:                                         │
│ 1101 Caja y Bancos          │ 116.00           │
├─────────────────────────────────────────────────┤
│ CRÉDITO:                                        │
│ 1102 Cuentas por Cobrar     │ 116.00           │
└─────────────────────────────────────────────────┘

Si hay IGTF (impuesto de divisas):
│ DÉBITO:                                         │
│ 599 Gasto IGTF              │ 3.48 (3% del pago)
│ CRÉDITO:                                        │
│ 2102 Impuestos por Pagar    │ 3.48             │
```

---

### 3.4 Flujo de Compra (Purchase Order)

**ENTRADA**: Crear orden de compra
```
PurchaseOrder {
  items: [{ productId, costPrice, quantity }]
  totalAmount: 500
}
```

**PROCESAMIENTO**:
```
1. PurchasesService.create()
   ↓
2. Guarda orden de compra
   ↓
3. receivePurchaseOrder()
   ├─ Actualiza inventario
   └─ Crea Payable(s) automáticamente
        └─ Payable creation trigger
           → createJournalEntryForPayable()
```

**SALIDA - ASIENTO COMPRA (cuando se recibe)**:

```
Fecha: Fecha de compra
Descripción: "Asiento automático por compra OC-456"

Líneas:
┌─────────────────────────────────────────────────┐
│ DÉBITO:                                         │
│ 1103 Inventario             │ 500.00           │
├─────────────────────────────────────────────────┤
│ CRÉDITO:                                        │
│ 2101 Cuentas por Pagar      │ 500.00           │
└─────────────────────────────────────────────────┘
```

---

### 3.5 Flujo de Cuenta por Pagar (Payable)

**ENTRADA**: Crear payable (facturas de proveedores, gastos, nómina)
```
CreatePayableDto {
  type: "purchase_order" | "payroll" | "utility_bill" | "other"
  payeeName: "Proveedor XYZ"
  lines: [
    { accountId: expenseAccount, amount: 100, description: "..." },
    { accountId: expenseAccount, amount: 200, description: "..." }
  ]
  totalAmount: 300
}
```

**PROCESAMIENTO**:
```
1. PayablesService.create()
   ↓
2. Guarda payable
   ↓
3. createJournalEntryForPayable()
   └─ Iterates through each line
```

**SALIDA - ASIENTO PAYABLE**:

```
Fecha: Fecha emisión
Descripción: "Asiento automático por cuenta por pagar PAY-123"

Líneas:
┌─────────────────────────────────────────────────┐
│ DÉBITO:                                         │
│ [Cuentas de Gasto específicas del payable]     │
│ 5205 Gasto Prestaciones    │ 100.00           │
│ 5206 Gasto Seguridad Social│ 200.00           │
├─────────────────────────────────────────────────┤
│ CRÉDITO:                                        │
│ 2101 Cuentas por Pagar     │ 300.00           │
└─────────────────────────────────────────────────┘
```

**Particularidad**: Las cuentas de gasto vienen en las `lines` de la payable, permitiendo flexibilidad.

---

### 3.6 Flujo de Pago de Payable

**ENTRADA**: Pagar un payable
```
Payment {
  payableId: "PAY-123"
  amount: 300
  method: "transferencia"
}
```

**PROCESAMIENTO**:
```
1. PaymentsService.create()
   ↓
2. handlePayablePayment()
   ├─ Actualiza payable (paid/partially_paid/open)
   └─ createJournalEntryForPayablePayment()
```

**SALIDA - ASIENTO PAGO PAYABLE**:

```
Fecha: Fecha de pago
Descripción: "Asiento automático por pago de Cta por Pagar PAY-123"

Líneas:
┌─────────────────────────────────────────────────┐
│ DÉBITO:                                         │
│ 2101 Cuentas por Pagar     │ 300.00           │
├─────────────────────────────────────────────────┤
│ CRÉDITO:                                        │
│ 1101 Caja y Bancos         │ 300.00           │
└─────────────────────────────────────────────────┘
```

---

## 4. CUENTAS DE IMPUESTOS

### 4.1 IVA (Impuesto al Valor Agregado)

**Configuración**:
- Tasa: 16% (fija en product.ivaApplicable)
- Cálculo: `totalPrice × 0.16`
- Se aplica solo a productos donde `product.ivaApplicable = true`

**Tratamiento Contable**:
```
Venta con IVA:
- DÉBITO: 1102 Cuentas por Cobrar (total + IVA)
- CRÉDITO: 4101 Ingresos por Venta (base)
- CRÉDITO: 2102 Impuestos por Pagar (IVA)

El IVA se ACUMULA en la cuenta 2102 (pasivo)
```

### 4.2 IGTF (Impuesto a las Grandes Transacciones Financieras)

**Configuración**:
- Tasa: 3% (aplicación flexible)
- Cálculo: Se aplica solo en pagos con divisas extranjeras
- `foreignCurrencyPaymentAmount × 0.03`

**Determinación de Divisa Extranjera**:
```typescript
// En OrdersService
const foreignCurrencyPaymentAmount = payments
  .filter(p => p.currency === "USD" || p.currency !== "VES")
  .reduce((sum, p) => sum + p.amount, 0);

const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
```

**Tratamiento Contable**:
```
Pago con IGTF:
- DÉBITO: 1101 Caja y Bancos (monto recibido)
- DÉBITO: 599 Gasto IGTF (monto IGTF)
- CRÉDITO: 1102 Cuentas por Cobrar (monto orden)
- CRÉDITO: 2102 Impuestos por Pagar (IGTF)

El IGTF es GASTO para la empresa (se contabiliza como costo)
La provisión se refleja en 2102 (pasivo)
```

---

## 5. INTEGRACIÓN CON OTROS MÓDULOS

### 5.1 Orders Module → Accounting

**Archivos**: 
- `/src/modules/orders/orders.service.ts`
- `/src/modules/accounting/accounting.service.ts`

**Integración**:
```typescript
// En OrdersService.create()
setImmediate(async () => {
  try {
    // Asiento de venta
    await this.accountingService.createJournalEntryForSale(
      savedOrder,
      user.tenantId
    );
    
    // Asiento de COGS
    await this.accountingService.createJournalEntryForCOGS(
      savedOrder,
      user.tenantId
    );
  } catch (accountingError) {
    this.logger.error(`Error en contabilidad para orden ${orderNumber}`, error);
  }
});
```

**Importante**: Se ejecuta de forma **asíncrona NO-BLOQUEANTE** con `setImmediate()`
- Si falla contabilidad, la orden se guarda igual
- Logs de error para seguimiento manual

---

### 5.2 Payments Module → Accounting

**Archivos**:
- `/src/modules/payments/payments.service.ts`

**Integración para Pagos de Venta**:
```typescript
// En handleSalePayment()
await this.accountingService.createJournalEntryForPayment(
  order,
  payment,
  tenantId,
  igtfAmount  // Si hay IGTF
);
```

**Integración para Pagos de Payable**:
```typescript
// En handlePayablePayment()
await this.accountingService.createJournalEntryForPayablePayment(
  payment,
  payable,
  tenantId
);
```

---

### 5.3 Purchases Module → Accounting

**Archivos**:
- `/src/modules/purchases/purchases.service.ts`

**Flujo**:
1. Se crea purchase order
2. Se recibe (receivePurchaseOrder)
3. Se actualiza inventario
4. Se crean payable(s) automáticamente
5. Payable trigger → createJournalEntryForPayable()

**Particularidad**: Split de payables si hay pago adelantado
```typescript
if (paymentTerms?.requiresAdvancePayment) {
  // Crear payable ADELANTO (due immediately)
  // Crear payable SALDO (due on dueDate)
}
```

---

### 5.4 Payables Module → Accounting

**Archivos**:
- `/src/modules/payables/payables.service.ts`

**Integración**:
```typescript
// En PayablesService.create()
try {
  await this.accountingService.createJournalEntryForPayable(
    savedPayable,
    tenantId
  );
} catch (accountingError) {
  this.logger.error(`Failed to create journal entry for payable`);
  throw accountingError;  // IMPORTANTE: lanza error al cliente
}
```

---

## 6. REPORTES CONTABLES

### 6.1 Estado de Resultados (Profit & Loss)

**Endpoint**: `GET /accounting/reports/profit-and-loss?from=2024-01-01&to=2024-12-31`

**Lógica**:
```typescript
async getProfitAndLoss(tenantId: string, from: Date, to: Date) {
  // 1. Obtiene todas las cuentas de tipo Ingreso/Gasto
  const incomeAccounts = allAccounts.filter(a => a.type === "Ingreso");
  const expenseAccounts = allAccounts.filter(a => a.type === "Gasto");

  // 2. Busca journal entries en rango de fechas
  const entries = journalEntryModel.find({
    tenantId,
    date: { $gte: from, $lte: to }
  });

  // 3. Calcula totales
  // Para cuentas de ingreso: CRÉDITO - DÉBITO (normal)
  // Para cuentas de gasto: DÉBITO - CRÉDITO (normal)
  
  return {
    totalRevenue: SUM(income accounts credit - debit),
    totalExpenses: SUM(expense accounts debit - credit),
    netProfit: revenue - expenses
  };
}
```

**Resultado**:
```json
{
  "period": { "from": "2024-01-01", "to": "2024-12-31" },
  "summary": {
    "totalRevenue": 10000,
    "totalExpenses": 4000,
    "netProfit": 6000
  }
}
```

---

### 6.2 Balance General (Balance Sheet)

**Endpoint**: `GET /accounting/reports/balance-sheet?asOfDate=2024-12-31`

**Lógica**:
```typescript
async getBalanceSheet(tenantId: string, asOfDate: Date) {
  // 1. Obtiene TODAS las journal entries hasta la fecha
  const entries = find({ date: { $lte: asOfDate } });

  // 2. Calcula saldo de cada cuenta
  // Balance = SUM(debit - credit) por cuenta
  
  // 3. Clasifica por tipo
  for (account in allAccounts) {
    switch(account.type) {
      case "Activo":        // Balance normal deudor
        balance = debit - credit;
        assets.push(balance);
        break;
      case "Pasivo":        // Balance normal acreedor (negativo)
        balance = -(debit - credit);
        liabilities.push(balance);
        break;
      case "Patrimonio":    // Balance normal acreedor (negativo)
        balance = -(debit - credit);
        equity.push(balance);
        break;
      case "Ingreso":       // Incluye en utilidad neta
        netIncome -= (debit - credit);
        break;
      case "Gasto":         // Incluye en utilidad neta
        netIncome += (debit - credit);
        break;
    }
  }

  // 4. Verifica ecuación: Activos = Pasivos + Patrimonio + Utilidad Neta
  return {
    assets,
    liabilities,
    equity (incluyendo netIncome),
    verification: {
      difference: totalAssets - (totalLiabilities + totalEquity)
    }
  };
}
```

---

### 6.3 Cuentas por Cobrar (A/R Report)

**Endpoint**: `GET /accounting/reports/accounts-receivable`

**Lógica**:
```typescript
async getAccountsReceivable(tenantId: string) {
  // 1. Encuentra órdenes no pagadas (pending/partial)
  const unpaidOrders = orderModel.find({
    paymentStatus: { $in: ["pending", "partial"] }
  });

  // 2. Para cada orden, calcula lo pagado
  for (order in unpaidOrders) {
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = order.totalAmount - totalPaid;
    
    report.push({
      orderNumber,
      customerName,
      totalAmount,
      paidAmount: totalPaid,
      balance,
      status: paymentStatus
    });
  }

  return report;
}
```

---

### 6.4 Cuentas por Pagar (A/P Report)

**Endpoint**: `GET /accounting/reports/accounts-payable`

**Lógica**:
```typescript
async getAccountsPayable(tenantId: string) {
  // 1. Encuentra payables sin pagar (open/partially_paid)
  const unpaidPayables = payableModel.find({
    status: { $in: ["open", "partially_paid"] }
  });

  // 2. Para cada payable, reporta el saldo
  for (payable in unpaidPayables) {
    const balance = payable.totalAmount - payable.paidAmount;
    
    report.push({
      payableNumber,
      payeeName,
      totalAmount,
      paidAmount,
      balance,
      status
    });
  }

  return report;
}
```

---

### 6.5 Flujo de Caja (Cash Flow Statement)

**Endpoint**: `GET /accounting/reports/cash-flow-statement?from=2024-01-01&to=2024-12-31`

**Lógica**:
```typescript
async getCashFlowStatement(tenantId: string, from: Date, to: Date) {
  // 1. Obtiene la cuenta de caja (1101)
  const cashAccount = chartOfAccountsModel.findOne({
    code: "1101",
    tenantId
  });

  // 2. Busca todas las journal entries en el período que afecten caja
  const entries = journalEntryModel.find({
    date: { $gte: from, $lte: to },
    "lines.account": cashAccount._id
  });

  // 3. Para cada línea de caja:
  // - DÉBITO en caja = INFLOW (entrada de dinero)
  // - CRÉDITO en caja = OUTFLOW (salida de dinero)
  
  for (entry in entries) {
    for (line in entry.lines) {
      if (line.account === cashAccount._id) {
        if (line.debit > 0) {
          cashInflows.push({ date, description, amount: line.debit });
        }
        if (line.credit > 0) {
          cashOutflows.push({ date, description, amount: line.credit });
        }
      }
    }
  }

  return {
    period,
    cashInflows: { total: SUM(inflows), details: [...] },
    cashOutflows: { total: SUM(outflows), details: [...] },
    netCashFlow: inflows - outflows
  };
}
```

---

## 7. ENDPOINTS DE LA API

### Cuentas (Chart of Accounts)
```
POST   /accounting/accounts                  - Crear cuenta
GET    /accounting/accounts                  - Listar todas las cuentas
```

### Asientos Contables (Journal Entries)
```
POST   /accounting/journal-entries           - Crear asiento manual
GET    /accounting/journal-entries?page=1&limit=15
```

### Reportes
```
GET    /accounting/reports/profit-and-loss?from=...&to=...
GET    /accounting/reports/balance-sheet?asOfDate=...
GET    /accounting/reports/accounts-receivable
GET    /accounting/reports/accounts-payable
GET    /accounting/reports/cash-flow-statement?from=...&to=...
```

---

## 8. DIAGRAMA DE FLUJO GENERAL

```
┌─────────────────────────────────────────────────────────────┐
│                     TRANSACCIÓN ORIGINAL                     │
│  (Sale Order / Payment / Purchase / Payable)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   Servicio del Módulo                │
         │   (Orders/Payments/Purchases/Payables)
         └──────────────────────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   Guarda en Base de Datos            │
         └──────────────────────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │ Llama AccountingService              │
         │ createJournalEntry...()              │
         │ (setImmediate = no bloqueante)       │
         └──────────────────────────────────────┘
                         │
         ┌───────────────┴────────────────┐
         ▼                                ▼
  Valida Ecuación          Obtiene Cuentas del Catálogo
  Contable (D=C)          o crea automáticamente si no existen
         │                                │
         └───────────────┬────────────────┘
                         ▼
         ┌──────────────────────────────────────┐
         │   Crea Documento JournalEntry        │
         │   - date                             │
         │   - description                      │
         │   - lines[] { account, debit, credit}
         │   - isAutomatic: true                │
         │   - metadata (origen de transacción) │
         └──────────────────────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   Guarda en Collection "journalentries"
         │   (MongoDB)                          │
         └──────────────────────────────────────┘
                         │
                         ▼
         ┌──────────────────────────────────────┐
         │   Disponible para Reportes Contables │
         │   - Balance Sheet                    │
         │   - P&L                              │
         │   - Cash Flow                        │
         └──────────────────────────────────────┘
```

---

## 9. ASPECTOS TÉCNICOS IMPORTANTES

### 9.1 Generación Automática de Códigos

```typescript
async generateNextCode(type: string, tenantId: string): Promise<string> {
  const typePrefix = { Activo: "1", Pasivo: "2", ... }[type];
  
  // Busca la última cuenta del tipo
  const lastAccount = chartOfAccountsModel.findOne(
    { tenantId, code: { $regex: `^${typePrefix}` } },
    { sort: { code: -1 } }
  );
  
  if (lastAccount) {
    const lastNumber = parseInt(lastAccount.code.slice(1), 10);
    return `${typePrefix}${(lastNumber + 1).toString().padStart(2, "0")}`;
  }
  
  return `${typePrefix}01`;
}
```

### 9.2 Cuentas Automáticas (findOrCreateAccount)

Algunas cuentas se crean automáticamente cuando no existen:
- 1103 (Inventario)
- 4102 (Envío)
- 4103 (Descuentos)
- 2103 (Anticipos de Clientes)
- 599 (Gasto IGTF)

```typescript
private async findOrCreateAccount(accountDetails, tenantId) {
  let existing = chartOfAccountsModel.findOne({
    code: accountDetails.code,
    tenantId
  });
  
  if (existing) return existing;
  
  // Si no existe, la crea como sistema y no editable
  return chartOfAccountsModel.create({
    ...accountDetails,
    isSystemAccount: true,
    isEditable: false,
    tenantId
  });
}
```

### 9.3 Índices de Base de Datos

```typescript
// ChartOfAccounts
index({ tenantId: 1, code: 1 }, { unique: true })

// JournalEntry
index({ date: -1, tenantId: 1 })
index({ tenantId: 1, createdAt: -1 })
index({ isAutomatic: 1, tenantId: 1 })
index({ "lines.account": 1, tenantId: 1 })
```

### 9.4 Manejo de Errores

**Si falla creación de asiento en transacciones automáticas**:
- Se loga el error
- La transacción se GUARDA igual (no se revierte)
- Se notifica al usuario que revisar contabilidad manualmente

```typescript
setImmediate(async () => {
  try {
    await this.accountingService.createJournalEntryForSale(...);
  } catch (accountingError) {
    this.logger.error(`Error en contabilidad`, accountingError.stack);
    // La orden YA fue guardada, solo error en asiento
  }
});
```

---

## 10. FLUJO DETALLADO DE EJEMPLO: VENTA COMPLETA CON PAGO

### Escenario: Cliente compra artículos por $100 + $16 IVA, paga $116 en USD

**Paso 1: Se crea orden (OrdersService.create)**
```
Input:
- customerId: CUST-123
- items: [{ productId: PROD-1, quantity: 10, price: 10, costPrice: 5, ivaApplicable: true }]
- subtotal: 100
- ivaTotal: 16
- totalAmount: 116

Output (orden guardada):
- orderNumber: ORD-001
- paymentStatus: "pending"
```

**Paso 2: Se genera asiento de venta (createJournalEntryForSale)**
```
JournalEntry creada:
{
  date: 2024-11-13,
  description: "Asiento automático por venta de orden ORD-001",
  lines: [
    { account: 1102, debit: 116, credit: 0, desc: "Cuentas por cobrar" },
    { account: 4101, debit: 0, credit: 100, desc: "Ingreso por venta" },
    { account: 2102, debit: 0, credit: 16, desc: "IVA por pagar" }
  ],
  tenantId: TENANT-1,
  isAutomatic: true
}
```

**Paso 3: Se genera asiento de COGS (createJournalEntryForCOGS)**
```
JournalEntry creada:
{
  date: 2024-11-13,
  description: "Asiento de costo de venta para orden ORD-001",
  lines: [
    { account: 5101, debit: 50, credit: 0, desc: "Costo de venta" },  // 10 × 5
    { account: 1103, debit: 0, credit: 50, desc: "Disminución inventario" }
  ],
  tenantId: TENANT-1,
  isAutomatic: true
}
```

**Paso 4: Se recibe pago (PaymentsService.create)**
```
Input:
- orderId: ORD-001
- amount: 116
- method: "transferencia_usd"
- currency: "USD"
- date: 2024-11-13

Output (pago guardado):
- Orden actualizada: paymentStatus = "paid"
```

**Paso 5: Se genera asiento de pago (createJournalEntryForPayment)**
```
JournalEntry creada:
{
  date: 2024-11-13,
  description: "Asiento automático por cobro de orden ORD-001",
  lines: [
    { account: 1101, debit: 116, credit: 0, desc: "Cobro de orden ORD-001" },
    { account: 1102, debit: 0, credit: 116, desc: "Cancelación CxC" }
  ],
  tenantId: TENANT-1,
  isAutomatic: true
}
```

**Si hay IGTF (3% sobre USD)**:
```
Líneas adicionales:
{
  account: 599, debit: 3.48, credit: 0, desc: "Gasto IGTF"
},
{
  account: 2102, debit: 0, credit: 3.48, desc: "Provisión IGTF"
}
```

**Estado final en balance (sin IGTF)**:
```
ACTIVOS:
- 1101 Caja y Bancos:           +116
- 1102 Cuentas por Cobrar:      -116 (pagado)
- 1103 Inventario:               -50

PASIVOS:
- 2102 Impuestos por Pagar:      +16

PATRIMONIO:
- Utilidad Neta:                 +50 (100 - 50 costo)
```

