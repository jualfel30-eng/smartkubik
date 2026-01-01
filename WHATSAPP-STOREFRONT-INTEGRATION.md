# 📱 WhatsApp-Storefront Integration - Documentación Completa

## 🎯 Resumen del Sistema

Se ha implementado un sistema completo de integración entre el **Storefront** (ecommerce) y **WhatsApp Business** que permite:

1. **Tracking de fuente de ventas** (POS, Storefront, WhatsApp, API, Manual)
2. **Configuración de métodos de pago por tenant** con datos bancarios
3. **Cálculo dinámico de delivery** basado en ubicación GPS
4. **Confirmación automática de órdenes por WhatsApp** con detalles de pago
5. **Analytics de ventas** por canal/fuente

---

## 🗂️ Arquitectura de la Solución

### Backend (NestJS)

#### 1. **Schemas Creados/Actualizados**

**`tenant-payment-config.schema.ts`** (NUEVO)
- Configuración de métodos de pago por tenant
- Datos bancarios: Zelle, Pago Móvil, Transferencias, etc.
- Instrucciones personalizadas por método
- Estado activo/inactivo por método

**`order.schema.ts`** (ACTUALIZADO)
```typescript
source: "pos" | "storefront" | "whatsapp" | "api" | "manual"
sourceMetadata: {
  channel?: string
  whatsappPhone?: string
  whatsappMessageId?: string
  storefrontDomain?: string
  userAgent?: string
  ipAddress?: string
}
```

**`storefront-config.schema.ts`** (ACTUALIZADO)
```typescript
whatsappIntegration: {
  enabled: boolean
  businessPhone?: string
  buttonText?: string
  messageTemplate?: string
  autoSendOrderConfirmation: boolean
  sendPaymentInstructions: boolean
  sendDeliveryUpdates: boolean
}
```

#### 2. **Servicios Creados**

**`WhatsAppOrderNotificationsService`**
- `sendOrderConfirmation(order)` - Envía confirmación con detalles de pago
- `sendDeliveryUpdate(order, status)` - Notifica cambios de estado
- `generateStorefrontLink(tenantId)` - Genera URL del storefront
- `generateWhatsAppStorefrontMessage(tenantId)` - Crea link de WhatsApp con mensaje

**`TenantPaymentConfigService`**
- `getPaymentConfig(tenantId)` - Obtiene configuración
- `upsertPaymentConfig(tenantId, data)` - Crear/actualizar config
- `upsertPaymentMethod(tenantId, method)` - Agregar/actualizar método
- `removePaymentMethod(tenantId, methodId)` - Eliminar método
- `getActivePaymentMethods(tenantId)` - Métodos activos (público)

#### 3. **Endpoints Creados**

##### **Autenticados**
```http
GET    /api/v1/tenant-payment-config
PUT    /api/v1/tenant-payment-config
POST   /api/v1/tenant-payment-config/payment-methods
DELETE /api/v1/tenant-payment-config/payment-methods/:methodId
GET    /api/v1/orders/analytics/by-source?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

##### **Públicos (Storefront)**
```http
GET  /api/v1/public/tenant-payment-config/:tenantId/payment-methods
POST /api/v1/public/delivery/calculate
     Body: { tenantId, customerLocation: { lat, lng }, orderAmount }
POST /api/v1/public/orders
     Body: { ..., shippingMethod, shippingAddress: { coordinates }, selectedPaymentMethod }
```

#### 4. **Flujo Automatizado de Orden**

```
Cliente completa orden en storefront
         ↓
OrdersService.createPublicOrder()
         ↓
1. Calcula delivery dinámicamente (DeliveryService)
2. Guarda orden con source='storefront'
3. Reserva inventario
         ↓
[ASYNC] WhatsAppOrderNotificationsService.sendOrderConfirmation()
         ↓
Cliente recibe WhatsApp con:
  - Resumen de productos
  - Total a pagar (USD/VES)
  - Métodos de pago disponibles
  - Datos bancarios (Zelle, Pago Móvil, etc.)
  - Código de orden para referencia
```

---

### Frontend (Next.js - Storefront)

#### 1. **Componentes Actualizados**

**`CheckoutPageClient.enhanced.tsx`** (NUEVO)

Características:
- ✅ Selector de método de entrega (Pickup vs Delivery)
- ✅ Integración con GPS para obtener ubicación
- ✅ Cálculo automático de costo de delivery
- ✅ Selector de método de pago con métodos activos del tenant
- ✅ Confirmación de orden con botón de WhatsApp
- ✅ Validación de formulario
- ✅ Dark mode support
- ✅ Pre-llenado de datos para usuarios autenticados

#### 2. **Funciones API Agregadas**

**`lib/api.ts`**
```typescript
getPaymentMethods(tenantId)
calculateDeliveryCost(tenantId, location, orderAmount)
```

#### 3. **Flujo de Usuario**

```
1. Cliente agrega productos al carrito
2. Va a Checkout
3. Selecciona método de entrega:
   - Pickup (gratis)
   - Delivery (clickea "Obtener ubicación")
     → Sistema pide permiso GPS
     → Calcula costo automáticamente
     → Muestra: "$5.50 (3.2 km) - Zona Centro"
4. Selecciona método de pago:
   - Lista de métodos activos del tenant
   - Instrucciones visibles
5. Completa datos personales
6. Confirma orden
7. Ve pantalla de confirmación con:
   - Número de orden
   - Botón "Confirmar por WhatsApp"
   - Link directo a WhatsApp del negocio
```

---

## 🔧 Configuración Requerida

### 1. **Configurar Métodos de Pago** (Admin)

```http
POST /api/v1/tenant-payment-config/payment-methods
Authorization: Bearer {token}

{
  "methodId": "zelle_usd",
  "name": "Zelle (USD)",
  "isActive": true,
  "igtfApplicable": true,
  "currency": "USD",
  "accountDetails": {
    "zelleEmail": "negocio@example.com",
    "zellePhone": "+1 786 123 4567"
  },
  "instructions": "Enviar a: negocio@example.com",
  "displayOrder": 1
}
```

**Métodos Soportados:**
- `efectivo_usd` - Efectivo (USD)
- `transferencia_usd` - Transferencia (USD)
- `zelle_usd` - Zelle (USD)
- `efectivo_ves` - Efectivo (VES)
- `transferencia_ves` - Transferencia (VES)
- `pago_movil_ves` - Pago Móvil (VES)
- `pos_ves` - Punto de Venta (VES)
- `tarjeta_ves` - Tarjeta (VES)

### 2. **Configurar Delivery Zones** (Ya existe)

```http
PUT /api/v1/delivery
Authorization: Bearer {token}

{
  "businessLocation": {
    "address": "Av. Principal, Caracas",
    "coordinates": { "lat": 10.5000, "lng": -66.9167 }
  },
  "deliveryZones": [
    {
      "name": "Zona Centro",
      "baseRate": 3,
      "ratePerKm": 0.5,
      "minDistance": 0,
      "maxDistance": 5,
      "isActive": true
    }
  ],
  "settings": {
    "enablePickup": true,
    "enableDelivery": true,
    "freeDeliveryThreshold": 50
  }
}
```

### 3. **Configurar WhatsApp Integration** (Storefront)

```http
PUT /api/v1/storefront
Authorization: Bearer {token}

{
  "whatsappIntegration": {
    "enabled": true,
    "businessPhone": "+58 412 1234567",
    "buttonText": "Ver en WhatsApp",
    "messageTemplate": "¡Hola! Mira nuestro catálogo: {url}",
    "autoSendOrderConfirmation": true,
    "sendPaymentInstructions": true,
    "sendDeliveryUpdates": true
  }
}
```

---

## 📊 Analytics y Reportes

### Endpoint de Analytics por Fuente

```http
GET /api/v1/orders/analytics/by-source?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bySource": [
      {
        "source": "storefront",
        "totalOrders": 142,
        "totalRevenue": 4250.50,
        "averageOrderValue": 29.93
      },
      {
        "source": "pos",
        "totalOrders": 89,
        "totalRevenue": 3120.00,
        "averageOrderValue": 35.06
      },
      {
        "source": "whatsapp",
        "totalOrders": 23,
        "totalRevenue": 890.25,
        "averageOrderValue": 38.71
      }
    ],
    "summary": {
      "totalOrders": 254,
      "totalRevenue": 8260.75,
      "averageOrderValue": 32.52
    },
    "dateRange": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    }
  }
}
```

---

## 💬 Ejemplo de Mensaje WhatsApp

Cuando un cliente completa una orden, recibe automáticamente:

```
✅ *Orden Confirmada #ORD-20241231-0042*

Hola Juan Pérez,
Hemos recibido tu orden exitosamente. A continuación los detalles:

📦 *Productos:*
• Pizza Margarita x2  - $18.00
• Refresco Coca-Cola x1  - $2.50
• Papas Fritas x1  - $3.00

🚚 *Entrega:*
Método: Delivery a domicilio
Dirección: Av. Francisco de Miranda, Caracas
Costo de envío: $5.50

💰 *Total:*
Subtotal: $23.50
Envío: $5.50
*TOTAL A PAGAR: $29.00*
*(Bs. 1,247.70)*

💳 *Métodos de Pago Disponibles:*

*Zelle (USD)*
Zelle: negocio@example.com
Titular: Mi Negocio C.A.

*Pago Móvil (VES)*
Pago Móvil: 0412-1234567
Banco: Banco de Venezuela
CI: V-12345678

*Transferencia (VES)*
Banco: Banco de Venezuela
Cuenta: 0102-0123-45-1234567890
Titular: Mi Negocio C.A.

ℹ️ *Instrucciones Generales:*
Por favor envía tu comprobante de pago con el código de referencia.

---
📱 *Por favor, envía tu comprobante de pago respondiendo a este mensaje con el código:*
*ORD-20241231-0042*

Gracias por tu compra! 🙏
- Mi Negocio
```

---

## 🧪 Testing

### 1. **Configurar Tenant**
```bash
# 1. Crear métodos de pago
curl -X POST http://localhost:3000/api/v1/tenant-payment-config/payment-methods \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "methodId": "zelle_usd",
    "name": "Zelle (USD)",
    "isActive": true,
    "accountDetails": {
      "zelleEmail": "test@example.com"
    }
  }'

# 2. Configurar WhatsApp
curl -X PUT http://localhost:3000/api/v1/storefront \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "whatsappIntegration": {
      "enabled": true,
      "businessPhone": "+58 412 1234567",
      "autoSendOrderConfirmation": true
    }
  }'
```

### 2. **Probar desde Storefront**
1. Navegar a `http://localhost:3001/{domain}/checkout`
2. Agregar productos al carrito
3. Seleccionar "Delivery"
4. Clickear "Obtener mi ubicación"
5. Verificar que se calcula el costo
6. Seleccionar método de pago
7. Completar orden
8. Verificar que se reciba WhatsApp

### 3. **Verificar Analytics**
```bash
curl http://localhost:3000/api/v1/orders/analytics/by-source?startDate=2024-01-01 \
  -H "Authorization: Bearer TOKEN"
```

---

## 📝 Notas Importantes

### 1. **WhatsApp Business API**
- Requiere Whapi token configurado en `SuperAdminSettings`
- Números deben estar en formato internacional (ej: 584121234567)
- Template de mensaje es personalizable por tenant

### 2. **Delivery Calculation**
- Si no hay coordenadas GPS, usa tarifa default de $5
- Requiere `DeliveryRates` configurado para el tenant
- Soporta free delivery threshold

### 3. **Payment Methods**
- Por default se crean 6 métodos básicos
- Tenant puede activar/desactivar y agregar detalles
- Datos sensibles NO se exponen en endpoints públicos

### 4. **Order Source Tracking**
- Todas las órdenes nuevas del storefront tienen `source: 'storefront'`
- Analytics permite comparar performance por canal
- Útil para decisiones de marketing y estrategia

---

## 🚀 Próximos Pasos (Futuro)

1. **Webhook de WhatsApp** - Detectar cuando cliente envía comprobante
2. **QR Code Generator** - Generar QR de pago para Pago Móvil
3. **Tracking en Tiempo Real** - Mapa de delivery en vivo
4. **Notificaciones Push** - Alertas cuando llega comprobante
5. **Multi-currency** - Soporte para más monedas
6. **Payment Gateway** - Integración con Stripe/PayPal

---

## 📞 Soporte

Para problemas o dudas:
- Backend: Revisar logs de `WhatsAppOrderNotificationsService`
- Frontend: Verificar console del browser
- Delivery: Verificar configuración de `DeliveryRates`
- Payments: Verificar `TenantPaymentConfig`

---

**Versión:** 1.0.0
**Fecha:** Diciembre 2024
**Autor:** Claude (Anthropic)
