# Pattern: ObjectId vs String en queries Mongoose

## El problema

En SmartKubik conviven documentos donde el mismo campo está almacenado a veces como `ObjectId`, a veces como `String`. Causas históricas:

- DTOs que reciben `string` desde el frontend y se guardan sin casting (`Schema.Types.Mixed` o `String` en el schema).
- Migraciones parciales que tipificaron solo registros nuevos.
- Verticales agregados en distintas épocas con criterios distintos.

Resultado: una query con `Model.find({ supplierId: someId })` puede devolver 0 resultados aunque los datos existan, porque Mongoose hace match exacto por tipo.

Campos conocidos con tipo mixto: `tenantId`, `productId`, `supplierId`, `customerId`, `warehouseId`, `userId` (en colecciones legacy).

## Patrón a aplicar

### En queries

Usar `$in` con ambas representaciones:

```ts
import { Types } from 'mongoose';

const id = req.params.id; // string
await Model.find({
  supplierId: { $in: [id, new Types.ObjectId(id)] },
});
```

Si la lista de IDs viene de otra query, normalizar antes:

```ts
const ids = supplierIds.flatMap((id) => [
  id.toString(),
  new Types.ObjectId(id.toString()),
]);
await Model.find({ supplierId: { $in: ids } });
```

### En writes

Siempre persistir como `ObjectId`. Si el DTO trae `string`, hacer cast explícito en el service:

```ts
const doc = new this.model({
  ...dto,
  supplierId: new Types.ObjectId(dto.supplierId),
});
```

### En guards / interceptors

`tenantId` debe normalizarse en el `TenantGuard` antes de llegar a los services:

```ts
request.tenantId = new Types.ObjectId(rawTenantId);
```

## Cuándo NO aplica

- Campos donde la convención es String desde el día 1 y todos los registros lo respetan (ej: `email`, `slug`, `sku`).
- Colecciones nuevas creadas después de 2026-04 con schemas estrictos.

## Detección automática

La skill [`preflight-tenant-safety`](../../../.claude/skills/preflight-tenant-safety/SKILL.md) busca:

- `Model.find({...})` que comparen un campo conocido con `req.params.id` sin `$in`.
- `Types.ObjectId(value)` sin guard `if (!Types.ObjectId.isValid(value))`.

## Incidentes relacionados

- [2026-03-23 — Supplier-product linking](../incidents/2026-03-23-supplier-product-linking.md)
- [2026-03-26 — Inventory warehouseId missing](../incidents/2026-03-26-inventory-warehouse-id-missing.md)
- [2026-04-02 — Transfer orders dispatch](../incidents/2026-04-02-transfer-orders-dispatch.md)
