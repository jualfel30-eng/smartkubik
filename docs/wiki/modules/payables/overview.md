# Cuentas por Pagar (Payables)

## ¿Qué es?

El módulo de Cuentas por Pagar es el **registro de deudas del negocio** — cada compra a crédito, cada factura de servicio, cada gasto pendiente de pago. Gestiona el ciclo completo desde que se registra la deuda hasta que se paga, con soporte para pagos parciales y aging report.

## Funcionalidades principales

- **Tipos de payable**: Orden de compra, nómina, servicio, utilidades, otro
- **Lifecycle**: draft → open → partially_paid → paid / void
- **Pagos parciales**: Registra múltiples pagos hasta completar el monto
- **Multi-moneda**: Monto original + conversión VES con tasa BCV
- **Aging automático**: Clasifica deudas por antigüedad (0-30, 30-60, 60-90, >90 días)
- **Payables recurrentes**: Plantillas que generan payables automáticamente (alquiler, servicios)
- **Vinculación a POs**: Se crea automáticamente al recibir una orden de compra
- **Split de adelanto**: Compras con adelanto generan 2 payables (adelanto inmediato + saldo)
- **Integración contable**: Pago de payable crea asiento (DR CxP, CR Caja)

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/payables` | Crear payable |
| GET | `/api/v1/payables` | Listar con filtros (currency, status, overdue, aging) |
| GET | `/api/v1/payables/:id` | Detalle |
| PATCH | `/api/v1/payables/:id` | Actualizar |
| GET | `/api/v1/payables/summary` | Resumen dashboard |
| GET | `/api/v1/payables/aging` | Aging report |
| POST | `/api/v1/recurring-payables` | Crear payable recurrente |
| GET | `/api/v1/recurring-payables` | Listar recurrentes |

## Schema clave: Payable

- `payableNumber` (único), `type` (purchase_order/payroll/service_payment/utility_bill/other)
- `payeeType` (supplier/employee/custom), `payeeId`, `payeeName`
- `issueDate`, `dueDate` (para aging)
- `lines[]`: description, amount, quantity, unitPrice, accountId → COA
- `totalAmount`, `totalAmountVes` (convertido con BCV)
- `paidAmount`, `paidAmountVes` (acumulado)
- `status`: draft / open / partially_paid / paid / void
- `expectedCurrency`: USD/VES/EUR/USD_BCV/EUR_BCV
- `relatedPurchaseOrderId` → PurchaseOrder
- `paymentRecords[]` (historial de pagos inline)
- `isCredit` (para líneas de crédito)

## Generación automática desde Compras

```
PO Recibida → receivePurchaseOrder()
  ├── Sin adelanto: 1 payable por totalAmount (vence: paymentDueDate)
  └── Con adelanto: 2 payables
       ├── Payable 1: advanceAmount (vence: hoy, inmediato)
       └── Payable 2: remainingBalance (vence: paymentDueDate)
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `modules/payables/`, `modules/recurring-payables/`*
