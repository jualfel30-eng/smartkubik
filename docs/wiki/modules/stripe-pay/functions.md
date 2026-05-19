# Stripe Pay — Functions

## `StripePayService`

### `createOrRetrievePaymentIntent({tenantId, orderId, customerEmail?, customerName?})`

Idempotente. Flujo:

1. Verifica `STRIPE_SECRET_KEY` configurado → si no, `BadRequestException`.
2. Valida `orderId` como ObjectId.
3. Busca `Order` con `{ _id, tenantId }`. Si no existe → `NotFoundException` (esto cubre IDOR: tenant A no puede crear intents contra orderId de tenant B).
4. Si `order.paymentStatus === 'paid'` → `BadRequestException`.
5. Calcula `amountCents = round(order.totalAmount * 100)`.
6. Busca `StripePaymentIntent` previo con `{ tenantId, orderId }`:
   - Si existe y status NO es `canceled`/`succeeded`:
     - Refresca el intent desde Stripe.
     - Si `fresh.amount === amountCents` → reutiliza, devuelve `clientSecret`.
     - Si difiere → cancela intent en Stripe, marca doc como `canceled`, sigue al paso 7.
7. Crea nuevo PaymentIntent en Stripe con `idempotencyKey = order_${orderId}_${amountCents}`. Esto previene duplicados si el cliente reintenta.
8. Persiste / actualiza el doc local con el nuevo `stripePaymentIntentId`.
9. Devuelve `{ clientSecret, publishableKey, paymentIntentId, orderNumber, amountCents, currency }`.

**Gotchas**:
- `order.totalAmount` es USD. Multiplicar por 100 ANTES de redondear (Stripe usa cents).
- `automatic_payment_methods: { enabled: true }` deja a Stripe Elements decidir 3DS / wallets. Si se quiere forzar solo card, cambiar a `payment_method_types: ['card']`.

---

### `handleWebhookEvent(rawBody, signature)`

1. `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` → si la firma es inválida lanza, capturado y devuelto como `400 Firma de webhook inválida`.
2. Loggea `event.type`, `event.id`, `livemode`.
3. Extrae el PaymentIntent del evento (solo eventos cuyo `data.object.object === 'payment_intent'` aplican).
4. Busca el doc local por `stripePaymentIntentId`. Si no existe → log warn y devuelve `{applied: false}` (caso: webhook llega antes que la persistencia local — improbable porque create devuelve antes que cualquier evento).
5. Verifica dedupe: si `event.id` ya está en `processedWebhookEvents[]` → devuelve `{duplicate: true, applied: false}` sin re-aplicar.
6. Actualiza `status` y push al `statusHistory[]`.
7. Push al `processedWebhookEvents[]`.
8. Si `event.type === 'payment_intent.succeeded'`:
   - Extrae `latest_charge` (debe estar expandido en el evento de Stripe — sí lo está por defecto).
   - Persiste `stripeChargeId`, `receiptUrl`, `paymentMethodType`, `cardBrand`, `cardLast4`.
   - `webhookProcessed = true`.
9. Si `event.type === 'payment_intent.payment_failed'` → persiste `lastError`.
10. `await doc.save()`.
11. Si `succeeded`: emite `stripe.payment_intent.succeeded` (EventEmitter2) con payload `{tenantId, orderId, orderNumber, paymentIntentId, amountUsd, livemode, cardBrand, cardLast4, receiptUrl, customerEmail}`.
12. Devuelve `{eventId, eventType, intentId, duplicate, applied}`.

**Listener** (`orders/services/stripe-payment.listener.ts`): recibe el evento y llama a `OrdersService.registerPayments(orderId, dto, syntheticUser)`. Esto desacopla StripePay de Orders (no hay forwardRef ni circular dep) y mantiene un solo punto donde se aplica la lógica de "marcar pagada" — toda la cascada (paymentRecords, paymentStatus=paid, backflush BOM, OUT movements, evento `order.paid`) corre dentro de `OrderPaymentsService`.

---

### `findByOrderId(tenantId, orderId)`

Lookup ownership-safe. Devuelve `null` si no existe o si el `orderId` no es ObjectId. Útil para que el frontend pueda preguntar "¿está pagada esta orden?" sin exponer el intent ID a usuarios de otros tenants.

---

## `StripeApiProvider`

Wrapper sobre `Stripe` SDK oficial.

| Método | Propósito |
|---|---|
| `isConfigured()` | `true` si `STRIPE_SECRET_KEY` está set |
| `getPublishableKey()` | Retorna `STRIPE_PUBLISHABLE_KEY` (segura para enviar al cliente) |
| `getEnvironment()` | `'live'` o `'test'` según el prefijo de `STRIPE_SECRET_KEY` |
| `createPaymentIntent({...})` | Wrapper sobre `paymentIntents.create()` con `idempotencyKey` |
| `retrievePaymentIntent(id)` | Con `expand: ['latest_charge']` |
| `cancelPaymentIntent(id)` | Cancela un intent vivo |
| `constructWebhookEvent(rawBody, signature)` | Verifica firma — única manera segura de hacerlo |

**API version**: `2025-09-30.clover` (la versión de la cuenta Stripe se pisa con esta). Si Stripe deprecia, actualizar acá y revisar tipos.

---

## Convenciones del módulo

- **Decimales**: nunca pasar floats a Stripe — convertir a cents enteros con `Math.round(usd * 100)`.
- **Idempotencia**: usar `order_${orderId}_${amountCents}` como key. NO usar timestamp — Stripe rechaza el reintento si la key ya existe pero el body cambió.
- **Tenant isolation**: el público controller NO usa `JwtAuthGuard`. La protección es 100% por `tenantId + orderId` match en el query.
- **Logging**: todo con `Logger` por clase, nivel `log` para casos esperados, `warn` para anomalías recuperables, `error` para inesperados.
