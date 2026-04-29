# Inventario — Referencia API

> Diseñado para ser consumido por agentes de IA.
> Última actualización: 2026-04-28

---

## Metadata

- **Módulo backend**: `src/modules/inventory/`
- **Controllers**: `inventory.controller.ts`, `inventory-movements.controller.ts`, `inventory-alerts.controller.ts`
- **Servicios**: `inventory.service.ts`, `inventory-movements.service.ts`, `inventory-alerts.service.ts`, `inventory-receipt-pdf.service.ts`
- **Schemas**: `inventory.schema.ts`, `inventory-movement.schema.ts`, `inventory-alert-rule.schema.ts`
- **Permisos**: `inventory_create`, `inventory_read`, `inventory_update`, `inventory_delete`, `inventory_write`
- **Guard stack**: JwtAuthGuard → TenantGuard → PermissionsGuard

---

## Endpoints — Inventario Principal

### POST /api/v1/inventory
- **Descripción**: Crear registro de inventario (o incrementar si ya existe)
- **Permisos**: `inventory_create`

**Request:**
```json
{
  "productId": "MongoId — requerido",
  "productSku": "string — requerido",
  "productName": "string — requerido",
  "totalQuantity": "number — requerido, min: 0",
  "averageCostPrice": "number — requerido, min: 0",
  "warehouseId": "MongoId — opcional (auto: default warehouse)",
  "binLocationId": "MongoId — opcional",
  "variantId": "MongoId — opcional",
  "variantSku": "string — opcional",
  "lots": [{
    "lotNumber": "string — requerido",
    "quantity": "number — requerido, min: 0.01",
    "costPrice": "number — requerido, min: 0",
    "expirationDate": "ISO date — opcional",
    "manufacturingDate": "ISO date — opcional",
    "supplierId": "MongoId — opcional"
  }],
  "receivedBy": "string — opcional",
  "notes": "string — opcional",
  "reference": "string — opcional (agrupa recepciones)"
}
```

---

### GET /api/v1/inventory
- **Descripción**: Listar inventario con filtros y paginación
- **Permisos**: `inventory_read`

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Items por página (max: 10000) |
| `search` | string | — | Busca en SKU y nombre |
| `warehouse` / `warehouseId` | string | — | Filtro por almacén |
| `lowStock` | boolean | — | Solo productos con stock bajo |
| `nearExpiration` | boolean | — | Solo con lotes por vencer |
| `expired` | boolean | — | Solo con lotes vencidos |
| `minAvailable` | number | — | Stock mínimo disponible |
| `sortBy` | string | updatedAt | productName, availableQuantity, updatedAt, sku, cost |
| `sortOrder` | string | desc | asc, desc |
| `includeInactive` | boolean | false | Incluir eliminados |

**Response (200):**
```json
{
  "success": true,
  "data": [{
    "_id": "ObjectId",
    "productId": "ObjectId",
    "productSku": "TIE-0042",
    "productName": "Harina Pan",
    "totalQuantity": 100,
    "availableQuantity": 85,
    "reservedQuantity": 15,
    "averageCostPrice": 1.50,
    "warehouseId": "ObjectId",
    "lots": [{ "lotNumber": "L001", "quantity": 50, "expirationDate": "2026-06-15" }]
  }],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

### GET /api/v1/inventory/stock-summary
- **Descripción**: Stock agrupado por producto y almacén
- **Permisos**: `inventory_read`

---

### GET /api/v1/inventory/:id
- **Descripción**: Inventario por ID
- **Permisos**: `inventory_read`

---

### GET /api/v1/inventory/product/:productSku
- **Descripción**: Inventario por SKU del producto
- **Permisos**: `inventory_read`

---

### DELETE /api/v1/inventory/:id
- **Descripción**: Eliminación lógica (isActive=false, cantidades a 0, lotes vacíos)
- **Permisos**: `inventory_delete`

---

### POST /api/v1/inventory/adjust
- **Descripción**: Ajustar cantidad manualmente
- **Permisos**: `inventory_update`

**Request:**
```json
{
  "inventoryId": "MongoId — requerido",
  "newQuantity": "number — requerido, min: 0",
  "reason": "string — requerido (Conteo físico, Daño, Merma, Devolución, Otro)",
  "newCostPrice": "number — opcional",
  "lotNumber": "string — opcional",
  "binLocationId": "MongoId — opcional"
}
```

---

### POST /api/v1/inventory/bulk-adjust
- **Descripción**: Ajuste masivo desde Excel (transacción MongoDB)
- **Permisos**: `inventory_update`

**Request:**
```json
{
  "items": [{
    "SKU": "string — requerido",
    "NuevaCantidad": "number — requerido",
    "variantSku": "string — opcional",
    "attributes": "object — opcional (para combinaciones de atributos)"
  }],
  "reason": "string — requerido"
}
```

---

### POST /api/v1/inventory/reserve
- **Descripción**: Reservar stock para una orden
- **Permisos**: `inventory_update`

**Request:**
```json
{
  "items": [{
    "productSku": "string — requerido",
    "variantSku": "string — opcional",
    "quantity": "number — requerido, min: 0.01",
    "useFefo": "boolean — default: true (primero los que vencen antes)"
  }],
  "orderId": "MongoId — requerido",
  "expirationMinutes": "number — default: 30, max: 1440"
}
```

---

### POST /api/v1/inventory/release
- **Descripción**: Liberar reserva de inventario
- **Permisos**: `inventory_update`

**Request:**
```json
{
  "orderId": "MongoId — requerido",
  "productSkus": ["string — opcional, si vacío libera todo"]
}
```

---

### PATCH /api/v1/inventory/:id/lots
- **Descripción**: Actualizar lotes de un inventario
- **Permisos**: `inventory_update`

---

### GET /api/v1/inventory/alerts/count
- **Descripción**: Conteo de alertas activas (para badge del sidebar)
- **Permisos**: `inventory_read`

### GET /api/v1/inventory/alerts/low-stock
- **Descripción**: Productos con stock bajo el mínimo
- **Permisos**: `inventory_read`

### GET /api/v1/inventory/alerts/near-expiration
- **Descripción**: Productos con lotes por vencer
- **Query**: `days` (default: 7)
- **Permisos**: `inventory_read`

---

### GET /api/v1/inventory/reports/summary
- **Descripción**: KPIs de inventario
- **Permisos**: `inventory_read`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 150,
    "lowStockCount": 12,
    "expirationCount": 5,
    "totalValue": 45230.50
  }
}
```

---

### GET /api/v1/inventory/movements/:id/receipt
- **Descripción**: Generar recibo PDF de un movimiento
- **Permisos**: `inventory_read`
- **Response**: `application/pdf` (Buffer)

---

## Endpoints — Movimientos de Inventario

### POST /api/v1/inventory-movements
- **Descripción**: Crear movimiento individual
- **Permisos**: `inventory_write`

**Request:**
```json
{
  "inventoryId": "MongoId — requerido",
  "movementType": "IN | OUT | ADJUSTMENT | TRANSFER — requerido",
  "quantity": "number — requerido, min: 0.0001",
  "unitCost": "number — requerido, min: 0",
  "reason": "string — opcional",
  "reference": "string — opcional",
  "warehouseId": "MongoId — opcional",
  "binLocationId": "MongoId — opcional"
}
```

---

### GET /api/v1/inventory-movements
- **Descripción**: Historial de movimientos con filtros
- **Permisos**: `inventory_read`

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Items por página (max: 10000) |
| `inventoryId` | MongoId | — | Filtro por inventario |
| `productSku` | string | — | Filtro por SKU |
| `movementType` | string | — | in, out, adjustment, transfer |
| `dateFrom` | ISO date | — | Desde fecha |
| `dateTo` | ISO date | — | Hasta fecha |
| `orderId` | MongoId | — | Filtro por orden |

---

### GET /api/v1/inventory-movements/documents
- **Descripción**: Movimientos agrupados por orden/referencia (vista de "documentos")
- **Permisos**: `inventory_read`

---

### POST /api/v1/inventory-movements/documents/export
- **Descripción**: Exportar documento/nota de entrega como PDF
- **Permisos**: `inventory_read`

---

### GET /api/v1/inventory-movements/export
- **Descripción**: Exportar movimientos como PDF o CSV
- **Permisos**: `inventory_read`

**Query Parameters:**
| Param | Tipo | Descripción |
|---|---|---|
| `format` | `pdf` \| `csv` | Formato de exportación |
| `datePreset` | string | today, yesterday, this_week, last_week, this_month, last_month, custom |
| `dateFrom` | ISO date | Si preset=custom |
| `dateTo` | ISO date | Si preset=custom |
| `movementType` | string | Filtro por tipo |
| `productId` | MongoId | Filtro por producto |
| `warehouseId` | MongoId | Filtro por almacén |

---

### POST /api/v1/inventory-movements/transfers
- **Descripción**: Crear transferencia entre almacenes
- **Permisos**: `inventory_write`

**Request:**
```json
{
  "productId": "MongoId — requerido",
  "sourceWarehouseId": "MongoId — requerido",
  "destinationWarehouseId": "MongoId — requerido",
  "sourceBinLocationId": "MongoId — opcional",
  "destinationBinLocationId": "MongoId — opcional",
  "quantity": "number — requerido, min: 0.0001",
  "reason": "string — opcional",
  "reference": "string — opcional"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "uuid-string",
    "outMovement": { "...movimiento OUT en origen..." },
    "inMovement": { "...movimiento IN en destino..." }
  }
}
```

---

## Endpoints — Alertas de Inventario

### GET /api/v1/inventory-alerts
- **Descripción**: Listar reglas de alerta
- **Permisos**: `inventory_read`
- **Query**: `productId`, `warehouseId`, `isActive`

### POST /api/v1/inventory-alerts
- **Descripción**: Crear regla de alerta
- **Permisos**: `inventory_write`

**Request:**
```json
{
  "productId": "MongoId — requerido",
  "warehouseId": "MongoId — opcional (null = todos)",
  "minQuantity": "number — requerido, positivo",
  "isActive": "boolean — default: true",
  "channels": ["string — default: ['in-app']"]
}
```

### PATCH /api/v1/inventory-alerts/:id
- **Descripción**: Actualizar regla
- **Permisos**: `inventory_write`

### DELETE /api/v1/inventory-alerts/:id
- **Descripción**: Soft-delete regla
- **Permisos**: `inventory_write`

---

## Schema Resumido (para Agentes)

```typescript
// Inventory
{
  _id: ObjectId,
  tenantId: ObjectId,
  productId: ObjectId,          // → products
  productSku: string,
  productName: string,
  warehouseId?: ObjectId,       // → warehouses (puede ser undefined en registros antiguos)
  totalQuantity: number,
  availableQuantity: number,
  reservedQuantity: number,
  committedQuantity: number,
  averageCostPrice: number,     // Costo promedio ponderado
  lastCostPrice: number,
  lots?: [{                     // Para perecederos
    lotNumber: string,
    quantity: number,
    expirationDate?: Date,
    costPrice: number
  }],
  isActive: boolean,            // ⚠️ puede ser undefined → usar { $ne: true } para filtrar deletados
  createdAt: Date,
  updatedAt: Date
}

// InventoryMovement
{
  _id: ObjectId,
  tenantId: ObjectId,
  inventoryId: ObjectId,        // → inventories
  productId: ObjectId,          // → products
  movementType: "in" | "out" | "adjustment" | "transfer" | "reservation" | "release",
  quantity: number,
  unitCost: number,
  totalCost: number,
  reason?: string,
  reference?: string,
  orderId?: ObjectId,           // → orders
  transferId?: string,          // UUID que vincula pares de transferencia
  balanceAfter?: { totalQuantity, availableQuantity, reservedQuantity, averageCostPrice },
  createdBy: ObjectId,
  createdAt: Date
}

// InventoryAlertRule
{
  _id: ObjectId,
  tenantId: ObjectId,
  productId: ObjectId,          // → products
  warehouseId?: ObjectId,       // null = todos los almacenes
  minQuantity: number,
  isActive: boolean,
  channels: string[],           // ["in-app"]
  lastTriggeredAt?: Date,       // Debounce 6h
  isDeleted: boolean
}
```

---

## Dependencias con Otros Módulos

| Módulo | Tipo | Descripción |
|---|---|---|
| **Products** | Bidireccional | Inventory almacena stock por producto. Products adjunta stock en listados |
| **Purchases** | Recibe llamada | `addStockFromPurchase()` al recibir PO |
| **Orders** | Recibe llamada | `reserve/release/commitInventory()` en ciclo de vida de orden |
| **TransferOrders** | Recibe llamada | `deductStockBySku()` al despachar transferencia |
| **Manufacturing** | Recibe llamada | `deductStockBySku()` al consumir componentes |
| **Warehouses** | Lee datos | `getDefaultWarehouse()` para asignar almacén automáticamente |
| **Events** | Escribe datos | Crea eventos de alerta de stock bajo |
| **EventEmitter** | Emite evento | `inventory.alert.triggered` para notification center |

---

## Errores Comunes

| Status | Mensaje | Causa |
|---|---|---|
| 400 | "Insufficient stock" | Intento de reservar/transferir más stock del disponible |
| 400 | "Inventory already exists for this product" | Intento de crear inventario duplicado |
| 404 | "Inventory not found" | ID no existe o no pertenece al tenant |
| 404 | "Product not found" | productSku no encontrado en el tenant |

---

*Última actualización: 2026-04-28*
*Archivos fuente: `inventory.controller.ts`, `inventory.service.ts`, `inventory-movements.controller.ts`, `inventory-movements.service.ts`, `inventory-alerts.controller.ts`, `inventory-alerts.service.ts`*
