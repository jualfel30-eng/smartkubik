# PROMPT: Multi-Location Feature for SmartKubik ERP

## ROL

Eres el lead architect de SmartKubik, un ERP SaaS multi-tenant. Vas a implementar la funcionalidad de **multi-ubicación (multi-sede)** que permite a un tenant operar múltiples sedes/sucursales con catálogo de productos compartido, inventario independiente por sede, transferencias entre sedes, y precios con overrides por ubicación.

---

## CONTEXTO DEL NEGOCIO

Un tenant tiene un negocio con múltiples sedes (ej: un almacén central + 2 puntos de venta). Necesita:

- **Catálogo compartido**: Los productos pertenecen al tenant, no a ninguna sede. Cuando se crea un producto, existe en todas las sedes automáticamente.
- **Inventario independiente por sede**: Cada sede tiene su propio stock. Una sede nueva arranca con todos los productos del catálogo pero con stock 0.
- **Transferencias entre sedes**: Mover inventario de una sede a otra NO es una compra ni una venta. Es un documento de negocio propio con flujo de estados: `requested → approved → in_transit → received → partially_received → cancelled`.
- **Precios por ubicación**: Precio base a nivel tenant con overrides opcionales por sede. Si no hay override, se usa el precio base.
- **Empleados por sede**: Cada empleado está asignado a una ubicación. Horarios y turnos son por sede.
- **Reportes globales y por sede**: El dueño puede ver métricas consolidadas o filtradas por sede. Comparativos entre sedes.
- **Permisos por sede**: Un gerente de sede solo ve y opera su sede. El dueño/admin ve todo.

**Regla fundamental**: NO existe una "sede master". El catálogo vive a nivel tenant. Las sedes (incluyendo el almacén central) son simplemente ubicaciones con roles diferentes. Las transferencias son bidireccionales (cualquier sede puede transferir a cualquier otra).

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

### Patrones del Backend (SEGUIR EXACTAMENTE)

**Estructura de módulos:**
```
modules/[resource]/
├── [resource].module.ts        # NestJS module definition
├── [resource].service.ts       # Business logic
├── [resource].controller.ts    # Route handlers
└── dto/                        # Module-specific DTOs (opcional)
```

**Schemas** van en: `src/schemas/[resource].schema.ts`
**DTOs globales** van en: `src/dto/[resource].dto.ts`

**Convenciones de naming:**
- Archivos: kebab-case (`transfer-orders.service.ts`)
- Clases: PascalCase (`TransferOrdersService`)
- Propiedades/métodos: camelCase (`findAll`, `tenantId`)
- DTOs: `Create[Resource]Dto`, `Update[Resource]Dto`, `[Resource]FilterDto`

**Guard stack en controllers:**
```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
```

**Patrón de servicio:**
- Inyectar modelos con `@InjectModel()`
- SIEMPRE filtrar por `tenantId` (aislamiento multi-tenant)
- SIEMPRE filtrar por `isDeleted: false` (soft deletes)
- Usar `.lean()` para queries de lectura
- Validar entidades relacionadas antes de operar
- Retornar documentos tipados

**Patrón de schemas:**
- SIEMPRE incluir: `tenantId` (ObjectId, ref: 'Tenant', required), `isDeleted` (Boolean, default: false), `createdBy` y `updatedBy` (ObjectId, ref: 'User')
- SIEMPRE usar `@Schema({ timestamps: true })`
- Índices compuestos incluyen `tenantId` como primer campo
- Usar `partialFilterExpression: { isDeleted: false }` en unique indexes

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
export const getLocations = () => api.get('/locations');
export const createLocation = (data) => api.post('/locations', data);
export const updateLocation = (id, data) => api.patch(`/locations/${id}`, data);
```

**Routing:** Definido en `App.jsx` dentro de `<Routes>`. Las rutas protegidas usan `<ProtectedRoute>`.

**Navegación:** Los links del sidebar están en `TenantLayout` dentro de `App.jsx`, array `navLinks` con estructura:
```javascript
{ name: 'Nombre', href: 'ruta', icon: LucideIcon, permission: 'permiso_read', requiresModule: 'FLAG' }
```

**Componentes UI:** Usar los componentes de `@/components/ui/` (Shadcn). Para tablas, tabs, formularios, seguir los patrones existentes en `components/inventory/`.

**Tabs pattern:** Usar query params para tabs (`?tab=locations`), no sub-rutas separadas.

---

## SCHEMAS EXISTENTES RELEVANTES (YA IMPLEMENTADOS - NO MODIFICAR ESTRUCTURA)

### Product (`schemas/product.schema.ts`)
- Vive a nivel `tenantId` (NO tiene locationId/warehouseId)
- Variantes con `locationPricing[]` (ya soporta precios por ubicación)
- Incluye: sku, name, category, unitOfMeasure, productType, variants, sellingUnits, suppliers, pricingRules, inventoryConfig

### Warehouse (`schemas/warehouse.schema.ts`)
- Campos: name, code (unique per tenant), location (address/city/state/country/lat/lng), isActive, isDefault, isDeleted
- Índice: `{ tenantId: 1, code: 1 }` unique con `partialFilterExpression: { isDeleted: false }`
- Ya tiene BinLocation como sub-entity

### Inventory (`schemas/inventory.schema.ts`)
- Ya trackea por `productId` + `warehouseId` + `binLocationId`
- Campos de cantidad: totalQuantity, availableQuantity, reservedQuantity, committedQuantity
- Soporta lotes (lots[]), atributos, métricas, alertas
- Costos: averageCostPrice, lastCostPrice

### InventoryMovement (`schemas/inventory.schema.ts`)
- Ya soporta movementType: 'TRANSFER' con:
  - `transferId` (UUID que enlaza movimientos pareados)
  - `sourceWarehouseId`, `destinationWarehouseId`
  - `linkedMovementId` (referencia al movimiento pareado)
  - `sourceBinLocationId`, `destinationBinLocationId`
  - `balanceAfter` (snapshot post-movimiento)

### EmployeeProfile (`schemas/employee-profile.schema.ts`)
- Ya tiene campo `workLocation`
- Campos: employeeNumber, position, department, status, supervisorId, hireDate

### Role & Permission (`schemas/role.schema.ts`, `schemas/permission.schema.ts`)
- Role: name, description, permissions[], tenantId
- Permission: name, description, module, action

### PriceList (`schemas/price-list.schema.ts`)
- Ya tiene `autoApplyRules.locations[]`
- Tipos: standard, wholesale, retail, promotional, seasonal, custom

### DocumentSequence (`schemas/document-sequence.schema.ts`)
- Ya soporta `scope: 'sucursal'` con `locationId`

---

## LO QUE HAY QUE CONSTRUIR

### FASE 0: Preparación y Backup

1. **Script de backup** de la base de datos MongoDB antes de cualquier cambio.
2. **Verificar** que todos los schemas mencionados arriba existen y están como se describe.

### FASE 1: Backend — Schema Location + Migración

#### 1.1 Crear schema `Location` (`schemas/location.schema.ts`)

```
Location {
  name: string (required)                    // "Sede Centro", "Almacén Principal"
  code: string (required, unique per tenant) // "SEDE-001", "ALM-CENTRAL"
  type: enum ['warehouse', 'point_of_sale', 'mixed'] (required)
  address: {
    street: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number, lng: number }
  }
  phone: string (optional)
  email: string (optional)
  manager: ObjectId ref 'User' (optional)    // Responsable de la sede
  warehouseIds: [ObjectId ref 'Warehouse']   // Una location puede tener 1+ warehouses
  isActive: boolean (default: true)
  isDeleted: boolean (default: false)
  tenantId: ObjectId ref 'Tenant' (required)
  createdBy: ObjectId ref 'User'
  updatedBy: ObjectId ref 'User'
  timestamps: true
}

Indexes:
- { tenantId: 1, code: 1 } unique, partialFilter: { isDeleted: false }
- { tenantId: 1, isActive: 1 }
- { tenantId: 1, type: 1 }
```

#### 1.2 Agregar `locationId` al schema Warehouse

Agregar campo opcional `locationId: ObjectId ref 'Location'` al schema Warehouse existente. Esto vincula un warehouse con su location padre. Es un campo nuevo opcional, no rompe nada existente.

#### 1.3 Migración para tenants existentes

Crear script de migración (`database/migrations/`) que:
1. Para cada tenant que tenga warehouses:
   - Cree una Location por defecto (name: "Sede Principal", code: "SEDE-001", type: "mixed")
   - Vincule todos los warehouses existentes del tenant a esa Location
2. Para tenants sin warehouses: no hacer nada (se creará al activar multi-location)

**IMPORTANTE**: La migración debe ser idempotente (segura de correr múltiples veces).

### FASE 2: Backend — Módulo Locations

#### 2.1 Crear módulo `locations/`

```
modules/locations/
├── locations.module.ts
├── locations.service.ts
├── locations.controller.ts
└── dto/
    ├── create-location.dto.ts
    ├── update-location.dto.ts
    └── location-filter.dto.ts
```

**Endpoints:**
- `GET /locations` — Listar locations del tenant (con filtros por type, isActive)
- `GET /locations/:id` — Detalle de location con sus warehouses populados
- `POST /locations` — Crear location (auto-crea un warehouse vinculado si no se especifica)
- `PATCH /locations/:id` — Actualizar location
- `DELETE /locations/:id` — Soft delete (solo si no tiene inventario activo)
- `GET /locations/:id/inventory-summary` — Resumen de inventario de la sede (total productos, valor total, productos con stock bajo)

**Permisos**: `locations_read`, `locations_write`

**Lógica importante:**
- Al crear una Location, automáticamente crear un Warehouse vinculado con el mismo nombre y código
- Validar que el código sea único dentro del tenant
- Al eliminar, verificar que no hay stock activo en los warehouses de esa location

### FASE 3: Backend — Transfer Orders

#### 3.1 Crear schema `TransferOrder` (`schemas/transfer-order.schema.ts`)

```
TransferOrder {
  orderNumber: string (auto-generated, unique per tenant)  // "TO-0001"
  status: enum ['draft', 'requested', 'approved', 'in_transit', 'received', 'partially_received', 'cancelled'] (default: 'draft')

  sourceLocationId: ObjectId ref 'Location' (required)
  sourceWarehouseId: ObjectId ref 'Warehouse' (required)
  destinationLocationId: ObjectId ref 'Location' (required)
  destinationWarehouseId: ObjectId ref 'Warehouse' (required)

  items: [{
    productId: ObjectId ref 'Product' (required)
    productSku: string
    productName: string
    variantId: ObjectId (optional)
    variantSku: string (optional)
    requestedQuantity: number (required, min: 0.0001)
    approvedQuantity: number (optional, set on approval)
    shippedQuantity: number (optional, set on dispatch)
    receivedQuantity: number (optional, set on receipt)
    unitCost: number
    notes: string (optional)
    lotNumber: string (optional)
  }]

  // Metadata
  requestedBy: ObjectId ref 'User'
  requestedAt: Date
  approvedBy: ObjectId ref 'User'
  approvedAt: Date
  shippedBy: ObjectId ref 'User'
  shippedAt: Date
  receivedBy: ObjectId ref 'User'
  receivedAt: Date
  cancelledBy: ObjectId ref 'User'
  cancelledAt: Date
  cancellationReason: string

  notes: string (optional)
  reference: string (optional)            // Referencia externa

  // Standard fields
  isDeleted: boolean (default: false)
  tenantId: ObjectId ref 'Tenant' (required)
  createdBy: ObjectId ref 'User'
  updatedBy: ObjectId ref 'User'
  timestamps: true
}

Indexes:
- { tenantId: 1, orderNumber: 1 } unique
- { tenantId: 1, status: 1 }
- { tenantId: 1, sourceLocationId: 1 }
- { tenantId: 1, destinationLocationId: 1 }
- { tenantId: 1, createdAt: -1 }
```

#### 3.2 Crear módulo `transfer-orders/`

```
modules/transfer-orders/
├── transfer-orders.module.ts
├── transfer-orders.service.ts
├── transfer-orders.controller.ts
└── dto/
    ├── create-transfer-order.dto.ts
    ├── update-transfer-order.dto.ts
    ├── approve-transfer-order.dto.ts
    ├── ship-transfer-order.dto.ts
    ├── receive-transfer-order.dto.ts
    └── transfer-order-filter.dto.ts
```

**Endpoints:**
- `GET /transfer-orders` — Listar con filtros (status, sourceLocationId, destinationLocationId, dateRange, paginación)
- `GET /transfer-orders/:id` — Detalle con items populados
- `POST /transfer-orders` — Crear transfer order (status: draft)
- `PATCH /transfer-orders/:id` — Editar draft (solo si status === 'draft')
- `POST /transfer-orders/:id/request` — Cambiar a 'requested' (notificar a sede origen)
- `POST /transfer-orders/:id/approve` — Aprobar (puede ajustar cantidades). Solo usuario con permiso en sede origen.
- `POST /transfer-orders/:id/ship` — Despachar. **AQUÍ se descuenta inventario de origen.** Genera InventoryMovement tipo OUT con transferId.
- `POST /transfer-orders/:id/receive` — Recibir (puede ser parcial). **AQUÍ se suma inventario en destino.** Genera InventoryMovement tipo IN con mismo transferId. Si cantidad recibida < despachada, status = 'partially_received'.
- `POST /transfer-orders/:id/cancel` — Cancelar (solo si no se ha despachado). Si ya se despachó, se debe recibir primero.
- `DELETE /transfer-orders/:id` — Soft delete (solo drafts)

**Flujo de inventario (CRÍTICO):**
1. **Al despachar (ship)**: Para cada item, buscar el Inventory record del producto en el warehouse de origen → decrementar `availableQuantity` y `totalQuantity` → crear InventoryMovement con `movementType: 'TRANSFER'`, `sourceWarehouseId`, `destinationWarehouseId`, `transferId` (UUID compartido).
2. **Al recibir (receive)**: Para cada item, buscar o crear el Inventory record del producto en el warehouse de destino → incrementar `availableQuantity` y `totalQuantity` → crear InventoryMovement pareado con mismo `transferId` y `linkedMovementId`.
3. **Inventario en tránsito**: Entre el despacho y la recepción, el stock ya no está en origen pero tampoco en destino. El TransferOrder con status 'in_transit' representa ese inventario. Considerar mostrar esto en reportes.

**Validaciones:**
- No se puede transferir a la misma sede
- No se puede despachar más de lo disponible en origen
- No se puede recibir más de lo despachado
- Solo se pueden editar/cancelar orders en status 'draft' o 'requested'
- Al despachar, validar stock suficiente (usar enforceStock)

**Permisos**: `transfer_orders_read`, `transfer_orders_write`, `transfer_orders_approve`

### FASE 4: Backend — Permisos por Location

#### 4.1 Agregar `locationIds` al modelo de asignación de usuario/rol

El objetivo es que un usuario pueda estar restringido a operar solo en ciertas locations. Opciones:

- Agregar `allowedLocationIds: [ObjectId]` al UserTenant/Membership o al User schema (según cómo se manejen las membresías).
- Si `allowedLocationIds` está vacío o no existe → el usuario tiene acceso a TODAS las locations (backwards compatible, admins).
- Si tiene valores → el usuario solo puede operar en esas locations.

#### 4.2 Crear guard `LocationGuard`

Un guard que:
1. Extrae el `locationId` del request (body, params, o query)
2. Verifica que el usuario tenga acceso a esa location
3. Si no tiene acceso → `ForbiddenException`

Se usa como guard adicional en endpoints que operan sobre una sede específica:
```typescript
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, LocationGuard)
```

### FASE 5: Frontend — Selector de Sede y Vistas

#### 5.1 LocationContext

Crear un context `LocationContext` que:
- Cargue las locations del tenant al login
- Mantenga la `activeLocationId` (la sede seleccionada actualmente)
- Provea función `switchLocation(locationId)`
- Persista selección en `localStorage`
- Si el tenant tiene una sola location, no mostrar selector

#### 5.2 Location Selector (UI)

- Componente dropdown en el header/sidebar del `TenantLayout`
- Opciones: cada sede + opción "Todas las sedes" (vista consolidada)
- Solo visible si el tenant tiene más de 1 location
- Al cambiar sede, los datos del dashboard, inventario, ventas, etc. se filtran

#### 5.3 Página de Gestión de Sedes

Ruta: `/settings/locations` (dentro de configuración del tenant)

- Lista de sedes con: nombre, código, tipo, dirección, estado, # productos con stock, # empleados
- Crear/editar sede (formulario con validación Zod)
- Activar/desactivar sede
- Ver detalle de sede con resumen de inventario

#### 5.4 Página de Transfer Orders

Ruta: `/inventory-management?tab=transfers` (nueva tab dentro del módulo de inventario existente)

- Lista de transfer orders con filtros (status, sede origen/destino, fecha)
- Crear nueva transfer order:
  1. Seleccionar sede origen y destino
  2. Agregar productos (buscador con autocompletado, mostrar stock disponible en origen)
  3. Definir cantidades
  4. Enviar solicitud
- Vista de detalle de transfer order con:
  - Timeline de estados
  - Botones de acción según estado actual y permisos del usuario
  - Tabla de items con cantidades (solicitada/aprobada/despachada/recibida)

#### 5.5 Ajustar componentes existentes

- **InventoryDashboard**: Filtrar inventario por `activeLocationId` (o mostrar consolidado si es "Todas")
- **Reportes**: Agregar filtro por sede. Agregar vista comparativa entre sedes.
- **Empleados**: Filtrar por ubicación asignada cuando hay sede seleccionada.

### FASE 6: Frontend — API Functions

Agregar a `src/lib/api.js`:

```javascript
// --- Locations ---
export const getLocations = (params) => api.get('/locations', { params });
export const getLocation = (id) => api.get(`/locations/${id}`);
export const createLocation = (data) => api.post('/locations', data);
export const updateLocation = (id, data) => api.patch(`/locations/${id}`, data);
export const deleteLocation = (id) => api.delete(`/locations/${id}`);
export const getLocationInventorySummary = (id) => api.get(`/locations/${id}/inventory-summary`);

// --- Transfer Orders ---
export const getTransferOrders = (params) => api.get('/transfer-orders', { params });
export const getTransferOrder = (id) => api.get(`/transfer-orders/${id}`);
export const createTransferOrder = (data) => api.post('/transfer-orders', data);
export const updateTransferOrder = (id, data) => api.patch(`/transfer-orders/${id}`, data);
export const requestTransferOrder = (id) => api.post(`/transfer-orders/${id}/request`);
export const approveTransferOrder = (id, data) => api.post(`/transfer-orders/${id}/approve`, data);
export const shipTransferOrder = (id, data) => api.post(`/transfer-orders/${id}/ship`, data);
export const receiveTransferOrder = (id, data) => api.post(`/transfer-orders/${id}/receive`, data);
export const cancelTransferOrder = (id, data) => api.post(`/transfer-orders/${id}/cancel`, data);
export const deleteTransferOrder = (id) => api.delete(`/transfer-orders/${id}`);
```

---

## REGLAS CRÍTICAS

### NUNCA:
- Modificar la estructura de schemas existentes (Product, Inventory, InventoryMovement, Warehouse) salvo agregar campos opcionales nuevos
- Romper la compatibilidad con tenants que NO usen multi-location (un tenant de 1 sede debe funcionar exactamente igual que antes)
- Duplicar productos entre locations — los productos son del TENANT
- Crear movimientos de inventario sin validar stock (excepto adjustments)
- Saltarse el guard stack (JwtAuthGuard → TenantGuard → PermissionsGuard)
- Hardcodear IDs, URLs, o secretos
- Crear archivos fuera de la estructura de directorios existente

### SIEMPRE:
- Filtrar por `tenantId` en CADA query
- Usar soft delete (`isDeleted: true`, nunca eliminar documentos)
- Incluir `createdBy` y `updatedBy` en schemas
- Validar DTOs con class-validator
- Seguir los naming conventions exactos del proyecto
- Hacer que la migración sea idempotente
- Manejar el caso de tenant con una sola location (no mostrar selector, funcionalidad transparente)
- Registrar los nuevos módulos en `app.module.ts`
- Registrar los nuevos permisos en el seed de permisos si existe
- Agregar las nuevas funciones API en `src/lib/api.js` del frontend

---

## ORDEN DE IMPLEMENTACIÓN

Implementar en este orden estricto, verificando que cada fase funciona antes de pasar a la siguiente:

1. **Fase 0**: Backup de BD + verificación de schemas existentes
2. **Fase 1**: Schema Location + campo locationId en Warehouse + migración
3. **Fase 2**: Módulo Locations (CRUD completo, testear con API)
4. **Fase 3**: Schema TransferOrder + módulo TransferOrders (flujo completo de estados + movimientos de inventario)
5. **Fase 4**: Permisos por location (guard + allowedLocationIds)
6. **Fase 5**: Frontend — LocationContext + selector + página de gestión + página de transfers + ajustes a componentes existentes
7. **Fase 6**: Funciones API en api.js del frontend

Cada fase debe dejar el sistema en un estado funcional. Si una fase falla, las anteriores siguen funcionando.

---

## ENTREGABLES POR FASE

Al completar cada fase, listar:
- Archivos creados/modificados con ruta completa
- Cambios específicos en archivos existentes
- Cómo verificar que funciona (endpoints a probar, queries a correr)
- Cualquier decisión arquitectónica tomada y por qué
