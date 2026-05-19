# Payment Requests — Referencia API

> Diseñado para ser consumido por agentes de IA y el admin / storefront.
> Última actualización: 2026-05-13

---

## Metadata

- **Módulo backend**: `src/modules/payment-requests/`
- **Controllers**: `payment-requests.controller.ts` (tenant), `public/payment-portal.controller.ts` (público)
- **Servicio**: `payment-requests.service.ts`
- **Schema MongoDB**: `schemas/payment-request.schema.ts`
- **Guard del portal público**: `payment-token.guard.ts` (valida JWT + carga PR + rechaza estados terminales)
- **Permiso requerido (tenant)**: `payment_requests_review`
- **Guard stack (tenant)**: `JwtAuthGuard → TenantGuard → PermissionsGuard`
- **Guard stack (público)**: `@Public()` + `PaymentTokenGuard`
- **Env requeridos**: `JWT_SECRET`, `WHAPI_MASTER_TOKEN`, `STOREFRONT_PUBLIC_URL`

---

## Endpoints autenticados (tenant)

Base: `/api/v1/payment-requests`. Todos requieren `Authorization: Bearer <jwt>` + permiso `payment_requests_review`.

### POST /api/v1/payment-requests
- **Descripción**: Crear PaymentRequest manualmente para una Order existente
- **Request:**
```json
{
  "entityType": "order",                       // o "appointment" / "invoice" (PR1 sólo soporta "order")
  "entityId": "60ed4f6a8c3e8b0001abc123",
  "methodId": "transferencia_usd",             // opcional — si se omite, toma el primer método activo no-cash
  "deliveryPhone": "04241234567",              // opcional — cualquier formato VE
  "deliveryChannel": "whatsapp" | "manual",    // opcional — default "whatsapp" si hay phone
  "allowMethodOverride": false                 // opcional — default según source del entity
}
```
- **Response 201:**
```json
{
  "success": true,
  "data": {
    "paymentRequest": { /* PaymentRequest completo */ },
    "portalUrl": "http://localhost:3001/pago/<token>"
  }
}
```
- **Errores**:
  - `400` — tenant sin métodos activos / `entityId` inválido / `entityType` no soportado en PR1
  - `404` — Order no encontrada
  - `501 NotImplemented` — `entityType` ∈ {`appointment`,`invoice`}

### GET /api/v1/payment-requests
- **Query params**:
  - `status?` — uno de los 9 estados
  - `entityType?` — `order` | `appointment` | `invoice`
  - `page?` (≥1, default 1)
  - `limit?` (1-100, default 20)
- **Response 200:**
```json
{ "success": true, "data": [...], "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
```

### GET /api/v1/payment-requests/pending-count
- **Descripción**: Contador para el badge del navbar (PR en estado `submitted`)
- **Response 200:** `{ "success": true, "data": { "count": 3 } }`

### GET /api/v1/payment-requests/:id
- **Descripción**: Detalle con audit trail completo (`events[]`)
- **Response 200:** `{ "success": true, "data": <PaymentRequest> }`
- **Errores**: `404` si no pertenece al tenant

### POST /api/v1/payment-requests/:id/proofs/:proofId/accept
- **Body:** `{ "note"?: string }`
- **Efecto**: marca proof `reviewStatus = "accepted"`. Idempotente.
- **Response 200:** PaymentRequest actualizado

### POST /api/v1/payment-requests/:id/proofs/:proofId/reject
- **Body:**
```json
{
  "reason": "info_mismatch" | "proof_unclear" | "partial" | "awaiting_settlement" | "rejected_final",
  "note"?: "string"
}
```
- **Efecto**: marca proof rechazado y transiciona el PR al estado correspondiente. Envía WhatsApp al cliente (excepto `awaiting_settlement`, que es silencioso).
- **Response 200:** PaymentRequest actualizado
- **Errores**: `409` si el PR está en estado terminal

### POST /api/v1/payment-requests/:id/confirm
- **Body**: `{}`
- **Efecto**: por cada `proof` con `reviewStatus === "accepted"` llama `PaymentsService.create()` con `idempotencyKey: pr_<prId>_<proofId>`. Transiciona el PR a `confirmed`.
- **Response 200:** PaymentRequest con `paymentIds[]` poblado
- **Errores**:
  - `400` — ningún proof aceptado, o user no autenticado
  - `409` — transición ilegal
  - `501` — `entityType !== 'order'` (PR1)

### POST /api/v1/payment-requests/:id/awaiting-settlement
- **Body**: `{}`
- **Efecto**: deja el PR en hold sin notificar al cliente (banco aún no acreditó)
- **Response 200:** PaymentRequest actualizado

### POST /api/v1/payment-requests/:id/resend-link
- **Body:** `{ "phone"?: string }` — si se omite, usa `pr.delivery.deliveredTo`
- **Efecto**: reintenta envío Whapi del enlace. Sigue dejando `delivery.channel = 'pending_manual'` si falla.
- **Response 200:** PaymentRequest con `delivery` actualizado

---

## Endpoints públicos (cliente final)

Base: `/api/v1/public/payment-portal/:token`. Sin `Authorization`. El `:token` es el JWT firmado.

### GET /api/v1/public/payment-portal/:token
- **Descripción**: Devuelve la información para renderizar el portal
- **Guard**: `PaymentTokenGuard` rechaza si el PR está en `confirmed | rejected_final | expired`
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "pending" | "info_mismatch" | ...,
    "expiresAt": "ISO string",
    "amountDue": 24.50,
    "currency": "USD",
    "exchangeRateSnapshot": 37.82,
    "allowPartialPayments": false,
    "allowMethodOverride": false,
    "entity": {
      "type": "order",
      "snapshot": {
        "items": [{ "name": "...", "qty": 1, "unitPrice": 12.25, "total": 12.25 }],
        "subtotal": 22.50,
        "tax": 2.00,
        "total": 24.50,
        "customerName": "María González",
        "createdAt": "ISO string"
      }
    },
    "selectedMethod": {
      "type": "pago_movil",
      "label": "Pago Móvil Banesco",
      "methodId": "pago_movil_ves",
      "accountDetails": { "pagoMovilBank": "Banesco", "pagoMovilCI": "V-12345678", ... }
    },
    "diagnostic": null | {
      "reason": "info_mismatch",
      "note": "La cédula no coincide con el titular del comprobante.",
      "rejectedProofId": "...",
      "rejectedAt": "ISO string"
    },
    "tenant": { "name": "Café del Sur", "branding": { "logoUrl": "...", "primaryColor": "..." } }
  }
}
```
- **Errores**: `401` token inválido/expirado, `403` PR terminal

### POST /api/v1/public/payment-portal/:token/proofs
- **Content-Type**: `multipart/form-data`
- **Rate limit**: 5 envíos por hora (throttle `long`)
- **Form fields**:
  - `image` — File (JPG/PNG/WebP/HEIC), ≤10MB
  - `amount` — number
  - `currency` — `USD` | `VES`
  - `method` — `transfer` | `pago_movil` | `zelle` | `cash` | `card`
  - `originBank`, `payerIdNumber`, `payerPhone`, `referenceNumber` — string (sanitizados)
  - `replacesProofId?` — para re-envíos después de rechazo
- **Response 201:**
```json
{ "success": true, "data": { "status": "submitted", "proofId": "<id>" } }
```
- **Errores**:
  - `400` — image faltante / formato no soportado (magic-byte check) / sobre 10MB
  - `401` — token inválido
  - `409` — PR no admite envío (estado terminal)
  - `429` — más de 5 envíos por hora con el mismo token

---

## Migraciones expuestas

Base: `/api/v1/migrations`. Requieren JWT (`JwtAuthGuard`). Pensadas para super-admin durante el rollout.

### POST /api/v1/migrations/extend-tenant-payment-config-for-payment-requests
Backfill: añade `requirePaymentProof=false`, `allowPartialPayments=false`, `paymentRequestExpiryDays=7` a documentos existentes. Idempotente.

### POST /api/v1/migrations/seed-payment-requests-review-permission
Inserta el permiso `payment_requests_review` en `permissions` y lo agrega a los roles `admin` y `employee` que ya existen. Idempotente.

---

## Eventos consumidos / emitidos

| Evento | Dirección | Quién |
|---|---|---|
| `order.created` | consumido | `order-created.listener.ts` — auto-crea PR si `source==='storefront'` + `requirePaymentProof===true` |
| `notification` (Socket.IO) | emitido | El `notification-center` ya existente, con `category='finance'` y `type='payment-request.{submitted,confirmed,status-changed}'` |
| WhatsApp text | emitido | `marketing/WhatsAppService.sendTextMessage()` — enlace del portal + mensajes de corrección |

---

## Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `JWT_SECRET` | — (required) | Firma del token del portal. Compartido con auth para reutilizar `JwtService`. |
| `WHAPI_MASTER_TOKEN` | — (required en prod) | Bearer del SDK Whapi para envío del enlace |
| `STOREFRONT_PUBLIC_URL` | `http://localhost:3001` | Base del enlace `<base>/pago/<token>` |
