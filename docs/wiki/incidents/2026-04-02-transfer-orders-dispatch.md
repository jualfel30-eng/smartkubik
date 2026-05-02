# 2026-04-02 — Transfer orders dispatch fail

**Severidad**: crítica
**Módulos afectados**: transfer-orders, inventory
**Tiempo a resolución**: 1 día

## Síntoma

Despachar una orden de transferencia fallaba con `404 — No existe inventario del producto X en el almacén origen`. El bug había vuelto tras un fix previo incompleto.

## Root cause

Tres causas concurrentes:

1. **Cloudflare WAF bloqueaba `/ship`**: la ruta original disparaba una regla de seguridad. WAF nunca lo dejaba llegar al backend.
2. **`productId` mixed type**: inventory.productId estaba a veces como String, query usaba solo ObjectId.
3. **`isDeleted: undefined`**: el filtro `isDeleted: false` excluía docs sin el campo (la mayoría).

## Archivos tocados

- `food-inventory-saas/src/modules/transfer-orders/transfer-orders.controller.ts:169` — endpoint cambió de `/ship` a `/dispatch` (esquiva WAF).
- `food-inventory-admin/src/lib/api.js:2587` — frontend llama `/dispatch`.
- `food-inventory-saas/src/modules/transfer-orders/transfer-orders.service.ts:988-992` — query con `$in: [item.productId, new Types.ObjectId(item.productId.toString()), item.productId.toString()]`.
- Mismo archivo — añadido `isDeleted: { $ne: true }`.

## Prevención

- **Patterns aplicados**:
  - [objectid-vs-string](../patterns/objectid-vs-string.md)
  - [soft-delete-conventions](../patterns/soft-delete-conventions.md)
- **Lección Cloudflare**: nombres de endpoint que suenan a operaciones de envío (`/ship`, `/send`, `/post`) pueden disparar reglas WAF. Nombres preferidos: `/dispatch`, `/issue`, `/process`.
- **Skill** [`preflight-tenant-safety`](../../../.claude/skills/preflight-tenant-safety/SKILL.md) detecta los patterns de query incorrectos.

## Notas

El "fix previo incompleto" es típico de bugs causados por inconsistencias de datos: arreglas el caso 1, te olvidas del caso 2. Por eso el fix definitivo cubre los **3 formatos** de productId con `$in` y normaliza isDeleted con `$ne: true`.

Deployed a producción exitosamente el mismo día del descubrimiento.
