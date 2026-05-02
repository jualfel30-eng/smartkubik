# 2026-03-14 — Doble incremento de stock en recepción de PO

**Severidad**: crítica
**Módulos afectados**: purchase-orders, inventory
**Tiempo a resolución**: < 1 día

## Síntoma

Al recibir una orden de compra, el stock del producto se incrementaba **al doble** de la cantidad recibida. Inventario quedaba inflado, descuadres en reportes contables.

## Root cause

`receivePurchaseOrder` ejecutaba dos operaciones que ya incrementaban stock:

1. `inventoryService.addStockFromPurchase(...)` — añadía stock + creaba movimiento.
2. `inventoryMovementsService.create(...)` — creaba otro movimiento que ALSO añadía stock.

Resultado: cada item se sumaba dos veces.

## Archivos tocados

- `food-inventory-saas/src/modules/purchase-orders/purchase-orders.service.ts` — eliminado el segundo `inventoryMovementsService.create` (la primera operación ya cubre ambas responsabilidades).

## Prevención

- **Test de regresión**: `purchase-orders.service.spec.ts` debe verificar que tras `receivePurchaseOrder(po)`, el stock incrementa exactamente `po.items[i].quantity` y se crea exactamente 1 movimiento.
- **Code review checklist**: cualquier cambio en `purchase-orders` o `inventory` debe verificar que el flujo no duplica side effects.

## Notas

Este bug coexistió con el de [cross-product inventory contamination](./2026-03-14-cross-product-inventory.md) y el de [SKU -VAR1](./2026-03-14-sku-var1-collision.md). Los tres fueron descubiertos en la misma sesión de auditoría sobre el módulo `purchase-orders`.
