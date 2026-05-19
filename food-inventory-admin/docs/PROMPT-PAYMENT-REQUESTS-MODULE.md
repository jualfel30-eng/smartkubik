# Prompt: Payment Requests — Cross-Vertical Payment Confirmation Module (SmartKubik)

## Your Role

You are a **senior product engineer with 15 years building payment confirmation flows** at Stripe, Mercado Pago, and Wise. You specialize in **manual reconciliation workflows for emerging markets** — where bank APIs are limited, fraud is real, and the difference between an abandoned cart and a closed sale is *how the customer feels* during the 2-minute task of proving they paid. You have shipped payment portals that processed billions in manual transfers across LATAM and you know that:

- A payment portal is **not a form** — it is a guided ritual that reduces anxiety, prevents typos, and rewards completion with dopamine.
- Manual bank reconciliation in Venezuela/LATAM is **conversational**, not transactional. Plan for back-and-forth ("falta tu cédula", "el monto no coincide", "el banco aún no acredita"), not just approve/reject.
- The customer is on **mobile, on cellular data, with one hand free, in the middle of doing something else**. Every tap matters. Every kilobyte matters. Every second matters.
- The tenant employee confirming the payment is **on their feet, attending another customer, has 30 seconds**. The admin UI must be **glanceable, batchable, undoable**.

You are working on **SmartKubik**, a multi-tenant SaaS ERP serving 6 verticals (food inventory, restaurant, beauty, billing, payroll, marketing) across LATAM. Stack: NestJS 10 + Mongoose + BullMQ + Socket.io (backend) | React 18 + Vite + Tailwind v4 + Framer Motion (admin) | Next.js 15 App Router (customer storefront). Dark mode (#0a0e1a). Mobile-first PWA.

---

## The Problem We're Solving

Today, tenants across all verticals receive payments through **manual bank transfer / Pago Móvil / Zelle**. The current flow is:

1. Customer pays via their bank app.
2. Customer screenshots the proof.
3. Customer sends it to the tenant via WhatsApp.
4. The tenant employee **manually reads** the screenshot, manually copies the reference number into the order, manually checks the bank statement, manually marks the order as paid.

This breaks down at every step:
- Customer forgets which account to pay to (loses the message).
- Customer mistypes the reference when texting.
- Tenant employee mixes up which proof belongs to which order during a busy hour.
- No audit trail. No structured data. No analytics. No automation.
- When the bank statement doesn't match, there's no clear way to ask the customer to clarify — back to chaos in WhatsApp.

**This module turns the chaos into a structured, conversational, mobile-first workflow** that works across every revenue-generating module in the platform.

---

## What Already Exists (audit before building)

Run `/Explore` or read these before scaffolding. Do not duplicate them.

### Backend (`food-inventory-saas/src/modules/`)
- `whapi/` — **active** WhatsApp Business integration (Whapi SDK). Has `whatsapp-order-notifications.service.ts` already requesting payment proofs by reply. **Use as the delivery channel for portal links.**
- `notification-center/` — **active** in-app + Socket.io + web-push notification hub with listeners. Already listens to `payment.received`. **Extend with new events.**
- `payments/` — **active** payment ledger (Payment schema with `paymentType`, `method`, `status`, `reference`, `receiptUrl`). **Do NOT extend; this is the confirmed-payment ledger. PaymentRequest is upstream of this.**
- `tenant-payment-config/` — **active** per-tenant bank account / Pago Móvil / Zelle config with public endpoint `GET /api/v1/public/tenant-payment-config/:tenantId/active-methods`. **Reuse for the portal.**
- `uploads/` — **stub** (multer diskStorage, no Sharp, no webp). **Extend or wrap with a new `PaymentProofStorageService`.**
- `orders/`, `appointments/`, `billing/` — entities that will reference PaymentRequest polymorphically.

### Frontend (`food-inventory-admin/src/`)
- `components/notifications/`, `contexts/NotificationContext.jsx` — already wired to notification-center. **Reuse.**
- `components/orders/OrderHistoryV2.jsx`, agenda components, AP/AR pages — where the "Pago por confirmar" widget will mount.

### Storefront (`food-inventory-storefront/`)
- Next.js 15 App Router. Already has public pages with `tenantId` in URL. **The payment portal lives here as a new route group `/pago/[token]`.**

---

## Architectural Decisions (locked in — do not re-debate)

| Decision | Value | Reason |
|---|---|---|
| **Entity** | New `PaymentRequest` (not extension of `Payment`) | Workflow ≠ ledger. Confirmed `PaymentRequest` *generates* a `Payment`. |
| **Polymorphism** | `entityType: 'order' \| 'appointment' \| 'invoice'` + `entityId` + `entitySnapshot` (denormalized) | Portal must survive entity mutation. Snapshot freezes items+total at request creation. |
| **Storage** | **Cloudflare R2** from day 1, behind `PaymentProofStorageService` interface | S3-compatible, $0 egress, ~$0.015/GB/mo. Interface keeps providers swappable. |
| **Image optimization** | Sharp → resize max 1600px width → webp quality 80 | Drop original, store only optimized. Target <200KB/image. EXIF stripped. |
| **Token** | Signed JWT, default 7d expiry (per-tenant configurable 1-30d), reusable for re-submission | Public access without auth. Re-entry allowed on rejection. |
| **Expiry config** | New field `paymentRequestExpiryDays` on `TenantPaymentConfig` (default 7, range 1-30) | Tenants with fast cash-flow needs shorten; long B2B cycles extend. |
| **Mixed payments** | Always supported — array `proofs[]` each with own amount/method | "Pagué $50 en Pago Móvil + $20 en Zelle" is a real case. |
| **Partial payments (abono)** | Gated by `tenantPaymentConfig.allowPartialPayments` (default false) | Tenant opts in. |
| **Method selection** | Auto from order if customer chose at checkout; tenant-picked if order created internally | Already how `tenant-payment-config` works. Just pass the chosen method to PaymentRequest. |
| **Creation trigger** | **Hybrid by `order.source`**: auto on `order.created` if `source === 'storefront'`; **manual button** "Solicitar comprobante" on order detail for `internal`/`whatsapp`/`pos`/`ig` sources | Storefront customers expect instant link; internal orders need tenant control to avoid sending mid-conversation. No amount threshold for MVP — let data inform later. |
| **WhatsApp delivery** | Modal-on-create with 3 options: **Enviar por WhatsApp** (phone pre-filled from entity, validated VE format), **Copiar link**, **Generar QR**. PaymentRequest is created even if WhatsApp is skipped (status remains `pending`, with `delivery: 'pending_manual'` flag). | Some channels lack phone (Instagram, legacy invoices) or customer is physically present (mostrador). All paths leave a record. |
| **Phone fallback (auto-creation)** | If storefront order auto-creates a PaymentRequest and phone is missing/invalid, PR is still created with `delivery: 'pending_manual'`. Admin shows badge "Sin enviar — copia el link" until tenant resolves. | Never block PR creation on delivery channel failure. |
| **Backfill of existing pending orders** | **On-demand only.** Same "Solicitar comprobante" button appears on pre-existing pending orders. AR page gets a filter chip "Sin solicitud de pago" to surface candidates. **No bulk migration script. No mass WhatsApp send.** | Bulk send burns tenant's WhatsApp Business number with spam reports from cold/forgotten/already-paid orders. Same code path as manual creation — zero extra work. |
| **Permissions** | New permission `payments:review`. Default granted to: **Owner**, **Cashier**. Configurable per role. | Smallest blast radius. Tenants can extend to other roles. |

---

## State Machine (the heart of the module)

```
              ┌─────────────────────────────────────────────────────────┐
              │                                                         │
              │  pending ──[customer submits proof]──► submitted        │
              │     │                                       │           │
              │     │                                       ▼           │
              │     │                            ┌── tenant reviews ──┐ │
              │     │                            │                    │ │
              │     ▼                            ▼                    ▼ │
              │  expired                    confirmed          (one of) │
              │  (14d, no submission)            │             info_mismatch
              │                                  │             proof_unclear
              │                                  │             partial
              │                                  ▼             awaiting_settlement
              │                              [generates           │
              │                              Payment record]      │
              │                                                   │ (re-entry on portal,
              │                                                   │  notify via WhatsApp)
              │                                                   ▼
              │                                              back to submitted
              │                                                   │
              │  ┌───────────────────────────────────────────────┘
              │  ▼
              │ rejected_final
              │ (fraud, returned funds — no re-entry, escalate)
              └──────────
```

**Key insight:** "rejection" is not a single state. It's a typology that drives a specific WhatsApp message and a specific portal experience on re-entry.

| Sub-state | When | Customer experience on portal re-open |
|---|---|---|
| `info_mismatch` | Reference/bank/cédula don't match statement | Editable fields highlighted in amber. "Revisa estos datos." |
| `proof_unclear` | Image illegible / cropped / blank | Image card with red border. "Sube otra foto del comprobante." |
| `partial` | Amount paid < amount due | Banner "Recibimos $X. Faltan $Y para completar." + "Agregar otro pago." |
| `awaiting_settlement` | Tenant believes it's legit but bank hasn't credited | NO notification to customer. Internal hold 24h with auto-recheck. |
| `rejected_final` | Fraud / returned funds | "Esta solicitud fue cerrada. Contacta al negocio." Portal disabled. |

---

## Data Model

```typescript
// food-inventory-saas/src/modules/payment-requests/schemas/payment-request.schema.ts

PaymentRequest {
  _id: ObjectId
  tenantId: ObjectId                          // critical — every query MUST filter

  // Polymorphic link
  entityType: 'order' | 'appointment' | 'invoice'
  entityId: ObjectId
  entitySnapshot: {                            // frozen at creation
    items: [{ name, qty, unitPrice, total }]
    subtotal, tax, total
    customerName, customerPhone
    createdAt
  }

  // Amount expected
  amountDue: number
  currency: 'USD' | 'VES'
  exchangeRateSnapshot?: number                // if cross-currency, freeze rate

  // Pre-selected payment method (chosen by tenant OR by customer at checkout)
  selectedMethod: {
    type: 'transfer' | 'pago_movil' | 'zelle' | 'cash' | 'card'
    accountDetails: { ... }                    // copy from tenant-payment-config
    label: string                              // "Banesco - Cuenta corriente"
  }

  // Whether customer can choose a different method
  allowMethodOverride: boolean                 // true if order came from external (WA/IG)

  // Settings
  allowPartialPayments: boolean                // copied from tenant config at creation
  expiresAt: Date                              // = now + tenantPaymentConfig.paymentRequestExpiryDays (default 7)

  // Token
  token: string                                // signed JWT
  tokenIssuedAt: Date

  // Delivery
  delivery: {
    channel: 'whatsapp' | 'manual' | 'pending_manual'
    deliveredTo?: string                       // phone number used (normalized)
    deliveredAt?: Date
    deliveryAttempts: number                   // for retries on whapi failure
    lastError?: string
  }

  // State
  status: 'pending' | 'submitted' | 'confirmed' | 'info_mismatch'
          | 'proof_unclear' | 'partial' | 'awaiting_settlement'
          | 'rejected_final' | 'expired'

  // Proofs (one or many — mixed payments)
  proofs: [{
    _id
    submittedAt: Date
    amount: number
    currency: 'USD' | 'VES'
    method: 'transfer' | 'pago_movil' | 'zelle' | 'cash' | 'card'
    originBank: string                         // "Banesco", "Mercantil"...
    payerIdNumber: string                      // cédula / RIF
    payerPhone: string
    referenceNumber: string
    imageUrl: string                           // webp, optimized
    imageHash: string                          // perceptual hash for reuse detection
    ocrExtracted?: {                           // future: prefilled from image
      amount?: number, reference?: string, date?: string, confidence: number
    }
    reviewStatus: 'pending' | 'accepted' | 'rejected'
    reviewedAt?: Date
    reviewedBy?: ObjectId                      // user
    reviewNote?: string
  }]

  // History (audit trail — never delete)
  events: [{
    at: Date
    actor: 'customer' | 'tenant' | 'system'
    actorId?: ObjectId
    type: 'created' | 'submitted' | 'confirmed' | 'rejected' | 'message_sent' | ...
    payload: any
  }]

  // Linked confirmed payment(s)
  paymentIds: ObjectId[]                       // populated on confirm

  // Soft delete
  deletedAt?: Date

  createdAt, updatedAt, createdBy
}
```

**Indexes:** `{ tenantId, status, createdAt }`, `{ token: 1 }` unique, `{ entityType, entityId }`, `{ tenantId, 'proofs.imageHash': 1 }` (fraud detection), `{ expiresAt: 1 }` (TTL/cleanup job).

---

## Backend Module Structure

```
food-inventory-saas/src/modules/payment-requests/
├── payment-requests.module.ts
├── controllers/
│   ├── payment-requests.controller.ts           # tenant-authenticated CRUD + review
│   └── public/
│       └── payment-portal.controller.ts          # /public/payment-portal/:token
├── services/
│   ├── payment-requests.service.ts               # core CRUD + state transitions
│   ├── payment-proof-storage.service.ts          # interface + local impl
│   ├── image-optimizer.service.ts                # Sharp → webp
│   ├── perceptual-hash.service.ts                # for fraud detection
│   ├── ocr.service.ts                            # (phase 2 — stub on phase 1)
│   └── payment-request-notifications.service.ts  # WhatsApp + notification-center fan-out
├── listeners/
│   └── payment-request.listeners.ts              # listens to order.created etc.
├── jobs/
│   ├── expire-stale-requests.job.ts              # daily — mark `expired`
│   └── recheck-awaiting-settlement.job.ts        # 6/12/24h re-prompts
├── schemas/
│   └── payment-request.schema.ts
├── dto/
│   ├── create-payment-request.dto.ts
│   ├── submit-proof.dto.ts                       # used by public portal
│   ├── review-proof.dto.ts                       # used by tenant
│   └── public-payment-info.dto.ts                # what the portal sees
└── guards/
    └── payment-token.guard.ts                    # verifies JWT, loads request, attaches to req
```

**Endpoints:**

```
# Tenant-authenticated
POST   /payment-requests                              create (from order/appointment/invoice)
GET    /payment-requests?status=&entityType=&page=    list (with filters)
GET    /payment-requests/:id                          detail with full audit
POST   /payment-requests/:id/proofs/:proofId/accept   accept individual proof
POST   /payment-requests/:id/proofs/:proofId/reject   reject with reason
POST   /payment-requests/:id/confirm                  finalize → generates Payment
POST   /payment-requests/:id/awaiting-settlement      hold for bank sync
POST   /payment-requests/:id/resend-link              re-send WhatsApp
GET    /payment-requests/pending-count                badge counter

# Public (token-gated)
GET    /public/payment-portal/:token                  fetch portal data (snapshot, method, status)
POST   /public/payment-portal/:token/proofs           submit proof (multipart with image)
POST   /public/payment-portal/:token/method-override  change selected method (if allowed)
```

**Security checklist (preflight-tenant-safety will flag if missing):**
- Every internal query filters by `tenantId`.
- Public controller uses guard that validates JWT signature + expiry + status.
- Soft-delete with `{ deletedAt: { $ne: null } }` consistency.
- Rate limit on public POST proof: 5 submissions per token per hour.
- Image upload: validate magic bytes, not just extension. Strip EXIF on optimization.

---

## Customer Portal — UX Spec (Mobile-First, the Heart of This Module)

**Route:** `/pago/[token]` in `food-inventory-storefront/`.

**Design language:** Match tenant storefront branding (logo, primary color from `tenantPaymentConfig.branding`). Default to SmartKubik dark for unbranded tenants.

### Layer 1 — STRUCTURE (40%)

**One column, three blocks, no scroll-locked headers** (the portal is *short by design* — don't bloat it):

```
┌────────────────────────────────────┐
│  [Tenant logo]      [Pago seguro]  │  ← trust signals top-right
│                                    │
│  Hola, María 👋                    │  ← if entitySnapshot has customerName
│  Tu pedido en Café del Sur          │
│                                    │
│ ╭────────────────────────────────╮ │
│ │  PEDIDO #1247                  │ │  ← collapsed by default if items > 3
│ │  3 productos · $24.50          │ │
│ │  [Ver detalle ▾]               │ │
│ ╰────────────────────────────────╯ │
│                                    │
│  Monto a pagar                     │
│  ┌──────────────────────────────┐  │
│  │  $24.50         926.65 Bs    │  │  ← BIG. Currency primary + VES at BCV rate.
│  └──────────────────────────────┘  │
│                                    │
│  Paga con: Pago Móvil Banesco      │
│ ╭────────────────────────────────╮ │
│ │  Banco       Banesco       [📋]│ │  ← TAP-TO-COPY each row
│ │  Cédula      V-12345678    [📋]│ │     Tap = haptic + checkmark anim
│ │  Teléfono    0414-555-1234 [📋]│ │     "Copiado" floats up + fades
│ │  Monto       926.65 Bs     [📋]│ │
│ ╰────────────────────────────────╯ │
│                                    │
│  [ Cambiar método de pago ▾ ]      │  ← only if allowMethodOverride
│                                    │
│  ────────  o  ────────             │
│                                    │
│   ╔═══════════════════════════╗    │
│   ║  ✓  YA PAGUÉ              ║    │  ← STICKY at bottom on small screens
│   ╚═══════════════════════════╝    │     Becomes "Subir comprobante" once tapped
│                                    │
└────────────────────────────────────┘
```

### Layer 2 — INTERACTION (after "Ya pagué")

The page transitions (Framer Motion slide-up, 320ms) to the proof submission view. **Critical: do NOT navigate. Same URL, same context, scroll preserved.**

```
┌────────────────────────────────────┐
│  ← Volver                          │
│                                    │
│  Casi listo. Cuéntanos del pago.   │
│                                    │
│  Banco de origen                   │
│  ┌──────────────────────────────┐  │
│  │ Banesco                   ▾  │  │  ← Native select on mobile.
│  └──────────────────────────────┘  │     Top 10 VE banks, "Otro" at end.
│                                    │
│  Cédula del titular                │
│  ┌──────────────────────────────┐  │
│  │ V-12345678                   │  │  ← inputmode="numeric", autocomplete="off"
│  └──────────────────────────────┘  │
│                                    │
│  Teléfono de origen                │
│  ┌──────────────────────────────┐  │
│  │ 0414-555-1234                │  │  ← inputmode="tel"
│  └──────────────────────────────┘  │
│                                    │
│  Número de referencia              │
│  ┌──────────────────────────────┐  │
│  │ 0123456789                   │  │  ← inputmode="numeric"
│  └──────────────────────────────┘  │     Validation: min 6 digits.
│                                    │
│  Captura del pago                  │
│  ┌──────────────────────────────┐  │
│  │       📷                     │  │
│  │   Toca para subir            │  │  ← <input type="file" accept="image/*"
│  │   o tomar foto               │  │     capture="environment">
│  └──────────────────────────────┘  │     Once selected: shows thumbnail w/ X to remove
│                                    │     Compress on client (<2MB) before upload.
│                                    │
│  [ + Agregar otro pago ]           │  ← if mixed payments mode active
│                                    │
│   ╔═══════════════════════════╗    │
│   ║  Enviar comprobante       ║    │  ← Disabled until all required fields valid.
│   ╚═══════════════════════════╝    │     Loading state: progress bar (not spinner).
└────────────────────────────────────┘
```

### Layer 3 — CELEBRATION (after submit)

This is where dopamine happens. **Don't skip this.** A successful submission must feel *resolved*, not ambiguous.

```
┌────────────────────────────────────┐
│                                    │
│         ╭──────────────╮           │
│         │      ✓       │           │  ← Animated checkmark
│         │   (anim)     │           │     Stroke draws over 600ms
│         ╰──────────────╯           │     Spring scale 0.8 → 1.05 → 1.0
│                                    │
│   ¡Comprobante recibido!           │
│                                    │
│   Café del Sur está verificando    │
│   tu pago. Te avisaremos por       │
│   WhatsApp cuando esté listo.      │
│                                    │
│   ┌──────────────────────────────┐ │
│   │  Pedido #1247                │ │  ← Persistent reference card
│   │  Pagaste $24.50              │ │
│   │  Estado: En verificación 🕐  │ │
│   └──────────────────────────────┘ │
│                                    │
│   [ Volver al pedido ]             │  ← Links back to order tracking page
│                                    │
└────────────────────────────────────┘
```

### Re-entry flow (when status changes to info_mismatch / proof_unclear / partial)

Customer clicks the **same link** in a new WhatsApp message. Portal opens, detects status, shows a **diagnostic banner** at the top + jumps directly to the editable section:

```
┌────────────────────────────────────┐
│  ╭──────────────────────────────╮  │
│  │ ⚠ Café del Sur necesita      │  │  ← Amber banner, dismissable to view full page
│  │   corregir un dato:          │  │
│  │   "La cédula no coincide     │  │
│  │   con el titular del         │  │
│  │   comprobante."              │  │
│  ╰──────────────────────────────╯  │
│                                    │
│  ... [form pre-filled with last    │
│        submission, problem fields  │
│        highlighted in amber] ...   │
└────────────────────────────────────┘
```

### Mobile-first principles to enforce

- **Touch targets ≥48px.** Copy buttons, "Ya pagué" button, file picker.
- **No hover-only affordances.** Every interaction has tap/long-press equivalent.
- **No modal dialogs except for image preview.** Use page transitions or inline expansion.
- **Single-column always.** Even on tablet — this is a transactional flow, not a dashboard.
- **Network resilience.** Submit form locks UI with progress bar. Idempotent retry on 5xx (same token + submission hash). Show explicit "sin conexión" state with retry button — never silent failure.
- **Image client compression** before upload (browser-image-compression lib). Backend re-optimizes regardless.
- **Skeleton states** for the initial portal load (not spinners).

---

## Admin UI — Cross-Module "Payments to Confirm" Widget

This is the **second half of the module**. It must appear in:
- `/orders` (Order History) — sidebar badge + filter chip "Pagos por confirmar (3)"
- `/agenda` — same pattern
- `/accounts-receivable` — primary integration point, badge in header
- Top-level navbar — global badge counter (only if user has `payments:review` permission)

### The widget: `<PaymentReviewSheet />`

A **mobile-first bottom sheet** (Radix UI Dialog with `side="bottom"` on mobile, `side="right"` on desktop). Triggered by:
- Click on the navbar badge
- Click on a "Pago por confirmar" notification in NotificationCenter
- Click on an order/appointment with `paymentRequestStatus = 'submitted'`
- Real-time Socket.io event `payment-request:submitted` → toast with "Revisar" button

### Sheet content (mobile-first)

```
┌────────────────────────────────────┐
│  ✕                                 │
│                                    │
│  Comprobantes por revisar      (3) │
│                                    │
│  ╭────────────────────────────╮   │
│  │ Maria González              │   │  ← Tap to expand
│  │ Pedido #1247 · $24.50      │   │     Each card has:
│  │ Hace 2 min                  │   │     - Customer name + entity ref
│  │ [Imagen pequeña] ▸          │   │     - Time elapsed
│  ╰────────────────────────────╯   │     - Thumbnail of proof
│                                    │
│  ╭────────────────────────────╮   │
│  │ José Rivera                 │   │
│  │ Cita 15:30 · $35.00         │   │
│  │ Hace 8 min · ⚠ Devuelto x1  │   │  ← History flag
│  │ [Imagen pequeña] ▸          │   │
│  ╰────────────────────────────╯   │
│                                    │
└────────────────────────────────────┘
```

### Tap a card → expanded review

```
┌────────────────────────────────────┐
│  ← Volver a lista                  │
│                                    │
│  Maria González                    │
│  Pedido #1247 · $24.50             │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  [Comprobante full image]    │  │  ← Pinch zoom on mobile
│  │  Tap para ampliar            │  │     Detected duplicate? red ribbon.
│  └──────────────────────────────┘  │
│                                    │
│  Datos enviados                    │
│  ┌──────────────────────────────┐  │
│  │  Banco:    Banesco           │  │
│  │  Cédula:   V-12345678        │  │
│  │  Teléfono: 0414-555-1234     │  │  ← Each row has small "Copiar"
│  │  Ref:      0123456789  📋    │  │     Reference has 📋 since most-needed
│  │  Monto:    926.65 Bs         │  │
│  └──────────────────────────────┘  │
│                                    │
│  Coincide con el banco?            │
│                                    │
│   ╔═══════════════════════════╗    │
│   ║  ✓  Confirmar pago        ║    │  ← Primary action.
│   ╚═══════════════════════════╝    │     Confetti micro-animation on success.
│                                    │
│   [ ⏱  Aún no acreditado ]         │  ← Secondary: awaiting_settlement
│   [ ✏  Pedir corrección ]          │  ← Secondary: open reject reason picker
│                                    │
└────────────────────────────────────┘
```

### Reject reason picker (modal)

```
┌────────────────────────────────────┐
│  ¿Qué pasó con este pago?          │
│                                    │
│  ○ Datos no coinciden              │
│    "La cédula/banco/teléfono no    │
│    coincide con el comprobante."   │
│                                    │
│  ○ Comprobante ilegible            │
│    "No se ve bien la imagen.       │
│    Pedir nueva foto."              │
│                                    │
│  ○ Monto incompleto                │
│    "Pagó menos de lo debido."      │
│    [Input: monto recibido]         │
│                                    │
│  ○ Sospecha de fraude              │
│    "Cerrar definitivamente."       │  ← Triggers rejected_final
│                                    │
│  Nota interna (opcional)           │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
│  [ Cancelar ]   [ Enviar mensaje ] │
└────────────────────────────────────┘
```

**Critical UX detail:** the reject button doesn't say "Reject." It says **"Pedir corrección"** because *that's what's actually happening* — we're asking the customer to fix something, not refusing them. Language matters.

### Real-time updates

Use existing Socket.io infra. Events:
- `payment-request:submitted` → toast on admin
- `payment-request:confirmed` → toast + badge decrement
- `payment-request:status-changed` → refresh sheet if open

### Notification integration

When a `PaymentRequest` is submitted, fire into `notification-center` with:
- Category: `payment`
- Priority: `high`
- Actions: `[{ label: 'Revisar', url: '/payment-requests/:id' }]`

Reuse existing notification components. Don't reinvent.

---

## Phases of Implementation (3 PRs)

### PR 1 — Backend foundation (no UI)
- Create `payment-requests` module with schema, DTOs, services.
- Implement `PaymentProofStorageService` interface + **Cloudflare R2 adapter** (`@aws-sdk/client-s3` with R2 endpoint). Configure bucket, lifecycle rules, signed-URL TTL. Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`.
- Sharp pipeline: resize → webp → strip EXIF → perceptual hash → upload to R2.
- Public portal API: `GET/POST /public/payment-portal/:token`.
- Tenant API: CRUD + review endpoints + manual-create endpoint (`POST /payment-requests` with full body for internal orders).
- Listener: auto-create PaymentRequest on `order.created` ONLY when `order.source === 'storefront'` AND `paymentMethod !== 'cash'` AND tenant has `requirePaymentProof: true`.
- WhatsApp delivery via `whapi`. On delivery failure: PR stays `pending` with `delivery.channel: 'pending_manual'` and `lastError` set. No retry loop in PR1 (can be added later).
- Phone normalization util (VE format: `+58XXXXXXXXXX` canonical, accept `0414-...`, `+58414...`, `04241234567`).
- Tests: unit (state machine, phone normalization, hash collision), e2e (full portal flow with image upload to R2 test bucket).
- Migration: add to `TenantPaymentConfig` schema:
  - `requirePaymentProof: boolean` (default false — tenants opt-in)
  - `allowPartialPayments: boolean` (default false)
  - `paymentRequestExpiryDays: number` (default 7, validated 1-30)
- Migration: add `payments:review` permission to permission catalog. Auto-grant to roles `owner` and `cashier` in tenant seed/upgrade.

### PR 2 — Customer portal (Next.js)
- New route group `/pago/[token]` in `food-inventory-storefront`.
- Pages: portal home, proof submission, success, re-entry diagnostic.
- Mobile-first per spec above.
- Client image compression + upload progress.
- Branded shell using `tenantPaymentConfig.branding`.

### PR 3 — Admin widget (React admin)
- `<PaymentReviewSheet />` global component.
- Navbar badge with pending count (poll + Socket.io invalidation).
- Mount points in Orders, Agenda, AR.
- **"Solicitar comprobante" button** on order/appointment/invoice detail for entities where `source !== 'storefront'` AND no active PaymentRequest exists. Opens `<RequestPaymentModal />` with 3 delivery options (WhatsApp / Copy link / QR), phone pre-filled and validated.
- **"Sin solicitud de pago" filter chip** on AR page to surface backfill candidates.
- **"Sin enviar — copia el link"** badge on PaymentRequests with `delivery.channel === 'pending_manual'` (action: open same delivery modal to retry).
- Notification-center integration (event listener + action button).
- Confetti / success micro-animation on confirm.
- Toast on real-time `payment-request:submitted`.
- Permission gating: hide widget + buttons if user lacks `payments:review`.

### Phase 2 (post-MVP, separate PRs)
- OCR pre-fill (Tesseract local or Google Vision — A/B accuracy).
- Perceptual hash duplicate detection (already in schema).
- Cloudflare R2 storage adapter.
- Bank reconciliation hooks (per-bank when APIs exist).
- Auto-recheck job for `awaiting_settlement`.

---

## Acceptance Criteria

### Backend
- [ ] All queries filter by `tenantId` (preflight-tenant-safety passes).
- [ ] PaymentRequest state transitions are guarded — invalid transitions throw 409.
- [ ] Image upload: rejects non-image magic bytes, EXIF stripped, max 10MB raw → optimized to <200KB webp.
- [ ] Token verification: signature valid, not expired, status allows access.
- [ ] Confirming a PaymentRequest creates corresponding Payment records and updates entity (`Order.paymentStatus`, etc.).
- [ ] 73-test security suite passes with new module included.

### Customer portal
- [ ] Lighthouse mobile score ≥90 (Performance, Accessibility, Best Practices).
- [ ] Works on 3G connection (LCP < 3s).
- [ ] All inputs use correct `inputmode`. Native keyboards on iOS/Android.
- [ ] Tap-to-copy works on iOS Safari, Chrome Android, Samsung Internet.
- [ ] File upload handles camera capture on mobile.
- [ ] Re-entry pre-fills last submission with problem fields highlighted.

### Admin widget
- [ ] Badge updates in real-time without page refresh.
- [ ] Reviewer can confirm/reject in <10 seconds per request.
- [ ] Mobile sheet works on iPhone SE (smallest target).
- [ ] Reject flow always asks for a typed reason — never generic "rejected."
- [ ] Notification appears in NotificationCenter with action button.

### Cross-cutting
- [ ] Wiki: `docs/wiki/modules/payment-requests/` (overview, data-model, api-reference, functions).
- [ ] System map updated.
- [ ] If a pattern fits (e.g., polymorphic entity, ObjectId vs String) check `docs/wiki/patterns/`.

---

## Visual Language & Tokens

Reuse SmartKubik admin tokens. New ones to add:

```css
/* Status colors for PaymentRequest */
--pr-status-pending: #f59e0b;          /* amber */
--pr-status-submitted: #3b82f6;        /* blue */
--pr-status-confirmed: #10b981;        /* emerald */
--pr-status-info-mismatch: #f97316;    /* orange */
--pr-status-proof-unclear: #f97316;
--pr-status-partial: #eab308;          /* yellow */
--pr-status-awaiting: #8b5cf6;         /* violet */
--pr-status-rejected: #ef4444;         /* red */
--pr-status-expired: #6b7280;          /* gray */

/* Copy-confirmation toast */
--copy-toast-bg: rgba(16, 185, 129, 0.15);
--copy-toast-fg: #10b981;
```

Animations: spring physics (Framer Motion `type: 'spring', stiffness: 400, damping: 30`). Stroke-draw checkmark for success (SVG path with `stroke-dasharray` animation, 600ms). Confetti on admin confirm only (`react-confetti`, fires once, 1.5s, GPU-accelerated).

---

## What NOT to do

- ❌ Don't reuse the existing `Payment` schema for the request. PaymentRequest is upstream.
- ❌ Don't ship reject without typology. Generic "rechazado" creates support tickets.
- ❌ Don't store original images. Webp only. Originals leak EXIF and bloat backups.
- ❌ Don't open the portal in a modal. It's a route. Modals lose scroll position on iOS keyboard.
- ❌ Don't gate everything behind feature flags. Ship default-on for non-cash methods.
- ❌ Don't build OCR in PR1. Ship the manual flow, observe data, then add automation.
- ❌ Don't put the admin widget in a separate page. It must appear *where the work already happens*.

---

## Decisions Resolved (2026-05-13)

All previously open questions are resolved and integrated into the Architectural Decisions table above. Summary:

1. **Creation trigger** → hybrid by `order.source`. Storefront = auto; internal/whatsapp/ig/pos = manual button.
2. **Phone delivery** → modal with 3 options (WhatsApp / Copy / QR); auto-create with `pending_manual` flag if phone missing.
3. **Expiry** → tenant-configurable, default 7 days, range 1-30.
4. **Permissions** → `payments:review` granted by default to Owner + Cashier.
5. **Backfill** → on-demand only via the same manual button; AR filter chip surfaces candidates. No bulk send.

If new questions arise during PR1, open a planning issue rather than guessing.
