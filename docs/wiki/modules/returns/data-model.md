# Devoluciones — Modelo de datos

## Colección `returns`

Schema: `src/modules/returns/schemas/return.schema.ts`

| Campo | Tipo | Notas |
|---|---|---|
| `returnNumber` | String | `RET-<año>-NNNN`. Único **por tenant** (índice compuesto `{ tenantId, returnNumber }`), NO global. Secuencial MAX+1. |
| `orderId` | ObjectId → Order | Orden devuelta. |
| `orderNumber` | String | Denormalizado. |
| `customerId` / `customerName` | ObjectId / String | Denormalizado de la orden. |
| `items[]` | ReturnItem[] | Ítems devueltos (ver abajo). |
| `refundMethod` | String enum | `cash` (sale de caja) \| `store_credit` (acredita saldo a favor). `original_method` pendiente. |
| `refundAmountUsd` | Number | Monto reembolsado en USD (lo efectivamente cobrado; fallback a `totalAmount`). |
| `refundAmountVes` | Number | Monto reembolsado en VES (de `paidAmountVes`). |
| `currency` | String | Default `USD`. |
| `isPartial` | Boolean | `true` si la orden quedó con ítems sin devolver tras esta devolución. |
| `isExchange` | Boolean | `true` si la devolución es parte de un cambio (se devolvió a saldo a favor para financiar una orden nueva). |
| `reason` | String | Opcional. |
| `status` | String enum | `completed` \| `pending` \| `cancelled`. Fase 0 nace `completed`. |
| `cashSessionId` | ObjectId | Sesión de caja de la que salió el efectivo. |
| `journalEntryId` | ObjectId → JournalEntry | Asiento contable de la devolución (débito 4102 / crédito 1101 o 2104). |
| `storeCreditMovementId` | ObjectId | Movimiento de saldo a favor generado (si `refundMethod='store_credit'`). |
| `inventoryMovementIds[]` | ObjectId[] | Movimientos `IN` de reingreso. |
| `refundedPaymentIds[]` | ObjectId[] | Pagos marcados como `refunded`. |
| `createdBy` | ObjectId → User | |
| `tenantId` | ObjectId | Siempre ObjectId (colección nueva, controlada). |
| `createdAt` / `updatedAt` | Date | `timestamps: true`. |

### Sub-documento `ReturnItem`

| Campo | Tipo | Notas |
|---|---|---|
| `productId` / `productSku` / `productName` | | Denormalizado. |
| `quantity` | Number | Cantidad devuelta en esta devolución (unidad de venta). |
| `selectedUnit` / `conversionFactor` / `quantityInBaseUnit` | | Multi-unidad — el reingreso usa `quantityInBaseUnit`. |
| `unitPrice` | Number | |
| `refundAmount` | Number | Subtotal reembolsado de la línea (= `item.totalPrice` de la orden). |
| `warehouseId` | ObjectId | Almacén al que se reingresó. |
| `inventoryMovementId` | ObjectId | Movimiento `IN` de esta línea. |

## Índices

- `{ tenantId, returnNumber }` único
- `{ tenantId, orderId }`

## Campo en `orders` (colección Order)

Las devoluciones parciales trackean por línea con un campo añadido a `OrderItem`:

| Campo | Tipo | Notas |
|---|---|---|
| `returnedQuantity` | Number (default 0) | Cantidad ya devuelta de esa línea, acumulativa. Órdenes legacy sin el campo se leen como `|| 0`. La línea queda "agotada" cuando `returnedQuantity >= quantity`. |

## Efectos sobre otras colecciones

- **`orders`**: si la devolución completa la orden → `status` = `refunded`, `paymentStatus` = `refunded`. Si queda saldo → `status` = `partially_returned` (paymentStatus sigue `paid`). Siempre actualiza `items[].returnedQuantity`.
- **`inventorymovements`**: un `IN` por ítem (`reason: "Devolución - Orden <n>"`).
- **`inventories`**: `totalQuantity` y `availableQuantity` incrementadas.
- **`cashregistersessions`**: (sólo `refundMethod='cash'`) `cashMovements` con `type: 'out'` (aparece en `cashOutMovements` del cierre).
- **`storecreditaccounts` / `storecreditmovements`**: (sólo `refundMethod='store_credit'`) acredita el saldo del cliente + movimiento `credit` source `return`.
- **`journalentries`**: un asiento `order_return_refund` (débito 4102 / crédito 1101). `chartofaccounts`: crea 4102/1101 si faltan.
- **`payments`**: `status` → `refunded` (best-effort).
