# Clientes y CRM — Catálogo de Funciones

> Última actualización: 2026-04-28

---

## Resumen

| Función | Descripción | Quién la usa |
|---|---|---|
| Crear contacto | Registra cliente/proveedor/empleado | Admin, Sistema |
| Listar contactos | Busca con filtros, paginación, métricas calculadas | Todos |
| Ver detalle | Perfil completo con métricas y engagement | Vendedor |
| Actualizar contacto | Edita datos de un contacto | Admin |
| Eliminar (soft) | Marca como inactivo | Admin |
| Historial de productos | Qué productos ha comprado un cliente | Vendedor |
| Historial de transacciones | Órdenes con filtros avanzados | Admin |
| Estadísticas del cliente | Top 5 productos, totales, promedios | Admin |
| No-show flagged | Clientes con inasistencias | Admin (hospitality) |
| Reset no-show | Limpia penalidades | Admin |
| Registrar comunicación | Registra interacción y actualiza engagement | Sistema |
| Calcular tiers | Clasifica clientes en lealtad RFM | Sistema |
| Register (storefront) | Crea cuenta de cliente para tienda online | Cliente |
| Login (storefront) | Autenticación de cliente | Cliente |
| Perfil (storefront) | Ver/editar perfil, ver órdenes propias | Cliente |

---

## Crear Contacto

### ¿Qué hace?
Registra un nuevo contacto en el CRM. Dependiendo del tipo, puede auto-crear perfiles adicionales (Supplier o Employee).

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/customers`
- **Servicio**: `customers.service.ts → create()`
- **Auto-generación**: `customerNumber` formato `CLI-XXXXXX`
- **Defaults**: tier="bronce", loyaltyScore=0, métricas en 0
- **Si `customerType="supplier"`**: Crea Supplier vinculado con paymentSettings
- **Si `customerType="employee"`**: Crea EmployeeProfile con `EMP-XXXXXX`
- **Permisos**: `customers_create`

---

## Listar Contactos (con Métricas en Tiempo Real)

### ¿Qué hace?
Retorna contactos con filtros y métricas calculadas al vuelo: total gastado, órdenes, depósitos, rating de proveedor.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/customers`
- **Query**: `page`, `limit`, `search`, `customerType` (comma-separated), `status`, `assignedTo`, `sortBy`, `sortOrder`
- **Búsqueda**: name, lastName, companyName, customerNumber, taxId, contacts.value
- **Aggregation pipeline**: Joins con Orders, PurchaseOrders, Appointments para métricas
- **Post-procesamiento**: Calcula tiers RFM y los persiste si cambiaron
- **Fallback**: Si la aggregation falla, usa `find()` simple
- **Permisos**: `customers_read`

---

## Historial de Productos del Cliente

### ¿Qué hace?
Muestra qué productos ha comprado un cliente, cuántas veces, cuánto ha gastado en cada uno, y hace cuánto fue la última compra.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/customers/:id/product-history`
- **Aggregation**: Agrupa items de órdenes por productId
- **Retorna**: productName, category, purchaseCount, orderCount, totalSpent, daysSinceLastPurchase
- **Permisos**: `customers_read`

---

## Auth de Storefront (Registro y Login)

### ¿Qué hace?
Permite que clientes del storefront se registren y autentiquen con un sistema JWT completamente separado del admin.

### Registro
- **Endpoint**: `POST /api/v1/customers/auth/register` (público)
- **Input**: name, email, password (min 6), phone?, whatsappNumber?
- **Crea**: Customer con `hasStorefrontAccount=true`, `emailVerified=false`, `source="storefront"`
- **Token**: JWT con `{ sub, email, tenantId, type: "customer" }` — diferente del token admin

### Login
- **Endpoint**: `POST /api/v1/customers/auth/login` (público)
- **Input**: email (lowercase), password
- **Busca**: Customer con `hasStorefrontAccount=true`
- **Valida**: bcrypt compare del passwordHash
- **Retorna**: JWT customer token + datos del perfil

### Endpoints protegidos (CustomerAuthGuard)
- `GET /customers/auth/profile` — perfil del cliente
- `PUT /customers/auth/profile` — actualizar perfil
- `POST /customers/auth/change-password` — cambiar contraseña
- `GET /customers/auth/orders` — historial de órdenes propias

---

## Registrar Comunicación

### ¿Qué hace?
Registra una interacción con el cliente (WhatsApp, email, llamada) y actualiza automáticamente su engagement score, segmentos, y próximo seguimiento.

### Lo que pasa por detrás (técnico)
- **Método**: `customers.service.ts → recordCommunicationEvent()`
- **Engagement delta**: WhatsApp=8, SMS=6, otros=4
- **Auto-segmentos**: VIP (score≥80), WhatsApp, Email Engaged
- **Calcula**: `nextFollowUpDate` basado en engagementScore (clientes más engaged = seguimiento más largo)
- **Actualiza**: `lastContactDate`, `communicationTouchpoints`, `engagementScore`

---

*Última actualización: 2026-04-28*
*Archivos fuente: `customers.controller.ts`, `customers-auth.controller.ts`, `customers.service.ts`*
