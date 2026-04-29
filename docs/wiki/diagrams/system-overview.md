# SmartKubik — Vista General del Sistema

> Diagramas panorámicos de la plataforma SmartKubik.
> Última actualización: 2026-04-28

---

## Diagrama de Componentes

```mermaid
flowchart TB
    subgraph INTERNET["🌐 Internet"]
        BROWSER["🖥️ Navegador"]
        PHONE["📱 Móvil (PWA)"]
        WHATSAPP["💬 WhatsApp"]
    end

    subgraph CLOUDFLARE["☁️ Cloudflare"]
        DNS["DNS + WAF"]
    end

    subgraph VPS["🖥️ VPS (178.156.182.177)"]
        subgraph FRONTEND["Admin Frontend"]
            REACT["React 18 + Vite<br/>Archivos estáticos<br/>~603 componentes"]
        end

        subgraph API["Backend API"]
            NEST["NestJS<br/>PM2: smartkubik-api<br/>114 módulos<br/>~1,257 endpoints"]
        end
    end

    subgraph VERCEL["▲ Vercel"]
        NEXT["Next.js 15<br/>Storefront Público<br/>4 templates"]
    end

    subgraph CLOUD_SERVICES["☁️ Servicios Cloud"]
        ATLAS[("🍃 MongoDB Atlas<br/>DB: test<br/>173 colecciones")]
        REDIS_CLOUD[("🔴 Redis Cloud<br/>Colas BullMQ")]
    end

    subgraph INTEGRATIONS["🔌 Integraciones"]
        OPENAI_API["🤖 OpenAI API"]
        WHAPI_API["💬 Whapi.cloud"]
        RESEND_API["📧 Resend"]
        BINANCE_API["💰 Binance Pay"]
        GOOGLE_API["📍 Google Places"]
    end

    BROWSER --> DNS
    PHONE --> DNS
    WHATSAPP --> WHAPI_API

    DNS --> REACT
    DNS --> API
    DNS --> NEXT

    NEXT -->|"API pública<br/>/api/v1/public/*"| API
    REACT -->|"API autenticada<br/>Bearer + x-tenant-id"| API

    API --> ATLAS
    API --> REDIS_CLOUD
    API --> OPENAI_API
    API --> WHAPI_API
    API --> RESEND_API
    API --> BINANCE_API
    NEXT --> GOOGLE_API
```

---

## Mapa de Dominios Funcionales

```mermaid
mindmap
  root((SmartKubik))
    🛒 Ventas
      Órdenes / POS
      Fulfillment
      Delivery / Drivers
      Mesas (Restaurante)
      Cocina KDS
      Storefront Público
    📦 Inventario
      Productos
      Stock / Movimientos
      Almacenes
      Transferencias
      Mermas
      Unidades de Medida
    🏭 Compras
      Órdenes de Compra
      Proveedores
      Recepción de Mercancía
    💰 Finanzas
      Contabilidad
      Facturación
      Cuentas por Pagar
      Cuentas por Cobrar
      Bancos / Conciliación
      Caja Registradora
      Activos Fijos
      Inversiones
    👥 CRM
      Clientes / Contactos
      Pipeline de Ventas
      Oportunidades
      Actividades
      Playbooks
    📢 Marketing
      Campañas Multi-canal
      Promociones
      Cupones
      Programa de Lealtad
      Newsletter / Bio Links
    📅 Servicios
      Citas
      Servicios / Paquetes
      Profesionales / Recursos
      Beauty Salon
      Hospitality
    🏗️ Producción
      Bill of Materials
      Órdenes de Manufactura
      MRP
      Centros de Trabajo
      Control de Calidad
    👔 RRHH
      Empleados / Contratos
      Nómina
      Turnos
      Comisiones / Propinas
      Calendario / Ausencias
    🤖 IA
      Asistente Conversacional
      Knowledge Base
      Business Intelligence
      Notificaciones Proactivas
    🔧 Infraestructura
      Auth / Roles / Permisos
      Multi-tenancy
      Feature Flags
      Auditoría / Seguridad
      Onboarding
      Super Admin
```

---

## Flujo de Datos Principal

```mermaid
flowchart LR
    subgraph ENTRADA["📥 Entrada de Datos"]
        COMPRA["Compra a Proveedor"]
        IMPORT["Importación Masiva"]
        MANUAL["Ajuste Manual"]
        PRODUCCION["Producción"]
    end

    subgraph CORE_DATA["📦 Datos Core"]
        PRODUCTO["Producto"]
        INVENTARIO["Inventario"]
        CLIENTE["Cliente"]
    end

    subgraph SALIDA["📤 Salida de Datos"]
        VENTA["Venta / Orden"]
        TRANSFER["Transferencia"]
        MERMA["Merma"]
    end

    subgraph FINANZAS["💰 Registro Financiero"]
        ASIENTO["Asiento Contable"]
        FACTURA["Factura"]
        CXP["Cuenta por Pagar"]
        CXC["Cuenta por Cobrar"]
        PAGO["Pago"]
    end

    subgraph ANALYTICS["📊 Análisis"]
        DASHBOARD["Dashboard KPIs"]
        REPORTS["Reportes"]
        BI["BI Proactivo"]
    end

    COMPRA -->|"Recepción"| INVENTARIO
    IMPORT --> PRODUCTO
    MANUAL --> INVENTARIO
    PRODUCCION -->|"Consume materias primas<br/>Produce producto terminado"| INVENTARIO

    PRODUCTO --> INVENTARIO
    CLIENTE --> VENTA

    VENTA -->|"Descuenta stock"| INVENTARIO
    TRANSFER -->|"Mueve entre almacenes"| INVENTARIO
    MERMA -->|"Reduce stock"| INVENTARIO

    COMPRA --> ASIENTO
    COMPRA --> CXP
    VENTA --> ASIENTO
    VENTA --> CXC
    VENTA --> FACTURA
    CXP --> PAGO
    CXC --> PAGO
    PAGO --> ASIENTO

    INVENTARIO --> DASHBOARD
    VENTA --> DASHBOARD
    ASIENTO --> REPORTS
    INVENTARIO --> BI
    VENTA --> BI
```

---

## Patrones de Comunicación

### Frontend → Backend

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant F as 🖥️ Frontend (React)
    participant API as ⚙️ Backend (NestJS)
    participant DB as 🗄️ MongoDB

    U->>F: Acción en UI
    F->>F: fetchApi() prepara request
    F->>API: HTTP + Bearer token + x-tenant-id
    API->>API: ThrottlerGuard → JwtGuard → TenantGuard → PermissionsGuard
    API->>API: Controller valida DTO
    API->>API: Service ejecuta lógica
    API->>DB: Mongoose query (filtrado por tenantId)
    DB-->>API: Resultado
    API-->>F: { success, data, pagination? }
    F-->>U: Actualiza UI
```

### Storefront → Backend

```mermaid
sequenceDiagram
    participant C as 🛒 Cliente
    participant S as 🖥️ Storefront (Next.js)
    participant MW as Middleware
    participant API as ⚙️ Backend
    participant DB as 🗄️ MongoDB

    C->>S: Visita tienda.smartkubik.com
    S->>MW: Detecta dominio "tienda"
    MW->>MW: Rewrite URL → /[domain]/path
    S->>API: GET /api/v1/public/storefront/by-domain/tienda
    API->>DB: Busca StorefrontConfig por dominio
    DB-->>API: Config + tema + template
    API-->>S: StorefrontConfig
    S->>S: Inyecta CSS variables + selecciona template
    S-->>C: Página renderizada con tema del tenant
```

---

## Verticales y Módulos Habilitados

```mermaid
flowchart TD
    subgraph VERTICALS["Verticales"]
        FOOD["🍔 Food/Retail"]
        REST["🍽️ Restaurant"]
        BEAUTY_V["💅 Beauty"]
        HOSP["🏨 Hospitality"]
        MFG["🏭 Manufacturing"]
        SVC["🔧 Services"]
    end

    subgraph MODULES["Módulos"]
        INV["Inventario"]
        ORD["Órdenes"]
        POS["POS"]
        TABLES_M["Mesas"]
        KDS["Cocina KDS"]
        RECIPES["Recetas"]
        MENU_ENG["Ing. de Menú"]
        APPT["Citas"]
        BEAUTY_M["Beauty"]
        ROOMS["Habitaciones"]
        BOM["BOM"]
        MRP_M["MRP"]
        QC["Control Calidad"]
        PAYROLL_M["Nómina"]
        MKT_M["Marketing"]
        ECOMM["Storefront"]
    end

    FOOD --> INV
    FOOD --> ORD
    FOOD --> POS
    FOOD --> ECOMM

    REST --> INV
    REST --> ORD
    REST --> TABLES_M
    REST --> KDS
    REST --> RECIPES
    REST --> MENU_ENG

    BEAUTY_V --> APPT
    BEAUTY_V --> BEAUTY_M

    HOSP --> APPT
    HOSP --> ROOMS

    MFG --> INV
    MFG --> BOM
    MFG --> MRP_M
    MFG --> QC

    SVC --> APPT
    SVC --> ECOMM
```

---

*Última actualización: 2026-04-28*
