# Domain 3: Sales & Orders (Punto de Venta y Restaurantes)

## Visión General
Este dominio orquesta el ciclo de vida completo de una venta. Opera de forma dual: como un **Punto de Venta (POS)** tradicional para Retail, y con funcionalidades avanzadas de **Hospitality** (Mesas, Reservaciones, División de Cuentas, Propinas, Kitchen Display System) para Food Service. También soporta órdenes públicas desde el Storefront.

> **Verificado contra código fuente:** 2026-02-24

---

## Data Layer (Esquemas de Base de Datos)

### `Order` — `order.schema.ts`
El núcleo de las ventas. Esquema denormalizado y extenso (~15 KB) con las siguientes capacidades verificadas:

- **Multi-canal**: Campo `source` con enum `['pos', 'storefront', 'whatsapp', 'api', 'manual']` y `sourceMetadata` para datos específicos del canal (whatsappPhone, storefrontDomain, etc.).
- **Multi-moneda**: `totalAmountVes`, `paidAmountVes` para bolívares. Cada `paymentRecord` almacena `amountVes` y `exchangeRate` individual, permitiendo trazabilidad por transacción.
- **Comisiones**: `salesPersonId`, `commissionAmount` (denormalizado), `commissionCalculated`, `commissionRecordId`, `contributesToGoals`.
- **Retención IVA**: `customerIsSpecialTaxpayer`, `ivaWithholdingPercentage` (75% o 100%), `ivaWithholdingAmount`.
- **Envío** (`OrderShipping` sub-esquema): `method`, `address`, `scheduledDate`, `deliveredDate`, `trackingNumber`, `courierCompany`, `cost`, `distance`, `estimatedDuration`.
- **Propinas** (`tipsRecords` sub-esquema): `amount`, `percentage`, `method`, `employeeId`, `distributedAt`.
- **Restaurante**: `tableId` (referencia a Mesa), `isSplit`, `activeSplitId`.
- **Caja Registradora**: `cashSessionId` (opcional — las órdenes de Storefront/WhatsApp no la requieren), `cashRegisterId`.
- **Pagos** (`paymentRecords`): Array con `amountTendered`, `changeGiven`, `changeGivenBreakdown` (objeto con `usd`, `ves`, `vesMethod`).
- **Fulfillment**: `fulfillmentStatus` (`pending`, `picking`, `packed`, `in_transit`, `delivered`, `cancelled`), `fulfillmentType` (`store`, `delivery_local`, `delivery_national`, `pickup`), `deliveryDriver`, `deliveryProofPhoto`.
- **Facturación**: `billingDocumentId`, `billingDocumentNumber`, `billingDocumentType` (`none`, `invoice`, `delivery_note`).
- **Marketing**: `appliedCoupon`, `appliedPromotions` (array).
- **Descuentos**: `generalDiscountPercentage`, `generalDiscountReason`, `generalDiscountApprovedBy`. A nivel de item: `discountReason`, `discountApprovedBy`.
- **Inventario**: `inventoryReservation` (objeto con `reservedAt`, `expiresAt`, `isReserved`, `reservationId`). Items con `lots` (OrderItemLot[] para trazabilidad de lotes).
- **Items de restaurante**: `modifiers` (AppliedModifier[]), `specialInstructions`, `removedIngredients`.

### `CashRegisterSession` — `cash-register-session.schema.ts` (~5.1 KB)
Controla la apertura y cierre de turnos de una caja.

- **CashMovement** sub-esquema: `type` ('in'/'out'), `amount`, `currency`, `reason`, `description`, `authorizedBy`, `timestamp`.
- **CashFund** sub-esquema: `currency`, `amount`, y `denominations` con tracking de billetes (`d_500`, `d_200`, `d_100`, `d_50`, `d_20`, `d_10`, `d_5`, `d_2`, `d_1`, `coins`).
- `openingFunds` y `closingFunds` (CashFund[]).
- `status`: `open`, `closing`, `closed`, `suspended`.
- `workShift`: `morning`, `afternoon`, `night`.
- Métricas: `totalTransactions`, `totalSalesUsd`, `totalSalesVes`.

### `CashRegisterClosing` — `cash-register-closing.schema.ts` (~10 KB)
Esquema **separado** para el cierre de caja con soporte de cierre ciego:

- `cashDifferences[]` con `expectedAmount`, `declaredAmount`, `difference`, `status` (`balanced`, `surplus`, `shortage`).

### `Table` — `table.schema.ts` (~1.8 KB)
Mapa de mesas para Food Service:

- Posición: `position` (objeto con `x`, `y`).
- Forma: `shape` (`square`, `round`, `rectangle`, `booth`).
- Ubicación: `section`, `floor`, `tableNumber`.
- Capacidad: `minCapacity`, `maxCapacity`.
- Estado: `status` (`available`, `occupied`, `reserved`, `cleaning`, `out-of-service`), `currentOrderId`, `seatedAt`, `guestCount`.
- Agrupación: `combinesWith` (array de Table IDs), `combinedWithParent`.
- Asignación: `assignedServerId`.
- Soft delete: `isDeleted`, `isActive`.

### `Reservation` — `reservation.schema.ts`
Motor de agendamiento para Food Service:

- `reservationNumber` (auto-generado: `RES-2025-001`).
- Guest data: `customerId` (opcional), `guestName`, `guestPhone`, `guestEmail`.
- Reservación: `date`, `time`, `partySize`, `duration`, `tableId`.
- `status`: `pending`, `confirmed`, `cancelled`, `seated`, `completed`, `no-show`.
- `occasion`: `birthday`, `anniversary`, `business`, `casual`, `other`.
- `confirmationMethod`: `email`, `sms`, `phone`, `whatsapp`.
- `source`: `website`, `phone`, `walk-in`, `app`.
- Auditoría: `seatedAt`, `completedAt`, `cancelledAt`, `cancelReason`.
- Vinculación: `orderId`.

### `BillSplit` — `bill-split.schema.ts`
División de cuentas para restaurantes:

- `splitType`: `by_person`, `by_items`, `custom`.
- **BillSplitPart** sub-esquema: `personName`, `amount`, `tipAmount`, `totalAmount`, `itemIds` (para modo `by_items`), `paymentStatus`, `paymentId`.
- Totales: `originalAmount`, `totalTips`, `totalAmount`, `numberOfPeople`.
- `status`: `active`, `completed`, `cancelled`.

### `KitchenOrder` — `kitchen-order.schema.ts`
Estructura para el Kitchen Display System (KDS). **Activamente utilizado** por el módulo `kitchen-display`.

- `orderId`, `orderNumber`, `orderType` (`dine-in`, `takeout`, `delivery`).
- `tableNumber`, `customerName`.
- `status`: `new`, `preparing`, `ready`, `completed`, `cancelled`.
- `priority`: `normal`, `urgent`, `asap`.
- `station`: Asignación de estación de cocina (`grill`, `fryer`, `salads`).
- `assignedTo`: Cocinero asignado.
- Tiempos: `receivedAt`, `startedAt`, `completedAt`, `totalPrepTime`, `waitTime`.
- **KitchenOrderItem**: `productName`, `quantity`, `modifiers`, `specialInstructions`, `status` (`pending`, `preparing`, `ready`, `served`), `prepTime`.

---

## Backend (API Layer)

### Módulo Orders (~140 KB total)
**Ubicación**: `src/modules/orders/`

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `orders.service.ts` | **62.8 KB** | Servicio orquestador principal |
| `orders.controller.ts` | 15 KB | Endpoints autenticados |
| `orders-public.controller.ts` | 3.7 KB | Endpoints públicos para Storefront |
| `orders.module.ts` | 4.0 KB | Definición del módulo |
| `orders.service.spec.ts` | 9.2 KB | Tests unitarios |
| `whatsapp-order-notifications.service.ts` | 10 KB | Integración WhatsApp |

#### Servicios Helper (`services/`)

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `order-inventory.service.ts` | 15.0 KB | Reserva/deducción inventario, lógica FEFO |
| `order-payments.service.ts` | 17.6 KB | Procesamiento y reconciliación de pagos |
| `order-fulfillment.service.ts` | 8.2 KB | Flujos de estado y fulfillment |
| `discount.service.ts` | 7.7 KB | Cálculos de descuentos por volumen |
| `order-analytics.service.ts` | 6.4 KB | Reportes y productos top |

#### `OrdersService` — Dependencias Inyectadas (16 servicios)
- **Modelos**: Order, Customer, Product, Tenant, BillOfMaterials, Table
- **Servicios**: InventoryService, AccountingService, PaymentsService, DeliveryService, ExchangeRateService, ShiftsService, DiscountService, TransactionHistoryService, CouponsService, PromotionsService, WhatsAppOrderNotificationsService, PriceListsService, OrderAnalyticsService, OrderFulfillmentService, OrderInventoryService, OrderPaymentsService
- **Infra**: EventEmitter2, Connection (MongoDB)

#### Métodos Principales (19 públicos + 7 privados)

**Creación:**
- `create(dto, user)` — Creación de orden POS/Restaurant. Reserva inventario, calcula impuestos, envía WhatsApp.
- `createPublicOrder(dto)` — Creación de orden Storefront (público, sin auth). **No reserva inventario ni procesa pagos**, solo registra.

**Consulta:**
- `findAll(query, tenantId)`, `findOne(id)`, `findByOrderNumber()`, `getCustomerOrders()`, `exportOrders()` (CSV).

**Pagos:**
- `registerPayments(orderId, dto, user)`, `confirmPayment(orderId, paymentIndex, ...)`.

**Estado:**
- `update(id, dto, user)` — Actualización con merge inteligente de items.
- `updateFulfillmentStatus()`, `completeOrder()`, `cancelOrder()`.

**Analytics:**
- `getTopSellingProducts()`, `getPaymentMethods()`, `getAnalyticsBySource()`.

**Utilidades:**
- `reconcileMissingOutMovements()` — Fix de inventario.
- `fixHistoricPayments()`, `migrateDeliveryNotePaymentStatus()` — Migraciones de datos.

#### `OrdersPublicController`
Endpoint: `POST /api/v1/public/orders`
- No requiere autenticación (decorador `@Public()`).
- Acepta: `tenantId`, `customerName`, `customerEmail`, `customerPhone`, `items[]`, `shippingMethod` (pickup/delivery), `shippingAddress`, `selectedPaymentMethod`, `notes`.
- Soporta productos con variantes (`variantId`, `variantSku`) y unidades seleccionables (`selectedUnit`, `conversionFactor`).

### Módulo Cash Register (~63 KB)
**Ubicación**: `src/modules/cash-register/`

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `cash-register.service.ts` | **53.6 KB** | Gestión de sesiones, cierres |
| `cash-register.controller.ts` | 7.8 KB | Endpoints API |
| `cash-register.module.ts` | 1.1 KB | Definición del módulo |

**Funcionalidades verificadas:**
- Apertura/cierre de sesiones de caja.
- Movimientos de efectivo (ingresos/retiros).
- Cierres individuales y consolidados.
- Tracking de denominaciones (billetes/monedas).
- Reconciliación de diferencias de caja.
- Generación de reportes PDF (formato impresora térmica).
- Método `calculateSessionTotals()` agrega ventas vinculadas por `cashSessionId`, tracking de efectivo entregado/vuelto, y resúmenes fiscales (IVA/IGTF).

### Módulo Tables (~17 KB)
**Ubicación**: `src/modules/tables/`

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `tables.service.ts` | 8.8 KB | Gestión de mesas |
| `tables.controller.ts` | 3.0 KB | Endpoints API |
| `tables.module.ts` | 0.5 KB | Definición del módulo |
| `tables.service.spec.ts` | 4.6 KB | Tests unitarios |

### Módulo Reservations (~34 KB)
**Ubicación**: `src/modules/reservations/`

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `reservations.service.ts` | 15 KB | Lógica de reservaciones |
| `reservations.controller.ts` | 3.4 KB | Endpoints API |
| `reservations.module.ts` | 1.4 KB | Definición del módulo |

**Background Jobs** (`jobs/`):
- `send-confirmation.job.ts` (5.0 KB) — Envío de confirmaciones email/SMS.
- `send-reminder.job.ts` (5.5 KB) — Recordatorios automáticos.
- `mark-no-show.job.ts` (3.4 KB) — Marcado de no-shows.

### Módulo Bill Splits (~21 KB)
**Ubicación**: `src/modules/bill-splits/`

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `bill-splits.service.ts` | 14 KB | Lógica de división de cuentas |
| `bill-splits.controller.ts` | 2.7 KB | Endpoints API |
| `bill-splits.module.ts` | 0.8 KB | Definición del módulo |
| `bill-splits.service.spec.ts` | 3.3 KB | Tests unitarios |

### Módulo Kitchen Display System (~37 KB)
**Ubicación**: `src/modules/kitchen-display/`

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `kitchen-display.service.ts` | **21 KB** | Enrutamiento de órdenes a cocina |
| `kitchen-display.controller.ts` | 4.9 KB | Endpoints API |
| `kitchen-display.listener.ts` | 2.1 KB | Event listener (`order.created` / `order.updated`) |
| `kitchen-display.module.ts` | 0.9 KB | Definición del módulo |
| `kitchen-display.service.spec.ts` | 8.0 KB | Tests unitarios |

**Funcionalidades verificadas:**
- Visualización en tiempo real de órdenes para personal de cocina.
- Transiciones de estado: `new` → `preparing` → `ready` → `completed`.
- **Event-driven**: Escucha eventos de orden para crear/actualizar KitchenOrders automáticamente.
- Asignación por estación y prioridad.

---

## Lógica de Negocio Clave

### Cálculo de Impuestos (dentro de `orders.service.ts`)
- **IVA**: 16% sobre productos gravables (`ivaAmount = totalPrice * 0.16`).
- **IGTF**: 3% sobre pagos en divisas (`igtfTotal = foreignCurrencyPaymentAmount * 0.03`).
- **Retención IVA**: Para contribuyentes especiales, 75% o 100% según tipo de tenant. Almacena `ivaWithholdingAmount` e `ivaWithholdingPercentage`.

### Reserva de Inventario
- Llama a `inventoryService.reserveInventory()` directamente desde `create()`.
- Omite productos de receta (BOM-based).
- Usa `quantityInBaseUnit` para productos multi-unidad.
- Marca `inventoryReservation.isReserved = true` en la orden.
- Lógica FEFO delegada a `OrderInventoryService` / `InventoryService`.

### Notificaciones WhatsApp
- Servicio dedicado: `whatsapp-order-notifications.service.ts` (10 KB).
- Ejecutadas asíncronamente vía `setImmediate()` para no bloquear la respuesta.
- Envía confirmación de orden con instrucciones de pago.

### Facturación
- Las órdenes **NO** crean facturas directamente.
- La facturación es manejada por el módulo `billing` de forma asíncrona vía event listeners (`billing.document.issued` → `BillingAccountingListener`).
- La orden almacena referencia: `billingDocumentId`, `billingDocumentNumber`.

---

## Patrones Arquitectónicos

1. **Descomposición en servicios**: La lógica de órdenes está distribuida en 5 servicios helper especializados (inventario, pagos, fulfillment, descuentos, analytics), reduciendo la responsabilidad del servicio principal.
2. **Event-Driven**: Uso extensivo de `EventEmitter2` para comunicación cross-module (billing, accounting, kitchen-display).
3. **Dual Creation Path**: `create()` para POS/Restaurant (con inventario + pagos) vs `createPublicOrder()` para Storefront (ligero, sin reserva).
4. **Inyección masiva**: 16 servicios inyectados en `OrdersService`, reflejando el rol de orquestador central.

---

## Deuda Técnica Real

1. **`orders.service.ts` sigue siendo grande (62.8 KB)**: Aunque ya cuenta con 5 servicios helper que extraen lógica de inventario, pagos, fulfillment, descuentos y analytics, el archivo principal aún contiene cálculos de impuestos (IVA/IGTF/retención), lógica de resolución de variantes, y flujos de creación que podrían extraerse a servicios adicionales (ej. `OrderTaxService`, `OrderCreationStrategy`).
2. **`cash-register.service.ts` (53.6 KB)**: Archivo denso que concentra apertura, cierre, movimientos, cálculos de totales y generación de reportes PDF. Candidato a descomposición.
3. **Complejidad Multi-Moneda**: Aunque cada `paymentRecord` almacena su `exchangeRate` individual (correcto para trazabilidad), los reportes históricos dependen de estas tasas almacenadas. El cálculo de totales en `calculateSessionTotals()` de caja registradora agrega estas conversiones, exponiendo a complejidad en reportes consolidados.
4. **Métodos de migración en producción**: `fixHistoricPayments()`, `reconcileMissingOutMovements()`, `migrateDeliveryNotePaymentStatus()` son utilidades de migración que viven dentro del servicio principal. Podrían moverse a scripts de migración dedicados.

---

## Correcciones vs Documento Anterior

| Claim Original | Estado | Realidad |
|----------------|--------|----------|
| `orders.service.ts` supera 113KB | **INCORRECTO** | 62.8 KB (~63 KB) |
| KitchenOrder es "Orphan Schema" / código muerto | **INCORRECTO** | Módulo `kitchen-display` completo con controller, service, listener y tests |
| No existe directorio `/src/modules/kitchen/` | **PARCIALMENTE CORRECTO** | El directorio se llama `/src/modules/kitchen-display/`, no `/kitchen/` |
| Acoplamiento fuerte Order ↔ CashRegisterSession | **INCORRECTO** | `cashSessionId` es **opcional** (ternary con `undefined`). Órdenes Storefront/WhatsApp no requieren caja abierta |
| Falta refactorización de orders.service.ts | **PARCIALMENTE CORRECTO** | Ya existen 5 servicios helper, pero el archivo principal aún es grande |
| FEFO transaccional en orders.service.ts | **INCORRECTO** | FEFO está delegado a `OrderInventoryService` / `InventoryService` |
| Creación de facturas en orders.service.ts | **INCORRECTO** | Delegado al módulo `billing` vía eventos |
| OrdersPublicController existe | **CORRECTO** | `orders-public.controller.ts` — POST público sin auth |
| CashRegisterService ~54KB | **CORRECTO** | 53.6 KB verificado |
| Tables, Reservations, BillSplits como micro-controladores | **CORRECTO** | Módulos completos con CRUD |
| WhatsApp en orders.service.ts | **PARCIALMENTE CORRECTO** | Existe, pero delegado a `WhatsAppOrderNotificationsService` dedicado, ejecutado async |

---

**Tamaño total del dominio Sales & Orders:** ~312 KB de código TypeScript distribuidos en 6 módulos.
