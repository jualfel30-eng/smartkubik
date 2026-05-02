# 2026-03-26 — Inventory warehouseId missing

**Severidad**: alta
**Módulos afectados**: inventory, warehouses, transfer-orders
**Tiempo a resolución**: 1 día

## Síntoma

Las órdenes de transferencia mostraban "No hay productos con inventario en este almacén" a pesar de haber inventario.

## Root cause

Los 83 registros de inventario en producción tenían `warehouseId = undefined`. El diálogo de transfer query por `warehouseId`, devolvía 0. Ni `addStockFromPurchase()` ni `create()` setteaban warehouseId al crear inventario.

## Archivos tocados

- `food-inventory-saas/src/modules/inventory/inventory.service.ts`:
  - Nuevo helper `getDefaultWarehouse(tenantId)`.
  - `addStockFromPurchase()` — ahora setea `warehouseId` (de `item.warehouseId` o default del tenant).
  - `create()` — idem.
- `food-inventory-saas/src/modules/inventory/dto/create-inventory.dto.ts` — campo `warehouseId` opcional añadido.
- Script ad-hoc — backfill de 83 inventarios al warehouse "Broas Almacén" (`69b34dd1eda70c9386a111d8`).

## Prevención

- **Pattern**: [legacy-required-fields](../patterns/legacy-required-fields.md) — defaults defensivos al crear inventario.
- **Validación en boot**: cada tenant debe tener al menos un warehouse marcado como default. Validar al onboarding.
- **Test de regresión**: crear inventario sin `warehouseId` explícito → debe asignar el default automáticamente.

## Notas

Este bug es un caso clásico de "feature implementada después de los datos". Cuando se añadió `warehouses`, los inventarios existentes no se migraron. La solución completa requiere: backfill (ejecutado), defaults al crear (implementado), validación en boot (pendiente).
