# Prompt: Desktop UX/UI Redesign — Dashboard Module

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building executive dashboards at Stripe Dashboard, Shopify Admin, Square Dashboard, and Datadog. You specialize in dashboards that tell a story in 3 seconds — where a business owner opens the app and INSTANTLY knows: am I having a good day? what needs attention? what should I do next? You understand that a dashboard is NOT a collection of charts — it's a mirror of the business's health, and it must apply the three-stage reward sequence on every daily milestone (first sale, revenue target hit, all alerts resolved).

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Desktop only (≥1024px). Motion tokens in `src/lib/motion.js`.

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

Redesign, not rewrite. All existing KPIs, charts, tables, and data flows must continue working. Add animation, hierarchy, celebration, and intelligence — don't remove features.

---

## Current State

**File:** `src/components/DashboardView.jsx` (507 lines)

**What exists:**
- 4 primary KPI cards (Sales, Orders, Customers, Products)
- 4 inventory value cards (conditional)
- Financial KPIs dashboard
- 11 chart types (behind feature flags)
- Recent orders table
- Inventory alerts card
- Onboarding checklist
- `AnimatedNumber` and `ScrollReveal` already used (partial adoption)
- Period selector (7d-90d)
- ZERO Framer Motion

**12 Problems:**

| # | Problem | Layer |
|---|---------|-------|
| 1 | **No "story of the day"** — KPIs show numbers but don't tell the user if they're having a good or bad day. No comparison to yesterday/last week. No trend arrows. | STRUCTURE |
| 2 | **No priority signal** — everything has equal visual weight. Low stock alerts are the same size as "Products in Stock" count. The user can't tell what needs attention. | STRUCTURE |
| 3 | **Charts are gated by feature flags** — most users see 4 KPI cards and a recent orders table. The dashboard feels empty for free/trial users. | STRUCTURE |
| 4 | **No quick actions** — the dashboard shows status but doesn't offer next steps. "You have 3 low-stock items" with no button to create a PO. | STRUCTURE |
| 5 | **KPI cards don't compare** — "$450 today" means nothing without context. Is that good? Bad? Up from yesterday? | INTERACTION |
| 6 | **No greeting or personalization** — "Dashboard" is a system label. Should say "Buenos dias, Juan" with today's date. | INTERACTION |
| 7 | **Recent orders table is static** — rows appear without animation. No stagger, no hover reveal. | INTERACTION |
| 8 | **No celebration on daily milestones** — first sale, $500 day, $1000 day, all alerts resolved — all invisible. | CELEBRATION |
| 9 | **Refresh is manual** — user must click refresh. No auto-update, no "last updated 2 min ago" indicator. | INTERACTION |
| 10 | **No daily revenue goal** — user has no target. "$450 today" doesn't motivate. "$450 / $800 goal (56%)" does. | CELEBRATION |
| 11 | **Inventory alerts are buried** — small card at the bottom. Should be prominent if there ARE alerts. | STRUCTURE |
| 12 | **No intelligence trap** — dashboard doesn't learn. Doesn't show "your best day was Tuesday" or "sales are 15% above your weekly average." | INTERACTION |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40%)

#### 1.1 Personalized Greeting + Date

```
Buenos días, Juan 👋
Miércoles 25 de abril · Barbería El Pulpo
```

- Greeting based on time of day (Buenos dias/tardes/noches)
- User first name from `useAuth()`
- Current date formatted in Spanish
- Tenant name as subtitle

#### 1.2 KPI Cards with Comparison + Trend

```
┌────────────┬────────────┬────────────┬────────────┐
│ Ventas hoy │ Órdenes    │ Clientes   │ Productos  │
│ $450.00    │ 12         │ 8 activos  │ 142        │
│ ↑ 15% ayer │ ↑ 3 más    │ +2 nuevos  │ 7 ⚠ bajo  │
│ ████░░ 56% │            │            │            │
└────────────┴────────────┴────────────┴────────────┘
```

- Each card shows: value + comparison to yesterday + trend arrow (green up / red down)
- Sales card includes mini progress bar toward daily goal
- Low stock count is RED and CLICKABLE (navigates to inventory alerts)
- Cards animate with `STAGGER(0.06)` + `scaleIn` on mount

#### 1.3 Priority Alerts Section (NEW)

If there are actionable items, show an alert section ABOVE charts:

```
┌──────────────────────────────────────────────────────┐
│ ⚠ Necesita tu atención                              │
│                                                      │
│ • 7 productos con stock bajo    [Ver alertas →]      │
│ • 2 pedidos pendientes por recibir [Recibir →]       │
│ • 3 citas sin confirmar         [Ver agenda →]       │
└──────────────────────────────────────────────────────┘
```

- Only shows when there ARE alerts (not an empty section)
- Each line is clickable → navigates to the relevant module
- Dismissible per session (X button, comes back next day)
- Amber border for warnings, red for critical

#### 1.4 Quick Actions Row

```
[+ Nueva orden] [📦 Ajustar stock] [📋 Nuevo pedido] [👤 Nuevo cliente]
```

- Top 4 most common actions based on vertical
- Buttons with icon + label, subtle outline style
- For beauty: [+ Nueva cita] [💰 Cobrar] [📦 Stock] [👤 Cliente]

### LAYER 2: INTERACTION (35%)

- Table row stagger (`listItem`, `STAGGER(0.03)`)
- KPI card AnimatedNumber with count-up (already partially exists)
- Chart skeleton loading (ChartSkeleton already exists — use consistently)
- Period selector with tab content transition (fadeUp on data change)
- Auto-refresh every 60 seconds with "last updated" indicator
- Hover on KPI cards: scale 1.02 with shadow elevation
- Recent orders row hover: bg highlight + action buttons reveal

### LAYER 3: CELEBRATION (25%)

- **First sale of the day**: confetti burst + "Primera venta del dia!" toast
- **Daily goal reached**: progress bar fills to 100% with SPRING.bouncy + celebration card
- **All alerts resolved**: KPI card flashes green + "Inventario al dia" badge
- **Revenue milestones**: $500, $1000, $2000 daily → special toast with AnimatedNumber count-up
- **Streak display**: "🔥 5 dias consecutivos sobre $300" in the greeting section

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| Know if day is good/bad | Instant from KPI comparison arrows |
| Know what needs attention | Priority alerts visible without scrolling |
| Start common action | 1 click from quick actions bar |
| Feel accomplishment | Daily milestones celebrated with animation |
| Dashboard feels alive | Every load has stagger, every number animates |

---

## Deliverables

1. `DashboardView.jsx` — restructured with greeting, comparison KPIs, priority alerts, quick actions
2. `DashboardKpiCard.jsx` (NEW or refactored) — card with AnimatedNumber + trend + comparison
3. `PriorityAlerts.jsx` (NEW) — actionable alert section
4. `DailyMilestones.jsx` (NEW) — celebration logic + confetti triggers
5. Framer Motion on all table rows, KPI cards, chart sections
6. Build passing, all features working
