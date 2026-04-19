# Prompt: Mobile-First Cash Register Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile POS and cash management interfaces at Square, Toast, and Clover. You specialize in cash flow interfaces where speed and accuracy are life-or-death — a cashier closing their register at 11pm after a 12-hour shift needs ZERO friction. You have shipped cash register UIs processed $50B+ in transactions and you know that a cash closing screen is not an accounting form — it is a guided ritual that prevents human error through smart defaults, auto-calculations, and unmistakable visual feedback.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile)
- Nothing dedicated. The Cash Register page at `/cash-register` renders the desktop `CashRegisterDashboard.jsx` with wide tables and multi-column layouts. The `TodayDashboard.jsx` has an alert card "Caja no abierta" that links to `/cash-register`, but it opens the desktop page.
- `CashRegisterIndicator.jsx` exists in the navbar showing whether a session is open (green dot) or closed (red dot).

### What exists (desktop)
- `CashRegisterDashboard.jsx` at `src/components/cash-register/CashRegisterDashboard.jsx` — full dashboard with:
  - Open session form (register name, opening amounts USD/VES, work shift, notes)
  - Active session view: real-time totals, cash movements log, method-of-payment breakdown
  - Close session form: closing amounts, variance calculation, notes
  - Closing history table with approve/reject workflow
  - Reports: change analysis, denomination counting
- `CashClosingDrawer.jsx` — quick drawer for open/close actions
- `CashRegisterContext.jsx` — global context tracking current session state

### Backend API
```
Sessions:
  GET    /cash-register/sessions/current          — current open session (or null)
  GET    /cash-register/sessions/open             — check if any session is open
  POST   /cash-register/sessions/open             — open new session
  POST   /cash-register/sessions/:id/close        — close session
  GET    /cash-register/sessions/:id/totals       — calculated totals for session
  POST   /cash-register/sessions/:id/movements    — add cash movement (in/out)

Closings:
  GET    /cash-register/closings?startDate=&endDate=&status=&page=&limit=20
  GET    /cash-register/closings/:id              — closing detail
  POST   /cash-register/closings/approve          — approve closing
  POST   /cash-register/closings/reject           — reject closing
  GET    /cash-register/closings/:id/export       — PDF/Excel export

Exchange:
  GET    /exchange-rate/bcv                       — current BCV exchange rate
```

### Data Structures
```
Session:
  _id, registerId, registerName
  openingAmountUsd, openingAmountVes
  workShift: 'morning' | 'afternoon' | 'night'
  openingNotes
  status: 'open' | 'closed'
  cashMovements: [{
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER',
    currency: 'USD' | 'VES',
    amount: number,
    reason: string,
    description: string,
    createdAt: Date
  }]
  calculatedTotals: {
    salesUsd, salesVes,
    totalOrders,
    cashUsd, cashVes,
    cardUsd, cardVes,
    transferUsd, transferVes,
    otherUsd, otherVes
  }
  openedAt, closedAt
  openedBy: userId

Closing:
  _id, sessionId, closingNumber
  closingAmountUsd, closingAmountVes
  expectedUsd, expectedVes
  differenceUsd, differenceVes
  exchangeRate
  notes
  status: 'pending' | 'approved' | 'rejected'
  closingType: 'individual' | 'global'
  methodBreakdown: { cash, card, transfer, pagoMovil, zelle, other }
  createdBy, approvedBy, rejectedBy
  createdAt, approvedAt, rejectedAt
```

### Design system tokens (already in use)
- Motion: `SPRING.drawer` (380,36), `SPRING.snappy` (500,40), `SPRING.soft` (260,30), `SPRING.bouncy` (420,22)
- Variants: `listItem`, `scaleIn`, `STAGGER(delay)`, `fadeUp`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`, `haptics.error()`
- Bottom sheet: `MobileActionSheet` with `footer` prop, portaled to `document.body`
- Existing: `NumPad` component in `MobilePOS.jsx` (3×4 grid numpad)
- Existing: `AnimatedNumber` for animated values

---

## Requirements

### Architecture
1. New `MobileCashRegisterPage.jsx` at `src/components/mobile/cash-register/MobileCashRegisterPage.jsx`
2. New `CashRegisterRouteGate.jsx` — mobile/desktop gate
3. Route registration in `App.jsx`
4. The page is state-driven: renders completely different UI based on whether a session is open or closed

### State Machine (3 screens)

```
NO SESSION OPEN → [Open Session Screen]
        ↓ (user opens session)
SESSION ACTIVE  → [Active Session Dashboard]
        ↓ (user closes session)
CLOSING REVIEW  → [Closing Summary + History]
        ↓ (auto-returns to NO SESSION after viewing)
```

### Screen 1: Open Session

When no session is open, show a single CTA-focused screen:

```
+------------------------------------------+
|  Caja                               [↻]  |
+------------------------------------------+
|                                          |
|         💰                               |
|    La caja está cerrada                  |
|                                          |
|  Turno                                   |
|  [Mañana] [Tarde] [Noche]               |
|                                          |
|  Nombre de caja                          |
|  [ Caja Principal            ]           |
|                                          |
|  Monto inicial (USD)                     |
|  [ $  0.00                   ]           |
|                                          |
|  Monto inicial (VES)                     |
|  [ Bs 0.00                   ]           |
|                                          |
|  Notas (opcional)                        |
|  [ _________________________ ]           |
|                                          |
+------------------------------------------+
|  [ ====== Abrir caja ====== ]            |
+------------------------------------------+
```

- Shift selector: 3 pill chips (morning/afternoon/night), default based on current hour
- Register name: text input with "Caja Principal" as default
- Opening amounts: number inputs (USD and VES), `inputMode="decimal"`
- Notes: optional textarea
- "Abrir caja" button: `bg-emerald-600 text-white`, full-width, `haptics.success()` on tap
- Success: animated checkmark overlay → transitions to Active Session

### Screen 2: Active Session Dashboard

Real-time overview of the current session:

```
+------------------------------------------+
|  Caja · Abierta desde 8:00am       [⋮]  |
+------------------------------------------+
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Ventas hoy        $1,245.00    │    |  ← Hero metric
|  │  32 transacciones               │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ── Desglose por método ──               |
|  Efectivo USD     $580.00    ████████    |
|  Transferencia    $320.00    █████       |
|  Pago Móvil       $200.00    ███        |
|  POS              $145.00    ██         |
|                                          |
|  ── Movimientos de caja ──               |
|  + Apertura         $100.00   8:00am    |
|  + Venta #001        $25.00   8:15am    |
|  - Retiro efectivo  -$50.00   12:00pm   |
|  + Venta #002        $18.00   12:30pm   |
|  ... (scrollable)                        |
|                                          |
+------------------------------------------+
|  [+ Movimiento]       [Cerrar caja]     |
+------------------------------------------+
```

- **Hero card**: Total sales with `AnimatedNumber`, transaction count, session duration
- **Method breakdown**: Horizontal bars per payment method, amounts right-aligned, sorted by amount descending. Animated bars on mount.
- **Movements log**: Chronological list of all cash movements. Green for IN, red for OUT. Scrollable. Grouped by hour blocks.
- **"+ Movimiento" button**: Opens bottom sheet to add cash movement (IN or OUT):
  - Type: [Entrada] [Salida] toggle
  - Amount: NumPad input
  - Currency: [USD] [VES] toggle
  - Reason: chips (Cambio, Retiro, Deposito, Propina, Otro)
  - Description: optional text
  - Confirm button
- **"Cerrar caja" button**: `bg-destructive text-white`. Opens closing flow.
- **[⋮] menu**: "Ver historial de cierres" option

### Screen 3: Close Session Flow

Bottom sheet wizard (2 steps):

**Step 1: Count Cash**
```
+------------------------------------------+
|  ====                                    |
|  Cerrar caja                        [X]  |
+------------------------------------------+
|                                          |
|  Cuenta el efectivo en caja              |
|                                          |
|  Efectivo USD en caja                    |
|  [ $  _______ ]     Esperado: $630.00   |
|                                          |
|  Efectivo VES en caja                    |
|  [ Bs _______ ]     Esperado: Bs 0.00   |
|                                          |
|  Tasa de cambio (BCV)                    |
|  [ 36.50 ]           [Actualizar]        |
|                                          |
|  Notas de cierre                         |
|  [ _________________________ ]           |
|                                          |
+------------------------------------------+
|  [ ====== Revisar cierre ====== ]        |
+------------------------------------------+
```

**Step 2: Review + Confirm**
```
+------------------------------------------+
|  ====                                    |
|  Resumen de cierre                  [X]  |
+------------------------------------------+
|                                          |
|  Efectivo USD                            |
|    Esperado    $630.00                   |
|    Contado     $625.00                   |
|    Diferencia  -$5.00  ⚠                |
|                                          |
|  Efectivo VES                            |
|    Esperado    Bs 0.00                   |
|    Contado     Bs 0.00                   |
|    Diferencia  Bs 0.00  ✓               |
|                                          |
|  ── Resumen del día ──                   |
|  Total ventas      $1,245.00            |
|  Transacciones     32                    |
|  Duración          10h 30m              |
|                                          |
+------------------------------------------+
|  [ ====== Confirmar cierre ====== ]      |
+------------------------------------------+
```

- **Variance indicator**: Green checkmark if difference = 0, amber warning if small difference (< $5), red alert if large difference (> $5)
- **Confirm**: `haptics.success()` + animated checkmark overlay + toast "Caja cerrada exitosamente"
- After confirm: show closing summary briefly, then transition back to Screen 1 (no session)

### Closing History (accessible from ⋮ menu)

Bottom sheet with scrollable list of past closings:
- Card per closing: date, closing number, total sales, variance, status badge (pending/approved/rejected)
- Tap → expand to see full breakdown
- Admin users see "Aprobar" / "Rechazar" buttons on pending closings

### Mobile UX Patterns (MANDATORY)

- **Number inputs**: Large, `text-2xl font-bold tabular-nums`, `inputMode="decimal"`. Show currency symbol inline. Clear on focus if value is 0.
- **Method breakdown bars**: Animated horizontal bars, `SPRING.soft`, color-coded per method (green=cash, blue=transfer, purple=pago movil, amber=POS)
- **Movement log items**: Compact rows with left color stripe (green/red), amount, time, reason. Stagger entrance.
- **Session timer**: Live "Abierta desde Xh Ym" updating every minute
- **Variance alerts**: Traffic light system — green (exact), amber (small diff), red (large diff). Pulse animation on red.
- **Closing animation**: Full-screen overlay with animated lock icon + "Caja cerrada" text, auto-dismisses after 2s

### Micro-interactions
- Session open: Lock icon → unlock animation (rotate + scale), green pulse, `haptics.success()`
- Movement added: New row slides in from right with `listItem` variant, total updates with `AnimatedNumber`
- Close session tap: Confirmation bottom sheet with "Esta seguro?" before proceeding
- Variance calculation: Live update as user types closing amount — difference number animates between values
- Method bar animation: Bars grow from left with `SPRING.soft`, 50ms stagger between bars
- History card expand: Chevron rotation 180°, content height auto animation

### Technical Constraints
- All sheets: `MobileActionSheet` (portaled to `document.body`)
- NumPad: Reuse from `MobilePOS.jsx` or build inline
- Exchange rate: Fetch from `/exchange-rate/bcv` on mount, show "Actualizar" button
- Data: `fetchApi()`, toasts, analytics, haptics — same as all mobile components
- Build: `npx vite build` — JSX only, no TypeScript
- Test: 375px and 430px viewports
- Cash register context: Read from `CashRegisterContext` if available, or fetch directly

### What NOT to Build
- Denomination counting (desktop power-user feature)
- Global closing consolidation (admin-only, desktop)
- Change analysis reports (desktop)
- Multi-register management (not needed for small barbershops)

---

## Deliverables

1. `MobileCashRegisterPage.jsx` — state-driven page (3 screens based on session state)
2. `MobileCashOpenSession.jsx` — open session form
3. `MobileCashActiveSession.jsx` — live session dashboard with method breakdown + movements log
4. `MobileCashCloseSession.jsx` — 2-step closing wizard (count → review → confirm)
5. `MobileCashMovement.jsx` — bottom sheet for adding cash in/out movements
6. `MobileCashHistory.jsx` — closing history list with expand/approve
7. `CashRegisterRouteGate.jsx` — mobile/desktop gate
8. `App.jsx` — route update

The barbershop owner must be able to open their register, track every dollar, and close at end of day — all from their phone, in under 60 seconds per operation.
