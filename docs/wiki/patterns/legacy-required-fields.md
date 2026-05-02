# Pattern: Defaults defensivos para campos required añadidos a posteriori

## El problema

Cuando un schema Mongoose añade un campo `required: true` a posteriori, los documentos pre-existentes no lo tienen. Cualquier `update()` sobre un documento legacy dispara `ValidationError: Field X is required` aunque el update no toque ese campo (Mongoose valida el doc completo en muchas operaciones).

Ejemplos: `createdBy` y `supplierType` añadidos a `Supplier` después de tener 50+ proveedores legacy.

## Patrón a aplicar

### Defaults defensivos en service.update()

```ts
async update(id: string, dto: UpdateSupplierDto, user: User) {
  const existing = await this.model.findById(id);
  if (!existing) throw new NotFoundException();

  // Defaults defensivos para legacy docs sin campos requeridos posteriores
  if (!existing.createdBy) existing.createdBy = user._id;
  if (!existing.supplierType) existing.supplierType = 'distributor';

  Object.assign(existing, dto);
  return existing.save();
}
```

### Migración explícita (opcional pero recomendada)

Para no acumular defaults dispersos por todos los services, ejecutar migración una vez:

```ts
// scripts/migrations/2026-XX-XX-backfill-supplier-required-fields.ts
await Supplier.updateMany(
  { createdBy: { $exists: false } },
  { $set: { createdBy: SYSTEM_USER_ID, supplierType: 'distributor' } },
);
```

Tras migración exitosa, los defaults defensivos siguen como red de seguridad pero no se ejecutan en práctica.

### Evitar el problema desde el principio

Cuando añadas un campo nuevo a un schema existente:

1. Agregar como `required: false` inicialmente.
2. Crear migration de backfill.
3. Verificar conteo: `db.suppliers.countDocuments({ field: { $exists: false } })` → 0.
4. Recién entonces marcar `required: true` en el schema.

## Cuándo NO aplica

- Schemas nuevos (todos los docs nacen con todos los campos).
- Campos que no son `required` (las queries no los validan).

## Incidentes relacionados

- [2026-03-26 — Legacy supplier update](../incidents/2026-03-26-legacy-supplier-update.md)
- [2026-03-26 — Inventory warehouseId missing](../incidents/2026-03-26-inventory-warehouse-id-missing.md)
