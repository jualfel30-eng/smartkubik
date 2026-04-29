# SmartKubik — Arquitectura Técnica

> Diagrama de arquitectura general del sistema SmartKubik.
> Última actualización: 2026-04-28

---

## Diagrama General del Sistema

```mermaid
flowchart TB
    subgraph CLIENTS["👤 Clientes"]
        ADMIN["🖥️ Admin Frontend<br/>React 18 + Vite<br/>Puerto 5173"]
        STORE["🛒 Storefront<br/>Next.js 15<br/>Puerto 3001"]
        MOBILE["📱 Mobile PWA<br/>(mismo Admin, responsive)"]
        DRIVER["🚚 Portal Repartidores<br/>(ruta /driver dentro de Admin)"]
    end

    subgraph BACKEND["⚙️ Backend API — NestJS"]
        direction TB
        GUARDS["🔐 Guard Stack<br/>Throttler → JWT → Tenant → Permissions"]
        CONTROLLERS["📡 Controllers<br/>~1,257 endpoints REST"]
        SERVICES["📦 Services<br/>114 módulos de lógica"]
        EVENTS["⚡ EventEmitter<br/>Eventos internos"]
        QUEUES["📋 BullMQ<br/>Jobs asíncronos"]
    end

    subgraph DATA["🗄️ Almacenamiento"]
        MONGO["🍃 MongoDB Atlas<br/>173 schemas/colecciones"]
        REDIS["🔴 Redis<br/>Colas BullMQ + Cache"]
    end

    subgraph EXTERNAL["🌐 Servicios Externos"]
        WHAPI["💬 Whapi.cloud<br/>WhatsApp Business"]
        RESEND["📧 Resend<br/>Email transaccional"]
        GMAIL["📧 Gmail/Outlook<br/>OAuth email"]
        OPENAI["🤖 OpenAI<br/>Embeddings + Chat"]
        BINANCE["💰 Binance Pay<br/>Pagos crypto"]
        GOOGLE["📍 Google Places<br/>Reseñas externas"]
        CLARITY["📊 Microsoft Clarity<br/>Analytics"]
    end

    ADMIN -->|"HTTP/JSON<br/>Bearer + x-tenant-id"| GUARDS
    STORE -->|"HTTP/JSON<br/>Endpoints públicos<br/>/api/v1/public/*"| GUARDS
    MOBILE -->|"HTTP/JSON"| GUARDS
    DRIVER -->|"HTTP/JSON"| GUARDS

    GUARDS --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> EVENTS
    SERVICES --> QUEUES
    SERVICES --> MONGO
    QUEUES --> REDIS
    SERVICES --> WHAPI
    SERVICES --> RESEND
    SERVICES --> GMAIL
    SERVICES --> OPENAI
    SERVICES --> BINANCE
    STORE --> GOOGLE
    ADMIN --> CLARITY
```

---

## Arquitectura del Backend

```mermaid
flowchart LR
    subgraph REQUEST["Flujo de Request"]
        REQ["HTTP Request"] --> THROTTLE["UserThrottlerGuard<br/>3 tiers rate limiting"]
        THROTTLE --> JWT["JwtAuthGuard<br/>Valida Bearer token"]
        JWT --> TENANT["TenantGuard<br/>Extrae tenantId"]
        TENANT --> PERMS["PermissionsGuard<br/>Verifica @Permissions"]
        PERMS --> CTRL["Controller<br/>Valida DTO (class-validator)"]
        CTRL --> SVC["Service<br/>Lógica de negocio"]
    end

    subgraph PERSISTENCE["Persistencia"]
        SVC --> MONGOOSE["Mongoose ODM<br/>Schemas + Modelos"]
        MONGOOSE --> MONGO[("MongoDB Atlas")]
        SVC --> BULL["BullMQ<br/>Jobs asíncronos"]
        BULL --> REDIS_Q[("Redis")]
    end

    subgraph CROSSCUT["Cross-Cutting"]
        SVC --> LOGGER["Winston Logger"]
        SVC --> EMIT["EventEmitter<br/>Eventos inter-módulo"]
        SVC --> AUDIT["AuditLog<br/>Registro de acciones"]
    end
```

---

## Multi-Tenancy

SmartKubik implementa **multi-tenancy a nivel de datos** — todos los tenants comparten la misma base de datos, pero cada documento tiene un campo `tenantId` que lo aísla.

```mermaid
flowchart TD
    REQ["Request entrante"] --> EXTRACT["TenantGuard extrae tenantId<br/>del JWT o header x-tenant-id"]
    EXTRACT --> INJECT["tenantId inyectado en<br/>cada query de Mongoose"]
    INJECT --> QUERY["findAll: { tenantId, ...filters }"]
    QUERY --> DB[("MongoDB<br/>Colección compartida<br/>Datos aislados por tenantId")]
```

**Patrón común en todos los servicios:**
- Cada `create()` agrega `tenantId` al documento
- Cada `findAll()` filtra por `tenantId`
- Cada `findOne()` valida que el documento pertenezca al tenant
- Soft delete vía `isActive: false` (no se borra físicamente)

---

## Arquitectura del Frontend Admin

```mermaid
flowchart TD
    subgraph PROVIDERS["Providers (Context)"]
        AUTH["AuthProvider<br/>JWT, user, tenant"]
        THEME["ThemeProvider<br/>dark/light/system"]
        SHIFT["ShiftProvider<br/>Turno activo"]
        CASH["CashRegisterProvider<br/>Sesión de caja"]
        ACCT["AccountingProvider"]
        LOC["BusinessLocationProvider"]
        COUNTRY["CountryPluginProvider<br/>Localización fiscal"]
    end

    subgraph LAYOUT["TenantLayout"]
        SIDEBAR["SidebarNavigation<br/>Filtrado por permisos,<br/>módulos, vertical"]
        HEADER["Desktop Header<br/>Logo + Turno + Acciones"]
        BREADCRUMB["AppBreadcrumb"]
        CONTENT["PageTransition<br/>+ Routes"]
    end

    subgraph PATTERNS["Patrones de Componentes"]
        MGMT["*Management.jsx<br/>Vista principal con tabs"]
        VIEW["*View.jsx<br/>Vista de detalle/dashboard"]
        DIALOG["*Dialog.jsx<br/>Modales de crear/editar"]
        HOOK["use*.jsx<br/>Custom hooks por dominio"]
    end

    subgraph API_LAYER["Capa API"]
        FETCHAPI["fetchApi()<br/>lib/api.js"]
        INTERCEPTOR["Token auto-refresh<br/>Retry on 401"]
    end

    PROVIDERS --> LAYOUT
    LAYOUT --> CONTENT
    CONTENT --> MGMT
    MGMT --> HOOK
    HOOK --> FETCHAPI
    FETCHAPI -->|"Bearer + x-tenant-id"| BACKEND["⚙️ Backend API"]
```

---

## Arquitectura del Storefront

```mermaid
flowchart TD
    subgraph DETECTION["Detección de Tenant"]
        REQ["Request"] --> MW["middleware.ts"]
        MW -->|"Producción"| SUB["Extrae subdominio<br/>tienda.smartkubik.com → tienda"]
        MW -->|"Desarrollo"| PATH["Extrae path<br/>localhost:3001/tienda → tienda"]
        SUB --> REWRITE["Rewrite → /[domain]/path"]
        PATH --> REWRITE
    end

    subgraph RENDERING["Rendering"]
        REWRITE --> LAYOUT["[domain]/layout.tsx<br/>Carga config del tenant"]
        LAYOUT --> CONFIG["GET /api/v1/public/storefront/by-domain/{domain}"]
        CONFIG --> THEME["Inyecta CSS variables<br/>(colores, fuentes)"]
        THEME --> TEMPLATE["templateFactory<br/>Selecciona template"]
        TEMPLATE --> ME["modern-ecommerce"]
        TEMPLATE --> PS["premium"]
        TEMPLATE --> MS["modern-services"]
        TEMPLATE --> BS["beauty"]
    end

    subgraph STATE["Estado Cliente"]
        CART["CartContext<br/>Carrito (localStorage)"]
        CAUTH["AuthContext<br/>Auth de cliente"]
    end
```

---

## Infraestructura de Producción

| Componente | Ubicación | Gestión |
|---|---|---|
| Backend API | VPS 178.156.182.177 | PM2 (`smartkubik-api`) desde `/home/deployer/smartkubik/api/dist/main.js` |
| Admin Frontend | VPS 178.156.182.177 | Archivos estáticos en `~/smartkubik/food-inventory-admin/dist/` |
| Storefront | Vercel (probable) | Deploy automático |
| MongoDB | MongoDB Atlas | Cluster cloud, DB: `test` |
| Redis | Redis Cloud | Colas BullMQ |
| CDN / WAF | Cloudflare | DNS + protección |

**Deploy Backend:**
```bash
npx nest build
rsync dist/ deployer@178.156.182.177:/home/deployer/smartkubik/api/dist/
pm2 reload smartkubik-api
```

**Deploy Frontend:**
```bash
npm run build  # en food-inventory-admin/
rsync dist/ deployer@178.156.182.177:~/smartkubik/food-inventory-admin/dist/
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `app.module.ts`, `App.jsx`, `middleware.ts`*
