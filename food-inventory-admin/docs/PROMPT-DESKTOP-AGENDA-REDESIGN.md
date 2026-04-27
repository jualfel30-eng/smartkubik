# Prompt: Desktop UX/UI Audit + 80% Redesign — Agenda / Appointments Module

## Your Role

Apply the `/ux-design` skill. You are a product designer with 25 years of experience at Calendly, Acuity Scheduling, Mindbody, and Apple Calendar — the last 10 years exclusively focused on retention through addictive scheduling experiences. You specialize in calendar interfaces where every appointment block has visual weight, every drag feels physical, every completed service triggers a dopamine reward, and the calendar itself becomes an intelligence layer that the business owner cannot replicate elsewhere.

You are grounded in the latest findings in **behavioral neuroscience** (Berridge's incentive salience theory — dopamine fires on ANTICIPATION, not reward), **variable ratio reinforcement** (Skinner — unpredictable rewards create strongest habits), **the Zeigarnik effect** (incomplete tasks create cognitive tension that drives return), **the IKEA effect** (Norton et al. — users value what they helped build 63% more), and **the intelligence trap** (Nir Eyal's "Hooked" model evolved — every session deposits irreplaceable stored value).

Your UX philosophy: a calendar is not a grid of time — it's a **living map of revenue**. Every empty slot is lost money. Every filled slot is a promise. Every completed appointment is a win. The calendar must make the business owner FEEL this — through color, density, animation, and celebration.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI + react-dnd. Dark mode (#0a0e1a). Desktop only (≥1024px). Motion tokens in `src/lib/motion.js`.

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

The module is 6,400+ lines across 3 files with appointment CRUD, custom calendar (4 views), react-dnd drag-to-reschedule, beauty-specific multi-service bookings, payment dialog, commission setup, conflict detection, recurring series, and 6 status states. ALL must continue working. Build and verify after every change.

---

## Current State

### Architecture
```
AppointmentsManagement.jsx (3,592 lines)
├── Tab: Lista — table view with date range filters + status filter
├── Tab: Calendario — custom calendar component
│   └── AppointmentsCalendar.jsx (1,383 lines)
│       ├── MonthView — grid with appointment dots
│       ├── WeekView — 7-col × 48-row time grid
│       ├── DayView — single day hourly slots
│       └── ResourceColumnsView — columns per professional
├── Sheet: Create/Edit appointment form
├── Dialog: Payment (beauty) — AppointmentsPaymentDialog.jsx (1,435 lines)
├── Dialog: Drag confirmation (reschedule)
└── Component: CommissionSetupPrompt (beauty, 370 lines — has Framer Motion)
```

### Dynamic Label Issue

**Current title:** "Calendario Hotelero" (hardcoded for hospitality) or generic "Calendario"

**Required per vertical:**

| verticalProfile.key | Calendar Tab Title | Page Title |
|--------|-------|---------|
| `barbershop-salon`, `beauty-salon`, `nail-salon` | Calendario de Citas | Agenda de Citas |
| `hospitality` | Calendario de Reservas | Agenda de Reservas |
| `clinic-spa` | Calendario de Consultas | Agenda de Consultas |
| `mechanic-shop` | Calendario de Citas de Servicio | Agenda de Servicios |
| Default | Calendario | Agenda |

**Implementation:** Add entries to `verticalLabels.js`:
```javascript
calendar: {
  tabTitle: 'Calendario de Citas',     // Tab label
  pageTitle: 'Agenda de Citas',        // Page header
  newButton: 'Nueva Cita',             // CTA button
  emptyTitle: 'Sin citas programadas', // Empty state
}
```

### 16 Problems (Ranked by Impact)

| # | Problem | Layer |
|---|---------|-------|
| 1 | **List and Calendar are disconnected** — two separate tabs with no visual continuity. Switching between them loses context (selected date, filters). User mentally rebuilds the view each time. | STRUCTURE |
| 2 | **No "today's pulse" on entry** — user opens Agenda and sees a raw list or empty calendar. No "you have 8 appointments today, 2 pending confirmation, $320 estimated revenue." Zero orientation. | STRUCTURE |
| 3 | **Calendar empty slots are invisible** — a day with 3 appointments out of 20 possible slots looks the same as a day with 18. Empty slots don't communicate "available capacity" vs "wasted time." | STRUCTURE |
| 4 | **Calendar title is hardcoded** — "Calendario Hotelero" shows for beauty vertical. Wrong label breaks trust and feels generic. | STRUCTURE |
| 5 | **Drag has no physics** — react-dnd drag is CSS opacity 0.35 + dashed blue border. No spring, no shadow elevation, no "lifting" feeling. Dropping snaps instantly. | INTERACTION |
| 6 | **No status transition animation** — changing pending→confirmed→completed: badge color changes instantly. No morph, no celebration. The most important state transitions are invisible. | INTERACTION |
| 7 | **Appointment blocks have no depth** — calendar chips are flat colored rectangles. No shadow, no border-radius variation by duration, no visual weight proportional to revenue. | INTERACTION |
| 8 | **List table has ZERO animation** — rows appear/disappear instantly. No stagger, no hover reveal, no delete exit, no data change flash. | INTERACTION |
| 9 | **No celebration on appointment completion** — marking a $50 appointment as "completed" gets the same flat toast as a $5 one. No revenue accumulation feedback. | CELEBRATION |
| 10 | **No daily revenue tracker** — user completes 8 appointments and has no running total. Revenue is invisible until they open Reportes. | CELEBRATION |
| 11 | **No "fill rate" visualization** — user has no idea if their day is 30% full or 90% full. No occupancy metric. No utilization awareness. | STRUCTURE |
| 12 | **Create appointment form is a monolith** — same Sheet for beauty (multi-service) and hospitality (single service). 600+ lines of conditional rendering. For beauty: overwhelming when all fields show at once. | STRUCTURE |
| 13 | **No conflict prevention UX** — conflicts detected post-submission with a warning. Should show real-time availability while the user selects time. | INTERACTION |
| 14 | **No professional color coding** — all appointments look the same regardless of professional. No visual grouping by team member. | INTERACTION |
| 15 | **No Zeigarnik effect** — pending appointments have no visual tension. They should feel "incomplete" in a way that drives the user to confirm or act on them. | CELEBRATION |
| 16 | **No intelligence trap** — calendar doesn't learn. Doesn't suggest "Tuesdays are usually slower — consider a promotion" or "Maria hasn't booked in 45 days." | INTERACTION |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40%)

#### 1.1 Unified View: List + Calendar Side-by-Side

Replace the disconnected tab approach with a unified layout:

```
┌──────────────────────────────────────────────────────────────────┐
│ Agenda de Citas                          [+ Nueva Cita] [⚙]    │
│ Hoy: 8 citas · $320 estimado · 65% ocupación                    │
├──────────────────────────────────┬───────────────────────────────┤
│ CALENDAR (65%)                   │ DETAIL PANEL (35%)            │
│                                  │                               │
│ ┌─[◀ Hoy ▶]──[Día][Sem][Mes]─┐ │ Jueves 25 de abril           │
│ │                              │ │ 8 citas · $320 estimado      │
│ │  8:00  █ Carlos – Corte     │ │                               │
│ │  8:30  █                    │ │ ┌─ 8:00 Carlos – Corte ────┐ │
│ │  9:00  ░░░ disponible ░░░  │ │ │ Maria Lopez · $10         │ │
│ │  9:30  ░░░ disponible ░░░  │ │ │ [✓Confirmar] [💰Cobrar]   │ │
│ │ 10:00  █ Miguel – Barba    │ │ └───────────────────────────┘ │
│ │ 10:30  █                    │ │                               │
│ │ 11:00  █ Jose – Tinte      │ │ ┌─ 10:00 Miguel – Barba ───┐ │
│ │ 11:30  █                    │ │ │ Juan Perez · $15          │ │
│ │ 12:00  █                    │ │ │ ● Confirmada              │ │
│ │ 12:30  ░░░ disponible ░░░  │ │ └───────────────────────────┘ │
│ │ ...                         │ │                               │
│ └──────────────────────────────┘ │ ...                           │
└──────────────────────────────────┴───────────────────────────────┘
```

**Key changes:**
- Calendar is the PRIMARY view (always visible, not a tab)
- Detail panel replaces the list — shows appointments for the selected day/time
- Click a day on month view → panel shows that day's appointments
- Click a slot on week/day view → panel shows that appointment's details
- The "List" tab is removed — the detail panel IS the list (contextual to selection)
- Available (empty) slots are visually distinct: `░░░ disponible ░░░` with dashed border + muted text
- Tab option preserved as a toggle: [📅 Calendario] [📋 Lista completa] for users who want full list

**Why unified:** Calendly, Google Calendar, Apple Calendar all show calendar + event detail side-by-side. The two-tab approach forces a mental model switch that interrupts flow.

#### 1.2 Day Summary Header (Today's Pulse)

At the top of the module, a live summary:

```
┌──────────────────────────────────────────────────────────────┐
│ Jueves 25 de abril                                           │
│ 8 citas · $320 estimado · 2 pendientes · 65% ocupación      │
│ █████████████████████░░░░░░░░                                │
└──────────────────────────────────────────────────────────────┘
```

- Appointment count with AnimatedNumber
- Estimated revenue (sum of service prices for today)
- Pending count (drives action — Zeigarnik effect)
- **Occupancy bar**: filled slots / total available slots as a progress bar
  - Green (>75%), amber (50-75%), red (<50%)
  - Animates on mount with `SPRING.soft`
- Updates in real-time when appointments are created/completed

#### 1.3 Dynamic Labels (Fix Hardcoded Titles)

Add to `verticalLabels.js` and consume in AppointmentsManagement:

```javascript
// In verticalLabels.js, add per profile:
'barbershop-salon': {
  calendar: {
    tabTitle: 'Calendario de Citas',
    pageTitle: 'Agenda de Citas',
    newButton: 'Nueva Cita',
    emptyTitle: 'Sin citas programadas',
    emptyDescription: 'Crea tu primera cita o comparte tu link de reservas',
  }
},
'hospitality': {
  calendar: {
    tabTitle: 'Calendario de Reservas',
    pageTitle: 'Agenda de Reservas',
    newButton: 'Nueva Reserva',
    emptyTitle: 'Sin reservas programadas',
  }
},
'clinic-spa': {
  calendar: {
    tabTitle: 'Calendario de Consultas',
    pageTitle: 'Agenda de Consultas',
    newButton: 'Nueva Consulta',
  }
},
```

Replace ALL hardcoded "Calendario Hotelero", "Calendario", "Nueva Cita" with `labels.calendar.tabTitle`, etc.

#### 1.4 Available Slot Visualization

Empty time slots on the calendar should show as bookable:

```
│ 9:00  ┌──────── disponible ────────┐  │
│ 9:30  │  ＋ Agendar                  │  │  ← dashed border, muted
│       └──────────────────────────────┘  │     click → opens create form
```

- Dashed border + muted bg + "disponible" text
- Click → opens create form with time pre-filled
- On hover: border becomes primary color, "＋ Agendar" appears
- This makes empty capacity VISIBLE — the owner SEES lost revenue potential

#### 1.5 Professional Color Coding

Each professional gets a unique accent color on their appointment blocks:

```
█ Carlos (blue)    – Corte + Barba $15
█ Miguel (green)   – Tinte $25
█ Jose (purple)    – Barba $8
```

- Colors from `professional.color` field (already exists in the schema)
- Left border on appointment blocks colored per professional
- Color legend visible in week/resource view header
- Month view dots colored per professional

#### 1.6 Create Form: Progressive Disclosure (Beauty)

Simplify the 600+ line create Sheet:

```
┌──────────────────────────────────┐
│ Nueva Cita                  [X] │
├──────────────────────────────────┤
│                                  │
│ ¿Para quién?                     │
│ [Buscar cliente...]              │
│                                  │
│ ¿Qué servicio?                   │
│ [Corte $10] [Barba $8] [+]     │  ← Chip multi-select
│                                  │
│ ¿Cuándo?                         │
│ [Hoy ▼] [9:00 ▼]  Disponible ✓ │  ← Real-time availability
│                                  │
│ ¿Con quién?                      │
│ [Carlos] [Miguel] [Sin pref.]   │  ← Professional chips
│                                  │
│ ▶ Notas (opcional)               │  ← Collapsible
│ ▶ Recurrencia                    │  ← Collapsible
│                                  │
│ Total: $10 · 30 min             │
├──────────────────────────────────┤
│ [Guardar cita]                   │
└──────────────────────────────────┘
```

- 4 essential questions (who, what, when, with whom) always visible
- Notes + recurrence in collapsible sections
- **Real-time availability indicator** next to time selector: "Disponible ✓" or "Conflicto ⚠" — shown BEFORE submission, not after
- Services as multi-select chips (beauty) or single select (other verticals)
- Total price + duration calculated live

---

### LAYER 2: INTERACTION (35%)

#### 2.1 Drag with Spring Physics

Replace react-dnd's flat opacity with spring-based drag:

```jsx
// Drag source visual:
const dragStyle = isDragging ? {
  opacity: 0.85,
  transform: 'scale(1.03)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  zIndex: 100,
  transition: 'box-shadow 150ms ease, transform 150ms ease',
} : {};

// Drop target visual:
const dropStyle = isOver ? {
  background: 'var(--primary)/10',
  borderColor: 'var(--primary)',
  transform: 'scaleY(1.02)',
  transition: 'all 120ms ease',
} : {};

// After drop (landing animation):
<motion.div
  initial={{ scale: 1.03, opacity: 0.85 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={SPRING.snappy}
>
```

- Dragged appointment "lifts" with elevation shadow + slight scale
- Drop zone expands slightly (scaleY 1.02) when hovered
- On drop: appointment "lands" with spring settle (bouncy → rest)
- Conflict zones: red border + shake animation if dropping on occupied slot

#### 2.2 Status Transition Animation

When status changes (e.g., pending → confirmed):

```jsx
<motion.div
  key={status}
  initial={{ scale: 0.9, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={SPRING.snappy}
>
  <Badge className={STATUS_CONFIG[status]}>
    {statusLabel}
  </Badge>
</motion.div>
```

- Badge morphs color with crossfade
- Completion (→ completed): brief green pulse on the entire appointment block
- Cancellation (→ cancelled): block fades to 40% opacity with strikethrough

#### 2.3 Calendar Block Animations

- **Mount:** appointment blocks stagger in with `STAGGER(0.02)` per day
- **Hover:** block elevates (shadow increases) + shows quick actions (edit, status, delete)
- **Resize:** if appointment duration changes, block height animates smoothly
- **Revenue weight:** blocks with higher revenue have slightly more visual weight (subtle gradient or thicker left border)

#### 2.4 List/Table Animations (Detail Panel)

- Row stagger on day change (`listItem`, `STAGGER(0.03)`)
- Row hover with bg highlight + action buttons reveal
- Status change: badge morphs inline
- Delete: row collapses with `exit: { height: 0, opacity: 0 }`
- Appointment added: new row slides in at correct chronological position

#### 2.5 Real-Time Availability Check

When creating/editing, show availability LIVE:

```
¿Cuándo? [Hoy ▼] [9:00 ▼]  
✓ Carlos disponible · ⚠ Miguel ocupado (Corte 9:00-9:30)
```

- As user selects time, check against existing appointments
- Show per-professional availability
- Green check for available, amber warning with conflict detail
- No need for API call — check against already-loaded calendar data

#### 2.6 Skeleton + Loading

- Calendar: ghost blocks (gray rectangles at random heights) in time slots
- Detail panel: skeleton rows matching appointment card height
- Cross-fade from skeleton → content with `AnimatePresence mode="wait"`

#### 2.7 Filter Persistence

- Selected date, view mode (day/week/month), resource filter → persist in localStorage
- User returns to Agenda → same view they left

---

### LAYER 3: CELEBRATION (25%)

#### 3.1 Appointment Completed → Revenue Reveal

When status transitions to "completed":

```
┌──────────────────────────────────┐
│  ✓ Servicio completado           │  ← Animated checkmark
│  Maria Lopez · Corte + Barba     │
│  $15.00                          │  ← AnimatedNumber count-up
│                                  │
│  Hoy: $185 en 6 servicios       │  ← Daily total increments
│  ████████████░░░░░░ 58% meta     │  ← Progress toward daily goal
│                                  │
│  [💰 Cobrar] [Cerrar]           │
└──────────────────────────────────┘
```

- Brief overlay on the detail panel (not full-screen — fast, 1.5s)
- Daily total AnimatedNumber from old → new
- Progress bar toward daily revenue goal
- "Cobrar" CTA if payment not yet recorded
- Auto-dismisses after 2s

#### 3.2 Pending Appointment Tension (Zeigarnik Effect)

Pending appointments should visually "demand" action:

- Pulsing amber dot on pending appointments (calendar view)
- Pending count badge in the summary header that updates live
- After 30 minutes without confirmation: block border changes from amber to soft red
- Tooltip on hover: "Pendiente de confirmación desde hace 2h"

This creates cognitive tension — the user WANTS to resolve pending items to clear the visual noise.

#### 3.3 Fill Rate Milestones

```
Summary bar:  ████████████████████░░░░░░░░ 65% ocupación

At 80%: "Dia casi lleno — 2 slots restantes" 🔥
At 100%: "DIA COMPLETO" badge with gold accent + brief confetti
```

- 100% fill rate is the ULTIMATE daily celebration
- Show which slots are still available to create urgency

#### 3.4 Daily Revenue Milestones

- $100 daily: subtle pulse on revenue number
- $500 daily: "Medio palo!" toast with AnimatedNumber
- $1,000 daily: confetti + "Nuevo record!" if applicable
- Revenue accumulates visually in the summary bar

#### 3.5 Intelligence Insights (Stored Value)

Below the calendar, show contextual insights:

```
💡 Los martes son tu día más lento (promedio 4 citas vs 8 los viernes)
💡 Maria Lopez no ha reservado en 45 días — ¿enviar recordatorio?
💡 Carlos tiene 3 citas pendientes de confirmación
```

- Data-driven from existing appointment history
- Actionable: click "enviar recordatorio" → WhatsApp opens
- Shows 1-2 insights per day (not overwhelming)
- Builds intelligence trap: the system KNOWS things about the business that no notebook can replicate

---

## Micro-interactions Table

| Element | Trigger | Animation | Spec |
|---------|---------|-----------|------|
| Summary bar | Mount | AnimatedNumber + occupancy bar fill | `STAGGER(0.04)`, `SPRING.soft` |
| Calendar block | Mount | Stagger per day | `STAGGER(0.02)`, `listItem` |
| Calendar block | Hover | Shadow elevation + quick actions | 150ms, shadow transition |
| Calendar block | Drag start | Scale 1.03 + shadow 8px | 150ms ease |
| Calendar block | Drop | Spring settle | `SPRING.snappy` |
| Drop zone | Drag over | ScaleY 1.02 + primary border | 120ms |
| Available slot | Hover | Border primary + "+ Agendar" | 100ms fade |
| Status badge | Change | Crossfade morph | `SPRING.snappy` |
| Pending badge | Timeout | Amber → red border | 300ms transition |
| Completion | Status → completed | Checkmark + revenue reveal | 1.5s sequence |
| Revenue number | Increment | AnimatedNumber tween | 600ms |
| Occupancy bar | Value change | Width animate | `SPRING.soft` |
| Fill rate 100% | Milestone | Confetti + gold badge | `SPRING.bouncy` |
| Detail panel | Day click | Slide-in from right | `SPRING.soft` |
| Panel list | Items | Stagger | `listItem`, `STAGGER(0.03)` |
| Insight | Mount | FadeUp | `DUR.base`, stagger 200ms |
| Create form | Open | Sheet slide | Existing Sheet animation |
| Availability | Time change | Check icon scale-in | `SPRING.bouncy` |
| Conflict | Detected | Amber flash + shake | 200ms shake, `haptics` if supported |
| Delete | Confirmed | Block fade + collapse | 200ms |

---

## Implementation Order

```
LAYER 1 — STRUCTURE:
  1. Fix dynamic labels (verticalLabels.js + all hardcoded titles)
  2. Add summary header (today's pulse: count, revenue, pending, occupancy)
  3. Unified layout (calendar + detail panel side-by-side)
  4. Available slot visualization (dashed + click-to-create)
  5. Professional color coding on blocks
  6. Create form progressive disclosure (collapsible optional fields)
  7. Real-time availability check in create form

LAYER 2 — INTERACTION:
  8. Drag spring physics (lift, drop zone, landing)
  9. Calendar block stagger on mount
  10. Calendar block hover (elevation + quick actions)
  11. Status transition animation (badge morph)
  12. Detail panel animations (stagger, hover, delete exit)
  13. Skeleton loading for calendar + panel
  14. Filter persistence (localStorage)

LAYER 3 — CELEBRATION:
  15. Completion ceremony (checkmark + revenue increment)
  16. Pending tension (pulsing dot, escalation after 30min)
  17. Occupancy milestones (80%, 100%)
  18. Daily revenue milestones ($100, $500, $1000)
  19. Intelligence insights (1-2 per day)
```

**After EACH numbered item:** `npx vite build` and verify in browser.

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| Know today's status | Instant from summary (count, revenue, occupancy) |
| See available capacity | Empty slots visible with dashed border |
| Identify who's doing what | Professional color coding on blocks |
| Feel the revenue build | AnimatedNumber increments after each completion |
| Resolve pending tension | Pending items visually demand action |
| Navigate without losing context | Calendar + panel, no tab switching |
| Create in context | Click empty slot → form pre-fills time |
| Calendar feels physical | Drag has spring physics, drop has bounce |
| Celebrate full days | 100% occupancy gets gold badge + confetti |
| System knows my business | Insights show patterns I didn't notice |

---

## Deliverables

1. `verticalLabels.js` — calendar label entries for all verticals
2. `AppointmentsManagement.jsx` — unified layout, summary header, dynamic labels
3. `AppointmentsCalendar.jsx` — spring drag, block stagger, professional colors, available slots, hover elevation
4. `AppointmentsSummaryHeader.jsx` (NEW) — today's pulse with AnimatedNumber + occupancy bar
5. `AppointmentDetailPanel.jsx` (NEW or refactored from list) — contextual detail panel
6. `AvailabilityIndicator.jsx` (NEW) — real-time availability in create form
7. `CompletionCeremony.jsx` (NEW) — brief revenue reveal on service completion
8. `InsightsBar.jsx` (NEW) — contextual intelligence insights
9. All existing CRUD, payment, drag-to-reschedule, recurring series — verified working
10. Build passing with zero errors

The calendar is where the salon owner spends 80% of their time in SmartKubik. Every second of friction loses trust. Every smooth drag builds confidence. Every completion ceremony builds habit. Every insight builds irreplaceability. This is the module that determines whether SmartKubik is "that app I tried" or "the thing I can't run my business without."
