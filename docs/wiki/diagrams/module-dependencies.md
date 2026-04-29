# SmartKubik — Grafo de Dependencias entre Módulos

> Mapa de quién importa a quién. ~180 dependencias inter-módulo identificadas.
> Última actualización: 2026-04-28

---

## Vista General de Dependencias (Simplificada)

```mermaid
flowchart LR
    subgraph CORE["🟦 Core"]
        AUTH["Auth"]
        ROLES["Roles"]
        PERMS["Permissions"]
        USERS["Users"]
    end

    subgraph PRODUCTS_INV["🟩 Productos & Inventario"]
        PROD["Products"]
        INV["Inventory"]
        INVMOV["Inventory<br/>Movements"]
        WH["Warehouses"]
        UNITS["Unit Types<br/>& Conversions"]
    end

    subgraph SALES["🟧 Ventas"]
        ORD["Orders"]
        CUST["Customers"]
        PAY["Payments"]
        CASH["Cash Register"]
        DLVR["Delivery"]
        TABLES["Tables"]
    end

    subgraph PURCHASING["🟪 Compras"]
        PURCH["Purchases"]
        SUPP["Suppliers"]
        PAYABLES["Payables"]
    end

    subgraph FINANCE["🟨 Finanzas"]
        ACCT["Accounting"]
        BANK["Bank Accounts"]
        BILLING["Billing"]
        EXRATE["Exchange Rate"]
        RECONCIL["Bank<br/>Reconciliation"]
    end

    subgraph MARKETING_CRM["🟥 Marketing & CRM"]
        MKT["Marketing"]
        PROMO["Promotions"]
        COUP["Coupons"]
        LOYAL["Loyalty"]
        OPP["Opportunities"]
    end

    %% Core dependencies
    AUTH --> ROLES
    AUTH --> PERMS
    ROLES --> PERMS

    %% Products & Inventory
    PROD --> AUTH
    PROD --> INV
    PROD --> PURCH
    PROD --> SUPP
    INV --> AUTH
    INV --> PROD
    INVMOV --> EVENTS

    %% Sales
    ORD --> INV
    ORD --> CUST
    ORD --> ACCT
    ORD --> PAY
    ORD --> DLVR
    ORD --> TABLES
    ORD --> COUP
    ORD --> PROMO
    ORD --> MKT

    %% Purchasing
    PURCH --> PROD
    PURCH --> INV
    PURCH --> CUST
    PURCH --> ACCT
    PURCH --> PAYABLES
    PURCH --> SUPP

    %% Finance
    PAYABLES --> ACCT
    PAYABLES --> EXRATE
    PAY --> ACCT
    PAY --> BANK
    RECONCIL --> BANK
    RECONCIL --> PAY
    BILLING --> EXRATE

    %% Marketing
    MKT --> CUST
    CUST --> LOYAL
    CUST --> ORD
```

---

## Dependencias Detalladas por Dominio

### Core & Seguridad

```mermaid
flowchart LR
    AUTH["🔐 Auth"] --> ROLES["Roles"]
    AUTH --> MAIL["📧 Mail"]
    AUTH --> PERMS["Permissions"]
    AUTH --> MEMBERS["Memberships"]
    ROLES --> PERMS
    
    style AUTH fill:#e3f2fd
    style ROLES fill:#e3f2fd
    style PERMS fill:#e3f2fd
```

**Nota**: AuthModule es importado por ~30 módulos vía `forwardRef()`.

---

### Productos, Inventario y Compras

```mermaid
flowchart TD
    PROD["📦 Products"] -->|forwardRef| AUTH["🔐 Auth"]
    PROD --> PRICEHIST["Price History"]
    PROD --> PRICELIST["Price Lists"]
    PROD -->|forwardRef| CUST["👥 Customers"]
    PROD -->|forwardRef| INV["📊 Inventory"]
    PROD -->|forwardRef| PURCH["🛒 Purchases"]
    PROD -->|forwardRef| SUPP["🏭 Suppliers"]
    PROD -->|forwardRef| OPENAI["🤖 OpenAI"]

    INV -->|forwardRef| AUTH
    INV -->|forwardRef| EVENTS["⚡ Events"]
    INV -->|forwardRef| PROD

    PURCH -->|forwardRef| AUTH
    PURCH -->|forwardRef| CUST
    PURCH -->|forwardRef| PROD
    PURCH -->|forwardRef| INV
    PURCH -->|forwardRef| ACCT["💰 Accounting"]
    PURCH -->|forwardRef| PAYABLES["📋 Payables"]
    PURCH -->|forwardRef| EVENTS
    PURCH -->|forwardRef| SUPP
    PURCH -->|forwardRef| OPENAI

    SUPP -->|forwardRef| AUTH

    style PROD fill:#c8e6c9
    style INV fill:#c8e6c9
    style PURCH fill:#ce93d8
```

**Circular dependencies (forwardRef)**: Products ↔ Inventory ↔ Purchases ↔ Customers forman un ciclo de dependencias resuelto con `forwardRef()`.

---

### Ventas y Órdenes

```mermaid
flowchart TD
    ORD["🛍️ Orders"] -->|forwardRef| AUTH["🔐 Auth"]
    ORD --> INV["📊 Inventory"]
    ORD -->|forwardRef| CUST["👥 Customers"]
    ORD --> ACCT["💰 Accounting"]
    ORD --> PAY["💳 Payments"]
    ORD --> DLVR["🚚 Delivery"]
    ORD --> SHIFTS["⏰ Shifts"]
    ORD --> EXRATE["💱 Exchange Rate"]
    ORD --> TXHIST["📜 Transaction History"]
    ORD --> COUP["🎫 Coupons"]
    ORD --> PROMO["🏷️ Promotions"]
    ORD -->|forwardRef| MKT["📢 Marketing"]
    ORD --> TABLES["🍽️ Tables"]
    ORD --> PRICELISTS["📋 Price Lists"]

    style ORD fill:#ffe0b2
```

**Orders es el módulo con más dependencias directas** (15 imports).

---

### Finanzas

```mermaid
flowchart TD
    ACCT["💰 Accounting<br/>(standalone)"]
    
    PAY["💳 Payments"] -->|forwardRef| ACCT
    PAY -->|forwardRef| BANK["🏦 Bank Accounts"]
    PAY -->|forwardRef| OPP["🎯 Opportunities"]

    BANK -->|forwardRef| AUTH["🔐 Auth"]
    BANK --> PERMS["Permissions"]
    BANK -->|forwardRef| EVENTS["⚡ Events"]

    RECONCIL["🔄 Reconciliation"] --> BANK
    RECONCIL --> PAY

    PAYABLES["📋 Payables"] --> ACCT
    PAYABLES --> EVENTS
    PAYABLES --> EXRATE["💱 Exchange Rate"]

    BILLING["📄 Billing"] --> EXRATE
    BILLING -->|forwardRef| CHAT["💬 Chat"]

    LIQUID["💧 Liquidations"] --> ACCT
    LIQUID --> PAY
    LIQUID --> EXRATE
    LIQUID --> EVENTS

    style ACCT fill:#fff9c4
    style PAY fill:#fff9c4
    style BANK fill:#fff9c4
```

**Accounting** no importa otros módulos — es un módulo base que muchos otros consumen.

---

### Nómina

```mermaid
flowchart TD
    PAYROLL["💼 Payroll<br/>(umbrella)"] --> RUNS["PayrollRuns"]
    PAYROLL --> STRUCTS["PayrollStructures"]
    PAYROLL --> CALENDAR["PayrollCalendar"]
    PAYROLL --> ABSENCES["PayrollAbsences"]

    RUNS --> ACCT["💰 Accounting"]
    RUNS --> EVENTS["⚡ Events"]
    RUNS --> EXRATE["💱 Exchange Rate"]
    RUNS --> PAY["💳 Payments"]
    RUNS --> NOTIF["🔔 Notifications"]
    RUNS --> MAIL["📧 Mail"]
    RUNS --> WEBHOOKS["Payroll Webhooks"]
    RUNS --> TIPS["💵 Tips"]
    RUNS --> COMM["🎯 Commissions"]

    CALENDAR --> EVENTS
    CALENDAR --> NOTIF

    EMPLOYEES["👤 Payroll Employees"] --> NOTIF

    style PAYROLL fill:#f3e5f5
```

---

### Servicios, Beauty y Hospitality

```mermaid
flowchart TD
    APPT["📅 Appointments"] --> BANK["🏦 Bank Accounts"]
    APPT --> ACCT["💰 Accounting"]
    APPT -->|forwardRef| NOTIF["🔔 Notifications"]
    APPT -->|forwardRef| WHAPI["💬 Whapi"]
    APPT -->|forwardRef| HOSP["🏨 Hospitality"]

    BEAUTY["💅 Beauty"] --> NOTIFCTR["📢 Notification Center"]
    BEAUTY --> CASH["💰 Cash Register"]
    BEAUTY --> COMM["🎯 Commissions"]

    SVCPKG["📦 Service Packages"] -->|forwardRef| APPT
    SVCPKG -->|forwardRef| LOYAL["⭐ Loyalty"]

    HOSP -->|forwardRef| APPT
    HOSP -->|forwardRef| CUST["👥 Customers"]

    style APPT fill:#b2dfdb
    style BEAUTY fill:#f8bbd0
```

---

### IA y Asistente

```mermaid
flowchart TD
    ASST["🤖 Assistant"] --> KB["📚 Knowledge Base"]
    ASST --> OPENAI["OpenAI"]
    ASST --> APPT["📅 Appointments"]
    ASST --> EXRATE["💱 Exchange Rate"]
    ASST -->|forwardRef| ORD["🛍️ Orders"]
    ASST --> DASH["📊 Dashboard"]
    ASST --> INV["📊 Inventory"]
    ASST --> ANALYTICS["📈 Analytics"]
    ASST --> INTEL["🧠 Intelligence"]
    ASST -->|forwardRef| SUPP["Suppliers"]
    ASST -->|forwardRef| PROD["Products"]
    ASST -->|forwardRef| PURCH["Purchases"]
    ASST -->|forwardRef| SADMIN["Super Admin"]

    KB --> OPENAI
    KB --> VECTORDB["Vector DB"]

    VECTORDB --> OPENAI
    VECTORDB -->|forwardRef| SADMIN

    INTEL --> WHAPI["💬 Whapi"]

    style ASST fill:#e1bee7
```

**Assistant** es el módulo con más imports (14) — necesita acceder a casi todo el sistema para responder preguntas.

---

## Resumen de forwardRef (Dependencias Circulares)

| Par Circular | Razón |
|---|---|
| Auth ↔ ~30 módulos | Todos necesitan auth, auth necesita validar contra otros |
| Products ↔ Inventory | Productos consultan stock, inventario necesita datos de producto |
| Products ↔ Purchases | Productos muestran historial de compra, compras referencian productos |
| Products ↔ Customers | Productos muestran proveedores, clientes son proveedores |
| Orders ↔ Customers | Órdenes referencian clientes, clientes muestran historial de órdenes |
| Orders ↔ Marketing | Órdenes disparan campañas, marketing consulta órdenes |
| Notifications ↔ Mail | Notificaciones envían mail, mail depende de notificaciones |
| Notifications ↔ Customers | Notificaciones van a clientes, clientes tienen preferencias de notif |
| SuperAdmin ↔ ~25 módulos | Super admin accede a todo, algunos módulos consultan config global |
| Appointments ↔ Hospitality | Citas y hospitality se referencian mutuamente |

---

## Módulos Sin Dependencias (Hojas)

Estos módulos no importan otros módulos de negocio (solo infraestructura):

- Permissions, Users, Shifts, Tables, Delivery, ExchangeRate, CashRegister, UnitTypes
- KitchenDisplay, WaitList, BinancePay, DataImport, Reviews, AuditLog
- SecurityMonitoring, ServerPerformance, BusinessLocations, Drivers
- OpportunityStages, Activities, PayrollAbsences, PayrollStructures
- PayrollReports, PayrollLocalizations, PayrollWebhooks, ProductDedup
- ModifierGroups, BillSplits, SocialLinks, RestaurantStorefront

---

*Última actualización: 2026-04-28*
*Fuente: Análisis de todos los archivos `*.module.ts` en `food-inventory-saas/src/`*
