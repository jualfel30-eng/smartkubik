# Prompt: Mobile-First Inventory Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile-first applications at Apple, Google, and Shopify. You specialize in inventory and commerce interfaces that make complex warehouse operations feel as simple as scrolling through Instagram. You have shipped inventory management UIs for Shopify POS, Square, and Toast — systems used by millions of small businesses daily. You understand that a barbershop owner checking stock on their phone at 7am needs to see what's low, reorder, and move on in under 30 seconds.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile)
- `MobileInventoryPage.jsx` at `src/components/mobile/inventory/MobileInventoryPage.jsx` — has tab pills (Stock/Movimientos/Alertas), search bar, filter sheet, expandable product cards with stock bars, and an adjust-stock bottom sheet. However, it is a READ-ONLY facade: you can view stock (if any exists) and see an empty state, but you cannot create products, add initial inventory, or do anything productive. The "Ir a Productos" CTA navigates to the desktop products page.
- `InventoryRouteGate.jsx` at `src/components/mobile/inventory/InventoryRouteGate.jsx` — detects mobile, shows `MobileInventoryPage` when no `?tab=` param, falls through to desktop `InventoryDashboard` when `?tab=` is present.

### What exists (desktop)
- `InventoryDashboard.jsx` at `src/components/InventoryDashboard.jsx` — tab orchestrator with: Productos (ProductsManagementWithTabs), Inventario (InventoryManagement), Traslados (TransferOrdersPanel), Compras (ComprasManagement), Proveedores (SuppliersManagement).
- `ProductsManagementWithTabs.jsx` — product CRUD with sub-tabs (Mercancia, Materias Primas, Consumibles, Suministros). Full create/edit/delete with variants, pricing, images, categories.
- `InventoryManagement.jsx` (~2,398 lines) — stock levels table, adjust stock, lot management, alerts configuration.

### Backend API (key endpoints)
```
Products:
  GET    /products?category=X&status=Y&limit=N    — list products
  POST   /products                                 — create product
  GET    /products/:id                             — get product detail
  PUT    /products/:id                             — update product
  DELETE /products/:id                             — soft delete

Inventory:
  GET    /inventory?limit=N                        — list inventory records
  POST   /inventory                                — create inventory record
  POST   /inventory/adjust                         — adjust stock (+ or -)
  GET    /inventory-movements?limit=N&sort=-createdAt — list movements

Alerts:
  GET    /inventory/alerts/low-stock               — low stock alerts
  GET    /inventory/alerts/count                    — alert count (for badges)

Suppliers:
  GET    /suppliers                                — list suppliers
  POST   /suppliers                                — create supplier

Purchase Orders:
  GET    /purchase-orders                          — list POs
  POST   /purchase-orders                          — create PO
```

### Product schema (Beauty-relevant fields)
```
{
  name, sku, description, category,
  brand, barcode,
  price: { amount, currency },
  cost: { amount, currency },
  images: [url],
  isActive: boolean,
  unitOfMeasure: string,
  variants: [{ sku, name, price, attributes }],
  minStock: number,
  maxStock: number,
  suppliers: [{ supplierId, cost, isPreferred }],
}
```

### Inventory record schema
```
{
  productId, productName, productSku,
  currentStock, minStock, maxStock,
  warehouseId, warehouseName,
  unitOfMeasure, lotNumber, expirationDate,
  lastMovementDate,
}
```

### Design system tokens (already in use across all mobile components)
- Motion: `SPRING.drawer` (stiffness:380, damping:36), `SPRING.snappy` (500,40), `SPRING.soft` (260,30), `SPRING.bouncy` (420,22)
- Variants: `listItem` (fadeUp), `scaleIn`, `STAGGER(delay)`, `tapScale`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`, `haptics.error()`
- Bottom sheet: `MobileActionSheet` with `footer` prop, renders via `createPortal` to document.body
- Touch: 44px min targets, `whileTap={{ scale: 0.97 }}`, `no-tap-highlight`
- Colors: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary`
- Radius: `var(--mobile-radius-lg)`, `var(--mobile-radius-md)`, `rounded-full`

---

## Requirements

### Architecture
1. The mobile inventory module must be a **complete, self-contained mobile experience** — not a link to desktop pages. The user must be able to: view stock, create products, add inventory, adjust stock, view movements, see alerts, and create basic purchase orders — all from mobile.
2. Navigation: `MobileInventoryPage` serves as the hub with tabs. Complex flows (create product, create PO) open as bottom sheets or sub-pages.
3. `InventoryRouteGate.jsx` routes to `MobileInventoryPage` on mobile for ALL tabs (remove the `?tab=` fallthrough to desktop).
4. Each tab loads its own data independently.

### Tab 1: Stock (default tab)

**Product/Inventory list:**
- Cards (not table rows) showing: product name, SKU, current stock with color-coded badge (green=OK, amber=low, red=out), stock bar visualization, unit of measure
- Tap card → expand inline to show: location, last movement date, min/max stock, cost price, supplier
- Expanded card actions: "Ajustar stock" (bottom sheet), "Ver movimientos" (filter movements tab to this product), "Editar producto" (bottom sheet)
- Pull-to-refresh
- Infinite scroll or "Cargar más" button for large inventories

**Search + Filters:**
- Sticky search bar at top (by name or SKU)
- Filter button → bottom sheet with: stock status (all/low/out), category, sort by (name, stock asc, stock desc)
- Active filter count badge on filter button
- Active filters shown as dismissable chips below search

**Create Product (bottom sheet):**
- "+ Nuevo producto" button in header
- Bottom sheet with essential fields only (mobile-first, not the full desktop form):
  - Name (required)
  - SKU (auto-generated if empty, editable)
  - Category (select from existing categories)
  - Price (number input)
  - Cost (number input)
  - Unit of measure (chips: unidad, kg, litro, caja)
  - Min stock alert (number)
  - Photo (camera/gallery picker)
- Save → creates product + creates initial inventory record
- Success: haptic + toast + card appears in list with entrance animation

**Adjust Stock (bottom sheet):**
- Product name + current stock display
- Large stepper (- / quantity / +) with haptic on each tap
- Reason chips: Compra, Venta, Merma, Corrección, Otro
- Optional note field
- Summary: "Stock actual: 24 → Nuevo: 29"
- Save button with loading state
- Success: stock bar animates to new value, toast confirmation

### Tab 2: Movimientos

**Movement list:**
- Cards showing: product name, movement type (color-coded icon), quantity (+/-), date/time, reason
- Movement types: purchase (green +), sale (red -), adjustment_in (blue +), adjustment_out (orange -), transfer_in/out
- Group by date (sticky date headers: "Hoy", "Ayer", "15 de abril")
- Filter by: movement type, date range, product
- Tap card → expand to show: user who made the change, notes, reference (PO number if applicable)
- Empty state: "Sin movimientos registrados"

### Tab 3: Alertas

**Alert list:**
- Cards for products with stock ≤ minStock
- Each card: product name, current stock (red), min stock threshold, deficit count
- Primary action per card: "Reabastecer" → opens adjust stock sheet pre-filled with mode "add"
- Secondary action: "Crear orden de compra" → opens simplified PO creation
- Badge count on tab pill (synced with `/inventory/alerts/count`)
- Empty state: "Sin alertas — todo el inventario está al día" with green checkmark

### Tab 4: Pedidos (NEW — simplified purchase orders)

**Purchase order list:**
- Cards: supplier name, date, status badge (draft/sent/received), item count, total amount
- Tap → expand to show line items
- Status flow: Draft → Sent → Partially Received → Received

**Create PO (bottom sheet or sub-page):**
- Step 1: Select supplier (search from existing suppliers, or "Crear nuevo" inline)
- Step 2: Add products (search existing products, set quantity and cost per unit)
- Step 3: Review + confirm (summary with totals)
- Save as draft or send directly
- When received: tap "Recibir" → confirms quantities → auto-updates inventory stock

### Mobile UX patterns (MANDATORY)

- **Cards**: `bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4`. Tap feedback: `active:scale-[0.98]` transition.
- **Expandable cards**: `AnimatePresence` + `motion.div` with `height: 0→auto`, `opacity: 0→1`, `duration: DUR.base`.
- **Tabs**: Horizontal scroll pills with `scroll-snap-type: x mandatory`. Active tab: `bg-primary text-primary-foreground`. Inactive: `bg-muted text-muted-foreground`. Badge on alerts tab.
- **Search**: Sticky top, `bg-muted rounded-xl pl-9 pr-4 py-2.5`, search icon left, clear button right when text present.
- **Empty states**: Centered icon (40px, `text-muted-foreground/30`) + title (`text-sm font-medium`) + description (`text-xs text-muted-foreground`) + CTA button if applicable.
- **Stepper**: Large touch targets (48px circles), number display in center (`text-3xl font-bold tabular-nums`), haptic on each press.
- **Bottom sheets**: Use `MobileActionSheet` with `footer` prop for save/confirm buttons.
- **Loading**: Skeleton cards (`animate-pulse bg-muted rounded-[var(--mobile-radius-lg)]`) matching card dimensions.
- **Pull to refresh**: Already available via `usePullToRefresh` hook.
- **Stagger entrance**: `STAGGER(0.03)` on card lists with `listItem` variant.
- **Stock bar**: Thin horizontal bar (`h-1.5 bg-muted rounded-full`) with fill (`bg-emerald-500` or `bg-destructive`), animated width on mount.
- **Number formatting**: Use `AnimatedNumber` component for stock counts that change.

### Micro-interactions (specific)
- Stock adjustment stepper: haptic on each +/- tap, number scales briefly (`scale: 1.1→1`, 100ms)
- Card expand: chevron rotates 180°, content slides in with `height: auto`
- Tab switch: content fades (`opacity 0→1`, 150ms), pill indicator slides (`layoutId`)
- Alert badge: bounce animation when count changes
- Save success: button flashes green border, `haptics.success()`, toast with undo option (5s timeout)
- Product photo: placeholder with camera icon, tap → native file picker, preview with scale-in animation
- Pull to refresh: spinner with progress ring

### Technical constraints
- All sheets: `MobileActionSheet` (portals to `document.body` to escape PageTransition transform)
- Navigation: React Router v7 (`useNavigate`, `useSearchParams`)
- Data: `fetchApi()` from `@/lib/api`
- Toasts: `toast.success()` / `toast.error()` from `@/lib/toast`
- Analytics: `trackEvent()` from `@/lib/analytics`
- Build: `npx vite build` must succeed — all JSX, no TypeScript
- Test: 375px (iPhone SE) and 430px (iPhone 15 Pro Max) viewports
- Tenant isolation: all API calls are tenant-scoped via auth token (no need to pass tenantId)

### What NOT to build
- Warehouse management (multi-warehouse is a feature flag not enabled for Beauty)
- Barcode scanner (exists as a separate component, can integrate later)
- Lot/expiration management (not relevant for Beauty products like hair wax and shampoo)
- Import/export CSV (desktop-only feature)
- Pricing engine (desktop-only)

---

## Deliverables

1. `MobileInventoryPage.jsx` — rewritten with 4 functional tabs (Stock, Movimientos, Alertas, Pedidos)
2. `MobileProductCard.jsx` — expandable product/stock card component
3. `MobileCreateProduct.jsx` — bottom sheet for creating a new product
4. `MobileAdjustStock.jsx` — bottom sheet for stock adjustments (already partially exists, needs polish)
5. `MobileMovementCard.jsx` — movement history card with date grouping
6. `MobileCreatePO.jsx` — simplified purchase order creation (2-3 step wizard)
7. `InventoryRouteGate.jsx` — updated to always show mobile on mobile (no desktop fallthrough)

Every component must be fully functional E2E: fetch data from API, render mobile-optimized UI, handle user input, submit to API, show feedback. The user must be able to manage their entire product inventory from their phone without ever needing to open a laptop.
