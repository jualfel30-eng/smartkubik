# Clientes y CRM — Flujos de Operación

> Última actualización: 2026-04-28

---

## Flujo 1: Registro y Login de Cliente (Storefront)

```mermaid
sequenceDiagram
    participant CL as 🛒 Cliente
    participant ST as 🖥️ Storefront
    participant CS as 👥 CustomersService
    participant DB as 🗄️ MongoDB

    Note over CL,DB: REGISTRO
    CL->>ST: Llena formulario (nombre, email, password)
    ST->>CS: POST /customers/auth/register
    CS->>DB: Busca Customer por email
    alt Email ya existe
        CS-->>ST: Error 409 "Email already registered"
    else Email nuevo
        CS->>CS: Hash password (bcrypt 10 rounds)
        CS->>CS: Genera customerNumber "C000001"
        CS->>DB: Crea Customer (hasStorefrontAccount=true)
        CS->>CS: Genera JWT { type: "customer" }
        CS-->>ST: { token, customer }
    end
    ST-->>CL: Sesión iniciada

    Note over CL,DB: LOGIN
    CL->>ST: Email + Password
    ST->>CS: POST /customers/auth/login
    CS->>DB: Customer.findOne({ email, hasStorefrontAccount: true })
    CS->>CS: bcrypt.compare(password, passwordHash)
    alt Password válido
        CS->>DB: Actualiza lastLoginAt
        CS->>CS: Genera JWT { sub, email, tenantId, type: "customer" }
        CS-->>ST: { token, customer }
    else Password inválido
        CS-->>ST: Error 401
    end
```

---

## Flujo 2: Cálculo de Lealtad RFM

```mermaid
flowchart TD
    TRIGGER["GET /customers<br/>(se ejecuta en cada listado)"] --> LOAD["Carga clientes<br/>con historial de órdenes"]
    
    LOAD --> CALC["Por cada cliente con órdenes"]
    
    CALC --> R["R = 100 / (daysSinceLastPurchase + 1)"]
    CALC --> F["F = totalOrders"]
    CALC --> M["M = Σ(orderAmount × timeDecay)<br/>Órdenes recientes pesan más"]
    
    R --> NORMALIZE["Normalizar cada variable<br/>0-100 vs. todos los clientes"]
    F --> NORMALIZE
    M --> NORMALIZE
    
    NORMALIZE --> SCORE["Score = 0.5×R_norm + 0.3×F_norm + 0.2×M_norm"]
    
    SCORE --> RANK["Rankear todos los clientes"]
    
    RANK --> ASSIGN["Asignar tier por percentil"]
    ASSIGN --> D["Top 5% → 💎 Diamante"]
    ASSIGN --> O["5-20% → 🥇 Oro"]
    ASSIGN --> P["20-50% → 🥈 Plata"]
    ASSIGN --> B["50-100% → 🥉 Bronce"]
    
    D --> PERSIST["Persistir tier y loyaltyScore<br/>si cambiaron"]
    O --> PERSIST
    P --> PERSIST
    B --> PERSIST
    
    PERSIST --> SYNC["LoyaltyService.syncTierFromScore()"]
```

---

## Flujo 3: Auto-Creación de Perfiles según Tipo

```mermaid
flowchart TD
    CREATE["POST /customers<br/>customerType = ?"] --> TYPE{"¿Qué tipo?"}
    
    TYPE -->|"individual / business"| SIMPLE["Crear solo Customer<br/>tier=bronce, métricas=0"]
    
    TYPE -->|"supplier"| SUPPLIER["Crear Customer<br/>+ Auto-crear Supplier vinculado<br/>(supplierNumber, paymentSettings)"]
    
    TYPE -->|"employee"| EMPLOYEE["Crear Customer<br/>+ Auto-crear EmployeeProfile<br/>(EMP-XXXXXX, department, position)"]
    
    TYPE -->|"admin / manager / etc"| ROLE["Crear Customer<br/>con tipo operativo<br/>(para tracking de ventas/comisiones)"]
```

---

## Flujo 4: Pipeline de Ventas (Oportunidades)

```mermaid
flowchart LR
    LEAD["🎯 Lead<br/>(nuevo contacto)"] --> CONTACT["📞 Contactado<br/>(primera interacción)"]
    CONTACT --> PROPOSAL["📋 Propuesta<br/>(cotización enviada)"]
    PROPOSAL --> NEGOC["🤝 Negociación<br/>(discutiendo términos)"]
    NEGOC --> WON["✅ Ganado"]
    NEGOC --> LOST["❌ Perdido"]
    
    NOTE["Etapas configurables<br/>por tenant en Settings → Pipeline"]
```

---

*Última actualización: 2026-04-28*
