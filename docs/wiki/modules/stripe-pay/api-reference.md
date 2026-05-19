# Stripe Pay — API Reference

## POST `/api/v1/public/stripe/payment-intent`

Crea (o reutiliza) un PaymentIntent de Stripe para una orden existente.

### Auth
`@Public()` — no requiere JWT. La autorización es por **ownership**: la orden debe pertenecer al `tenantId` enviado en el body.

### Request

```json
{
  "tenantId": "65f...",            // string — REQUERIDO
  "orderId": "65f...",             // MongoId — REQUERIDO. Order debe existir y tenantId debe matchear
  "customerEmail": "buyer@x.com",  // opcional. Si falta usa Order.customerEmail
  "customerName": "Jane Doe"       // opcional. Si falta usa Order.customerName
}
```

### Response 201

```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_3O.._secret_..",    // se pasa a Stripe.js para confirmar
    "publishableKey": "pk_test_...",
    "paymentIntentId": "pi_3O...",
    "orderNumber": "ORD-260510-...",
    "amountCents": 118000,
    "currency": "usd"
  }
}
```

### Errores

| Código | Causa |
|---|---|
| 400 | Stripe no configurado / orderId inválido / orden ya pagada / totalAmount inválido |
| 404 | Orden no encontrada para ese tenantId (también si tenantId no matchea — protección anti-IDOR) |

### Idempotencia
- Una orden = un PaymentIntent vivo. Llamadas repetidas con el mismo `orderId` retornan el mismo `clientSecret`.
- Si entre llamadas cambia `Order.totalAmount`, se cancela el viejo intent y se crea uno nuevo (con `idempotencyKey = order_${orderId}_${amountCents}`).
- Si el intent previo está en estado `canceled` o `succeeded`, se crea uno nuevo.

---

## POST `/api/v1/webhooks/stripe`

Recibe webhooks firmados de Stripe.

### Auth
`@Public()` + verificación de firma con `STRIPE_WEBHOOK_SECRET`. **No leer el body via `JSON.stringify(req.body)`** — Stripe firma los bytes crudos. `main.ts` ya captura `req.rawBody` globalmente vía `express.json({ verify: ... })`.

### Headers
- `stripe-signature` (REQUERIDO)
- `Content-Type: application/json`

### Body
JSON crudo del evento de Stripe — manejado opaco por la librería oficial.

### Eventos manejados

| Event type | Efecto |
|---|---|
| `payment_intent.succeeded` | Persiste `stripeChargeId`, `receiptUrl`, `cardBrand`, `cardLast4`, marca `webhookProcessed=true`. Emite el evento `stripe.payment_intent.succeeded` que el listener `StripePaymentListener` consume y llama a `OrdersService.registerPayments()` → marca la orden como `paid`, dispara backflush BOM + OUT movements + evento `order.paid`. |
| `payment_intent.payment_failed` | Persiste `lastError`. |
| `payment_intent.canceled` | Cambia `status` a `canceled`. |
| `payment_intent.processing` | Cambia `status` a `processing` (útil para métodos asincrónicos). |
| Otros | Loggeados pero no aplicados — el response es 200 con `applied: false`. |

### Response 200

```json
{
  "received": true,
  "eventId": "evt_...",
  "eventType": "payment_intent.succeeded",
  "intentId": "pi_...",
  "duplicate": false,
  "applied": true
}
```

`duplicate: true` cuando el `event.id` ya estaba en `processedWebhookEvents[]` — Stripe puede reintentar; el handler es idempotente.

### Errores

| Código | Causa |
|---|---|
| 400 | Falta header `stripe-signature` / firma inválida / rawBody no disponible |

**IMPORTANTE**: nunca devolver 5xx por errores de negocio — Stripe reintenta hasta 3 días con backoff exponencial. Si el error es transitorio (DB caída), 5xx es OK; si el evento es inválido, devolver 200 + log para que Stripe no reintente eternamente.

---

## Headers de respuesta estándar
Todas las respuestas usan el wrapper `{ success: boolean, data: T }` excepto el webhook (que sigue el contrato de Stripe).

## Rate limits
Heredan del throttler global (60 req / 60 s por IP por defecto). El webhook de Stripe **no** debe ser rate-limited — si tu setup tiene throttling agresivo, agregar excepción para `/webhooks/stripe`.
