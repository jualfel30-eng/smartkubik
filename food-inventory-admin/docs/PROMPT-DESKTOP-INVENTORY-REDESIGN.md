# Prompt: Desktop UX/UI Redesign — Inventory Module (All Sub-Modules)

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building inventory and supply chain interfaces at Shopify, NetSuite, Cin7, and Odoo. You specialize in ERP modules that make complex operations feel simple — where a warehouse manager can find any product in 2 seconds, adjust stock in 3 clicks, and generate a purchase order in under 30 seconds. You understand that inventory management is 80% scanning/searching and 20% acting — so the UI must be optimized for SPEED OF FINDING with delight reserved for the moments that matter (stock adjusted, PO received, alert resolved).

You have shipped inventory UIs managing 500K+ SKUs and you know that the difference between a productive ERP and a hated one comes down to three things: (1) can I find what I need in 2 seconds, (2) can I do what I need in 3 clicks, (3) does the system get smarter about ME over time. Animations are the icing — but the cake is information architecture, workflow speed, and smart defaults.

You are working on SmartKubik, a multi-vertical SaaS ERP. React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). This redesign is **DESKTOP ONLY** (≥1024px). The motion language is defined in `src/lib/motion.js` (SPRING, DUR, EASE, listItem, scaleIn, STAGGER, fadeUp).

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

This is a redesign, NOT a rewrite. Every existing feature must continue working. The redesign improves THREE layers:

1. **STRUCTURE** — Simplify navigation, add context before action, reduce clicks for common workflows
2. **INTERACTION** — Add Framer Motion animations, smart defaults, inline actions, search
3. **CELEBRATION** — Apply three-stage reward sequence on workflow completions

**Rules:**
1. DO NOT change API calls, data structures, or business logic
2. DO NOT remove any existing features, buttons, filters, or columns
3. DO NOT change component props interfaces (other components depend on them)
4. Test `npx vite build` after EVERY component change
5. Verify each sub-module loads correctly in the browser after changes
6. If something breaks, REVERT and try a smaller change

---

## Current State

### Architecture (10+ components, ~3,500 lines, ZERO Framer Motion)
```
InventoryDashboard.jsx (145 lines — tab orchestrator)
├── Tab: Productos
│   └── ProductsManagementWithTabs.jsx (88 lines)
│       ├── Mercancía → ProductsManagement
│       ├── Materias Primas → ProductsManagement
│       ├── Consumibles → ConsumablesTab
│       ├── Suministros → SuppliesTab
│       ├── Motor de Precios → PricingEngineTab
│       └── Depuración → DedupTab
│
├── Tab: Inventario (5 sub-tabs)
│   ├── Inventario → InventoryManagement.jsx (443 lines)
│   ├── Almacenes → WarehousesAndBinsManager.jsx
│   ├── Movimientos → InventoryMovementsPanel.jsx (933 lines)
│   ├── Alertas → InventoryAlertsPanel.jsx (305 lines)
│   └── Reportes → InventoryReportsPanel.jsx (501 lines)
│
├── Tab: Traslados → TransferOrdersPanel.jsx (210 lines)
├── Tab: Compras → ComprasManagement.jsx (126 lines)
└── Tab: Proveedores → SuppliersManagement.jsx (256 lines)
```

### The 12 Problems (Ranked by Impact on Intuitiveness)

| # | Problem | Impact | Layer |
|---|---------|--------|-------|
| 1 | **No context on entry** — user opens Inventario and sees a raw table immediately. No summary, no KPIs, no "what needs attention." Zero orientation. | User doesn't know what to do first. Opens the module and feels overwhelmed. | STRUCTURE |
| 2 | **No universal search** — the #1 action is "find this product." Currently requires knowing which tab it's in. No command-palette for inventory. | Finding a product takes 5-15 seconds instead of 2. | STRUCTURE |
| 3 | **10+ tabs across 2 levels** — 5 top tabs, Inventario has 5 sub-tabs. User must learn a hierarchical taxonomy to navigate. | New users get lost. "Where is the stock for product X?" requires understanding tab structure. | STRUCTURE |
| 4 | **Common workflows take too many clicks** — "Receive a PO and update stock" requires: Compras tab → find PO → receive → Inventario tab → verify. "Adjust stock" requires: Inventario tab → find product → click edit → dialog → adjust → save. | Users avoid the system because it feels like work. | STRUCTURE |
| 5 | **Filters don't remember** — every time user navigates to Movimientos, filters reset. User who always checks "today's movements" must re-select every time. | Repetitive friction, 3-5 clicks wasted per visit. | INTERACTION |
| 6 | **ZERO Framer Motion** — entire module is CSS-only. No stagger, no dialog animation, no transition. Static and lifeless. | Module feels like a 2018 spreadsheet, not a 2026 product. | INTERACTION |
| 7 | **No action feedback** — stock adjusted? Row doesn't flash. Product deleted? Disappears instantly. PO received? Toast only. No ceremony. | User isn't sure their action took effect. Has to manually verify. | CELEBRATION |
| 8 | **Dialogs are full-screen forms** — InventoryAddDialog is `max-w-5xl h-[95vh]`. It's not a dialog, it's a page disguised as a modal. No progressive disclosure, no step-by-step. | Overwhelming. User sees 15 fields at once and freezes. | STRUCTURE |
| 9 | **No smart defaults** — system doesn't learn. Same empty filters every time. No "frequently adjusted products." No "suggested reorder based on velocity." | Every session starts from zero. No intelligence trap. | INTERACTION |
| 10 | **Filter layout breaks at 1280-1440px** — `grid-cols-5` with no intermediate breakpoint. SearchableSelect fields force wrapping. | Filters are cramped on standard laptop screens. | INTERACTION |
| 11 | **Empty states are dead ends** — "No hay datos" with no icon, no guidance, no CTA. | Feels broken rather than empty. | INTERACTION |
| 12 | **No milestone celebrations** — receiving a PO worth $5,000 gets the same flat toast as adjusting 1 unit of stock. | Big accomplishments feel invisible. No dopamine. | CELEBRATION |

---

## Requirements: Three-Layer Redesign

### LAYER 1: STRUCTURE (Makes it intuitive — 40% of the improvement)

#### 1.1 Inventory Summary Dashboard (NEW — Top of Module)

When the user opens the Inventario module, BEFORE any tabs, show a summary row:

```
┌──────────────────────────────────────────────────────────────────┐
│  Gestión de Inventario                              🔍 Buscar... │
├──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│ 📦 142   │ 💰 $12.4K│ ⚠️ 7    │ 📋 3     │ 🔄 2               │
│ Productos│ Valor    │ Stock   │ Pedidos  │ Traslados           │
│          │ Total    │ Bajo    │ Pend.    │ En tránsito         │
└──────────┴──────────┴──────────┴──────────┴──────────────────────┘
│  [Productos] [Inventario] [Compras] [Proveedores] [Traslados]  │
└─────────────────────────────────────────────────────────────────┘
```

- **5 KPI cards** with AnimatedNumber: product count, total inventory value, low stock alerts (clickable → jumps to alerts), pending POs (clickable → jumps to purchases), in-transit transfers
- **Universal search bar** in header — searches across products, SKUs, suppliers, PO numbers. Results grouped: "Productos (3)", "Proveedores (1)", "Órdenes (2)". Keyboard shortcut: Cmd+F or Ctrl+F within module.
- KPI cards are clickable — they navigate to the relevant tab AND pre-filter. Example: clicking "7 Stock Bajo" → Inventario tab → Alertas sub-tab, pre-filtered.
- Cards animate on mount with `STAGGER(0.06)` + `scaleIn`
- Numbers use `AnimatedNumber` with count-up

**Implementation:** New component `InventoryHeader.jsx` rendered ABOVE the tabs in `InventoryDashboard.jsx`. Fetches summary data from existing endpoints (`/inventory/alerts/count`, `/dashboard/summary`, etc.).

#### 1.2 Flatten the Tab Hierarchy

Reduce 2-level tab structure to 1 level. Current: 5 top tabs with Inventario having 5 sub-tabs (10 total). Proposed: 7 tabs, all at one level:

```
BEFORE: [Productos] [Inventario ▶ {Stock, Almacenes, Movimientos, Alertas, Reportes}] [Traslados] [Compras] [Proveedores]

AFTER:  [Productos] [Stock] [Movimientos] [Alertas] [Compras] [Proveedores] [Traslados]
```

- Remove the "Inventario" wrapper tab — promote Stock, Movimientos, and Alertas to top level
- Merge "Reportes" into a summary section within Stock (or keep as separate tab only when data exists)
- Move "Almacenes" to Settings (it's configuration, not daily operation)
- Result: 7 flat tabs, no nesting. User can reach any section in ONE click.
- Tabs that don't apply to the vertical are still filtered by feature flags

**Why this matters:** Shopify's inventory has ONE level of navigation. NetSuite uses nested tabs and users hate it. Flat navigation = faster access = more intuitive.

#### 1.3 Inline Quick Actions (Reduce Dialog Dependency)

For the most common action — adjust stock — add inline adjustment WITHOUT opening a dialog:

```
┌──────────────────────────────────────────────────────────────┐
│ SKU-001 │ Shampoo Keratina │ 45 uds ████████░░ │ [+] [-] [⋮]│
└──────────────────────────────────────────────────────────────┘
```

- **[+] button**: Tap → inline input appears in the same row: `[+5] [reason: Compra ▼] [✓]`
- **[-] button**: Same, but for reductions
- **[⋮] more menu**: Edit product, View lots, Transfer, View movements, Delete
- The full dialog remains accessible from [⋮] → "Editar inventario" for complex edits (lots, bins, etc.)
- Simple adjustments (the 80% use case) happen in ONE click + type number + confirm = 3 interactions total

**Current:** Find product → Click row or edit button → Dialog opens (800ms) → Find quantity field → Change it → Click save → Dialog closes. 6+ interactions.

#### 1.4 Smart Contextual Shortcuts

Add a "Quick Actions" bar below the KPI cards:

```
[📥 Recibir pedido] [📦 Ajustar stock] [📋 Nuevo pedido] [🔄 Nuevo traslado]
```

- Each button opens the RELEVANT flow directly (dialog or navigate to tab with create mode)
- Buttons change based on context: if there are pending POs, "Recibir pedido" shows with badge count
- This eliminates the need to know which tab holds which action

#### 1.5 Dialog Content Redesign (Progressive Disclosure)

InventoryAddDialog (400 lines, `max-w-5xl h-[95vh]`) should use progressive disclosure:

```
Step 1: Select Product
  [Search product...] → Select from results
  
Step 2: Set Quantity
  Quantity: [___] Unit: [uds ▼]
  Warehouse: [Principal ▼] (if multi-warehouse)
  
Step 3: Optional Details (collapsible)
  ▶ Lot tracking (number, expiration)
  ▶ Bin location
  ▶ Notes
  
[Save]
```

- 80% of uses only need Step 1 + Step 2 (product + quantity)
- Lot tracking, bin locations, notes are in collapsible sections (closed by default)
- Dialog is `max-w-lg` (not `max-w-5xl`) — focused, not overwhelming
- Same data saved, same API call — just fewer visible fields initially

---

### LAYER 2: INTERACTION (Makes it fluid — 35% of the improvement)

#### 2.1 Table Animations (ALL Tables)

```jsx
// Table row stagger on load
<motion.tbody variants={STAGGER(0.03)} initial="initial" animate="animate">
  {rows.map(row => (
    <motion.tr key={row.id} variants={listItem} layout>
      {cells}
    </motion.tr>
  ))}
</motion.tbody>

// Row hover
<motion.tr
  whileHover={{ backgroundColor: 'var(--sidebar-accent)' }}
  transition={{ duration: 0.15 }}
  className="group/row"
>

// Row delete exit
<AnimatePresence>
  <motion.tr exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }} layout>
</AnimatePresence>

// Data change flash
<td className={cn(flash && 'bg-emerald-500/10 transition-colors duration-600')}>
```

#### 2.2 Dialog Animations

```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.98 }}
  transition={SPRING.soft}
>
```

#### 2.3 Skeleton Loading (Replace ALL Spinners)

```jsx
function TableSkeleton({ columns = 6, rows = 8 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-10 bg-muted rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

#### 2.4 Tab Content Transitions

```jsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: DUR.base, ease: EASE.out }}
  >
```

#### 2.5 Smart Filter Persistence

```jsx
// Store last-used filters in localStorage per tab
const FILTER_KEY = `smartkubik_inventory_filters_${tabId}`;

useEffect(() => {
  const saved = localStorage.getItem(FILTER_KEY);
  if (saved) applyFilters(JSON.parse(saved));
}, []);

useEffect(() => {
  localStorage.setItem(FILTER_KEY, JSON.stringify(currentFilters));
}, [currentFilters]);
```

- Filters remember last selection when user returns to the tab
- "Reset filters" button clears saved state
- Movement filters default to "Hoy" on first visit (most common use case)

#### 2.6 Filter Layout Fix for 1280-1440px

```jsx
// BEFORE:
className="grid grid-cols-1 md:grid-cols-5 gap-3"

// AFTER:
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
```

#### 2.7 AnimatedNumber on ALL Totals

```jsx
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
// Pagination, alert counts, summary cards, report totals
```

#### 2.8 Empty States with Guidance

```jsx
<EmptyState
  icon={Package}
  title="Sin productos en inventario"
  description="Agrega tu primer producto para comenzar a gestionar tu stock"
  action={{ label: "Agregar producto", onClick: openAddDialog }}
/>
```

#### 2.9 Visual Enhancements per Module

- **InventoryTable**: Mini stock bar next to quantity (`w-16 h-1.5` animated fill)
- **MovementsPanel**: Color-coded movement type badges (green IN, red OUT, blue ADJUST, amber TRANSFER)
- **AlertsPanel**: Pulsing red dot on critical (0 stock) items
- **TransferOrdersPanel**: Status pipeline dots instead of text badge
- **SuppliersManagement**: Star rating animation on hover
- **ComprasManagement**: Line item slide-in animation when adding products to PO

---

### LAYER 3: CELEBRATION (Makes it gratifying — 25% of the improvement)

#### 3.1 Three-Stage Reward on Major Workflow Completions

**Receiving a Purchase Order:**

When user marks a PO as "Recibido" and all items are checked:

```
Stage 1 — ANTICIPATION (1s):
  Progress bar: "Actualizando stock..." with checklist:
  ✓ Verificando cantidades
  ✓ Actualizando inventario
  ● Registrando movimientos...
  ○ Finalizando

Stage 2 — REVEAL (0.5s):
  ✓ Pedido recibido — 12 productos actualizados
  $2,450.00 en mercancía ingresada

Stage 3 — CELEBRATION (1s):
  "Este mes llevas $8,200 en compras recibidas"
  [Ver inventario actualizado]  [Cerrar]
```

- `haptics` not available on desktop — use screen flash + animated checkmark instead
- Confetti on POs over $1,000

**Stock Adjustment Completion:**

When user adjusts stock inline:
- Row flashes green (increase) or amber (decrease) for 600ms
- Updated number counts from old → new value with AnimatedNumber
- If adjustment resolves a low-stock alert, show brief "Alerta resuelta ✓" toast with emerald accent

**Transfer Order Received:**

When destination confirms receipt:
- Pipeline dots animate to fill sequentially (anticipation)
- Status badge morphs from "En tránsito" to "Recibido" with spring animation
- Flash on affected inventory rows

#### 3.2 Daily Activity Streak (Subtle)

Track consecutive days of inventory activity. Show in the KPI bar:

```
🔥 12 días consecutivos gestionando tu inventario
```

- Not gamification — just acknowledgment
- Shows only after 3+ consecutive days
- Resets silently (no negative messaging on break)
- Builds intelligence trap: user sees their "investment" in the system growing

#### 3.3 Milestone Toasts

| Milestone | Message | Visual |
|-----------|---------|--------|
| First product created | "Tu primer producto está listo" | Confetti burst |
| 100 products | "100 productos en tu catálogo" | Badge animation |
| First PO received | "Tu primera compra recibida" | Checkmark draw |
| $10K inventory value | "Tu inventario supera los $10,000" | AnimatedNumber count-up |
| 0 low-stock alerts | "Inventario al día — sin alertas" | Green pulse + celebration |

---

## Micro-interactions Table (Complete)

| Element | Trigger | Animation | Spec |
|---------|---------|-----------|------|
| KPI card | Mount | scaleIn + AnimatedNumber | `STAGGER(0.06)`, count-up 600ms |
| KPI card | Click | Scale press + navigate | `whileTap={{ scale: 0.98 }}` |
| Search results | Typing | Dropdown fadeIn | `DUR.fast` |
| Tab switch | Click | Content fadeUp/exit | `DUR.base`, `mode="wait"` |
| Table row load | Data fetched | fadeUp stagger | `listItem`, `STAGGER(0.03)` |
| Table row hover | Mouse enter | bg + action buttons reveal | 150ms |
| Table row delete | Confirmed | Height collapse + fade | 200ms, `layout` |
| Table cell change | Value updated | Green/red flash | 600ms fade |
| Stock bar | Mount | Width 0→N% | `DUR.slow` |
| Inline adjust | +/- click | Input expand inline | `SPRING.snappy`, 200ms |
| Inline adjust confirm | ✓ click | Row flash + number tween | AnimatedNumber + flash |
| Dialog open | Button | scaleIn | `SPRING.soft` |
| Dialog close | Save/cancel | scaleOut | `DUR.fast` |
| PO received | Confirm all | Progress → reveal → celebration | 2.5s sequence |
| Alert resolved | Stock adjusted | Toast "Alerta resuelta ✓" | emerald accent |
| Movement badge | Mount | Color badge scaleIn | `DUR.fast` |
| Alert pulse | Zero stock | Infinite red dot pulse | 2s repeat |
| Transfer pipeline | Status change | Dots fill sequentially | `SPRING.snappy`, 50ms stagger |
| Skeleton → Content | Data loaded | Cross-fade | `mode="wait"` |
| Milestone | Threshold hit | Confetti or badge animation | `SPRING.bouncy` |
| Filter persist | Tab revisit | Filters pre-filled silently | No animation (instant) |
| Empty state | Mount | Icon scaleIn + text fadeUp | stagger 100ms |
| Pagination total | Count change | AnimatedNumber | 600ms |

---

## Implementation Order

```
LAYER 1 — STRUCTURE (do first, biggest impact):
  1. InventoryHeader.jsx — KPI cards + search bar (NEW component)
  2. Flatten tab hierarchy (remove Inventario wrapper, promote sub-tabs)
  3. Inline stock adjustment (+/- buttons in table rows)
  4. Quick Actions bar below KPIs
  5. Dialog progressive disclosure (InventoryAddDialog collapsible sections)

LAYER 2 — INTERACTION (do second, makes it fluid):
  6. Table row stagger animation (InventoryTable first, then all tables)
  7. Skeleton loading (replace all spinners)
  8. Dialog entrance/exit animation
  9. Tab content transitions
  10. Filter persistence (localStorage)
  11. Filter layout breakpoints (lg/xl)
  12. AnimatedNumber on all totals
  13. Empty states with icons + CTAs
  14. Per-module visual polish (stock bars, badges, pipeline, stars)

LAYER 3 — CELEBRATION (do last, makes it gratifying):
  15. PO received ceremony (anticipation → reveal → celebration)
  16. Stock adjustment feedback (flash + number tween)
  17. Milestone toasts (first product, 100 products, etc.)
  18. Daily activity streak display
```

**After EACH numbered item:** run `npx vite build` and verify in browser.

---

## Verification Criteria (How to Know It Worked)

The redesign is COMPLETE when:

| Criterion | Metric | How to Test |
|-----------|--------|-------------|
| **Find any product** | < 2 seconds | Type in search bar → result appears |
| **Adjust stock** | < 3 clicks | Click + on row → type number → confirm |
| **Know what needs attention** | Instant on page load | KPI cards show alerts + pending POs |
| **Navigate to any section** | 1 click (not 2) | Flat tabs, no nesting |
| **Filters remembered** | 0 re-selection on return | Navigate away → come back → same filters |
| **Action confirmed visually** | Every CRUD has feedback | Delete = row exit. Adjust = flash. Create = stagger-in. |
| **Workflow completion celebrated** | PO receipt has ceremony | Progress → checkmark → summary |
| **Module feels alive** | Zero static page loads | Every load has skeleton → stagger. Every dialog has spring. |

---

## Technical Constraints

- Import motion tokens from `@/lib/motion`
- Reuse AnimatedNumber from `@/components/mobile/primitives/AnimatedNumber`
- All changes in `src/components/` — DO NOT touch `src/lib/`, `src/hooks/`, `src/pages/`
- Keep all Shadcn UI components (Table, Dialog, Card, Badge, Button, etc.)
- Framer Motion already installed
- Build: `npx vite build` must succeed after every change
- Test: 1280px, 1440px, 1920px viewports
- DO NOT change mobile behavior below 1024px

### What NOT to Change

- API calls, endpoints, payloads, data structures
- Business logic (calculations, validations, permissions)
- Component props interfaces
- ProductsManagement internal structure (separate redesign)
- Mobile/responsive below 1024px

---

## Deliverables

1. `InventoryHeader.jsx` (NEW) — KPI cards + universal search
2. `InventoryDashboard.jsx` — flattened tab structure + quick actions
3. All table components — Framer Motion stagger, hover, delete, flash
4. All dialogs — scaleIn/scaleOut animation + progressive disclosure
5. `InventoryMovementsPanel.jsx` — filter persistence + layout fix + movement badges
6. `InventoryAlertsPanel.jsx` — critical pulse + resolved celebration
7. `ComprasManagement.jsx` — PO received ceremony
8. `TransferOrdersPanel.jsx` — status pipeline visualization
9. Skeleton loading replacing ALL spinners across the module
10. Empty states with icons and CTAs across the module
11. Build passing with zero errors
12. ALL existing functionality verified working
13. ALL verification criteria in the table above met

The inventory module is the workhorse of SmartKubik. This redesign must transform it from "a spreadsheet with buttons" into "a command center that knows what I need." Structure makes it intuitive. Interaction makes it fluid. Celebration makes it gratifying. All three layers together = 80% improvement in user experience.
