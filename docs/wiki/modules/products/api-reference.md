# Productos — Referencia API

> Diseñado para ser consumido por agentes de IA.
> Última actualización: 2026-04-28

---

## Metadata

- **Módulo backend**: `src/modules/products/`
- **Controllers**: `products.controller.ts`, `products-public.controller.ts`
- **Servicio**: `products.service.ts`
- **Schema MongoDB**: `schemas/product.schema.ts`
- **Permisos**: `products_create`, `products_read`, `products_update`, `products_delete`
- **Guard stack**: JwtAuthGuard → TenantGuard → PermissionsGuard (autenticados), ninguno (públicos)

---

## Endpoints Autenticados

### POST /api/v1/products
- **Descripción**: Crear un producto nuevo
- **Autenticación**: Bearer Token (JWT)
- **Headers**: `Authorization`, `x-tenant-id`
- **Permisos**: `products_create`

**Request:**
```json
{
  "name": "string — requerido",
  "brand": "string — requerido",
  "category": ["string"] ,
  "subcategory": ["string"],
  "productType": "simple | consumable | supply | raw_material — default: simple",
  "sku": "string — opcional, auto-generado si vacío",
  "unitOfMeasure": "string — default: unidad",
  "isPerishable": "boolean — requerido",
  "taxCategory": "string — requerido",
  "ivaApplicable": "boolean — default: true",
  "ivaRate": "0 | 8 | 16 — default: 0",
  "variants": [{
    "name": "string — requerido",
    "unit": "string — requerido",
    "unitSize": "number — requerido, min: 0.01",
    "costPrice": "number — requerido, min: 0",
    "basePrice": "number — min: 0",
    "wholesalePrice": "number — opcional",
    "barcode": "string — opcional, único por tenant",
    "images": ["string (base64)"],
    "pricingStrategy": {
      "mode": "manual | markup | margin",
      "markupPercentage": "number — 0-1000",
      "marginPercentage": "number — 0-99.9",
      "autoCalculate": "boolean",
      "psychologicalRounding": "none | 0.99 | 0.95 | 0.90 | round_up | round_down"
    }
  }],
  "pricingRules": {
    "cashDiscount": "number",
    "cardSurcharge": "number",
    "minimumMargin": "number",
    "maximumDiscount": "number"
  },
  "inventoryConfig": {
    "trackLots": "boolean",
    "trackExpiration": "boolean",
    "minimumStock": "number",
    "maximumStock": "number",
    "reorderPoint": "number",
    "reorderQuantity": "number",
    "fefoEnabled": "boolean"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "sku": "TIE-0042",
    "name": "Harina Pan",
    "variants": [{ "_id": "...", "sku": "TIE-0042", "basePrice": 2.50 }],
    "tenantId": "ObjectId",
    "createdAt": "2026-04-28T..."
  }
}
```

---

### POST /api/v1/products/with-initial-purchase
- **Descripción**: Crear producto + proveedor + orden de compra + recibir mercancía
- **Permisos**: `products_create`

**Request:**
```json
{
  "product": { "...mismo que CreateProductDto..." },
  "supplier": {
    "supplierId": "MongoId — usar si proveedor existe",
    "newSupplierName": "string — para crear nuevo",
    "newSupplierRif": "string — RIF del nuevo proveedor",
    "newSupplierContactName": "string",
    "newSupplierContactPhone": "string — opcional",
    "newSupplierContactEmail": "string — opcional"
  },
  "inventory": {
    "quantity": "number — requerido",
    "costPrice": "number — requerido",
    "lotNumber": "string — opcional",
    "expirationDate": "ISO date — opcional"
  },
  "purchaseDate": "ISO date — requerido",
  "paymentTerms": {
    "isCredit": "boolean",
    "paymentDueDate": "ISO date — si isCredit=true",
    "paymentMethods": ["string"],
    "expectedCurrency": "string"
  }
}
```

---

### POST /api/v1/products/bulk
- **Descripción**: Crear múltiples productos en una transacción
- **Permisos**: `products_create`

**Request:**
```json
{
  "products": [{
    "sku": "string — requerido",
    "name": "string — requerido",
    "category": ["string"],
    "brand": "string",
    "isPerishable": "boolean — requerido",
    "ivaApplicable": "boolean — requerido",
    "variantName": "string — requerido",
    "variantUnit": "string — requerido",
    "variantUnitSize": "number — requerido",
    "variantBasePrice": "number — requerido",
    "variantCostPrice": "number — requerido"
  }]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "15 productos creados exitosamente."
}
```

---

### GET /api/v1/products
- **Descripción**: Listar productos con filtros y paginación
- **Permisos**: `products_read`

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página actual |
| `limit` | number | 20 | Items por página (max: 20000) |
| `search` | string | — | Búsqueda en name, brand, sku, variants |
| `q` | string | — | Alias de search |
| `category` | string | — | Filtro por categoría (regex case-insensitive) |
| `brand` | string | — | Filtro por marca (exacto) |
| `productType` | string | — | simple, consumable, supply, raw_material |
| `isActive` | boolean | true | Filtro por estado activo |
| `includeInactive` | boolean | false | Ignorar filtro isActive |
| `supplierId` | MongoId | — | Filtro por proveedor |
| `ids` | string | — | IDs separados por coma |
| `sortBy` | string | createdAt | name, category, createdAt, updatedAt, sku, brand, price, cost |
| `sortOrder` | string | desc | asc, desc |

**Response (200):**
```json
{
  "success": true,
  "data": [{ "_id": "...", "sku": "...", "name": "...", "variants": [...] }],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

### GET /api/v1/products/:id
- **Descripción**: Obtener producto completo por ID
- **Permisos**: `products_read`

---

### GET /api/v1/products/lookup/barcode/:barcode
- **Descripción**: Buscar producto por código de barras
- **Permisos**: `products_read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": { "_id": "...", "name": "...", "sku": "..." },
    "variant": { "_id": "...", "sku": "...", "barcode": "7501234567890", "basePrice": 2.50 }
  }
}
```

---

### PATCH /api/v1/products/:id
- **Descripción**: Actualizar producto (parcial)
- **Permisos**: `products_update`
- **Side effects**: Cascada a PriceHistory, PriceLists, Inventory (si SKU cambia)

---

### DELETE /api/v1/products/:id
- **Descripción**: Eliminar producto (hard delete)
- **Permisos**: `products_delete`
- **Side effects**: Decrementa tenant usage

---

### POST /api/v1/products/:id/suppliers
- **Descripción**: Vincular proveedor al producto
- **Permisos**: `products_update`

**Request:**
```json
{
  "supplierId": "MongoId — requerido",
  "supplierSku": "string — requerido",
  "costPrice": "number — requerido, min: 0",
  "leadTimeDays": "number — default: 1",
  "minimumOrderQuantity": "number — default: 1",
  "isPreferred": "boolean — default: false"
}
```

---

### POST /api/v1/products/scan-label
- **Descripción**: Escanear etiqueta con IA (GPT-4o-mini)
- **Permisos**: `products_create`
- **Content-Type**: `multipart/form-data`
- **Campo**: `images` (1-3 archivos, max 5MB c/u, JPEG/PNG/WebP/HEIC)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "name": "Harina Pan",
    "brand": "Polar",
    "ingredients": "Maíz blanco precocido...",
    "allergens": ["gluten"],
    "isPerishable": false,
    "storageTemperature": "ambiente",
    "category": "Alimentos",
    "matchedCategory": "Alimentos",
    "overallConfidence": 0.92
  },
  "message": "Datos extraídos con 92% de confianza"
}
```

---

### GET /api/v1/products/:id/price-history
- **Descripción**: Historial de cambios de precio
- **Permisos**: `products:read`

---

### GET /api/v1/products/:id/variant/:variantSku/price
- **Descripción**: Precio final con descuentos por ubicación/volumen
- **Permisos**: `products:read`
- **Query**: `locationId`, `quantity`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "productId": "ObjectId",
    "variantSku": "TIE-0042",
    "basePrice": 10.00,
    "finalPrice": 8.50,
    "priceSource": "volume_discount",
    "quantity": 100
  }
}
```

---

## Endpoints Públicos (Sin Autenticación)

### GET /api/v1/public/products
- **Descripción**: Productos para storefront público
- **Query**: `tenantId` (requerido), `category`, `search`, `page`, `limit`
- **Filtros automáticos**: solo `productType=SIMPLE`, solo con `stock ≥ 1`, excluye consumibles

### GET /api/v1/public/products/:id
- **Descripción**: Detalle de producto público
- **Query**: `tenantId` (requerido)

### GET /api/v1/public/products/categories/list
- **Descripción**: Categorías para storefront
- **Query**: `tenantId` (requerido)

---

## Schema de Datos (Resumen para Agentes)

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,           // Aislamiento multi-tenant — SIEMPRE presente
  sku: string,                  // Único por tenant. Patrón: "{PREFIX}-{NNNN}"
  name: string,
  brand: string,
  productType: "simple" | "consumable" | "supply" | "raw_material",
  category: string[],           // Array — primer elemento = categoría principal
  subcategory: string[],
  variants: [{                  // Mínimo 1. Variante 0 = principal
    _id: ObjectId,
    sku: string,                // Variante 0 = product.sku, demás = "{sku}-VAR{N}"
    barcode?: string,           // Único por tenant (parcial, solo no-vacíos)
    unit: string,
    unitSize: number,
    basePrice: number,          // Precio de venta
    costPrice: number,          // Precio de costo
    wholesalePrice?: number,
    images?: string[],          // Base64
    pricingStrategy?: { mode, markupPercentage, marginPercentage, autoCalculate, psychologicalRounding },
    locationPricing?: [{ locationId, customPrice }],
    volumeDiscounts?: [{ minQuantity, discountPercentage?, fixedPrice? }]
  }],
  suppliers?: [{                // Proveedores vinculados
    supplierId: ObjectId,       // → customers collection (customerType=supplier)
    supplierName: string,
    costPrice: number,
    isPreferred: boolean
  }],
  sellingUnits?: [{             // Unidades de venta alternativas
    name: string,
    abbreviation: string,
    conversionFactor: number,   // Factor a unidad base
    pricePerUnit: number,
    costPerUnit: number
  }],
  unitOfMeasure: string,        // Unidad base de inventario
  ivaRate: 0 | 8 | 16,
  isActive: boolean,            // Soft delete
  createdBy?: ObjectId,         // → users
  createdAt: Date,
  updatedAt: Date
}
```

---

## Dependencias con Otros Módulos

| Módulo | Tipo de relación | Descripción |
|---|---|---|
| **Inventory** | Bidireccional | Productos ↔ stock. Inventory.productId → Product._id |
| **Purchases** | Bidireccional | Productos en órdenes de compra. createWithInitialPurchase() crea PO |
| **Orders** | Lee datos | Órdenes referencian productId en items[] |
| **Suppliers** | Escribe datos | addSupplier() llama ensureSupplierProfile() |
| **Customers** | Escribe datos | createWithInitialPurchase() crea/resuelve Customer |
| **PriceHistory** | Escribe datos | update() registra cambios de precio |
| **PriceLists** | Escribe datos | update() sincroniza customPrices |
| **OpenAI** | Lee datos | scanProductLabel() usa GPT-4o-mini |
| **BOM** | Lee datos | BillOfMaterials referencia productos como componentes |
| **TransferOrders** | Lee datos | Items de transferencia referencian productId |
| **Promotions/Coupons** | Lee datos | applicableProducts[] referencia Product._id |

---

## Errores Comunes

| Status | Mensaje | Causa |
|---|---|---|
| 400 | "Has alcanzado el límite de productos de tu plan" | `tenant.usage.currentProducts >= tenant.limits.maxProducts` |
| 400 | "Has alcanzado el límite de almacenamiento" | Imágenes exceden storage limit |
| 400 | "Ya existe un producto con el SKU..." | SKU duplicado en el tenant |
| 400 | "El código de barras X ya está asignado al producto Y" | Barcode duplicado |
| 400 | "Invalid pricing strategy" | Configuración de markup/margin inválida |
| 401 | "Unauthorized" | Token JWT inválido o expirado |
| 403 | "Forbidden" | Usuario sin permiso products_* |
| 404 | "Product not found" | ID no existe o no pertenece al tenant |

---

*Última actualización: 2026-04-28*
*Archivos fuente: `products.controller.ts`, `products-public.controller.ts`, `products.service.ts`, `schemas/product.schema.ts`, `dto/*.dto.ts`*
