# Guía Cross-Módulo: Ciclo de Vida de una Orden

> Flujo completo: Cliente elige → Orden creada → Inventario reservado → Pago → Factura → Fulfillment → Inventario descontado.
> Módulos: Orders, Inventory, Payments, Billing, Accounting, Delivery, Tables, WhatsApp.
> Última actualización: 2026-04-28

---

## Diagrama del Flujo Completo

```mermaid
sequenceDiagram
    participant C as 👤 Cliente
    participant POS as 💳 POS/Storefront
    participant OS as 🛍️ Orders
    participant DS as 💲 Discounts
    participant IS as 📊 Inventory
    participant PS as 💳 Payments
    participant BS as 📄 Billing
    participant AC as 💰 Accounting
    participant WA as 💬 WhatsApp
    participant FF as 🚚 Fulfillment

    Note over C,FF: FASE 1: Crear Orden
    C->>POS: Selecciona productos + paga
    POS->>OS: POST /orders

    OS->>OS: Carga/crea Customer
    loop Por cada item
        OS->>DS: calculateBestDiscount(product, qty)
        DS-->>OS: Mejor descuento (volumen o promo)
        OS->>OS: Calcula IVA por item
    end
    OS->>OS: Aplica cupón (si hay)
    OS->>OS: Busca promociones auto-apply
    OS->>OS: Calcula IGTF, envío, retención IVA
    OS->>OS: Determina fulfillmentType

    opt autoReserve=true
        OS->>IS: reserveInventory(items, orderId)
        IS->>IS: availableQty -= qty, reservedQty += qty
    end

    Note over C,FF: FASE 2: Registrar Pago(s)
    POS->>OS: POST /orders/:id/payments
    loop Por cada método de pago
        OS->>PS: create(payment)
        PS->>PS: Calcula IGTF si divisa
    end

    alt totalPaid >= totalAmount
        OS->>OS: paymentStatus → "paid"
        OS->>IS: deductIngredientsFromSale() [BOM]
        OS->>IS: createOutMovements() [regular]
    end

    Note over C,FF: FASE 3: Facturar
    POS->>BS: POST /billing/create + issue
    BS->>BS: Asigna número de control
    BS->>BS: Calcula totales en VES
    BS->>AC: Evento → crea asiento + libro de ventas IVA

    Note over C,FF: FASE 4: Completar
    POS->>OS: POST /orders/:id/complete
    OS->>OS: Aplica fulfillment strategy

    alt Immediate (mostrador)
        OS->>OS: status=completed, fulfillment=delivered
    else Counter (retiro)
        OS->>OS: status=confirmed, fulfillment=picking
        FF->>OS: Cliente retira → delivered
    else Logistics (envío)
        OS->>OS: status=confirmed, fulfillment=pending
        FF->>OS: Despachar → in_transit → delivered
        OS->>WA: Notifica cada cambio de estado
    end
```

## Detalle paso a paso

### 1. Crear Orden
- **Fuentes**: POS presencial, Storefront online, WhatsApp, API
- **Calculo de precios**: Price List > Variante > Producto (en ese orden de prioridad)
- **Descuentos**: Sistema evalúa descuento por volumen Y promoción, aplica el mejor
- **Impuestos**: IVA (16%) por producto, IGTF (3%) solo en pagos en divisas

### 2. Registrar Pagos
- **Multi-pago**: Soporta N métodos en la misma orden
- **IGTF**: Solo sobre la porción en USD (no sobre VES)
- **Al quedar paid**: Dispara backflush de BOM + movimientos OUT de inventario (async)

### 3. Facturar
- **Tipos**: Factura fiscal (con IVA/IGTF) o Nota de Entrega (sin impuestos)
- **Control**: Número de control asignado por Imprenta Digital
- **Contabilidad**: Asiento automático (DR CxC, CR Ventas, CR IVA) + registro en Libro de Ventas

### 4. Completar y Fulfillment
- **4 estrategias**: immediate (POS), counter (retiro), logistics (envío), hybrid (decide por método)
- **Inventario**: Al pagar, se crean movimientos OUT. Para productos con receta (BOM), se descuentan los ingredientes
- **WhatsApp**: Si está configurado, envía notificaciones en cada cambio de estado

## Inventario: ¿Cuándo se descuenta?

```mermaid
flowchart TD
    PAID["Orden marcada como PAID"] --> TYPE{"¿Producto tiene BOM<br/>(receta)?"}
    TYPE -->|"Sí"| BOM["Backflush: descuenta<br/>INGREDIENTES del BOM<br/>(no el producto terminado)"]
    TYPE -->|"No"| REGULAR["Crea movimiento OUT<br/>del producto directo"]
    
    BOM --> MODS{"¿Tiene modificadores?"}
    MODS -->|"Sí"| APPLY["Aplica efectos:<br/>exclude/multiply/add"]
    MODS -->|"No"| DEDUCT["Descuenta componentes"]
    APPLY --> REMOVED{"¿removedIngredients?"}
    REMOVED -->|"Sí"| SKIP["Omite esos ingredientes"]
    REMOVED -->|"No"| DEDUCT
```

## ⚠️ Puntos de Fallo

| Problema | Causa | Solución |
|----------|-------|----------|
| No se puede completar | Falta pago completo O factura | Pagar primero, luego facturar |
| IGTF incorrecto | Aplica solo a porción USD, no al total | Verificar método de pago |
| Inventario no baja al pagar | Backflush es async, puede tardar | Verificar movimientos después |
| Orden queda "confirmed" no "completed" | Fulfillment strategy ≠ immediate | Es correcto según config |

---

*Última actualización: 2026-04-28*
