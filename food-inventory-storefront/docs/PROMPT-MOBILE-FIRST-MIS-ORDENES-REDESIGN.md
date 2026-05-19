# Prompt: Mobile-First Redesign — Mis Órdenes (Storefront / Cliente final)

> **Generated as starting point — refine manually before implementation.**

---

## Your Role

Apply the `/ux-design` skill — recalibrated. You are a senior product design engineer with **25 years of experience** building consumer e-commerce experiences at Apple, Spotify, Stripe, Square, Notion, **Domino's Pizza Tracker**, **Uber Eats**, **Shopify Order Status Pages**, and **Mercado Libre**. The **last 10 years** you specialized in **post-purchase emotional design** — the period between "Te llegará pronto" and "Llegó" where most e-commerce loses or wins customer loyalty.

Your filter for every design decision:

> "Si este comprador entra ansioso porque su pedido lleva 3 días sin actualizarse, ¿cómo le bajo la ansiedad en lugar de subírsela? ¿Cómo le doy seguridad sin que tenga que escribir por WhatsApp al comercio?"

You design with **mobile-first constraints applied to BOTH platforms** — el comprador típico está en su celular cuando pregunta "¿llegó?". Desktop es secundario.

Stack: Next.js 15 (App Router) + Tailwind CSS v4 + multi-tenant via subdomain. Server Components disponibles. Sin Framer Motion instalado por defecto (proponer si es necesario). Tema light/dark según `localStorage` o `prefers-color-scheme`.

---

## Context crítico (no asumir reglas del admin)

Esta pantalla es el **post-compra de un comprador final** que entró a `<tenant>.smartkubik.com/[domain]/mis-ordenes` después de comprar en una tienda que casualmente usa SmartKubik. **El comprador NO sabe ni le importa que existe SmartKubik.** Para él, esto es "la página donde compré".

**Tres verdades del comprador final**:
1. Entra **estresado** o **ansioso** por algo que pidió y aún no llega.
2. **Cero tolerancia** a jerga operativa ("Confirmada / Procesando / Enviada" lo confunden).
3. Su decisión de **volver a comprar** se construye en estos minutos de espera, no durante el checkout.

**Cuando esta pantalla falla, el daño se transfiere así**: comprador frustrado → WhatsApp del comercio → soporte saturado → comercio molesto con SmartKubik → churn del tenant. **Esta pantalla es defensa de marca de nuestros clientes.**

---

## Audience

- **Primary**: comprador final (B2C) en mobile, edad 25-50, LATAM. Hizo 1 compra y regresa a verificar estado. **80% de las visitas a esta pantalla.**
- **Secondary**: comprador frecuente (3+ órdenes históricas) que regresa para recomprar. **15% de visitas.**
- **Tertiary**: comprador desktop que verifica desde computadora del trabajo. **5% de visitas.**

Lo que NO es audiencia: el operador del comercio (esos usan el admin separado).

---

## Jobs to be done (priorizados)

| # | Job emocional | Frecuencia | Plataforma típica |
|---|---|---|---|
| **J1** | "¿Cuándo llega mi pedido?" — bajar ansiedad de espera | 70% | Mobile |
| **J2** | "Quiero pedir lo mismo otra vez" — repeat purchase | 15% | Mobile + Desktop |
| **J3** | "Algo está mal con mi pedido — ¿a quién le escribo?" — escalation help | 10% | Mobile |
| **J4** | "¿Cuánto gasté en esta tienda?" — accounting personal | 5% | Desktop |

> **Diseño explícito por J1 (70%)**. Esta pantalla es PRIMERO un tracker, después un historial.

---

## Audit findings consumed

Este blueprint consume directamente: [docs/audits/mis-ordenes-cliente-2026-05-09.md](audits/mis-ordenes-cliente-2026-05-09.md).

Resumen de los 4 críticos del audit (resueltos en este blueprint):
1. **C1** — 7 estados técnicos sin agrupación → **Resuelto** con 3 estados emocionales (Preparando / En camino / Llegó).
2. **C2** — Sin tracking visual → **Resuelto** con timeline horizontal + ETA + ícono de etapa.
3. **C3** — Empty state genérico → **Resuelto** con copy contextual + CTA primario claro.
4. **C4** — Acción única "Ver detalles" → **Resuelto** con 3 acciones contextuales por estado (Ver tracking / Recomprar / Contactar).

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40% del impacto)

#### 1.1 Welcome-back header con triage emocional

```
┌──────────────────────────────────────────────────────────┐
│ Hola, María 👋                                            │
│ Tienes 1 pedido en camino — llega aprox hoy 6:00 PM      │
│                                                           │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ 🚚 Pedido #ORD-1234 va en camino                    │  │
│ │ Salió hace 2h · Quedan ~30 min                      │  │
│ │ [Ver tracking en vivo →]                            │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- **Greeting personalizado** (`customer.firstName`).
- **Triage emocional**:
  - Si hay pedidos "En camino" → highlight con ETA grande.
  - Si hay pedidos "Preparando" → microcopy tranquilizador "Tu pedido está siendo preparado, te avisaremos cuando salga".
  - Si todo entregado → copy positivo "Todo entregado ✓ ¿Quieres pedir algo más? [Explorar tienda →]".
  - Si vacío → CTA "Explorar tienda" prominente.
- **Card flotante del pedido más urgente** (el "En camino" más cercano) — anchor visual de tranquilidad.

---

#### 1.2 Lista emocional con 3 estados agrupados

**Mapping de 7 estados técnicos → 3 estados emocionales del comprador**:

| Estado backend | Estado UI comprador | Color | Ícono | Copy ETA |
|---|---|---|---|---|
| `pending` | **Confirmando** | Azul claro | ⏳ | "Estamos confirmando tu pago" |
| `confirmed` | **Preparando** | Naranja suave | 📦 | "Estamos alistando tu pedido" |
| `processing` | **Preparando** | Naranja suave | 📦 | "Tu pedido está casi listo" |
| `shipped` | **En camino** | Azul vivo | 🚚 | "Llega aprox [ETA]" |
| `delivered` | **Llegó** | Verde | ✓ | "Entregado el [fecha]" |
| `completed` | **Llegó** | Verde | ✓ | "Entregado · ¿Cómo te fue? [Calificar]" |
| `cancelled` | **Cancelado** | Gris | ✕ | "Cancelado el [fecha]" |

> **3 estados emocionales** (Preparando / En camino / Llegó) con sub-estado contextual. El comprador NO necesita ver "Confirmada vs Procesando" — ambos son "Preparando" para él.

**Card emocional (mobile + desktop, mismo lenguaje):**

```
┌──────────────────────────────────────────────────────────┐
│ 🚚 En camino                                              │
│ #ORD-1234 · 3 productos · $1,234                          │
│                                                           │
│ ●━━━●━━━●━━●━━━━○                                        │  ← Timeline visual
│ Pago  Prep  Salió  Llega ~hoy 6PM                         │
│                                                           │
│ [Ver tracking]  [Pedir lo mismo →]                        │
└──────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────┐
│ ✓ Llegó                                                   │
│ #ORD-1233 · 2 productos · $890                            │
│ Entregado el 5 de mayo                                    │
│                                                           │
│ ●━━●━━●━━●━━●  ✓                                         │  ← Timeline completo
│                                                           │
│ ¿Cómo te fue? ⭐⭐⭐⭐⭐                                     │  ← Quick rating
│ [Recomprar]  [Ver detalles]                               │
└──────────────────────────────────────────────────────────┘
```

- **Timeline visual horizontal** en cada card — Domino's pattern.
- **ETA explícita** cuando aplica (calcular desde `dispatchedAt` + SLA del comercio).
- **Quick rating inline** para órdenes "Llegó" — captura NPS sin friction.
- **CTA contextual por estado** (ver tabla más abajo).

---

#### 1.3 Filtros emocionales (chips)

```
[ Activos ] [ Llegaron ] [ Cancelados ] [ Todos ]
```

- **Default activo**: "Activos" (todo lo no entregado).
- Sólo 4 chips — no abrumar.
- Conteo en chip si > 0: "Activos (2)".
- Touch targets 44px mínimo.

---

#### 1.4 Acciones contextuales por estado

| Estado UI | CTA primario | CTA secundario | CTA terciario |
|---|---|---|---|
| **Confirmando** | "Ver detalles" | "Contactar a la tienda" | — |
| **Preparando** | "Ver detalles" | "Cancelar pedido" (si dentro de SLA) | — |
| **En camino** | "Ver tracking en vivo" | "Pedir lo mismo" | "Contactar a la tienda" |
| **Llegó (sin rating)** | "⭐ Calificar" | "Pedir lo mismo" | "Ver detalles" |
| **Llegó (calificado)** | "Pedir lo mismo" | "Ver detalles" | — |
| **Cancelado** | "Ver detalles" | "Pedir uno nuevo" | — |

> CTA "Pedir lo mismo" es palanca de retention #1 (Amazon: 35% revenue de "Buy it again"). Implementación: añade los items de la orden al carrito y redirige a checkout.

---

#### 1.5 Empty state orientador

```
┌──────────────────────────────────────────────────────────┐
│                  📦                                        │
│                                                           │
│       Tu primer pedido te está esperando                  │
│                                                           │
│  Cuando hagas tu primera compra, podrás seguir            │
│      su estado en tiempo real desde aquí.                 │
│                                                           │
│       [🛍 Explorar productos de la tienda →]              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

- Copy emocional, no funcional.
- CTA grande, primario, color del brand del tenant.
- Si hay error de carga: "No pudimos cargar tus pedidos. [↻ Reintentar]" + microcopy "Si esto sigue, [contactar a la tienda]".

---

### LAYER 2: INTERACTION (35% del impacto)

#### 2.1 Polling / revalidate para "vivir" el estado

- **Revalidate cada 60s** en pedidos "Activos" (Confirmando / Preparando / En camino) usando `useSWR` o equivalente.
- **Background refresh silencioso** — no interrumpe scroll del usuario.
- **Toast suave al detectar cambio**: "Tu pedido #ORD-1234 cambió de estado: ahora va en camino 🚚".
- **Indicador visual sutil**: si el estado cambió en background, la card parpadea verde 1s para llamar atención.
- **Bonus**: PWA push notification opcional ("Permitir notificaciones de pedidos para enterarte sin abrir la app").

#### 2.2 Animations (proponer Framer Motion mínimo)

> **Decisión técnica**: instalar Framer Motion en el storefront SI no está. Es una dependencia liviana (~50KB gzipped) y el costo es justificado por el valor emocional del tracking.

| Trigger | Animation | Duration |
|---|---|---|
| Card load | Fade-up + stagger 50ms | 250ms |
| Cambio de estado (background) | Pulse verde sutil + scale 1→1.02→1 | 600ms |
| Tap chip filtro | Scale 1→0.96→1 | 150ms |
| Timeline completion | Dot draw secuencial | 800ms hero |
| "Llegó" reveal | Confetti micro (proporcional al monto) | 1000ms |
| Pull-to-refresh | Spinner draw | 600ms |
| Quick rating tap | Star fill + bounce | 300ms |

#### 2.3 Sin Framer Motion como fallback

Si decisión es NO instalar Framer Motion, usar `tailwindcss-animate` (ya disponible) con keyframes para:
- `animate-pulse` en card al cambio de estado.
- `transition-all duration-300` en hover/active.
- CSS `@keyframes` para timeline draw.

---

### LAYER 3: CELEBRATION (25% del impacto)

#### 3.1 Pedido "Llegó" — peak emocional del flujo

Este es el momento de mayor satisfacción del comprador. **No puede pasar sin ceremonia.**

Cuando el comprador entra y detecta un pedido recién entregado (cambió a "delivered" en las últimas 24h):

**Stage 1 — Anticipation** (al cargar la lista):
- La card del pedido "Llegó" se carga con un highlight sutil verde.

**Stage 2 — Reveal**:
- Timeline se completa con animation secuencial (cada dot se llena en cascada 100ms).
- Check verde grande aparece con `SPRING.bouncy`.

**Stage 3 — Celebration**:
- Confetti micro sobre la card (proporcional al monto: subtle si <$50, evidente si >$200, festivo si >$500).
- Copy: "🎉 ¡Llegó tu pedido! ¿Cómo te fue?"
- Quick rating inline (5 estrellas tap).
- CTA prominent: "Pedir lo mismo otra vez" (palanca de repeat).

#### 3.2 Welcome-back recognition

| Contexto | Copy |
|---|---|
| Primera visita post-compra | "Bienvenida, María. Estamos preparando tu pedido — te avisaremos." |
| Visita con pedido recién enviado | "Tu pedido salió hace 2h, llega en ~30 min ✨" |
| Visita con pedido entregado pero sin rating | "Tu pedido llegó ¡felicidades! ¿Cómo te fue?" |
| Visita sin actividad nueva | "Hola otra vez, María. Sin novedades aún." |
| Comprador frecuente (5+ órdenes) | "Hola, María. Eres una de nuestras compradoras frecuentes 💚" |

#### 3.3 Intelligence trap (recompras + favoritos)

- **"Pedir lo mismo"** disponible en cada orden entregada → 1-tap re-order.
- **"Productos favoritos"** sección colapsable: top 3 productos más pedidos por este comprador.
- **Total gastado este año**: footer microcopy "Has hecho X compras este año, total $Y" — refuerza loyalty sin presión.
- **Cumpleaños / aniversario de primera compra**: copy especial "Hoy hace 1 año hiciste tu primera compra aquí 🎂 [Ver oferta especial]".

> Cada visita deposita más valor para el comprador. Si se va a otra tienda, pierde su historial de compras + sugerencias personalizadas.

---

## Layout breakpoints

| Breakpoint | Layout |
|---|---|
| **< 640px (mobile portrait)** | Header colapsado. Card flotante del pedido urgente. Lista vertical. Filter chips horizontales. CTA grandes pulgar-friendly. |
| **640-1023px (tablet)** | Header expandido con KPI emocional. Lista en 1 columna ancha. Filtros chips. |
| **≥ 1024px (desktop)** | Header full + KPI. Lista en 1 columna centrada (max-width 800px) — NO multi-columna porque el contenido emocional necesita foco. Side panel detalle al click. |

> **Decisión deliberada**: NO cards en grid 2-3 columnas en desktop. La emocionalidad del tracking necesita atención focalizada. Una columna ancha con cards grandes funciona mejor que un grid denso (probado en Shopify, Amazon order pages).

---

## Information architecture

### Card emocional shape

```
[Estado emoji + label]
[#orderNumber · #items · $total]
[Sub-info contextual: ETA / fecha entrega / motivo cancelación]

[Timeline visual horizontal]

[Quick rating inline si aplica]
[CTA primario] [CTA secundario]
```

### Hierarchy weights

1. **Hero**: estado emocional + ETA (lo que el comprador necesita en <1s).
2. **Primary**: timeline visual + monto.
3. **Secondary**: orderNumber + items count + sub-info.
4. **Tertiary**: rating, CTAs.

---

## Design tokens

### Colors (usar tokens del tenant brand donde aplique)
- Estado "Confirmando": azul claro (`bg-blue-50` / `dark:bg-blue-900/30`)
- Estado "Preparando": naranja suave (`bg-orange-50` / `dark:bg-orange-900/30`)
- Estado "En camino": azul vivo (`bg-blue-100` / `dark:bg-blue-800/40`)
- Estado "Llegó": verde (`bg-green-50` / `dark:bg-green-900/30`)
- Estado "Cancelado": gris (`bg-gray-50` / `dark:bg-gray-800`)
- Brand primary: token del tenant (`var(--tenant-primary)`)

### Typography
- Estado label: `text-base font-semibold` con emoji
- Order number: `text-sm text-muted-foreground`
- Total: `text-xl font-bold`
- Sub-info: `text-sm`
- ETA: `text-base font-medium` con highlight color

### Motion
- Stagger: 50ms entre cards
- Card hover: `transition-all duration-200`
- State change pulse: 600ms ease-out
- Confetti micro: 1000ms

---

## Components to reuse / create

### Reuse (existentes en storefront)
- `<Link>` de Next.js para navegación
- AuthContext para `customer.firstName`
- `getCustomerOrders` de `@/lib/api`
- Tailwind v4 tokens en `app/globals.css`

### Create (nuevos en `src/app/[domain]/mis-ordenes/v2/`)
- `OrderHistoryClientV2.tsx` — orquestador, server-fetch initial + client revalidate
- `OrderCard.tsx` — card emocional reusable
- `OrderTimeline.tsx` — timeline visual horizontal con dots animadas
- `OrderStatusBadge.tsx` — badge con emoji + label emocional
- `OrderQuickRating.tsx` — 5 estrellas inline tap
- `OrderActionButtons.tsx` — CTA contextual por estado
- `EmptyOrdersState.tsx` — empty state orientador
- `WelcomeBackHeader.tsx` — greeting + triage banner
- `useOrderEmotionalState.ts` (hook) — mapea 7 estados técnicos → 3 emocionales + ETA
- `useReorderToCart.ts` (hook) — añade items de orden a carrito y redirige a checkout

### Backend dependency (verificar antes de implementar)
- `getCustomerOrders` debe devolver `dispatchedAt`, `estimatedDelivery` si existen (sino, calcular client-side).
- Endpoint `POST /cart/reorder/:orderId` para "Pedir lo mismo" (verificar si existe; si no, implementar).

---

## Acceptance criteria (las 5 dimensiones del ≥80%)

Cada métrica se mide ANTES (V1) y DESPUÉS (V2). Reporte en `food-inventory-storefront/docs/audits/mis-ordenes-v2-verification.md`.

- [ ] **D1 — Time-to-anxiety-relief**: tiempo desde landing hasta entender estado del pedido más urgente → **≤2s** (vs ~10s estimado V1). **Mejora ≥80%.**
- [ ] **D2 — Estado emocional comprensible**: 5 usuarios non-tech identifican correctamente "¿está casi listo o aún falta?" → **5/5** (vs 1/5 estimado V1). **Mejora +400%.**
- [ ] **D3 — Repeat purchase rate**: % de órdenes "Llegó" que generan re-compra dentro de 30 días → **+25% relativo** (medible post-deploy con analytics).
- [ ] **D4 — WhatsApp escalation reduction**: encuestar 3 tenants con feedback "¿menos preguntas de '¿llegó?'" → **mejora cualitativa reportada por al menos 2/3**.
- [ ] **D5 — Mobile usability**: Lighthouse Mobile UX score → **≥95** (vs ~65 estimado V1). **Mejora ≥46%.**

**Composite ≥80%**: media de las 5. Si D3 toma >30 días en medirse, validar con D1+D2+D5 inmediatamente.

### Verificación funcional (regresión cero)

- [ ] Cargar lista de órdenes → render correcto en mobile + desktop.
- [ ] Polling cada 60s actualiza estado sin interrumpir scroll.
- [ ] Cambio de estado en background dispara toast + parpadeo.
- [ ] "Pedir lo mismo" añade items al carrito + redirige a checkout.
- [ ] Quick rating envía calificación al backend.
- [ ] Empty state muestra CTA "Explorar productos" funcional.
- [ ] Error state muestra retry funcional.
- [ ] Dark mode (con `dark:` prefix Tailwind v4, no inline `if/else`).
- [ ] Multi-tenant: branding del tenant respetado (color primary).
- [ ] SEO: si pre-renderiza con Server Component, metadata correcta.
- [ ] Auth expirado redirige a login del tenant.
- [ ] Reduce-motion respetado (sin confetti agresivo si OS lo pide).

---

## Out of scope (para iteraciones futuras)

- **Push notifications nativas** (PWA) — proponer en fase 2.
- **Mapa de tracking en vivo** (estilo Uber Eats) — requiere integración con courier APIs, fuera de scope.
- **Chat integrado con el comercio** — usar WhatsApp link por ahora (más simple + más LATAM-native).
- **AI-powered "te puede gustar"** — fase 2.
- **Filtros avanzados por fecha/monto** — los 4 chips emocionales cubren 95% de los casos.
- **Storefront templates específicos por vertical** (food vs beauty vs restaurant) — usar layout genérico inicialmente, refinar después.

---

## Implementation order (cuando se ejecute Fase 3)

Cada paso buildea independientemente. Cada paso = 1 commit.

1. `useOrderEmotionalState` (hook) + tests unitarios — mapea 7 → 3 estados.
2. `OrderStatusBadge` componente puro aislado.
3. `OrderTimeline` componente puro aislado.
4. `OrderQuickRating` componente puro aislado.
5. `OrderActionButtons` con tabla declarativa CTA por estado.
6. `OrderCard` ensambla los anteriores.
7. `WelcomeBackHeader` con triage banner.
8. `EmptyOrdersState`.
9. `useReorderToCart` (hook) — verificar/implementar endpoint backend si necesario.
10. `OrderHistoryClientV2` orquestador — server fetch + client revalidate.
11. Wire feature flag — env var `NEXT_PUBLIC_ORDERS_V2=true` o ruta nueva `/mis-ordenes-v2` para QA.
12. `npm run build` + smoke test manual en dispositivos reales.
13. Toggle on/off para confirmar rollback.

---

## Related

- **Audit**: [docs/audits/mis-ordenes-cliente-2026-05-09.md](audits/mis-ordenes-cliente-2026-05-09.md)
- **Backend module**: `food-inventory-saas/src/modules/orders/` (mismo que admin) + endpoints customer
- **System map**: [docs/wiki/system-map.md](../../docs/wiki/system-map.md) sección 5 (storefront endpoints)
- **Skill**: [.claude/skills/ux-design/SKILL.md](../../.claude/skills/ux-design/SKILL.md)
- **Reference patterns externos**:
  - Domino's Pizza Tracker (timeline horizontal de 4-5 etapas)
  - Uber Eats order status (tracking + ETA + ceremonia de "Tu comida llegó")
  - Shopify Order Status Page (multi-tenant brand-aware tracking)
  - Mercado Libre "Mis compras" (LATAM-native UX, recompra rápida)
- **Admin counterpart**: [food-inventory-admin/docs/PROMPT-MOBILE-FIRST-ORDERS-HISTORY-REDESIGN.md](../../food-inventory-admin/docs/PROMPT-MOBILE-FIRST-ORDERS-HISTORY-REDESIGN.md)

---

> **Generated as starting point — refine manually before implementation.**
>
> Persona aplicada: 25 años UX/UI Sillicon Valley + 10 años post-purchase emotional design. Filtro: comprador final ansioso esperando su pedido, con cero lealtad pre-construida hacia SmartKubik. Cada decisión optimiza para reducir ansiedad de espera y aumentar repeat purchase del comercio (cliente de SmartKubik).
