# 2026-04-06 — Multi-unit transfer orders

**Severidad**: alta
**Módulos afectados**: transfer-orders, inventory
**Tiempo a resolución**: 1 día

## Síntoma

Las órdenes de transferencia entre ubicaciones no soportaban productos multi-unidad. Ejemplo: usuario quiere transferir 10kg de "Chía Saco 25Kg" (base unit: saco, selling unit: kg con `conversionFactor: 0.04`) y el sistema solo permite transferir en unidades base (sacos). Cuando lograba enviar, descontaba 10 sacos en lugar de 0.4 sacos.

## Root cause

`create()` en `transfer-orders.service.ts` mapeaba items del DTO al schema pero **descartaba** `selectedUnit`, `conversionFactor` y `unitOfMeasure`. Estos campos existían en DTO, schema y frontend, pero el mapping del backend los perdía. Al despachar, `conversionFactor` era `undefined` y `qty` se interpretaba como unidades base.

## Archivos tocados

- `food-inventory-saas/src/modules/transfer-orders/transfer-orders.service.ts`:
  - `create()` línea 481 — añadido `selectedUnit`, `conversionFactor`, `unitOfMeasure` al mapping.
  - `update()` línea 541 — mismo fix.
  - `createTransferRequest()` línea 744 — mismo fix (PULL flow).
  - `ship()` línea 985 y `receive()` línea 1245 — ya tenían lógica de conversión correcta.
- `food-inventory-admin/src/components/CreateTransferOrderDialog.jsx:338` — frontend ya enviaba campos correctamente cuando `conversionFactor !== 1`.

## Data cleanup

- Restaurado inventario Chía 3.6 → 4 sacos (descenso incorrecto del despacho fallido).
- Cancelada orden TO-0010 (tenía `conversionFactor: undefined`).
- Eliminados 24 movimientos huérfanos de despacho fallido.

## Prevención

- **Pattern**: [multi-unit-conversions](../patterns/multi-unit-conversions.md).
- **Test de regresión**: crear transfer con producto multi-unit, verificar que el dispatch descuenta `qty * conversionFactor` en unidades base.
- **Code review**: cualquier mapping DTO → Schema en módulos con items debe preservar los 3 campos.

## Notas

Caso paradigmático de bug introducido por mapping incompleto. El frontend, schema y dispatch lógico estaban correctos; solo faltaba pasar los campos por el medio. Tipo de bug que un test E2E con producto multi-unit habría detectado inmediatamente.
