# Órdenes y Caja — Catálogo de Funciones

> Funciones de Orders (7 sub-servicios) y Cash Register.
> Última actualización: 2026-04-28

---

## Resumen — Órdenes

| Función | Descripción | Sub-servicio |
|---|---|---|
| Crear orden | Crea venta con items, descuentos, impuestos, reserva de inventario | OrdersService |
| Crear orden pública | Recibe pedido del storefront (sin auth) | OrdersService |
| Calcular totales | Pre-calcula subtotal, IVA, IGTF, envío, descuentos sin guardar | OrdersService |
| Registrar pagos | Procesa múltiples pagos en una orden | OrderPaymentsService |
| Confirmar pago | Marca un pago específico como confirmado + banco | OrderPaymentsService |
| Completar orden | Finaliza según fulfillment strategy del tenant | OrderFulfillmentService |
| Cancelar orden | Cancela y revierte movimientos de inventario | OrderFulfillmentService |
| Actualizar fulfillment | Cambia estado de despacho (picking→packed→in_transit→delivered) | OrderFulfillmentService |
| Backflush ingredientes | Descuenta componentes de BOM al pagar (recetas) | OrderInventoryService |
| Crear OUT movements | Descuenta stock regular al pagar | OrderInventoryService |
| Calcular descuento | Evalúa descuento por volumen vs. promoción, aplica el mejor | DiscountService |
| Analytics por fuente | Ventas agrupadas por canal (POS, Storefront, WhatsApp) | OrderAnalyticsService |
| Exportar CSV | Exporta órdenes con filtros a CSV | OrderAnalyticsService |
| Notificar WhatsApp | Envía confirmación y actualizaciones de delivery | WhatsAppNotificationsService |

## Resumen — Caja Registradora

| Función | Descripción |
|---|---|
| Abrir sesión | Registra fondos iniciales con denominaciones USD/VES |
| Movimiento de caja | Entrada/salida de efectivo con razón |
| Cerrar sesión | Declara montos finales, calcula diferencias |
| Cierre global | Consolida múltiples cajas en un reporte |
| Aprobar/Rechazar cierre | Workflow de aprobación para cierres con diferencias |
| Calcular totales | Suma ventas, pagos, vueltos por método y moneda |
| Reportes | Análisis de vueltos, denominaciones, resumen por período |
| Exportar PDF | Formato recibo (80mm) para impresora de tickets |

---

## Crear Orden (POS)

### ¿Qué hace?
Registra una venta completa: cliente, productos con precios y descuentos, impuestos calculados, método de entrega, y opcionalmente reserva de inventario y notificación por WhatsApp.

### ¿Cuándo se usa?
Cada vez que se hace una venta — ya sea desde el POS presencial, un pedido por WhatsApp, o manualmente.

### Paso a paso (POS presencial)
1. El cajero busca o escanea productos (F2 para buscar, B para barcode)
2. Para productos multi-variante, selecciona variante y cantidad
3. Si el producto tiene modificadores (extras, opciones), los configura
4. Opcionalmente selecciona cliente (por RIF o teléfono) para facturación
5. Selecciona método de entrega (tienda, pickup, delivery, envío nacional)
6. El sistema calcula automáticamente:
   - Descuento por volumen o promoción (el mejor de los dos)
   - IVA (16%) por producto
   - IGTF (3%) si el pago es en divisas
   - Costo de envío (si aplica)
   - Retención de IVA (si el cliente es contribuyente especial)
7. El cajero presiona F4 para pagar
8. Registra uno o más pagos (multi-pago soportado)
9. Si hay vuelto mixto (USD→VES), usa el modal de vuelto
10. Genera factura o nota de entrega
11. La orden se completa según la estrategia de fulfillment del tenant

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/orders`
- **Servicio**: `orders.service.ts → create()`
- **Flujo interno**:
  1. Carga o crea Customer (si se proporcionó RIF/teléfono)
  2. Carga productos en bulk (optimización: una sola query)
  3. Para cada item: resuelve variante → obtiene precio (price list > variante > base) → calcula descuento → calcula IVA
  4. Calcula costo de delivery si aplica
  5. Valida y aplica cupón (si se proporcionó)
  6. Busca y aplica promociones automáticas (`autoApply=true`)
  7. Calcula retención de IVA si `customerIsSpecialTaxpayer`
  8. Determina `fulfillmentType` y `fulfillmentStatus` según delivery method
  9. Guarda orden
  10. Incrementa tenant usage
  11. Vincula a mesa si `tableId` (restaurante)
  12. Emite evento `order.created`
  13. Si incluye pagos, los procesa inmediatamente
  14. Si `autoReserve=true`, reserva inventario
  15. Envía WhatsApp de confirmación (async)
- **Permisos**: `orders_create`

---

## Registrar Pagos

### ¿Qué hace?
Procesa uno o múltiples pagos para una orden. Soporta pagos parciales y multi-método. Cuando el total pagado alcanza el total de la orden, dispara el backflush de inventario.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/orders/:id/payments`
- **Servicio**: `order-payments.service.ts → registerPayments()`
- **Para cada pago**:
  - Normaliza USD ↔ VES con tasa de cambio
  - Calcula IGTF (3%) si es pago en divisas
  - Crea documento Payment vía PaymentsService
  - Agrega a `paymentRecords[]`
- **Al quedar `paid`** (totalPaid ≥ totalAmount - 0.01):
  - Auto-limpia mesa (si `tableId`)
  - Backflush de ingredientes para productos con BOM (async)
  - Crea movimientos OUT de inventario (async)
  - Emite evento `order.paid`
- **Permisos**: `orders_update`

---

## Completar Orden

### ¿Qué hace?
Marca la orden como completada. El comportamiento final depende de la estrategia de fulfillment del tenant.

### Estrategias de Fulfillment

| Estrategia | Resultado | Caso de uso |
|---|---|---|
| `immediate` | status=completed, fulfillment=delivered | Venta en mostrador (retail) |
| `counter` | status=confirmed, fulfillment=picking | Preparación para retiro |
| `logistics` | status=confirmed, fulfillment=pending | Envío por courier |
| `hybrid` | Decide por `shipping.method` | Mixto pickup + delivery |

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/orders/:id/complete`
- **Validación**: Requiere `paymentStatus='paid'` + `billingDocumentId` (factura emitida)
- **Side effects**: Limpia mesa, emite evento de fulfillment
- **Permisos**: `orders_update`

---

## Backflush de Ingredientes (BOM)

### ¿Qué hace?
Para productos que tienen receta (Bill of Materials), al pagar la orden no se descuenta el producto terminado del inventario, sino sus **ingredientes individuales**. Considera modificadores y ingredientes removidos.

### ¿Cuándo se usa?
Automáticamente al quedar una orden como "paid". Típico en restaurantes donde se venden platos cuya receta descompone en ingredientes.

### Lo que pasa por detrás (técnico)
- **Servicio**: `order-inventory.service.ts → deductIngredientsFromSale()`
- **Lógica**:
  1. Para cada item de la orden con BOM asociado
  2. Carga los componentes del BOM
  3. Aplica efectos de modificadores (`exclude`, `multiply`, `add`)
  4. Excluye `removedIngredients[]`
  5. Calcula: `qty × component.quantity × (1 + scrapPercentage)`
  6. Descuenta cada ingrediente vía `adjustInventory()`
- **Async**: Se ejecuta en background, no bloquea la respuesta

---

## Calcular Mejor Descuento

### ¿Qué hace?
Evalúa dos tipos de descuento para cada item y aplica el que le dé el precio más bajo al cliente.

### Tipos evaluados
1. **Descuento por volumen**: Reglas en `product.pricingRules.bulkDiscountRules[]` — si compras ≥ X unidades, te aplica Y%
2. **Descuento por promoción**: Si el producto tiene `promotion.isActive=true` y está dentro del rango de fechas

### Lo que pasa por detrás (técnico)
- **Servicio**: `discount.service.ts → calculateBestDiscount()`
- **Optimización**: Recibe el objeto Product completo (no hace query a BD)
- **Retorna**: `{ applied, discountPercentage, originalPrice, discountedPrice, rule? }`

---

## Abrir Caja Registradora

### ¿Qué hace?
Inicia una sesión de caja registradora. El cajero declara los fondos iniciales contando billetes y monedas.

### Paso a paso
1. El cajero abre "Cierre de Caja" en el menú
2. Ingresa nombre de la caja (ej: "Caja 1") y turno (mañana/tarde/noche)
3. Cuenta los billetes por denominación: $100×5, $50×3, $20×10, etc.
4. Hace lo mismo para bolívares
5. El sistema calcula el total y crea la sesión

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/cash-register/sessions/open`
- **Validaciones**: No puede tener otra sesión abierta, el nombre de caja no puede estar en uso
- **Genera**: `sessionNumber` = `CAJ-YYYY-NNNN`
- **Permisos**: `cash_register_open`

---

## Cerrar Caja

### ¿Qué hace?
Cierra una sesión de caja. El cajero cuenta los fondos finales, el sistema calcula la diferencia entre lo esperado y lo declarado, y genera un documento de cierre.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/cash-register/sessions/:id/close`
- **Cálculo de esperado**:
  ```
  Esperado USD = Apertura USD + Ventas USD - Vueltos USD + Entradas USD - Salidas USD
  Esperado VES = Apertura VES + Ventas VES - Vueltos VES + Entradas VES - Salidas VES
  ```
- **Diferencia**: `Declarado - Esperado`
  - < $0.01 = `balanced`
  - Positivo = `surplus` (sobrante)
  - Negativo = `shortage` (faltante)
- **Si hay diferencias**: Estado = `pending_approval` (necesita supervisión)
- **Si cuadra**: Estado = `approved`
- **Permisos**: `cash_register_close`

---

## Cierre Global (Consolidado)

### ¿Qué hace?
Consolida múltiples sesiones de caja en un solo reporte. Para supervisores que necesitan un resumen de todas las cajas de un período.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/cash-register/closings/global`
- **Filtros**: Período (fecha inicio/fin), cajeros específicos, cajas específicas
- **Genera**: Documento con `closingType='consolidated'`, todas las métricas agregadas
- **Permisos**: `cash_register_admin`

## Devolver Orden

### ¿Qué hace?
Desde el menú de acciones de una orden en el historial, permite **devolver** una orden pagada: reintegra la mercancía al inventario, reembolsa en efectivo desde la caja abierta y marca la orden como devuelta. Es distinto de **Cancelar** (esa es para órdenes no cumplidas y no mueve caja).

### ¿Cuándo se usa?
El cliente trae mercancía de vuelta. La acción "Devolver orden" aparece si la orden está **pagada, no cancelada ni totalmente devuelta y sin factura fiscal**. Una orden parcialmente devuelta sigue mostrando la acción para devolver el resto.

### Lo que pasa por detrás (técnico)
- Vive en el **módulo Returns**, no en orders. Ver [modules/returns/](../returns/overview.md) y `system-map.md` §1.13.
- UI: `ReturnDialog.jsx` (selector Total/Parcial) + acción `return` en `secondaryActions.js` (gate `can-return`).
- Total y parcial por ítem + efectivo + asiento contable. Devolución parcial deja la orden `partially_returned` con reembolso proporcional. Saldo a favor y cambio: fases siguientes.

## Aplicar Saldo a Favor

### ¿Qué hace?
Aplica el **saldo a favor** (store credit) del cliente al saldo pendiente de una orden. Descuenta del crédito del cliente y lo registra como un pago `store_credit` en la orden; si queda cubierta, la marca pagada.

### ¿Cuándo se usa?
El cliente tiene saldo (p.ej. de una devolución previa "a saldo a favor") y lo usa para cubrir una compra. La acción "Aplicar saldo a favor" aparece en órdenes **con saldo pendiente, con cliente y no canceladas**.

### Lo que pasa por detrás (técnico)
- Endpoint `POST /orders/:id/redeem-store-credit` → `OrderPaymentsService.redeemStoreCredit`. Debita el ledger (atómico) y reutiliza `registerPayments`; compensa si el pago no se refleja.
- Motor de saldo: [modules/store-credit/](../store-credit/overview.md) y `system-map.md` §1.14.
- UI: `ApplyCreditDialog.jsx` + acción `apply-credit` en `secondaryActions.js` (gate `can-apply-credit`).

---

*Última actualización: 2026-07-01*
*Archivos fuente: `orders.service.ts`, `order-*.service.ts`, `discount.service.ts`, `cash-register.service.ts`, `returns/*.ts`, `store-credit/*.ts`*
