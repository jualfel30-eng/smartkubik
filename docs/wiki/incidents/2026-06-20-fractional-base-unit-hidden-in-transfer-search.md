# 2026-06-20 — Stock a granel con saldo fraccional invisible en el buscador de traslados

**Severidad**: alta
**Módulos afectados**: transfer-orders (frontend), inventory
**Tiempo a resolución**: < 1 día

## Síntoma

El tenant `broas.admon@gmail.com` quería trasladar "avellanas" entre sus sedes. El producto tenía inventario (8.7 kg = 0.87 sacos), pero **no aparecía en el buscador de productos** del diálogo de traslado: ni buscando por nombre, ni por SKU, ni por nada. La operación quedaba bloqueada.

## Root cause

El campo `availableQuantity` del documento de inventario se guarda en la **unidad BASE** del producto. Para las avellanas la unidad base es "saco" (de 10kg), así que el disponible valía `0.87`, no `8.7`.

El diálogo de traslado cargaba el inventario del almacén origen con `minAvailable=1` hardcodeado ([`CreateTransferOrderDialog.jsx:166`](../../../food-inventory-admin/src/components/CreateTransferOrderDialog.jsx)), que el backend traduce a `availableQuantity >= 1` ([`inventory.service.ts:1693-1694`](../../../food-inventory-saas/src/modules/inventory/inventory.service.ts)).

`0.87 >= 1` → **falso**. El registro nunca se devolvía, por eso era invisible por cualquier criterio de búsqueda (la búsqueda es client-side sobre lo ya cargado). El umbral asumía unidades enteras; rompía **cualquier producto a granel/peso con menos de 1 unidad-base de stock** (sacos parciales, bobinas, rollos), no solo el caso reportado.

Bug secundario detectado en el mismo flujo: al agregar un ítem, la cantidad inicial se fijaba en `1` sin tope contra lo disponible. Con 0.87 sacos disponibles, "Enviar ahora" reventaba con *Stock insuficiente* aunque el usuario no tocara nada.

## Archivos tocados

- `food-inventory-admin/src/components/CreateTransferOrderDialog.jsx`:
  - Línea 166 — `minAvailable=1` → `minAvailable=0.001` ("tiene stock real" sin excluir granel parcial).
  - `addItem()` (~línea 273) — si la unidad por defecto (saco) no alcanza para 1, se preselecciona automáticamente la unidad más fina disponible (kg); cantidad inicial clampada a `min(1, disponible)`.

Cambio **solo frontend**, deploy admin-only. El backend (`minAvailable` → `$gte`) se dejó intacto: lo consume también el storefront público (`products-public.controller.ts` usa `minAvailableQuantity: 1` aparte).

## Commit / PR

- `24cdfaa5d` — fix(transfers): mostrar y permitir traslado de stock a granel parcial

## Prevención

- **Pattern**: [multi-unit-conversions](../patterns/multi-unit-conversions.md) — `availableQuantity` vive en unidad base; nunca compararlo contra umbrales enteros pensados para "unidades".
- **Regla**: cualquier filtro de "tiene stock" debe ser `> 0`, no `>= 1`. El `1` asume que la unidad base es atómica, lo cual es falso para granel/peso.
- **Test de regresión**: producto con unidad base "saco" y saldo 0.87 debe aparecer en el buscador de traslados y permitir mover en kg.

## Auditoría del patrón (2026-06-20)

Se barrió todo el código buscando umbrales enteros sobre `availableQuantity`. Resultado:

| Consumidor | Estado | Acción |
|---|---|---|
| Buscador de traslados (`CreateTransferOrderDialog.jsx`) | mordía | `minAvailable=1` → `0.001` (commit `24cdfaa5d`) |
| **POS retail** (`products.service.ts`, `inStockOnly`) | **mordía** — comentario decía "stock > 0" pero hacía `$gte: 1` | `inStockOnly` → `{ $gt: 0 }`; `minAvailableQuantity` explícito sigue `$gte: N` |
| **Storefront público** (`products-public.controller.ts`) | **mordía** — `minAvailableQuantity: 1` | → `inStockOnly: true` (rutea por `$gt: 0`) |
| `food-retail.service.ts:581` (`$gte: minAvailable`) | latente | param-driven, sin `1` hardcodeado; ningún caller envía `1`. Se deja, pero los callers deben usar semántica `> 0` |

Regla establecida: **un umbral que significa "tiene stock" debe ser `$gt: 0`, nunca `$gte: 1`**. `availableQuantity` vive en unidad base y es fraccional para granel. Los umbrales numéricos reales (`minAvailableQuantity: N`) sí usan `$gte`.

## Notas

Pendiente de revisar a futuro si reaparece: **alertas de stock bajo** y **reportes de inventario** (no usan umbral fijo `1` hoy, pero comparten el campo `availableQuantity` en unidad base).

El contexto de fondo del módulo de traslados (dos dimensiones: entre almacenes de una misma sede Y entre sedes de un tenant padre, no excluyentes) está documentado en [`system-map.md` §1.7](../system-map.md).
