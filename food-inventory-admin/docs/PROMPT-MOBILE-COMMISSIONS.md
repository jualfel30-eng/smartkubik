# Prompt: Mobile-First Commissions Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile workforce management and compensation interfaces at Gusto, Rippling, and ADP. You specialize in making money-sensitive interfaces feel transparent and trustworthy — every employee must understand exactly how their pay is calculated, every manager must approve commissions in one tap, and every dispute must be resolvable from a phone screen. You have shipped payroll UIs processing $100B+ annually and you know that in a barbershop, commission transparency is the difference between retaining your best barber and losing them to the shop across the street.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile)
- Nothing. `/commissions` renders the desktop `CommissionsPage.jsx` → `CommissionManagementDashboard.jsx` with wide tables and multi-column layouts unusable on mobile. No RouteGate exists.

### What exists (desktop)
- `CommissionsPage.jsx` at `src/pages/CommissionsPage.jsx` — wrapper with module access check
- `CommissionManagementDashboard.jsx` at `src/components/commission/CommissionManagementDashboard.jsx` — full dashboard with:
  - Commission plans CRUD (percentage or fixed, tiered support)
  - Commission records table (pending/approved/rejected, bulk approve)
  - Goals management (monthly/quarterly targets per employee)
  - Bonuses management (performance/attendance/satisfaction bonuses)
  - Summary reports by employee and period

### Backend API
```
Commission Plans:
  GET    /commissions/plans                          — list plans
  POST   /commissions/plans                          — create plan
  PATCH  /commissions/plans/:id                      — update plan
  DELETE /commissions/plans/:id                      — delete plan

Commission Records:
  GET    /commissions/records?employeeId=&status=&startDate=&endDate=&page=&limit=
  GET    /commissions/records/pending                — pending records count
  PATCH  /commissions/records/:id/approve            — approve single
  PATCH  /commissions/records/:id/reject             — reject single (body: { reason })
  POST   /commissions/records/bulk-approve           — approve multiple (body: { ids: [] })
  GET    /commissions/employees/:id/summary?startDate=&endDate= — employee summary

Reports:
  GET    /commissions/reports/summary?startDate=&endDate=&groupBy=employee

Goals:
  GET    /goals?employeeId=&status=&type=&period=&page=&limit=
  POST   /goals                                      — create goal
  PATCH  /goals/:id                                  — update goal
  DELETE /goals/:id                                  — delete goal
  GET    /goals/dashboard                            — goals overview

Bonuses:
  GET    /bonuses?employeeId=&status=&page=&limit=
  POST   /bonuses                                    — create bonus
  PATCH  /bonuses/:id/approve                        — approve bonus
  PATCH  /bonuses/:id/reject                         — reject bonus
  GET    /bonuses/pending                            — pending count
```

### Data Structures
```
CommissionPlan:
  _id, name, description
  type: 'percentage' | 'fixed_amount'
  defaultPercentage: number (e.g., 30)
  fixedAmount: number
  minOrderAmount: number (minimum to trigger)
  maxCommissionAmount: number (cap)
  tiers: [{ minAmount, maxAmount, percentage }]
  isActive: boolean

CommissionRecord:
  _id, employeeId, employeeName
  planId, planName
  orderId, orderRef
  baseAmount: number (service price)
  commissionCalculated: number (what the plan says)
  totalCommission: number (final amount)
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string
  createdAt, approvedAt

Goal:
  _id, employeeId, employeeName
  name: string (e.g., "Meta mensual ventas")
  type: 'sales_amount' | 'transaction_count' | 'average_ticket'
  targetAmount: number
  currentAmount: number (auto-calculated)
  periodType: 'monthly' | 'quarterly'
  startDate, endDate
  status: 'active' | 'achieved' | 'failed' | 'cancelled'
  bonusAmount: number (reward if achieved)
  autoAwardBonus: boolean

Bonus:
  _id, employeeId, employeeName
  amount: number
  type: 'performance' | 'attendance' | 'customer_satisfaction' | 'goal_achieved'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt, approvedAt
```

### Design system tokens (already in use)
- Motion: `SPRING.drawer`, `SPRING.snappy`, `SPRING.soft`, `SPRING.bouncy`
- Variants: `listItem`, `scaleIn`, `STAGGER`, `fadeUp`
- Haptics, bottom sheets, touch targets — same as all mobile components
- Existing: `AnimatedNumber` for animated values

---

## Requirements

### Architecture
1. New `MobileCommissionsPage.jsx` at `src/components/mobile/commissions/MobileCommissionsPage.jsx`
2. New `CommissionsRouteGate.jsx` — mobile/desktop gate
3. Route registration in `App.jsx`
4. Tab-based layout: "Resumen" (overview) + "Comisiones" (records) + "Metas" (goals + bonuses)

### Tab 1: Resumen (Overview Dashboard)

The owner's at-a-glance view of commission spending:

```
+------------------------------------------+
|  Comisiones                         [↻]  |
|  [Resumen] [Comisiones] [Metas]          |
+------------------------------------------+
|                                          |
|  [Este mes ▼]  ← period selector        |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Total comisiones    $2,450.00  │    |  ← Hero metric
|  │  +12% vs mes anterior           │    |
|  │  32 aprobadas · 5 pendientes    │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ── Por profesional ──                   |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Carlos "El Pulpo"              │    |
|  │  $890.00  ████████████          │    |
|  │  12 servicios · 30%             │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Miguel Angel Torres            │    |
|  │  $720.00  █████████             │    |
|  │  10 servicios · 30%             │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Jose Luis Mendoza              │    |
|  │  $540.00  ██████                │    |
|  │  8 servicios · 25%              │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ── Pendientes por aprobar (5) ──        |
|  [Ver todas →]                           |
|                                          |
+------------------------------------------+
```

**Period selector**: pill chips "Este mes" / "Mes anterior" / "Ultimos 3 meses" / "Personalizado"

**Hero card**: Total commissions paid/pending, comparison with previous period, count of approved + pending

**Per-professional breakdown**: Card per professional with horizontal bar (proportional to total), amount, service count, commission rate. Tap → bottom sheet with that professional's detailed records.

**Pending alert**: Count of pending commissions with CTA to jump to Comisiones tab filtered by pending.

### Tab 2: Comisiones (Records)

Commission record list with approval workflow:

```
+------------------------------------------+
|  [Resumen] [Comisiones (5)] [Metas]      |
+------------------------------------------+
|  [Pendientes] [Aprobadas] [Rechazadas]   |
+------------------------------------------+
|                                          |
|  ── 17 de abril ──                       |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  🟡 Pendiente                   │    |
|  │  Carlos · Corte + Barba         │    |
|  │  Base: $15.00 → Comision: $4.50 │    |
|  │  Plan: 30% servicios            │    |
|  │  [✓ Aprobar]  [✗ Rechazar]      │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  🟡 Pendiente                   │    |
|  │  Miguel · Corte Clasico         │    |
|  │  Base: $8.00 → Comision: $2.40  │    |
|  │  Plan: 30% servicios            │    |
|  │  [✓ Aprobar]  [✗ Rechazar]      │    |
|  └──────────────────────────────────┘    |
|                                          |
+------------------------------------------+
|  [Aprobar todas (5)]                     |
+------------------------------------------+
```

**Record cards**: Status badge, professional name, service name, base amount → commission amount, plan name. For pending: approve/reject buttons inline.

**Bulk approve**: Sticky footer button "Aprobar todas (N)" when on Pendientes filter. Single tap approves all visible pending records. Confirmation bottom sheet: "Aprobar 5 comisiones por $18.30?"

**Reject flow**: Tap "Rechazar" → bottom sheet with reason chips (Error de calculo, Servicio no completado, Otro) + optional note → confirm.

**Status filters**: Pill chips. "Pendientes" shows badge count.

**Grouping**: Records grouped by date (sticky headers: "Hoy", "Ayer", "17 de abril").

### Tab 3: Metas y Bonos (Goals + Bonuses)

Combined view of goals and bonuses:

```
+------------------------------------------+
|  [Resumen] [Comisiones] [Metas]          |
+------------------------------------------+
|                                          |
|  ── Metas activas ──                     |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Carlos · Meta mensual          │    |
|  │  Ventas: $2,800 / $3,500        │    |
|  │  [████████████░░░░] 80%         │    |
|  │  Bono: $150 si cumple           │    |
|  │  Quedan 14 dias                  │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Miguel · Meta mensual          │    |
|  │  Citas: 45 / 60                 │    |
|  │  [████████████░░░░░░] 75%       │    |
|  │  Bono: $100 si cumple           │    |
|  │  Quedan 14 dias                  │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ── Bonos pendientes ──                  |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  🟡 Carlos · Desempeño         │    |
|  │  $50.00 · "Mejor barbero abril" │    |
|  │  [✓ Aprobar]  [✗ Rechazar]      │    |
|  └──────────────────────────────────┘    |
|                                          |
+------------------------------------------+
|  [+ Nueva meta]  [+ Nuevo bono]         |
+------------------------------------------+
```

**Goal cards**: Professional name, goal name, progress bar (animated fill), current/target values, bonus amount, days remaining. Color: green (>75%), amber (50-75%), red (<50%).

**Create Goal (bottom sheet)**:
- Professional selector (dropdown of active professionals)
- Goal type chips: "Monto ventas" / "Cantidad citas" / "Ticket promedio"
- Target amount input
- Period: "Mensual" / "Trimestral"
- Bonus amount input
- Auto-award toggle

**Bonus cards**: Status badge, professional name, amount, type badge, reason text. Approve/reject buttons for pending.

**Create Bonus (bottom sheet)**:
- Professional selector
- Amount input
- Type chips: "Desempeno" / "Asistencia" / "Satisfaccion cliente"
- Reason text input

### Commission Plans (accessible from ⋮ menu in header)

Bottom sheet with list of commission plan templates:
- Card per plan: name, type badge (% or fixed), rate/amount, active toggle
- Tap → edit sheet (same fields as create)
- "+ Nuevo plan" button

**Create/Edit Plan (bottom sheet)**:
- Name input
- Type: [Porcentaje] [Monto fijo] toggle
- Rate/amount input (contextual based on type)
- Min order amount input (optional)
- Max commission cap input (optional)
- Active toggle
- Save/delete buttons

### Mobile UX Patterns (MANDATORY)

- **Commission cards**: Left color stripe (green=approved, amber=pending, red=rejected). Amount prominently displayed. Action buttons inline for pending.
- **Progress bars**: `h-2 rounded-full bg-muted` with animated fill. Color changes by threshold. Percentage label right-aligned.
- **Bulk approve**: Sticky footer, prominent count. Confirmation sheet before execution.
- **Per-professional bars**: Horizontal, proportional to max value, professional color-coded, animated width on mount.
- **Period selector**: Pill chips, active = `bg-primary`, fires data reload on change.
- **Approval animation**: Card status changes instantly (optimistic), badge color morphs, `haptics.success()`, card reorders to approved section.
- **Rejection animation**: Card fades to muted, status changes to red, slides to rejected section.
- **Goal progress**: Bar animates from 0 to current percentage on mount with `SPRING.soft`.

### Micro-interactions
- Approve tap: Green checkmark briefly appears on card, status badge morphs from yellow to green, `haptics.success()`
- Reject tap: Sheet opens for reason, after confirm: red X briefly, badge morphs to red, `haptics.error()`
- Bulk approve: All cards flash green simultaneously, count animates down to 0, `haptics.success()`
- Goal progress: Bar fills with `SPRING.soft`, percentage counts up with `AnimatedNumber`
- New commission arrives: Card slides in from top with bounce, badge count increments with bounce animation
- Period change: All cards show skeleton briefly, then stagger in with new data
- Professional bar chart: Bars grow from left with `SPRING.soft`, 50ms stagger

### Technical Constraints
- All sheets: `MobileActionSheet` (portaled to `document.body`)
- Data: `fetchApi()`, toasts, analytics, haptics
- Build: `npx vite build` — JSX only
- Test: 375px and 430px viewports
- Professional data: Fetch from `/professionals` for selectors

### What NOT to Build
- Tiered commission editor (complex, desktop-only)
- Commission calculation engine (backend handles this)
- Payroll integration / export
- Tax calculations on commissions

---

## Deliverables

1. `MobileCommissionsPage.jsx` — 3-tab layout (Resumen + Comisiones + Metas)
2. `MobileCommissionSummary.jsx` — overview dashboard with per-professional breakdown
3. `MobileCommissionRecords.jsx` — record list with approve/reject/bulk-approve
4. `MobileCommissionCard.jsx` — individual record card with status + actions
5. `MobileGoalsPanel.jsx` — goals list with progress bars + create goal sheet
6. `MobileBonusPanel.jsx` — bonus list with approve/reject + create bonus sheet
7. `MobileCommissionPlans.jsx` — plan management bottom sheet
8. `CommissionsRouteGate.jsx` — mobile/desktop gate
9. `App.jsx` — route update

Every barber must see exactly what they've earned, every owner must approve commissions in one swipe, and every goal must show real-time progress. Transparency builds trust — this module IS the trust layer between owner and team.
