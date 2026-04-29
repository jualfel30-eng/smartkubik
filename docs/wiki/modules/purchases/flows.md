# Compras y Proveedores — Flujos de Operación

> Diagramas de los flujos principales del ciclo de compras.
> Última actualización: 2026-04-28

---

## Flujo 1: Ciclo Completo de una Orden de Compra

### Descripción
El flujo más importante del módulo: desde que se crea la PO hasta que la mercancía se recibe y el inventario se actualiza.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Comprador
    participant F as 🖥️ Frontend
    participant PS as 🛒 PurchasesService
    participant SS as 🏭 SuppliersService
    participant IS as 📊 InventoryService
    participant PA as 📋 PayablesService
    participant AS as 💰 AccountingService
    participant DB as 🗄️ MongoDB

    Note over U,DB: FASE 1: Crear Orden de Compra
    U->>F: Selecciona proveedor + agrega productos
    F->>PS: POST /purchases
    PS->>PS: Resuelve proveedor (existente o nuevo)
    PS->>PS: Genera poNumber (OC-YYMMDD-HHMMSS-XXXXXX)
    PS->>DB: Guarda PO con status="pending"
    PS->>SS: syncFromPurchaseOrder() [async, no bloqueante]
    PS-->>F: PO creada

    Note over U,DB: FASE 2: Aprobar (opcional)
    U->>F: Clic "Aprobar"
    F->>PS: PATCH /purchases/:id/approve
    PS->>DB: status → "approved", approvedBy, approvedAt
    PS-->>F: PO aprobada

    Note over U,DB: FASE 3: Recibir Mercancía (⭐ CRÍTICO)
    U->>F: Cambia status a "Recibido" + califica proveedor
    F->>PS: PATCH /purchases/:id/receive

    rect rgb(230, 245, 230)
        Note over PS,IS: 3a. Actualizar Inventario
        loop Por cada item de la PO
            PS->>IS: addStockFromPurchase(item)
            IS->>DB: Crea/actualiza Inventory + InventoryMovement
        end
    end

    rect rgb(230, 230, 245)
        Note over PS,SS: 3b. Vincular Productos
        loop Por cada item
            PS->>SS: linkProductToSupplier(productId, supplierId)
            SS->>DB: Actualiza Product.suppliers[]
        end
    end

    rect rgb(245, 230, 230)
        Note over PS,PA: 3c. Crear Cuentas por Pagar
        PS->>AS: findOrCreateAccount("1103", "Inventario")
        alt Sin adelanto
            PS->>PA: create(payable: totalAmount)
        else Con adelanto
            PS->>PA: create(payable1: adelanto)
            PS->>PA: create(payable2: saldo)
        end
    end

    PS->>DB: status → "received", receivedDate, history[]
    PS-->>F: PO recibida
    F-->>U: Celebración + actualización de tabla
```

---

## Flujo 2: Transiciones de Estado de una PO

```mermaid
stateDiagram-v2
    [*] --> pending : Crear PO
    [*] --> draft : Auto-generar PO

    pending --> approved : Aprobar ✅
    pending --> rejected : Rechazar ❌
    pending --> received : Recibir directamente

    draft --> approved : Aprobar ✅
    draft --> rejected : Rechazar ❌
    draft --> received : Recibir directamente

    approved --> received : Recibir mercancía 📦

    received --> [*] : Fin ✔️
    rejected --> [*] : Fin ✖️
```

**Notas**:
- Una PO puede ir directamente de `pending` a `received` (sin pasar por `approved`)
- `rejected` es un estado final — no se puede revertir
- `cancelled` existe en el schema pero no tiene implementación de transición

---

## Flujo 3: Escaneo de Factura con IA

```mermaid
sequenceDiagram
    participant U as 👤 Comprador
    participant F as 🖥️ Frontend
    participant PS as 🛒 PurchasesService
    participant AI as 🤖 GPT-4o-mini
    participant SS as 🏭 SuppliersService
    participant DB as 🗄️ MongoDB

    U->>F: Toma foto de factura
    F->>PS: POST /purchases/scan-invoice (multipart)

    PS->>PS: Comprime imagen (sharp: 1600×2200, JPEG 75%)
    PS->>AI: Vision API con prompt de extracción

    AI-->>PS: JSON: { supplier, items[], totals, payment }

    rect rgb(230, 245, 230)
        Note over PS,SS: Match de proveedor
        PS->>SS: findAll(tenantId, rif)
        alt Match por RIF
            SS-->>PS: Supplier (confianza: 95%)
        else Match por nombre
            PS->>SS: findAll(tenantId, companyName)
            SS-->>PS: Supplier (confianza: 70%)
        else Sin match
            PS-->>PS: confianza: 0%
        end
    end

    rect rgb(230, 230, 245)
        Note over PS,DB: Match de productos
        loop Por cada item extraído
            PS->>DB: Busca Product por SKU o nombre
            alt Match por SKU → 95%
            else Match por nombre → 70%
            else Sin match → 0%
            end
        end
    end

    PS->>PS: Calcula confianza global (0-100%)
    PS-->>F: Datos pre-llenados + confianza
    F-->>U: Formulario pre-llenado (verde ≥80%, amarillo 50-79%, rojo <50%)
```

---

## Flujo 4: Patrón Dual Customer ↔ Supplier

### Descripción
Cómo funciona la creación de un proveedor con sus dos perfiles vinculados.

```mermaid
sequenceDiagram
    participant U as 👤 Admin
    participant SS as 🏭 SuppliersService
    participant DB as 🗄️ MongoDB

    U->>SS: create({ name: "Polar", rif: "J-123", contactName: "Juan" })

    rect rgb(230, 245, 230)
        Note over SS,DB: Paso 1: Buscar/Crear Customer
        SS->>SS: normalizeRif("J-123") → "J-123"
        SS->>DB: Customer.findOne({ "taxInfo.taxId": "J-123", tenantId })
        alt Customer existe
            DB-->>SS: Customer existente
        else No existe
            SS->>DB: Customer.create({<br/>name: "Juan",<br/>companyName: "Polar",<br/>customerType: "supplier",<br/>taxInfo: { taxId: "J-123" },<br/>contacts: [{ name: "Juan", type: "phone", value: ... }]<br/>})
            DB-->>SS: Nuevo Customer
        end
    end

    rect rgb(245, 230, 230)
        Note over SS,DB: Paso 2: Verificar Duplicado
        SS->>DB: Supplier.findOne({ $or: [{ "taxInfo.rif": "J-123" }, { customerId: customer._id }] })
        alt Supplier existe
            DB-->>SS: Retorna existente (idempotente)
        else No existe
            Note over SS: Paso 3: Crear Supplier
            SS->>SS: generateSupplierNumber() → "PROV-000018"
            SS->>DB: Supplier.create({<br/>supplierNumber: "PROV-000018",<br/>customerId: customer._id,<br/>name: "Polar",<br/>taxInfo: { rif: "J-123" },<br/>supplierType: "distributor"<br/>})
        end
    end

    SS-->>U: Supplier mapeado (datos de Customer + Supplier)
```

---

## Flujo 5: Sincronización de Config de Pago

### Descripción
Cuando se actualizan las condiciones de pago de un proveedor, los cambios se propagan a todos los productos vinculados.

```mermaid
flowchart TD
    TRIGGER["Actualizar Supplier<br/>paymentSettings"] --> INFER["Inferir moneda de pago<br/>zelle → USD_PARALELO<br/>pago_movil → VES<br/>transferencia_int → USD"]
    
    INFER --> SYNC["syncPaymentConfigToProducts()"]
    
    SYNC --> QUERY["MongoDB updateMany()<br/>WHERE tenantId AND Product.suppliers[].supplierId = X"]
    
    QUERY --> UPDATE["Actualiza en cada producto:<br/>• paymentCurrency<br/>• preferredPaymentMethod<br/>• acceptedPaymentMethods<br/>• usesParallelRate<br/>• paymentConfigSyncedAt"]
    
    UPDATE --> PRICING["Motor de Precios puede<br/>agrupar productos por moneda<br/>para actualización masiva"]
```

---

## Flujo 6: Auto-Generación de POs

```mermaid
flowchart TD
    START["POST /purchases/auto-generate<br/>o Cron 2AM (desactivado)"] --> ALERTS["inventoryService.getLowStockAlerts()"]
    
    ALERTS --> FILTER["Filtrar productos<br/>stock < minimumStock"]
    
    FILTER --> GROUP["Agrupar por proveedor preferido<br/>(Product.suppliers[].isPreferred)"]
    
    GROUP --> CALC["Calcular cantidad por producto:<br/>max(minimumStock - currentQty,<br/>supplier.MOQ || 1)"]
    
    CALC --> PO["Crear PO por proveedor<br/>status: draft<br/>autoGenerated: true"]
    
    PO --> EVENT["Crear evento:<br/>PO Auto-generada: OC-XXXX"]
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `purchases.service.ts`, `suppliers.service.ts`*
