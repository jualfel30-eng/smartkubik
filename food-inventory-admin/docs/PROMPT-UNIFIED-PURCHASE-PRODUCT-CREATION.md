# PROMPT — Unified Purchase + Inline Product Creation

## Your Role

You are a senior product engineer with 20 years building point-of-sale and inventory operations at Square, Shopify, and Lightspeed, specialized in **emerging-market retail workflows** where a single "buy from supplier" event mixes existing-catalog products with brand-new SKUs encountered for the first time. You also apply SmartKubik's `ux-design` skill: every interaction is a dopamine event (anticipation → reveal → celebration), every session deposits intelligence that compounds (the product catalog gets denser with each purchase), and every screen sells the outcome ("registra todo en una sola compra") not the feature ("formulario híbrido"). You know that **breaking working flows is a worse sin than shipping slow** — every change goes through a discovery pass against the existing contract before code touches disk.

You are working on **SmartKubik**, a multi-tenant SaaS ERP for LATAM. Stack: NestJS 10 + Mongoose + BullMQ (backend) | React 18 + Vite + Tailwind v4 + Framer Motion + Radix (admin). Dark mode (#0a0e1a). Mobile-aware desktop-first for this surface (the admin runs on laptops 1280–1920px in 90% of usage, mobile-optimized as graceful degradation).

---

## What we're solving

Today the admin offers two separate entry points for what is, in reality, **one event** ("hice una compra a un proveedor"):

| Button | Component | What it does |
|---|---|---|
| **Añadir Inventario** | `CompraCreateDialog` | Purchase with products that already exist in catalog. Search → add line items → save. |
| **Compra de Producto Nuevo** | `CompraNewProductDialog` | Creates a brand-new product + its first inventory + the purchase, all in one shot. Includes a giant form with marca, categoría, lotes, variantes, multi-selling-units, sellers, etc. |

The pain: a real purchase from a supplier almost always mixes **both cases** — 6 SKUs you already sell + 2 new ones you just decided to carry. Today the tenant has to:

1. Open "Compra de Producto Nuevo" → create product 1 → save → done as separate PO
2. Open "Compra de Producto Nuevo" → create product 2 → save → another separate PO
3. Open "Añadir Inventario" → search the 6 existing → save → a third PO

Three POs, three transactions, three audit entries — when accounting reality is **one invoice from one supplier**.

**The fix**: unify into a single entry point ("Crear compra"). Inside that flow, the product search field gets a `+ Crear producto nuevo: "<query>"` option when no match exists. That option opens a **compact popup over the purchase dialog** with only the vital fields. On confirm: the product is created in the catalog AND inserted as a line item in the current PO. The PO then saves normally with a mix of pre-existing and freshly-created `productId`s — accounting sees one transaction.

Quality bar: **at least 80% UX improvement** measured by:
- Clicks to complete the realistic mixed-purchase scenario above (3 POs of 8-15 clicks each today → 1 PO of ~12 clicks total).
- Cognitive load: one mental model ("compra") instead of two.
- Recovery from typos: today, creating a product with the wrong category in `CompraNewProductDialog` means closing and reopening; tomorrow, the popup re-opens with the row already populated.

---

## Recent production incidents this redesign MUST learn from

This codebase has bled in the last 30 days from two incidents that share a single root cause: **a contract changed in one place but other places that depended on it were not audited**. Both were fixable in 15 minutes once diagnosed, but each cost hours of production-down time and dozens of confused customer transactions. The mandatory discovery in this project is the direct response to those scars.

### Incident 1 — IVA default silently flipped 7,902 products to exempt (commit `cb2bff762`)

- **What changed**: commit `5126e426b` (Apr 1) introduced `ivaRate: number` on the product schema with `default: 0` ("exento"), alongside a migration script `migrate-iva-rate.js` meant to backfill existing products via `ivaApplicable: true → ivaRate: 16`.
- **What broke**: the migration script shipped with `DRY_RUN = true` and was never re-run with `false`. Result: **7,902 products without the new field**, every new product inheriting the contradictory default of `ivaApplicable: true` (schema default kept) but `ivaRate: 0`. Backend `orders.service.ts` was defensive (`?? product.ivaApplicable ? 16 : 0`) so most products kept billing correctly via the fallback — but **200 products that had been edited through the new UI got explicit `ivaRate: 0`** and were billing at 0% for a month before anyone noticed.
- **Why it slipped**: the new field was added to the schema in isolation. The chain `schema → DTO → controller → service → frontend default state → frontend selector fallback → migration script execution status` was never audited end-to-end. Each link had a default; none of the defaults agreed.
- **Cost to fix**: 1 discovery session + 1 schema change + 1 frontend change + 1 backfill script execution + 1 manual audit of 194 suspect products across 6 tenant variants of "Tiendas Broas" + 4 commits + 1 emergency post-deploy recovery. Roughly 4 hours of senior engineer time, all preventable.
- **Lesson for this project**: when you add or remove a required field from any product/inventory/PO/supplier contract, **list every place that has a default for that field** (schema, DTO, frontend initial state, frontend selector fallback, migration backfill, seed data) and verify they agree before you ship a single one of them. The mandatory discovery doc must contain a "default-chain audit" per field touched.

### Incident 2 — `stripe` module missing in production crashed backend after deploy (commit `cbf12f623`)

- **What changed**: `package.json` got a new dep (`stripe ^22.1.1`) two months ago. Multiple deploys happened between then and yesterday without issue.
- **What broke**: yesterday's deploy reloaded PM2. PM2 runs from `/home/deployer/smartkubik/api/` (script path + cwd). The deploy script `simple-deploy.sh` was syncing `package.json` and running `npm ci` in the **wrong path** (`/home/deployer/smartkubik/food-inventory-saas/`, a legacy directory). The `api/` path's `node_modules` had been frozen since April 25 — no new deps installed since. Backend crashed at startup with `Cannot find module 'stripe'`. 502 in production.
- **Why it slipped**: the deploy script's dual-path code-rsync (for `dist/`) correctly mirrored to both paths, but the dependency-sync path was wrong. The bug had been latent for ~2 months waiting for ANY new dep to be added.
- **Cost to fix**: 1 emergency triage with PM2 logs + 1 manual `cp + npm ci` recovery + 1 deploy-script audit + 1 fix commit + 1 follow-up deploy. Customers saw a 30-minute outage that should have been zero-downtime.
- **Lesson for this project**: when a tool, script, or process has implicit path/state assumptions, those assumptions are also contracts. The discovery doc must explicitly check **where each side effect lands** (which folder, which DB collection, which env var, which queue) — not just "what API gets called".

### What these incidents teach this project specifically

The unified purchase + inline product creation touches at minimum: `Product` schema, `Product` create endpoint, `Inventory` creation side-effect, `Customer` (supplier) creation side-effect (currently in `createWithInitialPurchase`), `PurchaseOrder` schema + create endpoint, `tenant.usage` counters, three frontend state slices in `useComprasData.js`, two existing DTOs, 73 security tests, and 6 ad-hoc scripts in `scripts/` that depend on the product shape. **A single missed contract here repeats Incident 1 or Incident 2 at a larger blast radius** — because the unified flow becomes the only entry point for product creation from a purchase context, any regression breaks ALL tenants' purchase workflows, not just one.

---

## Mandatory Discovery (before writing a single line)

**This is non-negotiable.** Skipping or shortening it does not save time — it relocates the time from "before code" to "after production breaks". The math from the incidents above is concrete: 30–60 minutes of discovery reading + writing prevents the 2–3 break-fix cycles that have been the norm on changes of this size in the last quarter. With the discovery doc, the expectation is **one round-trip** from "code to green prod". Without it, **plan for ≥3 rounds and at least one customer-facing incident.**

Produce `docs/discovery/unified-purchase-product-creation.md` mapping:

### Module 1 — Products (`food-inventory-saas/src/modules/products/`)
- `products.service.ts` — focus on `create()` and `createWithInitialPurchase()`. Document:
  - Required fields per DTO (`product.dto.ts` `CreateProductDto`, `composite.dto.ts` `RichProductDataDto`).
  - `generateSku(tenantId)` algorithm (already documented: `<3 letters of tenant>-<counter padded 4>`).
  - Side effects: `tenant.usage.currentProducts` increment, storage quota check, supplier auto-creation if `newSupplierName` provided.
  - Events emitted on `products.created` (if any).
- `product.schema.ts` — full schema. Note every `required` Prop, every default, every Mongoose pre/post hook.
- **Default-chain audit** (mandatory, per Incident 1): for each of the 8 popup fields, list (a) schema default, (b) DTO `@IsOptional/@IsNotEmpty`, (c) controller fallback if any, (d) service-layer mutation, (e) current frontend `initialNewProductState` value, (f) frontend selector fallback. The 6 values per field must form a coherent chain. Disagreements are red flags to fix in Phase 1.
- Verify the **defaults already in place** (these were set in earlier commits, do NOT regress):
  - `ivaRate` default `16`
  - `category` defaults `["Sin clasificar"]`
  - `subcategory` defaults `["General"]`
  - `brand` defaults `"Genérico"` (today in frontend) — decide if this stays as fallback or becomes required (stakeholder leans required).

### Module 2 — Suppliers (`food-inventory-saas/src/modules/customers/` — suppliers are Customers with `customerType: 'supplier'`)
- `customers.service.ts` `create()` — focus on dedup by `taxInfo.taxId`, contact array shape.
- How is a supplier linked to a product? Look at `product.schema.ts` `suppliers[]` array and `createWithInitialPurchase`:262 (it adds the supplier as `Customer` then references its `_id` in `product.suppliers[]`).
- Document the **two-way link**: a Customer doesn't know its products; a Product knows its suppliers. The link is unidirectional and lives in the product.

### Module 3 — Inventory (`food-inventory-saas/src/modules/inventory/`)
- `inventory.service.ts` — how is initial inventory created when a product is created with purchase? Look at the path from `createWithInitialPurchase` → eventually creates `Inventory` doc with `productId`, `availableQuantity`, optional `lots[]`.
- `getLowStockAlerts` and `getExpirationAlerts` aggregates — confirm they still embed `productId.{variants, suppliers, isPerishable, inventoryConfig}` (recently widened — do not regress).
- Document the trigger order: must the Product exist before the Inventory? (Yes.) What if Product creation fails mid-way? (Today: rollback in `createWithInitialPurchase`'s try/catch — confirm.)

### Module 4 — Purchase Orders / Compras (`food-inventory-saas/src/modules/purchase-orders/`)
- `purchase-orders.service.ts` `create()` — DTO is `purchase-order.dto.ts` `CreatePurchaseOrderDto`. Document the `items[]` shape, every required field per item, what happens on `receivePurchaseOrder` (the receive flow).
- The frontend orchestrator: `food-inventory-admin/src/components/compras/useComprasData.js` — read end-to-end. Inventory of the state slices: `po`, `newProduct`, `supplierOptions`, `productOptions`, etc. Document which state owns what.
- `CompraCreateDialog.jsx` and `CompraNewProductDialog.jsx` — full UI inventory. The new unified dialog will replace `CompraNewProductDialog` entirely and absorb its purchase semantics into `CompraCreateDialog`.

### Deploy + tooling side-effects (mandatory, per Incident 2)
- Where does `package.json` get rsynced by `simple-deploy.sh`? (Fixed in `cbf12f623` to mirror to `~/smartkubik/api/`. Verify the fix is in HEAD.)
- Where does PM2 run from (`pm2 describe smartkubik-api` → `script path` + `exec cwd`)? **Both must be `~/smartkubik/api/`**.
- Are there any cron jobs or background workers that import the Product model from a path other than `dist/`? Grep for `require.*product.schema` and `import.*product.schema` outside `dist/`.
- Are there ad-hoc scripts in `food-inventory-saas/scripts/` that POST to `/products` directly or instantiate the Product model? List them; any whose contract depends on the popup-payload-shape must be tested.

### What the discovery doc must explicitly answer

1. **Mid-flow failure recovery**: if the user creates 2 new products via popup, then the PO save fails — do the 2 orphan products stay in the catalog (acceptable per stakeholder) or rollback? Stakeholder voted **stay** because they're useful for future purchases and can be deleted; the doc must list the exact API calls that happen and confirm orphan products have no inventory (so they're truly inert until used).
2. **Tenant isolation**: every `POST /products` call from the popup must include the same `JwtAuthGuard + TenantGuard` chain. Confirm no shortcut path bypasses guards.
3. **Subsidiary tenants**: `products.controller.ts:50-56` has `getCatalogTenantId()` that routes subsidiary tenant requests to the parent's catalog. The popup must respect this — a subsidiary creating a product mid-purchase creates it in the parent catalog.
4. **Permission gating**: today `products:create` and `purchase-orders:create` are separate permissions. A user with only `purchase-orders:create` must NOT see the `+ Crear producto nuevo` option. Document the permission resolution path.
5. **Counter increment race**: `tenant.usage.currentProducts` is incremented on each product create. Two popup-creations in quick succession must not collide on the SKU autogen counter (look at `generateSku` — there's a `while (!isUnique)` retry loop, confirm it handles concurrent creates).
6. **The receive flow downstream**: when this unified PO is "received" (in `simple` mode opens RatingModal, in `advanced` mode happens later in Purchase History), do the newly-created products' inventory get incremented correctly? Trace the path.

**Output**: discovery doc + a one-page summary at the top with a green/yellow/red rating per risk, and a "default-chain table" showing all 8 popup fields × 6 default sources. **Do not start Phase 1 until the doc is reviewed and the table has zero red rows.**

---

## Architectural Decisions (locked-in — do not re-debate)

| Decision | Value | Rationale |
|---|---|---|
| Entry point | **One button: "Crear compra"**. Delete the "Compra de Producto Nuevo" trigger entirely. | One mental model. The existence of two buttons is the bug. |
| Product creation timing | **Immediate** (`POST /products`) when user confirms the popup, not deferred to PO submit. | Avoids inventing a transactional mixed-DTO endpoint (3× the work). Orphan risk is acceptable per stakeholder. |
| Where the popup lives | **Radix `Dialog` nested inside the `Sheet`** (or `Dialog`, depending on what CompraCreateDialog uses today — confirm in discovery). Radix supports nested overlays via portals. | Avoids navigating away or losing PO context. |
| Endpoint for new product | **Reuse `POST /products`** (the one ProductsManagement already uses), not a new endpoint. | Single source of truth for validation, side effects, counters. |
| Supplier source for popup product | **None.** The popup creates the product *catalog entry* only; the `suppliers[]` array on the product is left empty. The supplier of *this purchase* is the PO-level supplier (already selected in the parent dialog). | Keeps concerns separate. The product can be sold without ever being purchased from this supplier again. If the user wants to register a permanent supplier-product link, they do it from ProductsManagement later. |
| IVA on popup product | **Field shown with default 16%, editable.** Same dropdown as ProductsManagement (Exento 0% / Reducido 8% / Normal 16%). | Consistency with the IVA fix already deployed. |
| Cost / Quantity | **NOT in the popup.** They live in the PO line item (one row above) where the user already entered them. | Avoids duplicate input. The popup pre-fills the line item's `productName` after creation. |
| Failure UI | **Toast + popup stays open with the offending field highlighted.** | User doesn't lose their work to a network error. |
| Empty-state nudge | When the search returns no results and the user has typed ≥2 chars, the SearchableSelect dropdown shows a row: `+ Crear producto nuevo: "<the query>"` as the last option. | Discoverable at the moment of need (Cooper's just-in-time UX). |
| Removal of legacy | After Phase 3 ships and is verified in prod for 1 week, `CompraNewProductDialog.jsx` and its state in `useComprasData` get deleted in a separate cleanup commit. | Avoid carrying dead code. |

---

## The Vital Field Set (acordado con stakeholder)

The popup shows **exactly these 8 fields**, in this order:

| # | Field | UI | Backend rule |
|---|---|---|---|
| 1 | **Nombre** | `*` required input, pre-filled with the search query that triggered the popup | `@IsNotEmpty()` |
| 2 | **Marca** | `*` required input | `@IsNotEmpty()` (raise from current "Genérico" fallback to truly required per stakeholder) |
| 3 | **Precio de venta** | `*` required number input, `inputmode="decimal"` | `@IsNumber() @Min(0)` |
| 4 | **Unidad base** | `*` required Select (default per vertical: "unidad" for retail, "kg" for food) | `@IsString() @IsNotEmpty()` |
| 5 | **SKU** | visible input, `(opcional)` label | Empty → backend autogenerates via `generateSku(tenantId)` |
| 6 | **Código de barras** | visible input, `(opcional)` label | Empty → stays empty (do not autogen — barcode without a real EAN is misleading) |
| 7 | **Categoría** | visible input/select with autocomplete from existing categories, `(opcional)` label | Empty → defaults to `["Sin clasificar"]` |
| 8 | **Subcategoría** | visible input/select with autocomplete, `(opcional)` label | Empty → defaults to `["General"]` |

Costs / quantities / supplier / IVA / lots / variants / multi-selling-units / perishability / shelf-life / temperature / images / ingredients / description are **NOT in the popup**. Justification per field type:
- **Cost & qty**: come from the PO line item above the popup.
- **Supplier**: lives on the PO header (one purchase = one supplier by design).
- **IVA**: inherits the product's schema default `16` automatically; user can edit later in ProductsManagement.
- **Lots / variants / multi-unit / perishable / shelf-life / temp**: advanced configuration, irrelevant to "I bought this for the first time". Editable later.
- **Images, ingredients, description**: not blocking the sale; added later.

If during discovery any of these "later" fields turn out to be hard-required by an unrelated invariant (e.g., a downstream service crashes if `unitOfMeasure` is undefined), document it and propose the smallest safe addition.

---

## Conventions to respect (zero-regression policy)

Every one of these is a recent fix or an architectural invariant. **Any regression cancels the project.**

1. **SKU autogen format**: `<3 alphanumeric letters of tenant.name upper>-<counter padded to 4>`. Must reuse `generateSku()`, not invent a new one. The popup's empty SKU sends `undefined` (NOT empty string — `@IsOptional` semantics).
2. **Barcode**: empty stays empty. The `createWithInitialPurchase` recently added `if (!v.barcode) v.barcode = v.sku` for variants — that's for variants, not for the product top-level. The popup's empty barcode is genuinely empty.
3. **IVA rate**: schema default is `16` (fixed in `cb2bff762`). The popup's IVA select must respect this default on render.
4. **Tenant isolation**: every API call hits the same `JwtAuthGuard + TenantGuard + PermissionsGuard` chain. No new endpoints that bypass guards.
5. **ObjectId vs String**: `tenantId`, `productId`, `supplierId` may exist as either type in queries. Any new code that filters by these uses the pattern `$in: [str, new Types.ObjectId(str)]` — see `docs/wiki/patterns/objectid-vs-string.md`.
6. **Soft-delete**: `{ isDeleted: { $ne: true } }`, never `{ isDeleted: false }`.
7. **Multi-unit fields**: if the product later gets `selectedUnit`, `conversionFactor`, `unitOfMeasure` set, the line item creation here must preserve them (see `docs/wiki/patterns/multi-unit-conversions.md`).
8. **Sequential numbers**: PO number generation uses MAX+1 in a transaction, not `countDocuments()`. Don't introduce regressions here when handling the post-creation PO save.
9. **Wiki update**: changes to `products`, `inventory`, `purchase-orders`, or `customers` modules require updating `docs/wiki/modules/<X>.md` and `docs/wiki/system-map.md` in the same PR.
10. **73 security tests** must still pass: `npm run test:security`. Add ownership-validation cases for the new flow.
11. **Deploy paths** (per Incident 2): if your work touches `package.json`, verify after deploy that `~/smartkubik/api/node_modules` was actually updated (`ssh deployer@server "ls ~/smartkubik/api/node_modules/<your-new-dep>"`). Do NOT assume the deploy script does this; the fix in `cbf12f623` was recent and the deploy contract is still fragile.

---

## Design Layers

### Layer 1: STRUCTURE (40% of the impact)

**Entry point**: in `ComprasManagement.jsx`, the two-button row collapses to one primary button **"Crear compra"** (or "Nueva compra" — stakeholder picks). Remove the "Compra de Producto Nuevo" button trigger. The Dialog/Sheet that opens is the existing `CompraCreateDialog` (renamed if needed — but the contract stays).

**Inside the purchase dialog**: the product search row gets one new affordance. When the user types ≥2 characters and the async loader returns 0 matches, the dropdown's footer renders:

```
─────────────────────────────────────────
+ Crear producto nuevo: "Aceite oliva 2L"
─────────────────────────────────────────
```

Click → opens the popup. Same behavior if the user types something that has matches but none feel right — the option is always at the bottom of the dropdown.

**The popup**: 480px wide on desktop, full-width on mobile. Two columns on desktop for compact density (Marca | Precio de venta in row 2, etc.). One column on mobile. Header: "Nuevo producto" + close X. Footer: `[Cancelar]   [Crear y agregar a la compra]`. No tabs (we explicitly avoided this in the recent ProductsManagement simplification).

**State preservation**: if the user opens the popup and closes it without saving, anything they typed in the popup is preserved if they re-open it from the same dropdown row within the session. (LocalStorage-backed, key `smartkubik:compras:pending-product-draft`.) This addresses the "I accidentally hit close" recovery anxiety.

### Layer 2: INTERACTION

**Motion** (use `framer-motion` with `SPRING.soft` and `SPRING.snappy` from `src/lib/motion.js`):

| Trigger | Effect | Duration | Easing |
|---|---|---|---|
| Dropdown shows "+ Crear nuevo" row | Subtle fade-in + slight slide-up of that row | 200ms | `EASE.out` |
| Click "+ Crear nuevo" | Popup mounts with `scaleIn` (0.96 → 1) + opacity 0 → 1; background dialog dims to 60% (Radix overlay default) | 250ms | `SPRING.soft` |
| Field error on submit | Field border flashes red, label slides 4px right then back (shake) | 150ms | `EASE.inOut` |
| Submit success | Popup compresses to a chip representing the new product, animates into the PO line item that opens the dropdown. Line item flashes green for 600ms. | 600ms (anticipation 200ms + reveal 300ms + flash 600ms) | `SPRING.bouncy` for the chip flight |
| Hover on submit button when valid | Subtle scale 1.0 → 1.02 + soft shadow grow | 150ms | `EASE.out` |

**Empty state of the dropdown** (no products yet in catalog AND query is empty): "Aún no tienes productos en tu catálogo. Empieza esta compra creando uno nuevo." with the `+ Crear nuevo` option as the primary CTA. This is an intelligence-trap nudge — first purchase becomes the seed of the catalog.

### Layer 3: CELEBRATION

The submit success **must** use the three-stage reward sequence from the `ux-design` skill — this is the magic moment of "I just added a product to my catalog while doing a purchase, in 10 seconds, without leaving this screen."

- **Anticipation** (200ms): submit button shows a subtle progress bar inside it (`overflow-hidden` background gradient sliding L→R).
- **Reveal** (300ms): the popup collapses with `SPRING.bouncy`, a tiny "chip" (icon + product name) flies along an arc to the position of the line item.
- **Celebration** (600ms after chip lands): line item flashes emerald, the dropdown closes, the line item's quantity input auto-focuses (so the user can immediately enter "how many of this new product am I buying?"). Soft haptic (`haptics.success()`) on mobile.

If this is the user's **first** product creation ever (catalog count was 0 before), additionally fire `triggerCelebration()` (the existing confetti hook) — milestone moment, stored in localStorage so it only fires once per tenant.

---

## Phases of Implementation

### Phase 0 — Discovery doc (no code yet)

Generate `docs/discovery/unified-purchase-product-creation.md` per the Mandatory Discovery section above, including the **default-chain audit table** and the **deploy-paths verification**. Stakeholder reviews and approves before Phase 1. Estimated time: 30–60 minutes. Output is a markdown document, not code.

### Phase 1 — Backend contract (small, defensive)

- Verify `POST /products` accepts the popup's reduced payload. If `RichProductDataDto` / `CreateProductDto` requires fields the popup doesn't send, either (a) make them `@IsOptional` with defaults applied in the service, or (b) the service builds the full DTO with safe defaults before validation. Prefer (b) — keeps the validation surface untouched.
- Add one e2e test: tenant A creates a product via the unified popup payload, verifies tenant B cannot see/modify it (ownership). Pattern from `test/ownership-validation.e2e.spec.ts`.
- Verify `tenant.usage.currentProducts` increments and the storage check passes with no images.
- **NO new endpoints.** This is critical — if Phase 1 requires a new endpoint, the discovery missed something; pause and revisit.

### Phase 2 — Frontend popup + integration

- New component `food-inventory-admin/src/components/compras/InlineProductCreateDialog.jsx` (Radix Dialog, mounted inside CompraCreateDialog's Sheet).
- New hook slice in `useComprasData.js`: `pendingProductDraft` state + `createInlineProduct(payload)` async action that POSTs and inserts the result into `po.items`.
- Modify the SearchableSelect to inject the `+ Crear nuevo` option when matches are 0 and the query length ≥ 2. The existing `SearchableSelect` may need an `onNoResultsAction` prop or a `creatableOption` prop — design the minimum surface area for it to be reusable later.
- Three-stage reward animations (motion.js tokens).
- Remove the "Compra de Producto Nuevo" trigger button from `ComprasManagement.jsx`. **Keep** `CompraNewProductDialog.jsx` for now (delete in Phase 3) so we have an instant rollback if needed.

### Phase 3 — Cleanup (after 1 week in prod, no incidents)

- Delete `CompraNewProductDialog.jsx` and `CompraInvoiceScanner.jsx`'s split between dialogs (consolidate into one scanner that works in the unified flow).
- Remove the `newProduct` state slice from `useComprasData.js`.
- Update `docs/wiki/modules/products/` and `docs/wiki/system-map.md`.

---

## Acceptance Criteria

### Functional
- [ ] One purchase containing 3 existing products + 2 newly-created products saves as ONE PO with 5 items, ONE accounting entry.
- [ ] Each newly-created product appears in `ProductsManagement` immediately after the popup closes (no refresh needed).
- [ ] Newly-created product's `ivaRate` defaults to 16, `category` to `["Sin clasificar"]`, `subcategory` to `["General"]`, `brand` to whatever the user typed (required), SKU autogen if blank, barcode empty if blank.
- [ ] If the PO save fails after products were created, products stay in catalog with zero inventory (verified via DB query).
- [ ] User with permission `purchase-orders:create` but NOT `products:create` does NOT see the `+ Crear nuevo` option.
- [ ] Subsidiary tenant creating a product mid-purchase creates it in the parent's catalog (verified via tenantId on the product doc).

### Tests
- [ ] `npm run test:security` — 73/73 pass.
- [ ] `npm run test:e2e` — new test "unified-purchase-product-creation.e2e.spec.ts" covers happy path + 4 edge cases (no permission, mid-flow failure, subsidiary, concurrent creates with SKU collision retry).

### Post-deploy verification (per Incident 2)
- [ ] `ssh deployer@server "ls ~/smartkubik/api/node_modules"` after deploy — confirm any new deps are present.
- [ ] `curl -s https://api.smartkubik.com/api/v1/health` returns 200 within 30 seconds of `pm2 restart smartkubik-api`.
- [ ] `pm2 describe smartkubik-api` shows `uptime` reset (< 1 minute) after deploy — proves the restart actually loaded new code, not stale process.

### UX
- [ ] Mixed purchase scenario completes in ≤ 60 seconds (vs ~3 minutes today across 3 separate dialogs).
- [ ] Lighthouse desktop score ≥ 90 on the page.
- [ ] All animations respect `prefers-reduced-motion`.

### Wiki + memory
- [ ] `docs/wiki/modules/products/` updated.
- [ ] `docs/wiki/modules/purchase-orders/` updated.
- [ ] `docs/wiki/system-map.md` reflects the new flow.

---

## What NOT to do

- ❌ Don't invent a new endpoint that accepts a mixed payload of `productIds[]` + `newProducts[]`. Reuse `POST /products` per new product, then `POST /purchase-orders` with the resolved `productId` list. The atomicity loss is acceptable per the orphan-product decision.
- ❌ Don't make the popup a full-page route. The whole point is preserving PO context.
- ❌ Don't add tabs to the popup. The 8 fields fit in 2 columns; tabs are how `CompraNewProductDialog` got into its current overload state.
- ❌ Don't change the SKU autogen format. Anything depending on `TBS-0001` shape (reports, integrations) would silently break.
- ❌ Don't auto-create a supplier link on the popup product. The supplier of THIS purchase doesn't imply a permanent supplier-product relationship.
- ❌ Don't ship without the discovery doc reviewed. The whole point of doing this project right is avoiding regression — the doc is the line of defense.
- ❌ Don't skip the three-stage reward. The "I created a product mid-purchase" moment is rare and delightful — it deserves ceremony.
- ❌ Don't delete `CompraNewProductDialog` in Phase 2. One week of prod with the new flow active before removing the fallback.
- ❌ **Don't add a field-level default in only one place** (per Incident 1). If `category` defaults to `["Sin clasificar"]` in the service, that default must also exist or be tolerated in the schema, the DTO, the frontend initial state, and any migration. A default that lives in only one of the six places is a future incident waiting.
- ❌ **Don't trust a deploy script to handle a new dependency without verification** (per Incident 2). Even after the fix in `cbf12f623`, the contract between rsync paths and PM2's runtime path remains fragile. After Phase 1 or 2 ships, run the post-deploy verification checklist before walking away.

---

## Reference materials inside the repo

- `food-inventory-admin/CLAUDE.md` — frontend conventions (Tailwind v4, motion tokens, SearchableSelect rules).
- `food-inventory-saas/CLAUDE.md` — backend non-negotiables (tenant isolation, ObjectId vs String, soft-delete).
- `docs/wiki/system-map.md` — module-by-module contracts.
- `docs/wiki/patterns/` — recurring patterns (read them all before designing the popup's data flow).
- `food-inventory-admin/docs/PROMPT-PAYMENT-REQUESTS-MODULE.md` — reference for blueprint structure and depth.
- `food-inventory-admin/src/lib/motion.js` — `SPRING`, `DUR`, `EASE` tokens; use these, don't invent new ones.
- Recent commits worth reading before starting (each is a real production lesson):
  - `cb2bff762 fix(iva): restore 16% default + backfill exempt products` — **Incident 1 fix**
  - `cbf12f623 fix(deploy): npm ci runs in the path PM2 actually uses (~/smartkubik/api)` — **Incident 2 fix**
  - `052994af1 fix(compras): make SKU/barcode/contact name optional in new product dialog` — sets the precedent the popup must follow
  - `8528fe6cc fix(inventory): inline suppliers + variants in alert aggregates` — alert aggregate widening that supports `handleCreatePoFromAlertBatch`
  - `e98232519 feat(compras): batch PO from alert sheets with supplier-grouping shortcut` — recent supplier-grouping logic the new flow inherits

These are the recent changes that established the conventions you must respect.

---

*This is a starting point. Refine the discovery doc manually with the stakeholder before opening any PR. The 80% UX improvement target is measured against the realistic mixed-purchase scenario, not against the happy path. The two recent incidents documented above are the project's primary risk model — if you find yourself reasoning about whether to skip a check, re-read them.*
