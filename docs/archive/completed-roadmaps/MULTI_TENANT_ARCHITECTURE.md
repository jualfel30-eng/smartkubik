# Multi-Tenant System Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   AuthContext (useAuth)                  │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ State:                                              │ │  │
│  │  │  • user: User object                               │ │  │
│  │  │  • tenant: Current selected tenant                 │ │  │
│  │  │  • memberships: All orgs user can access           │ │  │
│  │  │  • activeMembershipId: Currently selected org ID   │ │  │
│  │  │  • isMultiTenantEnabled: Feature flag              │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ Functions:                                          │ │  │
│  │  │  • login() → Returns user + memberships            │ │  │
│  │  │  • selectTenant() → Switch organizations           │ │  │
│  │  │  • logout() → Clear all state                      │ │  │
│  │  │  • hasPermission() → Check user permission         │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  Storage: localStorage (persistent)                    │  │
│  │  • accessToken, refreshToken                           │  │
│  │  • user, tenant, memberships, activeMembershipId       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Main Components                         │  │
│  │                                                          │  │
│  │  LoginV2.jsx                                            │  │
│  │  ├── POST /auth/login                                  │  │
│  │  └── → OrganizationSelector                            │  │
│  │                                                          │  │
│  │  OrganizationSelector.jsx                              │  │
│  │  ├── Auto-select if saved preference                   │  │
│  │  ├── Show all memberships                              │  │
│  │  ├── selectTenant(membershipId)                        │  │
│  │  └── → Dashboard (with tenant selected)                │  │
│  │                                                          │  │
│  │  TenantPickerDialog.jsx                                │  │
│  │  ├── Show in top navbar                                │  │
│  │  ├── Radio select of organizations                     │  │
│  │  └── Switch between orgs (selectTenant)                │  │
│  │                                                          │  │
│  │  App.jsx (TenantLayout)                                │  │
│  │  ├── Sidebar with navigation                           │  │
│  │  ├── Filter menu by tenant.enabledModules              │  │
│  │  ├── Filter routes by module                           │  │
│  │  └── Display current tenant name in header             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Module Access Hooks                        │  │
│  │                                                          │  │
│  │  useModuleAccess(moduleName)                            │  │
│  │  → boolean (checks tenant.enabledModules)              │  │
│  │                                                          │  │
│  │  useAnyModuleAccess(moduleNames)                        │  │
│  │  → boolean (at least one module enabled)               │  │
│  │                                                          │  │
│  │  useAllModulesAccess(moduleNames)                       │  │
│  │  → boolean (all modules enabled)                        │  │
│  │                                                          │  │
│  │  useVertical()                                          │  │
│  │  → string (tenant.vertical)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   API Client (lib/api.js)               │  │
│  │                                                          │  │
│  │  fetchApi(url, options)                                │  │
│  │  ├── Reads accessToken from localStorage              │  │
│  │  ├── Sets Authorization header                         │  │
│  │  │   → Authorization: Bearer <accessToken>             │  │
│  │  └── Sends to backend (JWT has tenantId context)      │  │
│  │                                                          │  │
│  │  switchTenant(membershipId, options)                   │  │
│  │  └── POST /auth/switch-tenant                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP
         ┌────────────────────────────────────────────────────┐
         │                                                    │
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Auth Controller & Service                   │  │
│  │                                                          │  │
│  │  POST /auth/login                                        │  │
│  │  ├── Find user by email                                │  │
│  │  ├── Verify password                                   │  │
│  │  ├── Query all active memberships for user             │  │
│  │  ├── Generate JWT (WITHOUT tenant context)             │  │
│  │  └── Return { user, memberships, accessToken }         │  │
│  │                                                          │  │
│  │  POST /auth/switch-tenant                              │  │
│  │  ├── Verify JWT (has userId)                           │  │
│  │  ├── Get membership by membershipId                    │  │
│  │  ├── Validate membership is active                     │  │
│  │  ├── Load user, tenant, role                           │  │
│  │  ├── Generate JWT (WITH tenant context)                │  │
│  │  │   → { userId, tenantId, membershipId, role }        │  │
│  │  ├── Optionally set as default membership              │  │
│  │  └── Return { user, tenant, accessToken }              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Middleware & Guards                     │  │
│  │                                                          │  │
│  │  JwtAuthGuard                                            │  │
│  │  └── Verifies JWT token & extracts userId              │  │
│  │                                                          │  │
│  │  TenantGuard                                             │  │
│  │  ├── Extracts tenantId from JWT                        │  │
│  │  ├── Attaches to req.user object                       │  │
│  │  └── Returns 401 if no tenant in JWT                   │  │
│  │      (OK for org selector, rejected elsewhere)          │  │
│  │                                                          │  │
│  │  PermissionsGuard                                        │  │
│  │  └── Checks user has permission                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Data Scoping                           │  │
│  │                                                          │  │
│  │  Every query/mutation in services uses:                │  │
│  │  const tenantId = req.user.tenantId (from JWT)         │  │
│  │                                                          │  │
│  │  Example:                                                │  │
│  │  async getOrders(req) {                                 │  │
│  │    return Orders.find({                                │  │
│  │      tenantId: req.user.tenantId  ← Automatic scoping  │  │
│  │    });                                                   │  │
│  │  }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Data Models                            │  │
│  │                                                          │  │
│  │  User Schema                                             │  │
│  │  ├── id, email, password, firstName, lastName           │  │
│  │  ├── role: ObjectId → Role                              │  │
│  │  └── isActive: boolean                                  │  │
│  │                                                          │  │
│  │  Tenant Schema                                           │  │
│  │  ├── id, name, code, businessType                       │  │
│  │  ├── vertical: FOOD_SERVICE | RETAIL | SERVICES | ...  │  │
│  │  ├── enabledModules: { inventory, orders, ... }         │  │
│  │  ├── settings: { currency, taxes, inventory, ... }      │  │
│  │  ├── status: active | suspended | inactive              │  │
│  │  └── aiAssistant: { config }                            │  │
│  │                                                          │  │
│  │  UserTenantMembership Schema                             │  │
│  │  ├── userId → User                                      │  │
│  │  ├── tenantId → Tenant                                  │  │
│  │  ├── roleId → Role (role WITHIN this tenant)            │  │
│  │  ├── status: active | inactive | invited                │  │
│  │  ├── isDefault: boolean (user's preference)             │  │
│  │  └── Unique: (userId, tenantId)                         │  │
│  │                                                          │  │
│  │  Role Schema                                             │  │
│  │  ├── id, name, permissions (array)                      │  │
│  │  └── Can be global or tenant-scoped                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Database (MongoDB)                      │  │
│  │                                                          │  │
│  │  Collections:                                            │  │
│  │  • users                                                 │  │
│  │  • tenants                                               │  │
│  │  • user_tenant_memberships                               │  │
│  │  • roles                                                 │  │
│  │  • orders (with tenantId field)                          │  │
│  │  • customers (with tenantId field)                       │  │
│  │  • inventory (with tenantId field)                       │  │
│  │  • ... all data has tenantId for scoping                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Journey: Multi-Tenant Flow

```
┌─────────────┐
│  User logs  │
│   in with   │
│   email &   │
│  password   │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────┐
│   POST /auth/login                   │
│   ↓                                  │
│   Backend finds user                 │
│   Validates password                 │
│   Queries all active memberships     │
│   Generates JWT (no tenantId)        │
│   ← { user, memberships, token }     │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Frontend stores in localStorage:    │
│  • accessToken                       │
│  • user                              │
│  • memberships (all orgs)            │
│  (tenant NOT set yet)                │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│   Redirect to /organizations         │
│   (OrganizationSelector page)        │
│                                      │
│   Check if user has saved default:   │
│   ✓ Yes → Auto-select, redirect     │
│   ✗ No → Show list of orgs          │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  User clicks organization            │
│  selectTenant(membershipId)          │
│                                      │
│  POST /auth/switch-tenant            │
│  ↓                                   │
│  Backend validates membership        │
│  Loads tenant & role                 │
│  Generates JWT (WITH tenantId)       │
│  ← { user, tenant, accessToken }     │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Frontend stores in localStorage:    │
│  • NEW accessToken (has tenantId)    │
│  • tenant (selected org)             │
│  • activeMembershipId                │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│   Redirect to /dashboard             │
│   (TenantLayout with tenant context) │
│                                      │
│   Sidebar filters menu items by:     │
│   • tenant.enabledModules            │
│   • user permissions                 │
│                                      │
│   All subsequent API calls include:  │
│   Authorization: Bearer <JWT>        │
│   ↓ (JWT has tenantId)               │
│   Backend auto-scopes queries        │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  User clicks "Select Organization"   │
│  button in sidebar                   │
│  ↓                                   │
│  TenantPickerDialog opens            │
│  Shows all memberships (orgs)        │
│  User selects different org          │
│  selectTenant(differentMembershipId) │
│  ↓                                   │
│  Backend repeats switch-tenant flow  │
│  Frontend updates tenant context     │
│  All subsequent queries scoped to    │
│  new tenant's data                   │
└──────────────────────────────────────┘
```

---

## Module Visibility Flow

```
Component needs to show feature:
       ↓
useModuleAccess('featureName')
       ↓
Check: tenant?.enabledModules?.['featureName']
       ↓
   ┌───┴─────────┐
   │             │
  true          false
   │             │
   ↓             ↓
Show        Hide/return
Feature     null
```

---

## Example: Orders Module with Restaurant Features

```
┌─────────────────────────────────────────────────┐
│  OrdersManagement Component                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  const { tenant } = useAuth();                 │
│                                                 │
│  const restaurantEnabled = Boolean(            │
│    tenant?.enabledModules?.restaurant ||       │
│    tenant?.enabledModules?.tables ||           │
│    tenant?.enabledModules?.kitchenDisplay      │
│  );                                            │
│                                                 │
│  Return:                                        │
│  ┌──────────────────────────────────────────┐ │
│  │ Orders List                              │ │
│  ├──────────────────────────────────────────┤ │
│  │                                          │ │
│  │ {restaurantEnabled && (                 │ │
│  │   <TableSelector tables={tables} />     │ │
│  │ )}                                       │ │
│  │                                          │ │
│  │ {restaurantEnabled && (                 │ │
│  │   <KitchenDisplayLink />                │ │
│  │ )}                                       │ │
│  │                                          │ │
│  │ <OrdersList />                           │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘

Tenant A (FOOD_SERVICE):
  enabledModules: {
    restaurant: true,
    tables: true,
    kitchenDisplay: true,
    orders: true
  }
  ↓
  Shows: TableSelector + KitchenDisplayLink + Orders

Tenant B (RETAIL):
  enabledModules: {
    restaurant: false,
    tables: false,
    kitchenDisplay: false,
    orders: true,
    pos: true,
    variants: true
  }
  ↓
  Shows: Only Orders (no table/kitchen features)
```

---

## Token Lifecycle

```
1. LOGIN (No tenant selected)
   ┌─────────────────────────┐
   │ JWT Payload:            │
   │ {                       │
   │   id: userId,           │
   │   email: user@test.com, │
   │   role: { ... },        │
   │   tenantId: null        │ ← NO TENANT
   │ }                       │
   │                         │
   │ Usage: Can access       │
   │ • /organizations        │
   │ • /auth/switch-tenant   │
   │ • NOT protected routes  │
   └─────────────────────────┘

2. SWITCH TENANT (Tenant selected)
   ┌─────────────────────────┐
   │ JWT Payload:            │
   │ {                       │
   │   id: userId,           │
   │   email: user@test.com, │
   │   role: { ... },        │
   │   tenantId: tenantId,   │ ← HAS TENANT
   │   membershipId: memId   │
   │ }                       │
   │                         │
   │ Usage: All API calls    │
   │ • Queries scoped to     │
   │   tenantId              │
   │ • Can access dashboard  │
   │   & all tenant routes   │
   └─────────────────────────┘

3. LOGOUT
   ┌─────────────────────────┐
   │ Clear localStorage:     │
   │ • accessToken ✗         │
   │ • refreshToken ✗        │
   │ • user ✗                │
   │ • tenant ✗              │
   │ • memberships ✗         │
   │ • activeMembershipId ✗  │
   │                         │
   │ Redirect: /login        │
   └─────────────────────────┘
```

---

## Data Isolation (Tenancy)

```
USER A (belongs to Tenant 1 & 2)
└─ Tenant 1 (Restaurant A)
   ├─ Login with tenantId: "T1"
   ├─ Can access:
   │  • Orders for Tenant 1 only
   │  • Inventory for Tenant 1 only
   │  • Settings for Tenant 1 only
   │  • Customers for Tenant 1 only
   └─ All queries have: WHERE tenantId = "T1"

└─ Tenant 2 (Restaurant B)
   ├─ Switch tenant to tenantId: "T2"
   ├─ Can access:
   │  • Orders for Tenant 2 only
   │  • Inventory for Tenant 2 only
   │  • Settings for Tenant 2 only
   │  • Customers for Tenant 2 only
   └─ All queries have: WHERE tenantId = "T2"

USER B (belongs to Tenant 1 only)
└─ Tenant 1 (Restaurant A)
   ├─ Can access same Tenant 1 data
   └─ Cannot access Tenant 2 data

ISOLATION GUARANTEE:
• USER A in Tenant 1 cannot see Tenant 2 data
• USER A in Tenant 2 cannot see Tenant 1 data
• USER B cannot access Tenant 2 (not a member)
• Database enforces with: WHERE tenantId = ...
```

---

## Module Configuration by Vertical

```
FOOD_SERVICE Vertical
├── Always enabled:
│   ├── inventory
│   ├── orders
│   ├── customers
│   ├── accounting
│   └── reports
├── Food-specific modules:
│   ├── tables (optional)
│   ├── recipes (optional)
│   ├── kitchenDisplay (optional)
│   └── menuEngineering (optional)
└── Typically disabled:
    ├── pos
    ├── ecommerce
    ├── appointments
    └── shipments

RETAIL Vertical
├── Always enabled:
│   ├── inventory
│   ├── orders
│   ├── customers
│   ├── accounting
│   └── reports
├── Retail-specific modules:
│   ├── pos (optional)
│   ├── variants (optional)
│   ├── ecommerce (optional)
│   └── loyaltyProgram (optional)
└── Typically disabled:
    ├── tables
    ├── recipes
    ├── appointments
    └── shipments

SERVICES Vertical (Hotels, Clinics, Salons)
├── Always enabled:
│   ├── inventory
│   ├── customers
│   ├── accounting
│   └── reports
├── Services-specific modules:
│   ├── appointments (optional)
│   ├── resources (optional)
│   ├── booking (optional)
│   └── servicePackages (optional)
└── Typically disabled:
    ├── orders
    ├── tables
    ├── pos
    └── shipments

LOGISTICS Vertical
├── Always enabled:
│   ├── inventory
│   ├── reports
│   └── accounting
├── Logistics-specific modules:
│   ├── shipments (optional)
│   ├── tracking (optional)
│   ├── routes (optional)
│   ├── fleet (optional)
│   ├── warehousing (optional)
│   └── dispatch (optional)
└── Typically disabled:
    ├── orders
    ├── tables
    ├── appointments
    └── pos
```

