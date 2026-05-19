# Payment Requests — Admin UI

> Implementación frontend en `food-inventory-admin`. Acompaña a
> [`overview.md`](./overview.md) (backend) y [`portal.md`](./portal.md) (storefront).
> Última actualización: 2026-05-14

---

## Ubicación en el repo

```
food-inventory-admin/src/
├── lib/
│   └── paymentRequestsApi.js              ← cliente fetch wrapper (8 endpoints)
├── hooks/
│   └── use-payment-requests.js            ← usePendingCount / useList / useActions
└── components/payment-requests/
    ├── PaymentRequestsPage.jsx            ← /payment-requests (deep-link target)
    ├── PaymentRequestsBadge.jsx           ← navbar action (real-time + polling)
    ├── PaymentReviewChip.jsx              ← chip "Por confirmar" en Orders
    ├── PaymentReviewSheet.jsx             ← bottom-drawer/right-dialog principal
    ├── PaymentReviewList.jsx              ← lista con empty/skeleton/error
    ├── PaymentReviewCard.jsx              ← tarjeta de cada PR
    ├── PaymentReviewDetail.jsx            ← vista detalle con imagen + acciones
    ├── RejectReasonPicker.jsx             ← modal con tipología de rechazo
    ├── RequestPaymentModal.jsx            ← modal 3 tabs WA/Copy/QR
    ├── SolicitarComprobanteButton.jsx     ← CTA self-gated para órdenes manuales
    ├── PaymentRequestSettingsCard.jsx     ← toggles requirePaymentProof/etc
    └── _utils.js                          ← helpers de formato y selección
```

## Permiso requerido

Todo está gated por `payment_requests_review`. Los componentes hacen
`hasPermission(...)` y devuelven `null` cuando el usuario no lo tiene —
no se muestra ningún placeholder, ningún botón orphan, ninguna fuga de
info sobre la existencia de la feature.

Granted por defecto a los roles `admin` y `employee` por la migración
`seed-payment-requests-review-permission` de PR1. Los tenants pueden
otorgarlo a roles custom desde la página de Configuración → Roles que
ya consume `/permissions` (sin cambios — el permiso aparece automáticamente).

## Donde aparece la feature (los 7 surfaces)

| Surface | Componente | Visible cuando | Descubrible? |
|---|---|---|---|
| **Sidebar → Finanzas y Equipo → Solicitudes de pago** | nav entry en `navLinks.js` con badge auto via `useSidebarBadges` | Permiso `payment_requests_review` | **Sí — entry point principal** |
| **Settings → Métodos de Pago** | `PaymentRequestSettingsCard` | Permiso + tab abierto | Sí (donde el tenant activa la feature) |
| **Navbar** | `PaymentRequestsBadge` | Permiso (count badge si > 0) | Cross-page indicator |
| **Página /payment-requests** | `PaymentRequestsPage` | Permiso (deep-link target) | Vía sidebar / notif |
| **Orders → filter chip** | `PaymentReviewChip hideWhenEmpty` | Permiso + count > 0 | Contextual |
| **Order detail dialog → footer** | `SolicitarComprobanteButton` | Permiso + `source !== 'storefront'` + `paymentStatus !== 'paid'` | Contextual |
| **Accounts Receivable → cada row** | `SolicitarComprobanteButton` | Idem | Contextual |

El **sidebar entry es el surface principal**. Un tenant que abre el
admin por primera vez ve "Solicitudes de pago" listado bajo "Finanzas y
Equipo", con badge si hay pendientes — entry point discoverable sin
depender de iconos sin label o chips que se ocultan.

Para que aparezca:
1. Tenant re-loguea para que el JWT incluya `payment_requests_review`
   (granted por defecto a `admin` y `employee` tras la migración de PR1)
2. Nav entry en `src/config/navLinks.js` con permiso gate
3. Pertenece al grupo `finance-hr` de `src/config/sidebarNavGroups.js`
4. `useSidebarBadges` polea `/payment-requests/pending-count` cada 60 s
   y muestra el counter cuando count > 0

El `<PaymentReviewSheet>` es el componente que aparece en todos los
contextos donde se revisan comprobantes. Mounts independientes por
surface (cada uno tiene su propio `open` state) — usar el mismo componente
con un Context global agregaría complejidad sin beneficio.

## Real-time + polling strategy

`PaymentRequestsBadge` mantiene el count con **dos fuentes** complementarias:

1. **Polling** vía `usePendingPaymentRequestsCount({ intervalMs: 60_000 })`.
   - Visibility-aware: pausa cuando la pestaña está oculta
   - Refresh agresivo en `focus` / `visibilitychange` (cubre devices que
     no recibieron sockets mientras estaban en background)
2. **Invalidación reactiva** suscrita a `NotificationContext.centerNotifications[0]`:
   - Cuando llega una notificación con type `payment-request.{submitted,confirmed,status-changed}`, dispara `refresh()` inmediato
   - `lastSeenIdRef` evita re-fire en renders no relacionados del context

El toast con "💰 Nuevo comprobante por revisar" viene **gratis** desde
`NotificationContext.handleNewNotification` — auto-toastea cualquier
notificación priority `high`/`critical`. PR1 emite priority high en
`notifyProofSubmitted`, así que no se necesita código extra de toast.

## State machine del sheet

```
[open=false]
  │  ╮
  │  ├─ Tap badge / chip / "Revisar ahora" en page
  │  ├─ Open from URL ?id=<prId>
  │  ▼
[List view] ◄──────────────────┐
  │                            │
  │  Tap card                  │
  ▼                            │
[Detail view]                  │
  │                            │
  │  - Confirmar → confetti + back to List (refreshed)
  │  - Pedir corrección → RejectReasonPicker → notify customer → back to List
  │  - Aún no acreditado → silent → back to List
  └─ "Volver a la lista" ──────┘
```

Cerrar el sheet limpia `selectedId` y resetea `celebrate` — abrir de nuevo
aterriza siempre en la lista, no en un detalle stale.

## "Sin enviar" surfacing (delivery fallbacks)

Cuando `pr.delivery.channel === 'pending_manual'` (Whapi falló o no había
phone), las superficies del review sheet muestran:

- **Card**: pill rosa "Sin enviar" + tooltip con `delivery.lastError`
- **Detail**: callout completo con el portalUrl en code-block + botón
  "Copiar enlace" → `navigator.clipboard.writeText(portalUrl)` + toast

El `portalUrl` viene del backend en la response de `GET /payment-requests`
y `GET /payment-requests/:id` (helper `attachPortalUrl` en el service).

## RequestPaymentModal — 3 delivery options

El modal de "Solicitar comprobante" tiene tres tabs, **una llamada al
backend por sesión** (la primera acción del tab seleccionado crea el PR;
las siguientes interacciones operan sobre el resultado).

| Tab | Backend call | UI resultado |
|---|---|---|
| **WhatsApp** | `POST /payment-requests` con `deliveryChannel: 'whatsapp'` + `deliveryPhone` | Banner "Mensaje enviado al cliente" + URL copiable |
| **Copiar** | `POST /payment-requests` con `deliveryChannel: 'manual'` + auto-copy | Banner + URL ya en clipboard |
| **QR** | Idem manual + render QR via `qrcode` (errorCorrectionLevel M, scale 6) | Banner + QR PNG + URL copiable |

Phone validation usa heurística laxa (10-13 dígitos, formatos VE típicos)
— el backend re-normaliza con `normalizeWhatsAppPhone()` y rechaza inválidos
con `delivery: 'pending_manual'`.

## Confetti / celebration

`Celebration` (componente existente del admin, framer-motion based, 24
partículas durante 1.5 s) se dispara desde `PaymentReviewSheet` cuando
`status === 'confirmed'` después de un confirm exitoso. Después de 900 ms
el detail view se cierra y vuelve a la lista — el orden es deliberado para
que el cashier vea las partículas antes del cambio de view.

## Cómo el tenant prueba la feature end-to-end

Requisitos:
1. Backend deployed con migrations corridas
   (`POST /migrations/seed-payment-requests-review-permission` +
   `POST /migrations/extend-tenant-payment-config-for-payment-requests`)
2. Storefront deployed bajo `STOREFRONT_PUBLIC_URL`
3. Tenant tiene al menos un método de pago no-cash configurado en
   Settings → Métodos de Pago (con sus datos bancarios)
4. Tenant re-logueado para que el JWT incluya `payment_requests_review`

Walkthrough:
1. **Settings → Métodos de Pago** — activa el toggle "Pedir comprobante
   automáticamente" en la card "Solicitudes de pago" → Save
2. Hacer un pedido desde el storefront (o `Solicitar comprobante` desde
   una orden manual en `/orders`)
3. El cliente recibe WhatsApp con el enlace al portal
4. El cliente sube comprobante
5. **El admin recibe**: toast en pantalla (priority high), badge del navbar
   incrementa, notificación en el centro de notificaciones
6. Click en el badge → bottom-sheet/dialog se abre con el comprobante
7. Confirmar pago → confetti → la orden queda paid + se crea un Payment
   en el ledger

## Known follow-ups (no en PR3)

- **Dedupe de PaymentRequests por entity** — el backend permite crear
  múltiples PRs para la misma orden. El `SolicitarComprobanteButton`
  no checkea si ya existe un PR activo. Hay riesgo bajo de duplicados
  cuando dos cajeros actúan sobre la misma orden simultáneamente.
- **"Sin solicitud de pago" filter chip en AR** — el spec lo pedía. Lo
  reemplazamos con el botón inline por row (más útil y no requiere
  filtering server-side). Si se quiere el chip, agregar
  `hasActivePaymentRequest: boolean` al row de AR.
- **Mount en Agenda / Appointments** — el sheet ya funciona para `entityType: 'appointment'`
  en términos de UI, pero el backend `confirm()` lanza `NotImplementedException`
  hasta que se wire la generación de Payment para appointments.
- **Vitest setup para tests de componentes del admin** — mismo blocker
  que el storefront. Tests deferidos a un PR de tooling.

## Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` (dev) / `https://api.smartkubik.com` (prod) | Base del backend. El admin construye `${base}/api/v1/...` |

No requiere `VITE_STOREFRONT_URL` — el `portalUrl` viene del backend en
todas las responses (ver `attachPortalUrl` en el service de PR1).

## Bundle impact

Antes de PR3 (Batch A baseline):
- `main` chunk: 700.x kB

Después de PR3 (Batch F end):
- `main` chunk: ~711.6 kB (sin cambio significativo — componentes
  están bajo `payment-requests/` y entran via dynamic import de la
  ruta `/payment-requests`)
- New: `PaymentRequestsPage` chunk (~30 kB) cargado on-demand
- `qrcode` ya estaba en deps (usado por pdfGenerator)

El badge del navbar es small (~3 kB) — siempre activo pero su weight
es menor que `NotificationCenter` al lado.
