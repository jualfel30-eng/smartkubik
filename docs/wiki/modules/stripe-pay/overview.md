# Stripe Pay

## ¿Qué es?

Módulo de **pagos en línea con tarjeta** vía Stripe (PaymentIntents API). Permite que un storefront público (HTML estático o cualquier frontend) cobre con tarjeta sin que SmartKubik toque datos PCI: la tarjeta se ingresa en Stripe Elements (cliente) y Stripe nos confirma el cobro vía webhook firmado.

A diferencia de [Binance Pay](../../../food-inventory-saas/src/modules/binance-pay/) (USDT, principalmente para suscripciones del SaaS), Stripe Pay está pensado para **órdenes de venta de tenants** que operan en USD — el primer cliente es Oliver Sutherland (vertical commerce/fashion).

## Funcionalidades principales

- **PaymentIntent por orden**: una orden = un PaymentIntent, idempotente por `orderId`.
- **Reuso seguro**: si el cliente reabre el checkout, se devuelve el mismo `clientSecret` (mientras el intent no esté `canceled`/`succeeded`). Si el total cambió, se cancela el viejo y se crea uno nuevo.
- **Webhook firmado**: `/webhooks/stripe` verifica con `STRIPE_WEBHOOK_SECRET`. Dedupe por `event.id` (Stripe puede reintentar).
- **Captura automática**: amount + automatic_payment_methods. Sin SCA manual — Stripe Elements + 3DS lo manejan.
- **Trazabilidad**: `statusHistory[]` y `processedWebhookEvents[]` en el doc, con `lastError` cuando falla.
- **Receipt URL**: persistido tras `payment_intent.succeeded` para mostrar al cliente.
- **No PCI**: el secret key vive en `.env`, el cliente solo recibe `clientSecret` (un nonce de Stripe que NO permite reutilizar la tarjeta).

## Cuándo NO usar este módulo

- **Pagos VES** (bolívares): Stripe no opera en VES — usar Pago Móvil / transferencia.
- **Suscripciones del SaaS** (Oliver Sutherland paga su mensualidad de SmartKubik): seguir usando Binance Pay o Stripe Subscriptions (no implementado aquí; este módulo solo cobra órdenes one-shot).
- **Crypto / USDT**: usar Binance Pay.

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/public/stripe/payment-intent` | `@Public()` | Crea o reutiliza un PaymentIntent para una orden existente. Body: `{ tenantId, orderId, customerEmail?, customerName? }`. Devuelve `{ clientSecret, publishableKey, paymentIntentId, orderNumber, amountCents, currency }`. |
| POST | `/api/v1/webhooks/stripe` | `@Public()` + firma | Recibe webhooks firmados de Stripe. Body raw, header `stripe-signature`. Devuelve 200 con `{ received, eventId, eventType, duplicate, applied }`. |

## Variables de entorno

```
STRIPE_SECRET_KEY=sk_test_...          # o sk_live_ en prod
STRIPE_PUBLISHABLE_KEY=pk_test_...     # se devuelve al cliente vía /payment-intent
STRIPE_WEBHOOK_SECRET=whsec_...        # del dashboard → webhooks → endpoint → signing secret
```

Si `STRIPE_SECRET_KEY` está vacío, el módulo carga sin error pero `/payment-intent` responde `400 Stripe no está configurado`. Útil para tenants que no usan Stripe.

## Integración con Orders

Cuando Stripe entrega `payment_intent.succeeded`, `StripePayService` persiste el estado y emite el evento `stripe.payment_intent.succeeded` (event-driven, sin acoplamiento directo). El listener `StripePaymentListener` en `modules/orders/services/stripe-payment.listener.ts` lo recibe y llama a `OrdersService.registerPayments()` con:

```ts
{
  payments: [{
    method: 'stripe_card_usd',
    amount: amountUsd,
    currency: 'USD',
    exchangeRate: 1,
    reference: `${paymentIntentId} (visa ****4242)`,
    isConfirmed: true,
    idempotencyKey: paymentIntentId,
  }]
}
```

Esto reusa toda la lógica existente:
- Actualiza `Order.paymentStatus` → `paid`
- Dispara backflush BOM + OUT movements de inventario (vía `setImmediate`)
- Crea asientos contables (DR Caja, CR CxC)
- **No aplica IGTF**: `stripe_card_usd` no está en `igtfApplicableMethods` de `PaymentsService` (que solo lista `efectivo_usd`, `transferencia_usd`, `zelle_usd`). Para tenants venezolanos que quieran IGTF sobre Stripe, agregar el método a esa lista.

**Idempotencia end-to-end**: si Stripe reenvía el webhook, `processedWebhookEvents[]` lo dedupea ANTES de emitir el evento. Si el listener llegara a correr dos veces (improbable), `PaymentsService.create` aplica idempotency-key (`paymentIntentId`) y rechaza el duplicado.

## Ver también

- [API reference](api-reference.md) — payloads exactos.
- [Functions](functions.md) — qué hace cada método del service.
- [Data model](data-model.md) — schema de `StripePaymentIntent`.
- Patrón de webhook signing: docs Stripe → https://docs.stripe.com/webhooks/signatures
