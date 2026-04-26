# Prompt: Desktop UX/UI Redesign — Accounts Payable & Accounts Receivable

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building financial management interfaces at QuickBooks, Xero, FreshBooks, and RAMP. You specialize in AP/AR modules that transform accounting anxiety into financial confidence — where a business owner sees cash flow at a glance, knows exactly who owes them and who they owe, and can process a payment in 3 clicks. You understand that accounts payable/receivable is the module that business owners DREAD opening. Your job is to make them WANT to open it — because it shows them a clear picture, highlights what's urgent, and celebrates when cash flows.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Desktop only (≥1024px).

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

AP is 1,589 lines with payable CRUD, recurring templates, payment processing, multi-currency, and aging reports. AR is 88 lines (minimal). All must continue working. The redesign ADDS structure, animation, and intelligence without changing business logic.

---

## Current State

### Accounts Payable
**File:** `src/components/PayablesManagement.jsx` (1,589 lines)
**Tabs:** Monthly Payables | Recurring | History
**Features:** Create payable (dialog with supplier search, expense lines, multi-currency), record payments, create recurring templates, generate from template, aging breakdown by currency, BCV exchange rate integration
**ZERO Framer Motion. ZERO responsive breakpoints.**

### Accounts Receivable
**File:** `src/components/AccountsReceivableReport.jsx` (88 lines)
**Features:** Simple aging table (order#, customer, dates, amounts, balance, status). Back button to accounting. No actions, no filters, no summary, no payment recording.

**Combined Problems (14):**

| # | Problem | Module | Layer |
|---|---------|--------|-------|
| 1 | **No cash flow overview** — user opens AP and sees a table. No "you owe $X total" hero number. Same for AR. | BOTH | STRUCTURE |
| 2 | **No urgency signal** — overdue payables look the same as current ones. No visual escalation. | AP | STRUCTURE |
| 3 | **AR is read-only** — user can see who owes them but can't record a payment or send a reminder from this view. | AR | STRUCTURE |
| 4 | **AR has no filters** — single table dump, no date range, no customer filter, no status filter. | AR | STRUCTURE |
| 5 | **AP aging summary is static** — numbers don't animate, cards have no click-to-filter behavior. | AP | INTERACTION |
| 6 | **No payment ceremony** — recording a $5,000 payment gets a toast. Should get ceremony proportional to amount. | AP | CELEBRATION |
| 7 | **Recurring templates feel disconnected** — user creates a template, then manually generates. No auto-reminder. | AP | STRUCTURE |
| 8 | **Create payable dialog is overwhelming** — supplier fields + expense lines + accounting codes in one dialog. | AP | STRUCTURE |
| 9 | **Table rows have no animation** — all static, no stagger, no hover, no exit. | BOTH | INTERACTION |
| 10 | **Currency handling is invisible** — multi-currency payables (USD, VES, EUR) with BCV conversion, but the UX doesn't make the conversion visible or intuitive. | AP | INTERACTION |
| 11 | **No "upcoming" view** — user can't see "what's due this week" at a glance. | AP | STRUCTURE |
| 12 | **AR has no aging visualization** — raw table, no 30/60/90 day aging buckets with visual weight. | AR | STRUCTURE |
| 13 | **Empty states are dead ends** — both modules show nothing useful when empty. | BOTH | INTERACTION |
| 14 | **No payment milestone** — paying off all payables for the month, collecting all receivables — unmarked. | BOTH | CELEBRATION |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40%)

#### 1.1 AP: Cash Flow Dashboard (Top of Module)

```
┌──────────────────────────────────────────────────────────────┐
│ Cuentas por Pagar                                    [+ Nueva]│
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│ Total    │ Vencido  │ Esta     │ Próximos │ Pagado          │
│ $8,450   │ $1,200   │ semana   │ 30 días  │ este mes        │
│ por pagar│ ⚠ 3 fact.│ $2,100   │ $5,150   │ $12,300         │
│          │ 🔴       │          │          │ ✓               │
└──────────┴──────────┴──────────┴──────────┴──────────────────┘
│  [Pendientes] [Recurrentes] [Historial]                      │
└──────────────────────────────────────────────────────────────┘
```

- Hero number: Total payable in primary currency
- Overdue count with RED badge (clickable → filters to overdue)
- This week: what's due in next 7 days
- Next 30 days: full picture
- Paid this month: positive reinforcement
- All cards animate with AnimatedNumber + scaleIn stagger

#### 1.2 AR: Full Redesign (from 88 lines to real module)

```
┌──────────────────────────────────────────────────────────────┐
│ Cuentas por Cobrar                                           │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│ Total    │ Vencido  │ 1-30 días│ 31-60    │ 60+ días        │
│ $4,200   │ $800     │ $2,400   │ $700     │ $300            │
│ por cobrar│ ⚠ 2 cli.│          │          │ 🔴              │
└──────────┴──────────┴──────────┴──────────┴──────────────────┘
```

**Add to AR:**
- Aging bucket cards (current, 1-30, 31-60, 60+) — clickable to filter
- Search by customer name
- Filter by status (Pending, Partial, Overdue)
- Date range filter
- **"Enviar recordatorio" action** per row → opens WhatsApp with pre-filled reminder message
- **"Registrar pago" action** per row → dialog to record partial/full payment
- Customer name clickable → opens CRM detail panel
- Export to CSV/PDF

#### 1.3 AP: Overdue Visual Escalation

In the payables table, overdue rows should visually escalate:

```
│ Proveedor ABC │ $500 │ Vencida hace 15 días │ 🔴 │ [Pagar →] │  ← Red left border
│ Proveedor XYZ │ $200 │ Vence mañana         │ 🟡 │ [Pagar →] │  ← Amber left border  
│ Proveedor 123 │ $800 │ Vence en 20 días     │ 🟢 │           │  ← No special styling
```

- Left color border: red (overdue), amber (due within 7 days), green (current)
- "Vencida hace X dias" in red text
- "Pagar" button more prominent on overdue items

#### 1.4 AP: Create Payable with Progressive Disclosure

```
Step 1: ¿A quién le debes?
  [Buscar proveedor...] or [+ Nuevo proveedor]

Step 2: ¿Cuánto y cuándo?
  Monto: [$___] Moneda: [USD ▼] Vence: [fecha]

Step 3: Detalles (collapsible)
  ▶ Líneas de gasto (descripción, monto, cuenta contable)
  ▶ Notas
  ▶ Tipo de gasto

[Guardar]
```

- 80% of uses: supplier + amount + due date = 3 fields
- Expense lines, accounting codes, notes are in collapsible section

#### 1.5 AP: Upcoming Due Calendar View (Optional Enhancement)

Below the table, show a mini timeline of upcoming payments:

```
──●─────●──●───────●─────── →
  Hoy   Mar  Vie   15 mayo
  $500  $200 $800  $1,200
```

- Visual timeline of due dates in next 30 days
- Dots sized by amount
- Hover shows: supplier + amount + due date

### LAYER 2: INTERACTION (35%)

**Both AP and AR:**
- Table row stagger on load (`listItem`, `STAGGER(0.03)`)
- Table row hover with bg highlight + action buttons reveal
- Dialog scaleIn/scaleOut
- Tab content transitions (fadeUp)
- Skeleton loading for tables
- AnimatedNumber on ALL summary card values
- Empty states with icon + CTA

**AP-specific:**
- Payment dialog: amount input with live remaining-balance calculation
- Recurring template: "Generate" button with brief loading → success toast
- Currency selector: show VES equivalent inline when USD selected (BCV rate)
- Filter persistence (localStorage)

**AR-specific:**
- "Enviar recordatorio" → WhatsApp opens with pre-filled message including amount and due date
- "Registrar pago" → inline or dialog with amount + method + date
- Aging bucket cards are clickable filters (click "60+ dias" → table filters to those)

### LAYER 3: CELEBRATION (25%)

- **Payment recorded (AP)**: row slides to "Pagado" status with green flash. If amount > $1,000, brief ceremony: "Pago de $X registrado — $Y restante este mes"
- **All month's payables paid**: "Cuentas al dia — sin deudas pendientes" with green pulse on summary cards
- **Receivable collected (AR)**: row balance goes to $0 with AnimatedNumber tween. Toast: "Cobro registrado — $X recibido de [Cliente]"
- **All receivables collected**: "Todas las cuentas cobradas" with celebration
- **Overdue resolved**: overdue count in summary card animates down. If reaches 0: "Sin vencimientos — todo al dia"
- **Recurring template auto-generated**: "Factura mensual generada automáticamente — $X"

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| Know total owed/owing | Instant from summary cards |
| See what's overdue | Visual escalation (red border + badge) |
| Pay a bill | < 3 clicks (click Pagar → amount → confirm) |
| Record a receivable payment | < 3 clicks (click Registrar → amount → confirm) |
| Send collection reminder | 1 click (WhatsApp opens with pre-filled message) |
| Feel progress | Payment celebrations proportional to amount |
| Module feels alive | Every load has stagger, every payment has feedback |

---

## Deliverables

### Accounts Payable:
1. `PayablesManagement.jsx` — summary dashboard, overdue escalation, progressive disclosure dialog
2. `PayablesSummaryCards.jsx` (refactored) — AnimatedNumber + clickable filter + aging colors
3. `PayableDueTimeline.jsx` (NEW) — visual timeline of upcoming dues
4. All table animations + dialog animations + payment celebrations

### Accounts Receivable:
5. `AccountsReceivableReport.jsx` — FULL REWRITE from 88 lines to complete module:
   - Summary cards with aging buckets
   - Search + filters (customer, status, date range)
   - Action buttons (send reminder, record payment)
   - WhatsApp reminder integration
   - Payment recording dialog
   - Table animations
   - Export functionality
6. `RecordPaymentDialog.jsx` (NEW) — quick payment recording
7. Build passing, all features working, both modules visually cohesive
