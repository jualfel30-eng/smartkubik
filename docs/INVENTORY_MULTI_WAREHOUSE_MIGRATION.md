# Guía de Migración Segura a Multi-Warehouse

**Objetivo:** Activar multi-warehouse sin perder inventarios ni mezclar stock entre clientes.

## Prerrequisitos
- Backup de BD antes de migrar.
- Feature flag `MULTI_WAREHOUSE` disponible (se puede dejar off mientras se migra).
- Asignar un warehouse por defecto (“General/GEN”) a cada tenant (seed ejecutado: Dic 7, 2025).

## Pasos recomendados
1) **Verificar seed**: cada tenant debe tener warehouse `code=GEN`, `isDefault=true`, `isDeleted=false`.
2) **Asociar inventarios existentes**: si algún inventario quedó sin `warehouseId`, actualizarlo al warehouse default del tenant.
3) **Bloquear creaciones durante migración**: ventana corta de mantenimiento o cola de órdenes pausada para evitar movimientos mientras se reasigna.
4) **Crear almacenes adicionales** (opcional): POST `/warehouses` con `name/code`; no marcar `isDefault` duplicado.
5) **Mover stock al nuevo almacén**: registrar dos movimientos manuales (auditable):
   - `OUT` en almacén origen (ej: GEN) con referencia "transfer-X".
   - `IN` en almacén destino con la misma referencia "transfer-X".
6) **Revisar alertas**: ajustar reglas existentes agregando `warehouseId` si aplica; si no, seguirán siendo globales por producto.
7) **Activar flag**: encender `MULTI_WAREHOUSE` en backend/frontend; validar UI muestra almacenes y filtros.

## Checklist de validación post-migración
- [ ] Todos los inventarios tienen `warehouseId` válido y activo.
- [ ] Stock-summary (`GET /inventory/stock-summary`) muestra cantidades por almacén y coincide con total histórico.
- [ ] Movimientos recientes registran `warehouseId` correcto (auditoría OK).
- [ ] Alertas disparan por producto/almacén con cooldown y sin duplicados.
- [ ] Permisos: `inventory_settings` requerido para CRUD de warehouses; `inventory_read/write` para movimientos/alertas.

## Riesgos y mitigación
- **Stock negativo por transferencia mal secuenciada:** registrar primero `OUT` puede fallar si enforceStock=true; usar `ADJUSTMENT` o desactivar enforce temporalmente en transferencia controlada.
- **Códigos duplicados de almacén:** validación por tenant; usar códigos cortos únicos.
- **Alertas globales que ignoran almacén:** si una regla sin `warehouseId` debe ser por almacén, crear reglas separadas y desactivar la global.

## Rollback mínimo
- Si algo sale mal, devolver flag `MULTI_WAREHOUSE` a off (oculta UI) y mantener warehouses; stock sigue asignado a GEN.
- Conservar backup previo para restaurar estados de inventario si hubo movimientos erróneos.
