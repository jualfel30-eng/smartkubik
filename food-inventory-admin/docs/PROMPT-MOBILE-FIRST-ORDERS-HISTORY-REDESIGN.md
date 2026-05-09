# Prompt: Mobile-First Redesign — Orders History (Admin)

> **Generated as starting point — refine manually before implementation.**

---

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with **25 years of experience** building high-conversion interfaces at Apple, Spotify, Square, Stripe, Notion, and Linear. The **last 10 years** you specialized in **retention-driven design for SaaS products with high D30/D90** — products where the user comes back not out of obligation but out of feeling, and where every session deepens an intelligence trap that makes the exit door heavier.

Your **double filter** for every design decision:

> (a) "¿Este usuario non-tech frustrado encuentra el camino más corto en <4s?"
> (b) "¿Esta sesión deposita algo irreplicable que haga que volver mañana no sea opcional, sino casi automático?"

The first filter protects against churn-by-frustration. The second filter compounds engagement into investment. Both must be true — a delightful experience the user forgets is wasted; a sticky experience that frustrates is abuse.

You design with **mobile-first constraints applied to BOTH platforms** — the goal isn't a desktop layout shrunk for phone, nor a phone layout stretched for desktop. The goal is the *same simplicity language* in both: every decision tested against the iPhone SE pulgar test ("can a stressed operator do this with one thumb in 4 seconds?"), then expanded for desktop with breathing room.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Multi-vertical (food-inventory, restaurant, beauty). Cross-platform admin PWA.

---

## Context

`OrdersHistoryV2` es la pantalla más visitada del admin (cross-vertical: food-inventory, restaurant, beauty). El operador entra **30+ veces al día** desde mobile (caja, mostrador, mientras camina) y desktop (trabajo administrativo). Hoy es una tabla densa, desktop-first, con dos badges de estado fáciles de confundir, búsqueda lenta, sin filtros relevantes y sin adaptación mobile real.

Este blueprint lo reescribe con la persona arriba aplicada en cada decisión. **Objetivo cuantificable: ≥80% de mejora medida en 5 dimensiones** (ver Acceptance criteria).

---

## Audience

- **Primary**: dueño de negocio LATAM (Venezuela, Colombia, Perú, México), no-tech, ya pagó SmartKubik, opera él mismo o con 1-2 empleados. Móvil = primer dispositivo de consulta. Edad 30-55. Si la pantalla no le resuelve en 4 segundos, abre WhatsApp con el equipo SmartKubik.
- **Secondary**: gerente / contador del negocio (semanal, desktop) — necesita exportar, auditar, ver tendencias.
- **Tertiary**: vendedor / cajero (vertical food-service o beauty) — necesita cobrar rápido en mobile.

---

## Jobs to be done (priorizados por frecuencia real)

| # | Job | Frecuencia | Plataforma típica |
|---|---|---|---|
| **J1** | Encontrar UNA orden específica para cobrar / facturar / verificar pago | 60% | Mobile + Desktop |
| **J2** | Ver qué órdenes urgen atención HOY (vencidas, pendientes de pago grandes) | 20% | Mobile primario |
| **J3** | Auditoría / exportar para contabilidad | 10% | Desktop |
| **J4** | Cambiar estado masivo (marcar varias como entregadas) | 10% | Desktop |

> **Diseño explícito por J1 + J2 (80% de uso)**. J3 y J4 son enhancements secundarios — no comprometer J1/J2 por servirlos.

---

## Audit findings consumed

Este blueprint consume directamente: [docs/audits/orders-history-admin-2026-05-09.md](audits/orders-history-admin-2026-05-09.md).

Resumen de los 5 críticos del audit (que este blueprint resuelve):
1. **C1** — Dos badges idénticos visualmente (pago vs orden) → **Resuelto** en sección "Estado de pago vs orden — fusión visual".
2. **C2** — Cero adaptación mobile real → **Resuelto** con cards mobile + smart table desktop, ambos diseñados desde el mismo lenguaje.
3. **C3** — Filtros de fecha/estado inexistentes → **Resuelto** con OrdersFilterChips horizontales siempre visibles.
4. **C4** — Botón "Procesar" cambia label sin contexto → **Resuelto** con CTA contextual + sub-label explicativo.
5. **C5** — Drawer 3 pasos sin progress visible → **Resuelto** con progress dots + sub-label de paso actual.

Los 9 importantes y 5 menores también se direccionan en las secciones correspondientes.

---

## Neuroscience & UX research foundation

Cada decisión del rediseño está anclada en literatura específica, no en opinión. Citamos para que cualquier reviewer pueda contestar "¿por qué así?".

- **Berridge & Robinson (2016) — Incentive salience**. "Wanting" (mediado por dopamina) ≠ "liking" (mediado por opioides). La anticipación produce más dopamina que la entrega. **Aplicación**: el `Procesando cobro...` (Stage 1) NO es delay molesto — es el peak dopamínico real. Lo diseñamos con 600ms de shimmer, no minimizamos.
- **Sapolsky (Behave, 2017)** — La dopamina dispara DURANTE incertidumbre, peak en "maybe-reward". **Aplicación**: KPIs del header con `AnimatedNumber` que cuenta hacia arriba (no número estático), y delta vs ayer revelado con micro-stagger.
- **Eyal (Hooked Model, 2014)** — Trigger → Action → Variable Reward → Investment. **Mapeo del módulo**:
  - Trigger externo: orden vencida (badge ámbar visible al abrir).
  - Trigger interno: ansiedad de "¿cuánto cobré hoy?".
  - Action: 1 tap (chip filtro o card).
  - Variable reward: cobro exitoso con tier escalado (subtle / standard / milestone).
  - Investment: micro-insights, streak counter, intelligence trap → la próxima sesión empieza con MÁS valor que esta.
- **Kahneman (Thinking Fast & Slow, 2011) — Peak-end rule**. El recuerdo de una sesión se reduce al peak emocional + el final. **Aplicación**: diseñamos deliberadamente el "fin" de la sesión: cierre del día con "Cero pendientes. Cobraste $X hoy en Y órdenes." (no se accidenta — se planifica como hero moment).
- **Fogg Behavior Model (B = MAT)** — Behavior happens when Motivation + Ability + Trigger converge. **Aplicación al chip "Vencidas"**:
  - Motivation: el operador YA quiere cobrar (negocio).
  - Ability: 1 tap (chip siempre visible, no enterrado en menú).
  - Trigger: el badge ámbar en el header lo orienta sin texto.
- **Lembke (Dopamine Nation, 2021) — Pleasure-pain homeostasis**. Sobre-recompensa de eventos triviales DESENSIBILIZA y reduce el peak futuro (down-regulation de receptores D2). **Aplicación**: `getCelebrationTier` calibra la respuesta al monto. Cobro de $5 con confetti = abuso. Cobro >$500 con AnimatedNumber + bouncy spring = recompensa proporcional. Cobro que rompe récord semanal = milestone con afterglow extendido.
- **Csikszentmihalyi (Flow, 1990)** — Flow = challenge ≈ skill. **Aplicación**: eliminamos microfricciones (search 800→250ms, filtros enterrados → chips visibles) sin remover el challenge real (decisiones operativas sobre cobros).
- **Norman (Emotional Design, 2004)** — Tres niveles: visceral (color, forma, ritmo) → behavioral (función fluida) → reflective (orgullo de uso). **Aplicación**: cada componente nuevo se evalúa en los tres niveles. Smart header debe verse bonito (visceral), funcionar instantáneo (behavioral) y dejar al operador pensando "este SaaS me hace ver pro" (reflective).
- **Klingberg (working memory limits, 2009)** — Magic number ≈ 4±1 chunks simultáneos. **Aplicación**: Smart Table reduce de 8-10 columnas a 5; chips visibles SIEMPRE evitan recargar memoria de filtros aplicados.
- **Sapolsky + Berridge consenso 2024-2025 — "Post-celebratory void"**. Tras un peak dopamínico, si la próxima interacción no tiene anclaje, el drop-off es predictivo de churn. **Aplicación**: welcome-back banner (`lastVisit > 24h`) recoloca al usuario en la narrativa: "Bienvenida de vuelta, María. Esto pasó: X nuevas, Y cobradas, Z pendientes." Convierte el regreso en continuación, no en re-arranque.
- **Hari (Stolen Focus, 2022)** — Deep attention en mobile se quiebra cada 47 segundos en promedio. **Aplicación**: cada flujo crítico (cobro) debe completarse en <30s desde tap inicial. ActionSheet con CTA primario contextual evita el desvío cognitivo de "¿qué hago primero?".

> Estas referencias son la vara. Si una decisión de UI no se puede defender contra al menos una de ellas, es ornamento — quitar.

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (35% del impacto)

#### 1.1 Smart Header — Welcome-back + Triage instantáneo

Sustituir el header actual (`<h1>Historial de Órdenes</h1>` + descripción genérica) por un header inteligente que orienta la atención en <1s.

```
┌──────────────────────────────────────────────────────────────┐
│ Hola, María 👋                              [+ Nueva orden]   │
│ Tienes 3 órdenes pendientes hace +5 días — [Ver ahora →]      │
│                                                                │
│ ┌────────┬────────┬────────┬────────┐                          │
│ │ Hoy    │ Pdtes  │ Vencidas│ Cobrado│                         │
│ │ 12     │ $2,400 │ ⚠ 3     │ $8,500 │                         │
│ │ ▲ 4    │        │         │ esta sem.│                       │
│ └────────┴────────┴────────┴────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

- **Greeting personalizado**: "Hola, María" (usa `tenant.user.firstName`). Aplica welcome-back recognition.
- **Triage banner** (sólo si aplica): "Tienes X órdenes pendientes hace +N días" → CTA filtra a esas órdenes. Si nada urge: "Todo en orden ☑ Buen trabajo" (peak-end aplicado).
- **4 KPI cards** (animadas con `AnimatedNumber`):
  - Hoy: # órdenes creadas hoy + delta vs ayer.
  - Pendientes: $ total balance pendiente de cobro.
  - Vencidas: # órdenes pendientes >5 días + ⚠.
  - Cobrado esta semana: $ recaudado, refuerzo positivo.
- **Cada KPI clickable** → filtra la lista a ese subset (zero-cost discoverability de filtros).
- En mobile, los 4 KPIs son grid 2x2; en desktop son fila horizontal.

---

#### 1.2 OrdersFilterChips — Filtros visibles SIEMPRE

Eliminar el filtro de "atributo de producto" del top (uso raro) y mover a Filtros avanzados (bottom sheet). Reemplazar con chips horizontales scrollables siempre visibles:

```
[ Hoy ] [ Esta semana ] [ Pendientes ] [ Vencidas ] [ Pagadas ] [ Todas ]
```

- **Default activo**: "Hoy" (caso 60% de uso).
- **Tap chip**: filtro aplica con `SPRING.snappy` + `haptics.select()`.
- **Active chip**: `bg-primary text-primary-foreground`. Inactive: `bg-card border-border`.
- **Touch targets**: 44px mínimo, padding `px-4 py-2`.
- **Mobile**: scroll horizontal con `snap-x`, primer chip visible al cargar.
- **Desktop**: chips en fila completa (usualmente caben los 6).
- **Filtros avanzados** (icono `SlidersHorizontal` después de chips): bottom sheet en mobile / popover en desktop con: rango de fecha, atributos producto, vendedor asignado, monto mín/máx.

---

#### 1.3 Lista — Cards en mobile, Smart Table en desktop (mismo lenguaje)

**Mobile (<768px) — OrderCardMobile:**

```
┌────────────────────────────────────────────────┐
│ #ORD-1234              [Confirmada chip]   ⋮   │
│ María González · hace 3h                       │
│                                                │
│ $1,234.56                                      │
│ Saldo: $0.00 ✓ Pagado          (verde)         │
│                                                │
│ [Ver detalle]          [Procesar →]   ← CTA    │
└────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────┐
│ #ORD-1289              [Pendiente chip]    ⋮   │  ← amber left border si vencida
│ Pedro Suárez · hace 2 días                     │
│                                                │
│ $890.00                                        │
│ Saldo: $890.00 ⚠ Pendiente     (ámbar)        │
│                                                │
│ [Ver detalle]          [Cobrar $890 →] ← CTA   │
└────────────────────────────────────────────────┘
```

- Cada card es `bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4`.
- **Swipe-left** en card revela acción rápida "Cobrar" (la más frecuente).
- **Swipe-right** en card revela "Ver detalle".
- **Tap en card** = abre OrderActionSheet (bottom sheet con todas las acciones contextuales).
- **Skeleton durante load**: card con shape exacto, `animate-pulse`.

**Desktop (≥1024px) — OrdersSmartTable:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ # Orden     │ Cliente              │ Total      │ Estado pago      │ ⋮  │
├─────────────┼──────────────────────┼────────────┼───────────────────┼────┤
│ #ORD-1234   │ María González       │ $1,234.56  │ ✓ Pagado  (verde)│ ▶ │
│             │ hace 3h · Confirmada │            │ Saldo $0.00       │    │
├─────────────┼──────────────────────┼────────────┼───────────────────┼────┤
│ #ORD-1289   │ Pedro Suárez         │ $890.00    │ ⚠ Pendiente (amb)│ ▶ │
│             │ hace 2d · Pendiente  │            │ Saldo $890.00     │    │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Sólo 5 columnas visibles** (vs 8-10 actuales): #, Cliente, Total, Estado pago, Acciones.
- **Estado de orden vive bajo el nombre del cliente** como sub-label pequeño (no columna).
- **"Atendido Por"** sólo aparece si tenant es multi-user Y la orden tiene `assignedTo` definido (resuelve I3 del audit).
- **Click en row** → abre side panel con detalle (no modal/drawer que tape la lista).
- **Botón "Más columnas"** en header de tabla → menu con columnas opcionales (Atendido Por, Fecha exacta, etc.).
- **Stagger animation** al cargar (`STAGGER(0.03)` con `listItem` variant).

---

#### 1.4 OrderActionSheet — Sustituye el drawer 3-pasos confuso

En mobile: bottom sheet con CTA primario contextual claro + secundarios. En desktop: side panel con la misma lógica pero más espacio.

```
┌────────────────────────────────────────────────┐
│ #ORD-1289 — Pedro Suárez                  [×]  │
│ Total $890.00 · Pendiente                      │
│                                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                │
│ ┌──────────────────────────────────────────┐   │
│ │ 💵 COBRAR $890.00                        │   │  ← CTA primario contextual
│ └──────────────────────────────────────────┘   │
│                                                │
│ Otras acciones:                                │
│ • 👁 Ver detalle completo                      │
│ • 🧾 Generar factura (cuando esté pagada)      │
│ • 🍳 Enviar a cocina (si vertical restaurant) │
│ • ✉ Notificar al cliente                       │
│ • ⛔ Cancelar orden                            │
└────────────────────────────────────────────────┘
```

**Reglas declarativas para CTA primario contextual:**

| Estado pago | Estado orden | Tiene factura | CTA primario | Sub-label |
|---|---|---|---|---|
| Pendiente | Cualquiera | — | "Cobrar $X" | "Registra el pago para continuar" |
| Parcial | Cualquiera | — | "Cobrar saldo $X" | "Falta $X de $total" |
| Pagado | Confirmada / Procesando | No | "Generar factura" | "Cobro completo, listo para facturar" |
| Pagado | Cualquiera | Sí | "Ver factura" | "Factura ya emitida" |
| Pagado | Entregada | Sí | "Marcar completada" | "Cierra el ciclo de la orden" |
| Cancelada | — | — | "Reabrir orden" | "Permite reintentar el cobro" |

> Esta tabla se documenta en código como una función pura `getPrimaryCTA(order)` para ser testeable y extensible.

---

#### 1.5 Resolución del bug cognitivo: Estado de pago vs Estado de orden

**Diagnóstico del audit (C1)**: dos columnas Badge idénticas visualmente para conceptos distintos.

**Solución estructural — Fusión visual en mobile + jerarquía clara en desktop:**

- **Estado de pago = el saldo + su color**. El saldo ES el estado.
  - Saldo $0.00 verde → Pagado
  - Saldo $X ámbar → Pendiente / Parcial
  - Saldo $X rojo SOLO si vencida >5 días
- **Estado de orden = chip pequeño** secundario, vive arriba en card / sub-label en desktop.
- Sólo HAY un Badge prominente por orden = estado de pago. El estado operativo (Confirmada / Procesando / Enviada) queda como info contextual secundaria.

**Resultado esperado**: en test con 5 usuarios non-tech, distinguir el estado financiero de cada orden en <1s sin instrucción → 5/5 (vs 1/5 actual).

---

### LAYER 2: INTERACTION (25% del impacto)

#### 2.1 Búsqueda — debounce 250ms + autocomplete

- **Debounce 250ms** (vs 800ms actual) → respuesta percibida instantánea.
- **Autocomplete** sugiere clientes recientes mientras tipea (chips desplegables).
- **Search persistente** en URL (`?q=`) — deep-linkable.
- **Indicador "Buscando..."** SOLO si tarda >300ms (evita flicker).

#### 2.2 Mobile-specific interactions

| Trigger | Animation | Spec | Haptic |
|---|---|---|---|
| Tap chip filtro | scale 1→0.96→1 | `SPRING.snappy` (500,40), 150ms | `haptics.select()` |
| Swipe-left card | reveal "Cobrar" + scale 0.98 | `SPRING.drawer` (380,36) | `haptics.tap()` |
| Swipe-right card | reveal "Ver detalle" + scale 0.98 | `SPRING.drawer` | `haptics.tap()` |
| Pull-to-refresh | spinner draw + bg subtle pulse | 600ms | `haptics.success()` on done |
| Tap card | bottom sheet sube | `SPRING.drawer` | `haptics.tap()` |
| Open action sheet | sheet slide from bottom | `SPRING.drawer`, 350ms | — |
| Cobro success | check draw + AnimatedNumber descend balance | 800ms hero, ease-out | `haptics.success()` |
| Filter change | list crossfade + stagger | `STAGGER(0.03)`, 250ms | — |

#### 2.3 Desktop-specific interactions

- **Hover row** → bg highlight + actions reveal (no swipe en desktop, hover-equivalent).
- **Click row** → side panel slide-in desde derecha (no modal blocking).
- **Keyboard shortcuts** (opcional fase 2): `/` busca, `n` nueva orden, `r` refresh, `f` toggle filters, `j/k` navegar rows, `enter` abre detalle.
- **Stagger on load**: `STAGGER(0.02)` para 25 rows max (reduce a 0 si reduce-motion).

#### 2.4 Optimistic UI

- **Cambio de estado de orden**: actualiza UI inmediatamente, revierte si falla con `haptics.error()` + toast.
- **AnimatedNumber** en totales del header al cambiar filtro o cobrar.
- **Skeleton durante refetch** (no spinner global, sólo en zona afectada).

---

### LAYER 3: CELEBRATION (20% del impacto)

#### 3.1 Cobro exitoso — Three-stage reward sequence

**Stage 1 — Anticipation** (cuando usuario confirma cobro):
- Bottom sheet bottom 0 → 30% scaling, "Procesando cobro..." 600ms con shimmer en monto.
- Build uncertainty antes del reveal.

**Stage 2 — Reveal**:
- Check verde se dibuja (path animation 400ms).
- AnimatedNumber: balance ANTES → DESPUÉS (de $890 → $0.00 en 800ms ease-out).
- "Saldo $0.00 ✓ Listo" con `SPRING.bouncy` (420,22).
- `haptics.success()`.

**Stage 3 — Celebration**:
- Sheet permanece 1.5s con el resultado visible.
- CTA secundario: "🧾 Generar factura ahora" (siguiente paso natural).
- Stat persistente: "Cobraste $X en Y minutos" (contexto positivo).
- Si cierra el sheet: card en lista parpadea verde sutil (afterglow) + se mueve a "Pagadas".

#### 3.2 Última orden del día cobrada — milestone

Si al cerrar la app o cambiar filtro detectamos que NO quedan órdenes pendientes:
- Toast más rico que el default: "🎉 Cero pendientes. Cobraste $X hoy en Y órdenes."
- Vibe sutil de bouncy.

#### 3.3 Welcome-back con contexto temporal

Al entrar a la pantalla:
- Si `lastVisit` < 1h: sin banner.
- Si `lastVisit` 1-24h: banner suave "X órdenes nuevas desde hace Yh".
- Si `lastVisit` > 24h: banner empático "Bienvenida de vuelta, María. Esto pasó: X nuevas, Y cobradas, Z pendientes."

#### 3.4 Empty states orientadores

| Contexto | Copy + acción |
|---|---|
| Sin órdenes en filtro "Vencidas" | "🎯 Cero vencidas — protegiste $X de cobros a tiempo esta semana" |
| Sin órdenes en filtro "Hoy" | "Hoy aún no has registrado órdenes. [+ Crear primera orden hoy]" |
| Sin órdenes en cuenta nueva | "Aún no hay órdenes en tu negocio. [+ Crear tu primera orden]" |
| Sin resultados de búsqueda | "No encontramos '$query'. [Limpiar búsqueda]" |
| Error de carga | "No pudimos cargar las órdenes. [↻ Reintentar]" + microcopy "Si esto sigue, [contactar soporte]" |

> **Nota loss-aversion**: el empty state de "Vencidas" usa reframing (Kahneman, prospect theory): la ausencia se convierte en ganancia visible ("protegiste $X"). No es ornamento — es mecanismo de retención por refuerzo positivo del comportamiento que YA está sucediendo.

---

### LAYER 4: RETENTION ENGINE (20% del impacto)

Esta capa es la diferencia entre un módulo "bien diseñado" y un módulo del que el operador no puede irse. Apunta al D30/D90, no a la sesión actual. Se construye con 6 sub-mecanismos calibrados — ninguno es decorativo, ninguno es abusivo.

#### 4.1 Daily Ritual Hook

La primera apertura del día (detectada por `useDailyRitualSnapshot` comparando `lastVisit` con hoy 00:00 del tenant) muestra un **snapshot del cierre de ayer** sobreimpreso al smart header durante 1.5s, luego fade out al estado normal:

```
┌──────────────────────────────────────────────────────────────┐
│ Buenos días, María ☀                                          │
│ Ayer cerraste con $4,200 cobrados en 18 órdenes.              │
│ Hoy hay 3 vencidas pendientes — [Verlas]                      │
└──────────────────────────────────────────────────────────────┘
```

- Convierte la apertura matutina en **ritual de check-in** (Duolingo streak pattern adaptado a operadores SaaS).
- Si el operador NO entra en >24h, al volver ve "Esto pasó mientras estuviste fuera" (welcome-back) — recoloca en la narrativa, no requiere re-arranque cognitivo.
- Implementación: hook `useDailyRitualSnapshot(tenantId)` lee `localStorage.smk_orders_ritual_${tenantId}` con `{ lastVisit, lastDailyClose: { collected, ordersCount, date } }`.

#### 4.2 Variable Ratio Reinforcement (calibrado, NO abusivo)

El tamaño de la celebración del cobro escala con (a) monto absoluto y (b) rareza relativa al tenant. Función pura `getCelebrationTier({ amount, weeklyMaxAmount })`:

| Tier | Disparador | Animación | Haptic |
|---|---|---|---|
| **subtle** | `amount < $100` (cobro habitual) | Toast verde + check estático | tap |
| **standard** | `$100 ≤ amount ≤ weeklyMaxAmount` | AnimatedNumber balance + check draw | success |
| **milestone** | `amount > weeklyMaxAmount` (récord semanal) | "🏆 Mejor cobro de la semana" + bouncy spring + afterglow 2s + card flash green | success |

> **Por qué calibrar (Lembke)**: confetti en cada cobro de $5 desensibiliza. En 1 semana, el cerebro re-baseliniza y los milestones reales pierden impacto. La calibración protege la potencia del peak para cuando importa.

Edge case adicional: **día completo sin pendientes al cierre** → "🎯 Cero pendientes — récord de N días" con el streak counter visible. Sólo se dispara una vez por día.

#### 4.3 Intelligence Trap Deepening

Cada sesión deposita **micro-stats irreplicables** que NO se pueden reconstruir si el operador migra de SaaS. Se renderizan en `OrdersIntelligenceCard` que rota 1 insight por sesión (variable surprise + serendipity):

- "Cliente más frecuente este mes: María González (12 órdenes, $4,200)"
- "Tu hora pico de cobros: 14:00-16:00 — 38% del volumen diario"
- "Vendedor top esta semana: Pedro (5 órdenes vs Juan 2)" *(sólo multi-user)*
- "Producto más cobrado hoy: Hamburguesa Especial (14 órdenes)"
- "Tu día más fuerte: jueves promedio $5,800/día"
- "Tasa de pago en <24h este mes: 87%" *(usar como benchmark del propio negocio)*

Reglas:
- Computar client-side desde la lista actual (no requiere endpoint nuevo). Hook `useOrdersInsights(orders)`.
- Persistir el último insight mostrado en `localStorage.smk_orders_lastInsight_${tenantId}` para no repetir 2 sesiones seguidas.
- Si menos de 10 órdenes en el dataset → mostrar onboarding insight: "Cuando tengas más órdenes, aquí verás patrones de tu negocio."

> **El test del Intelligence Trap**: si el operador exporta su CSV y se va a un competidor, ¿perdió algo? Si exportó las órdenes pero no los insights compounded, perdió la inteligencia que SmartKubik construyó por él. Eso es stickiness real.

#### 4.4 Streak Counter sutil (con safeguard de empatía)

Footer del smart header muestra: **"X días seguidos sin órdenes vencidas"**. Pequeño, `text-xs text-muted-foreground`, no prominente.

- Hook `useStreakCounter(tenantId, overdueCount)` actualiza `localStorage.smk_orders_streak_${tenantId}` = `{ days, lastUpdate }`.
- Reset si gap > 1 día (operador no abrió o tuvo vencidas).

**Safeguard crítico (Duolingo lesson)**: cuando el streak se rompe, NUNCA copy negativo ("Perdiste tu racha"). Siempre empático: **"Recupera el ritmo hoy — cobra una para arrancar la próxima racha."** El streak motiva sin extorsionar.

#### 4.5 Loss-aversion reframing (incorporado en empty states 3.4)

Ya documentado en LAYER 3 sección 3.4. Repaso rápido del principio: ausencia → ganancia visible. Aplica en cualquier nuevo empty state que se añada en futuras iteraciones.

#### 4.6 Anti-saturación safeguards (reglas duras)

Para que esta capa NO se vuelva ruido, declaración explícita de límites:

- **Máximo 1 celebración tier `milestone` por sesión.** Si se dispararía una segunda, degradar a `standard`.
- **Confetti / hero animations SOLO en milestones reales** (récord semanal, primer cobro del día, cierre del día sin pendientes). Nunca en cobros rutinarios.
- **Welcome-back banner sólo si `lastVisit > 24h`.** Apertura repetida en mismo día = sin banner.
- **Daily Ritual Hook sólo en primera apertura del día.** Refrescar la pestaña no lo redispara.
- **Streak counter NO se promociona** (no toast "¡5 días seguidos!"). Vive en el footer del header como información ambiental.
- **`useReducedMotion()` respetado SIEMPRE** — todas las animations hero degradan a estados estáticos. La retención NO depende de animations; depende del valor depositado.
- **Intelligence card rota máx 1 vez por carga.** No carrousel automático. El operador la lee o la ignora.

> **El criterio**: si un usuario activo del módulo cobra 50 órdenes en una sesión intensa, debe sentirse productivo, no bombardeado. Si 49 son subtle y 1 es milestone, el balance es correcto.

---

## Layout breakpoints

| Breakpoint | Layout |
|---|---|
| **< 640px (mobile portrait)** | Smart Header colapsado (KPIs en grid 2x2). FilterChips scroll horizontal. Cards verticales. FAB "+ Nueva orden". Bottom sheet acciones. |
| **640-1023px (tablet / mobile landscape)** | Smart Header expandido (KPIs en fila). FilterChips fila completa. Cards en grid 2 columnas. Header sticky. Bottom sheet o side panel adaptativo. |
| **≥ 1024px (desktop)** | Smart Header full + KPIs 4 cols. FilterChips fila + filtros avanzados popover. Smart Table 5 cols + side panel detalle. Hover interactions habilitadas. |
| **≥ 1440px (desktop large)** | Side panel detalle siempre visible (split-view 60/40). |

---

## Information architecture

### Card shape (mobile)

```
┌────────────────────────────────────────────────┐
│ #orderNumber          [Estado-orden chip]   ⋮  │  ← chip secundario
│ customerName · hace Xh                         │
│                                                │
│ $totalAmount                                   │  ← typography hero
│ Saldo: $balance [icon] [estadoLabel]           │  ← color = estado financiero
│                                                │
│ [Ver detalle]  [CTA contextual primario →]     │
└────────────────────────────────────────────────┘
```

### Smart Table row (desktop)

```
| #orderNumber | customerName              | totalAmount | Saldo + Estado pago    | Actions |
|              | hace Xh · estadoOrden     |             | Saldo $X [estadoLabel] |         |
```

### Hierarchy weights

1. **Hero**: `totalAmount` + `balance + payment status` (lo que el operador necesita en <1s).
2. **Primary**: `customerName` + `orderNumber`.
3. **Secondary**: `estadoOrden chip`, `hace Xh`.
4. **Tertiary**: `assignedTo` (sólo si aplica), `attributes`, `fulfillmentType`.

---

## Design tokens (from App.css + motion.js)

### Colors
- Saldo verde (pagado): `text-green-500` o token `success`
- Saldo ámbar (pendiente / parcial): token `warning`
- Saldo rojo (vencida >5d): token `destructive`
- Card: `bg-card`, border `border-border`
- Texto principal: `text-foreground`, secundario: `text-muted-foreground`

### Spacing
- Escala: `4 / 8 / 12 / 16 / 24 / 32`
- Card padding mobile: `p-4` (16px)
- Card padding desktop: `p-5` (20px)
- Stack gap: `gap-3` (12px) entre elementos card

### Typography
- Total amount: `text-2xl font-bold` (mobile), `text-xl font-semibold` (desktop row)
- Cliente: `text-base font-medium`
- Sub-label: `text-xs text-muted-foreground`
- Mínimo legible: `text-base` (16px) en mobile para evitar zoom iOS

### Motion
- `SPRING.drawer` (380, 36) para sheets
- `SPRING.snappy` (500, 40) para chips toggle
- `SPRING.soft` (260, 30) para transiciones de filtro
- `SPRING.bouncy` (420, 22) para celebrations
- `DUR.fast` (150ms) tap feedback
- `DUR.base` (250ms) transitions
- `DUR.slow` (350ms) modals
- `DUR.hero` (600ms) celebrations

---

## Components to reuse / create

### Reuse (no recrear)
- [src/components/MobileActionSheet.jsx](../src/components/MobileActionSheet.jsx) — bottom sheet portaled
- [src/components/ui/animated-number.jsx](../src/components/ui/animated-number.jsx)
- [src/components/ui/animated-table-body.jsx](../src/components/ui/animated-table-body.jsx)
- [src/lib/motion.js](../src/lib/motion.js) — SPRING / DUR / EASE / variants
- [src/hooks/use-debounce.js](../src/hooks/use-debounce.js) — pero llamar con 250ms
- [src/hooks/useExchangeRate.js](../src/hooks/useExchangeRate.js)
- `OrderStatusSelector`, `PaymentDialogV2`, `OrderDetailsDialog`, `BillingDrawer` — sin cambios funcionales

### Create (nuevos en `src/components/orders/v3/` y rutas adyacentes)
- `OrdersHistoryV3.jsx` — orquestador, decide mobile vs desktop por `useMediaQuery`
- `OrdersSmartHeader.jsx` — greeting + triage banner + 4 KPI cards + streak counter footer
- `OrdersFilterChips.jsx` — chips horizontales + filtros avanzados popover
- `OrdersSmartTable.jsx` — tabla desktop 5 cols con sub-labels
- `OrderCardMobile.jsx` — card con swipe-actions
- `OrderActionSheet.jsx` — bottom sheet / side panel con CTA contextual
- `OrdersIntelligenceCard.jsx` — micro-insight rotativo (Intelligence Trap)
- `useOrderTriage.js` (hook, en `src/hooks/`) — clasifica orden en `vencida | pendiente | hoy | pagada` para filtros y triage banner
- `useDailyRitualSnapshot.js` (hook, en `src/hooks/`) — snapshot del cierre de ayer + welcome-back gating
- `useStreakCounter.js` (hook, en `src/hooks/`) — días seguidos sin vencidas, persiste en localStorage por tenant
- `useOrdersInsights.js` (hook, en `src/hooks/`) — computa micro-insights rotativos client-side desde la lista
- `getPrimaryCTA.js` (pure function, en `src/lib/orders/`) — tabla declarativa CTA primario por (paymentStatus, status, hasInvoice)
- `getCelebrationTier.js` (pure function, en `src/lib/orders/`) — recibe `(amount, weeklyMaxAmount)` → `'subtle' | 'standard' | 'milestone'`

---

## Acceptance criteria (las 6 dimensiones del ≥80%)

Cada métrica se mide ANTES (V2) y DESPUÉS (V3). Reporte en `food-inventory-admin/docs/audits/orders-history-v3-verification.md`.

- [ ] **D1 — Time-to-action**: encontrar y cobrar 1 orden conocida en mobile (iPhone SE) → **≤4s** (vs ~15-20s estimado V2). **Mejora ≥75%.**
- [ ] **D2 — Tap depth**: cobrar primera orden vencida desde landing → **2 taps** (vs 5-7 en V2). **Mejora ≥70%.**
- [ ] **D3 — Cognitive disambiguation**: 5 usuarios non-tech distinguen estado pago vs orden en <1s sin instrucción → **5/5** (vs 1/5 estimado V2). **Mejora +400%.**
- [ ] **D4 — Mobile usability**: Lighthouse Mobile UX score → **≥95** (vs <60 estimado V2). **Mejora ≥58%.**
- [ ] **D5 — Frustration triggers**: # de momentos identificados donde usuario abandona o abre soporte → **0-1** (vs 8 del audit). **Mejora ≥87%.**
- [ ] **D6 — Retention proxy** (NUEVA, propia de LAYER 4): delta D7 return rate y sesiones/semana por usuario activo en V3 vs V2 → **+25% mínimo a 4 semanas post-flag-on**. Tracking via evento `orders_history_opened` con `tenantId` + `dayOfWeek` (instrumentación instalada en commit 11; baseline V2 a recolectar 4 semanas antes del switch).

**Composite ≥80%**: media ponderada de las 6. Si alguna dimensión queda <70%, iterar antes de cerrar el PR.

> **Nota sobre D6**: a diferencia de D1-D5 (medibles en una sesión de QA), D6 requiere telemetría longitudinal. Para el PR inicial se exige sólo "instrumentación instalada y emitiendo eventos correctamente". El cumplimiento del +25% se valida en review post-mortem a 4 semanas y se documenta en el mismo verification.md.

### Verificación funcional (regresión cero)

- [ ] Crear orden → aparece inmediatamente en lista del filtro "Hoy".
- [ ] Cobrar orden parcial → balance se actualiza, estado financiero cambia, AnimatedNumber visible.
- [ ] Cambiar estado de orden → optimistic update + persiste en backend.
- [ ] Filtros: cada chip filtra correctamente sin recargar tab.
- [ ] Búsqueda 250ms: tipear no se siente lento ni perdido.
- [ ] Mobile: pull-to-refresh, swipe actions, bottom sheet abren/cierran sin glitch.
- [ ] Desktop: side panel detalle abre, smart table no scroll horizontal en 1280px.
- [ ] Feature flag `VITE_ORDERS_V3=false` → V2 vuelve sin cambios.
- [ ] Vertical restaurant: "Enviar a Cocina" accesible desde ActionSheet (no es CTA primario).
- [ ] Vertical beauty: card muestra "Atendido Por" sólo si existe.
- [ ] `npm run build` sin errores.
- [ ] Tenant isolation: queries siguen filtrando por `tenantId` (validar en network tab).
- [ ] Dark mode (#0a0e1a) y light mode renderizan correctamente.
- [ ] Reduce-motion respetado (sin animations agresivas si OS lo pide).

---

## Out of scope (para iteraciones futuras)

- Edición masiva con multi-select (queda para v3.1).
- Cambios al backend (`orders.controller.ts` / `orders.service.ts`) — el contrato actual cubre todo.
- Rediseño del `OrderProcessingDrawer` desktop existente — la mejora del progress visible es interna del drawer; en v3 sólo se invoca desde el ActionSheet, no se reescribe.
- Storefront `mis-ordenes` — blueprint separado (`food-inventory-storefront/docs/PROMPT-MOBILE-FIRST-MIS-ORDENES-REDESIGN.md`).
- Push notifications nativas — en roadmap PWA.
- AI-powered insights ("Tu cliente más rentable") — fase 2.

---

## Implementation order (cuando se ejecute Fase 3)

Cada paso buildea independientemente. Cada paso = 1 commit.

0. Scaffold carpeta `src/components/orders/v3/` + crear `AnimatedNumber` si no existe en `src/components/ui/`.
1. `useOrderTriage` (hook) + tests unitarios.
2. `getPrimaryCTA` (pure function) + tests unitarios.
3. `getCelebrationTier` (pure function) + tests unitarios. **(Retention)**
4. `useDailyRitualSnapshot` + `useStreakCounter` + `useOrdersInsights` (hooks). **(Retention)**
5. `OrdersFilterChips` componente puro aislado.
6. `OrderCardMobile` componente puro aislado con swipe actions.
7. `OrdersSmartHeader` componente puro aislado (greeting + KPIs + triage banner + streak footer).
8. `OrdersIntelligenceCard` componente puro aislado. **(Retention)**
9. `OrdersSmartTable` componente puro aislado.
10. `OrderActionSheet` componente puro aislado, reusa `MobileActionSheet`.
11. `OrdersHistoryV3` orquestador + wire feature flag en `App.jsx` (`import.meta.env.VITE_ORDERS_V3 === 'true'`).
12. `npm run build` + smoke test manual en dispositivos reales + toggle off/on para confirmar rollback.

---

## Related

- **Audit**: [docs/audits/orders-history-admin-2026-05-09.md](audits/orders-history-admin-2026-05-09.md)
- **Backend module**: [docs/wiki/modules/orders.md](../../docs/wiki/modules/orders.md)
- **System map**: [docs/wiki/system-map.md](../../docs/wiki/system-map.md) sección orders
- **Skill**: [.claude/skills/ux-design/SKILL.md](../../.claude/skills/ux-design/SKILL.md)
- **Reference PROMPTs**:
  - [PROMPT-MOBILE-INVENTORY.md](PROMPT-MOBILE-INVENTORY.md) — listado mobile-first
  - [PROMPT-DESKTOP-AP-AR-REDESIGN.md](PROMPT-DESKTOP-AP-AR-REDESIGN.md) — KPI hero + visual escalation overdue
  - [PROMPT-MOBILE-CASH-REGISTER.md](PROMPT-MOBILE-CASH-REGISTER.md) — ceremonia de cobro
- **Storefront counterpart**: [food-inventory-storefront/docs/PROMPT-MOBILE-FIRST-MIS-ORDENES-REDESIGN.md](../../food-inventory-storefront/docs/PROMPT-MOBILE-FIRST-MIS-ORDENES-REDESIGN.md)

---

> **Generated as starting point — refined 2026-05-09 with Retention Engine + Neuroscience layer.**
>
> Persona aplicada: 25 años UX/UI Silicon Valley (Apple/Spotify/Square/Stripe/Notion/Linear) + últimos 10 años en retención adictiva con high D30/D90. Doble filtro: (a) usuario non-tech frustrado encuentra el camino más corto en <4s, (b) cada sesión deposita stored value irreplicable que vuelve el exit door más pesado.
>
> Vara académica: Berridge & Robinson (incentive salience), Sapolsky (dopamine uncertainty), Eyal (Hooked), Kahneman (peak-end), Fogg (B=MAT), Lembke (pleasure-pain homeostasis), Csikszentmihalyi (flow), Norman (three-level emotional), Klingberg (working memory), Hari (attention fragmentation).
>
> 4 layers, pesos: STRUCTURE 35% / INTERACTION 25% / CELEBRATION 20% / RETENTION 20%. Composite ≥80% en 6 dimensiones (D1-D5 medibles en QA + D6 retention proxy a 4 semanas).
