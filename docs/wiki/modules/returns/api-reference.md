# Devoluciones — Referencia API

> Última actualización: 2026-07-01

## Metadata

- **Módulo**: `src/modules/returns/`
- **Schema Return**: `src/modules/returns/schemas/return.schema.ts`
- **Service**: `returns.service.ts` (`createReturn`, `findByOrder`)
- **Guard stack**: JwtAuthGuard → TenantGuard → PermissionsGuard
- **Permisos**: reutiliza `orders_update` (crear) y `orders_read` (listar) — no introduce permiso nuevo.

---

## POST /api/v1/orders/:id/returns

Registra una devolución de la orden `:id` con reembolso en efectivo. **Total** (sin `items`) o **parcial** (con `items`).

- **Permiso**: `orders_update`

**Request body:**
```json
{
  "refundMethod": "cash",        // "cash" (default) | "store_credit"
  "reason": "string — opcional", // máx 500 chars
  "items": [                     // OPCIONAL. Ausente → devolución TOTAL.
    { "orderItemId": "MongoId (el _id del subdoc de la línea de orden)",
      "quantity": 1 }
  ]
}
```

**Efectos (en orden):**
1. Valida la orden (fail-fast, sin mutar): existe y del tenant · `paymentStatus === 'paid'` · no cancelada ni totalmente devuelta · sin `billingDocumentId` · tiene ítems.
2. **Planifica las líneas a devolver**: con `items` valida que cada línea exista y que `quantity ≤ (vendida − ya devuelta)`; sin `items` toma todo lo pendiente. Si no queda nada por devolver → 400.
3. Exige **sesión de caja abierta** del usuario (`getOpenSession`). Si no hay → 400.
4. **Reembolso proporcional a lo pagado** por valor de ítem: `refundUsd = paidAmount × (valorDevuelto / valorTotalItems)`. Para una devolución total nunca-antes-devuelta = lo pagado; para parciales = la porción que toca.
5. Reintegra cada línea al inventario: movimiento `IN` por la cantidad devuelta en unidad base, `reason: "Devolución - Orden <n>"`, `reference: orderId`, `origin: "return"`.
6. **Reembolso** según `refundMethod`:
   - `cash`: `addCashMovement` `type: 'out'` por moneda con saldo (USD y/o VES). Se refleja en `cashOutMovements` del cierre. **Exige sesión de caja abierta**.
   - `store_credit`: acredita el saldo a favor del cliente (`StoreCreditService.credit`, source `return`) por el valor devuelto en USD (incluida la porción VES convertida). **No toca caja**.
7. Actualiza `returnedQuantity` en cada línea de la orden y calcula si quedó **completa**.
8. Genera el **asiento contable** (best-effort): débito a "Devoluciones en Ventas" (4102) / crédito a "Caja" (1101, efectivo) o "Saldo a favor de clientes" (2104, saldo a favor).
9. Marca los `Payment` como `refunded` **sólo si la devolución completa la orden** (un pago no se reembolsa "a medias").
10. Persiste el documento `Return` (`status: "completed"`, `isPartial`, `returnNumber: RET-<año>-NNNN`).
11. Marca la orden: si quedó completa → `status = "refunded"`, `paymentStatus = "refunded"`; si no → `status = "partially_returned"` (paymentStatus sigue `paid`).

**Respuesta 201:**
```json
{ "success": true, "message": "Devolución registrada exitosamente", "data": { /* Return */ } }
```

**Errores 400 (BadRequest):**
- "Sólo se pueden devolver órdenes pagadas por completo"
- "No hay ítems pendientes por devolver"
- "Cantidad a devolver (X) supera lo pendiente (Y) de <producto>"
- "El ítem <id> no pertenece a la orden"
- "Necesitas una sesión de caja abierta para reembolsar en efectivo"
- "La orden tiene factura fiscal. Devolver órdenes facturadas requiere Nota de Crédito, no soportado aún."
- "La orden ya fue devuelta por completo" / "No se puede devolver una orden cancelada"

**Error 404:** "Orden no encontrada"

---

## GET /api/v1/orders/:id/returns

Lista las devoluciones de la orden `:id` (más recientes primero).

- **Permiso**: `orders_read`
- **Respuesta**: `{ "success": true, "data": [ /* Return[] */ ] }`
