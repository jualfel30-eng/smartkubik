# Discovery — Unified Purchase + Inline Product Creation

**Status**: draft 1 (awaiting stakeholder review)
**Date**: 2026-05-15
**Master spec**: [food-inventory-admin/docs/PROMPT-UNIFIED-PURCHASE-PRODUCT-CREATION.md](../../food-inventory-admin/docs/PROMPT-UNIFIED-PURCHASE-PRODUCT-CREATION.md)
**Plan**: `~/.claude/plans/prompt-unified-cozy-mccarthy.md`
**Approved decisions**: see plan §Decisions locked in (2026-05-15) — defaults live in frontend, brand is truly required, first-creation confetti, master prompt at canonical path.

---

## One-page summary (read this first)

| Area | Risk | Why |
|---|---|---|
| `CreateProductDto` required fields beyond popup's 8 | 🟢 Green | Frontend builds full DTO with defaults; backend untouched. |
| `pricingRules` / `inventoryConfig` payload shape | 🟢 Green | Mirrored verbatim from [ProductsManagement.jsx:1365](../../food-inventory-admin/src/components/ProductsManagement.jsx#L1365) / `initialNewProductState` [:381](../../food-inventory-admin/src/components/ProductsManagement.jsx#L381). |
| Permission gate (`products_create`) | 🟢 Green | `useAuth().hasPermission('products_create')` already exists at [use-auth.jsx:470](../../food-inventory-admin/src/hooks/use-auth.jsx#L470). Underscore form, not colon. |
| Subsidiary tenant routing | 🟢 Green | [products.controller.ts:50-56](../../food-inventory-saas/src/modules/products/products.controller.ts#L50) `getCatalogTenantId()` routes subsidiary → parent transparently. No popup-side change needed. |
| SKU collision under concurrent popup creates | 🟢 Green | [products.service.ts:154-181](../../food-inventory-saas/src/modules/products/products.service.ts#L154) has `while (!isUnique)` retry on `findOne({sku, tenantId})`. |
| Deploy paths (Incident 2 lesson) | 🟢 Green | [simple-deploy.sh:259-271](../../simple-deploy.sh#L259) confirmed: rsync `package.json` to `~/smartkubik/api/`, `npm ci` in `~/smartkubik/api/`. Fix from `cbf12f623` present. |
| Mid-flow PO-failure orphan products | 🟢 Green (by design) | Plain `POST /products` is atomic; no inventory side-effect until PO is received. Orphan products = catalog entries with zero stock, inert. |
| `isPerishable` default per vertical | 🟢 Green | Heuristic locked: `(supportsLots === true && baseVertical === 'FOOD_SERVICE')`. Stakeholder confirmed 2026-05-15. |
| `taxCategory` default | 🟢 Green | Confirmed `'general'` at [ProductsManagement.jsx:344,2047,2078](../../food-inventory-admin/src/components/ProductsManagement.jsx#L344). Popup uses the same value. |
| `isSoldByWeight` default | 🟢 Green | Frontend defaults `false` regardless of vertical. Editable later in ProductsManagement. |
| `variants[0]` derivation | 🟢 Green | Built from popup state: `{ name: payload.name, unit: payload.baseUnit, unitSize: 1, basePrice: payload.sellingPrice, costPrice: 0, sku: undefined, barcode: undefined, images: [] }`. |
| Wiki `system-map.md` & `modules/products` update | ⚪ Out of phase | Phase 3 deliverable. |

**Verdict**: ready to enter Phase 1 once the two 🟡 rows are resolved with the stakeholder.

---

## Module 1 — Products

### `products.service.ts`

- [`create()` at :396-524](../../food-inventory-saas/src/modules/products/products.service.ts#L396) — accepts `CreateProductDto`, increments `tenant.usage.currentProducts` and `currentStorage`, checks `maxProducts` + `maxStorage` quotas, does **not** auto-create suppliers, does **not** emit events.
- [`createWithInitialPurchase()` at :183-394](../../food-inventory-saas/src/modules/products/products.service.ts#L183) — composite endpoint used today by `CompraNewProductDialog`. Creates Product → auto-creates supplier if `newSupplierName` set → creates PO → auto-receives PO → creates Inventory. **The unified popup deliberately does NOT use this path** (we want catalog entry only).
- [`generateSku(tenantId)` at :154-181](../../food-inventory-saas/src/modules/products/products.service.ts#L154) — format `<3 letters tenant upper>-<counter padded 4>` (e.g. `TBS-0001`). Strips non-alphanumerics, pads with `X` if too short. **Retry loop on `findOne({sku, tenantId})` guarantees uniqueness under concurrent creates.**

### `product.schema.ts` — required & defaults at HEAD

| Field | `required` | `default` |
|---|---|---|
| `sku` | unique (per tenant) | — (auto-gen if absent) |
| `name` | ✅ | — |
| `brand` | ✅ | — |
| `category` (array) | ✅ | — |
| `subcategory` (array) | ✅ | — |
| `isPerishable` | ✅ | — |
| `ivaApplicable` | ✅ | — |
| `taxCategory` | ✅ | — |
| `ivaRate` | — | **`16`** (set in `cb2bff762`) |
| `unitOfMeasure` | — | `"unidad"` |
| `isSoldByWeight` | — | `false` |
| `hasMultipleSellingUnits` | — | `false` |
| `igtfExempt` | — | `false` |
| `productType` | — | `ProductType.SIMPLE` |
| `tags`, `sellingUnits`, `suppliers` | — | `[]` |
| `shelfLifeUnit` | — | `'days'` |
| Variant `name`, `unit`, `unitSize`, `basePrice`, `costPrice` | ✅ | — |
| Variant `barcode` | — | — (optional) |
| Variant `images` | — | `[]` |
| Variant `isActive` | — | `true` |
| Variant `attributes` | — | `{}` |

### `CreateProductDto` — validation at HEAD ([product.dto.ts:347-596](../../food-inventory-saas/src/dto/product.dto.ts#L347))

**Note**: this is the DTO used by `POST /products` (the popup's target). It is **less strict** than `RichProductDataDto` in [composite.dto.ts:46-87](../../food-inventory-saas/src/dto/composite.dto.ts#L46) which is used by the legacy composite endpoint `POST /products-with-initial-purchase`. The popup uses the plain endpoint, so this table is authoritative.

| Field | Decorator | Notes |
|---|---|---|
| `sku` | `@IsOptional() @IsString()` | Auto-gen if absent |
| `name`, `brand` | `@IsString() @IsNotEmpty()` | Required |
| `category`, `subcategory` | `@IsArray() @IsString({each:true}) @IsNotEmpty({each:true})` | **Cannot be empty array** — frontend always sends non-empty |
| `taxCategory` | `@IsString() @IsNotEmpty()` | Required |
| `isPerishable` | `@IsBoolean()` | Required (no `@IsOptional`) |
| `unitOfMeasure` | `@IsOptional() @IsString()` | Optional — schema default `'unidad'` |
| `isSoldByWeight` | `@IsOptional() @IsBoolean()` | Optional — schema default `false` |
| `ivaApplicable` | `@IsOptional() @IsBoolean()` | Optional — schema default `true` |
| `ivaRate` | `@IsOptional() @IsNumber()` | Optional — schema default `16` (per `cb2bff762`) |
| `pricingRules`, `inventoryConfig` | `@IsObject()` | Required (no `@IsOptional`) — popup sends full objects per ProductsManagement convention |
| `variants[]` | `@IsArray() @ValidateNested @ArrayMinSize(1)` | At least one variant |

### Default-chain audit (8 popup fields × 6 sources)

| # | Popup field | Schema default | DTO validation | Controller fallback | Service mutation | Frontend `initialNewProductState` | Frontend "if blank" fallback | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | Nombre (`name`) | — | `@IsNotEmpty` | — | — | `''` | submit disabled | 🟢 coherent |
| 2 | Marca (`brand`) | — | `@IsNotEmpty` | — | — | `'Genérico'` (legacy, to remove) | submit disabled — no `'Genérico'` (per stakeholder) | 🟢 coherent after popup change |
| 3 | Precio de venta → `variants[0].basePrice` | — | `@IsNumber @Min(0)` | — | — | `0` | submit disabled if 0/blank | 🟢 coherent |
| 4 | Unidad base (`unitOfMeasure` + `variants[0].unit`) | `"unidad"` | required string | — | — | from `verticalConfig.defaultUnits[0]` | popup defaults to `verticalConfig.defaultUnits[0]` | 🟢 coherent |
| 5 | SKU (`sku`) | — (unique per tenant) | `@IsOptional` | — | `generateSku(tenantId)` if absent | `''` | popup sends `undefined` (not empty string) when blank | 🟢 coherent |
| 6 | Código de barras (`variants[0].barcode`) | — | `@IsOptional` (variant) | — | — | `''` | popup sends `undefined` when blank | 🟢 coherent |
| 7 | Categoría (`category[]`) | — | `@IsNotEmpty({each})` non-empty array | — | — | `[]` | popup sends `["Sin clasificar"]` when blank | 🟢 coherent — frontend always sends non-empty |
| 8 | Subcategoría (`subcategory[]`) | — | `@IsNotEmpty({each})` non-empty array | — | — | `[]` | popup sends `["General"]` when blank | 🟢 coherent — frontend always sends non-empty |

**Verdict**: zero red rows. The popup may proceed with the frontend-builds-full-DTO strategy; no backend DTO changes needed.

### Fields NOT in the popup but required by the DTO — popup-side defaults

| Field | Popup sends? | Value | Source / rationale |
|---|---|---|---|
| `taxCategory` | **Yes (required)** | `'general'` | Confirmed at [ProductsManagement.jsx:344](../../food-inventory-admin/src/components/ProductsManagement.jsx#L344) |
| `isPerishable` | **Yes (required)** | `(verticalConfig.inventory.supportsLots && verticalConfig.baseVertical === 'FOOD_SERVICE')` | Locked 2026-05-15 — see §isPerishable heuristic |
| `unitOfMeasure` | **Yes (popup field "Unidad base")** | from popup input | Same value also flows into `variants[0].unit` |
| `pricingRules` | **Yes (required)** | full object — see below | Copied from ProductsManagement |
| `inventoryConfig` | **Yes (required)** | full object — see below | Copied from ProductsManagement |
| `variants[]` | **Yes (required, min 1)** | single derived variant — see below | Built from popup state |
| `ivaApplicable` | No | — | Schema default `true` |
| `ivaRate` | No | — | Schema default `16` (per `cb2bff762`) |
| `isSoldByWeight` | No | — | Schema default `false` |
| `productType` | No | — | Schema default `'simple'` |

#### `pricingRules` (popup payload — mirrors [ProductsManagement.jsx:1365](../../food-inventory-admin/src/components/ProductsManagement.jsx#L1365))

```js
{
  cashDiscount: 0,
  cardSurcharge: 0,
  minimumMargin: 0.2,
  maximumDiscount: 0.5,
  bulkDiscountEnabled: false,
  bulkDiscountRules: [],
  wholesaleEnabled: false,
  wholesaleMinQuantity: 1,
}
```

#### `inventoryConfig` (popup payload — mirrors [ProductsManagement.jsx:381](../../food-inventory-admin/src/components/ProductsManagement.jsx#L381))

```js
{
  minimumStock: 10,
  maximumStock: 100,
  reorderPoint: 20,
  reorderQuantity: 50,
  trackLots: true,
  trackExpiration: true,
  fefoEnabled: true,
}
```

#### `variants[0]` (built from popup state)

```js
{
  name: popupState.name,            // primary variant inherits product name
  unit: popupState.baseUnit,        // same as unitOfMeasure
  unitSize: 1,
  basePrice: Number(popupState.sellingPrice),
  costPrice: 0,                     // PO line item carries the real cost
  sku: undefined,                   // auto-gen by backend
  barcode: popupState.barcode || undefined,
  images: [],
}
```

### §isPerishable heuristic — verified across all 6 verticals

[verticalProfiles.js](../../food-inventory-admin/src/config/verticalProfiles.js):

| Vertical key | `baseVertical` | `inventory.supportsLots` | Proposed `isPerishable` default |
|---|---|---|---|
| `food-service` | `FOOD_SERVICE` | `true` | **`true`** |
| `retail-fashion` | `RETAIL` | `false` | `false` |
| `retail-footwear` | `RETAIL` | `false` | `false` |
| `retail-hardware` | `RETAIL` | `false` | `false` |
| `retail-tech` | `RETAIL` | `false` | `false` |
| `retail-toys` | `RETAIL` | `false` | `false` |
| `manufacturing` | `MANUFACTURING` | `true` | `false` (lots track production batches, not expiration) |

Heuristic: `isPerishable = (verticalConfig.inventory.supportsLots && verticalConfig.baseVertical === 'FOOD_SERVICE')`. **Stakeholder to confirm** before Phase 2.

### §taxCategory — resolved

ProductsManagement uses `taxCategory: 'general'` at [ProductsManagement.jsx:344,2047,2078](../../food-inventory-admin/src/components/ProductsManagement.jsx#L344). Popup uses the same. ✅

---

## Module 2 — Suppliers (Customers with `customerType: 'supplier'`)

- [`customers.service.ts create()`](../../food-inventory-saas/src/modules/customers/customers.service.ts) dedups by `taxInfo.taxId`, generates `supplierNumber` via MAX+1 (`PROV-000001`).
- Contact array shape: `[{ type: "phone"|"email"|"whatsapp", value: string, isPrimary?: boolean }]`.
- Supplier→Product link is **unidirectional**: stored in `product.suppliers[]` ([product.schema.ts](../../food-inventory-saas/src/schemas/product.schema.ts)). Customer doc has no back-reference.
- **Unified flow does NOT touch suppliers in the popup**. The PO header carries the supplier; the popup creates the catalog entry only with `suppliers: []`. If the tenant wants a permanent supplier-product link, they add it later in ProductsManagement.

---

## Module 3 — Inventory

- Initial inventory is created during `purchases.receivePurchaseOrder()` → `inventoryService.addStockFromPurchase()` ([inventory.service.ts:1641-1816](../../food-inventory-saas/src/modules/inventory/inventory.service.ts#L1641)). Lookup is by `productId` first, SKU as fallback.
- **For the unified flow**: when the user creates 2 new products via popup and then saves the PO, the PO save goes through the same path as today — `POST /purchases` → status `pending` (NOT yet received). Inventory is only created when the PO is received (auto-received in `simple` mode after the rating dialog, or explicitly in `advanced` mode via Purchase History).
- **Orphan-product scenario**: if `POST /products` succeeds but the subsequent `POST /purchases` fails, the new products exist in the catalog with NO inventory and NO PO link. They're inert (no stock, no sales) and visible in ProductsManagement for the tenant to delete or reuse. ✅ matches stakeholder decision.
- [`getLowStockAlerts`](../../food-inventory-saas/src/modules/inventory/inventory.service.ts#L1353) and [`getExpirationAlerts`](../../food-inventory-saas/src/modules/inventory/inventory.service.ts#L1406) embed `productId.{variants, suppliers, isPerishable, inventoryConfig}` — widened in `8528fe6cc`. **Unified flow does not regress this** because we only touch product creation, not alerts.

---

## Module 4 — Purchase Orders / Compras

### Backend

- [`purchases.service.ts create()`](../../food-inventory-saas/src/modules/purchases/purchases.service.ts) — `CreatePurchaseOrderDto` accepts `items[]` of `{ productId, productName, productSku, variantId?, variantName?, variantSku?, quantity, costPrice, discount?, lotNumber?, expirationDate? }`. Min 1 item, supplier (existing id OR new with name+RIF+contacts).
- [PO number generator at :917](../../food-inventory-saas/src/modules/purchases/purchases.service.ts#L917) — `OC-YYMMDD-HHMMSS-XXXXXX`. **Not MAX+1** (as the prompt claimed). This deviates from [docs/wiki/patterns/sequential-number-races.md](../wiki/patterns/sequential-number-races.md) but is collision-safe by timestamp+random. **Do NOT touch.**
- Auth: `@UseGuards(JwtAuthGuard, TenantGuard)` ([purchases.controller.ts:21](../../food-inventory-saas/src/modules/purchases/purchases.controller.ts#L21)). Permission decorator: `purchase-orders_create` (verify in Phase 1).
- `receivePurchaseOrder()` flow at [:346-560](../../food-inventory-saas/src/modules/purchases/purchases.service.ts#L346) — validates status, for each item calls `inventoryService.addStockFromPurchase()`, calls `suppliersService.linkProductToSupplier()` (adds the PO's supplier to `product.suppliers[]`), updates PO status to "received", creates Payable(s).

### Frontend

- [`useComprasData.js`](../../food-inventory-admin/src/components/compras/useComprasData.js) — single hook owning all state. State slices:
  - `po` ([:38](../../food-inventory-admin/src/components/compras/useComprasData.js#L38)) — the in-progress PO. Items array, supplier info, payment terms, totals.
  - `newProduct` ([:32](../../food-inventory-admin/src/components/compras/useComprasData.js#L32)) — used by `CompraNewProductDialog`. **Plan deletes this slice in Phase 3.**
  - `suppliers` ([:40](../../food-inventory-admin/src/components/compras/useComprasData.js#L40)) — list for picker.
  - `variantSelection` ([:59](../../food-inventory-admin/src/components/compras/useComprasData.js#L59)) — drives the inline `InlineVariantPicker` already present in CompraCreateDialog.
- [`CompraCreateDialog.jsx`](../../food-inventory-admin/src/components/compras/CompraCreateDialog.jsx) — Sheet (right-side). Has a `SearchableSelect` for product lookup with `asyncSearch={true}`. Will be extended with `onCreateNewOption={(query) => openInlinePopup(query)}`. **Already supports nested overlays** (the `InlineVariantPicker` div at lines 87-144 is proof) — the popup can mount as a Radix Dialog child without contention.
- [`CompraNewProductDialog.jsx`](../../food-inventory-admin/src/components/compras/CompraNewProductDialog.jsx) — **kept** through Phase 2, **deleted** in Phase 3.
- [`SearchableSelect.jsx`](../../food-inventory-admin/src/components/orders/v2/custom/SearchableSelect.jsx) — receives new optional props `onCreateNewOption(query)` + `createNewOptionLabel(query) → string`. Existing `isCreatable`/`__isNew__` semantics preserved.

---

## Permissions — resolution path for the popup

### Backend

[products.controller.ts:87,101,118,227](../../food-inventory-saas/src/modules/products/products.controller.ts#L87) all use `@Permissions("products_create")` (underscore). Guard chain at class level: `@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)`.

### Frontend

[use-auth.jsx:452-468](../../food-inventory-admin/src/hooks/use-auth.jsx#L452) — `permissions` is derived from the JWT (`payload.role.permissions`) and normalized to a string array.

[use-auth.jsx:470-499](../../food-inventory-admin/src/hooks/use-auth.jsx#L470) — `hasPermission(name)` does **two checks**:
1. User's role includes the permission.
2. The tenant has the corresponding module enabled (`permissionToModule` map at :482).

For the popup gate:

```js
import { useAuth } from '@/hooks/use-auth.jsx';
const { hasPermission } = useAuth();
const canCreateProduct = hasPermission('products_create');
// hide the "+ Crear producto nuevo" row in SearchableSelect when !canCreateProduct
```

Note: `permissionTranslations.js:78` confirms the permission key is `products_create` (used for the Roles UI display).

---

## Subsidiary tenant routing

[products.controller.ts:50-56](../../food-inventory-saas/src/modules/products/products.controller.ts#L50):

```ts
private getCatalogTenantId(req: any): string {
  const tenant = req.tenant;
  if (tenant?.isSubsidiary && tenant?.parentTenantId) {
    return tenant.parentTenantId.toString();
  }
  return req.user.tenantId;
}
```

A subsidiary user calling `POST /products` from the popup will land in the parent's catalog automatically. **No popup-side changes needed.** Phase 1 e2e test should include this scenario.

---

## SKU collision under concurrent popup creates

[products.service.ts:154-181](../../food-inventory-saas/src/modules/products/products.service.ts#L154):

```ts
async generateSku(tenantId: string) {
  // ... build prefix ...
  let counter = await this.getNextCounter(tenantId);
  let sku = buildSku(prefix, counter);
  while (await this.productModel.findOne({ sku, tenantId })) {
    counter += 1;
    sku = buildSku(prefix, counter);
  }
  return sku;
}
```

Two near-simultaneous popup creates will not collide; the second one will hit the `findOne` check, increment the counter, and try again. The `tenant.usage.currentProducts` counter increments idempotently in the service, not in `generateSku`, so no double-counting either.

---

## Deploy + tooling side-effects (per Incident 2)

### `simple-deploy.sh` at HEAD

| Line | Action | Path |
|---|---|---|
| [:181](../../simple-deploy.sh#L181) | rsync `dist/` | `~/smartkubik/food-inventory-saas/dist/` (legacy mirror) |
| [:183](../../simple-deploy.sh#L183) | rsync `dist/` | **`~/smartkubik/api/dist/`** (PM2 runtime) |
| [:259-260](../../simple-deploy.sh#L259) | rsync `package.json` + `package-lock.json` | **`~/smartkubik/api/`** (PM2 runtime) |
| [:261-262](../../simple-deploy.sh#L261) | rsync `package.json` + `package-lock.json` | `~/smartkubik/food-inventory-saas/` (legacy mirror) |
| [:271](../../simple-deploy.sh#L271) | `npm ci --production --prefer-offline` | **`~/smartkubik/api/`** (PM2 runtime) ✅ Fix from `cbf12f623` present |
| [:277](../../simple-deploy.sh#L277) | `npm ci` mirror (best-effort) | `~/smartkubik/food-inventory-saas/` |
| [:343](../../simple-deploy.sh#L343) | `pm2 reload smartkubik-api` | invoked from legacy cwd, but `pm2 reload <name>` operates on PM2's process registry (not cwd), so harmless |

**Verdict**: 🟢 deploy path correct at HEAD. This work introduces no new backend dependencies, so no extra verification expected post-deploy beyond the standard checklist in the plan.

### Cron jobs / background imports

`grep -rn "product.schema" --include=*.ts --include=*.js outside dist/` returns only source-tree imports (`scripts/seed-restaurant.ts`, `scripts/debug-pricing.ts`, etc.) — all use `import ... from '../src/schemas/product.schema'`, not `require('./dist/...')`. ✅ no stale binary references.

### Ad-hoc scripts that touch Product model directly

[food-inventory-saas/scripts/](../../food-inventory-saas/scripts/):

- `simulate_tips_flow.ts` — instantiates `new productModel(...)` directly. Not affected (it doesn't POST to the API).
- `populate-savage-products.ts` — bulk insert via Mongoose. Not affected.
- `backup-and-migrate-products.ts` — migration script. Not affected.
- `migrate-products-to-variants.ts` — schema migration. Not affected.

**Verdict**: no script consumes the popup's payload shape. No regression risk.

---

## Six questions the prompt asked the discovery doc to answer

1. **Mid-flow failure recovery** — orphan products stay in catalog (decision) with zero inventory because plain `POST /products` doesn't create Inventory. ✅
2. **Tenant isolation** — `POST /products` hits `JwtAuthGuard + TenantGuard + PermissionsGuard`. No popup-side bypass. ✅
3. **Subsidiary tenants** — `getCatalogTenantId()` handles routing transparently. ✅
4. **Permission gating** — `hasPermission('products_create')` in the popup gate. Documented above. ✅
5. **Counter increment race** — `generateSku()` retry loop handles concurrent creates. `tenant.usage.currentProducts` increments inside the service (atomic). ✅
6. **Receive flow downstream** — when the unified PO is received, the popup-created products' inventory increments via the same `addStockFromPurchase()` path. No new branching. ✅

---

## Items still open before Phase 1 starts

All resolved 2026-05-15. **Phase 1 is cleared to start.**
