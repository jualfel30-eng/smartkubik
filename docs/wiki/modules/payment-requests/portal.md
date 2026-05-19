# Payment Requests — Portal de Cliente (Storefront)

> Implementación frontend del portal de pago en `food-inventory-storefront`.
> Acompaña a [`overview.md`](./overview.md) (backend) y vive bajo la ruta pública `/pago/[token]`.
> Última actualización: 2026-05-14

---

## Ubicación en el repo

```
food-inventory-storefront/src/
├── middleware.ts                      ← exempta /pago/* del rewrite [domain]
├── lib/
│   └── payment-portal.ts              ← cliente API (fetch + XHR multipart)
└── app/pago/[token]/
    ├── layout.tsx                     ← shell oscuro, robots: noindex
    ├── page.tsx                       ← server component, fetch del token
    └── _components/
        ├── PaymentPortalView.tsx      ← orquestador top-level (Layer 1/2/3)
        ├── PortalHeader.tsx           ← logo del tenant + badge "Pago seguro"
        ├── OrderSnapshotCard.tsx      ← items del pedido, colapsado si > 3
        ├── AmountBlock.tsx            ← monto grande + conversión USD↔VES
        ├── PaymentMethodCard.tsx      ← cuenta bancaria con tap-to-copy
        ├── CopyableRow.tsx            ← fila de copia con haptic + toast
        ├── YaPagueCTA.tsx             ← CTA sticky abajo (Layer 1)
        ├── BankSelect.tsx             ← top 10 bancos VE + "Otro"
        ├── ImageUploadField.tsx       ← captura/upload + compresión cliente
        ├── ProofSubmissionForm.tsx    ← formulario completo (Layer 2)
        ├── AnimatedCheckmark.tsx      ← SVG con stroke-draw 600ms
        ├── SubmittedSuccess.tsx       ← Layer 3 con celebración
        └── RejectedBanner.tsx         ← banner ámbar para re-entry
```

## Ruta y middleware

- **URL pública**: `<STOREFRONT_PUBLIC_URL>/pago/<token>` — el backend la construye desde `payment-requests.service.ts → buildPortalUrl()`.
- El `middleware.ts` del storefront reescribe casi todo a `/[domain]/...`. La ruta `/pago/` está **explícitamente exenta** porque el portal se identifica por JWT firmado, no por subdomain del tenant.
- `layout.tsx` marca `robots: { index: false, follow: false }` — el portal es per-customer, no debe indexarse.

## Arquitectura de tres "Layers"

```
┌────────────────────┐    "Ya pagué"      ┌────────────────────┐    submit         ┌────────────────────┐
│   Layer 1          │  ────────────────► │   Layer 2          │  ───────────────► │   Layer 3          │
│   STRUCTURE        │                    │   INTERACTION      │                   │   CELEBRATION      │
│                    │  ◄──── "Volver" ── │                    │                   │                    │
│  - branded shell   │                    │  - 5 input fields  │                   │  - checkmark anim  │
│  - snapshot card   │                    │  - image upload    │                   │  - reference card  │
│  - amount block    │                    │  - compression     │                   │  - close button    │
│  - method+copy     │                    │  - progress bar    │                   │  - "verificando…"  │
│  - sticky CTA      │                    │  - retry on 5xx    │                   │                    │
└────────────────────┘                    └────────────────────┘                   └────────────────────┘
```

Los layers se manejan con **Framer Motion `AnimatePresence mode="wait"`**:
- Layer 2 sube desde `y: '100%'` con spring (stiffness 320, damping 32) — ~320 ms
- Nunca navega entre páginas — misma URL, mismo scroll, refresh preserva el token

### Re-entry (diagnostic) flow

Cuando el cliente vuelve al portal después de un rechazo del tenant:

1. `getPaymentPortalInfo()` devuelve `info.diagnostic !== null` y `info.status ∈ { info_mismatch, proof_unclear, partial }`
2. `PaymentPortalView` arranca con `startsOnLayer2 = true` → **abre Layer 2 directo**, sin pasar por Layer 1
3. `RejectedBanner` se renderiza arriba del formulario con la razón y la nota del tenant verbatim
4. El banner es dismissable → colapsa a un chip "Ver por qué…" que se puede re-expandir

## Cliente API (`lib/payment-portal.ts`)

### `getPaymentPortalInfo(token): Promise<PaymentPortalInfo>`
- `GET /api/v1/public/payment-portal/:token` con `cache: 'no-store'` (el estado puede cambiar entre visitas)
- Lanza `PaymentPortalError` con `status` y `transient: boolean` para distinguir 4xx (mostrar inline) de 5xx (eligible para retry)

### `submitPaymentProof(token, fields, imageFile, onProgress?, signal?): Promise<SubmitProofResult>`
- `POST /api/v1/public/payment-portal/:token/proofs` multipart
- **Usa `XMLHttpRequest`** (no `fetch`) — la Fetch API en 2026 todavía no expone `upload.onprogress`. La progress bar viva depende de esto.
- `onProgress(fraction)` se llama de 0 a 1 mientras sube
- `signal: AbortSignal` permite cancelar (lo usa el botón "Volver")
- El browser pone el `Content-Type: multipart/form-data; boundary=…` automáticamente — **NO override**

## Decisiones de diseño relevantes

### Tap-to-copy con fallback
`CopyableRow` intenta `navigator.clipboard.writeText()` primero, cae a un `<textarea>` oculto + `document.execCommand('copy')` para WebViews legacy de Samsung Internet / Safari WKWebView que gatean Clipboard API detrás de permisos. Haptic via `navigator.vibrate(10)` (no-op silencioso en iOS).

### Currency-aware proof amount
El monto enviado al backend en el `proof` no siempre coincide con `info.amountDue`:
- Pago Móvil → siempre VES (computado de `exchangeRateSnapshot` si el PR está cotizado en USD)
- Transferencia / Zelle → moneda del PR
Esto matchea lo que el banco efectivamente acreditó y evita rechazos por "monto no coincide".

### Compresión de imagen cliente
`browser-image-compression` con `maxSizeMB: 2`, `maxWidthOrHeight: 2000`, `useWebWorker: true`. **Defensa en profundidad**: el backend re-optimiza con Sharp → webp@80% ≤200KB sin importar lo que llegue. La compresión cliente es UX (sube rápido en 3G), no seguridad.

### Branding inline via CSS variables
El primaryColor del tenant se aplica como `--pp-primary` en un `style` inline del wrapper. Todos los componentes referencian `var(--pp-primary, #10b981)`. Default emerald si el tenant no tiene branding configurado. **El contraste del foreground se asume slate oscuro** (`--pp-primary-fg: #0a0e1a`) — tenants que elijan colores claros (amarillo, cyan) tendrán bajo contraste en la CTA. Un helper `getReadableForeground(hex)` queda como follow-up.

### Detección de cierre de pestaña
Layer 3 muestra un botón "Cerrar" sólo si detectamos que `window.close()` puede funcionar:
- `window.opener` existe → fue abierto por otro JS, cerrable
- `window.history.length <= 1` → probablemente nueva pestaña, cerrable
- Sin estas señales, ocultamos el botón en vez de mostrar uno que no hace nada (el WhatsApp in-app browser sí permite `window.close()`).

## Variables de entorno (storefront)

| Variable | Default | Uso |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Base del backend NestJS — debe coincidir con `STOREFRONT_PUBLIC_URL` del backend para que los enlaces enviados por WhatsApp lleguen al mismo origen que la app |

## Manejo de errores (códigos del backend)

| HTTP | UX |
|---|---|
| `200` / `201` | Flujo normal |
| `401` (token inválido/expirado) | `notFound()` en page.tsx → 404 nativo de Next.js (no leakear si el PR existe) |
| `403` (PR en terminal) | `notFound()` también — el guard rechaza `confirmed`/`rejected_final`/`expired` antes |
| `404` | Igual — `notFound()` |
| `409` (transición ilegal) | Mensaje inline en el form, sin retry button |
| `429` (rate limit, 5/hora) | Mensaje específico "Estás enviando comprobantes muy seguido. Espera unos minutos." |
| `5xx` / network | Banner ámbar con `transient: true` + botón "Reintentar" que mantiene el mismo FormData |

## Performance budget

| Métrica | Objetivo | Real (build prod) |
|---|---|---|
| Route bundle | < 50 KB | 30.2 KB |
| First Load JS | < 200 KB | 177 KB |
| LCP (3G) | < 3 s | depende de la imagen del logo del tenant — el shell server-renderiza |
| Lighthouse mobile | ≥ 90 | (pendiente de medición con backend real) |

El bundle grande extra (vs Batch A: 130 B) es **`browser-image-compression` con su Web Worker** — solo se carga cuando el cliente tapea "Ya pagué" porque está dentro del subtree de Layer 2.

## Tests

Tests unitarios de los componentes del portal no están incluidos en PR2. Justificación:

- Los componentes son thin wrappers sobre `framer-motion` + DOM standard (clipboard, file input). Testar `motion.div` no aporta señal — testaríamos a Framer Motion.
- El state machine vive en `PaymentPortalView` y se valida con QA manual del flujo completo
- El cliente API (`payment-portal.ts`) se testaría con MSW + jsdom, lo cual choca con el OOM pre-existente del runner Jest del backend. Mejor agregar Vitest en un follow-up dedicado al storefront.

QA manual cubre:
1. **Happy path**: Layer 1 → tap Ya pagué → Layer 2 form → submit → Layer 3 checkmark anima
2. **Re-entry**: token de PR en `info_mismatch` → abre directo en Layer 2 con banner ámbar
3. **Sin conexión**: pull cable durante submit → banner transient + Reintentar → reconecta → éxito
4. **iOS keyboard**: focus en input no rompe sticky CTA en Layer 1 (no aplica en Layer 2 que es scroll completo)
5. **WhatsApp WebView**: abrir el link desde WhatsApp → tap-to-copy funciona, Layer 3 muestra botón Cerrar

## Known follow-ups

- **Field prefill en re-entry**. `PublicPaymentInfoDto` no expone los datos del proof rechazado (defensa en profundidad: un token comprometido no debe leakear intentos previos). Para auto-rellenar bank/cédula/teléfono en el form se necesitaría:
  1. Backend: agregar `lastProofHints?: { originBank, payerIdNumber, payerPhone, referenceNumber }` a `buildPublicInfo()` cuando hay un proof rechazado reciente
  2. Frontend: poblar el estado inicial del `ProofSubmissionForm` con esos hints, resaltar en ámbar el campo correspondiente al `reason`
- **"Volver al pedido" link en Layer 3**. El portal no conoce el `[domain]` ni el `orderNumber` (defensa en profundidad). Para wirar el link se necesitaría agregar `returnUrl?: string` al DTO público.
- **Contraste auto del foreground**. Helper `getReadableForeground(hex)` que calcule slate oscuro vs slate claro según luminancia del primary del tenant.
- **Lighthouse run con backend real**. Verificar LCP < 3 s y score ≥ 90 una vez deployado.
- **Mixed payments en el form**. PR2 soporta un proof por sesión. Si el tenant activa `allowPartialPayments`, agregar botón "+ Agregar otro pago" en Layer 3 que regrese a Layer 2 limpio.
