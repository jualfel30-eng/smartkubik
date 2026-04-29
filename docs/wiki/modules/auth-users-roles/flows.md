# Auth, Users, Roles — Flujos de Operación

> Última actualización: 2026-04-28

---

## Flujo 1: Login Completo (con 2FA y Multi-Tenant)

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant F as 🖥️ Frontend
    participant AS as 🔐 AuthService
    participant TS as 🔑 TokenService
    participant DB as 🗄️ MongoDB

    U->>F: Email + Password
    F->>AS: POST /auth/login

    AS->>DB: User.findOne({ email })
    alt Usuario no encontrado
        AS-->>F: 401 "Invalid credentials"
    end

    AS->>AS: Verifica lockout (loginAttempts >= 5?)
    alt Bloqueado
        AS-->>F: 401 "Account locked, try in 30 min"
    end

    AS->>AS: bcrypt.compare(password, hash)
    alt Password incorrecto
        AS->>DB: loginAttempts++ (si >= 5: lockUntil = now + 30min)
        AS-->>F: 401 "Invalid credentials"
    end

    opt 2FA habilitado
        alt Código TOTP proporcionado
            AS->>AS: Verifica TOTP (HMAC-SHA1, ±1 ventana de 30s)
        else Backup code proporcionado
            AS->>DB: Busca y elimina backup code ($pull)
        else Sin código
            AS-->>F: 401 "2FA code required"
        end
    end

    AS->>DB: Reset loginAttempts = 0
    AS->>DB: UserTenantMembership.find({ userId, status: "active" })
    AS->>AS: Selecciona membership default (isDefault=true)

    AS->>DB: Carga Tenant + Role + Permissions
    AS->>TS: generateTokens(user, role, permissions, tenantId)

    TS-->>AS: { accessToken (15m), refreshToken (7d) }
    AS-->>F: { user, tenant, memberships[], accessToken, refreshToken }

    alt Multi-tenant (>1 membership)
        F->>F: Muestra selector de organización
        U->>F: Selecciona organización
        F->>AS: POST /auth/switch-tenant { membershipId }
        AS->>TS: generateTokens (nuevo tenantId)
        AS-->>F: Nuevos tokens
    end

    F->>F: Guarda tokens en localStorage
    F->>F: Redirect a /dashboard
```

---

## Flujo 2: Guard Stack en cada Request

```mermaid
sequenceDiagram
    participant C as 🖥️ Cliente
    participant JWT as 🔐 JwtAuthGuard
    participant TG as 🏢 TenantGuard
    participant PG as 🛡️ PermissionsGuard
    participant CTRL as 📡 Controller

    C->>JWT: Request + Authorization: Bearer {token}

    JWT->>JWT: Verifica firma + expiración
    JWT->>JWT: Extrae payload (sub, email, role, tenantId)
    JWT->>JWT: Carga User de BD (verifica isActive)
    JWT->>JWT: Recarga Role + Permissions

    alt Token inválido o User inactivo
        JWT-->>C: 401 Unauthorized
    end

    JWT->>TG: req.user = { id, email, role, permissions[], tenantId }

    alt Rol = super_admin
        TG->>PG: Bypass (super admin)
    else
        TG->>TG: Busca Tenant, verifica status=active
        TG->>TG: Verifica suscripción no expirada
        alt Tenant inactivo o expirado
            TG-->>C: 403 Forbidden / TRIAL_EXPIRED
        end
        TG->>TG: req.tenant = tenantDoc
    end

    TG->>PG: Pasa al PermissionsGuard

    PG->>PG: Lee @Permissions("orders_read")
    alt Sin @Permissions decorator
        PG->>CTRL: Permite (no requiere permisos)
    else
        PG->>PG: user.permissions.includes("orders_read")?
        alt Tiene permiso
            PG->>CTRL: ✅ Permite
        else
            PG-->>C: 403 Forbidden
        end
    end
```

---

## Flujo 3: Refresh Token

```mermaid
sequenceDiagram
    participant F as 🖥️ Frontend
    participant AS as 🔐 AuthService
    participant TS as 🔑 TokenService
    participant DB as 🗄️ MongoDB

    Note over F: Access token expiró (15 min)
    F->>AS: POST /auth/refresh { refreshToken }

    AS->>AS: jwt.verify(refreshToken, REFRESH_SECRET)
    alt Token inválido/expirado
        AS-->>F: 401 → Frontend hace logout
    end

    AS->>DB: User.findById(payload.sub)
    AS->>DB: Carga Role + Permissions
    AS->>DB: Carga Tenant (verifica active)

    AS->>TS: generateTokens(user, role, permissions, tenantId)
    TS-->>AS: Nuevos { accessToken, refreshToken }

    AS-->>F: Nuevos tokens
    F->>F: Reemplaza tokens en localStorage
    F->>F: Reintenta request original
```

---

## Flujo 4: Control de Acceso Frontend (Permisos + Módulos)

```mermaid
flowchart TD
    USER_ACTION["Usuario intenta acceder<br/>a una función"] --> HAS_PERM{"hasPermission('X')?"}
    
    HAS_PERM -->|"Verifica 2 cosas"| CHECK1["1. ¿Role tiene el permiso?<br/>role.permissions.includes('X')"]
    CHECK1 --> CHECK2["2. ¿Tenant tiene el módulo?<br/>tenant.enabledModules.{module}"]
    
    CHECK2 -->|"Ambos Sí"| SHOW["✅ Muestra función/ruta"]
    CHECK2 -->|"Alguno No"| HIDE["❌ Oculta función/ruta"]
    
    NOTE["Ejemplo:<br/>Permission: 'payroll_employees_read'<br/>→ Module: 'payroll'<br/>→ tenant.enabledModules.payroll must be true"]
```

---

## Flujo 5: Google OAuth

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant F as 🖥️ Frontend
    participant G as 🔵 Google
    participant AS as 🔐 AuthService

    U->>F: Clic "Login con Google"
    F->>AS: GET /auth/google
    AS->>G: Redirect a Google OAuth consent
    G->>U: Pantalla de consentimiento
    U->>G: Autoriza
    G->>AS: GET /auth/google/callback?code=...

    AS->>G: Intercambia code por profile
    G-->>AS: { email, firstName, lastName, picture }

    AS->>AS: validateOAuthLogin(email)
    alt Email existe en sistema
        AS->>AS: Genera tokens
        AS-->>F: Redirect: /auth/callback?accessToken=...&refreshToken=...
        F->>F: Extrae tokens de URL, guarda en localStorage
    else Email no existe
        AS-->>F: 401 "User not found" (⚠️ no auto-crea)
    end
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `auth.controller.ts`, `auth.service.ts`, `token.service.ts`, `jwt.strategy.ts`, `google.strategy.ts`, guards/*
