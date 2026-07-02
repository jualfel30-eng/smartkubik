# Saldo a favor (Store Credit)

## ¿Qué es?

El **motor de saldo a favor** lleva un balance de crédito por cliente y tenant: dinero que el negocio le debe al cliente y que éste puede usar en compras futuras. Es un dominio compartido — hoy lo **acredita** el módulo de Devoluciones (cuando se devuelve una compra "a saldo a favor" en vez de efectivo, incluido el flujo de **cambio**) y lo **redime** el flujo de cobro de órdenes (manual desde el historial, o automático al completar un cambio).

## ¿Para quién es?

- **Cliente**: acumula saldo cuando devuelve algo sin efectivo y lo gasta en su próxima compra.
- **Cajero**: elige "saldo a favor" al procesar una devolución; aplica el saldo al cobrar.
- **Sistema**: mantiene el balance atómico y un ledger auditable de cada movimiento.

## ¿Qué problema resuelve?

- Permite devolver sin sacar efectivo de la caja (retiene el dinero como crédito del cliente).
- Da trazabilidad completa: cada crédito/débito queda en el ledger con su `balanceAfter`.

## Cómo funciona

- Un documento `StoreCreditAccount` por `(tenantId, customerId)` con `balance` (USD).
- El balance se muta **atómicamente**: `credit` con `$inc`+upsert; `debit` con `findOneAndUpdate` filtrando `balance >= amount` (a prueba de carreras, sin read-modify-write).
- Cada mutación escribe un `StoreCreditMovement` (append-only) con `type`, `amount`, `balanceAfter`, `source` (`return` | `order_redemption` | `manual`) y referencia.

## Contabilidad

- **Acreditar** (devolución a saldo): crédito al pasivo "Saldo a favor de clientes" (2104) — el negocio queda debiéndole al cliente. Lo hace el asiento de la devolución (`ReturnsAccountingService`, `refundMethod='store_credit'`).
- **Redimir** (usar saldo al cobrar): el pago de la orden con método `store_credit` reduce ese pasivo. El pago de una orden NO genera asiento automático (la contabilidad ocurre al facturar), así que la redención sólo mueve el ledger + el pago de la orden.

## Dónde se ve el saldo

- **POS** (`NewOrderFormV2`): al seleccionar el cliente en una orden nueva, un chip "Saldo a favor: $X".
- **CRM** (`ContactDetailPanel`): chip en la ficha del cliente.
- Componente compartido: `food-inventory-admin/src/components/orders/CustomerStoreCreditChip.jsx` (consulta `GET /store-credit/:customerId`; sólo se muestra si el saldo > 0).

## Ubicación

- Backend: `food-inventory-saas/src/modules/store-credit/`
- Acreditación: [modules/returns/](../returns/overview.md) (`refundMethod='store_credit'`).
- Redención: `POST /orders/:id/redeem-store-credit` (flujo de cobro).
