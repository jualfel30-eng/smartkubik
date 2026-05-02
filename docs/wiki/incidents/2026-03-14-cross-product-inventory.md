# 2026-03-14 — Cross-product inventory contamination

**Severidad**: crítica
**Módulos afectados**: inventory, purchase-orders, products
**Tiempo a resolución**: < 1 día

## Síntoma

Al recibir compras de productos distintos que compartían `variantSku` (ej: "-VAR1" generado por bug — ver [SKU collision](./2026-03-14-sku-var1-collision.md)), el stock de un producto se sumaba al inventario de otro. Dos productos completamente distintos compartían registros de inventario.

## Root cause

`addStockFromPurchase` buscaba el inventario por `productSku` (que era el `variantSku`) en lugar de por `productId`. Cuando dos productos tenían el mismo `variantSku` (típicamente "-VAR1" por bug correlacionado), el query devolvía el inventario del primero y le sumaba el stock del segundo.

## Archivos tocados

- `food-inventory-saas/src/modules/inventory/inventory.service.ts` — `addStockFromPurchase()` ahora busca primero por `productId` y usa `variantSku` solo como filtro secundario para variantes del mismo producto.

## Prevención

- **Pattern**: [tenant-isolation](../patterns/tenant-isolation.md) (mismo principio: nunca asumir unicidad de un campo no único).
- **Regla de oro**: queries de inventario deben filtrar por `productId` primero. SKU es display, no identidad.
- **Test de regresión**: crear dos productos con el mismo `variantSku`, recibir compras de ambos, verificar que el stock se mantiene aislado.

## Notas

Bug interrelacionado con [SKU -VAR1 collision](./2026-03-14-sku-var1-collision.md): si los SKUs no hubieran colisionado, este bug habría sido latente y dormido por meses.
