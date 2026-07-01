# Devoluciones — Funciones

## Backend — `ReturnsService` (`src/modules/returns/returns.service.ts`)

### `createReturn(orderId, dto, user): Promise<ReturnDocument>`
Orquesta una devolución total o parcial con reembolso en efectivo. Ver [flows.md](flows.md) y [api-reference.md](api-reference.md).
- Validaciones fail-fast antes de mutar nada.
- Reembolso **proporcional a lo pagado** por valor de ítem (`paidAmount × valorDevuelto / valorTotalItems`).
- Reembolso según `refundMethod`: `cash` (caja) o `store_credit` (`StoreCreditService.credit`, acredita saldo — no exige caja abierta).
- Reutiliza: `InventoryService.findByProductSku/findByProductId`, `InventoryMovementsService.create` (`MovementType.IN`), `CashRegisterService.getOpenSession` + `addCashMovement`, `PaymentsService.updateStatus`, `ReturnsAccountingService.createRefundEntry`, `StoreCreditService.credit`.
- Genera `returnNumber` con `generateReturnNumber` (MAX+1 por tenant, ver [patterns/sequential-number-races.md](../../patterns/sequential-number-races.md)).

### `planReturnLines(order, requested?)` (privado)
Resuelve qué líneas/cantidades se devuelven. Con `requested` → parcial (valida existencia y que la cantidad no supere `quantity − returnedQuantity`, rechaza duplicados); sin `requested` → total (todo lo pendiente).

### `findByOrder(orderId, user): Promise<ReturnDocument[]>`
Lista devoluciones de una orden, más recientes primero. Scoped por `tenantId`.

## Backend — `ReturnsAccountingService` (`src/modules/returns/returns-accounting.service.ts`)

### `createRefundEntry(params): Promise<JournalEntryDocument | null>`
Crea el asiento contable de la devolución: débito a "Devoluciones en Ventas" (4102, contra-ingreso) / crédito a "Caja" (1101). Devuelve `null` si el monto es ≤ 0. Vive en el módulo returns —no en `accounting.service.ts`— para no arrastrar la deuda de lint legacy de ese archivo al gate. `findOrCreateAccount` local crea 4102/1101 si el tenant no las tiene.

## Frontend — Acción "Devolver orden"

La pantalla vive en `components/orders/`, por eso su función se documenta aquí (módulo de la screen).

### `ReturnDialog` (`food-inventory-admin/src/components/orders/v2/ReturnDialog.jsx`)
Diálogo de devolución con selector **Total / Parcial** y selector de método de reembolso **Efectivo / Saldo a favor**. En parcial lista las líneas con cantidad pendiente + input por línea y muestra el reembolso estimado en vivo. Al confirmar hace `POST /orders/:id/returns` (con `items[]` si es parcial, `refundMethod` según selección) y en éxito refresca el historial.

### Gate `can-return` (`food-inventory-admin/src/lib/orders/secondaryActions.js`)
Nueva acción `return` en `SECONDARY_ACTIONS` (icono `Undo2`). Visible sólo si `isPaid && !isCancelled && !hasInvoice`. Aparece tanto en el bottom-sheet mobile (`OrderActionSheet`) como en el dropdown desktop (`OrdersSmartTable`) porque ambos consumen el módulo compartido. Enrutada en `handleSecondaryAction` de `OrdersHistoryV2.jsx` (`case 'return'` → abre `ReturnDialog`).

## Pendiente
- `createExchange` (cambio) — fase siguiente.
