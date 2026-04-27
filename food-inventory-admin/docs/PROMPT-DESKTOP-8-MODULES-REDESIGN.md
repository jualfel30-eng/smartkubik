# Prompt: Desktop UX/UI 80% Redesign — 8 Remaining Modules

## Your Role

Apply the `/ux-design` skill. You are a product designer with 25 years of experience at Stripe, HubSpot, Square, Calendly, and Slack — the last 10 years exclusively focused on retention through addictive business tool experiences. You specialize in converting utility modules (the ones users "have to use") into modules users WANT to open — through intelligent defaults, visual hierarchy that surfaces what matters, animations that confirm actions, and milestone celebrations that build habit loops.

You are grounded in: **Berridge's incentive salience** (anticipation > reward), **the Zeigarnik effect** (incomplete tasks drive return), **variable ratio reinforcement** (unpredictable milestones create strongest habits), **operant conditioning via visual feedback** (instant confirmation reinforces behavior), **the peak-end rule** (users judge by the best and last moments), and **the intelligence trap** (every session deposits irreplaceable stored value).

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Desktop only (≥1024px). Motion tokens in `src/lib/motion.js`.

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

8 modules, ~8,259 lines total. Each module has existing CRUD operations, dialogs, tables, and API integrations that MUST continue working. The redesign adds THREE LAYERS to each:

1. **STRUCTURE** (40%) — Simplify navigation, add context, reduce clicks
2. **INTERACTION** (35%) — Framer Motion, skeletons, smart defaults, inline actions
3. **CELEBRATION** (25%) — Three-stage rewards, milestones, visual feedback

**Rules:** Don't change APIs/business logic. Build after EVERY change. Verify in browser.

---

## MODULE 1: SERVICES (ServicesManagement.jsx — 1,250 lines)

### Summary Dashboard (NEW)
```
┌───────────┬───────────┬───────────┬───────────┐
│ 12        │ $15.40    │ 3         │ 2         │
│ Servicios │ Precio    │ Paquetes  │ Inactivos │
│ activos   │ promedio  │ activos   │ ⚠         │
└───────────┴───────────┴───────────┴───────────┘
```

### Structure Fixes
- **Inline price editing**: click price cell → edit in-place → Enter to save (most common edit)
- **Service cards option**: toggle between table view and card grid (cards show color strip + name + price + duration as visual blocks)
- **Package builder UX**: drag services into a package instead of checkbox list; show savings calculation live
- **Bulk status toggle**: select multiple → "Desactivar seleccionados"

### Interaction
- Table row stagger (`STAGGER(0.03)`, `listItem`)
- Dialog `scaleIn` with `SPRING.soft`
- Service color strip on left of each row (uses service color field)
- Skeleton loading for service list
- AnimatedNumber on summary cards

### Celebration
- New service created: row slides in with highlight pulse
- Package created: "Paquete listo — ahorro de $X para tus clientes" with AnimatedNumber on savings
- 10th service milestone: "10 servicios en tu catálogo"

---

## MODULE 2: PROFESSIONALS (ResourcesManagement.jsx — 1,971 lines)

### Summary Dashboard (NEW)
```
┌───────────┬───────────┬───────────┬───────────┐
│ 4         │ 3         │ $890      │ 85%       │
│ Activos   │ Trabajando│ Revenue   │ Utilización│
│           │ hoy       │ hoy      │ promedio   │
└───────────┴───────────┴───────────┴───────────┘
```

### Structure Fixes
- **Card view as default**: professional cards with photo, color, specialties, today's schedule — instead of table-first
- **Schedule editor redesign**: visual weekly timeline (bars showing hours) instead of 7 rows of checkboxes + time inputs
- **Dialog progressive disclosure**: Basic Info always visible, Pricing/Promotions/Schedule in collapsible accordion sections (closed by default)
- **Photo upload with preview**: professional photo shown as circular avatar in the card; upload via click on avatar

### Interaction
- Card stagger on mount (`STAGGER(0.04)`, `scaleIn`)
- Card hover: subtle elevation + quick action icons appear
- Schedule timeline: bars animate width on mount
- Dialog accordion: spring-animated height (`SPRING.soft`)
- Professional color used as card accent border

### Celebration
- Professional added: card slides into grid with confetti for first-ever professional
- Schedule configured: "Horario de [nombre] listo" toast
- All professionals scheduled: "Equipo completo — todos con horario configurado"

---

## MODULE 3: CASH REGISTER (CashRegisterDashboard.jsx — 1,603 lines)

### Structure Fixes
- **State-driven UI** (like mobile POS prompt): show completely different screens for OPEN vs CLOSED session instead of tabs
- **Close session wizard**: 2-step (Count → Review with difference traffic light) instead of one monolithic dialog
- **Movements inline**: show recent movements in the active session card, not in a separate dialog
- **Approval workflow**: pending closings show as cards with "Aprobar" button prominently, not buried in table actions

### Interaction
- Session KPI cards: AnimatedNumber on all values
- Movement added: new row slides in with `listItem`
- Close session: anticipation progress bar (1.5s) → reveal summary with difference highlight → celebration if balanced
- Table stagger on closing history
- Difference indicator: green (exact), amber (<$5), red (>$5) with pulse on red

### Celebration
- **Session opened**: lock icon → unlock animation + "Caja abierta" toast
- **Session closed with $0 difference**: "Cierre perfecto — cuadra exacto" with green pulse + confetti
- **Session closed with small difference**: "Diferencia de $2.50 — dentro de lo normal"
- **Approval confirmed**: closing card morphs to "Aprobado" badge with checkmark draw

---

## MODULE 4: WHATSAPP (WhatsAppInbox.jsx — 540 lines)

### Structure Fixes
- **Conversation search**: add search bar at top of sidebar — filter by customer name/phone
- **Unread filter toggle**: button to show only unread conversations
- **Collapsible sidebar**: toggle to expand/collapse sidebar on desktop for more chat space
- **Message timestamps visible**: show time next to each message (not only on hover)
- **Typing indicator**: show "Asistente escribiendo..." when AI is processing

### Interaction
- Conversation select: slide-in chat content with `fadeUp`
- New message arrive: conversation bumps to top with spring animation + badge bounce
- Message send: optimistic render with `opacity: 0.7 → 1` on confirmation
- Action panel: slide-in with `SPRING.soft` from right (already has basic CSS slide — upgrade to spring)
- Emoji picker: scale-in with `SPRING.bouncy`

### Celebration
- **First message sent**: brief "Conectado con [cliente]" toast
- **Order created from chat**: "Orden #X creada desde WhatsApp" with link to order
- **Reservation created from chat**: "Cita reservada para [cliente]" with calendar icon

---

## MODULE 5: REVIEWS (ReviewsManagement.jsx — 437 lines)

### Summary Dashboard (NEW)
```
┌───────────┬───────────┬───────────┬───────────┐
│ ⭐ 4.7    │ 45        │ 3         │ 1         │
│ Promedio  │ Total     │ Pendientes│ Rechazadas│
│           │ reseñas   │ ⚠         │           │
└───────────┴───────────┴───────────┴───────────┘
```

### Structure Fixes
- **Pending-first sorting**: pending reviews always shown at top (Zeigarnik effect — unresolved items demand attention)
- **Inline approve/reject**: swipe-style action buttons on each card (one-tap approve, one-tap to open reject reason)
- **Response inline**: expand textarea below the review (not a separate dialog), with "Publicar respuesta" button
- **Pagination**: add pagination (20 per page) — currently loads all at once
- **Star distribution chart**: visual bar chart showing distribution (5-star: 60%, 4-star: 25%, etc.)

### Interaction
- Review cards stagger on load (`STAGGER(0.04)`, `listItem`)
- Approve: card flashes green + badge morphs to "Aprobada" with `SPRING.snappy`
- Reject: card dims to 40% opacity + badge morphs to "Rechazada"
- Response published: response box scales in below with `SPRING.soft`
- Star rating AnimatedNumber on average
- AnimatedNumber on all summary counts

### Celebration
- **5-star review received**: gold star pulse + "Reseña de 5 estrellas de [cliente]" toast
- **Average above 4.5**: "Tu promedio es excelente — 4.7 estrellas" with star animation
- **All pending reviewed**: "Sin reseñas pendientes — todo moderado" green badge
- **50th review milestone**: "50 reseñas — tus clientes confían en ti"

---

## MODULE 6: COMMISSIONS (CommissionManagementDashboard.jsx — 1,347 lines)

### Summary Dashboard (Enhanced)
```
┌───────────┬───────────┬───────────┬───────────┐
│ $2,450    │ 5         │ 3         │ 2         │
│ Total     │ Pendientes│ Metas     │ Planes    │
│ comisiones│ aprobar ⚠ │ activas   │ activos   │
└───────────┴───────────┴───────────┴───────────┘
```

### Structure Fixes
- **Pending approvals prominent**: if there are pending items, show them as a alert bar ABOVE tabs (not buried in Overview tab)
- **Bulk approve button**: sticky bar when selecting multiple records ("Aprobar 5 seleccionadas — $X total")
- **Goal progress visual**: progress bars with AnimatedNumber + projected completion date
- **Replace `prompt()` with custom dialog**: rejection reason should use a proper dialog with textarea, not `window.prompt()`
- **Plan type visual**: instead of text "percentage" → show icon + badge (% icon for percentage, $ icon for fixed, stairs icon for tiered)

### Interaction
- Tab transitions with `fadeUp` (mode="wait")
- Table row stagger on all tabs
- Approval: row flashes green + badge morphs
- Rejection: row fades to muted
- Bulk approval: all selected rows flash green simultaneously + total AnimatedNumber
- Goal progress bar animates from 0 to current on mount

### Celebration
- **Approval batch complete**: "X comisiones aprobadas — $Y total" with AnimatedNumber
- **Goal achieved by employee**: "Carlos alcanzó su meta — bono de $150 activado" with confetti
- **All pending cleared**: "Sin pendientes — todo aprobado" green badge
- **Monthly total milestone**: "$5,000 en comisiones este mes"

---

## MODULE 7: BANK ACCOUNTS (BankAccountsManagement.jsx — 1,011 lines)

### Summary Dashboard (Enhanced)
```
┌───────────┬───────────┬───────────┐
│ $4,250    │ Bs 12,500 │ €800      │
│ USD Total │ VES Total │ EUR Total │
│ 3 cuentas │ 1 cuenta  │ 1 cuenta  │
└───────────┴───────────┴───────────┘
```

### Structure Fixes
- **Account cards instead of table**: card per account (bank logo/icon + name + number masked + balance large + accepted methods as chips)
- **Movements inline**: click account card → expand to show recent 5 movements below (no dialog for browsing)
- **Adjust balance inline**: click balance number → inline stepper appears (no separate dialog for simple adjustments)
- **Reduce 5 action buttons to 3**: combine movements + reconcile into card expand; keep adjust + edit + delete

### Interaction
- Account cards stagger (`STAGGER(0.04)`, `scaleIn`)
- Balance AnimatedNumber on mount + on adjustment
- Card expand: spring height animation for inline movements
- Adjustment confirm: balance number tweens from old to new with green/red flash
- Movement row stagger in expanded view

### Celebration
- **Balance adjusted**: card balance flashes + number tweens with AnimatedNumber
- **New account created**: card slides in with entrance animation
- **Total across currencies updates**: summary cards AnimatedNumber
- **Reconciliation complete**: "Cuenta reconciliada — todo cuadra" green flash

---

## MODULE 8: REPORTS (ReportsPage.jsx — 100 lines + child widgets)

### Structure Fixes
- **Add global date range picker**: single date range at the top that filters ALL report widgets simultaneously
- **Add period presets**: "Hoy", "Esta semana", "Este mes", "Último mes", "Personalizado" — chips at the top
- **Report card layout**: each widget in a Card with consistent header (title + description + export button)
- **Lazy loading**: widgets render on scroll (IntersectionObserver) — not all at once
- **Export per widget**: small download button on each card → PDF/CSV

### Interaction
- Widget stagger as they enter viewport (`fadeUp` + IntersectionObserver)
- Date range change: all widgets show skeleton briefly → re-render with stagger
- AnimatedNumber on all chart KPI values
- Chart animations (if using SVG): path draw for line charts, bar grow for bar charts

### Celebration
- **Revenue milestone revealed**: when monthly revenue exceeds previous month → "Ingresos arriba vs mes pasado" badge with trend arrow
- **Performance insight**: "Carlos fue tu barbero más productivo este mes" with AnimatedNumber on their revenue
- **Zero no-shows**: "0% no-shows este mes — tu tasa más baja" green celebration

---

## Universal Patterns (Apply to ALL 8 Modules)

### Table Animations
```jsx
<motion.tbody variants={STAGGER(0.03)} initial="initial" animate="animate">
  <motion.tr key={id} variants={listItem} layout>
    {cells}
  </motion.tr>
</motion.tbody>
```

### Dialog Animations
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.98 }}
  transition={SPRING.soft}
>
```

### Skeleton Loading
Replace ALL spinners with content-shaped skeletons matching table/card layout.

### Empty States
Every module: icon + title + description + CTA button. Never "No hay datos" plain text.

### Tab Transitions
```jsx
<AnimatePresence mode="wait">
  <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
```

### AnimatedNumber
On ALL summary card numbers, pagination totals, KPI values.

### Hover States
Table rows: bg highlight + action buttons reveal on hover.

### Filter Persistence
localStorage per module: last-used filters, date ranges, view preferences.

---

## Implementation Order (All 8 Modules)

```
FOR EACH MODULE (sequentially):
  1. Add summary dashboard (KPI cards + AnimatedNumber)
  2. Table/card stagger animations
  3. Dialog entrance/exit animation
  4. Skeleton loading (replace spinners)
  5. Empty states with icon + CTA
  6. Tab/content transitions
  7. Module-specific structural fixes (see per-module section)
  8. Module-specific celebrations
  9. Build + verify

ORDER OF MODULES (by daily usage frequency):
  1. Cash Register (used multiple times daily)
  2. Services (configured weekly, browsed daily)
  3. Professionals (configured weekly, browsed daily)
  4. Reviews (checked daily if active)
  5. Commissions (checked weekly/monthly)
  6. WhatsApp (real-time, used continuously)
  7. Bank Accounts (checked weekly)
  8. Reports (checked weekly/monthly)
```

---

## Verification Criteria (ALL Modules)

| Criterion | Metric |
|-----------|--------|
| Know module status on entry | Summary KPI cards visible without scrolling |
| Find what I need | < 3 seconds (search, filter, or scan) |
| Complete primary action | < 3 clicks for most common workflow |
| Action confirmed visually | Every CRUD has animation feedback |
| Module feels alive | Zero static loads (skeleton → stagger on every mount) |
| Celebrations exist | At least 2 milestone celebrations per module |
| Filters remembered | Return to module → same filters as last visit |
| Build passing | Zero errors after each module |

---

## Deliverables

For EACH of the 8 modules:
1. Summary dashboard component (NEW or refactored)
2. Table/card stagger animations added
3. Dialog animations added
4. Skeleton loading replacing spinners
5. Empty states with icons and CTAs
6. Module-specific structural fixes
7. Module-specific celebrations
8. Build passing, all features working

**Total: 64 deliverable items across 8 modules.**

Every module in SmartKubik must feel like it was designed by the same team that designed the mobile experience — alive, responsive, and rewarding. The modules that users "have to use" must become modules users WANT to use. Animation is the visible layer. Structure is the invisible layer that makes everything faster. Celebration is the emotional layer that builds habits. All three, applied consistently across all 8 modules, produce the 80% improvement.
