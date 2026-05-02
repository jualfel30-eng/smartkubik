# 2026-03-14 — SKU "-VAR1" collision en variantes

**Severidad**: alta
**Módulos afectados**: products (frontend + backend)
**Tiempo a resolución**: < 1 día

## Síntoma

Productos con una sola variante terminaban con `variantSku = "-VAR1"`. Múltiples productos distintos compartían exactamente el mismo SKU, lo que disparó el bug de [cross-product inventory contamination](./2026-03-14-cross-product-inventory.md).

## Root cause

Cadena de fallos:

1. Frontend enviaba `variantSku` vacío al crear producto con variante única.
2. Backend, al ver SKU vacío, generaba "-VAR1" como fallback.
3. Como todos los productos pasaban por el mismo path, todos terminaban con "-VAR1".

## Archivos tocados

- `food-inventory-saas/src/modules/products/products.service.ts` — para variante primaria, usa el SKU del producto padre en lugar de generar fallback.
- `food-inventory-admin/src/components/ProductsManagement.jsx` — frontend envía SKU explícito.
- `food-inventory-admin/src/components/<otro-form>.jsx` — segundo lugar donde se creaban productos.

## Prevención

- **Validación en DTO**: `variantSku` no debe aceptar string vacío (`@IsNotEmpty`).
- **Default en service**: si la lista de variantes tiene 1 sola, su SKU = SKU del producto. No generar sufijo.
- **Test de regresión**: crear producto sin SKU explícito de variante y verificar que el SKU resultante no contiene "-VAR1".

## Notas

`generateSku()` usa los primeros 3 caracteres alfanuméricos del nombre del tenant como prefijo (ej: "Tiendas Broas, C.A." → "TIE"). Documentado en [system-map.md](../system-map.md).
