# PROMPT MOBILE OrdersHistoryV2 — ELEVATE

> Generado por `/mobile-elevate` — punto de partida para refinar a mano antes de implementar.
> Score actual: **5 / 7**. Esta pantalla está sorprendentemente cerca del lenguaje premium — tiene welcome-back narrative, AnimatedNumbers en KPIs, semantic colors, haptics ubicuos. Lo que le falta es concreto y acotado: **superficies premium** (tokens en lugar de `bg-card` plano) y **un par de momentos ceremoniales** que aprovechen la celebración que el contenido ya tiene.

## Contexto

Pantalla de historial de órdenes (versión v3 in-place tras drop del feature flag). Es una pantalla de **uso diario** y de **alto valor emocional**: aquí el usuario celebra cobros, identifica vencidas, y registra el ritmo del negocio. Por eso merece cerrar la brecha de lenguaje con el hero del dashboard.

## Referencia canónica

- Hero: [TodayDashboard.jsx](../src/components/mobile/home/TodayDashboard.jsx)
- Tokens CSS: [App.css](../src/App.css) (`--gradient-primary`, `--glass-subtle`, `--glass-medium`, `--glow-*`)
- Motion: [motion.js](../src/lib/motion.js)

## Componentes auditados (rama mobile)

- [OrdersHistoryV2.jsx](../src/components/orders/v2/OrdersHistoryV2.jsx) — orquestador, render mobile en línea 373.
- [OrdersSmartHeader.jsx](../src/components/orders/v2/OrdersSmartHeader.jsx) — greeting + 4 KPI cards + banners contextuales.
- [OrdersIntelligenceCard.jsx](../src/components/orders/v2/OrdersIntelligenceCard.jsx) — insight card.
- [OrderCardMobile.jsx](../src/components/orders/v2/OrderCardMobile.jsx) — card de orden individual.

## Diagnóstico por dimensión

| # | Dimensión | Estado | Severidad | Evidencia |
|---|---|---|---|---|
| 1 | Tokens de superficie | ✗ falta | **crítico** | KPICard `OrdersSmartHeader.jsx:82` usa `bg-card border` flat. OrderCardMobile `OrderCardMobile.jsx:119` usa `bg-card border` flat. Banners `OrdersSmartHeader.jsx:159, 179` usan `bg-muted/40`. Search input `OrdersHistoryV2.jsx:341` usa `bg-muted` plano. Ninguna superficie usa `var(--gradient-primary)` ni `var(--glass-*)`. La única excepción: `OrdersIntelligenceCard.jsx:15` usa `bg-gradient-to-r from-primary/5 to-card` (Tailwind, no token oficial). |
| 2 | Tipografía ceremonial | parcial | medio | KPI values usan `text-2xl sm:text-3xl font-bold tabular-nums leading-none` (`OrdersSmartHeader.jsx:89`) — bueno pero **falta `tracking-tight`** y nunca llega a 32px display ceremonial. Total de orden: `text-2xl font-bold tabular-nums` (`OrderCardMobile.jsx:148`) — igual gap. Header h1: `text-xl sm:text-2xl font-bold` (`OrdersSmartHeader.jsx:130`) — el hero usa 22px en mobile. |
| 3 | Personalización | ✓ ok | — | Greeting "Buenos días/Hola, {userName}" (`OrdersSmartHeader.jsx:121, 132`), streak counter (`OrdersSmartHeader.jsx:134`), welcome-back banner contextual con resumen de estado (`OrdersSmartHeader.jsx:178-185`), ritual snapshot de "ayer cerraste con $X" (`OrdersSmartHeader.jsx:158-176`). **Mejor que el hero del dashboard en welcome-back narrative.** |
| 4 | Motion choreography | ✓ ok | — | `STAGGER(0.03)` + `listItem` para la lista de cards (`OrdersHistoryV2.jsx:374-377`). `fadeUp` en el header (`OrdersSmartHeader.jsx:127`). `tapScale` en KPICards y CTAs. `AnimatedCurrency`/`AnimatedNumber` en los 4 KPIs (`OrdersSmartHeader.jsx:91-93`). Drag con haptics en cards (`OrderCardMobile.jsx:106-111`). Caveat menor: el total del card individual no usa AnimatedNumber. |
| 5 | Color expresivo | ✓ ok | — | Semantic colors en estados (`OrderCardMobile.jsx:41-46`: green/destructive/amber). Border-l-destructive en overdue (`OrderCardMobile.jsx:120`). Delta vs ayer con color (`OrdersSmartHeader.jsx:100`). Banner overdue con `bg-amber-500/10 border-amber-500/30` (`OrdersSmartHeader.jsx:191`). Caveat: el CTA primario "Nueva orden" usa `bg-primary` plano (`OrdersSmartHeader.jsx:151`) — pierde la oportunidad de gradient ceremonial. |
| 6 | Haptics ubicuos | ✓ ok | — | 7+ ocurrencias: refresh (`OrdersHistoryV2.jsx:313`), success/tap en swipe (`OrderCardMobile.jsx:69, 72, 86`), more button (`OrderCardMobile.jsx:139`), CTA select (`OrderCardMobile.jsx:170`), milestone celebration (`OrdersHistoryV2.jsx:249, 255, 258`). Mejor cobertura que el hero. |
| 7 | KPI celebration | parcial | medio | AnimatedNumber/AnimatedCurrency presentes en los 4 KPI cards (`OrdersSmartHeader.jsx:91-93`). Pero las superficies de las cards son flat (ver dimensión 1) — los números celebran sobre fondo gris. El total de cada orden NO usa AnimatedNumber (`OrderCardMobile.jsx:148`). Falta el "peak ceremonial" (un solo número grande con display 32px + glass + glow) que define el momento en el hero. |

## Transformaciones propuestas

### 1. Tokens de superficie — KPICards con glass

**Antes** (`OrdersSmartHeader.jsx:81-84`):
```jsx
className={cn(
  'relative flex flex-col items-start gap-2 text-left rounded-xl border bg-card p-4 no-tap-highlight transition-colors min-h-[6.5rem]',
  isAlert ? 'border-destructive/40 ring-1 ring-destructive/20' : 'border-border hover:bg-muted/40',
)}
```

**Después**:
```jsx
className={cn(
  'relative flex flex-col items-start gap-2 text-left rounded-xl p-4 no-tap-highlight transition-colors min-h-[6.5rem]',
  isAlert && 'border border-destructive/40 ring-1 ring-destructive/20',
)}
style={{
  background: isAlert ? undefined : 'var(--glass-subtle)',
  boxShadow: isAlert ? undefined : 'var(--elevation-rest)',
}}
```

**Principio aplicado**: layered surface depth (Berridge salience) — los KPIs ya celebran con AnimatedNumber, pero sobre fondo flat ese efecto se aplana. Glass + elevation aporta la profundidad que hace que los números "floten".

---

### 2. Tokens de superficie — OrderCardMobile con elevation

**Antes** (`OrderCardMobile.jsx:118-121`):
```jsx
className={cn(
  'relative bg-card border rounded-[var(--mobile-radius-lg)] p-4 active:scale-[0.99] no-tap-highlight cursor-pointer',
  triage === 'overdue' ? 'border-l-4 border-l-destructive border-y border-r border-y-border border-r-border' : 'border-border',
)}
```

**Después**:
```jsx
className={cn(
  'relative bg-card rounded-[var(--mobile-radius-lg)] p-4 active:scale-[0.99] no-tap-highlight cursor-pointer',
  triage === 'overdue' && 'border-l-4 border-l-destructive',
)}
style={{
  boxShadow: triage === 'overdue' ? '0 2px 12px oklch(0.62 0.15 27 / 0.15)' : 'var(--elevation-rest)',
}}
```

**Principio aplicado**: variable reward — overdue ya tiene rojo a la izquierda; ahora un glow rojo sutil refuerza la urgencia sin ruido. Las cards normales obtienen elevation que mejora la jerarquía sobre el fondo.

---

### 3. Display ceremonial — "Cobrado semana" como peak

El KPI "Cobrado semana" es el momento emocional alto de esta pantalla (es el outcome positivo). Promoverlo a display 32px con tracking-tight cuando esté visible solo, o cuando supere el record.

**Antes** (`OrdersSmartHeader.jsx:89`):
```jsx
<span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground leading-none flex items-center gap-1.5">
```

**Después**:
```jsx
<span className={cn(
  'font-extrabold tabular-nums text-foreground leading-none flex items-center gap-1.5 tracking-tight',
  def.key === 'collectedWeek' ? 'text-[28px] sm:text-[32px]' : 'text-2xl sm:text-3xl',
)}>
```

**Principio aplicado**: peak-end rule — solo "Cobrado semana" obtiene el display ceremonial. Los otros KPIs (Hoy, Pendientes, Vencidas) siguen siendo soportes; el cobrado es el peak.

---

### 4. AnimatedNumber para el total en OrderCardMobile

**Antes** (`OrderCardMobile.jsx:148`):
```jsx
<p className="text-2xl font-bold text-foreground tabular-nums">{fmtCurrency(total)}</p>
```

**Después**:
```jsx
<p className="text-2xl font-bold text-foreground tabular-nums tracking-tight leading-none">
  <AnimatedCurrency value={Number(total) || 0} currency="$" />
</p>
```

Requiere import: `import { AnimatedCurrency } from '@/components/ui/animated-number';`

**Principio aplicado**: Berridge salience + tracking-tight — los amounts cuentan al entrar (el cerebro anticipa el número final). El leading-none aprieta el bloque visual del card.

---

### 5. CTA primario "Nueva orden" con gradient ceremonial

**Antes** (`OrdersSmartHeader.jsx:148-154`):
```jsx
<motion.button
  type="button"
  onClick={onCreateOrder}
  whileTap={tapScale}
  transition={SPRING.snappy}
  className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold tap-target no-tap-highlight shadow-sm hover:bg-primary/90"
>
  <Plus size={16} /> Nueva orden
</motion.button>
```

**Después**:
```jsx
<motion.button
  type="button"
  onClick={onCreateOrder}
  whileTap={tapScale}
  transition={SPRING.snappy}
  className="inline-flex items-center gap-1.5 rounded-lg text-primary-foreground px-3 py-2 text-sm font-semibold tap-target no-tap-highlight"
  style={{
    background: 'var(--gradient-primary)',
    boxShadow: '0 2px 12px oklch(0.62 0.22 268 / 0.25)',
  }}
>
  <Plus size={16} /> Nueva orden
</motion.button>
```

**Principio aplicado**: salience — el CTA primario es la acción más importante de la pantalla; merece el morado de marca con glow para destacarse del resto del UI neutral.

---

## Acceptance criteria

- [ ] Las 4 KPI cards en mobile usan `var(--glass-subtle)` o equivalente token premium (no `bg-card` plano), excepto la card en estado alert que mantiene su tratamiento destructive.
- [ ] OrderCardMobile usa `boxShadow: var(--elevation-rest)` para cards normales y un glow tinted para overdue.
- [ ] El KPI "Cobrado semana" tiene jerarquía visual distinta (≥ 28px display, `tracking-tight`) cuando hay valor > 0.
- [ ] El total de cada `OrderCardMobile` se anima con `AnimatedCurrency` al entrar.
- [ ] El CTA "Nueva orden" usa `var(--gradient-primary)` + glow purple.
- [ ] El comportamiento desktop (`OrdersSmartTable`, breakpoint ≥ 768px) **NO cambia** — las transformaciones aplican solo a la rama `isMobile === true` y a los componentes que solo se renderizan ahí (`OrderCardMobile`).
- [ ] No se introducen breaking changes en props públicas de `OrdersSmartHeader`, `OrderCardMobile` ni `OrdersIntelligenceCard`.

## Notas de implementación

- **Imports a añadir**:
  - En `OrderCardMobile.jsx`: `import { AnimatedCurrency } from '@/components/ui/animated-number';`
- **Hooks a añadir**: ninguno — toda la información necesaria ya existe (`userName`, `kpis`, `total`, `triage`).
- **Riesgos**:
  - `OrdersSmartHeader` se renderiza en desktop también (línea 319 de `OrdersHistoryV2.jsx`, antes del branch `isMobile`). Las transformaciones 1, 3 y 5 afectan también desktop. Confirmar que el lenguaje premium se ve bien en ambos breakpoints — el hero usa estos tokens en mobile only, pero no hay razón técnica para que no funcionen en desktop. **Decisión**: aplicar a ambos. Si algún token no se ve bien en desktop, condicionar con clases de breakpoint.
  - `OrderCardMobile` solo se renderiza en mobile (`OrdersHistoryV2.jsx:373`), seguro.
  - `var(--glass-subtle)` y `var(--gradient-primary)` ya están definidos en `:root` y `.dark` después del fix de [App.css:100-106](../src/App.css#L100-L106) — no requieren agregar nada.
- **Out of scope**:
  - Rediseño de `OrdersSmartTable` (vista desktop) — mantiene su lenguaje actual.
  - Rediseño de los modales/drawers (`PaymentDialogV2`, `OrderDetailsDialog`, `OrderProcessingDrawer`) — son superficies separadas que merecen su propio elevate si se decide.
  - Rediseño de `OrdersIntelligenceCard` — ya tiene un gradient sutil; calibrar si vale la pena cambiar a `var(--gradient-primary-subtle)` queda como decisión de iteración.
  - Cambios en lógica de KPIs, filtros, swipe, o cualquier comportamiento — esto es solo lenguaje visual.

## Related

- Reference hero: [TodayDashboard.jsx](../src/components/mobile/home/TodayDashboard.jsx)
- Skill que generó este blueprint: `.claude/skills/mobile-elevate/SKILL.md`
- Audit posible: `/mobile-elevate-audit` para ver score relativo en el resto del mobile.
