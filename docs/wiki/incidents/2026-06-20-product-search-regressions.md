# 2026-06-20 — Búsqueda de productos: regresiones recurrentes (inventario + traslados)

**Severidad**: alta
**Módulos afectados**: inventory, products (POS / add-product), transfer-orders (frontend)
**Tiempo a resolución**: 1 día (varios sub-bugs encadenados)
**Tenant detonante**: broas.admon@gmail.com

## Síntoma

Quejas repetidas, "arregladas" muchas veces y siempre reaparecían:
- Buscar por marca o nombre devolvía **solo algunos** productos.
- Resultados que **aparecían un segundo y luego desaparecían**.
- Buscar una marca real (ej: "Bonomi") mostraba 1 producto cuando había varios.
- Buscar sin tilde ("pina", "jalapeno") devolvía **cero**.

## Root cause (CUATRO causas encadenadas, no una)

La razón de fondo de por qué se "arreglaba" y volvía a romperse: **había tres buscadores
de productos reimplementados por separado**, con campos y lógica distintos, y dentro de
inventario **dos capas que se peleaban**. Cada fix tocaba una capa y la otra re-rompía.

1. **Doble filtro con algoritmos distintos (inventario).** El servidor filtraba por
   **frase completa** (regex de todo el término) y el cliente **re-filtraba** lo ya
   filtrado por **palabras sueltas**. "avellanas mary" (nombre + marca en campos
   distintos) no matcheaba la frase → servidor devolvía 0 → el cliente se quedaba sin
   nada = el "aparecen y desaparecen". Además el cliente rechazaba filas válidas que el
   servidor sí matcheó.

2. **Tope de 100 + paginación apagada durante búsqueda (inventario).** El frontend
   cargaba 100 y forzaba `totalPages=1`, descartando la paginación real que el backend
   ya devolvía. Con catálogos grandes, los resultados >100 eran **inalcanzables**. El
   tope existía SOLO porque el re-filtro cliente necesitaba todo en una página → ambos
   hacks estaban atados.

3. **`productId` String vs ObjectId en el `$in` (inventario).** `inventory.productId`
   está a veces String, a veces ObjectId. El lookup de productos arma `matchingProductIds`
   como ObjectId y hacía `productId: { $in: [ObjectId...] }`, perdiendo todos los
   inventarios con `productId` String. "Bonomi" devolvía 1 de 4: los que solo matcheaban
   por producto (no por su `productName`) y tenían `productId` String quedaban fuera.
   Es el [gotcha objectid-vs-string](../patterns/objectid-vs-string.md).

4. **Regex sensible a acentos (inventario + POS + traslados).** MongoDB `$regex` no pliega
   diacríticos y la collation no aplica a regex. "pina"→"Piña", "jalapeno"→"Jalapeño"
   devolvían cero.

> **NO confundir con bug:** ~50% de los inventarios tienen `productId` apuntando a productos
> de **otra sede** (tenant padre). Es el modelo multi-sede funcionando, no corrupción.
> Y los 1148 "nombres desincronizados" que detectó la auditoría eran **todos variantes**
> (`"Aceite de coco - Mediano"` vs base `"Aceite de coco"`): NO se deben "resincronizar"
> o se borran las variantes. Ver `system-map.md §1.7`.

## Archivos tocados

- `food-inventory-saas/src/modules/inventory/inventory.service.ts` (`findAll`):
  búsqueda **tokenizada** (AND entre palabras, OR entre campos); cada palabra matchea
  también por `productId` real (encuentra por nombre real aunque la copia desnormalizada
  esté vieja); `$in: [ObjectId, String]`; regex insensible a acentos.
- `food-inventory-admin/src/components/inventory/useInventoryData.js`: **eliminado** el
  re-filtro de texto en cliente (solo queda filtro de categoría); **restaurada** la
  paginación server-side durante búsqueda (sin tope de 100).
- `food-inventory-saas/src/modules/products/products.service.ts` (`findAll`): regex
  insensible a acentos en la búsqueda tokenizada (POS / add-product).
- `food-inventory-admin/src/components/CreateTransferOrderDialog.jsx`: filtro cliente
  busca por nombre real (`productId.name`), tokenizado e insensible a acentos.
- `food-inventory-saas/src/utils/accent-regex.util.ts` (**nuevo**): util compartido
  `accentInsensitiveRegex` — expande cada letra a su clase acentuada. Sin migración.

## Commits

- `e7d2ef01f` — tokenización + fin del doble-filtro + paginación restaurada
- `4c1258f88` — `$in` String+ObjectId
- `39335b082` — búsqueda insensible a acentos

## Validación (contra prod, read-only)

- **Cobertura productId/tokenización:** simulada la query desplegada en **432 términos**
  (353 marcas + 80 palabras de nombre) sobre 1523 inventarios del tenant → **0 términos
  con resultados incompletos**.
- **Acentos:** 20/20 términos acentuados traen más resultados (varios pasaban de 0:
  piña 0→10, jalapeño 0→7, champiñones 1→12).
- Backup read-only de `inventories` (6480 docs) tomado antes de tocar nada.

## Prevención

- **Pattern**: [objectid-vs-string](../patterns/objectid-vs-string.md) — `$in: [str, ObjectId]`
  en CUALQUIER match por id contra `inventory.productId` / `tenantId`.
- **Pattern**: [searchable-pagination](../patterns/searchable-pagination.md) — la búsqueda
  pagina server-side; NO cargar N y re-filtrar en cliente.
- **Regla**: UNA sola semántica de búsqueda. No re-filtrar en cliente lo que el servidor
  ya filtró (algoritmos divergen → regresión). Term-matching tokenizado + insensible a
  acentos vía `accentInsensitiveRegex`.
- **Limitación conocida restante**: `food-retail.service.ts` (vertical food/storefront)
  aún usa regex sensible a acentos; no cubierto en esta tanda.

## Notas

Caso paradigmático de regresión por **falta de fuente única de verdad**: tres
implementaciones del mismo buscador. El usuario perdió confianza por anécdota ("la primera
marca que probé ya salió mal"), así que la validación se hizo por **medición masiva**
(432 términos) en vez de probar un caso. Cualquier nuevo buscador de productos debe
reutilizar la búsqueda tokenizada + `accentInsensitiveRegex`, no reinventar el filtro.
