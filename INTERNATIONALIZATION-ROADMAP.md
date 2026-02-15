# SmartKubik SaaS — Internationalization Roadmap

> **Version:** 1.0
> **Date:** 2026-02-15
> **Status:** Planning Phase
> **Goal:** Extract Venezuela-specific logic into a pluggable country module system, enabling SmartKubik to operate in any country without hardcoded assumptions.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Snapshot](#2-current-architecture-snapshot)
3. [Venezuela Dependency Map](#3-venezuela-dependency-map)
4. [Target Architecture: Country Plugin System](#4-target-architecture-country-plugin-system)
5. [Interface Contracts (The 7 Boundaries)](#5-interface-contracts-the-7-boundaries)
6. [Implementation Phases](#6-implementation-phases)
7. [File-by-File Migration Registry](#7-file-by-file-migration-registry)
8. [Testing Strategy](#8-testing-strategy)
9. [Risk Matrix](#9-risk-matrix)
10. [Glossary](#10-glossary)

---

## 1. Executive Summary

SmartKubik is a multi-tenant SaaS for food service, retail, and hospitality management. It was built for the Venezuelan market and contains **deep, structural assumptions** about Venezuela's fiscal system, currency model, payment infrastructure, and tax authority (SENIAT).

This roadmap defines a **Strangler Fig migration** to extract all country-specific logic into a pluggable system where:

- Venezuela becomes the **first plugin**, not the default
- The **base software is country-agnostic**
- Each tenant selects a country during onboarding
- Country plugins define: taxes, currencies, payment methods, fiscal identity, e-invoicing, document types, and locale

### Scope of Venezuela Embedding

| Depth Level | Count | Examples |
|------------|-------|---------|
| **Deep business logic** | ~15 areas | IVA 16%, IGTF 3%, SENIAT validation, BCV rate, Imprenta Digital, withholdings |
| **Moderate embedding** | ~10 areas | RIF validation, payment methods (Pago Movil, Zelle), cash denominations, document types |
| **Surface level** | ~500+ strings | Spanish UI labels, error messages, landing page copy |

---

## 2. Current Architecture Snapshot

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend (Admin)** | React 18 + Vite + React Router v7 | `food-inventory-admin/` |
| **Backend** | NestJS + MongoDB (Mongoose) + BullMQ + Redis | `food-inventory-saas/` |
| **Storefront** | Next.js | `food-inventory-storefront/` |
| **Styling** | Tailwind CSS v4 + Shadcn/ui + Radix UI + Framer Motion | — |
| **Forms** | React Hook Form + Zod | — |
| **Real-time** | Socket.IO | — |
| **Auth** | JWT + Passport | — |
| **State Mgmt** | Context API (6 providers, no Redux) | — |

### Backend Module Count

The NestJS backend has **70+ modules** organized under `src/modules/`:

```
accounting, activities, analytics, appointments, assistant, audit-log,
bank-accounts, bank-reconciliation, bill-splits, billing, binance-pay,
calendars, cash-register, commissions, consumables, core, coupons,
customers, dashboard, data-import, delivery, drivers, events,
exchange-rate, feature-flags, fixed-assets, food_retail, health,
hospitality-integrations, inventory, investments, kitchen-display,
knowledge-base, liquidations, locations, loyalty, mail, marketing,
memberships, menu-engineering, notifications, notification-center,
opportunities, opportunity-stages, opportunity-ingest, payroll-*,
playbooks, price-lists, production, quality-control, reminders,
reviews, security-monitoring, server-performance, tenant-payment-config,
transaction-history, uploads, wait-list, warehouses, waste, ...
```

### Multi-Tenancy Pattern

```
Request → JwtAuthGuard → TenantGuard → PermissionsGuard → Controller → Service
                              ↓
                     Validates tenant status
                     Checks subscription expiry
                     Attaches req.tenant
                              ↓
                     Every query: { tenantId, ...filters }
                     Every schema: tenantId: string (indexed)
```

### Tenant Schema (Key Fields for Internationalization)

```typescript
// Already exists in tenant.schema.ts
Tenant {
  name: string
  vertical: "FOOD_SERVICE" | "RETAIL" | "SERVICES" | "LOGISTICS" | "HYBRID" | "MANUFACTURING"
  timezone: string           // default: "America/Caracas" ← HARDCODED
  language: string           // default: "es" ← HARDCODED
  taxInfo: {
    rif: string              // ← Venezuela-specific
    businessName: string
    taxRegime: string
    // ... more VE-specific fields
  }
  settings: {
    currency: { primary, secondary, exchangeRateSource, autoUpdate }
    taxes: { ivaRate, igtfRate, retentionRates }  // ← Venezuela-specific
    inventory: { ... }
    orders: { ... }
    paymentMethods: [...]     // ← Venezuela-specific methods
    billingPreferences: { ... }
  }
  enabledModules: { ... }
  featureFlags: Record<string, boolean>
  verticalProfile: { key, overrides }
}
```

### Frontend Key Files

| File | Purpose | VE-Specific? |
|------|---------|-------------|
| `src/hooks/use-auth.jsx` | Auth context, tenant context, permissions | No |
| `src/hooks/useExchangeRate.js` | Fetches BCV rate | **YES** — hardcoded to `/exchange-rate/bcv` |
| `src/hooks/useVenezuela.js` | Venezuelan states/cities | **YES** — entire hook is VE-only |
| `src/lib/currency-config.js` | Currency symbols/formatters | **YES** — `isVesMethod()` function |
| `src/lib/venezuela-data.js` | Venezuelan states/municipalities | **YES** — entire file is VE data |
| `src/lib/api.js` | API client wrapper | Partially — SENIAT endpoints |
| `src/lib/pdfGenerator.js` | Invoice/receipt PDF generation | **YES** — RIF, control numbers |
| `src/components/PaymentMethodsSettings.jsx` | Payment config UI | **YES** — 9 VE methods hardcoded |
| `src/components/SettingsPage.jsx` | Tenant settings | **YES** — RIF, contribuyente especial |
| `src/components/billing/BillingDrawer.jsx` | Invoice creation | **YES** — IVA 16%, IGTF 3%, nota de entrega |
| `src/components/orders/v2/PaymentDialogV2.jsx` | Payment processing | **YES** — IGTF calculation per method |
| `src/components/cash-register/DenominationCounter.jsx` | Cash counting | **YES** — VES/USD bills |

---

## 3. Venezuela Dependency Map

### Visual: Where Venezuela Lives in the Code

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                           │
│                                                                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │   billing/              │  │   exchange-rate/                 │  │
│  │   ├─ billing.service    │  │   └─ BCV endpoint hardcoded     │  │
│  │   ├─ numbering.service  │  │                                  │  │
│  │   ├─ imprenta-digital   │  ├──────────────────────────────────┤  │
│  │   │  .provider ★★★      │  │   schemas/                      │  │
│  │   └─ sales-book.service │  │   ├─ tenant (timezone, lang)    │  │
│  │       (missing!)        │  │   ├─ billing-document (types)   │  │
│  └─────────────────────────┘  │   ├─ billing-evidence (RIF)     │  │
│                                │   ├─ document-sequence          │  │
│  ┌─────────────────────────┐  │   │   (sucursal, caja,          │  │
│  │   accounting/           │  │   │    machine_fiscal)           │  │
│  │   ├─ IVA withholding    │  │   └─ imprenta-credential        │  │
│  │   ├─ ISLR withholding   │  └──────────────────────────────────┘  │
│  │   └─ Sales book (VE)    │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                             │
│                                                                     │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  BILLING           │  │  ORDERS           │  │  SETTINGS        │  │
│  │  ├─ BillingDrawer  │  │  ├─ PaymentDialog │  │  ├─ SettingsPage │  │
│  │  │   IVA 16% ★     │  │  │   IGTF 3% ★   │  │  │   RIF ★       │  │
│  │  │   IGTF 3% ★     │  │  │   isVesMethod  │  │  │   Contr.Esp.  │  │
│  │  │   Nota Entrega   │  │  ├─ MixedPayment │  │  │   Withholding │  │
│  │  │   BCV rate       │  │  │   IGTF calc    │  │  ├─ PaymentMeth │  │
│  │  ├─ BillingCreate  │  │  ├─ OrderSidebar  │  │  │   Settings    │  │
│  │  │   VES default    │  │  │   IGTF display │  │  │   9 VE methods│  │
│  │  ├─ BillingSeq.Mgr │  │  └─ OrderDetails  │  │  └──────────────│  │
│  │  └─ BillingDocDet. │  │     IGTF display   │  │                  │  │
│  │     SENIAT valid.   │  └──────────────────┘  │  ┌──────────────┐  │
│  └───────────────────┘                           │  │  ACCOUNTING   │  │
│                                                   │  │  ├─ E-Invoice │  │
│  ┌───────────────────┐  ┌──────────────────┐     │  │  │  SENIAT ★  │  │
│  │  HOOKS             │  │  LIB              │    │  │  ├─ IVA Dec. │  │
│  │  ├─ useVenezuela   │  │  ├─ venezuela-data│    │  │  ├─ IVA With │  │
│  │  ├─ useExchangeRate│  │  ├─ currency-conf │    │  │  └─ ISLR With│  │
│  │  │   BCV endpoint  │  │  │   isVesMethod  │    │  └──────────────┘  │
│  │  └─ useFeatureFlags│  │  └─ pdfGenerator  │    │                     │
│  └───────────────────┘  │     RIF, ctrl num   │    │  ┌──────────────┐  │
│                          └──────────────────┘     │  │  CASH REG.    │  │
│                                                    │  │  └─ Denom.    │  │
│                                                    │  │    Counter    │  │
│                                                    │  │    VES/USD ★  │  │
│                                                    │  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

★ = Deep Venezuela dependency (business logic, not just strings)
```

---

## 4. Target Architecture: Country Plugin System

### Design Principle

```
Before: Venezuela IS the software
After:  Venezuela is a PLUGIN that the software loads
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMARTKUBIK BASE SOFTWARE                     │
│                                                                 │
│  Core Modules: inventory, orders, customers, appointments,      │
│  recipes, production, CRM, payroll, analytics, delivery, etc.   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              COUNTRY PLUGIN INTERFACE LAYER                │  │
│  │                                                           │  │
│  │  TaxEngine ─── CurrencyEngine ─── PaymentEngine           │  │
│  │  FiscalIdentity ─── EInvoiceProvider ─── DocumentTypes     │  │
│  │  LocaleProvider                                            │  │
│  └───────────────┬───────────────┬───────────────┬───────────┘  │
│                  │               │               │              │
│         ┌────────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐       │
│         │  VE Plugin    │ │  CO Plugin │ │  MX Plugin │       │
│         │  venezuela/   │ │  colombia/ │ │  mexico/   │       │
│         │               │ │            │ │            │       │
│         │  IVA 16%      │ │  IVA 19%   │ │  IVA 16%   │       │
│         │  IGTF 3%      │ │  Ret.ICA   │ │  IEPS      │       │
│         │  SENIAT       │ │  DIAN      │ │  SAT/CFDI  │       │
│         │  RIF (J/V/E/G)│ │  NIT/CC/CE │ │  RFC       │       │
│         │  BCV          │ │  TRM       │ │  Banxico   │       │
│         │  PagoMóvil    │ │  Nequi/PSE │ │  SPEI/CoDi │       │
│         │  VES+USD      │ │  COP+USD   │ │  MXN       │       │
│         └───────────────┘ └────────────┘ └────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Resolution Flow

```
1. Tenant onboarding → select country (e.g., "VE")
2. Backend stores: tenant.countryCode = "VE"
3. On every request:
   TenantGuard loads tenant → attaches tenant.countryCode
   CountryPluginService.resolve(tenant.countryCode) → VenezuelaPlugin
4. Business logic calls:
   plugin.taxEngine.getDefaultTaxes() → [{type:"IVA", rate:16}, ...]
   plugin.paymentEngine.getMethods() → [{id:"pago_movil_ves", ...}]
5. Frontend:
   useCountryPlugin() hook → returns plugin config for current tenant
   Components render dynamically based on plugin response
```

---

## 5. Interface Contracts (The 7 Boundaries)

These are the **exact boundaries** where we "cut" Venezuela out of the base software.

### 5.1 TaxEngine

```typescript
// 📁 backend: src/country-plugins/interfaces/tax-engine.interface.ts
// Purpose: All tax calculation logic per country
// Used by: BillingService, OrderService, AccountingModule

interface TaxEngine {
  /** Default taxes applied to line items (e.g., IVA) */
  getDefaultTaxes(): TaxDefinition[];

  /** Transaction-level taxes based on payment method (e.g., IGTF) */
  getTransactionTaxes(context: TransactionTaxContext): TaxDefinition[];

  /** Withholding rules for purchases/sales */
  getWithholdingRules(): WithholdingRule[];

  /** Document types exempt from standard taxes */
  getExemptDocumentTypes(): string[];

  /** Calculate tax for a specific line item */
  calculateLineTax(item: TaxableItem, taxes: TaxDefinition[]): TaxResult;

  /** Calculate total taxes for a document */
  calculateDocumentTaxes(document: TaxableDocument): DocumentTaxResult;
}

interface TaxDefinition {
  type: string;           // "IVA", "IGTF", "ICA", "IEPS", etc.
  rate: number;           // 16, 3, 19, etc.
  name: string;           // Human-readable name
  appliesTo: string[];    // ["products", "services", "foreign_currency"]
  isTransactional: boolean; // true for IGTF (applies per payment, not per item)
}

interface TransactionTaxContext {
  paymentMethodId: string;
  currency: string;
  amount: number;
}

interface WithholdingRule {
  type: string;           // "IVA_WITHHOLDING", "ISLR_WITHHOLDING"
  rate: number;
  conditions: {
    taxpayerType?: string;  // "special", "ordinary"
    threshold?: number;
  };
}
```

**Venezuela Implementation:**
- `getDefaultTaxes()` → `[{type: "IVA", rate: 16}]`
- `getTransactionTaxes()` → `[{type: "IGTF", rate: 3}]` if payment is in USD
- `getExemptDocumentTypes()` → `["delivery_note"]`
- `getWithholdingRules()` → IVA 75%/100% for contribuyente especial, ISLR rules

### 5.2 FiscalIdentity

```typescript
// 📁 backend: src/country-plugins/interfaces/fiscal-identity.interface.ts
// Purpose: Tax ID validation, formatting, and types per country
// Used by: CustomerService, BillingService, ComprasManagement

interface FiscalIdentity {
  /** Available tax ID types for this country */
  getIdTypes(): FiscalIdType[];

  /** Validate a tax ID string */
  validate(taxId: string, type?: string): ValidationResult;

  /** Format a tax ID for display */
  format(taxId: string, type?: string): string;

  /** Parse a raw tax ID into components */
  parse(rawInput: string): ParsedFiscalId;

  /** Get the label for the tax ID field (e.g., "RIF", "NIT", "RFC") */
  getFieldLabel(): string;
}

interface FiscalIdType {
  code: string;       // "J", "V", "E", "G" (VE) | "NIT", "CC", "CE" (CO)
  name: string;       // "Jurídica", "Venezolano" | "NIT", "Cédula"
  pattern: RegExp;    // Validation regex
  example: string;    // "J-12345678-9"
}
```

**Venezuela Implementation:**
- `getIdTypes()` → `[{code:"J", name:"Jurídica"}, {code:"V", name:"Venezolano"}, {code:"E", name:"Extranjero"}, {code:"G", name:"Gobierno"}]`
- `validate("J-12345678-9")` → `{valid: true, type: "J"}`
- `getFieldLabel()` → `"RIF"`

### 5.3 CurrencyEngine

```typescript
// 📁 backend: src/country-plugins/interfaces/currency-engine.interface.ts
// Purpose: Currency configuration, exchange rates, and formatting
// Used by: All financial modules, useExchangeRate hook

interface CurrencyEngine {
  /** Primary currency for this country */
  getPrimaryCurrency(): CurrencyDefinition;

  /** Additional currencies accepted (e.g., USD in Venezuela) */
  getSecondaryCurrencies(): CurrencyDefinition[];

  /** Exchange rate source configuration */
  getExchangeRateConfig(): ExchangeRateConfig | null;

  /** Physical bill denominations for cash counting */
  getDenominations(currencyCode: string): number[];

  /** Whether exchange rate is user-modifiable */
  isExchangeRateEditable(): boolean;
}

interface CurrencyDefinition {
  code: string;       // "VES", "USD", "COP"
  symbol: string;     // "Bs", "$", "$"
  name: string;       // "Bolívar", "Dólar", "Peso"
  decimals: number;   // 2
}

interface ExchangeRateConfig {
  source: string;         // "BCV", "TRM", "BANXICO", "manual"
  endpoint?: string;      // "/exchange-rate/bcv"
  refreshIntervalMs: number; // 3600000
  isEditable: boolean;    // false for BCV (compliance)
}
```

**Venezuela Implementation:**
- `getPrimaryCurrency()` → `{code:"VES", symbol:"Bs", name:"Bolívar", decimals:2}`
- `getSecondaryCurrencies()` → `[{code:"USD", symbol:"$", name:"Dólar", decimals:2}]`
- `getExchangeRateConfig()` → `{source:"BCV", endpoint:"/exchange-rate/bcv", refreshIntervalMs:3600000, isEditable:false}`
- `getDenominations("VES")` → `[500, 200, 100, 50, 20, 10, 5]`
- `isExchangeRateEditable()` → `false`

### 5.4 PaymentEngine

```typescript
// 📁 backend: src/country-plugins/interfaces/payment-engine.interface.ts
// Purpose: Available payment methods and their behavior
// Used by: PaymentDialogV2, MixedPaymentDialog, PaymentMethodsSettings

interface PaymentEngine {
  /** All available payment methods for this country */
  getAvailableMethods(): PaymentMethodDefinition[];

  /** Whether a payment method triggers additional taxes */
  triggersAdditionalTax(methodId: string): boolean;

  /** Extra fields required for a specific payment method */
  getMethodFields(methodId: string): PaymentMethodField[];

  /** Whether global payment gateways are available */
  supportsGlobalGateways(): boolean;

  /** Available global gateways (Stripe, PayPal, etc.) */
  getGlobalGateways(): PaymentGateway[];
}

interface PaymentMethodDefinition {
  id: string;           // "pago_movil_ves", "nequi_cop", "spei_mxn"
  name: string;         // "Pago Móvil (VES)"
  currency: string;     // "VES", "USD", "COP"
  category: string;     // "cash", "transfer", "mobile", "card", "gateway"
  igtfApplicable?: boolean; // VE-specific, handled by TaxEngine
  fields: PaymentMethodField[];
}

interface PaymentMethodField {
  key: string;          // "bank", "phone", "reference"
  label: string;        // "Banco", "Teléfono"
  type: "text" | "select" | "phone";
  required: boolean;
  options?: { value: string; label: string }[]; // For selects
}
```

**Venezuela Implementation:**
- 9 methods: efectivo_usd, efectivo_ves, transferencia_usd, transferencia_ves, zelle_usd, pago_movil_ves, pos_ves, tarjeta_ves, pago_mixto
- `triggersAdditionalTax("zelle_usd")` → `true` (IGTF)
- `triggersAdditionalTax("pago_movil_ves")` → `false`
- `supportsGlobalGateways()` → `false`

### 5.5 EInvoiceProvider

```typescript
// 📁 backend: src/country-plugins/interfaces/e-invoice-provider.interface.ts
// Purpose: Electronic invoicing per fiscal authority
// Used by: BillingService, ElectronicInvoicesManager

interface EInvoiceProvider {
  /** Whether this country requires electronic invoicing */
  isRequired(): boolean;

  /** Validate a document before submission */
  validateDocument(doc: BillingDocument): EInvoiceValidationResult;

  /** Submit document to fiscal authority */
  submitDocument(doc: BillingDocument): Promise<EInvoiceSubmissionResult>;

  /** Request a control/authorization number */
  requestControlNumber(payload: ControlNumberRequest): Promise<ControlNumberResponse>;

  /** Generate XML/JSON in the fiscal authority's format */
  generateFiscalFormat(doc: BillingDocument): string;

  /** Get the fiscal authority name for display */
  getAuthorityName(): string;

  /** Get the fiscal authority logo/branding */
  getAuthorityBranding(): { name: string; abbreviation: string; verificationUrl?: string };
}
```

**Venezuela Implementation:**
- `isRequired()` → `true`
- `getAuthorityName()` → `"SENIAT"`
- `getAuthorityBranding()` → `{name: "Servicio Nacional Integrado de Administración Aduanera y Tributaria", abbreviation: "SENIAT", verificationUrl: "https://..."}`
- `requestControlNumber()` → delegates to `ImprentaDigitalProvider`

### 5.6 DocumentTypes

```typescript
// 📁 backend: src/country-plugins/interfaces/document-types.interface.ts
// Purpose: Available fiscal document types and numbering rules
// Used by: BillingModule, NumberingService

interface DocumentTypes {
  /** Available document types */
  getTypes(): DocumentTypeDefinition[];

  /** Available billing channels */
  getChannels(): BillingChannel[];

  /** Numbering scope options */
  getNumberingScopes(): NumberingScope[];

  /** Numbering rules per document type */
  getNumberingRules(documentType: string): NumberingRule;
}

interface DocumentTypeDefinition {
  code: string;         // "invoice", "credit_note", "delivery_note"
  name: string;         // Localized name
  hasTaxes: boolean;    // delivery_note → false
  requiresControlNumber: boolean;
  requiresFiscalId: boolean;
}

interface BillingChannel {
  code: string;         // "digital", "machine_fiscal", "contingency"
  name: string;
}

interface NumberingScope {
  code: string;         // "tenant", "sucursal", "caja"
  name: string;
}
```

### 5.7 LocaleProvider

```typescript
// 📁 backend: src/country-plugins/interfaces/locale-provider.interface.ts
// Purpose: Localization data (language, timezone, geography, formatting)
// Used by: All UI components, PDF generation, date formatting

interface LocaleProvider {
  /** Default language code */
  getLanguage(): string;              // "es-VE", "es-CO", "es-MX", "en-US"

  /** Default timezone */
  getTimezone(): string;              // "America/Caracas", "America/Bogota"

  /** Phone country code */
  getPhonePrefix(): string;           // "+58", "+57", "+52"

  /** Administrative divisions (states, departments, provinces) */
  getAdminDivisions(): AdminDivision[];

  /** Label for admin divisions */
  getAdminDivisionLabel(): string;    // "Estado", "Departamento", "Estado"

  /** Date format preference */
  getDateFormat(): string;            // "dd/MM/yyyy"

  /** Number format locale */
  getNumberLocale(): string;          // "es-VE", "es-CO"
}

interface AdminDivision {
  code: string;
  name: string;
  subdivisions?: { code: string; name: string }[];
}
```

---

## 6. Implementation Phases

### Phase 0: Preparation (Week 1)

**Goal:** Set up infrastructure without touching existing logic.

#### 0.1 Create Plugin Directory Structure

```
📁 backend: src/country-plugins/
Purpose: Root directory for country plugin system
Depends on: nothing
Used by: AppModule, all business modules

src/country-plugins/
├── interfaces/
│   ├── tax-engine.interface.ts
│   ├── fiscal-identity.interface.ts
│   ├── currency-engine.interface.ts
│   ├── payment-engine.interface.ts
│   ├── e-invoice-provider.interface.ts
│   ├── document-types.interface.ts
│   ├── locale-provider.interface.ts
│   └── country-plugin.interface.ts       # Aggregates all 7
├── country-plugin.module.ts              # NestJS dynamic module
├── country-plugin.service.ts             # Plugin resolver
├── plugins/
│   └── venezuela/
│       ├── ve-tax-engine.ts
│       ├── ve-fiscal-identity.ts
│       ├── ve-currency-engine.ts
│       ├── ve-payment-engine.ts
│       ├── ve-e-invoice-provider.ts
│       ├── ve-document-types.ts
│       ├── ve-locale-provider.ts
│       ├── ve-plugin.ts                  # Aggregator
│       └── data/
│           ├── ve-states.json            # From venezuela-data.js
│           └── ve-banks.json
└── registry.ts                           # Country → Plugin mapping
```

```
📁 frontend: src/country-plugins/
Purpose: Frontend plugin system
Depends on: useAuth (for tenant.countryCode)
Used by: All billing/payment/tax components

src/country-plugins/
├── interfaces.ts                         # TypeScript interfaces
├── useCountryPlugin.js                   # React hook
├── CountryPluginContext.jsx              # Context provider
├── plugins/
│   └── venezuela/
│       ├── index.js                      # VE plugin aggregator
│       ├── ve-tax-config.js
│       ├── ve-payment-methods.js
│       ├── ve-currency-config.js
│       ├── ve-fiscal-identity.js
│       └── ve-locale.js
└── registry.js                           # Country → Plugin mapping
```

#### 0.2 Add `countryCode` to Tenant Schema

```typescript
// File: src/schemas/tenant.schema.ts
// ADD (non-breaking, nullable with default):
@Prop({ type: String, default: 'VE' })
countryCode: string;  // ISO 3166-1 alpha-2
```

#### 0.3 Database Migration

```typescript
// File: src/database/migrations/add-country-code.migration.ts
// Set all existing tenants to 'VE'
db.tenants.updateMany(
  { countryCode: { $exists: false } },
  { $set: { countryCode: 'VE' } }
);
```

#### 0.4 Tests: Parity Validation

```typescript
// File: test/country-plugins/ve-parity.spec.ts
// Purpose: Ensure VE plugin produces IDENTICAL results to current hardcoded logic
// This is the MOST CRITICAL test suite — it guarantees zero regression

describe('Venezuela Plugin Parity', () => {
  it('IVA calculation matches hardcoded 16%', () => { ... });
  it('IGTF on USD payment matches hardcoded 3%', () => { ... });
  it('Delivery note has zero taxes', () => { ... });
  it('RIF validation matches current regex', () => { ... });
  it('Payment methods match current BASE_PAYMENT_METHODS', () => { ... });
  it('Cash denominations match current DENOMINATIONS', () => { ... });
});
```

---

### Phase 1: Backend Plugin System (Weeks 2-3)

**Goal:** Create the plugin interfaces and Venezuela implementation. Wire them into services WITHOUT changing behavior.

#### Step 1.1: Define All 7 Interfaces

Create the TypeScript interfaces from Section 5 in `src/country-plugins/interfaces/`.

#### Step 1.2: Implement VenezuelaPlugin

Wrap current hardcoded values into the Venezuela plugin classes. This is a **pure extraction** — no new logic, just moving existing constants and calculations into the plugin structure.

#### Step 1.3: Create CountryPluginService

```typescript
// 📁 src/country-plugins/country-plugin.service.ts
// Purpose: Resolves the correct plugin for a tenant
// Depends on: Plugin registry, Tenant schema
// Used by: All business services

@Injectable()
export class CountryPluginService {
  private plugins: Map<string, CountryPlugin>;

  constructor() {
    this.plugins = new Map([
      ['VE', new VenezuelaPlugin()],
      // Future: ['CO', new ColombiaPlugin()],
    ]);
  }

  resolve(countryCode: string): CountryPlugin {
    const plugin = this.plugins.get(countryCode);
    if (!plugin) {
      throw new Error(`No plugin registered for country: ${countryCode}`);
    }
    return plugin;
  }
}
```

#### Step 1.4: Wire into BillingService (First Integration Point)

```typescript
// Before:
const tax = item.taxRate; // hardcoded 16

// After:
const plugin = this.countryPluginService.resolve(tenant.countryCode);
const defaultTaxes = plugin.taxEngine.getDefaultTaxes();
const tax = defaultTaxes[0].rate; // Still 16 for VE tenants
```

#### Step 1.5: Wire into Remaining Backend Services

- `NumberingService` → uses `plugin.documentTypes.getNumberingScopes()`
- `ImprentaDigitalProvider` → wrapped by `plugin.eInvoiceProvider`
- `ExchangeRateModule` → uses `plugin.currencyEngine.getExchangeRateConfig()`

---

### Phase 2: Frontend Plugin System (Weeks 3-4)

**Goal:** Create frontend hooks and context that components use instead of hardcoded values.

#### Step 2.1: Create CountryPluginContext

```javascript
// 📁 src/country-plugins/CountryPluginContext.jsx
// Purpose: Provides country plugin to all components
// Depends on: useAuth (tenant.countryCode)
// Used by: All billing/payment/tax components

const CountryPluginContext = createContext(null);

export function CountryPluginProvider({ children }) {
  const { tenant } = useAuth();
  const plugin = useMemo(
    () => resolvePlugin(tenant?.countryCode || 'VE'),
    [tenant?.countryCode]
  );

  return (
    <CountryPluginContext.Provider value={plugin}>
      {children}
    </CountryPluginContext.Provider>
  );
}

export function useCountryPlugin() {
  const ctx = useContext(CountryPluginContext);
  if (!ctx) throw new Error('useCountryPlugin must be inside CountryPluginProvider');
  return ctx;
}
```

#### Step 2.2: Refactor useExchangeRate

```javascript
// Before:
const response = await fetchApi('/exchange-rate/bcv');

// After:
const { currencyEngine } = useCountryPlugin();
const config = currencyEngine.getExchangeRateConfig();
if (config) {
  const response = await fetchApi(config.endpoint);
  // ... same logic
}
```

#### Step 2.3: Refactor Payment Components

```javascript
// Before (PaymentMethodsSettings.jsx):
const BASE_PAYMENT_METHODS = [
  { id: "efectivo_usd", name: "Efectivo (USD)", igtfApplicable: true },
  ...
];

// After:
const { paymentEngine } = useCountryPlugin();
const BASE_PAYMENT_METHODS = paymentEngine.getAvailableMethods();
```

#### Step 2.4: Refactor BillingDrawer and Order Components

Replace all hardcoded `16`, `3`, `"IVA"`, `"IGTF"` references with plugin calls.

#### Step 2.5: Refactor DenominationCounter

```javascript
// Before:
const DENOMINATIONS = { USD: [100,50,...], VES: [500,200,...] };

// After:
const { currencyEngine } = useCountryPlugin();
const DENOMINATIONS = {};
[currencyEngine.getPrimaryCurrency(), ...currencyEngine.getSecondaryCurrencies()]
  .forEach(c => { DENOMINATIONS[c.code] = currencyEngine.getDenominations(c.code); });
```

---

### Phase 3: i18n — Internationalization of Strings (Weeks 4-5)

**Goal:** Extract all hardcoded Spanish strings into translation files.

#### Step 3.1: Install i18n Infrastructure

```bash
# Frontend
npm install react-i18next i18next i18next-browser-languagedetector

# Backend
npm install nestjs-i18n
```

#### Step 3.2: Create Translation File Structure

```
frontend: src/locales/
├── es/
│   ├── common.json        # Shared labels (Guardar, Cancelar, etc.)
│   ├── billing.json       # Billing-specific strings
│   ├── orders.json        # Order-specific strings
│   ├── settings.json      # Settings page strings
│   ├── accounting.json    # Accounting strings
│   └── errors.json        # Error messages
├── en/
│   ├── common.json
│   ├── billing.json
│   └── ...
└── pt/
    └── ...
```

#### Step 3.3: Extract Strings (Systematic)

This is the most labor-intensive but lowest-risk task. Approach:

1. Start with `BillingDrawer.jsx` (highest VE string density)
2. Move to `SettingsPage.jsx`
3. Then `PaymentDialogV2.jsx`, `OrderProcessingDrawer.jsx`
4. Then all remaining components
5. Backend error messages last

**Pattern:**
```javascript
// Before:
<span>IGTF (3%):</span>

// After:
<span>{t('billing.igtf_label', { rate: plugin.taxEngine.getTransactionTaxes(...)[0]?.rate })}</span>

// es/billing.json:
{ "igtf_label": "IGTF ({{rate}}%):" }
```

#### Step 3.4: Backend Error Messages

```typescript
// Before:
throw new Error('No se pudo incrementar la secuencia');

// After:
throw new Error(this.i18n.t('billing.SEQUENCE_INCREMENT_FAILED'));
```

---

### Phase 4: Onboarding Flow Update (Week 5)

**Goal:** Add country selection to tenant onboarding.

#### Step 4.1: Update Registration/Onboarding Form

Add a country selector as **Step 1** of onboarding:

```javascript
<CountrySelector
  countries={getAvailableCountries()} // Initially just VE
  onChange={(code) => setCountryCode(code)}
/>
```

The country selection determines:
- Which fiscal fields to show (RIF vs NIT vs RFC)
- Default currency
- Default timezone
- Default payment methods
- Tax configuration

#### Step 4.2: Update Tenant Creation API

```typescript
// Backend: POST /tenants
async createTenant(dto: CreateTenantDto) {
  const plugin = this.countryPluginService.resolve(dto.countryCode);

  return this.tenantModel.create({
    ...dto,
    countryCode: dto.countryCode,
    timezone: plugin.localeProvider.getTimezone(),
    language: plugin.localeProvider.getLanguage(),
    settings: {
      currency: {
        primary: plugin.currencyEngine.getPrimaryCurrency().code,
      },
      taxes: {
        // Pre-populated from plugin defaults
      },
    },
  });
}
```

---

### Phase 5: Parity Validation & Cleanup (Week 6)

**Goal:** Ensure 100% behavioral parity with pre-migration code, then remove legacy code.

#### Step 5.1: Run Full Parity Test Suite

```bash
# Run parity tests
npm run test -- --testPathPattern=ve-parity

# Run full integration tests
npm run test:e2e
```

#### Step 5.2: Shadow Mode (Optional but Recommended)

For 1-2 weeks, run both old and new code paths in parallel:

```typescript
async calculateTax(item, tenant) {
  // New path
  const newResult = this.pluginCalculation(item, tenant);

  // Old path (shadow)
  const oldResult = this.legacyCalculation(item);

  // Log discrepancies
  if (newResult !== oldResult) {
    this.logger.warn('TAX_PARITY_MISMATCH', { newResult, oldResult, item });
  }

  return newResult; // Use new path
}
```

#### Step 5.3: Remove Legacy Code

Once parity is confirmed:

- [ ] Delete `src/hooks/useVenezuela.js` (replaced by `useCountryPlugin`)
- [ ] Delete `src/lib/venezuela-data.js` (moved to `ve-locale.js`)
- [ ] Delete `isVesMethod()` from `currency-config.js` (replaced by `paymentEngine`)
- [ ] Remove hardcoded `BASE_PAYMENT_METHODS` from `PaymentMethodsSettings.jsx`
- [ ] Remove hardcoded `DENOMINATIONS` from `DenominationCounter.jsx`
- [ ] Remove hardcoded `16` and `3` tax rates from all components
- [ ] Remove hardcoded `'VES'` defaults from `BillingDrawer.jsx`
- [ ] Clean up `ImprentaDigitalProvider` to be loaded only via VE plugin

---

### Phase 6: Second Country (Weeks 7-8)

**Goal:** Implement the first non-Venezuela country plugin to validate the architecture.

**Recommended first country: Colombia**

Reasons:
- Similar language (Spanish)
- Has electronic invoicing (DIAN)
- Complex-enough tax system (IVA 19%, withholdings)
- Growing SaaS market
- Existing payment infrastructure (PSE, Nequi)

#### Step 6.1: Create ColombiaPlugin

```
src/country-plugins/plugins/colombia/
├── co-tax-engine.ts          # IVA 19%, ICA, retention rules
├── co-fiscal-identity.ts     # NIT, CC, CE validation
├── co-currency-engine.ts     # COP + USD, TRM rate source
├── co-payment-engine.ts      # PSE, Nequi, Daviplata, efectivo
├── co-e-invoice-provider.ts  # DIAN integration
├── co-document-types.ts      # Facturas, notas crédito
├── co-locale-provider.ts     # Departamentos, timezones
├── co-plugin.ts
└── data/
    ├── co-departments.json
    └── co-banks.json
```

#### Step 6.2: Test with Beta Tenant

Create a test tenant with `countryCode: "CO"` and validate all flows.

---

## 7. File-by-File Migration Registry

### Backend Files to Modify

| File | What Changes | Phase | Risk |
|------|-------------|-------|------|
| `src/schemas/tenant.schema.ts` | Add `countryCode` field | 0 | LOW |
| `src/modules/billing/billing.service.ts` | Use `plugin.taxEngine` | 1 | HIGH |
| `src/modules/billing/billing.controller.ts` | Pass `countryCode` context | 1 | MED |
| `src/modules/billing/numbering.service.ts` | Use `plugin.documentTypes` | 1 | MED |
| `src/modules/billing/imprenta-digital.provider.ts` | Wrap in `plugin.eInvoiceProvider` | 1 | HIGH |
| `src/modules/exchange-rate/*` | Use `plugin.currencyEngine` | 1 | MED |
| `src/schemas/billing-document.schema.ts` | Make types dynamic | 1 | MED |
| `src/schemas/document-sequence.schema.ts` | Make scopes/channels dynamic | 1 | MED |
| `src/dto/billing.dto.ts` | Dynamic enum validation | 1 | LOW |
| `src/app.module.ts` | Register `CountryPluginModule` | 0 | LOW |

### Frontend Files to Modify

| File | What Changes | Phase | Risk |
|------|-------------|-------|------|
| `src/App.jsx` | Add `CountryPluginProvider` | 2 | LOW |
| `src/hooks/useExchangeRate.js` | Use `plugin.currencyEngine` | 2 | MED |
| `src/lib/currency-config.js` | Delegate to plugin | 2 | MED |
| `src/components/PaymentMethodsSettings.jsx` | Use `plugin.paymentEngine` | 2 | MED |
| `src/components/billing/BillingDrawer.jsx` | Use `plugin.taxEngine` + i18n | 2+3 | HIGH |
| `src/components/billing/BillingCreateForm.jsx` | Currency from plugin | 2 | MED |
| `src/components/orders/v2/PaymentDialogV2.jsx` | IGTF from plugin | 2 | HIGH |
| `src/components/orders/v2/MixedPaymentDialog.jsx` | IGTF from plugin | 2 | HIGH |
| `src/components/orders/v2/OrderSidebar.jsx` | Tax display from plugin | 2 | MED |
| `src/components/cash-register/DenominationCounter.jsx` | Denominations from plugin | 2 | LOW |
| `src/components/SettingsPage.jsx` | Fiscal fields from plugin | 2 | MED |
| `src/components/ComprasManagement.jsx` | RIF → plugin.fiscalIdentity | 2 | MED |
| `src/components/accounting/ElectronicInvoicesManager.jsx` | SENIAT → plugin.eInvoice | 2 | HIGH |
| `src/components/accounting/IvaDeclarationWizard.jsx` | SENIAT → plugin.eInvoice | 2 | HIGH |
| `src/components/accounting/IvaWithholdingForm.jsx` | Rules from plugin | 2 | MED |
| `src/components/accounting/IslrWithholdingForm.jsx` | Rules from plugin | 2 | MED |
| `src/components/billing/BillingDocumentDetail.jsx` | SENIAT → plugin | 2 | MED |
| `src/lib/pdfGenerator.js` | RIF, control number from plugin | 2 | MED |
| `src/pages/SmartKubikLanding.jsx` | Remove "Venezuela Ready" hardcoding | 3 | LOW |

### Files to DELETE After Migration

| File | Replaced By |
|------|-------------|
| `src/hooks/useVenezuela.js` | `useCountryPlugin().localeProvider` |
| `src/lib/venezuela-data.js` | `plugins/venezuela/data/ve-states.json` |

---

## 8. Testing Strategy

### Test Pyramid

```
         ┌──────────┐
         │  E2E     │  Full billing flow per country
         │  Tests   │  (Cypress/Playwright)
         ├──────────┤
         │  Integr. │  BillingService + VE Plugin
         │  Tests   │  PaymentDialog + VE Plugin
         ├──────────┤
         │  Unit    │  Each plugin method individually
         │  Tests   │  Tax calculations, ID validation
         ├──────────┤
         │  Parity  │  Old behavior === New behavior
         │  Tests   │  (MOST CRITICAL)
         └──────────┘
```

### Parity Tests (Non-Negotiable)

```typescript
// test/country-plugins/parity/ve-billing-parity.spec.ts
describe('VE Billing Parity', () => {
  const legacyTaxRate = 16;
  const plugin = new VenezuelaPlugin();

  it('default IVA rate matches legacy', () => {
    expect(plugin.taxEngine.getDefaultTaxes()[0].rate).toBe(legacyTaxRate);
  });

  it('IGTF applies to USD methods only', () => {
    const usdMethods = ['efectivo_usd', 'transferencia_usd', 'zelle_usd'];
    const vesMethods = ['efectivo_ves', 'pago_movil_ves', 'pos_ves'];

    usdMethods.forEach(m => {
      expect(plugin.paymentEngine.triggersAdditionalTax(m)).toBe(true);
    });
    vesMethods.forEach(m => {
      expect(plugin.paymentEngine.triggersAdditionalTax(m)).toBe(false);
    });
  });

  it('delivery_note is tax exempt', () => {
    expect(plugin.taxEngine.getExemptDocumentTypes()).toContain('delivery_note');
  });

  it('RIF validation accepts valid formats', () => {
    expect(plugin.fiscalIdentity.validate('J-12345678-9').valid).toBe(true);
    expect(plugin.fiscalIdentity.validate('V-12345678').valid).toBe(true);
    expect(plugin.fiscalIdentity.validate('INVALID').valid).toBe(false);
  });

  it('cash denominations match legacy', () => {
    expect(plugin.currencyEngine.getDenominations('VES'))
      .toEqual([500, 200, 100, 50, 20, 10, 5]);
    expect(plugin.currencyEngine.getDenominations('USD'))
      .toEqual([100, 50, 20, 10, 5, 2, 1]);
  });
});
```

---

## 9. Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Tax calculation regression | **CRITICAL** | Medium | Parity tests, shadow mode |
| SENIAT integration breaks | **CRITICAL** | Low | E-invoice provider wraps existing code, doesn't change it |
| Payment IGTF mismatch | **HIGH** | Medium | Unit tests per payment method |
| Exchange rate endpoint change | **HIGH** | Low | Config-driven endpoint, not hardcoded |
| Translation missing in UI | **MEDIUM** | High | Fallback to Spanish, i18n lint rules |
| Performance regression (plugin resolution) | **LOW** | Low | Plugin instances cached per country |
| Existing tenant data corruption | **CRITICAL** | Very Low | Migration only adds fields, never modifies |

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **BCV** | Banco Central de Venezuela — official exchange rate source |
| **SENIAT** | Venezuelan tax authority (like IRS) |
| **RIF** | Registro de Información Fiscal — Venezuelan tax ID |
| **IVA** | Impuesto al Valor Agregado — VAT (16% in VE, 19% in CO) |
| **IGTF** | Impuesto a las Grandes Transacciones Financieras — 3% surcharge on USD payments in Venezuela |
| **DIAN** | Colombian tax authority |
| **NIT** | Colombian tax ID |
| **SAT/CFDI** | Mexican tax authority / electronic invoice format |
| **RFC** | Mexican tax ID |
| **TRM** | Tasa Representativa del Mercado — Colombian official exchange rate |
| **Imprenta Digital** | Venezuelan fiscal printing authority that assigns control numbers |
| **Contribuyente Especial** | Special taxpayer designation in Venezuela (affects withholding rates) |
| **Strangler Fig** | Migration pattern: new code wraps old code, gradually replacing it |
| **Parity Test** | Test ensuring new code produces identical results to old code |

---

## Timeline Summary

```
Week 1  ──── Phase 0: Preparation
              ├─ Create plugin directory structure
              ├─ Define all 7 interfaces
              ├─ Add countryCode to Tenant schema
              └─ Write parity test skeletons

Week 2-3 ─── Phase 1: Backend Plugin System
              ├─ Implement VenezuelaPlugin (all 7 engines)
              ├─ Create CountryPluginService
              ├─ Wire into BillingService
              ├─ Wire into remaining services
              └─ All parity tests passing

Week 3-4 ─── Phase 2: Frontend Plugin System
              ├─ Create CountryPluginContext + useCountryPlugin
              ├─ Refactor useExchangeRate
              ├─ Refactor payment components
              ├─ Refactor billing components
              └─ Refactor cash register

Week 4-5 ─── Phase 3: i18n
              ├─ Install react-i18next + nestjs-i18n
              ├─ Extract strings from billing components
              ├─ Extract strings from settings/orders
              ├─ Extract backend error messages
              └─ Create es/en translation files

Week 5   ─── Phase 4: Onboarding Update
              ├─ Country selector in registration
              └─ Tenant creation uses plugin defaults

Week 6   ─── Phase 5: Validation & Cleanup
              ├─ Full parity test suite green
              ├─ Shadow mode validation
              ├─ Remove legacy files
              └─ Clean up dead code

Week 7-8 ─── Phase 6: Second Country (Colombia)
              ├─ Implement ColombiaPlugin
              ├─ Test with beta tenant
              └─ Architecture validated
```

---

> **Next Action:** Begin Phase 0 — Create plugin directory structure and define interfaces.
>
> **If this session expires:** Resume from this document. The interfaces in Section 5 are the single source of truth for the plugin contracts. The file registry in Section 7 tells you exactly which files to modify and in what order.
