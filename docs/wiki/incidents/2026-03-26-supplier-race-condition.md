# 2026-03-26 — Supplier race condition (E11000)

**Severidad**: alta
**Módulos afectados**: suppliers, customers
**Tiempo a resolución**: 1 día

## Síntoma

Al hacer click rápido en suppliers en la UI, el backend devolvía `500 Internal Server Error` con `E11000 duplicate key error` sobre `supplierNumber`.

## Root cause

Múltiples requests concurrentes para crear/actualizar Virtual Suppliers (Customers) disparaban creación simultánea de perfil Supplier. `generateSupplierNumber()` usaba `countDocuments()` que **no es atómico**: dos requests leían el mismo conteo y generaban el mismo número.

## Archivos tocados

- `food-inventory-saas/src/modules/suppliers/suppliers.service.ts`:
  - `generateSupplierNumber()` — cambió a estrategia MAX+1 (busca el número más alto y suma 1, en lugar de usar count).
  - `update()`, `ensureSupplierProfile()`, `syncFromPurchaseOrder()` — añadido check para perfil existente por `customerId` antes de crear nuevo.
  - Manejo de `E11000` con mensaje user-friendly.

## Prevención

- **Pattern**: [sequential-number-races](../patterns/sequential-number-races.md).
- **Estrategia recomendada**: MAX+1 con retry sobre `E11000` para módulos no-críticos. Para facturas/pagos, usar contador atómico dedicado.

## Notas

`countDocuments` sigue siendo seguro para *contar* (reportes). Solo es problemático para *generar* IDs secuenciales bajo concurrencia.
