# 2026-03-26 — Legacy supplier update fail

**Severidad**: media
**Módulos afectados**: suppliers
**Tiempo a resolución**: < 1 día

## Síntoma

Al actualizar un proveedor antiguo: `Supplier validation failed: createdBy is required, supplierType is required` (500 error).

## Root cause

Los campos `createdBy` y `supplierType` se añadieron como `required: true` al schema **después** de que existieran proveedores legacy. Al hacer `update`, Mongoose validaba el doc completo y fallaba porque los campos no existían.

## Archivos tocados

- `food-inventory-saas/src/modules/suppliers/suppliers.service.ts:345-346` — `update()` ahora setea defaults defensivos si los campos faltan: `createdBy = current user`, `supplierType = 'distributor'`.

## Prevención

- **Pattern**: [legacy-required-fields](../patterns/legacy-required-fields.md).
- **Mejor práctica**: cuando añadas un campo `required` a un schema con datos preexistentes, ejecuta migration de backfill ANTES de marcarlo required.

## Notas

No se ejecutó migration porque la cantidad de suppliers legacy era manejable (<100) y los defaults se aplican on-write. Para datasets más grandes, una migration explícita es preferible para no acumular defaults dispersos por el código.
