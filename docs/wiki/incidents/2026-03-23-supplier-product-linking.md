# 2026-03-23 — Supplier-product linking inconsistente

**Severidad**: alta
**Módulos afectados**: suppliers, products
**Tiempo a resolución**: 1 día

## Síntoma

Productos vinculados a un proveedor no aparecían en el módulo Suppliers. La relación existía en `Product.suppliers[]` pero el listado de productos por proveedor devolvía vacío.

## Root cause

`Product.suppliers[].supplierId` se almacenaba inconsistentemente: a veces como `String`, a veces como `ObjectId`. La query en `products.service.ts` usaba solo `ObjectId`, por lo que los registros con tipo `String` no matcheaban.

De 137 supplier-product links totales, 72 estaban como String.

## Archivos tocados

- `food-inventory-saas/src/modules/products/products.service.ts:609` — query cambió a `$in: [supplierId, new Types.ObjectId(supplierId)]`.
- `food-inventory-saas/src/modules/suppliers/suppliers.service.ts:1284` — al crear PO, ya guarda como `ObjectId`.
- `scripts/migrations/convert-supplierids-to-objectid.js` — convirtió los 72 String → ObjectId.

## Prevención

- **Pattern**: [objectid-vs-string](../patterns/objectid-vs-string.md).
- **Skill**: [`preflight-tenant-safety`](../../../.claude/skills/preflight-tenant-safety/SKILL.md) detecta este patrón en code review.
- **Cast explícito en service**: todo write de `supplierId` ahora pasa por `new Types.ObjectId(...)`.

## Notas

La query final mantiene `$in: [string, ObjectId]` como red de seguridad para nuevos casos. La fuente de verdad es el migration ejecutado (datos limpios), pero el patrón defensivo cubre regresiones.
