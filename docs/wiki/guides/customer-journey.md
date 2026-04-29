# Guía Cross-Módulo: Journey del Cliente (Storefront)

> Flujo: Descubrir tienda → Navegar productos → Carrito → Checkout → Pago → Tracking → Lealtad.
> Módulos: Storefront, StorefrontConfig, Products, Orders, Payments, Inventory, Customers, Loyalty, WhatsApp.
> Última actualización: 2026-04-28

---

## Diagrama del Journey

```mermaid
sequenceDiagram
    participant CL as 🛒 Cliente
    participant ST as 🖥️ Storefront (Next.js)
    participant MW as Middleware
    participant API as ⚙️ Backend
    participant IS as 📊 Inventory
    participant OS as 🛍️ Orders
    participant WA as 💬 WhatsApp

    Note over CL,WA: 1. DESCUBRIR LA TIENDA
    CL->>ST: Visita tienda.smartkubik.com
    ST->>MW: Detecta dominio → extrae tenant
    MW->>API: GET /public/storefront/by-domain/tienda
    API-->>ST: Config (tema, colores, template, logo)
    ST->>ST: Renderiza con template + CSS variables

    Note over CL,WA: 2. NAVEGAR PRODUCTOS
    CL->>ST: Explora catálogo
    ST->>API: GET /public/products?tenantId=X&page=1
    Note over API: Solo type=SIMPLE, stock>0, isActive=true
    API-->>ST: Productos con stock
    CL->>ST: Ve detalle de producto
    ST->>API: GET /public/products/:id?tenantId=X

    Note over CL,WA: 3. CARRITO + CHECKOUT
    CL->>ST: Agrega al carrito (CartContext, localStorage)
    CL->>ST: Checkout: nombre, email, teléfono, dirección
    ST->>API: POST /public/orders

    Note over CL,WA: 4. ORDEN CREADA + RESERVA
    API->>IS: reserveInventory(items, 15 min)
    IS->>IS: availableQty -= qty, reservedQty += qty
    API->>API: Crea/busca Customer por email/phone
    API->>API: Crea orden (source=storefront)
    
    opt WhatsApp habilitado
        API->>WA: Envía confirmación con métodos de pago
    end
    API-->>ST: { orderNumber, totalAmount }
    ST-->>CL: Página de confirmación

    Note over CL,WA: 5. PAGO Y TRACKING
    CL->>CL: Paga por Zelle/transferencia/pago móvil
    CL->>WA: Envía comprobante "ORD-XXXX"
    Note over WA: Admin confirma pago en el sistema
    
    CL->>ST: GET /orden/ORD-XXXX (tracking público)
    ST->>API: GET /orders/track/ORD-XXXX?tenantId=X
    
    Note over CL,WA: 6. FULFILLMENT
    API->>WA: "📦 Tu orden está siendo preparada"
    API->>WA: "🚚 Tu orden está en camino"
    API->>WA: "🎉 Tu orden fue entregada"

    Note over CL,WA: 7. POST-VENTA
    API->>API: Registra transacción en historial del cliente
    API->>API: Calcula lealtad (RFM score)
    API->>API: Asigna/actualiza tier (Bronce→Plata→Oro→Diamante)
```

## Detección de Tenant (Multi-tenancy)

| Entorno | Método | Ejemplo |
|---------|--------|---------|
| Producción | Subdominio | `tienda.smartkubik.com` → tenant "tienda" |
| Desarrollo | Path | `localhost:3001/tienda` → tenant "tienda" |

El middleware reescribe la URL a `/[domain]/path` para que el App Router de Next.js resuelva la ruta.

## Templates Disponibles

| Template | Uso | Características |
|----------|-----|-----------------|
| `modern-ecommerce` | Retail general | Grid de productos, carrito, checkout |
| `premium` | Retail premium | Diseño más elaborado |
| `modern-services` | Servicios/Booking | Orientado a reservas |
| `beauty` | Salones de belleza | Profesionales, galería, reviews, booking wizard |

## Lealtad Post-Venta

Después de cada compra completada:
1. Se registra en `CustomerTransactionHistory`
2. Se recalcula el **RFM score**: Recencia (50%) + Frecuencia (30%) + Monto (20%)
3. Se asigna tier: Top 5% → Diamante, 5-20% → Oro, 20-50% → Plata, resto → Bronce
4. El tier determina el descuento automático en futuras compras (3%-18%)

---

*Última actualización: 2026-04-28*
