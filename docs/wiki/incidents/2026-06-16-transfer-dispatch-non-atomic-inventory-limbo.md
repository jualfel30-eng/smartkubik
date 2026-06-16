# 2026-06-16 — Despacho de traslado no-atómico drenó inventario de un tenant real

**Severidad**: crítica
**Módulos afectados**: transfer-orders, inventory
**Tiempo a resolución**: < 1 día (mismo día del reporte)

## Síntoma

Un tenant real intentó completar un traslado ("transferencia express") y recibía
`POST /api/v1/transfer-orders/:id/dispatch` → **400 Bad Request** una y otra vez.
El console del navegador solo mostraba el 400 (sin body), más ruido de la extensión
MozBar irrelevante.

Peor aún: tras los intentos fallidos, el inventario del origen quedó **drenado** —
productos que sí tenían stock aparecían en 0 o por debajo de lo real. Al cancelar el
traslado que nunca se completó, el stock **no volvió** al almacén origen ni llegó al
destino: inventario en limbo. El cliente había hecho su conteo físico días antes y el
software se lo descuadró.

## Root cause

`ship()` (endpoint `/dispatch`) descontaba inventario del origen **ítem por ítem**, con
`save()` independientes y **sin transacción**:

```ts
for (const item of order.items) {
  if (available < baseQty) throw new BadRequestException("Stock insuficiente"); // corta a mitad
  sourceInventory.availableQuantity = available - baseQty;
  await sourceInventory.save();           // ya committeó este ítem
  await this.movementModel.create({...}); // y su movimiento OUT
}
order.status = IN_TRANSIT; // solo si el loop TERMINA
```

Tres fallos encadenados:

1. **No atómico**: si el loop reventaba en un ítem posterior (p.ej. uno sin stock
   suficiente), los ítems anteriores **ya estaban descontados y committeados**, pero
   `order.status` nunca avanzaba a `in_transit`. Stock fuera del origen, sin llegar al
   destino.
2. **Amplificación por reintento**: cada clic en "despachar" volvía a correr el loop
   completo y a descontar los ítems que sí alcanzaban. Una orden (TO-0021) llegó a
   tener **8 movimientos OUT para 5 ítems** (doble/triple descuento).
3. **`cancel()` no reponía nada**: solo cambiaba el status. El stock OUT ya emitido
   quedaba perdido permanentemente.

La validación de stock (`Stock insuficiente`) en sí era correcta; el problema era
descontar antes de validar el conjunto y no envolver la operación en una transacción.

## Archivos tocados

- `food-inventory-saas/src/modules/transfer-orders/transfer-orders.service.ts`
  - `ship()` — **Fase 1**: resuelve y valida stock de TODOS los ítems antes de mutar
    nada. **Fase 2**: descuentos + movimientos + cambio de status dentro de una
    transacción Mongo (`connection.startSession()` + `startTransaction` /
    `commit` / `abort`), todo-o-nada. Mismo patrón que `bank-transfers.service.ts`.
  - `cancel()` — repone al origen los movimientos OUT emitidos y no recibidos, con
    guard anti-doble-reposición por `transferId`, dentro de transacción.
  - Constructor — inyecta `@InjectConnection() connection: Connection`.

## Commit / PR

- `acf111078` — fix(transfer-orders): despacho atómico y reverso de stock al cancelar

## Remediación de datos (prod)

Daño acotado por barrido completo (368 órdenes) a **un solo tenant real**, órdenes
`TO-0053` (cancelada) y `TO-0055` (atascada en `in_preparation`), ambas del mismo día.
`TO-0021` (mayo) quedó fuera porque el conteo físico posterior ya la había corregido.

Inventario restaurado al valor **previo al primer intento del día**, reconstruido desde
`balanceAfter + quantity` del primer movimiento OUT de hoy (dato de ~2 h de antigüedad,
no estimación) — sin necesidad de que el tenant recontara:

| SKU | Producto | Restaurado a |
|---|---|---|
| TIE-1665 | Huevos | 17 |
| TIE-1767 | Barquilla Dulce Caja 100 unds | 3 |
| TBS-0478 | Chicharron Ajonjoli 50grs | 160 |
| TBS-1204 | Chicharron Ajonjoli 73grs | 85 |

Cada corrección dejó un movimiento `ADJUSTMENT` de auditoría
("Reconciliación reverso bug despacho no-atómico (TO-0053/TO-0055)"). `TO-0055` pasó a
`cancelled`. Salsa Picante (TIE-1734) nunca se descontó (el loop reventaba antes), no
requirió corrección.

## Prevención

- **Convención (transaccional)**: toda operación que muta inventario en más de un
  documento debe validar el conjunto antes de escribir y envolverse en
  `session.startTransaction()`. Referencia viva: `bank-accounts/bank-transfers.service.ts`.
- **Test de regresión pendiente**: en `transfer-orders.service.spec.ts`, verificar que
  un `ship()` donde un ítem no alcanza **no descuenta NINGÚN ítem** (rollback total) y
  que `cancel()` de una orden con OUT emitidos repone el stock al origen exactamente una vez.
- Patterns relacionados: [sequential-number-races](../patterns/sequential-number-races.md)
  (misma familia: operaciones que parecen atómicas y no lo son).

## Notas

- El flujo "express" del frontend encadena `create → request → approve → prepare →
  dispatch`; ninguno de los 4 primeros valida stock, así que una orden con cantidades
  imposibles navega hasta el último paso y revienta ahí. Mejora pendiente (frontend):
  surfacing del `message` real del 400 (hoy se traga en un toast genérico) y/o
  pre-validar stock antes de encadenar.
- Lección: ante un reporte de "no se pudo completar", el primer reflejo fue clasificar
  el 400 como validación de negocio legítima. La pista real ("quedó en limbo, ni llegó
  ni volvió") apuntaba a un débito de inventario sin reverso — confirmado con los
  movimientos. Diagnóstico inicial equivocado dos veces antes de mirar los datos.
- Relacionado con el histórico de [transfer-orders dispatch](./2026-04-02-transfer-orders-dispatch.md)
  y [multi-unit transfer orders](./2026-04-06-multi-unit-transfer-orders.md).
