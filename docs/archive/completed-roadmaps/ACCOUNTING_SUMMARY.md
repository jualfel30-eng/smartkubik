# RESUMEN EJECUTIVO - SISTEMA DE CONTABILIDAD

## Ubicación de Archivos Clave

### Backend (NestJS):
- `/src/modules/accounting/accounting.service.ts` - Lógica principal de asientos
- `/src/modules/accounting/accounting.controller.ts` - API endpoints
- `/src/modules/accounting/accounting.module.ts` - Configuración módulo
- `/src/schemas/chart-of-accounts.schema.ts` - Definición de cuentas
- `/src/schemas/journal-entry.schema.ts` - Estructura de asientos
- `/src/dto/accounting.dto.ts` - DTOs para validación

### Frontend (React):
- `/food-inventory-admin/src/components/ChartOfAccountsView.jsx` - Vista del catálogo
- `/food-inventory-admin/src/components/JournalEntriesView.jsx` - Vista de asientos
- `/food-inventory-admin/src/components/JournalEntryForm.jsx` - Formulario de asientos

---

## FLUJOS CONTABLES AUTOMÁTICOS

### 1. VENTA + COGS + PAGO (Caso Completo)

```
Cliente crea orden $116 (subtotal $100 + IVA $16)
        ↓
    [Orden guardada]
        ↓
┌─────────────────────────────────────────────┐
│ ASIENTO 1: VENTA (automático)               │
├─────────────────────────────────────────────┤
│ Débito:  1102 Cuentas por Cobrar  │ $116   │
│ Crédito: 4101 Ingresos por Venta  │ $100   │
│ Crédito: 2102 Impuestos por Pagar │ $16    │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ ASIENTO 2: COGS (automático)                │
│ (Si cost = $50)                             │
├─────────────────────────────────────────────┤
│ Débito:  5101 COGS                │ $50    │
│ Crédito: 1103 Inventario          │ $50    │
└─────────────────────────────────────────────┘
        ↓
Cliente registra pago $116
        ↓
┌─────────────────────────────────────────────┐
│ ASIENTO 3: PAGO (automático)                │
├─────────────────────────────────────────────┤
│ Débito:  1101 Caja y Bancos       │ $116   │
│ Crédito: 1102 Cuentas por Cobrar  │ $116   │
└─────────────────────────────────────────────┘
        ↓
[Orden estado = "paid"]
```

**Resultado final (Balance):**
```
Activos:
  Caja (+116) - Cuentas por Cobrar (-116) + Inventario (-50) = +50
Pasivos:
  Impuestos (+16) = +16
Patrimonio:
  Utilidad Neta = Ingresos 100 - COGS 50 = +50

Ecuación: 50 + 16 + 50 = Balance
```

---

### 2. COMPRA + PAYABLE + PAGO

```
Compra de mercancía por $500
        ↓
[PO recibida, stock actualizado]
        ↓
┌─────────────────────────────────────────────┐
│ ASIENTO 1: COMPRA (automático)              │
│ Genera automáticamente un Payable           │
├─────────────────────────────────────────────┤
│ Débito:  1103 Inventario          │ $500   │
│ Crédito: 2101 Cuentas por Pagar   │ $500   │
└─────────────────────────────────────────────┘
        ↓
Proveedor paga
        ↓
┌─────────────────────────────────────────────┐
│ ASIENTO 2: PAGO (automático)                │
├─────────────────────────────────────────────┤
│ Débito:  2101 Cuentas por Pagar   │ $500   │
│ Crédito: 1101 Caja y Bancos       │ $500   │
└─────────────────────────────────────────────┘
        ↓
[Payable estado = "paid"]
```

---

### 3. GASTOS (Payables Flexibles)

```
Crear Payable para gastos diversos
(nómina, servicios, gastos operacionales)
        ↓
┌─────────────────────────────────────────────┐
│ ASIENTO: PAYABLE FLEXIBLE (automático)      │
│ Las cuentas vienen del Payable.lines        │
├─────────────────────────────────────────────┤
│ Débito:  5205 Gasto Prestaciones  │ $100   │
│ Débito:  5206 Gasto Seg. Social   │ $200   │
│ Crédito: 2101 Cuentas por Pagar   │ $300   │
└─────────────────────────────────────────────┘
        ↓
Pagar el Payable
        ↓
┌─────────────────────────────────────────────┐
│ ASIENTO: PAGO PAYABLE (automático)          │
├─────────────────────────────────────────────┤
│ Débito:  2101 Cuentas por Pagar   │ $300   │
│ Crédito: 1101 Caja y Bancos       │ $300   │
└─────────────────────────────────────────────┘
```

---

## IMPUESTOS

### IVA (16%)
- Se calcula: `subtotal × 0.16`
- Cuenta: **2102 Impuestos por Pagar** (Pasivo)
- Tratamiento: Se acumula como obligación tributaria

### IGTF (3% sobre divisas extranjeras)
- Se calcula: `(monto USD) × 0.03`
- Se aplica en: Pagos con divisa extranjera
- Tratamiento Contable: 
  - Gasto: **599 Gasto IGTF** (Débito)
  - Provisión: **2102 Impuestos por Pagar** (Crédito)

---

## REPORTES

| Reporte | Endpoint | Descripción |
|---------|----------|-------------|
| **Estado de Resultados** | `/profit-and-loss?from=...&to=...` | Ingresos - Gastos = Utilidad |
| **Balance General** | `/balance-sheet?asOfDate=...` | Activos = Pasivos + Patrimonio |
| **Cuentas por Cobrar** | `/accounts-receivable` | Órdenes pendientes/parciales pagadas |
| **Cuentas por Pagar** | `/accounts-payable` | Payables pendientes de pago |
| **Flujo de Caja** | `/cash-flow-statement?from=...&to=...` | Entradas - Salidas de dinero |

---

## CARACTERÍSTICAS TÉCNICAS

### Validaciones:
- Débitos = Créditos (tolerancia ±0.001)
- Mínimo 2 líneas por asiento
- Montos > 0

### Automatización:
- Los asientos se crean automáticamente desde transacciones
- Si falla contabilidad, la transacción se guarda igual
- Logs de error para auditoría

### Multi-tenant:
- Cada tenant tiene su propio plan de cuentas
- Índices únicos por (tenant, código)

### Flexibilidad:
- Algunas cuentas se crean automáticamente si no existen
- Descuentos, envíos, impuestos generan líneas dinámicas

---

## INTEGRACIÓN CON MÓDULOS

```
Orders Module
    └─→ createJournalEntryForSale()
    └─→ createJournalEntryForCOGS()

Payments Module
    └─→ createJournalEntryForPayment() [sale]
    └─→ createJournalEntryForPayablePayment() [payable]

Purchases Module
    └─→ Auto-creates Payable
        └─→ createJournalEntryForPayable()

Payables Module
    └─→ createJournalEntryForPayable()
```

---

## DATOS DE PRUEBA

### Cuenta de Prueba (Chart of Accounts)
```json
{
  "code": "1101",
  "name": "Caja y Bancos",
  "type": "Activo",
  "tenantId": "tenant-123",
  "isSystemAccount": true,
  "isEditable": false
}
```

### Asiento Manual
```json
{
  "date": "2024-11-13",
  "description": "Depósito de inversión inicial",
  "lines": [
    {
      "accountId": "1101",
      "debit": 10000,
      "credit": 0,
      "description": "Depósito de inversión"
    },
    {
      "accountId": "3101",
      "debit": 0,
      "credit": 10000,
      "description": "Capital invertido"
    }
  ]
}
```

---

## CHECKLIST DE CONFIGURACIÓN INICIAL

- [ ] Crear cuentas Activo principales (1101, 1102, 1103)
- [ ] Crear cuentas Pasivo principales (2101, 2102)
- [ ] Crear cuentas Patrimonio (3101)
- [ ] Crear cuentas Ingresos (4101, 4102, 4103)
- [ ] Crear cuentas Gastos (5101, 599)
- [ ] Verificar que se crean automáticas en primer asiento
- [ ] Probar flujo completo: Orden → Venta → Pago
- [ ] Validar balance sheet cierre

