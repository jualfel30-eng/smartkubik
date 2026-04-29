# Órdenes y Caja — Referencia API

> Diseñado para ser consumido por agentes de IA.
> Última actualización: 2026-04-28

---

## Metadata

- **Módulo Orders**: `src/modules/orders/` (7 sub-servicios, ~50 endpoints)
- **Módulo Cash Register**: `src/modules/cash-register/` (11 endpoints, 28 métodos)
- **Schema Order**: ~600 líneas
- **Service principal**: 1,825 líneas
- **Guard stack**: JwtAuthGuard → TenantGuard → PermissionsGuard

---

## Endpoints — Órdenes

### POST /api/v1/orders
- **Descripción**: Crear orden (autenticado, POS)
- **Permisos**: `orders_create`

**Request (campos principales):**
```json
{
  "customerId": "MongoId — opcional",
  "customerName": "string",
  "customerRif": "string — opcional",
  "taxType": "V|E|J|G|P|N — opcional",
  "items": [{
    "productId": "MongoId — requerido",
    "variantId": "MongoId — opcional",
    "variantSku": "string — opcional",
    "quantity": "number — requerido",
    "unitPrice": "number — opcional (auto si no se proporciona)",
    "selectedUnit": "string — opcional (kg, g, und)",
    "conversionFactor": "number — opcional",
    "modifiers": [{ "modifierId": "MongoId", "name": "string", "priceAdjustment": "number" }],
    "specialInstructions": "string — opcional",
    "removedIngredients": ["string — opcional"],
    "ivaApplicable": "boolean — opcional",
    "ivaRate": "number — opcional (0, 8, 16)"
  }],
  "deliveryMethod": "store|pickup|delivery|envio_nacional",
  "shippingAddress": "string — si delivery",
  "shippingCost": "number — opcional",
  "couponCode": "string — opcional",
  "generalDiscountPercentage": "number — opcional",
  "priceListId": "MongoId — opcional",
  "savePriceListToCustomer": "boolean — opcional",
  "autoReserve": "boolean — default false",
  "tableId": "MongoId — opcional (restaurante)",
  "cashSessionId": "MongoId — opcional (POS)",
  "cashRegisterId": "string — opcional",
  "notes": "string — opcional",
  "payments": [{ "method": "string", "amount": "number", "reference": "string" }]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "orderNumber": "ORD-260428-143022-8473",
    "status": "pending",
    "paymentStatus": "pending",
    "totalAmount": 150.00,
    "items": [{ "productName": "...", "quantity": 2, "finalPrice": 75.00 }]
  }
}
```

---

### POST /api/v1/public/orders
- **Descripción**: Crear orden desde storefront (sin autenticación)
- **Permisos**: Ninguno (@Public)
- **Diferencias**: Requiere `tenantId` en body, reserva inventario 15 min, no procesa pagos

---

### GET /api/v1/orders
- **Descripción**: Listar órdenes con paginación
- **Permisos**: `orders_read`
- **Query**: `page`, `limit`, `status`, `paymentStatus`, `customerId`, `dateFrom`, `dateTo`, `source`

---

### GET /api/v1/orders/:id
- **Descripción**: Detalle de una orden
- **Permisos**: `orders_read`

---

### GET /api/v1/orders/track/:orderNumber
- **Descripción**: Tracking público por número de orden
- **Permisos**: Ninguno (@Public)

---

### POST /api/v1/orders/:id/payments
- **Descripción**: Registrar múltiples pagos
- **Permisos**: `orders_update`

**Request:**
```json
{
  "payments": [{
    "method": "efectivo_usd",
    "amount": 50,
    "currency": "USD",
    "reference": "string — opcional",
    "bankAccountId": "MongoId — para transferencias",
    "amountTendered": 60,
    "tipAmount": 5,
    "tipPercentage": 10
  }]
}
```

---

### POST /api/v1/orders/:id/confirm-payment
- **Descripción**: Confirmar un pago específico y asignar banco
- **Permisos**: `orders_update`

---

### POST /api/v1/orders/:id/complete
- **Descripción**: Completar orden (requiere paid + factura)
- **Permisos**: `orders_update`
- **Side effects**: Aplica fulfillment strategy, limpia mesa

---

### PATCH /api/v1/orders/:id/cancel
- **Descripción**: Cancelar orden, revertir movimientos de inventario
- **Permisos**: `orders_update`

---

### PATCH /api/v1/orders/:id/fulfillment
- **Descripción**: Actualizar estado de despacho
- **Permisos**: `orders_update`
- **Body**: `{ "status": "picking|packed|in_transit|delivered", "trackingNumber": "optional" }`

---

### POST /api/v1/orders/calculate
- **Descripción**: Pre-calcular totales sin guardar
- **Permisos**: `orders_create`

---

### GET /api/v1/orders/export
- **Descripción**: Exportar órdenes a CSV
- **Permisos**: `orders_read`

---

### GET /api/v1/orders/analytics/by-source
- **Descripción**: Ventas por canal (POS, Storefront, WhatsApp)
- **Permisos**: `orders_read`
- **Query**: `startDate`, `endDate`

---

### GET /api/v1/orders/__lookup/payment-methods
- **Descripción**: Métodos de pago configurados del tenant
- **Response**: Lista de métodos con `igtfApplicable`, instrucciones, detalles bancarios

---

## Endpoints — Caja Registradora

### POST /api/v1/cash-register/sessions/open
- **Permisos**: `cash_register_open`
- **Body**: `{ registerName, openingFunds: [{ currency, amount, denominations }], workShift }`

### GET /api/v1/cash-register/sessions/current
- **Permisos**: `cash_register_read`
- **Response**: Sesión abierta del usuario actual

### GET /api/v1/cash-register/sessions/open
- **Permisos**: `cash_register_admin`
- **Response**: Todas las sesiones abiertas

### POST /api/v1/cash-register/sessions/:id/movements
- **Permisos**: `cash_register_write`
- **Body**: `{ type: "in"|"out", amount, currency, reason, description }`

### POST /api/v1/cash-register/sessions/:id/close
- **Permisos**: `cash_register_close`
- **Body**: `{ closingFunds, closingAmountUsd, closingAmountVes, exchangeRate }`

### GET /api/v1/cash-register/sessions/:id/totals
- **Permisos**: `cash_register_read`
- **Response**: Totales por método, vueltos, impuestos

### POST /api/v1/cash-register/closings/global
- **Permisos**: `cash_register_admin`
- **Body**: `{ periodStart, periodEnd, sessionIds?, cashierIds? }`

### POST /api/v1/cash-register/closings/approve
- **Permisos**: `cash_register_approve`

### POST /api/v1/cash-register/closings/reject
- **Permisos**: `cash_register_approve`

### GET /api/v1/cash-register/closings
- **Permisos**: `cash_register_read`
- **Query**: Filtros por fecha, estado, tipo, diferencias

### POST /api/v1/cash-register/closings/:id/export
- **Permisos**: `cash_register_export`
- **Body**: `{ format: "pdf"|"csv"|"excel" }`

---

## Schema Resumido — Order

```typescript
{
  _id: ObjectId,
  tenantId: string,
  orderNumber: string,              // ORD-YYMMDD-HHMMSS-XXXX
  customerId?: ObjectId,
  customerName?: string,
  customerRif?: string,
  status: "draft"|"pending"|"confirmed"|"completed"|"cancelled",
  paymentStatus: "pending"|"partial"|"paid",
  fulfillmentStatus: "pending"|"picking"|"packed"|"in_transit"|"delivered"|"cancelled",
  fulfillmentType: "store"|"delivery_local"|"delivery_national"|"pickup",
  source: "pos"|"storefront"|"whatsapp"|"api"|"manual",
  items: [{
    productId: ObjectId,
    quantity: number,
    unitPrice: number,
    selectedUnit?: string,          // Multi-unit support
    conversionFactor?: number,
    finalPrice: number,             // After discounts
    discountPercentage?: number,
    ivaAmount: number,
    modifiers?: [],
    removedIngredients?: string[]   // Excluded from BOM backflush
  }],
  subtotal: number,
  ivaTotal: number,                 // 16%
  igtfTotal: number,                // 3% on forex
  shippingCost: number,
  totalAmount: number,              // Final in USD
  totalAmountVes: number,           // Final in VES
  paidAmount: number,
  paymentRecords: [{                // Multi-payment support
    method: string,
    amount: number,
    currency: string,
    igtf?: number,
    amountTendered?: number,
    changeGiven?: number,
    changeGivenBreakdown?: { usd, ves, vesMethod }
  }],
  appliedCoupon?: { couponId, code, discountAmount },
  appliedPromotions?: [{ promotionId, name, discountAmount }],
  ivaWithholdingPercentage?: number,  // 75 or 100 for special taxpayers
  ivaWithholdingAmount?: number,
  tableId?: ObjectId,               // Restaurant
  cashSessionId?: ObjectId,         // POS cash register
  billingDocumentId?: ObjectId,     // Invoice
  createdBy: ObjectId,
  createdAt: Date
}
```

---

## Dependencias con Otros Módulos

| Módulo | Tipo | Descripción |
|---|---|---|
| **Inventory** | Bidireccional | Reserve/commit/release + backflush BOM + OUT movements |
| **Payments** | Escribe | Crea documentos Payment por cada pago |
| **Customers** | Bidireccional | Carga/crea cliente, actualiza historial |
| **Coupons** | Lee + Escribe | Valida y registra uso de cupón |
| **Promotions** | Lee + Escribe | Busca aplicables y registra uso |
| **Delivery** | Lee | Calcula costo de envío |
| **ExchangeRate** | Lee | Tasa USD/VES en tiempo real |
| **PriceLists** | Lee | Precio por lista personalizada |
| **Tables** | Lee + Escribe | Vincula/limpia mesa de restaurante |
| **Shifts** | Lee | Asigna empleado activo |
| **Accounting** | Escribe | Asientos contables (via Payments) |
| **TransactionHistory** | Escribe | Historial de transacciones del cliente |
| **Marketing** | Lee | WhatsApp config para notificaciones |
| **BOM (modelo)** | Lee | Carga recetas para backflush |
| **CashRegister** | Lee | Vincula sesión de caja |

---

## Errores Comunes

| Status | Mensaje | Causa |
|---|---|---|
| 400 | "Order must have at least one item" | Items array vacío |
| 400 | "Payment status must be 'paid' to complete" | Intentar completar sin pagar |
| 400 | "Billing document required to complete" | Sin factura emitida |
| 400 | "Insufficient stock for item X" | No hay stock para reservar |
| 404 | "Order not found" | ID no existe o no pertenece al tenant |
| 400 | "Invalid coupon code" | Cupón no válido o expirado |
| 409 | "Register already in use" | Otro cajero tiene la misma caja abierta |
| 400 | "Session is not open" | Intentar cerrar caja ya cerrada |

---

*Última actualización: 2026-04-28*
*Archivos fuente: `orders.controller.ts`, `orders-public.controller.ts`, `orders.service.ts`, `order-*.service.ts`, `cash-register.controller.ts`, `cash-register.service.ts`*
