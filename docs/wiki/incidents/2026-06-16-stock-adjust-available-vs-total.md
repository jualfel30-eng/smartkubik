# 2026-06-16 — Ajuste de stock calculaba sobre `availableQuantity` y el backend lo aplicaba contra `totalQuantity`

**Severidad**: alta
**Módulos afectados**: inventory (frontend admin: ajuste individual, conteo masivo, quick-adjust, diálogo desktop)
**Tiempo a resolución**: mismo día del reporte

## Síntoma

Al ajustar stock desde el panel —tanto móvil (individual y conteo masivo) como
desktop— el inventario cambiaba en **una cantidad distinta a la que el usuario
definió**: a veces sumaba, a veces restaba, siempre en montos incoherentes. No
era constante: en algunos productos funcionaba y en otros no.

Pista clave del usuario: en la lista de desktop la **columna de stock disponible
mostraba el valor incorrecto**, pero al abrir el diálogo de ajuste aparecía "el
monto exacto que ya había cambiado" — como si el ajuste sí se hubiera efectuado
pero la columna no lo reflejara.

## Root cause

El backend `adjustInventory` ([inventory.service.ts:845-847](../../../food-inventory-saas/src/modules/inventory/inventory.service.ts#L845))
trata `newQuantity` como el **TOTAL nuevo** y calcula el delta contra `totalQuantity`:

```ts
const difference = adjustDto.newQuantity - inventory.totalQuantity; // base = TOTAL
inventory.totalQuantity = adjustDto.newQuantity;
inventory.availableQuantity += difference;
```

Pero **todo el frontend calculaba `newQuantity` a partir de `availableQuantity`**
(= `totalQuantity − reservedQuantity`), no del total. Cuando un producto tenía
reservas (`reserved > 0`), el delta real aplicado quedaba desfasado por
`reservedQuantity`:

```
total=10, reservado=2, disponible=8.  Usuario quiere SUMAR 3.
Frontend manda  newQuantity = disponible(8) + 3 = 11
Backend: difference = 11 − total(10) = +1   ← aplicó +1, no +3
```

El error era exactamente `reservedQuantity`, que varía por producto y puede ser
positivo o negativo → efecto "errático". Cuando `reserved = 0` (disponible ==
total) el cálculo coincidía y funcionaba — de ahí la inconsistencia entre productos.

La invariante `available = total − reserved` la preserva el backend en cada ajuste,
así que los registros quedaban internamente consistentes; lo que estaba mal era el
**valor absoluto** vs la intención del usuario (imposible de recuperar a posteriori,
porque la cantidad tecleada no se persiste).

La discrepancia desktop "columna vs diálogo": la columna lee `availableQuantity`
(en `/products` incluso **sumado entre almacenes**) y queda cacheada en React Query;
el diálogo leía el `availableQuantity` fresco del registro individual. Dos lecturas
de fuentes distintas + caché sin refetch.

### Cómo se activó

El móvil llevaba tiempo mandando el payload con los nombres de campo equivocados
(`productId`/`quantity` en vez de `inventoryId`/`newQuantity`), así que el ajuste
**fallaba con error de validación** y no cambiaba nada (ver pantallazo del reporte
original). El fix `fb7bd0852` corrigió los nombres → el ajuste empezó a **ejecutarse**
… replicando la misma base errónea (`availableQuantity`) que ya tenía el desktop en
`InlineStockAdjust`. Es decir: el bug de cálculo era preexistente en desktop; el fix
de nombres lo hizo visible en móvil ("pasó de no hacer nada a hacer algo incorrecto").

## Archivos tocados

Todos anclan ahora el cálculo en `totalQuantity` (fallback a `availableQuantity`):

- `food-inventory-admin/src/components/mobile/inventory/MobileAdjustStock.jsx` — base `totalQuantity` para ajuste individual.
- `food-inventory-admin/src/components/mobile/inventory/MobileBulkAdjust.jsx` — el conteo masivo cuenta contra el total (sobreescribe `normalizeItem.stock`).
- `food-inventory-admin/src/components/inventory/InlineStockAdjust.jsx` — quick-adjust desktop.
- `food-inventory-admin/src/components/inventory/useInventoryData.js` — `handleEditItem` prellenaba `newQuantity` con `availableQuantity`.
- `food-inventory-admin/src/components/inventory/InventoryEditDialog.jsx` — mostraba "Disponible" como referencia pero el campo es "Nueva Cantidad Total".

## Commit / PR

- `fb7bd0852` — fix(inventory): mobile stock adjust enviaba payload incorrecto (corrigió nombres de campo; activó la ruta).
- `c6af83965` — fix(inventory): ajustar stock sobre totalQuantity, no availableQuantity (root cause).

## Remediación de datos (prod)

Barrido de los 16 ajustes desde el deploy (cutoff `2026-06-11T22:48Z`): **todos del
tenant demo `Early Adopter Inc.` (68d371dffdb57e5c800f2fcd)** — 0 clientes reales.
Casi seguro pruebas propias reproduciendo el bug. 8 cayeron sobre registros con
`reserved > 0` (mal ajustados). No es auto-corregible (no se persiste la cantidad
intencionada): requieren **reconteo físico** de SVG-002, SVG-030, SVG-101-var1,
EAR-0047 en el demo, o reset del demo. Sin impacto en datos de clientes.

## Prevención

- **Convención (frontend)**: cualquier UI que ajuste inventario vía `POST /inventory/adjust`
  debe calcular `newQuantity` sobre `totalQuantity`, NUNCA sobre `availableQuantity`.
  El endpoint interpreta `newQuantity` como el nuevo total y diffea contra `totalQuantity`.
  `availableQuantity` es derivado (`total − reserved`) y solo sirve para mostrar.
- **Test de regresión pendiente**: unit de `adjustInventory` con un registro
  `reserved > 0` verificando que un newQuantity = total+Δ aplica exactamente Δ a
  `availableQuantity` y preserva `reserved`; y test de los componentes de ajuste que
  el payload se construye desde `totalQuantity`.
- Mejora pendiente (no incluida): invalidar/refetch la caché React Query de la lista
  de inventario tras un ajuste, para que la columna no quede desincronizada del registro.

## Notas

- Drift independiente detectado de paso: en SVG-002, `reservedQuantity=39` pero
  `total − disponible = 7`. El campo `reservedQuantity` puede estar desincronizado de
  la diferencia real total/disponible — problema previo y aparte de este bug, sin abordar.
- Lección: un fix que "hace que algo empiece a funcionar" puede activar un bug de
  cálculo latente aguas abajo. Al corregir el payload del móvil había que verificar la
  semántica completa del endpoint (qué representa `newQuantity`), no solo que dejara de
  dar 400.
- Relacionado: histórico de inventario en [double stock on PO receipt](./2026-03-14-double-stock-decrement.md)
  y [cross-product inventory](./2026-03-14-cross-product-inventory.md).
