# Auth, Users, Roles — Catálogo de Funciones

> Última actualización: 2026-04-28

---

## Resumen

| Función | Descripción | Módulo |
|---|---|---|
| Login | Autenticación email/password con JWT | Auth |
| Login Google | OAuth con Google (solo users existentes) | Auth |
| Refresh token | Renovar access token con refresh token | Auth |
| Cambiar tenant | Generar nuevos tokens para otra organización | Auth |
| Verificar 2FA | TOTP o backup code durante login | Auth |
| Lockout | Bloquear cuenta tras 5 intentos fallidos | Auth |
| Crear usuario | Registrar nuevo usuario en un tenant | Auth |
| Buscar usuarios | Por email o teléfono | Users |
| Crear rol | Definir rol con permisos seleccionados | Roles |
| Listar roles | Con permisos + módulos habilitados del tenant | Roles |
| Listar permisos | 104 permisos disponibles, filtrables por módulo | Permissions |
| Validar JWT | En cada request (JwtAuthGuard) | Guards |
| Validar Tenant | Verifica tenant activo + suscripción | Guards |
| Validar Permisos | Verifica @Permissions en controller | Guards |

---

## Login (Email/Password)

### Paso a paso
1. El usuario ingresa email y contraseña
2. El sistema busca el User por email (case-insensitive)
3. Verifica que no esté bloqueado (lockout 30 min tras 5 intentos)
4. Compara password con hash bcrypt
5. Si 2FA está habilitado: exige código TOTP o backup code
6. Busca membresías activas del usuario (UserTenantMembership)
7. Selecciona tenant por defecto (isDefault=true) o el primero disponible
8. Genera access token (15 min) con user + role + permissions + tenantId
9. Genera refresh token (7 días) con solo userId
10. Retorna: tokens, user, tenant, memberships

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/auth/login`
- **Público**: No requiere autenticación (throttled 5/min)
- **Servicio**: `auth.service.ts → login()`
- **Token**: `token.service.ts → generateTokens()` — Access token incluye permissions desnormalizados
- **Fallback**: Si role no tiene permissions, asigna defaults por nombre de rol (vendedor → orders_read, etc.)
- **Respuesta**: `{ user, tenant, membership, memberships[], accessToken, refreshToken, expiresIn }`

---

## Verificación 2FA (TOTP)

### ¿Qué hace?
Agrega una capa extra de seguridad. Después de verificar la contraseña, el usuario debe ingresar un código de 6 dígitos generado por su app de autenticación (Google Authenticator, etc.).

### Lo que pasa por detrás (técnico)
- **TOTP**: Decode Base32 secret → HMAC-SHA1 con contador (30s windows) → acepta ±1 ventana
- **Backup codes**: Array de strings single-use. Se elimina del array tras uso (`$pull`)
- **Si falla**: Cuenta como intento fallido (contribuye al lockout)

---

## Cambiar Tenant (Multi-Membresía)

### ¿Qué hace?
Permite a un usuario que administra múltiples organizaciones cambiar de contexto sin cerrar sesión.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/auth/switch-tenant`
- **Requiere**: JwtAuthGuard (ya autenticado)
- **Input**: `{ membershipId, rememberAsDefault? }`
- **Valida**: Membership activa + pertenece al usuario autenticado
- **Genera**: Nuevos tokens con el nuevo tenantId
- **Opción**: `rememberAsDefault=true` marca esta membership como default para próximos logins

---

## Crear Rol

### ¿Qué hace?
Define un nuevo rol dentro de un tenant con un conjunto específico de permisos.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/roles`
- **Permisos**: `roles_create`
- **Input**: `{ name, description, permissions: [permissionId, ...] }`
- **Validación**: Nombre único por tenant
- **Auto-creación**: Durante onboarding, se crea automáticamente un rol "admin" con todos los permisos del vertical

### Listar roles con contexto
- **Endpoint**: `GET /api/v1/roles`
- **Método especial**: `findAllWithPermissionsAndMetadata()` retorna roles + permisos disponibles filtrados por los módulos habilitados del tenant
- **Lógica**: `getEffectiveModulesForTenant()` determina qué permisos mostrar según el vertical del tenant

---

## Guard Stack (Validación en cada Request)

### JwtAuthGuard
1. Extrae JWT del header `Authorization: Bearer {token}`
2. Verifica firma y expiración
3. Carga User completo de BD (verifica `isActive`)
4. Recarga Role con permissions populados
5. Extrae array de permission names: `["orders_read", "inventory_create", ...]`
6. Agrega `ip` y `userAgent` al request

### TenantGuard
1. Si `@Public()` → bypass
2. Si role = `super_admin` → bypass
3. Busca Tenant por `user.tenantId`
4. Verifica `status === "active"`
5. Verifica suscripción no expirada (código especial `TRIAL_EXPIRED`)
6. Adjunta `req.tenant = tenantDoc`

### PermissionsGuard
1. Lee `@Permissions(...)` del controller
2. Si no hay permisos requeridos → permite
3. Si user no tiene array de permisos → permite (fallback compatibilidad ⚠️)
4. Verifica: `requiredPermissions.every(p => user.permissions.includes(p))`

---

*Última actualización: 2026-04-28*
*Archivos fuente: `auth.service.ts`, `token.service.ts`, `roles.service.ts`, `permissions.service.ts`, guards/*
