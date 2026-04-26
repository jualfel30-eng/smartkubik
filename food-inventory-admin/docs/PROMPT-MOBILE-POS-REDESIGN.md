# Prompt: Mobile-First POS Redesign — SmartKubik Beauty Vertical

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building mobile payment interfaces at Square, Toast, SumUp, and Nubank. You specialize in POS systems that make every sale feel like a win — not a transaction. You understand that the moment a barbershop owner taps "Cobrar" is the most emotionally charged moment in their day: it's the payoff for their craft. Robin Hood proved that a confetti animation was powerful enough to require federal regulation. Your job is to make every payment in SmartKubik feel like that — a gift, not a receipt. Every sale must build the three-stage reward sequence (anticipation → reveal → celebration), every total must animate with weight, and every successful payment must deposit stored value that compounds over time (daily streak, revenue milestones, professional rankings).

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a). Mobile-first PWA. Target: Venezuela and LATAM.

---

## Current State

### What exists
- `MobilePOS.jsx` at `src/components/mobile/pos/MobilePOS.jsx` — functional but transactional POS:
  - Opens as `MobileActionSheet` (portaled to `document.body`)
  - Pre-fills total from appointment, or shows NumPad for manual entry
  - Tip picker (0/10/15/20%), payment method chips, optional reference field
  - Mixed payment mode (multi-line with balance indicator)
  - Loyalty points redemption (beauty only): balance check, 50% max, toggle apply/remove
  - Product upsell: search products + add to bill
  - Service upsell: search beauty services + add to bill
  - Multi-currency: USD primary, VES equivalent shown via BCV exchange rate
  - Haptics: `tap()` on numpad, `select()` on tips/methods, `success()` on payment, `error()` on failure
  - AnimatedNumber for total display

### Problems with current POS
1. **No celebration on payment** — payment succeeds with a toast and the sheet closes. No ceremony. No "you just made $X" moment. The most important moment in the app is treated like closing a dialog.
2. **No daily revenue awareness** — the user pays and the sheet closes. They don't see "this is your 15th sale today" or "you've made $450 today." Every payment is isolated, not part of a story.
3. **No streaks or milestones** — the user gets nothing for consistency. No "5-day streak of $500+ days." No "new daily record!" No "Carlos just hit $1,000 this week."
4. **NumPad feels clinical** — functional but cold. No weight to the numbers. No satisfying "ka-chunk" feeling when entering amounts.
5. **Method selection is flat** — 6-8 chips in a grid with no hierarchy. The user's most-used method should be prominent.
6. **Mixed payments are confusing** — adding/removing lines, balancing totals — it works but feels like accounting, not commerce.
7. **Upsells are hidden** — product/service additions are in collapsible sections that most users never find.
8. **No intelligence trap** — the POS doesn't get smarter. It doesn't learn which method the user picks most. It doesn't suggest the last client's preferred payment. Every sale starts from zero.

### Backend API
```
Beauty payment:
  PATCH /beauty-bookings/:id/status
  Body: { paymentStatus: 'paid', paymentMethod, amountPaid, tipAmount,
          loyaltyPointsRedeemed?, loyaltyDiscount?, addons? }

Exchange rate:
  GET /exchange-rate/bcv → { rate: number }

Payment methods:
  GET /payment-methods → [{ id, name, enabled, type }]

Loyalty:
  GET /loyalty/balance/:tenantId/:phone → { currentBalance, tier }

Products:
  GET /products?search=&limit=20

Services:
  GET /beauty-services
```

### Design system tokens
All from `/ux-design` skill: SPRING.*, DUR.*, haptics.*, AnimatedNumber, confetti-burst, etc.

---

## Requirements

### Architecture
1. Rewrite `MobilePOS.jsx` — same file path, same props interface (`{ appointment, onClose, onPaid }`)
2. The POS remains a `MobileActionSheet` — but the CONTENT inside is completely redesigned
3. Add a `PaymentSuccess` celebration overlay (full-screen, portaled)
4. Add daily revenue tracking via API or local accumulation
5. Add "smart defaults" — remember last used payment method per client

### The Redesigned POS Flow

**Phase 1: The Bill (What They're Paying For)**

```
+------------------------------------------+
|  ====                                    |
|  Cobrar · Maria Lopez               [X] |
+------------------------------------------+
|                                          |
|  Corte + Barba              $15.00      |
|  Carlos "El Pulpo"          45min       |
|                                          |
|  [+ Agregar producto] [+ Agregar serv.] |  ← Visible, not hidden
|                                          |
|  ── Propina ──                           |
|  [Sin] [10%] [15%] [20%]               |
|                                          |
|  ── Total ──                             |
|                                          |
|         $15.00                           |  ← AnimatedNumber, LARGE
|         ≈ Bs. 547.50                     |  ← VES equivalent
|                                          |
+------------------------------------------+
|  [ Efectivo USD ]  ← Most-used method   |  ← PRIMARY action
|  [Zelle] [Pago Movil] [Transf.] [+]     |  ← Secondary methods
+------------------------------------------+
```

**Key changes from current:**
- Service details shown clearly at top (client name, professional, duration)
- Upsell buttons VISIBLE (not in collapsible sections)
- Total is LARGE and animated (`text-4xl font-bold tabular-nums`)
- Payment methods in footer: most-used method is a big primary button, rest are smaller chips
- VES equivalent always shown if exchange rate loaded

**Phase 2: Method Selection → Anticipation**

When user taps a payment method:

```
+------------------------------------------+
|                                          |
|  Efectivo USD                            |
|                                          |
|         $15.00                           |  ← Total, even larger
|                                          |
|  Referencia (opcional)                   |
|  [ Numero de referencia       ]          |  ← Only for transfers
|                                          |
+------------------------------------------+
|  [ ====== Confirmar pago ====== ]        |
+------------------------------------------+
```

- For cash: skip reference, show "Confirmar pago" immediately
- For transfers/Zelle/PagoMovil: show optional reference field
- The total animates BIGGER as the user moves closer to paying (anticipation building)
- `haptics.select()` on method selection

**Phase 3: Payment Success → Reveal + Celebration**

After successful API call, instead of just closing the sheet:

```
+------------------------------------------+
|                                          |
|            ✓                             |  ← Animated checkmark
|       Pago recibido                      |
|                                          |
|        $15.00                            |  ← AnimatedNumber count-up
|    Efectivo USD · Maria Lopez            |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Hoy llevas $347.00              │    |  ← Daily revenue reveal
|  │  en 18 servicios ✂️              │    |
|  │  ████████████████░░░░ 69% meta   │    |  ← Progress toward daily goal
|  └──────────────────────────────────┘    |
|                                          |
|  🔥 5 dias consecutivos sobre $300      |  ← Streak (if applicable)
|                                          |
|  [📱 WhatsApp recibo]  [Cerrar]         |
|                                          |
+------------------------------------------+
```

**The Three-Stage Sequence:**

1. **Anticipation** (200ms): Screen dims briefly, total pulses
2. **Reveal** (500ms): Checkmark draws with `pathLength: 0→1`, total counts up from $0 to amount with `AnimatedNumber`, `haptics.success()`
3. **Celebration** (1000ms): Daily revenue card fades in with `fadeUp`, streak badge bounces in with `SPRING.bouncy`, optional confetti for milestones

**Daily Revenue Card:**
- Shows running total for today (accumulated from today's paid appointments)
- Service count
- Progress bar toward a daily goal (configurable, default $500)
- If new daily record: "Nuevo record! 🏆" with extra confetti

**Streak Counter:**
- Counts consecutive days where revenue exceeded a threshold (e.g., $300)
- Fire emoji scales based on streak length: 🔥 (1-3 days), 🔥🔥 (4-7), 🔥🔥🔥 (8+)
- Streak break: no negative messaging, just no streak shown

**Milestone Celebrations (special moments):**
- First sale of the day: "Primera venta del dia!"
- 10th sale of the day: "10 servicios hoy — vas volando!"
- Revenue hits $500: "Medio palo! $500 hoy"
- New daily record: full confetti burst + "Nuevo record!" badge
- Each milestone: `haptics.success()` + unique animation

### Smart Defaults (Intelligence Trap)

The POS should get smarter with each use:

1. **Most-used method**: Track which payment method the user selects most → show it as the PRIMARY button (big, prominent). Store in `localStorage` as `smartkubik_preferred_method`.
2. **Client payment preference**: If this client has paid before, show their last method first. "Maria siempre paga con Zelle" hint text.
3. **Tip pattern**: If the user consistently picks 15%, default to 15% instead of 0%.
4. **Quick-pay shortcut**: If the total is pre-filled AND the user has a preferred method, show a single "Cobrar $15.00 con Efectivo" mega-button that completes payment in ONE TAP.

### Loyalty Points (Improved)

Current: amber box with toggle. Redesigned:

```
+------------------------------------------+
|  🎁 Maria tiene 450 puntos              |
|  Descuento disponible: $4.50            |
|  [ Aplicar puntos ]                      |  ← Single tap
+------------------------------------------+
```

- Show only if balance > 0
- Single "Aplicar puntos" button (not toggle)
- Applied state: shows deduction inline in the total breakdown
- Points earned from THIS payment shown in the success screen: "+15 puntos ganados"

### Mixed Payments (Simplified)

Replace the confusing multi-line approach:

```
+------------------------------------------+
|  Dividir pago                            |
|                                          |
|  Efectivo USD        [ $10.00 ]          |
|  Pago Movil          [  $5.00 ]          |
|                                          |
|  Total: $15.00 ✓ Cuadra                 |
|                                          |
|  [+ Agregar metodo]                      |
+------------------------------------------+
|  [ Confirmar pago dividido ]             |
+------------------------------------------+
```

- Each method as a row with inline amount input
- Visual balance indicator: green check when amounts sum to total
- "Agregar metodo" adds a new row with method picker
- Simpler than current PaymentLine component

### Micro-interactions Table

| Trigger | Animation | Spec |
|---------|-----------|------|
| NumPad key press | Key scales 0.92→1, ripple | `haptics.tap()`, 80ms |
| Tip selection | Chip scales with bounce | `SPRING.bouncy`, `haptics.select()` |
| Method selection | Primary button morphs, others fade | `SPRING.snappy`, `haptics.select()` |
| Total changes | AnimatedNumber tween | 300ms, `EASE.out` |
| VES equivalent | Fade-in below total | `DUR.fast`, `opacity 0→1` |
| "Confirmar pago" tap | Button loading spinner | Spinner replaces text, `haptics.tap()` |
| Payment success | Checkmark SVG draw | `pathLength: 0→1`, 400ms, `haptics.success()` |
| Revenue count-up | AnimatedNumber from 0→amount | 600ms, `EASE.out` |
| Daily total reveal | Card fadeUp | `DUR.base`, `EASE.out` |
| Streak badge | Bounce-in | `SPRING.bouncy`, 300ms delay |
| Milestone | Confetti burst | 24 particles, 2s duration |
| Points earned | "+15" floats up and fades | `y: 0→-20`, `opacity: 1→0`, 800ms |
| Quick-pay tap | Direct to success | Skip method screen, 500ms ceremony |
| Upsell add | Item slides in from right | `listItem` variant, `haptics.select()` |
| Mixed payment balance | Check morphs green | `SPRING.snappy`, color transition |

### Technical Constraints

- Same `MobileActionSheet` portal pattern
- Same API endpoints — no backend changes
- Daily revenue: fetch from `/dashboard/summary` or accumulate locally from session payments
- Streaks: stored in `localStorage` (`smartkubik_revenue_streak`)
- Smart defaults: `localStorage` (`smartkubik_preferred_method`, `smartkubik_client_methods`)
- Build: `npx vite build` — JSX only
- Test: 375px and 430px viewports

### What NOT to Build

- Full receipt/invoice generation (desktop feature)
- Refund processing (separate flow)
- Cash drawer management (handled in Cash Register module)
- Offline payment queue (future feature)
- Split bill between multiple clients (future)

---

## Deliverables

1. `MobilePOS.jsx` — rewritten with smart defaults, prominent upsells, large animated total, intelligent method selection
2. `PaymentSuccessOverlay.jsx` — full-screen celebration with daily revenue, streaks, milestones
3. `MobilePaymentMethods.jsx` — smart method selector with primary/secondary hierarchy
4. `MobileMixedPayment.jsx` — simplified multi-method payment UI
5. `useDailyRevenue.js` — hook tracking daily totals and streaks
6. `useSmartPaymentDefaults.js` — hook for method preferences and client patterns

Every sale in SmartKubik must feel like ringing a bell. The barbershop owner just created value with their hands — the POS should honor that moment, not rush past it. Anticipation as they select the method. Ceremony as the payment processes. Celebration as they see their daily total climb. That's how you turn a payment screen into the most addictive screen in the app.
