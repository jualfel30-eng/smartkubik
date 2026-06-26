# 2026-06-26 — Productos en catálogo que no aparecen en Inventario (inventario inactivo huérfano)

**Severidad**: alta (recurrente — varios reportes del mismo tenant)
**Módulos afectados**: inventory, products
**Tenant**: Tiendas Broas, C.A. (padre `69b187062339e815ceba7487`, admin `broas.admon@gmail.com`)
**Tiempo a resolución**: mismo día

## Síntoma

Productos visibles en el catálogo ("Productos") no aparecen en la pantalla de
"Inventario". Reportado puntualmente con `TBS-0378` (Agua Cristal 600ml), pero
recurrente con otros. La UI mostraba "de 1550 registros" — y el usuario insistía
en que había inventario; lo había, pero el producto reclamado estaba oculto.

## Root cause

La pantalla de Inventario lista la colección `inventories` con filtro
`isActive: { $ne: false }` (`inventory.service.ts` → `findAll`). Un producto solo
aparece si tiene un documento de inventario **activo**. Dos vías lo apagan:

1. **Borrado lógico manual**: `DELETE /inventory/:id` → `inventory.remove()` pone
   `isActive=false` + `totalQuantity=0`. TBS-0378 fue eliminado así el 2026-06-26
   por la propia cuenta `broas.admon` (`updatedBy` lo confirma).
2. **Migración masiva del 2026-05-05**: apagó ~415 docs en un minuto
   (`updatedBy=null`). De los 465 inactivos del padre, 316 tenían un doc activo
   duplicado (productId String vs ObjectId, que burla el índice único) y **149 no
   tenían activo**.

Agravante: el hook `createInitialInventoriesForProductInGroup` consideraba un doc
inactivo como "existente" y lo **saltaba** (`skipped++`) sin reactivarlo, así que
re-crear el producto nunca recuperaba la visibilidad. Y el fallo del hook se
registraba en silencio (`products.service.ts`), volviendo el problema indetectable.

Conteo real de productos ACTIVOS del padre sin inventario activo: **5**
(TBS-0168, TBS-0378, TBS-0477, TBS-1239 a reactivar; TBS-0880 a crear). Los otros
~144 docs inactivos eran de productos ya borrados del catálogo → se dejan apagados.

## Archivos tocados

- `scripts/migrations/2026-06-26-reactivate-orphaned-inventory.ts` — reparación
  idempotente (dry-run por defecto, `--apply`, backup JSON). Reactiva inventarios
  inactivos de productos activos sin activo; crea a qty 0 si no hay doc. Aplicado a
  prod (4 reactivados + 1 creado; padre pasó de 1550 a 1555 visibles).
- `scripts/check-orphaned-inventory.ts` (`npm run db:check:orphaned-inventory`) —
  chequeo solo-lectura: productos activos sin inventario activo + `warehouseId`
  undefined + productIds con docs duplicados String/ObjectId. Exit≠0 si hay huérfanos.
- `src/modules/inventory/inventory.service.ts` — el hook ahora **reactiva** el doc
  inactivo en vez de saltarlo (espejo de `create()`); nuevo contador `reactivated`.
- `src/modules/products/products.service.ts` — el hook ya no falla en silencio:
  log con stack + marcador greppable `INVENTORY_GAP`.

## Prevención

- **Pattern**: [soft-delete-conventions](../patterns/soft-delete-conventions.md) y
  [objectid-vs-string](../patterns/objectid-vs-string.md) (los duplicados String/ObjectId).
- **Monitoreo**: correr `db:check:orphaned-inventory` (cron/CI) — convierte la
  "llamada de queja" en una alerta.
- **Test de regresión**: `inventory.service.initial-inventories.spec.ts` →
  "reactivates a pre-existing INACTIVE inventory instead of skipping it".

## Secuela: duplicados por variante MUERTA (mismo día)

Tras la reparación, el usuario creó stock para un producto reactivado y vio el SKU
**duplicado** en Inventario. Causa: las variantes de muchos productos fueron
re-creadas con `_id` nuevos (el `productId` se mantuvo, pero `variants[]._id` cambió),
dejando docs de inventario apuntando a un `variantId` que ya no existe. El índice
único es `(tenantId, productId, variantId)` → un doc con variante muerta + uno con
variante viva coexisten = duplicado visible. La reparación de huérfanos reactivó 4
docs con variante muerta sin validar; al crear el usuario el doc de la variante viva,
aparecieron duplicados.

- **Escala**: **450 docs activos del padre apuntan a variantes muertas** (~29% del
  inventario visible). Bomba de duplicados latente: estalla al agregar stock.
- **Fix de los 4 tocados hoy** (`db:repair:dead-variant-inventory --skus=...`):
  deactivar el muerto si ya hay doc activo de variante viva; re-apuntar (adoptar) si
  no; reactivar el doc vivo inactivo si existe. Aplicado a TBS-0378/0477/0168/1239.
- **Pendiente**: correr el fix sobre los ~446 restantes (su propio go-ahead) —
  verificar antes colisiones de índice y que `inventorymovements` no se rompan.

## Pendiente (Rebanada 3 — plan propio)

- **Split-brain de catálogos entre sedes**: bajo el modelo "catálogo compartido del
  padre" (decisión del usuario), las sedes hijas tienen catálogos propios duplicados
  (1.210 SKUs c/u) e inventario keyado a productos del padre; ~1.480/1.421 productos
  propios quedan huérfanos. Sus `inventorymovements` referencian productos propios →
  requiere re-mapeo, no borrado.
- **Índice único sin `warehouseId`** (`inventory.schema.ts`) incompatible con
  multi-almacén por sede; es la mecánica de los duplicados String/ObjectId.
