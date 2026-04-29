# Inventario — Flujos de Operación

> Diagramas de secuencia para los flujos principales del módulo de Inventario.
> Última actualización: 2026-04-28

---

## Flujo 1: Recepción de Mercancía (desde Compras)

### Descripción
Cuando se recibe una orden de compra, el stock se incrementa automáticamente.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Almacenero
    participant F as 🖥️ Frontend
    participant PCS as 🛒 PurchasesService
    participant IS as 📊 InventoryService
    participant AS as 🔔 AlertsService
    participant DB as 🗄️ MongoDB

    U->>F: Clic "Recibir Orden" en compra PO-0042
    F->>PCS: PATCH /purchases/:id/receive
    PCS->>PCS: Valida PO existe y status=approved

    loop Por cada item de la PO
        PCS->>IS: addStockFromPurchase(item, user, session)
        IS->>DB: Busca Inventory por productId + tenantId
        alt Inventario no existe
            IS->>DB: getDefaultWarehouse(tenantId)
            IS->>DB: Crea nuevo Inventory
        else Inventario existe
            IS->>IS: Recalcula costo promedio ponderado
            IS->>DB: Incrementa totalQuantity + availableQuantity
        end
        IS->>DB: Crea InventoryMovement tipo "in"
        IS->>DB: Actualiza variant.costPrice en Product
        IS->>AS: evaluateForInventory(inventory)
    end

    PCS->>DB: Actualiza PO status → "received"
    PCS-->>F: { success: true }
    F-->>U: "Orden recibida — stock actualizado"
```

### Desglose

| Paso | Quién | Qué pasa |
|---|---|---|
| 1 | PurchasesService | Valida que la PO exista y esté aprobada |
| 2 | InventoryService | Busca inventario existente por `productId` (NO por SKU) |
| 3 | InventoryService | Si no existe, crea inventario con warehouse por defecto |
| 4 | InventoryService | Si existe, suma cantidad y recalcula costo promedio |
| 5 | InventoryService | Crea movimiento IN con referencia a la PO |
| 6 | InventoryService | Sincroniza costo de variante en el Product |
| 7 | AlertsService | Evalúa reglas de alerta (¿salió de stock bajo?) |

---

## Flujo 2: Reserva → Venta → Descuento (Ciclo de Orden)

### Descripción
El ciclo completo de cómo una venta afecta el inventario: reserva al crear la orden, y descuento al completarla.

### Diagrama

```mermaid
sequenceDiagram
    participant POS as 💳 POS / Cajero
    participant OS as 🛍️ OrdersService
    participant IS as 📊 InventoryService
    participant DB as 🗄️ MongoDB

    Note over POS,DB: Paso 1: Crear Orden → Reservar Stock
    POS->>OS: POST /orders (items: [{productId, qty}])
    OS->>IS: reserveInventory({ items, orderId })
    loop Por cada item
        IS->>DB: Busca Inventory por productSku/variantSku
        IS->>IS: Verifica availableQuantity >= qty
        IS->>DB: availableQuantity -= qty
        IS->>DB: reservedQuantity += qty
        Note over IS: Si FEFO: reserva lotes más próximos a vencer
    end
    OS->>DB: Crea Order con status="pending"
    OS-->>POS: Orden creada

    Note over POS,DB: Paso 2: Completar Orden → Confirmar Stock
    POS->>OS: PATCH /orders/:id/complete
    OS->>IS: commitInventory(order, user)
    loop Por cada item
        IS->>DB: reservedQuantity -= qty
        IS->>DB: totalQuantity -= qty
        IS->>DB: Crea InventoryMovement tipo "out"
    end
    OS-->>POS: Orden completada

    Note over POS,DB: Alt: Cancelar Orden → Liberar Stock
    POS->>OS: PATCH /orders/:id/cancel
    OS->>IS: releaseInventory({ orderId })
    IS->>DB: reservedQuantity -= qty
    IS->>DB: availableQuantity += qty
```

---

## Flujo 3: Ajuste Manual de Inventario

### Descripción
Un almacenero detecta que la cantidad real de un producto no coincide con el sistema y la corrige.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Almacenero
    participant F as 🖥️ Frontend
    participant IS as 📊 InventoryService
    participant AS as 🔔 AlertsService
    participant DB as 🗄️ MongoDB

    U->>F: Clic +/- en fila del producto
    U->>F: Ingresa cantidad y razón "Conteo físico"
    F->>IS: POST /inventory/adjust

    IS->>DB: Busca Inventory por inventoryId
    IS->>IS: Calcula diferencia = newQuantity - oldQuantity

    alt Diferencia positiva (faltaba registrar)
        IS->>DB: Crea InventoryMovement tipo "in"
    else Diferencia negativa (sobraba en sistema)
        IS->>DB: Crea InventoryMovement tipo "out"
    end

    IS->>DB: Actualiza totalQuantity, availableQuantity
    opt Si se proporcionó newCostPrice
        IS->>DB: Actualiza averageCostPrice
    end

    IS->>AS: evaluateForInventory(inventory)
    AS->>AS: ¿Stock bajo el mínimo de alguna regla?

    IS-->>F: Inventario ajustado
    F-->>U: Flash verde "Ajustado" (undo 4 seg)
```

---

## Flujo 4: Transferencia entre Almacenes

### Descripción
Mover stock de un almacén a otro. Crea dos movimientos vinculados.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Almacenero
    participant F as 🖥️ Frontend
    participant IMS as 📋 MovementsService
    participant DB as 🗄️ MongoDB

    U->>F: Abre "Transferir" en Movimientos
    U->>F: Selecciona producto, origen, destino, cantidad
    F->>IMS: POST /inventory-movements/transfers

    IMS->>DB: Busca Inventory en almacén origen
    IMS->>IMS: Verifica stock suficiente
    IMS->>IMS: Genera transferId (UUID)

    rect rgb(255, 230, 230)
        Note over IMS,DB: Movimiento OUT (origen)
        IMS->>DB: Reduce stock en origen
        IMS->>DB: Crea InventoryMovement OUT<br/>transferId=uuid, sourceWarehouseId=origen
    end

    rect rgb(230, 255, 230)
        Note over IMS,DB: Movimiento IN (destino)
        IMS->>DB: Busca/crea Inventory en destino
        IMS->>DB: Incrementa stock en destino
        IMS->>DB: Crea InventoryMovement IN<br/>transferId=uuid, destinationWarehouseId=destino
    end

    IMS->>DB: Vincula ambos movimientos (linkedMovementId)
    IMS-->>F: { transferId, outMovement, inMovement }
    F-->>U: "Transferencia completada"
```

---

## Flujo 5: Evaluación de Alertas

### Descripción
Cada vez que cambia el stock, el sistema evalúa si debe disparar alguna alerta.

### Diagrama

```mermaid
flowchart TD
    CHANGE["Cambio de stock<br/>(compra, venta, ajuste, transferencia)"] --> EVAL["evaluateForInventory(inventory)"]
    
    EVAL --> RULES["Busca reglas activas<br/>para productId + warehouseId"]
    RULES --> FOREACH["Por cada regla"]
    
    FOREACH --> CHECK{"¿availableQuantity<br/>≤ minQuantity?"}
    CHECK -->|"No"| SKIP["No hacer nada"]
    CHECK -->|"Sí"| DEBOUNCE{"¿Última alerta<br/>hace < 6 horas?"}
    
    DEBOUNCE -->|"Sí"| SKIP2["Debounce: no repetir"]
    DEBOUNCE -->|"No"| TRIGGER["Disparar alerta"]
    
    TRIGGER --> EVENT["EventsService.create()<br/>tarea tipo inventory_alert"]
    TRIGGER --> EMIT["EventEmitter.emit()<br/>inventory.alert.triggered"]
    TRIGGER --> UPDATE["Actualizar lastTriggeredAt"]
```

---

## Flujo 6: Generación de Recibo PDF

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Almacenero
    participant F as 🖥️ Frontend
    participant S as 📄 ReceiptPdfService
    participant DB as 🗄️ MongoDB

    U->>F: Clic "Recibo" en movimiento
    F->>S: GET /inventory/movements/:id/receipt

    S->>DB: Busca movimiento + populate product + user
    S->>DB: Busca tenant (logo, nombre, RIF)
    
    opt Tenant tiene logo (URL)
        S->>S: Fetch logo desde URL → buffer
    end

    S->>S: Genera PDF con PDFKit
    Note over S: Header: logo + empresa + RIF + ciudad
    Note over S: Detalles: ID, fecha, tipo, razón, referencia
    Note over S: Tabla: SKU, producto, cantidad, costos
    Note over S: Balance: total, disponible, reservado
    Note over S: Firmas: recibido por + autorizado por

    S-->>F: Buffer PDF
    F-->>U: Descarga/imprime PDF
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `inventory.service.ts`, `inventory-movements.service.ts`, `inventory-alerts.service.ts`, `inventory-receipt-pdf.service.ts`*
