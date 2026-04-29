# Órdenes y Caja — Flujos de Operación

> Diagramas de los flujos principales.
> Última actualización: 2026-04-28

---

## Flujo 1: Venta Completa (POS → Pago → Factura → Inventario)

### Diagrama

```mermaid
sequenceDiagram
    participant C as 💳 Cajero
    participant F as 🖥️ POS Frontend
    participant OS as 🛍️ OrdersService
    participant DS as 💲 DiscountService
    participant PS as 💳 PaymentsService
    participant IS as 📊 InventoryService
    participant BS as 📄 BillingService
    participant DB as 🗄️ MongoDB

    Note over C,DB: FASE 1: Crear Orden
    C->>F: Agrega productos al carrito
    C->>F: Presiona F4 (Pagar)
    F->>OS: POST /orders

    OS->>OS: Carga productos en bulk
    loop Por cada item
        OS->>DS: calculateBestDiscount(product, qty, price)
        DS-->>OS: { discountedPrice, discountPercentage }
        OS->>OS: Calcula IVA por item
    end
    OS->>OS: Calcula totales + IGTF + envío
    OS->>DB: Guarda orden (status=pending)
    OS-->>F: Orden creada

    Note over C,DB: FASE 2: Registrar Pago
    C->>F: Selecciona método(s) de pago
    F->>OS: POST /orders/:id/payments
    OS->>PS: create(payment) por cada método
    OS->>OS: Suma totalPaid vs totalAmount

    alt totalPaid >= totalAmount
        OS->>OS: paymentStatus → paid
        OS->>IS: deductIngredientsFromSale() [async, si BOM]
        OS->>IS: createOutMovements() [async, productos regulares]
    end
    OS-->>F: Orden pagada

    Note over C,DB: FASE 3: Facturar + Completar
    C->>F: Genera factura/nota de entrega
    F->>BS: POST /billing/create
    BS-->>F: billingDocumentId
    F->>OS: POST /orders/:id/complete
    OS->>OS: Aplica fulfillment strategy
    OS-->>F: Orden completada ✅
```

---

## Flujo 2: Ciclo de Estados de una Orden

```mermaid
stateDiagram-v2
    [*] --> pending : Crear orden

    state "Payment Flow" as pay {
        pending --> partial : Pago parcial
        partial --> paid : Pago completo
        pending --> paid : Pago completo directo
    }

    state "Fulfillment Flow" as fulfill {
        paid --> confirmed_counter : Strategy: counter
        paid --> confirmed_logistics : Strategy: logistics
        paid --> completed : Strategy: immediate

        confirmed_counter --> picking : Preparando
        picking --> delivered : Listo para retiro

        confirmed_logistics --> in_transit : Despachado
        in_transit --> delivered : Entregado
    }

    pending --> cancelled : Cancelar
    partial --> cancelled : Cancelar

    delivered --> [*]
    completed --> [*]
    cancelled --> [*]
```

---

## Flujo 3: Pedido desde Storefront

```mermaid
sequenceDiagram
    participant CL as 🛒 Cliente
    participant ST as 🖥️ Storefront
    participant OS as 🛍️ OrdersService
    participant IS as 📊 InventoryService
    participant WA as 💬 WhatsApp
    participant DB as 🗄️ MongoDB

    CL->>ST: Checkout (items + datos personales)
    ST->>OS: POST /public/orders

    OS->>IS: reserveInventory(items, orderId, 15min)
    IS->>DB: Mueve availableQty → reservedQty
    IS-->>OS: Reservado

    OS->>DB: Crea/busca Customer por email/phone
    OS->>OS: Calcula totales (sin descuentos complejos)
    OS->>DB: Guarda orden (source=storefront, channel=online)

    opt WhatsApp habilitado
        OS->>WA: Envía confirmación con detalles de pago
        WA-->>CL: "✅ Orden Confirmada #ORD-XXX..."
    end

    OS-->>ST: { orderNumber, totalAmount }
    ST-->>CL: Página de confirmación

    Note over CL,DB: El cliente tiene 15 min para pagar
    Note over CL,DB: Si no paga, la reserva expira automáticamente
```

---

## Flujo 4: Backflush de Ingredientes (Productos con BOM)

```mermaid
flowchart TD
    PAID["Orden marcada como PAID"] --> CHECK{"¿Item tiene BOM<br/>(receta)?"}
    
    CHECK -->|"No"| OUT["Crear movimiento OUT<br/>del producto tal cual"]
    CHECK -->|"Sí"| BOM["Cargar BOM del producto"]
    
    BOM --> COMPS["Por cada componente del BOM"]
    COMPS --> MODS{"¿Tiene modificadores<br/>en la orden?"}
    
    MODS -->|"Sí"| EFFECTS["Aplicar efectos:<br/>• exclude → omitir<br/>• multiply → multiplicar qty<br/>• add → agregar componente extra"]
    MODS -->|"No"| CALC["Calcular cantidad base"]
    
    EFFECTS --> REMOVED{"¿Está en<br/>removedIngredients[]?"}
    CALC --> REMOVED
    
    REMOVED -->|"Sí"| SKIP["Omitir este ingrediente"]
    REMOVED -->|"No"| DEDUCT["qty × component.qty × (1 + scrap%)<br/>→ adjustInventory(OUT)"]
```

---

## Flujo 5: Multi-Pago con IGTF

```mermaid
sequenceDiagram
    participant C as 💳 Cajero
    participant OS as 🛍️ Orders
    participant PS as 💳 Payments
    participant ER as 💱 ExchangeRate

    C->>OS: Registrar pagos: [$50 efectivo_usd, Bs 200,000 pago_movil]

    OS->>ER: getRateForCurrency("USD")
    ER-->>OS: rate: 40.50

    rect rgb(255, 230, 230)
        Note over OS: Pago 1: $50 efectivo_usd (DIVISA)
        OS->>OS: IGTF = $50 × 3% = $1.50
        OS->>OS: amountVes = $50 × 40.50 = Bs 2,025
        OS->>PS: create(amount: 50, igtf: 1.50, currency: USD)
    end

    rect rgb(230, 245, 230)
        Note over OS: Pago 2: Bs 200,000 pago_movil (VES)
        OS->>OS: IGTF = $0 (bolívares, no aplica)
        OS->>OS: amountUsd = 200,000 / 40.50 = $4,938.27
        OS->>PS: create(amount: 4938.27, currency: VES)
    end

    OS->>OS: totalPaid = $50 + $4,938.27 + $1.50 (IGTF) = $4,989.77
    OS->>OS: ¿totalPaid >= totalAmount?
    
    alt Sí → Paid
        OS->>OS: paymentStatus = "paid"
    else No → Partial
        OS->>OS: paymentStatus = "partial"
    end
```

---

## Flujo 6: Ciclo de Caja Registradora

```mermaid
sequenceDiagram
    participant CAJ as 💰 Cajero
    participant F as 🖥️ Frontend
    participant CS as 💰 CashService
    participant DB as 🗄️ MongoDB

    Note over CAJ,DB: APERTURA
    CAJ->>F: Cuenta billetes: $100×5, $50×3, $20×10
    F->>CS: POST /cash-register/sessions/open
    CS->>CS: Genera CAJ-2026-0042
    CS->>DB: Crea sesión (status=open)
    CS-->>F: Sesión abierta

    Note over CAJ,DB: DURANTE EL TURNO
    loop Ventas del día
        CAJ->>F: Procesa venta en POS
        F->>F: Orden se crea con cashSessionId
    end
    opt Movimientos de caja
        CAJ->>F: Registra salida $50 (depósito bancario)
        F->>CS: POST /sessions/:id/movements
    end

    Note over CAJ,DB: CIERRE
    CAJ->>F: Cuenta billetes finales
    F->>CS: POST /sessions/:id/close

    CS->>CS: calculateSessionTotals()
    Note over CS: Suma ventas por método,<br/>vueltos dados, movimientos

    CS->>CS: Esperado = Apertura + Ventas - Vueltos + Entradas - Salidas
    CS->>CS: Diferencia = Declarado - Esperado

    alt Sin diferencias
        CS->>DB: Cierre aprobado automáticamente
    else Con diferencias
        CS->>DB: Cierre pendiente de aprobación
        Note over CS: Supervisor debe aprobar/rechazar
    end

    CS->>DB: Sesión → closed
    CS-->>F: Documento de cierre generado
```

---

## Flujo 7: Estrategias de Fulfillment

```mermaid
flowchart TD
    COMPLETE["completeOrder()"] --> STRATEGY{"tenant.settings<br/>.fulfillmentStrategy"}
    
    STRATEGY -->|"immediate"| IMM["status = completed<br/>fulfillment = delivered<br/>deliveredAt = now<br/><i>Venta en mostrador</i>"]
    
    STRATEGY -->|"counter"| CTR["status = confirmed<br/>fulfillment = picking<br/><i>Preparar para retiro</i>"]
    CTR --> CTR_DONE["Personal marca 'delivered'<br/>cuando cliente retira"]
    
    STRATEGY -->|"logistics"| LOG["status = confirmed<br/>fulfillment = pending<br/><i>Espera despacho</i>"]
    LOG --> LOG_TRANSIT["Courier marca 'in_transit'"]
    LOG_TRANSIT --> LOG_DONE["Courier marca 'delivered'"]
    
    STRATEGY -->|"hybrid"| HYB{"shipping.method?"}
    HYB -->|"pickup"| CTR
    HYB -->|"delivery"| LOG
    HYB -->|"otro"| IMM
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `orders.service.ts`, `order-fulfillment.service.ts`, `order-inventory.service.ts`, `order-payments.service.ts`, `cash-register.service.ts`*
