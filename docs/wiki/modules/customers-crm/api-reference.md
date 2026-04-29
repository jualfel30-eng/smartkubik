# Clientes y CRM — Referencia API

> Diseñado para agentes de IA. Última actualización: 2026-04-28

---

## Endpoints Admin (autenticados)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | `/api/v1/customers` | customers_create | Crear contacto |
| GET | `/api/v1/customers` | customers_read | Listar con filtros y métricas |
| GET | `/api/v1/customers/:id` | customers_read | Detalle de contacto |
| PATCH | `/api/v1/customers/:id` | customers_update | Actualizar |
| DELETE | `/api/v1/customers/:id` | customers_delete | Soft delete |
| GET | `/api/v1/customers/:id/product-history` | customers_read | Historial de productos comprados |
| GET | `/api/v1/customers/:id/transactions` | customers_read | Transacciones con filtros |
| GET | `/api/v1/customers/:id/transaction-stats` | customers_read | Estadísticas + top 5 productos |
| GET | `/api/v1/customers/no-show-flagged` | customers_read | Clientes con penalidades |
| PATCH | `/api/v1/customers/:id/reset-no-show` | customers_write | Reset penalidades |

### GET /api/v1/customers — Query Parameters

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Items (max 100) |
| `search` | string | — | Busca en name, lastName, companyName, customerNumber, taxId, contacts |
| `customerType` | string | — | Comma-separated: `individual,supplier,employee` |
| `status` | string | excluye inactive | active, inactive, suspended, blocked |
| `assignedTo` | MongoId | — | Filtro por vendedor asignado |
| `sortBy` | string | createdAt | name, createdAt, lastOrderDate, totalSpent |
| `sortOrder` | string | desc | asc, desc |

---

## Endpoints Storefront (públicos)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/customers/auth/register` | Registro (name, email, password) |
| POST | `/api/v1/customers/auth/login` | Login (email, password) → JWT customer |
| GET | `/api/v1/customers/auth/profile` | Perfil (CustomerAuthGuard) |
| PUT | `/api/v1/customers/auth/profile` | Actualizar perfil |
| POST | `/api/v1/customers/auth/change-password` | Cambiar contraseña |
| GET | `/api/v1/customers/auth/orders` | Órdenes del cliente |

---

## Schema Resumido

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  customerNumber: string,        // CLI-000001 o C000001
  name: string,
  companyName?: string,
  customerType: "individual"|"business"|"supplier"|"employee"|...,
  status: "active"|"inactive"|"suspended"|"blocked",
  
  taxInfo?: { taxId, taxType, taxName, isRetentionAgent },
  contacts?: [{ type: "phone"|"email"|"whatsapp", value, isPrimary }],
  addresses?: [{ type, street, city, state, isDefault }],
  
  tier: "bronce"|"plata"|"oro"|"diamante",
  loyaltyScore: number,          // 0-100 RFM
  loyaltyPoints: number,
  defaultPriceListId?: ObjectId,
  
  metrics: {
    totalOrders, totalSpent, averageOrderValue,
    lastOrderDate, orderFrequency, lifetimeValue,
    engagementScore, communicationTouchpoints
  },
  
  creditInfo?: { creditLimit, availableCredit, paymentTerms, acceptsCredit },
  
  // Storefront auth
  email?: string,                // sparse unique
  passwordHash?: string,         // select: false
  hasStorefrontAccount: boolean,
  
  // WhatsApp
  whatsappNumber?: string,
  isWhatsappCustomer: boolean,
  
  // No-show (hospitality)
  noShowCount: number,
  requiresDeposit: boolean,
  isBlacklisted: boolean,
  
  createdBy: ObjectId,
  createdAt: Date
}
```

---

## Errores Comunes

| Status | Mensaje | Causa |
|---|---|---|
| 409 | "Email already registered" | Registro storefront con email existente |
| 401 | "Invalid credentials" | Login con password incorrecto |
| 404 | "Customer not found" | ID no existe en tenant |

---

*Última actualización: 2026-04-28*
