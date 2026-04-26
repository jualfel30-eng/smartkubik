# Prompt: Desktop UX/UI Redesign — POS / Orders Module

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building point-of-sale interfaces at Square, Toast, Lightspeed, and Clover. You specialize in POS systems where speed is everything — a cashier must find a product, add to cart, and complete checkout in under 15 seconds. You understand that a POS is NOT a form — it's a rhythm. Product → cart → pay → next. Every animation must ACCELERATE that rhythm, never slow it down. Every celebration on sale completion must be brief but viscerally satisfying — the register bell, the receipt print, the "next customer" reset.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Desktop only (≥1024px). Motion tokens in `src/lib/motion.js`.

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

The POS processes real money. Every product search, cart calculation, payment method, and order submission must continue working exactly as today. Add animation and delight AROUND the existing flow, don't change the flow itself.

---

## Current State

**Files:**
- `src/components/orders/v2/OrdersPOS.jsx` (105 lines — wrapper)
- `src/components/orders/v2/NewOrderFormV2.jsx` (3,474 lines — the actual POS)
- `src/components/orders/v2/OrdersHistoryV2.jsx` (636 lines — order history)

**What exists:**
- Product search with grid/list/search view modes
- Cart sidebar with quantities, modifiers, pricing breakdown
- Customer selection (Combobox)
- Mixed payment support
- Barcode scanner dialog
- Recipe customizer (restaurant)
- Order processing drawer (fulfillment/billing)
- Order history with export, search, pagination, status management
- ZERO Framer Motion

**12 Problems:**

| # | Problem | Layer |
|---|---------|-------|
| 1 | **No session context** — POS opens without showing "today's sales: $X in N orders." User has no sense of momentum. | STRUCTURE |
| 2 | **Product search is slow-feeling** — results appear without animation. Grid/list transitions are instant. No skeleton while loading. | INTERACTION |
| 3 | **Cart has no animation** — items appear/disappear instantly. No slide-in when added, no slide-out when removed. | INTERACTION |
| 4 | **Payment completion is flat** — order submits → toast → form resets. No celebration. The most important moment is invisible. | CELEBRATION |
| 5 | **No quick-reorder** — frequent customers buy the same thing. No "Maria's usual" shortcut. | STRUCTURE |
| 6 | **Product view modes don't transition** — switching grid/list/search is instant. Jarring. | INTERACTION |
| 7 | **No daily sales counter** — user processes 20 orders and has no idea of cumulative revenue. | STRUCTURE |
| 8 | **Order history table is static** — no row stagger, no hover reveal, no search skeleton. | INTERACTION |
| 9 | **Barcode scanner feels disconnected** — scans a barcode, product appears in cart, but there's no visual connection between scan → cart addition. | INTERACTION |
| 10 | **No keyboard shortcuts visible** — power users want Enter to submit, Esc to clear. No hints. | INTERACTION |
| 11 | **No sale milestones** — 10th order, $500 day, $1000 day — all unmarked. | CELEBRATION |
| 12 | **Form reset after order is abrupt** — cart clears instantly. Should have a brief "order complete" state before resetting. | CELEBRATION |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40%)

#### 1.1 Session Summary Bar (top of POS)

```
┌──────────────────────────────────────────────────────────────┐
│ POS · Hoy: $847.50 en 23 órdenes │ Último: #0042 Maria $35  │
└──────────────────────────────────────────────────────────────┘
```

- Running total for today with AnimatedNumber (increments after each sale)
- Order count
- Last order reference for quick context
- Subtle bar, doesn't take space from product grid

#### 1.2 Smart Product Suggestions

Above the product grid, show a "Frecuentes" row:

```
Frecuentes: [Corte $10] [Corte+Barba $15] [Shampoo $8] [Tinte $25]
```

- Top 5 most-sold products as horizontal pills
- One-tap to add to cart
- Updates based on sales frequency (localStorage or API)

#### 1.3 Cart with Running Feedback

Cart sidebar shows:
- Item added → item slides in from left with `listItem` variant
- Item removed → slides out right with `exit: { opacity: 0, x: 20 }`
- Quantity change → number tweens with `AnimatedNumber`
- Total at bottom → `AnimatedNumber` that ALWAYS animates on change

### LAYER 2: INTERACTION (35%)

- Product grid: cards enter with `STAGGER(0.02)` on search/filter change
- Product grid → list transition: crossfade with `AnimatePresence mode="wait"`
- Cart items: `AnimatePresence` with slide-in/slide-out
- Dialogs (payment, barcode, recipe): `scaleIn` with `SPRING.soft`
- Order history table: row stagger + hover reveal + delete exit
- Search input: focus ring animation, debounce indicator (subtle spinner)
- Skeleton loading for product grid while searching
- Keyboard shortcut hints: small `kbd` badges next to actions (Enter, Esc, F2)

### LAYER 3: CELEBRATION (25%)

#### Sale Completion Ceremony (brief — 1.5 seconds max)

After successful order submission, BEFORE resetting the form:

```
┌──────────────────────────────────────┐
│                                      │
│  ✓ Orden #0043 completada            │  ← Checkmark draws 300ms
│  $35.00 · Maria Lopez               │
│                                      │
│  Hoy: $882.50 en 24 órdenes         │  ← Daily total counts up
│                                      │
└──────────────────────────────────────┘
      (auto-dismisses after 1.5s)
```

- Overlay on the POS area (not a separate page)
- Checkmark SVG path animation
- Daily total AnimatedNumber from old → new
- Auto-dismisses and resets form
- NO confetti (POS needs speed, not party)
- Session bar updates simultaneously

#### Daily Milestones (in session bar)

```
POS · Hoy: $1,000.00 🎯 en 28 órdenes     ← $1000 target icon appears
```

- $500: subtle pulse on total
- $1000: target icon appears
- 50 orders: "50 ordenes hoy" with brief glow

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| Product to cart | < 2 seconds (search → tap) |
| Checkout complete | < 5 seconds (method → confirm → reset) |
| Know daily progress | Session bar always visible with AnimatedNumber |
| Sale feels rewarding | 1.5s ceremony with checkmark + total update |
| Product grid alive | Stagger on load, crossfade on view switch |

---

## Deliverables

1. `OrdersPOS.jsx` — session summary bar + smart product suggestions
2. `NewOrderFormV2.jsx` — cart animations, product grid stagger, sale ceremony
3. `OrdersHistoryV2.jsx` — table row stagger, hover reveal, search skeleton
4. `SaleCompleteOverlay.jsx` (NEW) — brief celebration after each order
5. Framer Motion throughout, build passing, all features working
