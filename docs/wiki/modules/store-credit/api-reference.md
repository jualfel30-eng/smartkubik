# Saldo a favor — Referencia API

> Última actualización: 2026-07-01

## Metadata

- **Módulo**: `src/modules/store-credit/`
- **Service**: `store-credit.service.ts` (`getBalance`, `getMovements`, `credit`, `debit`)
- **Guard stack**: JwtAuthGuard → TenantGuard → PermissionsGuard
- **Permiso**: `customers_read` (lectura).

---

## GET /api/v1/store-credit/:customerId

Saldo a favor actual del cliente.

- **Respuesta**: `{ success: true, data: { customerId, balance, currency: "USD" } }`

## GET /api/v1/store-credit/:customerId/movements

Ledger de movimientos del cliente (más recientes primero).

- **Respuesta**: `{ success: true, data: StoreCreditMovement[] }`

## POST /api/v1/orders/:id/redeem-store-credit  (redención)

Aplica el saldo a favor del cliente al saldo pendiente de la orden. Vive en el módulo Orders (`OrdersController`) porque es una operación de cobro.

- **Permiso**: `orders_update`
- **Body**: `{ amount?: number }` — omitido/mayor al disponible ⇒ aplica el **mínimo(saldo, pendiente)**.
- **Flujo**: debita el ledger (`source: order_redemption`) → registra un pago `method: 'store_credit'` en la orden vía `registerPayments` (recalcula estado y dispara hooks de "pagada"). Si el pago no se refleja, **revierte el débito** (compensación).
- **Errores 400**: cliente sin saldo · orden ya pagada/cancelada/devuelta · orden sin cliente.
- Nota: el pago de una orden **no** genera asiento contable automático; la redención sólo mueve el ledger + el pago de la orden.

---

## Uso interno (no es un endpoint)

`StoreCreditService` es consumido por otros módulos:

- **`credit(params)`** — acredita saldo. Lo llama Devoluciones cuando `refundMethod='store_credit'`. `$inc` + upsert (atómico). Devuelve `{ balance, movement }`.
- **`debit(params)`** — descuenta saldo. Lo llama la redención al cobrar una orden. `findOneAndUpdate` con filtro `balance >= amount`; si no hay suficiente lanza `BadRequest("Saldo a favor insuficiente")`.
- `params`: `{ tenantId, customerId, amount, source, referenceId?, reference?, reason?, createdBy? }`.
