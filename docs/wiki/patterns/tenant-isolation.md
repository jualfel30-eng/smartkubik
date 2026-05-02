# Pattern: Tenant isolation en queries y guards

## El problema

SmartKubik es multi-tenant compartiendo una sola base de datos. Cualquier query que **no filtre por `tenantId`** puede:

- Leer/devolver datos de otros tenants (data leakage).
- Permitir update/delete cross-tenant (data tampering).
- Generar reportes con datos mezclados.

Es la clase de bug más cara: silencioso, difícil de detectar en testing single-tenant, y compliance-impacting.

## Patrón a aplicar

### TenantGuard inyecta y normaliza tenantId

Todo controller protegido pasa por `TenantGuard`, que:

1. Extrae `tenantId` del JWT.
2. Lo normaliza a `ObjectId` (ver [objectid-vs-string](./objectid-vs-string.md)).
3. Lo inyecta en `request.tenantId`.

```ts
@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductsController {
  @Get()
  list(@TenantId() tenantId: ObjectId) {
    return this.service.findByTenant(tenantId);
  }
}
```

### Service jamás recibe ID de entidad sin tenantId

```ts
// CORRECTO
async findOne(id: string, tenantId: ObjectId) {
  return this.model.findOne({ _id: id, tenantId });
}

// INCORRECTO — permite leer entidades de otros tenants
async findOne(id: string) {
  return this.model.findById(id);
}
```

Aplica también a `update`, `delete`, `aggregate`. **Todo**.

### Aggregations

`$match` con `tenantId` debe ser el primer stage:

```ts
this.model.aggregate([
  { $match: { tenantId } },  // PRIMERO, siempre
  { $group: ... },
  ...
]);
```

### Cross-tenant intencional (super-admin)

Solo el módulo `super-admin` puede operar sin `tenantId`. Esos endpoints están bajo `SuperAdminGuard` separado.

```ts
@Controller('super-admin/tenants')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminTenantsController { ... }
```

### Tests obligatorios para cada módulo

Spec mínimo: dos tenants, asegurar que `tenantA` no puede leer/modificar entidades de `tenantB`. Ver `food-inventory-saas/test/ownership-validation.e2e.spec.ts` como referencia.

## Cuándo NO aplica

- Endpoints públicos (`/public/products`, `/public/appointments`) — usan `tenantId` derivado de slug en URL, no de JWT.
- Schemas globales (planes, monedas, países) — no tienen `tenantId`.

## Detección automática

La skill [`preflight-tenant-safety`](../../../.claude/skills/preflight-tenant-safety/SKILL.md) busca:

- `Model.find/findOne/updateOne/deleteOne` sin `tenantId` en el filtro.
- `Model.findById(...)` (siempre sospechoso si el modelo tiene `tenantId`).
- Aggregations cuyo primer stage no es `$match` con `tenantId`.

## Incidentes relacionados

- [2026-04-01 — Missing customer record](../incidents/2026-04-01-missing-customer-record.md) (relacionado: confusion entre tenants con mismo nombre)
- Múltiples patches preventivos en `2026-Q1` (no documentados como incidents — encontrados en code review).
