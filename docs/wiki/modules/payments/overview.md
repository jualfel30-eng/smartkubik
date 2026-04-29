# Pagos (Payments)

## ¿Qué es?

El módulo de Pagos es el **procesador de cobros y pagos** — registra cada transacción monetaria del negocio, ya sea un cobro de una venta (sale) o un pago a un proveedor (payable). Maneja multi-método, multi-moneda, IGTF automático, reconciliación bancaria, y allocación a múltiples documentos.

## Funcionalidades principales

- **Dual-purpose**: Pagos de ventas (sale) y pagos de cuentas por pagar (payable)
- **Multi-método**: Efectivo, tarjeta, transferencia, Zelle, Pago Móvil, Binance
- **IGTF automático**: 3% calculado para pagos en divisas
- **Cambio inteligente**: Manejo de vuelto simple (misma moneda) y mixto (USD→VES)
- **Idempotencia**: Previene pagos duplicados por key o reference+method+amount
- **Reconciliación**: Status: pending → matched / manual / rejected
- **Allocación multi-documento**: Un pago puede distribuirse entre múltiples órdenes/payables
- **Integración bancaria**: Actualiza saldo de BankAccount y crea BankTransaction
- **Integración contable**: Para payables, crea asiento automático (DR CxP, CR Caja)
- **State machine**: draft → pending_validation → confirmed → reversed/refunded

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/payments` | Crear pago (sale o payable) |
| GET | `/api/v1/payments` | Listar con filtros |
| GET | `/api/v1/payments/:id` | Detalle |
| POST | `/api/v1/payments/:id/allocations` | Allocar a múltiples documentos |
| PATCH | `/api/v1/payments/:id/reconcile` | Reconciliar con banco |
| PATCH | `/api/v1/payments/:id/status` | Cambiar estado |
| GET | `/api/v1/payments/summary` | Resumen por método/status/moneda |
| GET | `/api/v1/payments/aging` | Aging report (0-30, 30-60, 60-90, >90 días) |

## Schema clave: Payment

- `paymentType`: sale / payable
- `orderId` / `payableId` → referencia al documento
- `amount`, `amountVes`, `currency`, `method`, `reference`
- `status`: draft / pending_validation / confirmed / failed / reversed / refunded
- `reconciliationStatus`: pending / matched / manual / rejected
- `bankAccountId` → BankAccount
- `fees`: { igtf, other }
- `amountTendered`, `changeGiven`, `changeGivenBreakdown` (mixto USD+VES)
- `allocations[]`: [{ documentId, documentType, amount }]
- `idempotencyKey` (previene duplicados)
- `statusHistory[]` (audit trail)

---

*Última actualización: 2026-04-28*
*Archivos fuente: `modules/payments/`*
