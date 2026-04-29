# Transferencias y Almacenes — Flujos de Operación

> Diagramas de los flujos PUSH, PULL, Express y Cross-Tenant.
> Última actualización: 2026-04-28

---

## Flujo 1: Transferencia PUSH Completa

### Descripción
El almacén de origen inicia y gestiona todo el proceso.

```mermaid
sequenceDiagram
    participant O as 👤 Almacenero Origen
    participant F as 🖥️ Frontend
    participant TS as 🔄 TransferService
    participant IS as 📊 InventoryService
    participant DB as 🗄️ MongoDB

    O->>F: Crea orden de transferencia
    F->>TS: POST /transfer-orders
    TS->>DB: Guarda (status=DRAFT, type=push)

    O->>F: Solicita aprobación
    F->>TS: POST /:id/request
    TS->>DB: status → PUSH_REQUESTED

    O->>F: Aprueba (puede ajustar cantidades)
    F->>TS: POST /:id/approve
    TS->>DB: status → PUSH_APPROVED

    O->>F: Marca en preparación
    F->>TS: POST /:id/prepare
    TS->>DB: status → IN_PREPARATION

    O->>F: Despacha mercancía
    F->>TS: POST /:id/dispatch

    rect rgb(255, 230, 230)
        Note over TS,DB: ⚡ OPERACIÓN IRREVERSIBLE
        loop Por cada item
            TS->>TS: baseQty = qty × conversionFactor
            TS->>DB: Busca inventario en almacén origen
            TS->>TS: Verifica stock suficiente
            TS->>DB: Decrementa inventario origen
            TS->>DB: Crea movimiento TRANSFER OUT
        end
    end
    TS->>DB: status → IN_TRANSIT

    Note over O,DB: DESTINO RECIBE
    participant D as 👤 Almacenero Destino
    D->>F: Confirma recepción (cantidades por item)
    F->>TS: POST /:id/receive

    rect rgb(230, 255, 230)
        loop Por cada item recibido
            TS->>DB: Busca/crea inventario en destino
            TS->>DB: Incrementa inventario destino
            TS->>DB: Crea movimiento TRANSFER IN
        end
    end

    alt Todo coincide
        TS->>DB: status → RECEIVED
    else Hay faltantes
        TS->>DB: status → PARTIALLY_RECEIVED
        TS->>DB: Auto-genera discrepancias
    end
```

---

## Flujo 2: Transferencia PULL (Destino Solicita)

```mermaid
sequenceDiagram
    participant D as 👤 Almacenero Destino
    participant O as 👤 Almacenero Origen
    participant TS as 🔄 TransferService
    participant DB as 🗄️ MongoDB

    D->>TS: POST /transfer-orders/requests
    TS->>DB: Guarda (status=DRAFT, type=pull)

    D->>TS: POST /:id/submit
    TS->>DB: status → PULL_REQUESTED

    Note over O: Origen revisa la solicitud

    alt Origen aprueba
        O->>TS: POST /:id/approve-request
        TS->>DB: status → PULL_APPROVED
        Note over O: Puede ajustar cantidades aprobadas
        
        O->>TS: POST /:id/prepare
        TS->>DB: status → IN_PREPARATION
        
        O->>TS: POST /:id/dispatch
        Note over TS: Descuenta inventario origen
        TS->>DB: status → IN_TRANSIT
        
        D->>TS: POST /:id/receive
        Note over TS: Incrementa inventario destino
    else Origen rechaza
        O->>TS: POST /:id/reject-request
        TS->>DB: status → PULL_REJECTED (terminal)
    end
```

---

## Flujo 3: Despacho Express

```mermaid
flowchart TD
    START["Usuario crea transferencia<br/>con 'Enviar Ahora'"] --> CREATE["POST /transfer-orders<br/>→ DRAFT"]
    CREATE --> REQ["POST /:id/request<br/>→ PUSH_REQUESTED"]
    REQ --> APR["POST /:id/approve<br/>→ PUSH_APPROVED"]
    APR --> PREP["POST /:id/prepare<br/>→ IN_PREPARATION"]
    PREP --> SHIP["POST /:id/dispatch<br/>→ IN_TRANSIT"]
    
    SHIP --> SUCCESS["✅ Mercancía despachada<br/>Inventario descontado"]
    
    REQ -.->|"Si falla"| STOP1["Orden queda en<br/>PUSH_REQUESTED"]
    APR -.->|"Si falla"| STOP2["Orden queda en<br/>PUSH_APPROVED"]
    PREP -.->|"Si falla"| STOP3["Orden queda en<br/>IN_PREPARATION"]
    SHIP -.->|"Si falla"| STOP4["Orden queda en<br/>IN_PREPARATION"]
```

---

## Flujo 4: Transferencia Cross-Tenant

### Descripción
Dos sedes que son tenants diferentes en la misma organización.

```mermaid
sequenceDiagram
    participant T1 as 🏢 Tenant Origen
    participant TS as 🔄 TransferService
    participant T2 as 🏢 Tenant Destino
    participant DB as 🗄️ MongoDB

    T1->>TS: Crea orden (destinationTenantId = T2)
    TS->>TS: Valida: T1 y T2 en misma org family
    TS->>DB: Guarda con sourceTenantId=T1, destinationTenantId=T2

    Note over T1,T2: Flujo normal hasta dispatch...

    T1->>TS: Dispatch
    TS->>DB: Descuenta inventario de T1

    T2->>TS: Receive
    Note over TS: Busca producto en T2 por SKU<br/>(los ObjectIds son diferentes entre tenants)
    TS->>DB: Crea/actualiza inventario en T2
    
    Note over TS: El transferId (UUID) vincula<br/>los movimientos OUT (T1) e IN (T2)
```

---

## Flujo 5: Conversión Multi-Unidad en Dispatch

```mermaid
flowchart TD
    ITEM["Item: 10 kg de Chía<br/>selectedUnit='kg'<br/>conversionFactor=0.04"] --> CONVERT["baseQty = 10 × 0.04 = 0.4 sacos"]
    
    CONVERT --> LOOKUP["Busca inventario:<br/>productId (3 formatos)<br/>warehouseId origen"]
    
    LOOKUP --> FOUND{"¿Encontrado?"}
    FOUND -->|"Sí"| CHECK{"¿availableQty ≥ 0.4?"}
    FOUND -->|"No"| FALLBACK["Busca sin warehouseId<br/>(registros antiguos)"]
    FALLBACK --> ASSIGN["Si encuentra: asigna warehouseId<br/>para consistencia futura"]
    ASSIGN --> CHECK
    
    CHECK -->|"Sí"| DEDUCT["availableQty -= 0.4<br/>totalQty -= 0.4"]
    CHECK -->|"No"| ERROR["❌ Stock insuficiente"]
    
    DEDUCT --> MOVEMENT["Crea InventoryMovement<br/>type: TRANSFER<br/>qty: 0.4 sacos<br/>reason: 'Transfer 10 kg'"]
```

---

## Flujo 6: Detección Automática de Discrepancias

```mermaid
flowchart TD
    RECEIVE["Recibir: item X<br/>shipped=10, received=8"] --> COMPARE{"received < shipped?"}
    
    COMPARE -->|"Sí"| DISC["Auto-crear discrepancia:<br/>expected: 10<br/>received: 8<br/>reason: 'Faltante: 2 unidades'"]
    COMPARE -->|"No"| OK["Item OK"]
    
    DISC --> FLAG["hasDiscrepancies = true"]
    
    FLAG --> STATUS{"¿Todos los items<br/>recibidos completos?"}
    STATUS -->|"Sí"| RECEIVED["status → RECEIVED"]
    STATUS -->|"No"| PARTIAL["status → PARTIALLY_RECEIVED"]
    
    PARTIAL --> REPORT["El destino puede reportar<br/>discrepancias adicionales<br/>con fotos de evidencia"]
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `transfer-orders.service.ts`, `transfer-orders.controller.ts`*
