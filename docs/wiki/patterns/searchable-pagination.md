# Pattern: Búsqueda paginada server-side, no preload

## El problema

El componente `SearchableSelect` (react-select) del admin pre-carga toda la lista de opciones desde un endpoint que tiene `limit` por defecto (típicamente 20). Si un tenant tiene >20 entidades (proveedores, productos, clientes), las que excedan el límite **no aparecen jamás** en el dropdown — el usuario las busca y no las encuentra.

El backend acepta `limit` máximo de 100, así que ni siquiera "subir el límite" escala. La solución correcta es delegar la búsqueda al backend.

## Patrón a aplicar

### En el backend

El endpoint de listado debe aceptar `?search=<query>` y filtrar server-side con índice:

```ts
// customers.controller.ts
@Get()
async list(
  @Query('search') search: string,
  @Query('page') page = 1,
  @Query('limit') limit = 20,
) {
  return this.customersService.find({ search, page, limit });
}

// customers.service.ts
async find({ search, page, limit }: FindArgs) {
  const filter: any = { tenantId };
  if (search?.length >= 2) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { taxInfo.taxId: { $regex: search, $options: 'i' } },
    ];
  }
  return this.model.find(filter).skip((page - 1) * limit).limit(limit);
}
```

### En el frontend

`SearchableSelect` en modo async:

```jsx
<SearchableSelect
  asyncSearch={true}
  loadOptions={loadSupplierOptions}
  minSearchLength={2}
  debounceMs={300}
  placeholder="Buscar proveedor (mín. 2 caracteres)..."
/>

const loadSupplierOptions = async (query) => {
  if (query.length < 2) return [];
  const { data } = await api.get(`/customers?customerType=supplier&search=${query}`);
  return data.map((c) => ({ value: c._id, label: c.name }));
};
```

### Reglas de oro

1. **Nunca** asumir que un dropdown con <20 opciones se mantendrá pequeño. Lo que hoy son 8 proveedores mañana son 200.
2. Toda búsqueda con `minSearchLength` ≥ 2 y `debounceMs` ≥ 250 para no saturar el backend.
3. Índice en MongoDB sobre los campos buscados (al menos `name` + `tenantId`).

## Cuándo NO aplica

- Dropdowns de enums fijos (estados, tipos, monedas) — sync con array hardcoded.
- Listados <50 items garantizados por modelo de negocio (ej: `warehouses` de un tenant).

## Detección automática

La skill [`searchable-audit`](../../../.claude/skills/searchable-audit/SKILL.md) escanea endpoints `list/search` sin `limit/page` y los cruza con consumidores `SearchableSelect`.

## Incidentes relacionados

- [2026-04-01 — Supplier search pagination](../incidents/2026-04-01-supplier-search-pagination.md)

## Anti-pattern conocido

**`SearchableSelect` para campo de input libre (no selección de entidad)**: limpia el valor en blur/Tab. Para RIF/TaxID/email, usar `Input` plano + dropdown personalizado. Ver `food-inventory-admin/src/components/ComprasManagement.jsx`.
