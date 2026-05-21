# Prompt: HR Module — UX/UI Redesign (Mobile-First)

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 20 years of experience building HR management interfaces at Gusto, Rippling, Deel, and HiBob. You specialize in transforming HR administration from a source of friction into a competitive advantage — where a business owner opens the module on Monday morning and in 3 seconds knows: who is working right now, what needs urgent approval, and when the next payroll closes. You understand that HR for an SMB is NOT an enterprise HRIS. It's a command center for the team. Every interaction should feel effortless: one tap to clock in, one tap to approve a vacation, one glance to run payroll.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode and Light mode via `App.css`. Mobile-first (375px → 1440px+). Motion tokens in `src/lib/motion.js`.

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

This is a redesign, NOT a rewrite. All business logic, API calls, validations, and data structures must continue working. The redesign improves three layers:

1. **STRUCTURE** — Information architecture, navigation hierarchy, visual grouping
2. **INTERACTION** — Framer Motion animations, inline actions, zero-friction workflows
3. **CELEBRATION** — Payroll paid, absence approved, shift completed

Rules:
- NEVER change any API call, data structure, or business logic
- NEVER remove existing functionality — if it exists today, it exists tomorrow
- Run `npm run build` after every modified component before moving to the next
- If something breaks, revert and make a smaller change

---

## Confirmed Code Bugs (Fix These First)

| File | Line | Bug |
|------|------|-----|
| `src/pages/TimeClock.jsx` | L83–95 | Clock-in/out uses `setTimeout(1000)` mock with comment "SIMULATION FOR UI DEMO". Does NOT call the real endpoint. Produces fake UI state in production. |
| `src/components/payroll/HRNavigation.jsx` | L38 | `md:grid-cols-6` but there are 7 `TabsTrigger` children — the 7th tab overflows or is cut off on medium screens. |
| `src/components/ShiftRosterView.jsx` | L157 | `className="w-full border-collapse min-w-[1000px]"` — the shift table is completely unusable on any screen under 1000px wide (every mobile device). |

---

## Proposal Evaluation

Before executing, 10 proposals were evaluated. Only ≥ 8/10 are included.

| # | Proposal | Score | Decision |
|---|----------|-------|----------|
| 1 | **HR Today Hub** `/payroll/today` — landing with live team status, urgency feed, payroll checklist | **9.5/10** | ✅ Anchor of the entire redesign |
| 2 | **Clock-In/Out First-Class** — persistent FAB in HR layout + fix the `setTimeout` mock | **9/10** | ✅ Highest-frequency action must be fastest |
| 3 | **Employee Quick-Add (3 steps)** — progressive stepper only in create mode, not edit | **9/10** | ✅ Replaces 6-tab simultaneous form |
| 4 | **Operations vs Configuration Separation** — HRNavigation from 7 flat tabs to 5 operational + ⚙️ | **9/10** | ✅ Hick's Law: fewer choices = faster decisions |
| 6 | **Absence Management — Feed with Heatmap** — AnimatePresence exit on approve/reject + availability heatmap | **9/10** | ✅ Visual team coverage context |
| 5 | **Payroll Smart Pipeline** — active run cards with explicit "Next action" instead of flat table | **8.5/10** | ✅ Recognition over Recall |
| 7 | **Payroll Urgency System** — proactive alerts + payroll checklist with Goal Gradient progress | **8.5/10** | ✅ Prevents the #1 payroll failure: forgetting to run on time |
| 10 | **Employee List Smart Filters** — chips [En turno] [Ausentes hoy] [Con pendientes] | **8.5/10** | ✅ Recognition over Recall for team state |
| 9 | **Commissions in Employee Profile** — new "Pendientes" tab in drawer | **8/10** | ✅ Contextual approval vs. isolated module |
| 8 | **Shift Roster Mobile-First** — day-view on mobile, fix `min-w-[1000px]` | **8/10** | ✅ Non-negotiable: currently zero mobile usability |

---

## Current State Analysis

**Navigation (7 flat tabs, no hierarchy):**
```
[Empleados] [Turnos] [Fichar] [Ausencias] [Nóminas] [Calendario] [Estructuras]
     ↑ Operations ↑                              ↑ Ops ↑   ↑─── Config ───↑
```
Problem: Estructuras and Calendario are system configuration, not daily operations. Mixed with operational items, they increase cognitive load and violate Gestalt grouping.

**Landing page:** HR module opens at `/payroll/runs` (historical payroll list). A manager who opens HR on Monday has zero context for what to do next.

**Clock-in/out:** The "Fichar" tab calls a fake `setTimeout` that simulates success without touching any endpoint. Employees think they've clocked in. They haven't.

**7 Problems Beyond the Bugs:**

| # | Problem | Principle Violated |
|---|---------|--------------------|
| 1 | No "Today" view — manager has no at-a-glance status of who is working | Recognition over Recall |
| 2 | Employee create: 6 simultaneous tabs ask for bank account and tax ID before contract is signed | Progressive Disclosure |
| 3 | `PayrollRunsDashboard.jsx` mixes payroll runs, special runs, liquidations, structures, calendar, localization, reports, webhooks, audit in 9 internal tabs | Cognitive Load Theory |
| 4 | `KpiCard` (L249–260): shows a single number with no trend, no comparison, no AnimatedNumber | Recognition over Recall |
| 5 | Absence creation uses Dialog — table disappears behind modal, context lost | Contextual Continuity |
| 6 | Payroll run pipeline: status badges require user to remember what "calculated" means and what to do next | Recognition over Recall |
| 7 | Commissions pending approval live in a separate `/commissions` module — managers miss approvals | Attention Economy |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40%)

#### 1.1 New HR Navigation Architecture

```
BEFORE (7 flat tabs, all equal weight):
[Empleados] [Turnos] [Fichar] [Ausencias] [Nóminas] [Calendario] [Estructuras]

AFTER (5 operational tabs + config icon):
[📊 Hoy]  |  [👥 Empleados]  [🗓 Turnos]  [🚫 Ausencias]  |  [💰 Nóminas]  |  [⚙️]
                     ←─── Equipo ───→                         ←─ Nómina ─→  Config popover
```

`HRNavigation.jsx` changes:
- Fix `md:grid-cols-6` → `grid-cols-5` (5 operational tabs)
- Remove "Fichar" tab from nav (functionality moves to persistent FAB)
- Remove "Calendario" and "Estructuras" from main nav (accessible via ⚙️ popover)
- Add "Hoy" tab as first item, navigates to `/payroll/today`
- ⚙️ is a `Popover` with links: Estructuras | Calendario de nómina | Localización | Auditoría
- Active tab indicator: left border on desktop, bottom border on mobile

#### 1.2 HR Today Hub (`/payroll/today`)

New landing page for the entire HR module. Server-composites 4 existing API calls in parallel:

```javascript
const [rosterRes, absencesRes, commissionsRes, runsRes] = await Promise.all([
  fetchApi(`/shifts/roster?start=${today}&end=${today}`),
  fetchApi('/payroll/absences/requests?status=pending&limit=10'),
  fetchApi('/commissions/records/pending'),
  fetchApi('/payroll/runs?status=draft,calculated,posted&limit=3'),
]);
```

**Desktop layout (≥1024px):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Buenos días, [nombre] · Lunes 20 de mayo                                │
│                                                    [⏱ Fichar entrada →] │
├──────────────┬─────────────┬──────────────┬────────────────────────────┤
│  👥 En turno │ 🚫 Ausencias│  💰 Nómina   │  📋 Comisiones             │
│   8 / 14    │  3 pend.    │  vence en    │   5 por aprobar            │
│  activos    │  [→ Ver]    │   11 días    │   [→ Revisar]              │
│             │             │   ██░░░░ 33% │                            │
├─────────────┴─────────────┴──────────────┴────────────────────────────┤
│ ← ACTIVOS AHORA                         CHECKLIST DE NÓMINA →         │
│                                                                        │
│  [◉ Ana M.  09:00 · 3h] [◉ Luis P.  08:45 · 3h] [◉ María L. +4...]  │
│                                                                        │
│  PENDIENTES URGENTES                    ✅ Estructuras asignadas       │
│  ⚠ 3 ausencias sin revisar → [ir]      ✅ Bonos aprobados             │
│  ⚠ Nómina mayo en 11 días  → [ir]      ⬜ Revisar tiempo → [Turnos]  │
│  ✓ 5 comisiones pendientes → [ir]      ⬜ Resolver ausencias → [Aus] │
│                                         ⬜ Calcular nómina → [Run]    │
└────────────────────────────────────────────────────────────────────────┘
```

**Mobile layout (375px):**
```
Buenos días, Ana                     [⏱ Fichar]

[● En turno 8] [⚠ Ausencias 3] [💰 11 días] [📋 5]  ← horizontal scroll chips

ACCIONES URGENTES
┌──────────────────────────────────────┐
│ ⚠ 3 ausencias pendientes            │
│   [Aprobar] [Ir a ausencias]        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 💰 Nómina mayo: 2 de 6 pasos       │
│ ████░░░░░░░░   [Continuar →]       │
└──────────────────────────────────────┘

ACTIVOS AHORA (horizontal scroll)
[Ana ◉] [Luis ◉] [María ◉] [+5]
```

Each KPI chip/card is tappable and navigates to the relevant section. `AnimatedNumber` on all numeric values (count-up on mount).

**Payroll Checklist (Goal Gradient Effect):**

```jsx
const CHECKLIST_STEPS = [
  { key: 'structuresAssigned', label: 'Estructuras salariales asignadas (14/14)', route: '/payroll/structures' },
  { key: 'absencesResolved', label: 'Ausencias del período resueltas', route: '/payroll/absences' },
  { key: 'clockDataReviewed', label: 'Registros de tiempo revisados', route: '/hr/shifts' },
  { key: 'bonusesApproved', label: 'Bonos y comisiones aprobados', route: null },
  { key: 'runCalculated', label: 'Nómina calculada', route: '/payroll/runs' },
  { key: 'runPaid', label: 'Nómina pagada y contabilizada', route: '/payroll/runs' },
];
// Progress bar color: < 3 steps → destructive, 3–4 → warning, 5–6 → success
// Completing step 6 → confetti burst + "Nómina de mayo completada 🎉" toast
```

#### 1.3 Persistent Clock-In FAB

A floating action button lives in the HR module layout (`HRLayout.jsx`) and appears on ALL HR screens.

- **Mobile:** `position: fixed`, `bottom: 24px`, `right: 24px`, `z-index: 50`
- **Desktop:** Prominent button in the HR page header area (top right)
- **State "out":** Green, LogIn icon, label "Fichar entrada"
- **State "in":** Amber/Red, LogOut icon, label "Fichar salida · [elapsed time]"
- **Elapsed time:** counts up every second via `setInterval`

**Fix `TimeClock.jsx` mock (critical bug):**
```jsx
// BEFORE (mock — REMOVE THIS):
// SIMULATION FOR UI DEMO
await new Promise(r => setTimeout(r, 1000));

// AFTER (real endpoint calls):
const handleClockAction = async (action) => {
  setLoading(true);
  try {
    const res = await fetchApi(`/shifts/${action}`, { method: 'POST' });
    if (res.success || res._id) {
      if (action === 'clock-in') {
        setStatus('in');
        setCurrentShift(res.data || res);
        toast.success(`Entrada registrada · ${format(new Date(), 'HH:mm', { locale: es })}`);
      } else {
        const duration = res.data?.durationInHours;
        setStatus('out');
        setCurrentShift(null);
        toast.success(`Turno completado${duration ? ` · ${duration.toFixed(1)}h trabajadas` : ''}`);
      }
    }
  } catch (error) {
    toast.error('Error al registrar marca de tiempo');
  } finally {
    setLoading(false);
  }
};
```

#### 1.4 Employee Quick-Add (3 Steps — Create Mode Only)

The `EmployeeDetailDrawer.jsx` in **edit mode** stays exactly as is (all tabs intact). In **create mode** (`isCreateMode === true`), replace the tab layout with a 3-step stepper:

```
Step 1 — "¿Quién es?"          Step 2 — "¿Cómo trabaja?"      Step 3 — Confirmación
─────────────────────────       ────────────────────────────    ─────────────────────
Nombre completo                 Tipo de contrato                Resumen:
Email                           Salario base + moneda           "Ana Martínez
Teléfono (opcional)             Frecuencia de pago              Cajera · $800/mes
Cargo/Posición                  Fecha de inicio                 Ingresa: 1 jun 2026"
Departamento
Fecha de ingreso                                                [✓] Completar datos bancarios
                                                                     y tributarios después
[Continuar →]                  [← Atrás]  [Continuar →]       [← Atrás]  [Crear empleado]
```

"Completar datos después" (checked by default): creates the employee with `status: 'draft'` and skips bankAccount + taxation validation. The employee profile is saved and can be completed from the edit drawer.

Stepper visual: `[① Datos básicos] ──── [② Compensación] ──── [③ Confirmar]` with completed steps showing checkmark.

#### 1.5 Payroll Operations vs Configuration Separation

Inside `PayrollRunsDashboard.jsx`, the current tab structure has 9 internal tabs. Reorganize to:

**Main tabs (daily operations):**
```
[Ciclos Regulares] [Especiales] [Liquidaciones] [Reportes]
```

**Via ⚙️ icon in the dashboard header:**
```
Popover → [Estructuras de nómina] [Calendario de pagos] [Localización fiscal] [Webhooks] [Auditoría]
```

The existing components for Estructuras, Localización, Webhooks, Auditoría are NOT deleted — they remain accessible via the ⚙️ popover, just removed from the primary tab navigation.

#### 1.6 Payroll Active Run Pipeline Cards

For runs with status `draft`, `calculating`, `calculated`, or `posted` — replace the flat table row with a pipeline card that shows the explicit next action:

```
┌────────────────────────────────────────────────────────┐
│  🔵 Nómina Mayo 2026 · Mensual                         │
│  14 empleados · $12,400 neto · $14,800 costo total     │
│                                                        │
│  Estado: Calculada ────────────────────── ● ───        │
│  Borrador → Calculando → Calculada → Pagada           │
│                                                        │
│  Próxima acción: Contabilizar y pagar                  │
│                                                        │
│  [Ver detalle]          [Contabilizar →]              │
└────────────────────────────────────────────────────────┘
```

```jsx
const NEXT_ACTION = {
  draft: { label: 'Calcular nómina', color: 'var(--status-warning)' },
  calculating: { label: 'Calculando...', color: 'var(--status-info)', disabled: true },
  calculated: { label: 'Contabilizar y pagar', color: 'var(--status-success)' },
  posted: { label: 'Registrar pago', color: 'var(--status-success)' },
};
// Runs with status 'paid' → stay in the existing table (history section)
// Urgency: if periodEnd - today < 3 days → left border in destructive color
```

#### 1.7 Employee List Smart Filter Chips

Above the employee table in `/payroll/employees`:

```
[Todos 14]  [● En turno 8]  [🚫 Ausentes hoy 2]  [⚠ Con pendientes 3]  [⏳ Onboarding 1]
```

- Computed by cross-referencing shifts roster + absences + pending commissions
- Client-side filtering using IDs (all data already loaded)
- One active at a time, animated switch with `layoutId`
- "En turno" chip shows real-time count (updates every 60s)

Each employee row gains a status dot:
```
[●] Ana Martínez    Cajera        En turno · 3h 20m
[○] Luis Pérez      Barista       Libre
[⚠] María López     Gerente       Ausente hoy (vacaciones)
```

---

### LAYER 2: INTERACTION (35%)

#### 2.1 HRTodayHub Animations

- KPI chips entrance: `STAGGER(0.05)` left to right
- "Activos ahora" avatars: `STAGGER(0.04)` with `scaleIn`
- Urgency cards: `fadeUp` with `STAGGER(0.08)`
- Checklist items: `STAGGER(0.03)` with checkmark icon animating on complete (`scale 0→1` with `SPRING.bouncy`)
- Progress bar: `width` animates from `0%` to current value over `700ms ease`

#### 2.2 Absence Management — AnimatePresence Exit

The approve/reject inline buttons already work (1-click, confirmed). Add exit animation when a request is approved or rejected:

```jsx
<AnimatePresence>
  {pendingRequests.map(request => (
    <motion.tr
      key={request._id}
      variants={listItem}
      initial="initial"
      animate="animate"
      exit={{ opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.2, ease: EASE.out } }}
    >
      {/* existing row content unchanged */}
    </motion.tr>
  ))}
</AnimatePresence>
```

Add undoable toast after approve/reject:
```jsx
// After handleStatusUpdate succeeds:
toast.success(`Ausencia ${status === 'approved' ? 'aprobada' : 'rechazada'} — ${request.employeeName}`, {
  action: { label: 'Deshacer', onClick: () => handleStatusUpdate(request._id, 'pending') },
  duration: 5000,
});
```

Replace `<Dialog>` for create-absence with `<Sheet side="right">`:
```jsx
// The table remains visible when the Sheet is open (context preserved)
<Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
  <SheetContent side="right" className="w-[400px] sm:max-w-[480px] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Nueva solicitud de ausencia</SheetTitle>
      <SheetDescription>Registra permisos, vacaciones o ausencias médicas.</SheetDescription>
    </SheetHeader>
    {/* SAME form — zero changes to form state, validation, or API call */}
  </SheetContent>
</Sheet>
```

#### 2.3 Shift Roster Mobile Responsive

Fix `min-w-[1000px]` on the table in `ShiftRosterView.jsx`:

```jsx
// Detect breakpoint
const isMobile = window.innerWidth < 768; // or use a useMediaQuery hook

// Mobile: Day-view (one day at a time, horizontal swipe navigation)
// Desktop: Week-view (existing grid, but with min-w removed)

// Mobile DayView:
// [← 19 mayo]  HOY — Miércoles 20 mayo  [21 mayo →]
// 
// ── MAÑANA ────────────────────────────────────────
// [◉] Ana Martínez     08:00 – 14:00
// [◉] Luis Pérez       09:00 – 15:00
//
// ── TARDE ─────────────────────────────────────────
// [○] María López      14:00 – 20:00
//
// ── Sin turno hoy ─────────────────────────────────
// [○] Carlos R.        [+ Asignar]
//
// [+ Asignar turno]  ← FAB

// Desktop WeekView fix:
// Remove: min-w-[1000px]  (L157 in ShiftRosterView.jsx)
// Replace with: style={{ minWidth: 0 }} and grid-based responsive layout
// table → CSS grid: grid-template-columns: 140px repeat(7, minmax(80px, 1fr))
```

Add "Copy Last Week" button (desktop):
```jsx
// Fetch last week's shifts and create drafts for current week
// GET /shifts/roster?start=LAST_WEEK_START&end=LAST_WEEK_END
// POST /shifts/schedule for each shift (adjusted dates +7 days)
```

#### 2.4 Payroll KPI Cards — AnimatedNumber + Trends

Replace `KpiCard` (L249–260 in PayrollRunsDashboard.jsx):

```jsx
// BEFORE:
const KpiCard = ({ label, value, currency }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle></CardHeader>
    <CardContent><div className="text-2xl font-bold">{formatCurrency(value)}</div></CardContent>
  </Card>
);

// AFTER — new component: src/components/payroll/HRKpiCard.jsx
// Props: label, value, previousValue, currency, icon, statusColor, onClick
// - AnimatedNumber (from src/components/mobile/primitives/AnimatedNumber.jsx) on value
// - Trend: if previousValue provided, show ↑ +12% or ↓ -3% vs período anterior
// - Icon: 20px, colored with statusColor
// - Clickable: navigate or filter on click
// - Left border: 3px, statusColor

import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
// DO NOT create a new AnimatedNumber — reuse the existing one
```

#### 2.5 Employee Quick-Add Stepper Animations

```jsx
// Step transition: AnimatePresence mode="wait"
// Entering step: fadeUp (y: 12 → 0, opacity 0 → 1)
// Exiting step: fade out (opacity 1 → 0, y: 0 → -8)
// Step indicator: completed steps get checkmark with SPRING.bouncy scale animation
// "Crear empleado" button: loading state with inline spinner (same pattern as other forms)
```

#### 2.6 General HR List Animations

All HR lists that currently render without animation must add:

```jsx
// Employee table rows: STAGGER(0.03) + listItem variant on mount
// Absence requests: STAGGER(0.04) + listItem
// Payroll run pipeline cards: STAGGER(0.05) + scaleIn
// New item (employee, absence) created: slide in at top with pulse highlight for 1.5s
```

---

### LAYER 3: CELEBRATION (25%)

#### 3.1 Payroll Run Paid

```jsx
// When a payroll run transitions to status 'paid':
import confetti from 'canvas-confetti';
confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
toast.success(`💰 Nómina pagada — ${formatCurrency(run.netPay, currency)} procesados`, { duration: 6000 });
// The run card exits the pipeline with scaleIn exit animation and moves to history table
```

#### 3.2 Clock-In Success

```jsx
toast.success(`Buenos días, ${user.name} · Entrada registrada ${format(new Date(), 'HH:mm')}`);
// FAB transitions from green to amber/red with SPRING.bouncy
// In Today Hub: employee appears in "Activos ahora" strip with slide-in from left
```

#### 3.3 Clock-Out Completion

```jsx
// Toast shows hours worked:
toast.success(`Turno completado · ${hours}h ${minutes}min trabajadas · Hasta mañana 👋`);
// FAB transitions back to green with SPRING.bouncy
```

#### 3.4 Absence Approved

```jsx
// Undoable toast (defined in 2.2)
// AnimatePresence exit on the table row (defined in 2.2)
// In Today Hub: pending absence counter decrements with AnimatedNumber
```

#### 3.5 First Employee Created

```jsx
// When employeesCount was 0 before creation:
confetti({ particleCount: 50, spread: 45 });
toast.success('¡Tu equipo empieza a crecer! Bienvenido, ' + employee.name);
```

#### 3.6 Payroll Checklist Completion

```jsx
// When all 6 checklist items are checked (step 6 completed):
confetti({ particleCount: 100, spread: 70, origin: { y: 0.4 } });
toast.success('Nómina de ' + period + ' completada 🎉', { duration: 8000 });
```

---

## Availability Heatmap (AbsenceHeatmap.jsx)

New widget, placed above the absence table in `/payroll/absences`.
Shows next 7 days × employees, cross-referencing approved absences + published shifts:

```
DISPONIBILIDAD — PRÓXIMOS 7 DÍAS
        Lun  Mar  Mié  Jue  Vie  Sáb  Dom
Ana M.  ████ ████ ████ ░░░░ ████ ─    ─
Luis P. ████ ████ ░░░░ ████ ████ ─    ─
María   ░░░░ ████ ████ ████ ████ ─    ─

████ = disponible  ░░░░ = ausente  ─ = no laboral
```

- Tooltip on hover: "Ana Martínez — Jue 23: Ausente (vacaciones aprobadas)"
- Data: cross-reference `/payroll/absences/requests?status=approved&dateRange=7d` + employee work schedules from contract
- Desktop only: collapsed behind "Ver disponibilidad del equipo ▼" on mobile

---

## Commissions "Pendientes" Tab in Employee Drawer

In `EmployeeDetailDrawer.jsx`, add a new tab that appears conditionally:

```jsx
// Fetch: GET /commissions/employees/:employeeId/summary (existing endpoint)
// Only show the tab if pending > 0:
<TabsTrigger value="pending" disabled={pendingCount === 0}>
  {pendingCount > 0 ? `Pendientes (${pendingCount})` : 'Pendientes'}
</TabsTrigger>

// Tab content: list of commission records with inline Approve/Reject buttons
// Bulk approve button at top: "Aprobar todas (X)"
// Calls PATCH /commissions/records/bulk-approve
```

---

## Deliverables

### New Files
| File | Purpose |
|------|---------|
| `src/components/payroll/HRTodayHub.jsx` | Today Hub — HR module landing page |
| `src/components/payroll/PayrollChecklist.jsx` | 6-step payroll checklist with Goal Gradient progress |
| `src/components/payroll/HRClockFAB.jsx` | Persistent FAB for clock-in/out (real endpoints) |
| `src/components/payroll/ActiveNowStrip.jsx` | "Who's working now" strip |
| `src/components/payroll/HRKpiCard.jsx` | KPI card with trend + AnimatedNumber |
| `src/components/payroll/AbsenceHeatmap.jsx` | 7-day availability heatmap |
| `src/pages/HRLayout.jsx` | HR module layout wrapper (includes FAB + HRNavigation) |

### Modified Files
| File | What Changes |
|------|-------------|
| `src/components/payroll/HRNavigation.jsx` | Fix `grid-cols-6`→5, remove Fichar/Calendario/Estructuras, add Hoy + ⚙️ popover |
| `src/App.jsx` | Add `/payroll/today` route, wrap HR routes in `HRLayout`, change default landing |
| `src/pages/TimeClock.jsx` | **Replace setTimeout mock** with real `POST /shifts/clock-in` and `clock-out` calls |
| `src/components/payroll/PayrollRunsDashboard.jsx` | `KpiCard` → `HRKpiCard`, pipeline cards for active runs, reorganize tabs (ops vs config) |
| `src/components/payroll/EmployeeDetailDrawer.jsx` | 3-step stepper in create mode, new "Pendientes" tab |
| `src/components/payroll/PayrollAbsencesManager.jsx` | `<Dialog>` → `<Sheet>` for create, `AnimatePresence` exit on approve/reject, heatmap widget above table, undoable toast |
| `src/components/ShiftRosterView.jsx` | Remove `min-w-[1000px]`, day-view for mobile, copy-last-week button |

### Not Touched
- `src/components/payroll/PayrollStructuresManager.jsx` (access reorganized, content unchanged)
- `src/components/payroll/PayrollCalendarTimeline.jsx` (access reorganized, content unchanged)
- `src/components/payroll/PayrollRunWizard.jsx`
- `src/lib/motion.js`

---

## Implementation Order

To minimize time with broken functionality:

1. Fix `HRNavigation.jsx` `grid-cols-6` bug (5 min, zero risk)
2. Fix `TimeClock.jsx` mock (15 min — replace setTimeout with real API calls)
3. Create `HRKpiCard.jsx` — atomic component, no new dependencies
4. Create `HRClockFAB.jsx` — atomic component using fixed TimeClock logic
5. Create `HRTodayHub.jsx` + add route in `App.jsx` — new screen, no regressions
6. Update `HRNavigation.jsx` — add Hoy tab + ⚙️ popover, remove config tabs
7. Update `PayrollRunsDashboard.jsx` — pipeline cards + tab reorganization
8. Update `PayrollAbsencesManager.jsx` — Sheet + AnimatePresence + heatmap
9. Update `ShiftRosterView.jsx` — responsive mobile-first
10. Update `EmployeeDetailDrawer.jsx` — stepper + Pendientes tab
11. Create `AbsenceHeatmap.jsx` + `ActiveNowStrip.jsx` + `PayrollChecklist.jsx`

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| See who's working now | 0 clicks from HR landing (was: 3+) |
| Clock in/out | ≤ 2 taps from any HR screen, calls real endpoint (was: mock) |
| Approve an absence | 1 click, AnimatePresence exit (was: 1 click + no exit animation) |
| Create new absence | Sheet stays open, table visible in background (was: Dialog covers table) |
| Add basic employee | 3 linear steps (was: 6 simultaneous tabs) |
| Run payroll | "Next action" always visible, no memory required (was: status badge only) |
| Mobile shift management | Usable at 375px (was: min-w-[1000px] — completely broken) |
| `npm run build` | Zero TypeScript errors |
| Payroll paid | Confetti + toast with amount |
| Hex colors in HR components | `grep -r '#[0-9A-Fa-f]\{6\}' src/components/payroll/HR*.jsx` → 0 results |
