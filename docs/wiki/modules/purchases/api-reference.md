# Compras y Proveedores — Referencia API

> Diseñado para ser consumido por agentes de IA.
> Última actualización: 2026-04-28

---

## Metadata

- **Módulo Purchases**: `src/modules/purchases/`
- **Módulo Suppliers**: `src/modules/suppliers/`
- **Controllers**: `purchases.controller.ts`, `suppliers.controller.ts`
- **Servicios**: `purchases.service.ts` (10 imports forwardRef), `suppliers.service.ts` (1,472 líneas)
- **Schema PO**: `purchase-order.schema.ts`
- **Schema Supplier**: `schemas/supplier.schema.ts` (colección separada de customers)
- **Guard stack**: JwtAuthGuard → TenantGuard

---

## Endpoints — Compras

### POST /api/v1/purchases
- **Descripción**: Crear orden de compra
- **Permisos**: Autenticado

**Request:**
```json
{
  "supplierId": "MongoId — usar si proveedor existe",
  "newSupplierName": "string — para crear nuevo",
  "newSupplierRif": "string — formato: V/E/J/G/P/N/C + 7-9 dígitos",
  "newSupplierContactName": "string",
  "purchaseDate": "ISO date — requerido",
  "items": [{
    "productId": "MongoId — requerido",
    "productName": "string — requerido",
    "productSku": "string — requerido",
    "variantId": "MongoId — opcional",
    "quantity": "number — requerido, > 0",
    "costPrice": "number — requerido, > 0",
    "discount": "number — 0-100%, default: 0",
    "lotNumber": "string — opcional",
    "expirationDate": "ISO date — opcional"
  }],
  "paymentTerms": {
    "isCredit": "boolean — requerido",
    "creditDays": "number — requerido, ≥ 0",
    "paymentMethods": ["string — min 1 item"],
    "expectedCurrency": "USD | VES | EUR | USD_BCV | EUR_BCV",
    "paymentDueDate": "ISO date — opcional",
    "requiresAdvancePayment": "boolean — requerido",
    "advancePaymentPercentage": "number — 0-100",
    "advancePaymentAmount": "number — ≥ 0",
    "remainingBalance": "number — ≥ 0"
  },
  "documentType": "factura_fiscal | nota_entrega",
  "invoiceNumber": "string — opcional",
  "exchangeRateSnapshot": "number — tasa USD/VES",
  "eurExchangeRateSnapshot": "number — tasa EUR/VES",
  "subtotal": "number", "ivaTotal": "number", "igtfTotal": "number", "totalAmount": "number",
  "notes": "string — opcional"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "poNumber": "OC-260428-143022-847392",
    "status": "pending",
    "supplierName": "Polar",
    "totalAmount": 1500.00
  }
}
```

---

### GET /api/v1/purchases
- **Descripción**: Listar POs con paginación
- **Query**: `page` (default 1), `limit` (default 25), `supplierId`, `status`

---

### PATCH /api/v1/purchases/:id/approve
- **Descripción**: Aprobar PO (pending/draft → approved)
- **Body**: `{ "notes": "string — opcional" }`
- **Side effects**: Crea evento de aprobación

---

### PATCH /api/v1/purchases/:id/reject
- **Descripción**: Rechazar PO con razón obligatoria
- **Body**: `{ "reason": "string — requerido" }`

---

### PATCH /api/v1/purchases/:id/receive
- **Descripción**: Recibir mercancía — **operación más crítica del módulo**
- **Body**: `{ "receivedBy": "string — opcional", "invoiceDate": "ISO date — opcional" }`
- **Side effects**: Inventory +, Payables creados, Products vinculados, TransactionHistory, Status → received

---

### GET /api/v1/purchases/pending-approval
- **Descripción**: POs pendientes de aprobación
- **Populates**: supplierId (name), createdBy (email)

---

### POST /api/v1/purchases/scan-invoice
- **Descripción**: Escanear factura con IA (GPT-4o-mini Vision)
- **Content-Type**: multipart/form-data
- **Campo**: imagen (max 5MB, JPEG/PNG/WebP/HEIC)
- **Response**: Datos pre-llenados + `overallConfidence` (0-1)

---

### POST /api/v1/purchases/auto-generate
- **Descripción**: Auto-generar POs borrador para productos con stock bajo

---

### POST /api/v1/purchases/reconcile
- **Descripción**: Reconciliar POs recibidas (sync proveedores + productos)
- **Response**: `{ totalPOs, suppliersCreated, productsLinked, metricsUpdated, errors[] }`

---

## Endpoints — Proveedores

### POST /api/v1/suppliers
- **Descripción**: Crear proveedor (crea Customer + Supplier vinculado)

**Request:**
```json
{
  "name": "string — nombre de la empresa",
  "rif": "string — formato: J-123456789",
  "contactName": "string — persona de contacto",
  "contactPhone": "string — opcional",
  "contactEmail": "email — opcional",
  "address": { "street": "string", "city": "string", "state": "string" },
  "paymentSettings": {
    "acceptsCredit": "boolean",
    "defaultCreditDays": "number",
    "creditLimit": "number",
    "acceptedPaymentMethods": ["string"],
    "preferredPaymentMethod": "string",
    "requiresAdvancePayment": "boolean",
    "advancePaymentPercentage": "number"
  }
}
```

---

### GET /api/v1/suppliers
- **Descripción**: Lista combinada de Suppliers + Customers virtuales (customerType=supplier)
- **Query**: `search` (busca en nombre, RIF, supplierNumber)
- **Nota**: Retorna suppliers reales + "proveedores virtuales" (CRM-only, sin perfil Supplier)

---

### GET /api/v1/suppliers/:id
- **Descripción**: Detalle de proveedor (busca en Suppliers Y en Customers)

---

### PATCH /api/v1/suppliers/:id
- **Descripción**: Actualizar proveedor — sincroniza a Customer y Products (background)

---

### DELETE /api/v1/suppliers/:id
- **Descripción**: Eliminar proveedor — desvincula de productos, elimina Customer

---

### GET /api/v1/suppliers/pricing/by-currency
- **Descripción**: Proveedores agrupados por moneda inferida (para motor de precios)

---

### PATCH /api/v1/suppliers/:id/payment-settings
- **Descripción**: Actualizar config de pago + sincronizar a todos los productos
- **Response**: `{ syncedProducts: number }`

---

### POST /api/v1/suppliers/pricing/bulk-sync
- **Descripción**: Sincronizar config de pago de TODOS los proveedores a TODOS sus productos

---

## Schema Resumido — PurchaseOrder

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  poNumber: string,             // Único: OC-YYMMDD-HHMMSS-XXXXXX
  supplierId: ObjectId,         // → customers collection
  supplierName: string,
  purchaseDate: Date,
  status: "pending" | "draft" | "approved" | "rejected" | "received" | "cancelled",
  items: [{
    productId: ObjectId,        // → products
    productSku: string,
    quantity: number,
    costPrice: number,
    discount?: number,          // 0-100%
    totalCost: number,
    lotNumber?: string,
    expirationDate?: Date
  }],
  totalAmount: number,
  paymentTerms: {
    isCredit: boolean,
    expectedCurrency: "USD" | "VES" | "EUR" | "USD_BCV" | "EUR_BCV",
    paymentMethods: string[],
    requiresAdvancePayment: boolean,
    advancePaymentPercentage?: number
  },
  exchangeRateSnapshot?: number,  // Tasa USD/VES al momento
  history: [{ status, changedAt, changedBy, notes }],
  createdBy: ObjectId,
  createdAt: Date
}
```

## Schema Resumido — Supplier

```typescript
{
  _id: ObjectId,
  tenantId: string,              // ⚠️ String, no ObjectId
  supplierNumber: string,        // PROV-000001 (unique per tenant)
  customerId?: ObjectId,         // → customers (perfil vinculado)
  name: string,
  supplierType: string,          // "distributor"
  paymentSettings: {
    acceptsCredit: boolean,
    defaultCreditDays: number,
    acceptedPaymentMethods: string[],
    preferredPaymentMethod?: string,
    requiresAdvancePayment: boolean,
    advancePaymentPercentage?: number
  },
  metrics: {
    totalOrders: number,
    totalPurchased: number,
    averageOrderValue: number,
    lastOrderDate: Date
  },
  status: "active" | "inactive" | "suspended",
  createdAt: Date
}
```

---

## Dependencias con Otros Módulos

| Módulo | Tipo | Descripción |
|---|---|---|
| **Inventory** | Escribe | `addStockFromPurchase()` al recibir PO |
| **Payables** | Escribe | Crea cuentas por pagar al recibir |
| **Accounting** | Lee | `findOrCreateAccount()` para cuenta de inventario |
| **Products** | Bidireccional | Busca productos para PO items, vincula suppliers[], sync payment config |
| **Customers** | Bidireccional | Customer es el perfil dual del Supplier |
| **Events** | Escribe | Crea notificaciones de aprobación/rechazo/pago |
| **TransactionHistory** | Escribe | Registra historial de transacciones |
| **OpenAI** | Lee | GPT-4o-mini Vision para escaneo de facturas |

---

## Errores Comunes

| Status | Mensaje | Causa |
|---|---|---|
| 400 | "RIF debe tener formato válido" | RIF no coincide con regex `[VEJGPNC]-?\d{7,9}` |
| 400 | "Purchase order must have at least one item" | Array de items vacío |
| 400 | "Debe seleccionar al menos un método de pago" | `paymentMethods` vacío |
| 404 | "Purchase order not found" | ID no existe o no pertenece al tenant |
| 400 | "Cannot receive: status is X" | PO no está en pending/approved |
| 409 | "Supplier number already exists" | Race condition en generación de supplierNumber |

---

*Última actualización: 2026-04-28*
*Archivos fuente: `purchases.controller.ts`, `purchases.service.ts`, `suppliers.controller.ts`, `suppliers.service.ts`, `purchase-order.schema.ts`, `supplier.schema.ts`*
