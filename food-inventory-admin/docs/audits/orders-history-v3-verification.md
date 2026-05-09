# Orders History V3 — Verification Report

**Fecha**: 2026-05-09
**Implementación**: 3 commits (`docs/audit + blueprint`, `feat foundation`, `feat components+orchestrator`)
**Feature flag**: `VITE_ORDERS_V3=true` (rollback inmediato si false)
**Blueprint**: [PROMPT-MOBILE-FIRST-ORDERS-HISTORY-REDESIGN.md](../PROMPT-MOBILE-FIRST-ORDERS-HISTORY-REDESIGN.md)

---

## Verificación automatizada (CLI, hecha)

### ✅ Build
- `npm run build` (sin flag, V2 default) → ✓ built in 36.77s, 330 PWA precache entries
- `VITE_ORDERS_V3=true npm run build` (V3 activo) → ✓ built in 33.05s, chunk `OrdersHistoryV3-BM1Kexvv.js` generado
- Cero errores de transformación / cero warnings nuevos respecto a baseline V2

### ✅ Tests unitarios
```
src/hooks/useOrderTriage.test.js     → 9/9
src/lib/orders/getPrimaryCTA.test.js → 8/8
src/lib/orders/getCelebrationTier.test.js → 7/7
TOTAL: 24/24 passing (vitest run)
```

### ✅ Vite dev server
- Arranca en puerto 5174 (5173 ocupado por otro proceso, sin conflicto funcional)
- HTTP 200 en `/`
- Módulo `src/components/orders/v3/OrdersHistoryV3.jsx` se sirve compilado sin errores HMR

---

## Verificación manual pendiente (requiere navegador)

Estos puntos NO pueden simularse desde CLI; el operador debe ejecutarlos en Chrome DevTools con `VITE_ORDERS_V3=true` activo.

### Mobile (viewport iPhone SE, 375px)
- [ ] Smart header renderiza greeting con nombre + 4 KPIs animados (grid 2x2)
- [ ] Daily Ritual banner aparece SÓLO en primera apertura del día
- [ ] Welcome-back banner aparece SÓLO si lastVisit > 24h
- [ ] Streak counter visible en footer del header (sutile, `text-xs`)
- [ ] Filter chips con scroll horizontal snap, "Hoy" activo por default, contador visible
- [ ] Tap chip dispara haptic + cambia filtro sin reload
- [ ] Cards con jerarquía: total grande, saldo + estado financiero color-coded, CTA contextual
- [ ] Swipe-left card revela "Cobrar" con haptic en threshold (60px)
- [ ] Swipe-right card revela "Detalle" con haptic
- [ ] Tap card abre OrderActionSheet (bottom sheet portaled)
- [ ] FAB inferior derecho "+ Nueva orden" navega a `/orders/pos`
- [ ] Empty state "Vencidas" muestra reframing positivo
- [ ] Pull-to-refresh / botón refresh funciona

### Desktop (viewport ≥1024px)
- [ ] Smart header KPIs en fila de 4
- [ ] OrdersSmartTable con 5 columnas (Orden, Cliente, Total, Estado pago, Acciones)
- [ ] Sub-label bajo customerName muestra "hace Xh · estado"
- [ ] Borde izquierdo destructive en filas overdue
- [ ] Click row abre OrderDetailsDialog (no modal blocking)
- [ ] Botón CTA contextual en cada row (Cobrar / Generar factura / Ver factura / etc.)
- [ ] Stagger animation al cargar la lista (≤25 rows)

### Cross-cutting
- [ ] Búsqueda 250ms se siente instantánea (vs 800ms V2)
- [ ] Cobrar orden parcial dispara ceremony tier según monto:
  - <$100 → toast subtle
  - $100..weeklyMax → toast standard + haptic success
  - >weeklyMax → "🏆 Mejor cobro de la semana" + afterglow extendido
- [ ] AnimatedNumber counts up en KPIs al cambiar filtro
- [ ] OrdersIntelligenceCard muestra 1 micro-insight (cliente top, hora pico, etc.)
- [ ] Insight rota: refrescar la página NO repite el mismo insight 2 veces seguidas
- [ ] Toggle `VITE_ORDERS_V3=false` → V2 vuelve sin errores
- [ ] DevTools Rendering > Emulate prefers-reduced-motion → swipe drag desactivado, animations degradan a estáticas
- [ ] Network tab: queries siguen incluyendo `tenantId` (validar tenant isolation)
- [ ] Lighthouse Mobile UX ≥95 en `/orders/history` con flag on

### Multi-vertical
- [ ] Vertical restaurant: ActionSheet incluye "Enviar a Cocina" como acción secundaria (no como CTA primario)
- [ ] Vertical beauty: card oculta "Atendido Por" si no hay `assignedTo`
- [ ] Vertical food-inventory: comportamiento default sin opciones extras

---

## Acceptance Criteria — estado actual

Las dimensiones D1-D5 requieren medición humana en dispositivo. Reporto el estado al cierre de la implementación:

| Dim | Métrica | Baseline V2 | Target V3 | Estado |
|---|---|---|---|---|
| D1 | Time-to-action mobile (cobrar 1 orden conocida) | ~15-20s | ≤4s | **Pending QA humano** |
| D2 | Tap depth (cobrar primera vencida desde landing) | 5-7 taps | 2 taps | **Pending QA humano** |
| D3 | Cognitive disambig (5 usuarios non-tech) | 1/5 | 5/5 | **Pending user test** |
| D4 | Lighthouse Mobile UX | <60 | ≥95 | **Pending Lighthouse run** |
| D5 | Frustration triggers identificados | 8 | 0-1 | **Implementación direcciona los 8 — verificar en prod 4 semanas** |
| D6 | Retention proxy (D7 return + sessions/week) | baseline a recoger | +25% a 4 sem | **Instrumentación instalada** ✅ (evento `orders_history_opened` con `tenantId`+`dayOfWeek`) |

**D6 instrumentation verificada en código**:
- `OrdersHistoryV3.jsx` dispara `window.dispatchEvent(new CustomEvent('smk:orders_history_opened', { detail: { eventName, payload, ts } }))` en mount.
- Si existe `window.__smkAnalytics.track`, también lo invoca (Mixpanel/Segment-style hook).
- Payload: `{ tenantId, dayOfWeek, flagVersion: 'v3' }`.
- Recolectar baseline V2 emitiendo evento equivalente desde `OrdersHistoryV2.jsx` (out of scope de este PR — añadir antes de switch).

---

## Frustration triggers del audit — addressing

Los 8 triggers del audit ([orders-history-admin-2026-05-09.md](orders-history-admin-2026-05-09.md)):

| # | Trigger original | Addressed por |
|---|---|---|
| FT1 | Usuario abre detalle "para asegurarse" si está pagada | Color-coded balance + estado financiero único + chip estado-orden secundario |
| FT2 | Usuario abandona en mobile, va a desktop | Mobile-first cards + swipe + ActionSheet + FAB |
| FT3 | "El botón cambió de nombre, ¿está roto?" | `getPrimaryCTA` declarativo con sub-label explicativo + tabla testeada |
| FT4 | Apuntes paralelos en Excel para saber qué urge | Smart header con triage banner + chip "Vencidas" siempre visible + intelligence card |
| FT5 | Múltiples clicks en "Exportar CSV" | Toast informativo (heredado V2) — verificar en QA |
| FT6 | Pierde página al refinar búsqueda (vuelve a 1) | Reset explícito a `page=1` en `handleFilterChange` (mismo comportamiento, sin abrupcia) |
| FT7 | En caja mobile no llega al "Procesar" sin scroll | Card mobile con CTA siempre visible + swipe shortcut |
| FT8 | Cobro grande sin ceremonia | `getCelebrationTier` con 3 tiers escalados (subtle/standard/milestone) + AnimatedNumber + haptics |

**Composite ≥80% esperado**: requiere QA humano para confirmar D1-D4. Diseño implementado se alinea 1:1 con el blueprint.

---

## Riesgos y mitigaciones aplicadas

| Riesgo | Mitigación implementada |
|---|---|
| Endpoint `/orders` no soporta filtro `paymentStatus=pending` solo | Filtrado client-side via `useOrderTriage` en `applyClientFilter`; backend recibe `status=pending` para overdue/pending y se refina en cliente |
| `tenant.user.firstName` no existe | Cascada `tenant?.ownerFirstName \|\| user?.firstName \|\| 'Usuario'` |
| Swipe gestures conflictivos con scroll vertical | `dragConstraints={{ left: -100, right: 100 }}` + `dragSnapToOrigin` + threshold 60px |
| Streak anxiety (Duolingo lesson) | Copy empático en `streakBroken`: "Recupera el ritmo hoy" + counter sutile sin promociónarlo |
| Welcome-back en cada apertura | Gate por `lastVisit > 24h` en `useDailyRitualSnapshot` |
| Reduce-motion ignorado | `useReducedMotion` en `OrderCardMobile` desactiva drag; `AnimatedNumber` saltea con `springValue.jump(value)` |
| Saturación de celebraciones | `getCelebrationTier` calibra; máx 1 milestone por sesión por design (no por código aún — añadir si telemetría lo justifica) |

---

## Próximos pasos

1. **Smoke manual del usuario** en navegador con flag activo (checklist arriba).
2. **Beta-test automatizado**: invocar `/beta-test orders-history-v3` (escenarios definidos en blueprint Fase 3.3).
3. **Lighthouse audit** sobre `/orders/history` con flag on para D4.
4. **Activar evento V2 baseline** para D6 (si se quiere medir delta real, no sólo absoluto V3).
5. **Deploy a staging** con flag off (rollback-safe), luego flag on para tenant pilot.
6. **Post-mortem 4 semanas**: actualizar este reporte con métricas D6 reales.

---

> Generated 2026-05-09 by SmartKubik Orders V3 implementation. Blueprint persona: 25 años UX/UI Silicon Valley + 10 años retención adictiva (D30/D90). Vara académica: Berridge, Sapolsky, Eyal, Kahneman, Fogg, Lembke, Csikszentmihalyi, Norman, Klingberg, Hari.
