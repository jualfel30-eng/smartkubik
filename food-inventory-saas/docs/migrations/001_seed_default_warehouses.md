# Migración: Crear Warehouse "General" por Tenant

- Crear un warehouse por defecto llamado "General" con código `GEN`.
- Asociar inventarios existentes a `warehouseId` null → asignar el nuevo warehouse.
- Ejecutar una sola vez, idempotente (no crear duplicados si ya existe).

### Pseudopasos
1) Iterar tenants: `db.tenants.find({})`.
2) Para cada tenant:
   - Buscar warehouse activo `code: GEN, tenantId, isDeleted: false`.
   - Si no existe, insertar con `isDefault: true, isActive: true`.
3) Actualizar inventarios del tenant con `warehouseId: null` o no definido:
   - `updateMany({ tenantId, $or: [{ warehouseId: { $exists: false } }, { warehouseId: null }] }, { $set: { warehouseId: genWarehouse._id } })`.
4) Registrar en log/collection `migration_logs` con timestamp.

### Notas
- Ejecutar en mantenimiento corto; rollback simple (eliminar warehouses creados) no es necesario si es idempotente.
- Si multi-warehouse desactivado, este warehouse actúa como único.
