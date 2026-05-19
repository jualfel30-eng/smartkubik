# Payment Requests — Catálogo de Funciones

> Última actualización: 2026-05-13

---

## Resumen

| Función | Descripción | Quién la usa | Módulos relacionados |
|---|---|---|---|
| Crear PaymentRequest manual | Tenant genera un PR para una orden ya existente, con opción WhatsApp/manual/QR | Cajero / Owner | tenant-payment-config, marketing (Whapi), orders |
| Auto-emitir PR en orden storefront | Listener escucha `order.created` y emite PR si el tenant lo activó | Sistema (automático) | orders, tenant-payment-config |
| Reenviar enlace por WhatsApp | Retry manual cuando la entrega cayó en `pending_manual` | Cajero / Owner | marketing (Whapi) |
| Cargar info pública del portal | Cliente abre `/pago/[token]` y ve datos para pagar | Cliente del storefront | tenant (branding) |
| Subir comprobante | Cliente envía foto + datos del pago | Cliente del storefront | uploads (vía LocalDiskAdapter) |
| Aceptar comprobante | Tenant marca un proof como válido | Cajero / Owner | — |
| Pedir corrección (rechazar tipado) | Tenant elige razón (info / foto / parcial / hold / fraude) | Cajero / Owner | marketing (mensaje WhatsApp específico) |
| Confirmar PR | Genera Payment(s) en el libro mayor y marca Order como pagada | Cajero / Owner | payments, orders |
| Marcar awaiting_settlement | Hold silencioso al cliente mientras el banco acredita | Cajero / Owner | — |
| Expirar PRs sin actividad | Cron diario marca como `expired` los `pending` vencidos | Sistema (automático) | — |

---

## Crear PaymentRequest manual

**Endpoint:** `POST /api/v1/payment-requests`
**Servicio:** `PaymentRequestsService.create(tenantId, dto, actor)`

Flujo:

1. Carga `TenantPaymentConfig` del tenant. Falla si no existe (`400`).
2. Resuelve `entitySnapshot`:
   - Para `entityType: 'order'`, busca la Order del tenant y mapea `items`, `subtotal`, `ivaTotal → tax`, `totalAmount → total`.
   - `entityType: 'appointment' | 'invoice'` → `501 NotImplementedException` (llegará en un release próximo).
3. Resuelve `selectedMethod`:
   - Si `dto.methodId` viene → busca el método activo correspondiente. Si no existe / no está activo → `400`.
   - Si no → toma el primer método activo **no-cash** (fallback al primer activo si todos son cash).
   - Copia el `accountDetails` completo + `label` + `methodId` al PR (frozen snapshot).
4. Calcula `expiresAt = now + min(30, max(1, paymentRequestExpiryDays || 7)) días`.
5. Construye el documento, llama `save()`, **luego** firma el JWT con el `_id` ya conocido y vuelve a guardar.
6. Intenta entrega vía WhatsApp si hay teléfono y `deliveryChannel !== 'manual'`:
   - Normaliza el teléfono con `normalizeWhatsAppPhone()` (formato VE → `584...`).
   - Llama `WhatsAppService.sendTextMessage()`. En éxito: `delivery.channel = 'whatsapp'` + `deliveredAt`. En fallo: `delivery.channel = 'pending_manual'` + `lastError`.
7. Devuelve `{ paymentRequest, portalUrl }`.

Garantías:

- Nunca bloquea por fallo de entrega — el PR queda creado con `pending_manual` y el admin reintenta con `resend-link`.
- El audit event `created` siempre queda registrado, incluso si la entrega falla.

---

## Auto-emitir PR en orden storefront

**Listener:** `PaymentRequestOrderCreatedListener.handleOrderCreated()`
**Evento:** `@OnEvent('order.created')` emitido por [`OrdersService` en línea 789](../../../food-inventory-saas/src/modules/orders/orders.service.ts#L789)

Gates (todos deben cumplirse):

1. `payload.source === 'storefront'`
2. `TenantPaymentConfig.requirePaymentProof === true`
3. El tenant tiene **al menos un método activo no-cash** en `paymentMethods[]`
4. `Order.paymentStatus === 'pending'` (no auto-emitir si ya está paid/partial)

Si pasa, llama al mismo `paymentRequestsService.create()` con `actor: { kind: 'system' }` y `methodId` del primer método no-cash. Cualquier error se logea pero **nunca se lanza** — la creación de la orden ya está commited.

---

## Cargar info pública del portal

**Endpoint:** `GET /api/v1/public/payment-portal/:token`
**Guard:** `PaymentTokenGuard` (verifica JWT, scope, carga PR, rechaza terminales)
**Servicio:** `PaymentRequestsService.buildPublicInfo(pr)`

Devuelve un DTO minimalista (`PublicPaymentInfoDto`):

- `status`, `expiresAt`, `amountDue`, `currency`, `exchangeRateSnapshot`
- `entity.snapshot` (no se expone `entityId` directo — el portal no lo necesita)
- `selectedMethod` con `accountDetails` para tap-to-copy
- `diagnostic` — sólo poblado si el PR está en `info_mismatch | proof_unclear | partial`: extrae el último evento `proof.rejected` y devuelve `{ reason, note, rejectedProofId, rejectedAt }`
- `tenant.name` + `branding` (logo, primaryColor) si el tenant tiene esos campos

Lo que **no** devuelve: `events`, `paymentIds`, `delivery.lastError`, otros `proofs[]` rechazados.

---

## Subir comprobante

**Endpoint:** `POST /api/v1/public/payment-portal/:token/proofs` (multipart)
**Servicio:** `PaymentRequestsService.submitProof(pr, dto, file)`

Flujo:

1. Verifica que el estado actual permita customer re-submit (`pending | info_mismatch | proof_unclear | partial`). Si no → `409`.
2. `ImageOptimizerService.optimize(file.buffer)`:
   - Valida magic bytes (rechaza PDFs, ejecutables, basura).
   - Sharp `.rotate()` (aplica EXIF orientation **antes** de strippearlo).
   - Resize a `width: 1600, withoutEnlargement: true`.
   - Convierte a `webp@quality 80`.
   - `.withMetadata()` NO se llama → EXIF/IPTC/XMP descartados.
   - SHA-256 sobre los bytes del output → `imageHash`.
3. Pre-mintea `proofId = new ObjectId()` antes de guardar — así el path en disco es determinístico.
4. `LocalDiskPaymentProofStorageAdapter.save()` escribe `uploads/payment-proofs/<tenantId>/<prId>/<proofId>.webp` con permisos `0o640`.
5. Empuja el proof al array `proofs[]`, añade evento `proof.submitted` al audit trail, transiciona `→ submitted`.
6. Fire-and-forget: `notifications.notifyProofSubmitted(pr)` → fan-out a notification-center con `category: 'finance'`, `type: 'payment-request.submitted'`, `priority: 'high'`.

Rate limit: throttle `long` (5 reqs / hora) sobre la combinación token + IP.

---

## Aceptar comprobante

**Endpoint:** `POST /api/v1/payment-requests/:id/proofs/:proofId/accept`
**Servicio:** `PaymentRequestsService.acceptProof()`

- Marca `proof.reviewStatus = 'accepted'`, llena `reviewedAt`, `reviewedBy`, `reviewNote`
- Empuja evento `proof.accepted` al audit trail
- Idempotente: una segunda llamada no añade evento duplicado
- No cambia el `status` del PR (eso ocurre al confirmar)

---

## Pedir corrección (rechazar con tipología)

**Endpoint:** `POST /api/v1/payment-requests/:id/proofs/:proofId/reject`
**Servicio:** `PaymentRequestsService.rejectProof()`

Mapeo `reason → status`:

| `reason` | `status` resultante | Notificación |
|---|---|---|
| `info_mismatch` | `info_mismatch` | WhatsApp con `note` + enlace re-entry |
| `proof_unclear` | `proof_unclear` | WhatsApp pidiendo nueva foto |
| `partial` | `partial` | WhatsApp pidiendo completar |
| `awaiting_settlement` | `awaiting_settlement` | **Silencioso** al cliente (sólo notif interna) |
| `rejected_final` | `rejected_final` | WhatsApp "Esta solicitud quedó cerrada" |

Marca el proof rechazado pero deja el array intacto (no se borra — historial). Cuando el cliente vuelve y re-envía, se añade un **nuevo proof**, no se mutan los rechazados.

---

## Confirmar PR

**Endpoint:** `POST /api/v1/payment-requests/:id/confirm`
**Servicio:** `PaymentRequestsService.confirm()`

1. Requiere `actor.userId` (no permite confirmaciones por `system`). `400` si falta.
2. Filtra `proofs` con `reviewStatus === 'accepted'`. Si la lista está vacía → `400` ("Acepta al menos un comprobante").
3. Si `entityType !== 'order'` → `501` (PR1).
4. Por cada accepted proof:
   - Construye `CreatePaymentDto` con `paymentType: 'sale'`, `orderId: pr.entityId`, `method: pr.selectedMethod.methodId || legacy mapping`, `reference: proof.referenceNumber`, `status: 'confirmed'`, `idempotencyKey: pr_<prId>_<proofId>`.
   - Llama `PaymentsService.create(dto, { tenantId, id: actor.userId })`.
   - El `PaymentsService` se encarga de actualizar `Order.paymentStatus`, `Order.payments[]`, etc. (no duplicamos lógica).
   - Capturamos el `Payment._id` y lo añadimos a `pr.paymentIds`.
5. Empuja evento `confirmed` y transiciona `→ confirmed`.
6. Fire-and-forget: `notifications.notifyConfirmed(pr)` (in-app, `priority: 'medium'`).

---

## Reenviar enlace (`resend-link`)

**Endpoint:** `POST /api/v1/payment-requests/:id/resend-link`
**Servicio:** `PaymentRequestsService.resendDeliveryLink()`

Reintenta el envío Whapi con el teléfono pasado en body (o el último de `delivery.deliveredTo` si se omite). Suma `delivery.deliveryAttempts`. No cambia el `status`.

---

## Cron: expirar PRs sin actividad

**Job:** `ExpireStalePaymentRequestsJob.run()`
**Schedule:** `@Cron(CronExpression.EVERY_DAY_AT_2AM)` (Caracas time del servidor)
**Servicio:** `PaymentRequestsService.expireStale()`

Query: `{ status: 'pending', expiresAt: { $lt: now }, isDeleted: { $ne: true } }`.

Para cada doc: transiciona `pending → expired` (transición legal sólo para actor `system`), añade evento `expired` con el `expiresAt` original, `save()`. Si un `save()` falla, logea y continúa con el resto. Devuelve el count para el log.

`awaiting_settlement` re-check job (6/12/24h) está documentado en el spec pero **deferido a Phase 2** — el cliente lo logra con `markAwaitingSettlement → confirm` manual.

---

## Detalles de seguridad

- **Tenant isolation**: cada query en `PaymentRequestsService` filtra por `tenantId`; el `PaymentTokenGuard` lo verifica también contra el claim del JWT.
- **Soft-delete consistente**: `isDeleted: { $ne: true }` en toda lectura (matchea convención del proyecto).
- **Sanitización de input**: campos string (`originBank`, `payerIdNumber`, `referenceNumber`, `reviewNote`) pasan por `@SanitizeString` / `@SanitizeText`.
- **Magic-byte validation**: `ImageOptimizerService.validateMagicBytes()` rechaza PDFs, ejecutables y buffers vacíos antes de pasar a Sharp.
- **EXIF strip**: Sharp pipeline no llama `.withMetadata()` → todos los metadatos se descartan en el webp final.
- **JWT scope check**: el `PaymentTokenService.verify()` rechaza tokens con scope distinto de `payment_portal`, así un token de auth no puede usarse en el portal y viceversa.
- **Rate limit del portal**: 5 envíos/hora vía throttler `long` ya configurado en `ThrottlerModule.forRoot()`.
- **Path traversal**: `LocalDiskPaymentProofStorageAdapter.sanitizeSegment()` mapea cualquier carácter no `[a-zA-Z0-9_-]` a `_` antes de construir el path en disco.
