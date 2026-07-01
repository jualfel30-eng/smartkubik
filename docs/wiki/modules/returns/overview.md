# Devoluciones (Returns / Refunds)

## ¿Qué es?

El módulo de Devoluciones gestiona cuando un cliente **devuelve mercancía ya comprada** y se le reembolsa el dinero. No reinventa nada: es un **orquestador** que, alrededor de un documento `Return` auditable, reúne los subsistemas que ya existen — reintegra el stock al inventario, saca el dinero de la caja abierta y marca la orden como devuelta.

Es distinto de **cancelar** una orden: cancelar es para una orden que nunca se cumplió; devolver es para mercancía entregada/pagada que regresa.

## ¿Para quién es?

- **Cajero**: procesa la devolución desde el historial de órdenes cuando el cliente trae mercancía de vuelta.
- **Administrador**: revisa las devoluciones registradas (auditoría, reportes).
- **Sistema**: reintegra stock, registra la salida de caja, marca los pagos como reembolsados.

## ¿Qué problema resuelve?

- **Sin devoluciones**, no habría forma trazable de reingresar producto devuelto ni de reflejar el reembolso en la caja — se haría a mano y sin auditoría.
- El documento `Return` deja constancia de qué se devolvió, cuánto se reembolsó, y qué efectos generó (movimientos de inventario, salida de caja, pagos reembolsados).

## Alcance actual (Fases 0 · 0.1 · 1)

- **Devolución TOTAL** de una orden (todos los ítems).
- **Devolución PARCIAL por ítem**: el cajero elige qué líneas y cuánto; la orden queda `partially_returned` mientras le quede saldo, `refunded` cuando se devolvió todo. Reembolso **proporcional a lo pagado** por valor de ítem.
- **Reembolso en efectivo** (sale de la sesión de caja abierta del cajero) **o a saldo a favor** (se acredita al cliente vía [modules/store-credit/](../store-credit/overview.md), no toca caja).
- **Asiento contable** de la devolución (débito a "Devoluciones en Ventas" 4102 / crédito a Caja 1101 si efectivo, o al pasivo "Saldo a favor de clientes" 2104 si saldo a favor).
- Sólo órdenes **pagadas por completo** y **sin factura fiscal**.

## Pendiente (fases siguientes — ver plan de devoluciones)

- **Cambio** (exchange): devolución + nueva venta con diferencia de precio.
- **Nota de Crédito fiscal** (HKA/SENIAT) para órdenes facturadas.

## Ubicación

- Backend: `food-inventory-saas/src/modules/returns/`
- Frontend: acción "Devolver orden" en el historial de órdenes (`food-inventory-admin/src/components/orders/v2/ReturnDialog.jsx`), disparada desde el menú de acciones compartido (`src/lib/orders/secondaryActions.js`).
