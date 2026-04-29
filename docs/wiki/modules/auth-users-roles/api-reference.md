# Auth, Users, Roles — Referencia API

> Diseñado para agentes de IA. Última actualización: 2026-04-28

---

## Endpoints — Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Público (throttle 5/min) | Login email/password → tokens |
| POST | `/api/v1/auth/refresh` | Público | Refresh token → nuevos tokens |
| POST | `/api/v1/auth/switch-tenant` | JWT | Cambiar organización |
| GET | `/api/v1/auth/google` | Público | Iniciar OAuth Google |
| GET | `/api/v1/auth/google/callback` | Público | Callback OAuth → redirect con tokens |
| POST | `/api/v1/auth/create-user` | JWT | Crear usuario en tenant |
| GET | `/api/v1/auth/profile` | JWT | Perfil del usuario autenticado |
| GET | `/api/v1/auth/memberships` | JWT | Memberships del usuario |
| POST | `/api/v1/auth/validate` | JWT | Validar token |
| POST | `/api/v1/auth/logout` | JWT | Logout (no-op actualmente) |

### POST /api/v1/auth/login

**Request:**
```json
{
  "email": "string — requerido",
  "password": "string — requerido",
  "twoFactorCode": "string — si 2FA habilitado (6 dígitos TOTP)",
  "twoFactorBackupCode": "string — alternativa a TOTP"
}
```

**Response (200):**
```json
{
  "user": { "id": "...", "email": "...", "firstName": "...", "role": { "name": "admin", "permissions": ["orders_read", "..."] } },
  "tenant": { "id": "...", "name": "Mi Negocio", "vertical": "FOOD_SERVICE", "enabledModules": { "orders": true, "inventory": true } },
  "membership": { "id": "...", "isDefault": true, "status": "active" },
  "memberships": [{ "id": "...", "tenant": { "name": "..." } }],
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "15m"
}
```

**Nota**: El token está en `data.accessToken` (no `token`).

### POST /api/v1/auth/switch-tenant

**Request:**
```json
{
  "membershipId": "MongoId — requerido",
  "rememberAsDefault": "boolean — opcional"
}
```

---

## Endpoints — Users

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/users/search` | JWT | Buscar por email |
| GET | `/api/v1/users` | JWT | Listar usuarios del tenant |

---

## Endpoints — Roles

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | `/api/v1/roles` | roles_create | Crear rol |
| GET | `/api/v1/roles` | roles_read | Listar roles + permisos disponibles |
| GET | `/api/v1/roles/:id` | roles_read | Detalle de rol |
| PATCH | `/api/v1/roles/:id` | roles_update | Actualizar rol |
| DELETE | `/api/v1/roles/:id` | roles_delete | Eliminar rol |

---

## Endpoints — Permissions

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/permissions` | Público | Listar 104 permisos disponibles |

---

## Schema Resumido — User

```typescript
{
  _id: ObjectId,
  email: string,                    // Único por tenant
  firstName: string,
  lastName: string,
  password: string,                 // bcrypt hash (select: false)
  role?: ObjectId,                  // → roles (legacy)
  tenantId?: ObjectId,              // → tenants (legacy)
  isActive: boolean,
  twoFactorEnabled: boolean,
  twoFactorSecret?: string,        // TOTP Base32 (select: false)
  twoFactorBackupCodes?: string[], // Single-use (select: false)
  loginAttempts: number,            // 5 → lockout 30min
  lockUntil?: Date,
  createdAt: Date
}
```

## Schema Resumido — Role

```typescript
{
  _id: ObjectId,
  name: string,                     // Único por tenant
  description?: string,
  permissions: ObjectId[],          // → permissions
  tenantId: ObjectId
}
```

## Schema Resumido — UserTenantMembership

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // → users
  tenantId: ObjectId,               // → tenants
  roleId: ObjectId,                 // → roles
  status: "active"|"inactive"|"invited",
  isDefault: boolean,
  permissionsCache: string[],       // Desnormalizados
  allowedLocationIds: ObjectId[]    // Filtro de sedes
}
```

---

## Seguridad

| Feature | Implementación |
|---|---|
| **Hashing** | bcrypt (12 rounds default) |
| **JWT Access** | 15 min, firma con JWT_SECRET |
| **JWT Refresh** | 7 días, firma con JWT_REFRESH_SECRET |
| **Rate Limiting** | 3 tiers: 50/min, 300/10min, 1000/hora (prod) |
| **Account Lockout** | 5 intentos → 30 min bloqueo |
| **2FA** | TOTP (HMAC-SHA1, 30s, ±1 ventana) + backup codes |
| **OAuth** | Google OAuth 2.0 (solo users pre-existentes) |
| **Tenant Isolation** | tenantId en cada query de BD |
| **Permission Check** | @Permissions decorator + PermissionsGuard |

---

## Errores Comunes

| Status | Mensaje | Causa |
|---|---|---|
| 401 | "Invalid credentials" | Email/password incorrecto |
| 401 | "Account locked" | 5+ intentos fallidos |
| 401 | "2FA code required" | 2FA habilitado pero no se envió código |
| 401 | "Invalid 2FA code" | Código TOTP incorrecto |
| 403 | "Forbidden" | Sin permiso para la acción |
| 403 | "TRIAL_EXPIRED" | Suscripción expirada |
| 403 | "Tenant is not active" | Tenant suspendido/cancelado |

---

*Última actualización: 2026-04-28*
*Archivos fuente: `auth/auth.controller.ts`, `auth/auth.service.ts`, `auth/token.service.ts`, `modules/roles/`, `modules/permissions/`, `modules/users/`, `guards/`*
