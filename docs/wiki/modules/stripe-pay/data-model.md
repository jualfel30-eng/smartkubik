# Stripe Pay — Data Model

## Colección `stripepaymentintents`

Schema: [stripe-payment-intent.schema.ts](../../../food-inventory-saas/src/schemas/stripe-payment-intent.schema.ts)

```ts
StripePaymentIntent {
  tenantId:                string;            // String, indexed
  orderId:                 ObjectId(Order);   // unique-partial: 1 intent vivo por orden
  orderNumber:             string;            // desnormalizado para reportes
  stripePaymentIntentId:   string;            // unique. Formato pi_3O...
  amountCents:             number;            // entero. USD → ROUND(amount*100)
  currency:                string;            // default 'usd'
  status:                  StripePaymentIntentStatus;  // enum (ver abajo)
  livemode:                boolean;           // false en test mode
  customerEmail?:          string;
  customerName?:           string;
  stripeCustomerId?:       string;            // si en el futuro creamos Stripe Customer
  stripeChargeId?:         string;            // tras succeeded
  receiptUrl?:             string;            // URL hosteada por Stripe
  paymentMethodType?:      string;            // 'card', 'apple_pay', etc.
  cardBrand?:              string;            // 'visa', 'mastercard', ...
  cardLast4?:              string;            // 4 dígitos finales
  webhookProcessed:        boolean;           // true tras succeeded
  webhookProcessedAt?:     Date;
  processedWebhookEvents:  Array<{eventId, eventType, receivedAt}>;  // dedupe
  statusHistory:           Array<{status, changedAt, eventType?, errorMessage?}>;
  metadata?:               Record<string, any>;
  lastError?:              Record<string, any>;  // tras failed
  createdAt: Date;
  updatedAt: Date;
}
```

### Status enum

```ts
StripePaymentIntentStatus = {
  REQUIRES_PAYMENT_METHOD,   // creado, esperando que el cliente ingrese tarjeta
  REQUIRES_CONFIRMATION,     // tarjeta entregada, esperando confirmación
  REQUIRES_ACTION,           // 3DS / autenticación adicional
  PROCESSING,                // métodos asincrónicos (ACH, etc.)
  SUCCEEDED,                 // ✅ cobrado
  CANCELED,                  // cancelado por usuario o sistema
  REQUIRES_CAPTURE           // solo si capture_method='manual'
}
```

### Índices

```
{ tenantId: 1, status: 1 }
{ tenantId: 1, createdAt: -1 }
{ stripePaymentIntentId: 1 }                                       (unique implícito)
{ orderId: 1 }, { unique: true, partialFilterExpression: ... }    1 intent por orden
```

---

## Relación con `Order`

```
Order  ←─[1..1 vivo]─  StripePaymentIntent
  ↑                          │
  │                          │  payment_intent.succeeded webhook
  │                          ▼
  └── OrderPaymentsService.registerPayments()  (PR 2)
           ↓
       Payment (method='stripe_card_usd', reference=stripePaymentIntentId)
       Order.paymentStatus = 'paid'
       Inventory backflush + OUT movements
```

**Múltiples intents por orden**: una orden puede tener múltiples docs `StripePaymentIntent` históricamente (cada uno representa un intento), pero solo **uno vivo** a la vez (el que no esté `canceled`/`succeeded`). El índice unique parcial sobre `{orderId}` se relaja para los `succeeded`/`canceled` mediante el flujo de `createOrRetrieve`: el código gestiona que solo un doc activo exista, no el índice.

> NOTA: el índice unique sobre `{orderId}` aplica a TODOS los docs (no parcial por status). Para soportar múltiples intentos históricos sería necesario hacer el índice parcial por `status` o usar un campo `isCurrent`. Por ahora, el código actualiza in-place el doc existente cuando recrea el intent — solo hay 1 doc por orden, y su `stripePaymentIntentId` cambia. El historial vive en `statusHistory[]`.

---

## Datos sensibles
- **NUNCA** persistir `clientSecret` ni datos de tarjeta. Stripe los maneja.
- `stripeChargeId` y `receiptUrl` son seguros (URLs públicas de Stripe).
- `cardLast4` y `cardBrand` son OK para mostrar al cliente ("Card ending in 4242").

## Retention
No definido aún. Recomendación: mantener indefinidamente (las disputas y refunds pueden venir hasta 6 meses después). Si se necesita purgar, filtrar por `status: succeeded AND updatedAt < 1 year ago`.
