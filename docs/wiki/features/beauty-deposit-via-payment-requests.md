# Blueprint — Depósito de reserva (beauty) vía módulo Solicitudes de Pago

> **Estado:** propuesta para revisión · **Autor:** sesión Claude · **Fecha:** 2026-06-14
> **Objetivo:** que una reserva de beauty desde el storefront exija el depósito % que define el tenant, reusando el módulo Payment Requests (no construir un sistema de pagos paralelo).

---

## 1. Problema

Hoy el depósito de beauty está **configurado pero no conectado** (ver `docs/wiki/incidents` / análisis previo):

- Config existe: `requiresDeposit / depositType / depositAmount` por servicio ([beauty-service.schema.ts:109-115](../../../food-inventory-saas/src/schemas/beauty-service.schema.ts#L109)).
- El backend de reservas **ignora** el depósito: `create()` hardcodea `paymentStatus: 'unpaid'`, no calcula nada ([beauty-bookings.service.ts:230-245](../../../food-inventory-saas/src/modules/beauty/services/beauty-bookings.service.ts#L230)).
- El storefront solo **muestra un texto** "Se requiere depósito de X%" ([BookingWizard.tsx:791](../../../food-inventory-storefront/src/components/booking/BookingWizard.tsx#L791)) — no cobra.
- El cliente reserva **sin pagar nada**.

## 2. Decisión: reusar Payment Requests

El módulo `payment-requests` ya es **polimórfico** (`entityType: order | appointment | invoice`) y trae todo lo difícil:

- Portal del cliente por token: `/pago/[token]` — elegir método, llenar datos de la transacción, subir comprobante ([ProofSubmissionForm.tsx](../../../food-inventory-storefront/src/app/pago/[token]/_components/ProofSubmissionForm.tsx)).
- Conciliación admin: aceptar/rechazar (con tipologías), OCR de comprobantes, badge de pendientes, reenvío de link.
- Entrega por WhatsApp, métodos desde `TenantPaymentConfig`.

Pero **solo `order` está cableado**. `appointment` está diferido explícitamente:
- Crear: `resolveEntitySnapshot` lanza `NotImplementedException` si `entityType !== 'order'` ([service.ts:1065](../../../food-inventory-saas/src/modules/payment-requests/services/payment-requests.service.ts#L1065)).
- Confirmar: misma excepción ([service.ts:440](../../../food-inventory-saas/src/modules/payment-requests/services/payment-requests.service.ts#L440)).

**El trabajo es terminar la rama `appointment`, no construir nada nuevo.**

## 3. Decisiones de producto (tomadas)

| # | Decisión | Elección |
|---|---|---|
| 1 | Monto del depósito (`amountDue`) | **Por servicio** — `depositType/depositAmount` de cada servicio |
| 2 | Estado de la cita mientras no paga | **Pendiente de pago** — se crea `status: 'pending'` (ya bloquea el slot), se confirma al aceptar el comprobante, expira a **1h** si no paga |
| 3 | Entrega del link | **Redirigir** a `/pago/[token]` tras reservar **+ WhatsApp** como respaldo |
| 4 | Ventana de expiración del hold | **1 hora** desde la creación del PR |
| 5 | ¿Genera Payment en contabilidad? | **Sí** — al aceptar el comprobante se crea un `Payment` tipo `deposit` (la caja/contabilidad debe cuadrar) |
| 6 | Pago parcial | **No** — monto exacto del % estipulado por el tenant |
| 7 | Citas creadas por el admin (agendamiento por WhatsApp) | **Soportado** — un user agenda y comparte el link de pago al cliente (cliente tech-resistant) |

### Fórmula del monto (decisión 1)
```
amountDue = Σ (por cada servicio del booking con requiresDeposit=true):
    depositType === 'percentage'  → servicePrice * depositAmount / 100
    depositType === 'fixed'       → depositAmount
```
`servicePrice` incluye addons. Currency = **USD** (los servicios cotizan en USD, igual que el path de `order`).

## 4. Máquina de estados (decisión 2)

```
Cliente reserva (servicio con depósito)
        │
        ▼
BeautyBooking  status='pending'  paymentStatus='unpaid'  depositRequired=true
  + PaymentRequest(entityType='appointment', amountDue=<depósito>, expiresAt=+1h)
        │ slot RESERVADO (pending bloquea availability — service.ts:333)
        ▼
Cliente paga en /pago/[token] → sube comprobante → PR.status='proof_submitted'
        │
        ├── admin ACEPTA comprobante
        │      → crea Payment tipo 'deposit' (contabilidad)
        │      → booking.depositInfo = { amount, paid:true, paidAt, method }
        │      → booking.paymentStatus = 'deposit_paid'
        │      → booking.status = 'confirmed'
        │
        ├── admin RECHAZA → cliente reintenta (PR ya soporta tipologías de rechazo)
        │
        └── expira (no paga en 1h) → job cancela booking.status='cancelled' (libera slot)
```

> **Nota:** `validateAvailability` excluye solo `['cancelled','no_show']`, así que `pending` ocupa el slot sin cambios. Solo hace falta el **job de expiración**.

## 5. Cambios por capa (archivos exactos)

### Backend — `payment-requests`
1. **`resolveEntitySnapshot`** ([service.ts:1053](../../../food-inventory-saas/src/modules/payment-requests/services/payment-requests.service.ts#L1053)) — agregar rama `appointment`:
   - Leer `BeautyBooking` por `entityId` + tenant.
   - `snapshot.items` = servicios del booking (`name`, `qty:1`, `unitPrice:price`, `total:price`).
   - `amountDue` = depósito calculado (§3). `currency: 'USD'`.
   - `customerPhone` = `booking.client.phone`. `allowMethodOverride` = true (storefront).
2. **Rama de confirmación** ([service.ts:440](../../../food-inventory-saas/src/modules/payment-requests/services/payment-requests.service.ts#L440)) — para `appointment`, en vez de `paymentsService.create(sale)`:
   - **Contabilidad vía JournalEntry (no Payment)** — confirmado. Reusar `accountingService.createJournalEntryForManualDeposit` ([accounting.service.ts:817](../../../food-inventory-saas/src/modules/accounting/accounting.service.ts#L817)), que ya existe y es genérico: debita caja (1101) y acredita **Anticipos de Clientes (2103, Pasivo)**. **No se toca `payment.schema.ts`.**
   - `booking.depositInfo = { amount, paid: true, paidAt: now, method }`; `paymentStatus = 'deposit_paid'`; `status = 'confirmed'` (si estaba `pending`).
   - Asiento no-bloqueante (try/catch): si contabilidad falla, la reserva igual se confirma (se loguea).
   - Inyectar `BeautyBooking`/`BeautyService` models + `AccountingService` en `PaymentRequestsService`.

> **⚠️ Hallazgo arquitectónico:** Beauty usa el modelo **`BeautyBooking`** (controllers `/beauty-bookings`), NO el `Appointment` del módulo `appointments` (ese es para hospitality/clinic — el admin móvil hace `isBeauty ? '/beauty-bookings' : '/appointments'`). La rama `appointment` del PR apunta a `BeautyBooking`. `createJournalEntryForManualDeposit` recibe `appointmentId` solo como metadata → reutilizable con el id del booking.
>
> **Nota (2 flujos storefront):** `/beauty/reservar` → `createBeautyBooking` → `/public/beauty-bookings` → **BeautyBooking** (beauty, este feature). El `BookingWizard` de `/book` → `/public/appointments` → `Appointment` (verticales genéricos/hospitality) es OTRO flujo, no tocado.
>
> **✅ Fase A IMPLEMENTADA**: branches `appointment` en `resolveEntitySnapshot` y `confirm` + helper de depósito + wiring. Build verde.

### Backend — `beauty-bookings`
3. **`create()`** ([service.ts:87](../../../food-inventory-saas/src/modules/beauty/services/beauty-bookings.service.ts#L87)):
   - Calcular si algún servicio `requiresDeposit` → `depositRequired=true`, `depositInfo.amount` = §3.
   - Mantener `status:'pending'`, `paymentStatus:'unpaid'`.
   - Si `depositRequired` → crear el `PaymentRequest` (entityType `appointment`, `expiresAt = +1h`) y devolver `{ booking, paymentToken }`.
   - **Aplica tanto a reservas del storefront como a agendamientos creados por el admin** (decisión 7): en ambos casos se genera el PR; el storefront redirige al portal, el admin obtiene el link para compartir por WhatsApp (botón §10).
4. **Job de expiración** (nuevo, en `appointments/queues/` siguiendo el patrón de `appointment-reminder.processor.ts`):
   - Cancelar bookings `pending` + `depositRequired` + `paymentStatus='unpaid'` cuyo PR expiró (**ventana de 1h**) → `status='cancelled'`. Correr con frecuencia fina (cada ~5 min) dado que la ventana es corta.
5. **Schema** ([beauty-booking.schema.ts:231](../../../food-inventory-saas/src/schemas/beauty-booking.schema.ts#L231)): `depositInfo` ya existe. Agregar opcional `paymentRequestId?: ObjectId` para trazar.

### Storefront
6. **`BookingWizard.tsx`** ([791](../../../food-inventory-storefront/src/components/booking/BookingWizard.tsx#L791)): si la respuesta de `createBeautyBooking` trae `paymentToken`, **redirigir** a `/pago/[token]` en lugar de mostrar el paso 4 de éxito. El texto actual del depósito queda como preview en el paso de confirmación.
7. **`beautyApi.ts`** ([createBeautyBooking:275](../../../food-inventory-storefront/src/lib/beautyApi.ts#L275)): tipar el nuevo `paymentToken` en la respuesta.
8. **Portal `/pago/[token]`**: verificar que `AmountBlock` y el render del snapshot funcionan con el snapshot de `appointment` (servicios como items). Es entity-agnostic; se espera que funcione sin cambios.

### Admin
9. **`PaymentRequestsPage`**: las solicitudes de citas aparecerán automáticamente; agregar etiqueta de `entityType` (Orden / Cita) en la lista para distinguir.
10. **`MobileAppointmentDetailSheet`** ([359](../../../food-inventory-admin/src/components/mobile/appointments/MobileAppointmentDetailSheet.jsx#L359)): ya lee `depositInfo.paid`. Agregar acción "Reenviar link de depósito" (usa el endpoint `resend-link` que ya existe).

## 6. Decisiones resueltas

- **Ventana de expiración**: **1 hora**. Job corre cada ~5 min.
- **Payment en contabilidad**: **sí** — al aceptar el comprobante se crea `Payment` tipo `deposit`. No es opcional.
- **Pago parcial**: **off** (`allowPartialPayments: false`) — monto exacto del % del tenant.
- **Bookings creados por el admin**: **soportados** — generan PR y el user comparte el link por WhatsApp (botón §10). Cubre clientes tech-resistant que agendan por chat.

## 7. Plan de implementación (fases)

| Fase | Alcance | Entregable verificable |
|---|---|---|
| **A** ✅ | Backend: `resolveEntitySnapshot` + confirmación para `appointment` (target `BeautyBooking`) + asiento vía `createJournalEntryForManualDeposit`. Sin tocar `payment.schema`. | Crear PR de una cita por API y aceptarla marca `deposit_paid`/`confirmed` **y** genera el asiento (Anticipos de Clientes) |
| **B** ✅ | Backend: `create()` calcula depósito (util compartido) + crea PR (`expiresInMinutes:60`) + skip notif "confirmado"; job 5-min cancela holds vencidos; guard confirm si cancelada; schema `paymentRequestId`/`depositExpiresAt`. El link se entrega por **WhatsApp** (el redirect storefront es Fase C). Degrada si el tenant no tiene métodos de pago. | Reservar por API con servicio-con-depósito crea booking `pending` + PR + manda link WhatsApp; sin pago en 1h → cancela |
| **C** ✅ | Storefront beauty (`beauty/reservar/page.tsx`): si la respuesta trae `depositPayment.url` → redirige a `/pago/[token]`. `beautyApi.Booking` tipa `depositPayment`. Backend: `create()` devuelve `depositPayment {required,amount,url,paymentRequestId}`. | Reservar con depósito en el storefront → cae en el portal de pago |
| **D** ✅ | Admin: la etiqueta `entityType`→"Cita" ya existía (`entityNoun`). Botón **Reenviar link de pago** en el detalle de cita (usa `resendPaymentLink` cuando hay `paymentRequestId` y el depósito no está pagado). | Conciliación visible; admin reenvía el link por WhatsApp |

**Tests obligatorios** (CLAUDE.md backend): unit de las dos ramas nuevas del service; ownership (tenant A no puede pagar PR de tenant B — ya cubierto por el token firmado, validar); cálculo de `amountDue` con mezcla fixed/percentage + addons; expiración libera slot.

## 8. Riesgos

- **Doble booking en la ventana de hold**: mitigado porque `pending` ocupa el slot; el job debe correr puntual para liberar.
- **Acoplamiento de módulos**: `payment-requests` pasa a depender de `beauty-bookings`. Inyectar vía interface/forwardRef para no crear ciclo de módulos Nest.
- **Snapshot desactualizado**: el PR congela el snapshot al crear; si el booking cambia de servicios después, el monto del depósito no se recalcula (igual que `order`). Aceptable.
- **Tenants sin métodos de pago configurados**: el PR no se puede crear sin `TenantPaymentConfig`. Validar y, si falta, degradar a "reserva sin depósito" + avisar al tenant.

---

### Anchors de código
- PR service: `food-inventory-saas/src/modules/payment-requests/services/payment-requests.service.ts`
- Booking service: `food-inventory-saas/src/modules/beauty/services/beauty-bookings.service.ts`
- Booking schema: `food-inventory-saas/src/schemas/beauty-booking.schema.ts`
- Portal cliente: `food-inventory-storefront/src/app/pago/[token]/`
- Wizard: `food-inventory-storefront/src/components/booking/BookingWizard.tsx`

---

## 9. Beta-test (2026-06-14, prod, tenant Barbería Sava) + deploy

**Resultado:** contrato funcional **7/7 PASS**. Flujo del dinero verificado en prod: depósito $7.50 (50% de $15), reserva en hold, portal acepta comprobante, admin acepta/confirma → **asiento contable correcto** (débito Caja 1101 / crédito Anticipos de Clientes 2103) + reserva `confirmed`/`deposit_paid`. Caso sin depósito, guard de cancelada y ventana de 1h: OK.

**Deployado a prod:** backend (A, B, H1), admin (D), storefront (C — redirect live, `.next` contiene `depositPayment`).

### Hallazgos del beta-test
- **H1 [resuelto]** — `buildPortalUrl` caía a `localhost:3001` (env `STOREFRONT_PUBLIC_URL` no seteada). Fix: `buildPortalUrlForTenant`/`resolveStorefrontBaseUrl` usan el dominio del storefront del tenant (`storefrontconfigs.domain` → `<domain>.smartkubik.com`). Verificado: `https://savabarberia.smartkubik.com/pago/<token>`, portal 200.
- **H2 [resuelto]** — Entrega por WhatsApp fallaba: `MessageDelivery validation failed: customerId required` (todo entityType). Fixes:
  - `message-delivery.schema`: `customerId` ahora **opcional** (entregas transaccionales sin Customer registrado).
  - `attemptWhatsappDelivery`: usa `buildPortalUrlForTenant` (URL branded).
  - `create()`: **`pr.save()`** tras `attemptWhatsappDelivery` (antes no persistía channel/attempts — bug pre-existente de todo entityType).
  - `resendDeliveryLink`: cae a `entitySnapshot.customerPhone` si no se pasa teléfono.
  - Verificado en prod: `attempts:1`, sin error de `customerId`; resend sin teléfono → 201. Con número de prueba falso Whapi rechaza el envío; con número real → `channel='whatsapp'`.
- **H3 [follow-up, menor]** — `resend-link` sin teléfono **ya cae al almacenado** (resuelto con H2). Pendientes: `depositInfo.method`/asiento usan `selectedMethod.label` y no el método real del comprobante; `resend-link` responde 200 sobre PR ya confirmado (debería bloquear); cancelar tras `deposit_paid` no genera asiento de reversa.
