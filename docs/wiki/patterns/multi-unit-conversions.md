# Pattern: Preservar conversiones multi-unidad en mappings DTO ↔ Schema

## El problema

Productos con múltiples unidades (ej: "Chía Saco 25Kg" tiene base unit `saco`, selling unit `kg` con `conversionFactor: 0.04`) requieren que cada item de orden, transferencia o movimiento de inventario lleve consigo:

- `selectedUnit` — qué unidad seleccionó el usuario
- `conversionFactor` — factor a unidad base
- `unitOfMeasure` — etiqueta legible

Si cualquier mapping DTO → Schema **descarta estos campos**, en el momento del dispatch/receive el sistema asume que `qty` está en unidad base, descontando 10 sacos en lugar de 10 kg (= 0.4 sacos). Pérdida de inventario silenciosa.

## Patrón a aplicar

### En todo mapping DTO → Schema (create / update / sub-flows)

```ts
const items = dto.items.map((item) => ({
  productId: new Types.ObjectId(item.productId),
  quantity: item.quantity,
  // CRÍTICO: preservar siempre los 3 campos de conversión
  selectedUnit: item.selectedUnit,
  conversionFactor: item.conversionFactor ?? 1,
  unitOfMeasure: item.unitOfMeasure,
  ...
}));
```

Default `conversionFactor: 1` para productos single-unit (no rompe lógica downstream).

### En consumidores (dispatch / receive / movement)

```ts
const baseQty = item.conversionFactor
  ? item.quantity * item.conversionFactor
  : item.quantity;

await this.inventoryService.deduct(item.productId, baseQty);
```

### Frontend

Solo enviar campos multi-unit cuando `conversionFactor !== 1`:

```jsx
const itemPayload = {
  productId,
  quantity,
  ...(conversionFactor !== 1 && {
    selectedUnit,
    conversionFactor,
    unitOfMeasure,
  }),
};
```

### Lugares críticos a auditar al añadir nueva entidad con items

- `transfer-orders.service.ts` — `create()`, `update()`, `createTransferRequest()`, `ship()`, `receive()`
- `purchase-orders.service.ts` — `create()`, `update()`, `receivePurchaseOrder()`
- `orders.service.ts` — items en POS y delivery
- `inventory-movements.service.ts` — al registrar movimientos manuales

## Cuándo NO aplica

- Productos single-unit (`conversionFactor === 1`, no requieren los campos extra).
- Servicios sin inventario (beauty appointments, delivery slots).

## Incidentes relacionados

- [2026-04-06 — Multi-unit transfer orders](../incidents/2026-04-06-multi-unit-transfer-orders.md)
- [2026-03-14 — Double stock decrement](../incidents/2026-03-14-double-stock-decrement.md) (relacionado: cómo se descuenta stock)
