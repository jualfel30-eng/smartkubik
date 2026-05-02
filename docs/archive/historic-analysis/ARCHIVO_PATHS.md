# REFERENCIAS RÁPIDAS - RUTAS DE ARCHIVOS Y LÍNEAS DE CÓDIGO

## BACKEND - MÓDULO DE CONTABILIDAD

### accounting.service.ts (1,124 líneas)
**Ruta**: `/src/modules/accounting/accounting.service.ts`

**Métodos principales:**

| Método | Líneas | Descripción |
|--------|--------|-------------|
| generateNextCode() | 40-75 | Genera código siguiente para cuenta |
| createAccount() | 77-89 | Crea nueva cuenta en catálogo |
| findAllAccounts() | 91-96 | Lista todas las cuentas del tenant |
| findAllJournalEntries() | 98-123 | Lista asientos con paginación |
| createJournalEntry() | 155-191 | Crea asiento manual |
| **createJournalEntryForSale()** | 239-344 | ASIENTO DE VENTA - Débito A/R, Crédito Ingresos + Impuestos |
| **createJournalEntryForCOGS()** | 346-424 | ASIENTO COGS - Débito COGS, Crédito Inventario |
| **createJournalEntryForPayment()** | 577-660 | ASIENTO COBRO - Débito Caja, Crédito A/R (+ IGTF si aplica) |
| **createJournalEntryForPurchase()** | 426-495 | ASIENTO COMPRA - Débito Inventario, Crédito A/P |
| **createJournalEntryForPayable()** | 497-575 | ASIENTO PAYABLE - Débito Gastos, Crédito A/P |
| **createJournalEntryForPayablePayment()** | 1070-1122 | ASIENTO PAGO PAYABLE - Débito A/P, Crédito Caja |
| getBalanceSheet() | 812-910 | Genera balance general |
| getProfitAndLoss() | 758-810 | Genera estado de resultados |
| getCashFlowStatement() | 972-1068 | Genera flujo de caja |
| getAccountsReceivable() | 912-943 | Reporta cuentas por cobrar |
| getAccountsPayable() | 945-970 | Reporta cuentas por pagar |

**Cuentas Hard-coded:**
- Línea 249: `"1102"` - Cuentas por Cobrar
- Línea 252: `"4101"` - Ingresos por Venta
- Línea 253: `"2102"` - Impuestos por Pagar
- Línea 587: `"1101"` - Caja y Bancos
- Línea 615: `"599"` - Gasto IGTF
- Línea 366: `"1103"` - Inventario
- Línea 375: `"5101"` - COGS
- Línea 692: `"1101"` - Caja (para depósitos)
- Línea 983: `"1101"` - Caja (para flujo)
- Línea 1079: `"2101"` - Cuentas por Pagar

---

### accounting.controller.ts (113 líneas)
**Ruta**: `/src/modules/accounting/accounting.controller.ts`

**Endpoints:**

| Método | Línea | Endpoint | Descripción |
|--------|-------|----------|-------------|
| POST | 25-29 | `/accounts` | Crear nueva cuenta |
| GET | 31-39 | `/accounts` | Listar cuentas del tenant |
| POST | 51-61 | `/journal-entries` | Crear asiento manual |
| GET | 41-49 | `/journal-entries?page=1&limit=15` | Listar asientos paginados |
| GET | 63-74 | `/reports/profit-and-loss?from=...&to=...` | Estado de resultados |
| GET | 76-82 | `/reports/balance-sheet?asOfDate=...` | Balance general |
| GET | 84-88 | `/reports/accounts-receivable` | Cuentas por cobrar |
| GET | 90-94 | `/reports/accounts-payable` | Cuentas por pagar |
| GET | 96-111 | `/reports/cash-flow-statement?from=...&to=...` | Flujo de caja |

---

### Schemas

**chart-of-accounts.schema.ts** (45 líneas)
```typescript
Campos principales:
- name: string (nombre descriptivo)
- code: string (1101, 2102, etc - único por tenant)
- type: enum ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Gasto"]
- parent: ObjectId (para jerarquía)
- isSystemAccount: boolean (si es del sistema)
- isEditable: boolean (si se puede modificar)
- metadata: Object (información adicional)

Índice: { tenantId: 1, code: 1 } UNIQUE
```

**journal-entry.schema.ts** (55 líneas)
```typescript
Campos principales:
- date: Date (fecha del asiento)
- description: string (descripción)
- lines: JournalLine[] (líneas del asiento)
  └─ account: ObjectId (referencia a ChartOfAccounts)
  └─ debit: number
  └─ credit: number
  └─ description: string
- tenantId: string (multi-tenant)
- isAutomatic: boolean (generado automáticamente)
- metadata: Object (origen de transacción)

Índices:
- { date: -1, tenantId: 1 }
- { isAutomatic: 1, tenantId: 1 }
- { "lines.account": 1, tenantId: 1 }
```

---

## INTEGRACIÓN - MÓDULOS QUE LLAMAN CONTABILIDAD

### orders.service.ts
**Ruta**: `/src/modules/orders/orders.service.ts`

**Llamadas a contabilidad:**
```typescript
Línea 425-432: setImmediate(() => {
  this.accountingService.createJournalEntryForSale(savedOrder, user.tenantId);
  this.accountingService.createJournalEntryForCOGS(savedOrder, user.tenantId);
});
```
- Ejecuta sin bloquear la respuesta
- Si falla, se loga error pero orden se guarda

**Cálculo de impuestos:**
- Línea 209: `ivaAmount = totalPrice * 0.16` (para producto)
- Línea 303: `igtfTotal = foreignCurrencyPaymentAmount * 0.03`

---

### payments.service.ts
**Ruta**: `/src/modules/payments/payments.service.ts`

**Método handleSalePayment() - Línea 155-210:**
```typescript
await this.accountingService.createJournalEntryForPayment(
  order,
  payment,
  tenantId,
  igtfAmount  // Si hay IGTF
);
```

**Método handlePayablePayment() - Línea 212-303:**
```typescript
await this.accountingService.createJournalEntryForPayablePayment(
  payment,
  payable,
  tenantId
);
```

---

### purchases.service.ts
**Ruta**: `/src/modules/purchases/purchases.service.ts`

**receivePurchaseOrder() - Línea 194+:**
- Auto-crea Payable(s) después de recibir
- Si hay advance payment, crea 2 payables (adelanto + saldo)
- Cada Payable dispara `createJournalEntryForPayable()`

**Línea 260-265:** findOrCreateAccount para inventario (1103)

---

### payables.service.ts
**Ruta**: `/src/modules/payables/payables.service.ts`

**create() - Línea 152-252:**
```typescript
Línea 201-204: 
await this.accountingService.createJournalEntryForPayable(
  savedPayable,
  tenantId
);
```
- Lanza error al cliente si falla (a diferencia de orders)

**Línea 157-174:** Calcula totalAmountVes usando exchange rate

---

## DTOs - VALIDACIÓN

**accounting.dto.ts** (67 líneas)
```typescript
CreateChartOfAccountDto:
  - name: string
  - type: enum [Ingreso, Gasto, Activo, Pasivo, Patrimonio]
  - description?: string

CreateJournalLineDto:
  - accountId: string
  - debit: number (min: 0)
  - credit: number (min: 0)
  - description?: string

CreateJournalEntryDto:
  - date: dateString
  - description: string
  - lines: CreateJournalLineDto[] (min 2)
```

---

## HELPERS / UTILIDADES

**findAccountByCode()** - Línea 193-209
```typescript
async findAccountByCode(code: string, tenantId: string)
  → Busca cuenta por código
  → Lanza error si no existe
  → Usado para cuentas obligatorias (1101, 2102, etc)
```

**findOrCreateAccount()** - Línea 211-237
```typescript
async findOrCreateAccount(accountDetails, tenantId)
  → Busca cuenta
  → Si no existe, la crea como isSystemAccount=true, isEditable=false
  → Usado para cuentas opcionales (1103, 4102, 599, etc)
```

---

## FRONTEND - COMPONENTES REACT

**Ruta base**: `/food-inventory-admin/src/`

### Componentes

| Archivo | Componente | Función |
|---------|-----------|----------|
| `components/ChartOfAccountsView.jsx` | ChartOfAccountsView | Lista todas las cuentas |
| `components/ChartOfAccountForm.jsx` | ChartOfAccountForm | Formulario crear cuenta |
| `components/JournalEntriesView.jsx` | JournalEntriesView | Lista asientos |
| `components/JournalEntryForm.jsx` | JournalEntryForm | Formulario crear asiento |
| `components/AccountingDashboard.jsx` | AccountingDashboard | Dashboard contable |
| `components/AccountingManagement.jsx` | AccountingManagement | Gestión principal |
| `components/AccountsReceivableReport.jsx` | A/R Report | Cuentas por cobrar |
| `components/AccountsPayableReport.jsx` | A/P Report | Cuentas por pagar |
| `context/AccountingContext.jsx` | AccountingContext | Estado global |

---

## BÚSQUEDA RÁPIDA DE CÓDIGO

**Buscar "createJournalEntry" en el proyecto:**
```bash
grep -r "createJournalEntry" /src --include="*.ts"
```

**Resultados esperados:**
1. Definición en accounting.service.ts
2. Llamada en orders.service.ts (línea 425-432)
3. Llamada en payments.service.ts (línea 196-200, 289-293)
4. Llamada en payables.service.ts (línea 201-204)

**Buscar referencias a cuentas específicas:**
```bash
grep -r "\"1101\"\|\"2102\"\|\"5101\"" /src --include="*.ts"
```

---

## VALIDACIONES CLAVE EN CÓDIGO

**Línea 161-169** (accounting.service.ts):
```typescript
const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

if (Math.abs(totalDebits - totalCredits) > 0.001) {
  throw new BadRequestException("Total debits must equal total credits.");
}
```

**Línea 171-175** (accounting.service.ts):
```typescript
if (totalDebits === 0 && totalCredits === 0) {
  throw new BadRequestException("Journal entry must have non-zero values.");
}
```

---

## COLUMNAS IMPORTANTES EN MONGODB

**Collection: chartofaccounts**
```
_id: ObjectId
name: String
code: String (índice único con tenantId)
type: String (Activo|Pasivo|Patrimonio|Ingreso|Gasto)
tenantId: String
isSystemAccount: Boolean
isEditable: Boolean
createdAt: Date
updatedAt: Date
```

**Collection: journalentries**
```
_id: ObjectId
date: Date
description: String
lines: [
  {
    account: ObjectId (ref chartofaccounts)
    debit: Number
    credit: Number
    description: String
  }
]
tenantId: String
isAutomatic: Boolean
metadata: Object
createdAt: Date
updatedAt: Date
```

