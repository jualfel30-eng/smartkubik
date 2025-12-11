# Inventario Multi-Warehouse: Endpoints y Uso Rápido

**Objetivo:** Operar inventario con múltiples almacenes sin apps separadas. Todo vive en Inventario (backend Nest + frontend admin).

## Feature Flag
- Backend/Frontend: `MULTI_WAREHOUSE` en `src/config/features.config.ts` y hooks de frontend (`use-feature-flags`).
- Si está **off**: oculta secciones de almacenes/movimientos/alertas y bloquea CRUD de warehouses.

## Endpoints clave (API v1)
- `GET /warehouses` — lista (tenant scoped)
- `POST /warehouses` — crear (`name`, `code`, opcional `isDefault`)
- `PATCH /warehouses/:id` — editar/soft delete (`isDeleted`)
- `GET /inventory-movements` — auditoría; filtros `movementType`, `productId`, `warehouseId`, `dateFrom`, `dateTo`, `page`, `limit`
- `POST /inventory-movements` — crear movimiento manual IN/OUT/ADJUSTMENT (`inventoryId`, `quantity`, `unitCost`, opcional `warehouseId`, `reason`)
- `GET /inventory-alerts` — reglas de alerta; filtros `productId`, `warehouseId`, `isActive`, `page`, `limit`
- `POST /inventory-alerts` — crear regla (`productId`, opcional `warehouseId`, `minQuantity`, `isActive`)
- `PATCH /inventory-alerts/:id` — toggle/editar
- `DELETE /inventory-alerts/:id` — borrar regla
- `GET /inventory/stock-summary` — stock por producto/almacén (agrupado, paginado opcional)

## Flujos principales
1) **Crear almacén**: POST `/warehouses` → `name`, `code`. Hay un “General/GEN” creado por migración.
2) **Asignar stock a almacén**: crear movimiento `IN` con `warehouseId` y `inventoryId` del producto.
3) **Salida/venta**: movimiento `OUT` (automático desde órdenes si hooks están activos; manual opcional).
4) **Transferencia interna**: registrar `OUT` en origen y `IN` en destino con misma referencia (future: endpoint dedicado).
5) **Alertas**: POST `/inventory-alerts` con `productId`, `warehouseId` opcional y `minQuantity`. Se evalúan al cerrar cada movimiento.
6) **Consultas**: `GET /inventory-movements` para auditoría; `GET /inventory/stock-summary` para ver stock por almacén; `GET /inventory-alerts` para reglas activas.

## Guardrails
- Validación de tenant + warehouse activo + producto activo.
- `limit` paginado <= 200 (movimientos) y <=100 (alertas). `page>=1`.
- Movimientos `OUT` bloquean stock negativo salvo `enforceStock=false`.
- Alertas tienen cooldown (6h) y respetan `isActive`/`isDeleted`.

## Frontend (admin)
- **Inventario → Almacenes**: CRUD rápido (solo visible si flag on).
- **Inventario → Movimientos**: filtros por tipo/fecha/almacén, paginación; modal de ajuste manual (IN/OUT/ADJUST).
- **Inventario → Alertas**: crear/toggle/eliminar reglas; por producto y almacén opcional; paginación.
- **Inventario → Resumen de Stock**: tabla por producto/almacén.

## Seguridad/Permisos
- Guards: `JwtAuthGuard` + `TenantGuard` + `PermissionsGuard`.
- Permisos mínimos: `inventory_read` para listar; `inventory_write` para crear/editar/borrar movimientos y alertas; `inventory_settings` para warehouses.

## Troubleshooting rápido
- 400 en `/inventory-movements`: verifica `page`/`limit` numéricos; límite máx 200.
- Radix Select error: no usar value=""; usar "all" para “Cualquiera”.
- Cast ObjectId en alertas/movimientos: usa rutas `/inventory-alerts` y `/inventory-movements` (no `/inventory/alerts`).
