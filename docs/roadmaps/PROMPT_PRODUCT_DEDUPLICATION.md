# PROMPT: Product Deduplication & Merge Tool — SmartKubik ERP

Eres el lead architect de SmartKubik, un ERP SaaS multi-tenant. Vas a implementar la funcionalidad de **Depuración y Fusión de Productos Duplicados**, una herramienta que permite a un tenant detectar productos duplicados en su catálogo, revisarlos lado a lado, y fusionarlos preservando la mayor cantidad de datos posible, reasignando automáticamente todas las relaciones (inventario, movimientos, órdenes, compras, etc.) al producto maestro.

---

## CONTEXTO DEL NEGOCIO

Muchos tenants (especialmente negocios pequeños que nunca usaron software antes) migran o cargan sus productos de forma desordenada, resultando en:

- **Duplicados por nombre**: "Coca Cola 600ml", "COCA-COLA 600 ML", "coca cola .6L" → son el mismo producto
- **Duplicados parciales**: Producto A tiene nombre + barcode pero no precio. Producto B tiene nombre + precio pero no barcode. Ambos son el mismo producto.
- **Duplicados por SKU similar**: "PROD-001" y "PROD-0001", o "CC600" y "CC-600"
- **Productos huérfanos**: Productos con solo nombre, sin variantes, sin precios, sin inventario — probablemente duplicados mal cargados
- **Variantes inconsistentes**: El mismo producto tiene variantes distribuidas en 2 o 3 registros de producto separados

El tenant necesita:

- **Detección automática** de posibles duplicados agrupados por clusters con score de confianza
- **Revisión guiada**: Vista lado a lado de los duplicados con diferencias resaltadas
- **Selección de maestro**: Elegir cuál producto será el maestro (preferir el más completo)
- **Merge inteligente**: Para cada campo, tomar el dato más completo. En caso de conflicto, el usuario elige.
- **Reasignación de relaciones**: Todo lo vinculado a los duplicados se reasigna al maestro (inventario, movimientos, órdenes, POs, listas de precio, etc.)
- **Soft delete de duplicados**: Los productos absorbidos se marcan como `isActive: false` con referencia al maestro
- **Auditoría**: Log completo de qué se fusionó, cuándo, y por quién
- **Reversibilidad**: Posibilidad de deshacer un merge dentro de un período de gracia (7 días)

**Regla fundamental**: Esta herramienta NUNCA elimina datos. Siempre preserva, fusiona, y reasigna. Los duplicados absorbidos se desactivan pero no se borran.

---

## ARQUITECTURA EXISTENTE

### Tech Stack
- **Backend**: NestJS + MongoDB (Mongoose) — ubicado en `FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/`
- **Frontend Admin**: React 18 + Vite + React Router v7 — ubicado en `FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/`
- **Styling**: Tailwind CSS v4 + Shadcn/Radix + MUI + Framer Motion
- **Auth**: JWT con guards (JwtAuthGuard → TenantGuard → PermissionsGuard)
- **State Management**: Context API + custom hooks
- **API Client**: `src/lib/api.js` con `fetchApi()` wrapper sobre fetch nativo
- **Forms**: React Hook Form + Zod validation
- **Data Import**: Módulo existente en `modules/data-import/` con handlers por entidad y queue processing (BullMQ)

### Patrones del Backend (SEGUIR EXACTAMENTE)

**Estructura de módulos:**
```
modules/[resource]/
├── [resource].module.ts        # NestJS module definition
├── [resource].service.ts       # Business logic
├── [resource].controller.ts    # Route handlers
└── dto/                        # Module-specific DTOs
```

**Schemas** van en: `src/schemas/[resource].schema.ts`
**DTOs globales** van en: `src/dto/[resource].dto.ts`

**Convenciones de naming:**
- Archivos: kebab-case (`product-dedup.service.ts`)
- Clases: PascalCase (`ProductDedupService`)
- Propiedades/métodos: camelCase (`findDuplicates`, `tenantId`)
- DTOs: `Create[Resource]Dto`, `Update[Resource]Dto`, `[Resource]FilterDto`

**Guard stack en controllers:**
```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
```

**Patrón de servicio:**
- Inyectar modelos con `@InjectModel()`
- SIEMPRE filtrar por `tenantId` (aislamiento multi-tenant)
- SIEMPRE filtrar por `isActive: true` o `isDeleted: false` según el schema
- Usar `.lean()` para queries de lectura
- Validar entidades relacionadas antes de operar
- Retornar documentos tipados

**Patrón de schemas:**
- SIEMPRE incluir: `tenantId` (ObjectId, ref: 'Tenant', required), `isDeleted` (Boolean, default: false), `createdBy` y `updatedBy` (ObjectId, ref: 'User')
- SIEMPRE usar `@Schema({ timestamps: true })`
- Índices compuestos incluyen `tenantId` como primer campo
- Usar `partialFilterExpression` en indexes cuando sea necesario

**DTO validation decorators:**
- `@IsMongoId()` para ObjectIds
- `@IsNotEmpty()` para campos requeridos
- `@IsOptional()` para campos opcionales
- `@IsEnum()` para enums
- `@ValidateNested()` + `@Type()` para objetos anidados

### Patrones del Frontend (SEGUIR EXACTAMENTE)

**Estructura:**
```
src/
├── components/[feature]/    # Componentes por feature
├── pages/                   # Páginas ruteables
├── hooks/                   # Custom hooks
├── context/                 # Context providers
├── lib/api.js               # TODAS las llamadas API van aquí
├── config/                  # Feature flags, configuración
└── types/                   # TypeScript types
```

**API calls:** Todas las funciones API se definen en `src/lib/api.js` usando el patrón:
```javascript
export const scanDuplicates = (params) => {
  return fetchApi('/product-dedup/scan', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};
export const getDuplicateGroups = (params) => fetchApi(`/product-dedup/groups?${new URLSearchParams(params)}`);
```

**Routing:** Definido en `App.jsx` dentro de `<Routes>`. Las rutas protegidas usan `<ProtectedRoute>`.

**Navegación:** Los links del sidebar están en `TenantLayout` dentro de `App.jsx`, array `navLinks` con estructura:
```javascript
{ name: 'Nombre', href: 'ruta', icon: LucideIcon, permission: 'permiso_read', requiresModule: 'FLAG' }
```

**Componentes UI:** Usar los componentes de `@/components/ui/` (Shadcn). Para tablas, tabs, formularios, seguir los patrones existentes.

**Tabs pattern:** Usar query params para tabs (`?tab=dedup`), no sub-rutas separadas.

---

## SCHEMAS EXISTENTES RELEVANTES (YA IMPLEMENTADOS — NO MODIFICAR ESTRUCTURA)

### Product (`schemas/product.schema.ts`)
- Vive a nivel `tenantId` (NO tiene locationId)
- Campos clave para matching: `sku`, `name`, `brand`, `variants[].barcode`, `variants[].sku`, `variants[].name`, `variants[].unitSize`
- Variantes con `locationPricing[]` (precios por ubicación)
- Incluye: sku, name, category, subcategory, brand, unitOfMeasure, productType, variants, sellingUnits, suppliers, pricingRules, inventoryConfig, tags, description, ingredients, allergens, nutritionalInfo
- `isActive: boolean` — campo usado para desactivar (NO hay `isDeleted` en Product, se usa `isActive: false`)
- Índices existentes:
  - `{ sku: 1, tenantId: 1 }` unique
  - `{ name: "text", description: "text", tags: "text" }` text index
  - `{ brand: 1, tenantId: 1 }`
  - `{ "variants.barcode": 1, tenantId: 1 }` unique partial (barcode not empty)
  - `{ "variants.sku": 1, tenantId: 1 }`
  - `{ tenantId: 1, isActive: 1, createdAt: -1 }`
- Data import tracking: `importJobId`, `importedAt`

### Inventory (`schemas/inventory.schema.ts`)
- Vinculado por `productId` + opcionalmente `warehouseId`, `binLocationId`, `variantId`
- Campos denormalizados: `productSku`, `productName`, `variantSku`
- Cantidades: `totalQuantity`, `availableQuantity`, `reservedQuantity`, `committedQuantity`
- Costos: `averageCostPrice`, `lastCostPrice`
- Lotes: `lots[]` con lotNumber, quantity, expirationDate, etc.
- Data import tracking: `importJobId`, `importedAt`

### InventoryMovement (`schemas/inventory.schema.ts`)
- Vinculado por `inventoryId`, `productId`, `productSku`
- Campos: movementType, quantity, unitCost, totalCost, reason, reference, orderId, supplierId
- Transfer fields: transferId, sourceWarehouseId, destinationWarehouseId, linkedMovementId
- Bin location fields: binLocationId, sourceBinLocationId, destinationBinLocationId

### Order (`schemas/order.schema.ts`)
- Items vinculados por `items[].productId`, `items[].productSku`, `items[].productName`
- Cada item también puede tener: `variantId`, `variantSku`, `attributes`
- Items tienen: quantity, unitPrice, costPrice, totalPrice, ivaAmount, igtfAmount, finalPrice

### PurchaseOrder (`schemas/purchase-order.schema.ts`)
- Items vinculados por `items[].productId`, `items[].productName`, `items[].productSku`
- Cada item puede tener: `variantId`, `variantName`, `variantSku`

### PriceList / ProductPriceList (`schemas/price-list.schema.ts`, `schemas/product-price-list.schema.ts`)
- ProductPriceList vincula un producto a una lista de precios

### BillOfMaterials (`schemas/bill-of-materials.schema.ts`)
- Referencia a `productId` del producto terminado y items con `productId` de materias primas

### ProductCampaign (`schemas/product-campaign.schema.ts`)
- Referencia a productos por campaña de marketing

### ProductConsumableConfig / ProductSupplyConfig
- Configuraciones especiales por producto

### TransferOrder (`schemas/transfer-order.schema.ts`)
- Items con `productId`, `productSku`, `productName`, `variantId`

---

## LO QUE HAY QUE CONSTRUIR

### FASE 1: Backend — Schema MergeJob + Algoritmo de Detección

#### 1.1 Crear schema `MergeJob` (`schemas/merge-job.schema.ts`)

Este schema trackea cada operación de merge (auditoría + reversibilidad).

```
MergeJob {
  jobNumber: string (auto-generated, unique per tenant)  // "MRG-0001"
  status: enum ['pending_review', 'approved', 'executing', 'completed', 'failed', 'reversed'] (default: 'pending_review')

  masterProductId: ObjectId ref 'Product' (required)
  masterProductSku: string
  masterProductName: string

  duplicateProductIds: [ObjectId ref 'Product'] (required, min 1)

  // Snapshot de lo que se fusionó (para reversibilidad)
  mergeDetails: {
    fieldsFromMaster: [string]        // Campos que se mantuvieron del maestro
    fieldsFromDuplicates: [{          // Campos que se tomaron de duplicados
      field: string
      sourceProductId: ObjectId
      value: any
    }]
    conflictsResolved: [{             // Conflictos resueltos por el usuario
      field: string
      options: [{ productId: ObjectId, value: any }]
      chosenProductId: ObjectId
      chosenValue: any
    }]
  }

  // Reasignaciones realizadas
  reassignments: {
    inventoryRecords: number          // Cuántos Inventory docs se reasignaron
    inventoryMovements: number        // Cuántos InventoryMovement docs se reasignaron
    orderItems: number                // Cuántos OrderItem embeds se actualizaron
    purchaseOrderItems: number        // Cuántos PurchaseOrderItem embeds se actualizaron
    transferOrderItems: number        // Cuántos TransferOrderItem embeds se actualizaron
    priceListEntries: number          // Cuántos ProductPriceList docs se reasignaron
    billOfMaterials: number           // Cuántos BOM docs/items se reasignaron
    campaigns: number                 // Cuántos ProductCampaign docs se reasignaron
    otherReferences: number           // Otras referencias actualizadas
  }

  // Snapshots completos de productos duplicados (para revertir)
  duplicateSnapshots: [Object]        // Array de documentos completos de los duplicados antes del merge

  // Metadata
  approvedBy: ObjectId ref 'User'
  approvedAt: Date
  executedBy: ObjectId ref 'User'
  executedAt: Date
  reversedBy: ObjectId ref 'User'
  reversedAt: Date
  reversalReason: string
  errorMessage: string
  notes: string

  // Reversibilidad
  canReverse: boolean (default: true) // Se pone en false después de 7 días o si hay nuevas transacciones
  reverseDeadline: Date               // Fecha límite para revertir (executedAt + 7 días)

  // Standard fields
  isDeleted: boolean (default: false)
  tenantId: ObjectId ref 'Tenant' (required)
  createdBy: ObjectId ref 'User'
  updatedBy: ObjectId ref 'User'
  timestamps: true
}

Indexes:
- { tenantId: 1, jobNumber: 1 } unique
- { tenantId: 1, status: 1 }
- { tenantId: 1, masterProductId: 1 }
- { tenantId: 1, createdAt: -1 }
- { "duplicateProductIds": 1, tenantId: 1 }
```

#### 1.2 Crear schema `DuplicateGroup` (`schemas/duplicate-group.schema.ts`)

Resultado de un scan de duplicados. Se almacena temporalmente para que el usuario revise.

```
DuplicateGroup {
  scanId: string (UUID, agrupa todos los grupos de un mismo scan)
  status: enum ['pending', 'reviewed', 'merged', 'dismissed'] (default: 'pending')

  confidenceScore: number (0-100)     // Qué tan seguros estamos de que son duplicados
  matchType: enum ['barcode_exact', 'sku_exact', 'name_fuzzy', 'name_brand_size', 'composite'] (required)
  matchDetails: string                // Descripción legible: "Barcode match: 7501234567890"

  productIds: [ObjectId ref 'Product'] (required, min 2)

  // Pre-cálculo para la UI
  suggestedMasterId: ObjectId ref 'Product'  // El producto más completo
  completenessScores: [{               // Score de completitud por producto
    productId: ObjectId
    score: number (0-100)
    missingFields: [string]
  }]

  // Resumen para mostrar en lista
  productSummaries: [{
    productId: ObjectId
    sku: string
    name: string
    brand: string
    variantCount: number
    hasPrice: boolean
    hasCost: boolean
    hasBarcode: boolean
    hasInventory: boolean
    totalStock: number
    orderCount: number                 // En cuántas órdenes aparece
  }]

  // Standard fields
  isDeleted: boolean (default: false)
  tenantId: ObjectId ref 'Tenant' (required)
  createdBy: ObjectId ref 'User'
  timestamps: true
}

Indexes:
- { tenantId: 1, scanId: 1 }
- { tenantId: 1, status: 1, confidenceScore: -1 }
- { "productIds": 1, tenantId: 1 }
- { tenantId: 1, createdAt: -1 }
```

#### 1.3 Algoritmo de Detección de Duplicados

El servicio de detección debe ejecutar las siguientes estrategias en orden de confianza (de mayor a menor):

**Nivel 1 — Barcode Exact Match (confianza 95-100)**
```
Buscar productos donde variants[].barcode sea idéntico entre 2+ productos del mismo tenant.
Si el barcode coincide exactamente → confianza 98.
```

**Nivel 2 — SKU Exact/Near Match (confianza 85-95)**
```
Normalizar SKU: uppercase, quitar guiones, quitar ceros a la izquierda.
Si SKU normalizado coincide → confianza 90.
Ejemplo: "PROD-001" y "PROD-0001" → normalizados a "PROD1" → match.
```

**Nivel 3 — Name + Brand + Size Match (confianza 70-90)**
```
Normalización previa:
1. Lowercase
2. Quitar acentos (á→a, é→e, etc.)
3. Normalizar unidades: ml/ML/mililitros → ml, kg/KG/kilos/kilogramos → kg,
   g/gr/gramos → g, l/L/lt/litros → l, oz/onzas → oz, lb/libras → lb
4. Quitar caracteres especiales excepto números
5. Normalizar espacios múltiples a uno

Comparación:
- Calcular similitud de Levenshtein entre nombres normalizados
- Si similitud >= 85% Y (brand idéntico O brand vacío en alguno) → confianza = similitud * 0.9
- Bonus de confianza si el tamaño (extraído del nombre o de variant.unitSize) coincide
```

**Nivel 4 — Fuzzy Name Only (confianza 50-70)**
```
Para productos sin brand ni barcode:
- Similitud de Levenshtein >= 80% en nombre normalizado
- Confianza = similitud * 0.7
Estos requieren revisión manual obligatoria.
```

**Post-procesamiento:**
- Agrupar matches en clusters transitivos (si A=B y B=C → cluster {A,B,C})
- Para cada cluster, calcular `completenessScore` por producto:
  - +15 si tiene nombre
  - +10 si tiene brand
  - +10 si tiene categoría
  - +15 si tiene al menos 1 variante con precio > 0
  - +15 si tiene al menos 1 variante con costo > 0
  - +10 si tiene al menos 1 variante con barcode
  - +10 si tiene inventario con stock > 0
  - +5 si tiene descripción
  - +5 si tiene proveedores configurados
  - +5 si tiene tags
- El producto con mayor `completenessScore` se sugiere como maestro

### FASE 2: Backend — Módulo Product Dedup

#### 2.1 Crear módulo `product-dedup/`

```
modules/product-dedup/
├── product-dedup.module.ts
├── product-dedup.service.ts
├── product-dedup.controller.ts
├── dedup-engine.service.ts           # Algoritmo de detección (separado para testabilidad)
├── merge-executor.service.ts         # Lógica de fusión y reasignación
├── dto/
│   ├── scan-duplicates.dto.ts
│   ├── merge-products.dto.ts
│   ├── review-group.dto.ts
│   └── dedup-filter.dto.ts
└── utils/
    └── text-normalizer.util.ts       # Funciones de normalización de texto
```

**Endpoints:**

**Scan & Detection:**
- `POST /product-dedup/scan` — Ejecutar un nuevo scan de duplicados. Parámetros opcionales: `strategies` (array de niveles a ejecutar), `minConfidence` (score mínimo para incluir, default 50). Retorna `scanId`. El scan puede ser asíncrono para catálogos grandes (>500 productos).
- `GET /product-dedup/scans` — Listar scans anteriores con resumen (fecha, total grupos encontrados, status)
- `GET /product-dedup/groups?scanId=xxx` — Listar grupos de duplicados de un scan, paginados, ordenados por confianza descendente. Filtros: status, minConfidence, matchType.
- `GET /product-dedup/groups/:id` — Detalle de un grupo con productos completos populados (para vista lado a lado)

**Review & Merge:**
- `PATCH /product-dedup/groups/:id/dismiss` — Descartar un grupo (marcar como "no son duplicados"). Agrega `dismissedProductPairs` para no volver a sugerirlos.
- `POST /product-dedup/groups/:id/merge` — Ejecutar merge de un grupo. Body:
  ```
  {
    masterProductId: ObjectId,
    fieldResolutions: [{                // Solo los campos con conflicto
      field: string,
      sourceProductId: ObjectId         // De cuál producto tomar el valor
    }],
    variantMergeStrategy: 'combine' | 'keep_master',  // Qué hacer con variantes
    notes: string (opcional)
  }
  ```
  Este endpoint:
  1. Crea un MergeJob en status 'executing'
  2. Ejecuta el merge (ver Fase 3)
  3. Actualiza MergeJob a 'completed' o 'failed'
  4. Retorna el MergeJob con detalles

- `POST /product-dedup/bulk-merge` — Merge automático de todos los grupos con confianza >= threshold (ej: 95). Solo para barcode_exact y sku_exact. Requiere permiso especial `products_dedup_admin`.

**History & Reversal:**
- `GET /product-dedup/merge-jobs` — Listar merge jobs (historial de fusiones). Filtros: status, dateRange, paginación.
- `GET /product-dedup/merge-jobs/:id` — Detalle de un merge job con snapshots completos
- `POST /product-dedup/merge-jobs/:id/reverse` — Revertir un merge (solo si `canReverse: true` y dentro del período de gracia). Body: `{ reason: string }`.

**Stats:**
- `GET /product-dedup/stats` — Estadísticas del catálogo: total productos, estimación de duplicados, productos incompletos (sin precio, sin barcode, etc.)

**Permisos**: `products_dedup_read`, `products_dedup_write`, `products_dedup_admin`

### FASE 3: Backend — Lógica de Merge (CRÍTICO)

El `merge-executor.service.ts` ejecuta la fusión en una transacción MongoDB (session). Si algo falla, todo se revierte.

#### 3.1 Flujo de Merge

```
1. VALIDAR
   - Verificar que todos los productos existen y pertenecen al tenant
   - Verificar que ninguno está actualmente en otro merge pendiente
   - Verificar que el masterProductId está en la lista de productIds del grupo

2. SNAPSHOT
   - Guardar copia completa de TODOS los productos duplicados en mergeJob.duplicateSnapshots
   - Esto permite revertir el merge exactamente

3. FUSIONAR CAMPOS DEL PRODUCTO MAESTRO
   Para cada campo del Product schema, aplicar esta lógica:

   a) Campos simples (name, brand, description, etc.):
      - Si el maestro tiene valor → mantener
      - Si el maestro NO tiene valor → tomar del duplicado que lo tenga (priorizar por completenessScore)
      - Si hay conflicto (maestro y duplicado tienen valores diferentes) → usar fieldResolutions del usuario

   b) Campos array (tags, allergens, category, subcategory):
      - Unión de todos los valores únicos de todos los productos

   c) Variantes (variants[]):
      - Si variantMergeStrategy === 'combine':
        - Combinar variantes de todos los productos
        - Si dos variantes tienen el mismo barcode → fusionarlas (mantener datos del maestro, llenar huecos del duplicado)
        - Si dos variantes tienen el mismo SKU → fusionarlas
        - Si son variantes diferentes → agregarlas todas al maestro
        - Resolver colisiones de SKU agregando sufijo (-2, -3, etc.)
      - Si variantMergeStrategy === 'keep_master':
        - Solo mantener las variantes del maestro

   d) Suppliers (suppliers[]):
      - Combinar proveedores de todos los productos
      - Si el mismo supplierId aparece en 2+ productos, mantener el que tenga más datos

   e) inventoryConfig, pricingRules:
      - Mantener del maestro si existe, sino del duplicado más completo

   f) sellingUnits:
      - Combinar unidades únicas (por abbreviation)

4. REASIGNAR RELACIONES
   Para cada producto duplicado D que será absorbido:

   a) Inventory:
      - Buscar todos los Inventory docs donde productId === D._id
      - Para cada uno:
        - Si ya existe un Inventory del maestro en el mismo warehouse+variant → SUMAR cantidades
        - Si no existe → cambiar productId al maestro, actualizar productSku y productName
      - Trackear cuántos se reasignaron

   b) InventoryMovement:
      - Actualizar todos los InventoryMovement donde productId === D._id
      - Cambiar productId al maestro, actualizar productSku
      - Trackear cuántos se reasignaron

   c) Order (embedded items):
      - Buscar Orders con items[].productId === D._id
      - Actualizar productId, productSku, productName en esos items
      - NO recalcular precios ni totales (son históricos)
      - Trackear cuántos order items se actualizaron

   d) PurchaseOrder (embedded items):
      - Mismo patrón que Orders

   e) TransferOrder (embedded items):
      - Mismo patrón que Orders

   f) ProductPriceList:
      - Reasignar productId al maestro
      - Si ya existe una entry del maestro en la misma priceList → mantener la del maestro, eliminar duplicada

   g) BillOfMaterials:
      - Reasignar productId del producto terminado si es un duplicado
      - Reasignar productId en items[] si algún ingrediente es un duplicado

   h) ProductCampaign, ProductConsumableConfig, ProductSupplyConfig:
      - Reasignar productId al maestro

5. DESACTIVAR DUPLICADOS
   - Para cada producto duplicado:
     - Set isActive = false
     - Agregar campo mergedIntoProductId = masterProductId (campo nuevo opcional)
     - Agregar campo mergedAt = new Date()
     - Agregar campo mergeJobId = mergeJob._id

6. ACTUALIZAR MERGE JOB
   - Actualizar reassignments con conteos
   - Set status = 'completed'
   - Set executedAt = new Date()
   - Set reverseDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
```

#### 3.2 Flujo de Reversión

```
1. VALIDAR
   - mergeJob.canReverse === true
   - mergeJob.status === 'completed'
   - Date.now() < mergeJob.reverseDeadline

2. RESTAURAR DUPLICADOS
   - Para cada snapshot en duplicateSnapshots:
     - Restaurar el producto completo (overwrite con el snapshot)
     - Set isActive = true
     - Quitar mergedIntoProductId, mergedAt, mergeJobId

3. RESTAURAR PRODUCTO MAESTRO
   - Si el maestro fue modificado durante el merge, restaurar desde el snapshot
     (el maestro original también se guarda en snapshots)

4. REVERTIR REASIGNACIONES
   - Inventory: Buscar por mergeJobId tag (o recorrer duplicateProductIds) y restaurar productId original
   - InventoryMovement: Restaurar productId original
   - Orders, PurchaseOrders, TransferOrders: Restaurar productId, productSku, productName en items
   - Otros: Restaurar productId

5. ACTUALIZAR MERGE JOB
   - Set status = 'reversed'
   - Set reversedAt, reversedBy, reversalReason
```

### FASE 4: Backend — Campos Nuevos en Product Schema

Agregar estos campos OPCIONALES al Product schema existente (NO rompe nada):

```typescript
// En product.schema.ts, agregar después de importedAt:

@Prop({ type: Types.ObjectId, ref: 'Product' })
mergedIntoProductId?: Types.ObjectId;    // Si este producto fue absorbido por otro

@Prop({ type: Date })
mergedAt?: Date;

@Prop({ type: Types.ObjectId, ref: 'MergeJob' })
mergeJobId?: Types.ObjectId;
```

Agregar índice:
```typescript
ProductSchema.index({ mergedIntoProductId: 1, tenantId: 1 });
```

### FASE 5: Backend — Permisos y Feature Flag

#### 5.1 Nuevos permisos en `permissions.seed.ts`:

```typescript
// Product Deduplication
{
  name: "products_dedup_read",
  description: "Ver herramienta de depuración de productos",
  module: "products",
},
{
  name: "products_dedup_write",
  description: "Ejecutar fusión de productos duplicados",
  module: "products",
},
{
  name: "products_dedup_admin",
  description: "Ejecutar merge masivo y revertir fusiones",
  module: "products",
},
```

#### 5.2 Feature Flag

No se necesita feature flag nuevo. Esta funcionalidad es una herramienta de mantenimiento que todos los tenants pueden usar. Se controla por permisos.

### FASE 6: Frontend — Página de Depuración de Productos

#### 6.1 Ruta y Navegación

Ruta: `/products?tab=dedup` (nueva tab dentro del módulo de productos existente)

O alternativamente: `/settings/product-cleanup` (dentro de configuración)

**Decisión sugerida**: `/products?tab=dedup` — porque es una herramienta directamente relacionada a productos y debe ser fácilmente accesible.

#### 6.2 Componentes

**Tab de Depuración (DedupTab)**
Flujo wizard de 3 pasos:

**Paso 1: Scan**
- Botón "Escanear Duplicados" con opciones de configuración:
  - Estrategias a usar (checkboxes): Barcode, SKU, Nombre+Marca, Solo nombre
  - Confianza mínima (slider: 50-100, default 60)
- Estadísticas del catálogo antes del scan:
  - Total productos activos
  - Productos sin precio
  - Productos sin barcode
  - Productos sin categoría
- Mientras escanea: progress bar o spinner con mensajes ("Analizando barcodes...", "Comparando nombres...", etc.)
- Resultado: "Se encontraron N grupos de posibles duplicados"

**Paso 2: Revisión de Grupos (DuplicateGroupsList)**
- Lista de grupos de duplicados, ordenados por confianza descendente
- Cada grupo muestra:
  - Badge de confianza (color: rojo >90%, naranja 70-90%, amarillo 50-70%)
  - Badge de tipo de match (Barcode, SKU, Nombre, etc.)
  - Preview de los productos: nombre, SKU, marca, precio del primer variant
  - Botones: "Revisar", "Descartar"
- Filtros: por confianza, por tipo de match, por status
- Opción "Merge automático" para grupos de alta confianza (>95%)

**Paso 3: Vista de Merge (MergeView)**
- Vista lado a lado de los productos del grupo (2-3 columnas máximo)
- Para cada campo, mostrar:
  - El valor de cada producto con color coding:
    - Verde: dato presente y completo
    - Gris: dato vacío/faltante
    - Amarillo: conflicto (valores diferentes)
  - Radio button o toggle para elegir de cuál producto tomar el valor (solo en conflictos)
- Selector de producto maestro (pre-seleccionado el más completo, con badge "Recomendado")
- Sección de variantes:
  - Toggle: "Combinar variantes" / "Solo del maestro"
  - Si combinar: preview de variantes resultantes
- Resumen de lo que se reasignará:
  - "X registros de inventario", "Y movimientos", "Z órdenes afectadas"
- Botón "Fusionar" con confirmación (modal: "¿Estás seguro? Esta acción fusionará N productos en uno.")
- Resultado: Toast de éxito con link al producto resultante

**Historial de Merges (MergeHistoryList)**
- Tabla con: fecha, producto maestro, # duplicados absorbidos, # reasignaciones, status
- Botón "Revertir" (solo si dentro del período de gracia)
- Detalle expandible con todas las reasignaciones

#### 6.3 Componentes UI a crear

```
src/components/product-dedup/
├── DedupTab.jsx                      # Container principal (wizard)
├── ScanConfig.jsx                    # Paso 1: configuración del scan
├── CatalogStats.jsx                  # Estadísticas del catálogo
├── DuplicateGroupsList.jsx           # Paso 2: lista de grupos
├── DuplicateGroupCard.jsx            # Card individual de grupo
├── MergeView.jsx                     # Paso 3: vista de merge
├── FieldComparison.jsx               # Comparación lado a lado de un campo
├── VariantMergePreview.jsx           # Preview de variantes fusionadas
├── MergeConfirmDialog.jsx            # Modal de confirmación
├── MergeHistoryList.jsx              # Historial de fusiones
├── MergeJobDetail.jsx                # Detalle de un merge job
├── ConfidenceBadge.jsx               # Badge visual de confianza
└── MatchTypeBadge.jsx                # Badge de tipo de match
```

### FASE 7: Frontend — API Functions

Agregar a `src/lib/api.js`:

```javascript
// ============ PRODUCT DEDUPLICATION API ============

export const scanDuplicates = (params = {}) => {
  return fetchApi('/product-dedup/scan', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export const getDedupScans = (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParams.append(key, params[key]);
    }
  });
  const queryString = queryParams.toString();
  return fetchApi(`/product-dedup/scans${queryString ? `?${queryString}` : ''}`);
};

export const getDuplicateGroups = (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParams.append(key, params[key]);
    }
  });
  const queryString = queryParams.toString();
  return fetchApi(`/product-dedup/groups${queryString ? `?${queryString}` : ''}`);
};

export const getDuplicateGroup = (id) => {
  return fetchApi(`/product-dedup/groups/${id}`);
};

export const dismissDuplicateGroup = (id) => {
  return fetchApi(`/product-dedup/groups/${id}/dismiss`, {
    method: 'PATCH',
  });
};

export const mergeProducts = (groupId, data) => {
  return fetchApi(`/product-dedup/groups/${groupId}/merge`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const bulkMergeProducts = (data) => {
  return fetchApi('/product-dedup/bulk-merge', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMergeJobs = (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParams.append(key, params[key]);
    }
  });
  const queryString = queryParams.toString();
  return fetchApi(`/product-dedup/merge-jobs${queryString ? `?${queryString}` : ''}`);
};

export const getMergeJob = (id) => {
  return fetchApi(`/product-dedup/merge-jobs/${id}`);
};

export const reverseMergeJob = (id, data) => {
  return fetchApi(`/product-dedup/merge-jobs/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getDedupStats = () => {
  return fetchApi('/product-dedup/stats');
};
```

---

## UTILIDADES DE NORMALIZACIÓN DE TEXTO

### `utils/text-normalizer.util.ts`

```typescript
/**
 * Normaliza texto para comparación de duplicados.
 * Usado tanto en el scan como en la UI para mostrar matches.
 */

// Quitar acentos
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Normalizar unidades de medida
const UNIT_MAP: Record<string, string> = {
  'mililitros': 'ml', 'mililitro': 'ml', 'ml': 'ml',
  'litros': 'l', 'litro': 'l', 'lt': 'l', 'lts': 'l', 'l': 'l',
  'kilogramos': 'kg', 'kilogramo': 'kg', 'kilos': 'kg', 'kilo': 'kg', 'kg': 'kg',
  'gramos': 'g', 'gramo': 'g', 'gr': 'g', 'grs': 'g', 'g': 'g',
  'onzas': 'oz', 'onza': 'oz', 'oz': 'oz',
  'libras': 'lb', 'libra': 'lb', 'lbs': 'lb', 'lb': 'lb',
  'unidades': 'und', 'unidad': 'und', 'uds': 'und', 'und': 'und', 'pza': 'und', 'pzas': 'und',
  'cajas': 'caja', 'caja': 'caja',
  'paquetes': 'paq', 'paquete': 'paq', 'paq': 'paq', 'pack': 'paq',
  'botellas': 'bot', 'botella': 'bot', 'bot': 'bot',
  'latas': 'lata', 'lata': 'lata',
  'sobres': 'sobre', 'sobre': 'sobre',
};

export function normalizeUnits(str: string): string {
  let result = str;
  // Reemplazar unidades (con boundary para no reemplazar parcialmente)
  for (const [from, to] of Object.entries(UNIT_MAP)) {
    const regex = new RegExp(`\\b${from}\\b`, 'gi');
    result = result.replace(regex, to);
  }
  // Normalizar "600 ml" → "600ml", "1.5 l" → "1.5l"
  result = result.replace(/(\d+(?:\.\d+)?)\s*(ml|l|kg|g|oz|lb|und|caja|paq|bot|lata|sobre)\b/gi, '$1$2');
  return result;
}

// Normalizar nombre completo de producto
export function normalizeProductName(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();
  normalized = removeAccents(normalized);
  normalized = normalizeUnits(normalized);
  // Quitar caracteres especiales excepto números y letras
  normalized = normalized.replace(/[^a-z0-9\s.]/g, '');
  // Normalizar espacios múltiples
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

// Normalizar SKU
export function normalizeSku(sku: string): string {
  if (!sku) return '';
  let normalized = sku.toUpperCase().trim();
  // Quitar guiones y puntos
  normalized = normalized.replace(/[-._\s]/g, '');
  // Quitar ceros a la izquierda después de letras (PROD001 → PROD1)
  normalized = normalized.replace(/([A-Z]+)0+(\d+)/g, '$1$2');
  return normalized;
}

// Distancia de Levenshtein
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Similitud (0-100) basada en Levenshtein
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}
```

---

## REGLAS CRÍTICAS

### NUNCA:
- Eliminar (hard delete) un producto — siempre soft delete (`isActive: false`)
- Modificar la estructura de schemas existentes (Product, Inventory, Order, etc.) salvo agregar campos opcionales nuevos
- Ejecutar un merge sin transacción MongoDB (session) — si algo falla, todo se revierte
- Reasignar relaciones sin guardar snapshot primero
- Permitir merge de productos de diferentes tenants
- Ejecutar merge sin que el usuario confirme explícitamente
- Perder datos durante el merge — si hay duda, preservar ambos valores
- Saltarse el guard stack (JwtAuthGuard → TenantGuard → PermissionsGuard)
- Hardcodear IDs, URLs, o secretos
- Crear archivos fuera de la estructura de directorios existente

### SIEMPRE:
- Filtrar por `tenantId` en CADA query
- Usar transacciones (MongoDB sessions) para el merge y la reversión
- Guardar snapshots completos antes de modificar (para reversibilidad)
- Validar DTOs con class-validator
- Seguir los naming conventions exactos del proyecto
- Manejar el caso de productos con variantes (la fusión de variantes es la parte más compleja)
- Registrar el nuevo módulo en `app.module.ts`
- Registrar los nuevos permisos en el seed de permisos
- Agregar las nuevas funciones API en `src/lib/api.js` del frontend
- Proteger el merge con confirmación explícita del usuario en el frontend
- Mostrar un resumen claro de lo que se va a reasignar ANTES de ejecutar

---

## ORDEN DE IMPLEMENTACIÓN

Implementar en este orden estricto, verificando que cada fase funciona antes de pasar a la siguiente:

1. **Fase 1**: Schemas (MergeJob + DuplicateGroup) + Algoritmo de detección + utils de normalización
2. **Fase 2**: Módulo product-dedup con endpoints de scan y grupos
3. **Fase 3**: Lógica de merge (merge-executor) + reversión — con transacciones MongoDB
4. **Fase 4**: Campos opcionales nuevos en Product schema
5. **Fase 5**: Permisos nuevos en seed
6. **Fase 6**: Frontend — componentes de la tab de dedup (scan → grupos → merge → historial)
7. **Fase 7**: Funciones API en api.js del frontend

Cada fase debe dejar el sistema en un estado funcional. Si una fase falla, las anteriores siguen funcionando.

---

## CONSIDERACIONES DE PERFORMANCE

- **Catálogos grandes (>1000 productos)**: El scan puede ser lento. Usar BullMQ queue para procesamiento asíncrono. El endpoint POST /scan retorna un jobId, y el frontend hace polling hasta que termine.
- **Normalización**: Pre-calcular y cachear nombres normalizados durante el scan, no recalcular por cada comparación.
- **Comparación N×N**: Para fuzzy name matching, NO comparar todos contra todos (O(n²)). Usar agrupación previa por primeras 3 letras normalizadas + brand para reducir el espacio de comparación.
- **Transacciones**: El merge de un solo grupo debe ejecutarse en una sola transacción MongoDB. Para bulk merge, cada grupo es una transacción independiente.

---

## ENTREGABLES POR FASE

Al completar cada fase, listar:
- Archivos creados/modificados con ruta completa
- Cambios específicos en archivos existentes
- Cómo verificar que funciona (endpoints a probar, queries a correr)
- Cualquier decisión arquitectónica tomada y por qué
