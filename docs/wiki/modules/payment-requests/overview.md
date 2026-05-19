# Payment Requests

## ¿Qué es?

El módulo de **Payment Requests** es como un **portal cobrador con recibo digital**. Cuando un cliente pide algo por la tienda online y la única forma de pagar es transferencia / Pago Móvil / Zelle, el sistema le envía por WhatsApp un enlace único. Allí el cliente ve cuánto pagar, a qué cuenta, copia los datos con un tap y sube la foto del comprobante. El negocio recibe una notificación, revisa el comprobante en un panel y lo confirma — eso genera automáticamente el `Payment` en el libro mayor y marca la orden como pagada.

Es la pieza que reemplaza el caos de capturas de pantalla por WhatsApp con un flujo estructurado, auditable y con back-and-forth ("falta tu cédula", "el monto no coincide", "el banco aún no acredita").

## ¿Para quién es?

- **Cliente del storefront / WhatsApp / Instagram**: usa el portal `/pago/[token]` para pagar y subir comprobante
- **Cajero / Owner del negocio**: revisa comprobantes pendientes desde el panel admin, confirma o pide corrección
- **Sistema (automático)**:
  - Listener `order.created` auto-emite un PaymentRequest en órdenes del storefront cuando el tenant lo activó
  - Cron diario marca como `expired` las solicitudes pendientes que pasaron de su `expiresAt`

## ¿Qué problema resuelve?

- **Sin enlace estructurado**, el cliente pierde el mensaje de WhatsApp donde el negocio le pasó los datos bancarios
- **Sin formulario guiado**, escribe la referencia con typos y obliga al cajero a pedir corrección por chat
- **Sin audit trail**, no hay registro de quién subió qué comprobante, cuándo, ni quién lo aprobó
- **Sin tipología de rechazo**, "rechazado" genérico no le dice al cliente qué hacer ("¿re-pagar? ¿reenviar foto?")
- **Sin storage controlado**, las fotos quedan en WhatsApp y se pierden o filtran metadatos EXIF (ubicación, dispositivo)

## Funcionalidades principales

- **Creación polimórfica**: el PaymentRequest apunta a una Order / Appointment / Invoice y guarda un snapshot congelado del entity (items + total + cliente) — sobrevive si el entity se edita después
- **Auto-creación gatillada** sólo para órdenes del storefront cuando `TenantPaymentConfig.requirePaymentProof === true`
- **Creación manual** desde el admin (Batch C) para órdenes de POS / WhatsApp / Instagram
- **JWT de portal** firmado con el mismo `JWT_SECRET` del backend, con `scope: 'payment_portal'` y expiración alineada con `expiresAt` del documento (1-30 días configurable por tenant)
- **Multi-comprobante (mixed payments)**: cada `PaymentRequest` tiene un array `proofs[]` — un cliente puede pagar parcial Pago Móvil + Zelle
- **Tipología de rechazo** (`info_mismatch`, `proof_unclear`, `partial`, `awaiting_settlement`, `rejected_final`) que dispara mensajes WhatsApp específicos y experiencias distintas en el portal cuando el cliente vuelve
- **Pipeline de imagen**: validación por magic bytes (JPG/PNG/WebP/HEIC) → Sharp resize a 1600px → webp@80% → EXIF stripped → SHA-256 → `LocalDiskAdapter` (R2 swap es 1 línea)
- **Audit trail** en `events[]` que nunca se borra: `created | submitted | confirmed | rejected | message_sent | delivery.failed`...
- **Confirmación genera Payment**: por cada comprobante aceptado, llama a `PaymentsService.create()` con la idempotencyKey `pr_<prId>_<proofId>` → un `Payment` en estado `confirmed` ligado a la Order

## Cómo se conecta con el resto del sistema

| Módulo | Relación |
|---|---|
| `tenant-payment-config` | Lee `paymentMethods[]`, `requirePaymentProof`, `allowPartialPayments`, `paymentRequestExpiryDays` |
| `orders` | Escucha `order.created`; al confirmar, llama a `PaymentsService.create()` que actualiza `Order.paymentStatus` y `Order.payments[]` |
| `payments` | Genera `Payment` documents — PaymentRequest es **upstream** del ledger, nunca lo reemplaza |
| `marketing.WhatsAppService` | Envía el enlace del portal y los mensajes de corrección |
| `notification-center` | Fan-out interno con `category: 'finance'` y `type: 'payment-request.{submitted,confirmed,status-changed}'` |
| `tenant` | Validación del tenant + branding (logo, color) que el portal renderiza |

## Estado actual

- **PR1 (este)**: backend completo (schema, state machine, controllers, listener, cron, migraciones, tests)
- **PR2 (siguiente)**: portal Next.js bajo `/pago/[token]` en `food-inventory-storefront/`
- **PR3 (siguiente)**: widget admin (`<PaymentReviewSheet />`) + botón "Solicitar comprobante" + badge global

## Notas operativas

- **Storage**: PR1 usa `LocalDiskAdapter` (escribe en `uploads/payment-proofs/<tenantId>/<requestId>/<proofId>.webp`, servido por `main.ts:38`). El interface `PaymentProofStorageAdapter` está listo para un adapter R2 en un PR de follow-up.
- **Soft-delete**: sigue la convención del proyecto (`isDeleted: { $ne: true }`).
- **Tenant isolation**: cada query filtra por `tenantId`; el `PaymentTokenGuard` además verifica que el PR cargado coincide con el `tenantId` del claim.
- **Rate limit**: el endpoint público `POST /public/payment-portal/:token/proofs` tiene throttle de 5 envíos por hora.
