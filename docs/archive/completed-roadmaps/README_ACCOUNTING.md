# DOCUMENTACIÓN DEL SISTEMA DE CONTABILIDAD

## Índice de Documentos

### 1. ACCOUNTING_SYSTEM_ANALYSIS.md (31 KB) - ANÁLISIS TÉCNICO COMPLETO
**Contenido:**
- Estructura del Plan de Cuentas
- Definición de Asientos Contables
- Flujo de datos de transacciones → asientos
- Integración con otros módulos
- Reportes contables
- Endpoints de API
- Ejemplos código real

**Para quién:** Desarrolladores, arquitectos, analistas técnicos
**Usar para:** Entender el funcionamiento completo, modificar comportamiento

---

### 2. ACCOUNTING_SUMMARY.md (9 KB) - RESUMEN EJECUTIVO
**Contenido:**
- Ubicación de archivos clave
- Flujos contables automáticos visualizados
- Tratamiento de impuestos (IVA, IGTF)
- Tabla de reportes
- Características técnicas
- Checklist de configuración

**Para quién:** Gerentes, contadores, usuarios finales
**Usar para:** Entender qué está pasando, configurar sistema

---

### 3. CHART_OF_ACCOUNTS.md (9 KB) - MATRIZ DE CUENTAS
**Contenido:**
- Estructura y codificación de cuentas
- Listado completo de 1xxx a 5xxx
- Matriz de relaciones transaccionales
- Saldos naturales
- Cuentas auto-creadas
- Ejemplos de consultas MongoDB

**Para quién:** Contadores, auditores, configuradores
**Usar para:** Consultar qué cuenta usar, entender codificación

---

## ARCHIVOS DEL CÓDIGO FUENTE

### Backend (TypeScript/NestJS)

```
/src/modules/accounting/
├── accounting.service.ts          (1,124 líneas)
│   └─ createJournalEntryForSale()
│   └─ createJournalEntryForCOGS()
│   └─ createJournalEntryForPayment()
│   └─ createJournalEntryForPurchase()
│   └─ createJournalEntryForPayable()
│   └─ getBalanceSheet()
│   └─ getProfitAndLoss()
│   └─ getCashFlowStatement()
│   └─ getAccountsReceivable()
│   └─ getAccountsPayable()
│
├── accounting.controller.ts       (113 líneas)
│   └─ POST   /accounts
│   └─ GET    /accounts
│   └─ POST   /journal-entries
│   └─ GET    /journal-entries
│   └─ GET    /reports/profit-and-loss
│   └─ GET    /reports/balance-sheet
│   └─ GET    /reports/accounts-receivable
│   └─ GET    /reports/accounts-payable
│   └─ GET    /reports/cash-flow-statement
│
└── accounting.module.ts           (Inyecciones de dependencias)

/src/schemas/
├── chart-of-accounts.schema.ts    (45 líneas)
│   └─ ChartOfAccounts (MongoDB model)
│   └─ ACCOUNT_TYPES = ["Activo", "Pasivo", ...]
│
└── journal-entry.schema.ts        (55 líneas)
    └─ JournalEntry (MongoDB model)
    └─ JournalLine (sub-documento)

/src/dto/
└── accounting.dto.ts              (67 líneas)
    ├─ CreateChartOfAccountDto
    ├─ CreateJournalLineDto
    └─ CreateJournalEntryDto
```

### Integración en Otros Módulos

**Orders Module** (`/src/modules/orders/orders.service.ts` línea 425-432):
```typescript
setImmediate(async () => {
  await this.accountingService.createJournalEntryForSale(savedOrder, user.tenantId);
  await this.accountingService.createJournalEntryForCOGS(savedOrder, user.tenantId);
});
```

**Payments Module** (`/src/modules/payments/payments.service.ts` línea 196-200, 289-293):
```typescript
await this.accountingService.createJournalEntryForPayment(order, payment, tenantId);
await this.accountingService.createJournalEntryForPayablePayment(payment, payable, tenantId);
```

**Purchases Module** (`/src/modules/purchases/purchases.service.ts`):
- Auto-crea Payables al recibir PO
- Los Payables disparan asientos automáticos

**Payables Module** (`/src/modules/payables/payables.service.ts` línea 201-204):
```typescript
await this.accountingService.createJournalEntryForPayable(savedPayable, tenantId);
```

### Frontend (React)

```
/food-inventory-admin/src/
├── components/
│   ├── ChartOfAccountsView.jsx     - Lista de cuentas
│   ├── ChartOfAccountForm.jsx      - Formulario crear cuenta
│   ├── JournalEntriesView.jsx      - Lista de asientos
│   ├── JournalEntryForm.jsx        - Formulario crear asiento
│   ├── AccountingDashboard.jsx     - Dashboard contable
│   ├── AccountingManagement.jsx    - Gestión contable
│   ├── AccountsReceivableReport.jsx
│   ├── AccountsPayableReport.jsx
│   └── BankAccountsManagement.jsx
│
└── context/
    └── AccountingContext.jsx       - Estado global contabilidad
```

---

## FLUJOS CONTABLES PRINCIPALES

### 1. Venta (3 asientos)
```
Orden creada → Asiento de venta → Asiento COGS → Pago → Asiento de cobro
```

### 2. Compra (2-3 asientos)
```
PO recibida → Asiento de compra → Payable creado → Pago → Asiento de pago
```

### 3. Gastos (2 asientos)
```
Payable creado → Asiento flexible → Pago → Asiento de pago
```

---

## VALIDACIONES CRÍTICAS

1. **Ecuación Contable**: Débitos = Créditos (±0.001 tolerancia)
2. **Mínimo 2 líneas** por asiento
3. **Montos > 0**: Total débitos o créditos > 0
4. **Cuentas deben existir**: findAccountByCode() lanza error si no
5. **Cuentas únicas por tenant**: Índice (tenantId, code)

---

## IMPUESTOS

### IVA (16%)
- Calculado automáticamente en órdenes
- Cuenta: 2102 Impuestos por Pagar
- Línea de crédito en asiento de venta

### IGTF (3% sobre USD)
- Calculado cuando hay pagos en divisa extranjera
- Cuenta débito: 599 Gasto IGTF
- Cuenta crédito: 2102 Impuestos por Pagar

---

## CONFIGURACIÓN INICIAL

**Cuentas mínimas requeridas:**
- 1101 (Caja y Bancos)
- 1102 (Cuentas por Cobrar)
- 2101 (Cuentas por Pagar)
- 2102 (Impuestos por Pagar)
- 4101 (Ingresos por Ventas)
- 5101 (COGS)

**Las siguientes se crean automáticamente:**
- 1103 (Inventario)
- 4102 (Envío)
- 4103 (Descuentos)
- 2103 (Anticipos)
- 599 (IGTF)

---

## REPORTES DISPONIBLES

| Reporte | Qué mide | Cálculo |
|---------|----------|---------|
| Balance Sheet | Posición financiera | Activos vs Pasivos+Patrimonio |
| Profit & Loss | Rentabilidad | Ingresos - Gastos = Utilidad |
| A/R | Clientes deudores | Órdenes pending/partial |
| A/P | Proveedores acreedores | Payables open/partially_paid |
| Cash Flow | Movimiento caja | Entradas - Salidas |

---

## MANEJO DE ERRORES

### Si falla creación de asiento:
1. Transacción se guarda igual
2. Error se loga (Logger)
3. Se notifica al usuario
4. Requiere revisión manual

**Ejemplo:**
```
ERROR: Failed to create journal entry for sale payment
Error: Account with code "1101" not found for tenant "123"
→ Usuario debe crear manualmente la cuenta 1101
```

---

## PREGUNTAS FRECUENTES

**P: ¿Qué pasa si no existe la cuenta?**
R: `findAccountByCode()` lanza error. Para cuentas estándar, usar `findOrCreateAccount()`.

**P: ¿Puedo crear asientos manualmente?**
R: Sí, endpoint `POST /journal-entries` (líneas débito/crédito balanceadas).

**P: ¿Se revierte transacción si falla asiento?**
R: No. La transacción se guarda, solo falla el asiento. Revisar logs.

**P: ¿Puedo editar un asiento generado?**
R: No. Los asientos son de auditoría. Crear asiento de reversión si es necesario.

**P: ¿Cómo se calcula la utilidad neta?**
R: En balance sheet: suma de ingresos (crédito) - suma de gastos (débito).

---

## ÍNDICES DE BASE DE DATOS

### ChartOfAccounts
```
{ tenantId: 1, code: 1 } - UNIQUE
```

### JournalEntry
```
{ date: -1, tenantId: 1 }
{ tenantId: 1, createdAt: -1 }
{ isAutomatic: 1, tenantId: 1 }
{ "lines.account": 1, tenantId: 1 }
```

---

## COMANDOS ÚTILES (MongoDB)

### Ver todas las cuentas de Activo
```javascript
db.chartofaccounts.find({ tenantId: ObjectId("..."), type: "Activo" })
```

### Ver asientos de un período
```javascript
db.journalentries.find({ 
  tenantId: ObjectId("..."), 
  date: { $gte: ISODate("2024-01-01"), $lte: ISODate("2024-12-31") }
}).sort({ date: -1 })
```

### Verificar balance de cuenta
```javascript
db.journalentries.aggregate([
  { $unwind: "$lines" },
  { $match: { "lines.account": ObjectId("...") } },
  { $group: {
      _id: "$lines.account",
      debits: { $sum: "$lines.debit" },
      credits: { $sum: "$lines.credit" }
    }
  }
])
```

---

## REFERENCIAS

- **Análisis técnico**: ACCOUNTING_SYSTEM_ANALYSIS.md
- **Resumen ejecutivo**: ACCOUNTING_SUMMARY.md
- **Plan de cuentas**: CHART_OF_ACCOUNTS.md
- **Código fuente**: `/src/modules/accounting/`
- **Integración**: Buscar "createJournalEntry" en otros módulos

---

## CONTACTO / SOPORTE

Para preguntas sobre contabilidad:
1. Revisar documentación relevante (arriba)
2. Ver código en `/src/modules/accounting/`
3. Buscar en logs: `Logger.error()` en accounting.service.ts

