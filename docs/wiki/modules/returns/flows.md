# Devoluciones — Flujos

## Flujo: devolución con reembolso en efectivo

**Actor**: cajero, desde el historial de órdenes.

1. En el historial de órdenes, el cajero abre el menú de acciones de una orden **pagada y sin factura** y elige **"Devolver orden"**.
   - El gate `can-return` (`src/lib/orders/secondaryActions.js`) muestra la acción sólo si `isPaid && !isCancelled && !hasInvoice`. Una orden `partially_returned` sigue mostrando la acción (se puede devolver el resto).
2. Se abre `ReturnDialog` con un selector **Total / Parcial**:
   - **Total**: devuelve todo lo pendiente (un clic).
   - **Parcial**: lista las líneas con cantidad pendiente y un input por línea; muestra el reembolso estimado en vivo.
3. Al confirmar → `POST /orders/:id/returns` con `{ refundMethod: 'cash', reason }` (total) o `{ ..., items: [{ orderItemId, quantity }] }` (parcial).
4. Backend (`ReturnsService.createReturn`):
   - Valida la orden (fail-fast) y planifica las líneas a devolver (`planReturnLines`).
   - Exige sesión de caja abierta.
   - Calcula el reembolso proporcional a lo pagado.
   - Reintegra cada línea al inventario (`IN`, cantidad devuelta en unidad base).
   - Saca el dinero de caja (`out`, por moneda).
   - Genera el asiento contable (débito 4102 / crédito 1101, best-effort).
   - Actualiza `returnedQuantity` por línea; marca pagos `refunded` **sólo si la orden queda completa**.
   - Persiste el `Return` y marca la orden `refunded` (completa) o `partially_returned` (queda saldo).
5. Frontend: toast de éxito + `fetchOrders()` refresca el historial (la orden pasa a estado devuelto).

### Diagrama (texto)

```
Cajero → ReturnDialog → POST /orders/:id/returns
                          │
   ┌───────────┬──────────┴─────────┬──────────────────┐
   ▼           ▼                    ▼                  ▼
Inventario  Caja OUT           Asiento contable    Payments →
IN (ítem)   (USD/VES)          (déb 4102/cré 1101)  refunded
   │           │                    │                  │
   └───────────┴──► Return (completed) ◄───────────────┘
                          │
                          ▼
                 Order → refunded
```

## Precondiciones y cortes

- **Orden no pagada** → 400 (sólo se devuelven órdenes `paid`).
- **Cantidad parcial > lo pendiente** de la línea → 400.
- **`orderItemId` que no pertenece a la orden** → 400.
- **Nada pendiente por devolver** → 400.
- **Sin sesión de caja abierta** → 400 (el efectivo debe salir de una caja).
- **Orden con factura fiscal** → 400 (requiere Nota de Crédito; fase posterior).
- **Orden totalmente devuelta / cancelada** → 400.

## Flujo: cambio (exchange)

**Actor**: cajero. El cliente devuelve algo y se lleva otra cosa.

1. En el historial, acción **"Cambiar por otro producto"** → `ReturnDialog` en modo cambio (selección de ítems a devolver; método forzado a saldo a favor).
2. Al confirmar → `POST /orders/:id/exchange`: procesa la devolución a saldo a favor (marca `isExchange`) y devuelve el saldo del cliente.
3. La UI **redirige al POS** (`/orders/new`) con el cliente preseleccionado y un banner del saldo disponible.
4. El cajero arma la orden nueva y la crea. `OrdersPOS` detecta el contexto de cambio y **auto-aplica el saldo** a la orden recién creada (`POST /orders/:id/redeem-store-credit`).
   - V_new > V_ret → la orden nueva queda con saldo pendiente = la diferencia (el cliente la paga por el cobro normal).
   - V_ret ≥ V_new → la orden nueva queda cubierta y el **excedente permanece como saldo a favor**.

```
Devolver (a saldo) ──► navigate POS (cliente + saldo) ──► crear orden nueva
                                                              │
                                                     auto-aplicar saldo
                                                              │
                                              diferencia se cobra / sobrante queda a favor
```

## Diferencia con Cancelar

| | Cancelar orden | Devolver orden |
|---|---|---|
| Cuándo | Orden que nunca se cumplió | Mercancía entregada/pagada que regresa |
| Inventario | Reverso por `ADJUSTMENT` (background) | `IN` por ítem, síncrono, trazado en `Return` |
| Dinero | No mueve caja | Salida real de caja |
| Documento | Sólo cambia `status` | Crea documento `Return` auditable |
