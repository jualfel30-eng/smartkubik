# Transferencias y Almacenes — Referencia API

> Diseñado para ser consumido por agentes de IA.
> Última actualización: 2026-04-28

---

## Metadata

- **Módulo Transfers**: `src/modules/transfer-orders/` (~1,452 líneas de servicio)
- **Módulo Warehouses**: `src/modules/warehouses/`
- **Schemas**: `transfer-order.schema.ts`, `warehouse.schema.ts` (Warehouse + BinLocation)
- **Feature flags**: `MULTI_LOCATION` (transfers), `MULTI_WAREHOUSE` (warehouses)
- **Guard stack**: JwtAuthGuard → TenantGuard → PermissionsGuard

---

## Endpoints — Transfer Orders

### CRUD

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/transfer-orders` | Crear orden (PUSH) |
| GET | `/api/v1/transfer-orders` | Listar con filtros y paginación |
| GET | `/api/v1/transfer-orders/:id` | Detalle de una orden |
| PATCH | `/api/v1/transfer-orders/:id` | Editar (solo borrador) |
| DELETE | `/api/v1/transfer-orders/:id` | Soft delete (solo borrador) |

### Flujo PUSH

| Método | Ruta | Transición | Descripción |
|---|---|---|---|
| POST | `/:id/request` | DRAFT → PUSH_REQUESTED | Solicitar aprobación |
| POST | `/:id/approve` | PUSH_REQUESTED → PUSH_APPROVED | Aprobar (con ajuste de cantidades) |

### Flujo PULL

| Método | Ruta | Transición | Descripción |
|---|---|---|---|
| POST | `/requests` | — → DRAFT (type=pull) | Crear solicitud PULL |
| POST | `/:id/submit` | DRAFT → PULL_REQUESTED | Enviar solicitud |
| POST | `/:id/approve-request` | PULL_REQUESTED → PULL_APPROVED | Origen aprueba |
| POST | `/:id/reject-request` | PULL_REQUESTED → PULL_REJECTED | Origen rechaza |

### Ejecución

| Método | Ruta | Transición | Descripción |
|---|---|---|---|
| POST | `/:id/prepare` | APPROVED → IN_PREPARATION | Marcar en preparación |
| POST | `/:id/dispatch` | IN_PREPARATION → IN_TRANSIT | **Despachar (descuenta inventario)** |
| POST | `/:id/receive` | IN_TRANSIT → RECEIVED/PARTIALLY | **Recibir (incrementa inventario)** |
| POST | `/:id/report-discrepancy` | RECEIVED/PARTIAL | Reportar diferencias |

### Control

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/:id/cancel` | Cancelar (antes de dispatch) |
| POST | `/:id/revert-to-draft` | Revertir a borrador (antes de preparación) |

---

### POST /api/v1/transfer-orders (Crear)

**Request:**
```json
{
  "sourceWarehouseId": "MongoId — requerido",
  "destinationWarehouseId": "MongoId — requerido",
  "destinationTenantId": "MongoId — opcional (cross-tenant)",
  "sourceLocationId": "MongoId — opcional",
  "destinationLocationId": "MongoId — opcional",
  "items": [{
    "productId": "MongoId — requerido",
    "requestedQuantity": "number — requerido",
    "selectedUnit": "string — opcional (kg, cajas, sacos)",
    "conversionFactor": "number — opcional",
    "unitOfMeasure": "string — opcional",
    "unitCost": "number — opcional",
    "notes": "string — opcional"
  }],
  "notes": "string — opcional",
  "reference": "string — opcional"
}
```

### POST /api/v1/transfer-orders/:id/dispatch

**Request:**
```json
{
  "items": [{
    "productId": "MongoId",
    "shippedQuantity": "number — opcional (default: approvedQuantity)"
  }],
  "trackingNumber": "string — opcional",
  "carrier": "string — opcional",
  "estimatedArrival": "ISO date — opcional",
  "notes": "string — opcional"
}
```

**Side effects**: Decrementa inventario origen, crea movimientos TRANSFER OUT

### POST /api/v1/transfer-orders/:id/receive

**Request:**
```json
{
  "items": [{
    "productId": "MongoId — requerido",
    "receivedQuantity": "number — requerido (≤ shippedQuantity)"
  }],
  "receiptNotes": "string — opcional",
  "notes": "string — opcional"
}
```

**Side effects**: Incrementa inventario destino, crea movimientos TRANSFER IN, auto-detecta discrepancias

---

### GET /api/v1/transfer-orders (Listar)

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `type` | string | — | `push`, `pull` |
| `status` | string | — | Cualquier status válido |
| `sourceLocationId` | MongoId | — | Filtro por ubicación origen |
| `destinationLocationId` | MongoId | — | Filtro por ubicación destino |
| `dateFrom` | ISO date | — | Desde fecha |
| `dateTo` | ISO date | — | Hasta fecha |
| `page` | number | 1 | Página |
| `limit` | number | 50 | Items por página (max: 200) |

**Nota**: Multi-tenant aware — muestra transferencias donde el tenant es origen O destino.

---

## Endpoints — Warehouses

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/warehouses` | Crear almacén |
| GET | `/api/v1/warehouses` | Listar almacenes |
| PATCH | `/api/v1/warehouses/:id` | Actualizar almacén |
| DELETE | `/api/v1/warehouses/:id` | Soft delete |

### POST /api/v1/warehouses

**Request:**
```json
{
  "name": "string — requerido (max 100)",
  "code": "string — requerido (max 20, único por tenant)",
  "location": { "address": "string", "city": "string", "state": "string", "country": "string", "lat": "number", "lng": "number" },
  "isActive": "boolean — default true",
  "isDefault": "boolean — default false (limpia otros defaults si true)"
}
```

### GET /api/v1/warehouses

**Query**: `includeInactive=true`, `tenantId=...` (cross-tenant si misma familia)
**Sorted by**: `isDefault desc` (default primero)

---

## Endpoints — Bin Locations

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/bin-locations` | Crear ubicación |
| GET | `/api/v1/bin-locations` | Listar por almacén |
| GET | `/api/v1/bin-locations/:id` | Detalle |
| PATCH | `/api/v1/bin-locations/:id` | Actualizar |
| DELETE | `/api/v1/bin-locations/:id` | Soft delete |

### POST /api/v1/bin-locations

**Request:**
```json
{
  "warehouseId": "MongoId — requerido",
  "code": "string — requerido (único por almacén)",
  "zone": "string — opcional",
  "aisle": "string — opcional",
  "shelf": "string — opcional",
  "bin": "string — opcional",
  "description": "string — opcional",
  "locationType": "picking|bulk|receiving|shipping|quarantine — default picking",
  "maxCapacity": "number — opcional",
  "isActive": "boolean — default true"
}
```

---

## Schema Resumido — TransferOrder

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,               // Tenant de origen
  destinationTenantId?: ObjectId,   // Cross-tenant
  orderNumber: string,              // Secuencial por tenant
  type: "push" | "pull",
  status: "DRAFT" | "PUSH_REQUESTED" | "PUSH_APPROVED" | "PULL_REQUESTED" | "PULL_APPROVED" | "PULL_REJECTED" | "IN_PREPARATION" | "IN_TRANSIT" | "RECEIVED" | "PARTIALLY_RECEIVED" | "CANCELLED",
  sourceWarehouseId: ObjectId,
  destinationWarehouseId: ObjectId,
  items: [{
    productId: ObjectId,
    productSku?: string,
    requestedQuantity: number,
    approvedQuantity?: number,
    shippedQuantity?: number,
    receivedQuantity?: number,
    selectedUnit?: string,          // "kg", "cajas"
    conversionFactor?: number,      // ⚠️ puede ser undefined en órdenes antiguas
    unitOfMeasure?: string
  }],
  hasDiscrepancies?: boolean,
  discrepancies?: [{ productId, expectedQuantity, receivedQuantity, reason }],
  trackingNumber?: string,
  carrier?: string,
  isDeleted: boolean,
  createdAt: Date
}
```

---

## Errores Comunes

| Status | Mensaje | Causa |
|---|---|---|
| 404 | "No existe inventario del producto X en el almacén origen" | ProductId tipo mixto o inventario sin warehouseId |
| 400 | "Stock insuficiente" | availableQuantity < cantidad a despachar |
| 400 | "Cannot transition from X to Y" | Transición de estado no válida |
| 400 | "Only source tenant can dispatch" | Tenant destino intentando despachar |
| 400 | "Only destination tenant can receive" | Tenant origen intentando recibir |
| 400 | "Received quantity exceeds shipped" | receivedQty > shippedQty |
| 400 | "Cross-tenant requires same organization" | Tenants no son de la misma familia |

---

*Última actualización: 2026-04-28*
*Archivos fuente: `transfer-orders.controller.ts`, `transfer-orders.service.ts`, `warehouses.controller.ts`, `warehouses.service.ts`, `bin-locations.service.ts`*
