# Prompt: Mobile-First Bank Accounts Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile banking and fintech interfaces at Nubank, Revolut, and Mercury. You specialize in making financial management feel safe, clear, and instant — every balance is scannable at a glance, every transaction is traceable with one tap, and every adjustment has an unmistakable confirmation flow. You have shipped banking UIs handling $200B+ in transactions and you know that a barbershop owner checking their accounts on their phone between clients needs to see: how much is in each account, what came in today, what went out, and whether anything looks wrong — in under 5 seconds.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile)
- Nothing. `/bank-accounts` renders the desktop `BankAccountsManagement.jsx` with wide tables, dialogs, and multi-column layouts unusable on mobile. There is no RouteGate, no mobile component.

### What exists (desktop)
- `BankAccountsManagement.jsx` at `src/components/BankAccountsManagement.jsx` — full management dashboard with:
  - Account list table: bank name, account number, type (corriente/ahorro), currency (USD/VES), current balance, status badge, accepted payment methods
  - Summary cards: total balance grouped by currency (USD total, VES total)
  - Create/edit account dialog: bank name, account number, type, currency, initial balance, holder name, branch, SWIFT code, notes, accepted payment methods (multi-select from standard list + custom)
  - Balance adjustment dialog: amount, type (increase/decrease), reason
  - Movements dialog: paginated transaction list per account (date, type, amount, description, reference, reconciliation status)
  - Reconciliation link: navigates to `/bank-accounts/:id/reconciliation`
  - Delete account with confirmation
- `BankReconciliationView` — separate page for bank reconciliation (matching transactions)

### Backend API
```
Accounts:
  GET    /bank-accounts?page=&limit=           — list accounts (paginated)
  POST   /bank-accounts                        — create account
  PUT    /bank-accounts/:id                    — update account
  DELETE /bank-accounts/:id                    — delete account
  GET    /bank-accounts/balance/by-currency    — total balances grouped by currency

Movements:
  GET    /bank-accounts/:id/movements?page=&limit=  — list movements for account

Adjustments:
  POST   /bank-accounts/:id/adjust-balance     — adjust balance (body: { amount, type, reason })

Reconciliation:
  GET    /bank-accounts/:id/reconciliation     — reconciliation data (desktop-only)
```

### Data Structures
```
BankAccount:
  _id: ObjectId
  bankName: string (e.g., "Banesco", "Mercantil", "Zelle")
  accountNumber: string
  accountType: 'corriente' | 'ahorro' (checking/savings)
  currency: 'USD' | 'VES'
  currentBalance: number
  initialBalance: number
  accountHolderName: string
  branchName: string (optional)
  swiftCode: string (optional)
  notes: string (optional)
  isActive: boolean
  acceptedPaymentMethods: string[] (e.g., ["Transferencia", "Pagomóvil", "Zelle"])

BankMovement:
  _id: ObjectId
  accountId: ObjectId
  date: Date
  type: 'credit' | 'debit' | 'adjustment'
  amount: number
  description: string
  reference: string (optional — invoice/order number)
  reconciliationStatus: 'pendiente' | 'conciliado' | 'descartado'
  createdAt: Date

BalanceByCurrency:
  { USD: number, VES: number }
```

### Standard Payment Methods
```
['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia',
 'Pagomóvil', 'Zelle', 'POS', 'Otro']
```

### Design system tokens (already in use)
- Motion: `SPRING.drawer` (380,36), `SPRING.snappy` (500,40), `SPRING.soft` (260,30), `SPRING.bouncy` (420,22)
- Variants: `listItem` (fadeUp), `scaleIn`, `STAGGER(delay)`, `fadeUp`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`, `haptics.error()`
- Bottom sheet: `MobileActionSheet` with `footer` prop, portaled to `document.body`
- Existing: `AnimatedNumber` for animated count-up values
- Existing: `NumPad` component in `MobilePOS.jsx`

---

## Requirements

### Architecture
1. New `MobileBankAccountsPage.jsx` at `src/components/mobile/bank-accounts/MobileBankAccountsPage.jsx`
2. New `BankAccountsRouteGate.jsx` — mobile/desktop gate
3. Route registration in `App.jsx`
4. Single scrollable page with hero balance cards + account list + action sheets

### Page Layout

```
+------------------------------------------+
|  Cuentas Bancarias              [+ Nueva] |
+------------------------------------------+
|                                          |
|  ┌────────────┐  ┌────────────┐          |
|  │ USD        │  │ VES        │          |  ← Currency summary
|  │ $4,250.00  │  │ Bs 12,500  │          |     cards (horizontal
|  │ 3 cuentas  │  │ 1 cuenta   │          |     scroll if needed)
|  └────────────┘  └────────────┘          |
|                                          |
|  ── Cuentas activas ──                   |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  🏦 Banesco                     │    |
|  │  Corriente · ****4521           │    |
|  │  $2,150.00 USD                  │    |
|  │  Transferencia · Pagomóvil      │    |  ← accepted methods
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  🏦 Mercantil                   │    |
|  │  Corriente · ****7832           │    |
|  │  $1,500.00 USD                  │    |
|  │  Transferencia · POS            │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  💵 Zelle                       │    |
|  │  ****email@gmail.com            │    |
|  │  $600.00 USD                    │    |
|  │  Zelle                          │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  🏦 Provincial                  │    |
|  │  Ahorro · ****1234              │    |
|  │  Bs 12,500.00 VES               │    |
|  │  Transferencia · Pagomóvil      │    |
|  └──────────────────────────────────┘    |
|                                          |
+------------------------------------------+
```

### Currency Summary Cards (Hero Section)

- One card per currency with non-zero total
- Big animated number (`AnimatedNumber` with currency format)
- Account count subtitle: "3 cuentas"
- Cards in horizontal scroll row if multiple currencies
- Color: USD card with `border-emerald-500/30 bg-emerald-500/5`, VES card with `border-blue-500/30 bg-blue-500/5`
- Tap currency card → scrolls to first account of that currency

### Account Cards

Each account is a tappable card:

- **Compact view** (always visible):
  - Bank name (bold) with bank icon
  - Account type + masked account number (last 4 digits)
  - Current balance (large, `tabular-nums`, colored by currency)
  - Accepted payment method chips (small, muted)
  - Status indicator: active = green dot, inactive = gray dot

- **Tap card → expand inline** (animated height):
  - Holder name
  - Branch name (if set)
  - SWIFT code (if set)
  - Notes (if set)
  - **Action buttons row**:
    - "Ajustar" → opens balance adjustment sheet
    - "Movimientos" → opens movements sheet
    - "Editar" → opens edit sheet
    - "Eliminar" → confirmation dialog

### Create Account (bottom sheet — `MobileActionSheet`)

Opened by "+ Nueva" button in header:

```
+------------------------------------------+
|  ====                                    |
|  Nueva cuenta                       [X]  |
+------------------------------------------+
|                                          |
|  Banco                                   |
|  [ Banesco                       ]       |
|                                          |
|  Número de cuenta                        |
|  [ 0134-0000-00-0000000000       ]       |
|                                          |
|  Tipo                                    |
|  [Corriente]  [Ahorro]                   |
|                                          |
|  Moneda                                  |
|  [USD]  [VES]                            |
|                                          |
|  Saldo inicial                           |
|  [ $  0.00                       ]       |
|                                          |
|  Titular de la cuenta                    |
|  [ Juan Perez                    ]       |
|                                          |
|  Métodos de pago aceptados               |
|  [Transferencia] [Pagomóvil] [Zelle]     |
|  [POS] [Efectivo] [T.Débito] [+ Otro]   |
|                                          |
|  Notas (opcional)                        |
|  [ ________________________     ]        |
|                                          |
+------------------------------------------+
|  [ ====== Crear cuenta ====== ]          |
+------------------------------------------+
```

- Bank name: text input (freeform, not dropdown — users have diverse banks)
- Account number: text input, `inputMode="numeric"`
- Type: 2-chip toggle (Corriente / Ahorro)
- Currency: 2-chip toggle (USD / VES)
- Initial balance: number input with currency symbol
- Holder name: text input
- Payment methods: multi-select chips from standard list + "+ Otro" that shows an inline text input
- Notes: optional textarea
- Save: creates account, `haptics.success()`, card animates into list

### Balance Adjustment (bottom sheet)

```
+------------------------------------------+
|  ====                                    |
|  Ajustar saldo                      [X]  |
+------------------------------------------+
|                                          |
|  Banesco · ****4521                      |
|  Saldo actual: $2,150.00                 |
|                                          |
|  Tipo                                    |
|  [+ Ingreso]  [- Egreso]                |
|                                          |
|  Monto                                   |
|         [ $  _______ ]                   |
|                                          |
|  Razón                                   |
|  [ Depósito de cliente       ]           |
|                                          |
|  Nuevo saldo: $2,650.00                  |  ← live calculation
|                                          |
+------------------------------------------+
|  [ ====== Confirmar ajuste ====== ]      |
+------------------------------------------+
```

- Type toggle: "Ingreso" (increase) / "Egreso" (decrease)
- Amount: large number input, `inputMode="decimal"`
- Reason: text input (required)
- Live new balance preview: `AnimatedNumber` that updates as user types
- Color feedback: green for increase, red for decrease
- Confirm: `haptics.success()`, balance animates to new value in card

### Movements History (bottom sheet — tall, scrollable)

```
+------------------------------------------+
|  ====                                    |
|  Movimientos · Banesco              [X]  |
+------------------------------------------+
|                                          |
|  ── 17 de abril ──                       |
|                                          |
|  + Ingreso         $500.00     10:30am   |
|    Depósito de cliente                   |
|                                          |
|  - Egreso          $50.00      9:15am    |
|    Compra de insumos                     |
|                                          |
|  ── 16 de abril ──                       |
|                                          |
|  + Ingreso         $320.00     4:00pm    |
|    Venta #0042                           |
|                                          |
|  (cargar más)                            |
|                                          |
+------------------------------------------+
```

- Grouped by date with sticky date headers
- Each row: type icon (green arrow up / red arrow down), description, amount (right-aligned, colored), time
- Tap row → expand to show: reference number, reconciliation status badge
- Paginated with "Cargar más" button at bottom
- Empty state: "Sin movimientos en esta cuenta"

### Edit Account (bottom sheet)

Same form as Create but pre-filled with existing data. Title: "Editar cuenta". Save button: "Guardar cambios".

### Delete Account

- Tap "Eliminar" in expanded card → confirmation bottom sheet
- "¿Eliminar la cuenta Banesco ****4521?" with warning text: "Esta acción no se puede deshacer"
- Two buttons: "Cancelar" (outline) + "Eliminar" (destructive red)
- On confirm: `haptics.error()`, card fades out and removes from list

### Mobile UX Patterns (MANDATORY)

- **Currency cards**: Large `AnimatedNumber` with currency format (`$1,234.56`). Cards in horizontal scroll row. Border colored by currency.
- **Account cards**: `bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4`. Expandable with `AnimatePresence` height auto. Balance in `text-lg font-bold tabular-nums`.
- **Payment method chips**: Small pills `text-[11px] bg-muted rounded-full px-2 py-0.5`. Show max 3, then "+N" overflow.
- **Masked account number**: Show only last 4 digits: `****4521`
- **Type toggle**: 2-button pill group. Active: `bg-primary text-primary-foreground`. Inactive: `bg-card border-border`.
- **Live balance preview**: Recalculates as user types in adjustment amount. `AnimatedNumber` with color transition (green for increase, red for decrease).
- **Movement rows**: Left color stripe (green for credit, red for debit, blue for adjustment). Amount right-aligned, bold, colored.
- **Loading**: Skeleton cards matching account card dimensions.
- **Pull to refresh**: Reloads accounts and balances.
- **Stagger entrance**: `STAGGER(0.04)` on account cards + currency summary cards.

### Micro-interactions

- Balance count-up: `AnimatedNumber` 600ms on mount and on data change
- Card expand: chevron 180° rotation, content `height: 0→auto` with `DUR.base`
- Adjustment confirm: balance number in card animates from old → new value
- Create account: new card slides in with `listItem` variant, currency summary updates with animated number
- Delete: card fades to 50% opacity → scales to 0.95 → removes with height collapse
- Currency card tap: smooth scroll to first account of that currency
- Toggle (type/currency): active pill scales briefly (1→1.05→1) with `SPRING.snappy`
- Payment method chip selection: scale-in with `SPRING.bouncy` when toggled on
- Pull refresh: accounts + balances reload, skeleton briefly visible

### Technical Constraints

- All sheets: `MobileActionSheet` (portaled to `document.body`)
- Data: `fetchApi()` from `@/lib/api`
- Toasts: `toast.success()` / `toast.error()` from `@/lib/toast`
- Confirmation: use `MobileActionSheet` with destructive footer button (not `window.confirm`)
- Build: `npx vite build` — JSX only
- Test: 375px and 430px viewports

### What NOT to Build

- Bank reconciliation (desktop power-user feature with matching logic)
- Import bank statements (CSV/OFX — desktop only)
- Multi-currency conversion display (not needed, each account is single-currency)
- Transaction categorization (not in current schema)

---

## Deliverables

1. `MobileBankAccountsPage.jsx` — full page with currency summary + account list + expand/actions
2. `MobileBankAccountCard.jsx` — expandable account card with actions
3. `MobileCreateBankAccount.jsx` — create/edit account bottom sheet
4. `MobileAdjustBalance.jsx` — balance adjustment bottom sheet with live preview
5. `MobileBankMovements.jsx` — movements history bottom sheet with date grouping
6. `BankAccountsRouteGate.jsx` — mobile/desktop gate
7. `App.jsx` — route update

The barbershop owner must be able to see all their bank balances at a glance, adjust when a deposit arrives, check recent movements, and add a new account — all from their phone in under 30 seconds per operation. Every number must be large, legible, and animated. Every action must have clear confirmation.
