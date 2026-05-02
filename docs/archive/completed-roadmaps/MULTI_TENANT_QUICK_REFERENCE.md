# Multi-Tenant System Quick Reference

## Core Files & Paths

### Frontend (React)
```
food-inventory-admin/src/
├── hooks/
│   ├── use-auth.jsx                 # Core auth context
│   └── useModuleAccess.js           # Module permission hooks
├── components/
│   ├── auth/
│   │   └── TenantPickerDialog.jsx   # Org switcher
│   └── SettingsPage.jsx             # Uses tenant config
├── pages/
│   ├── LoginV2.jsx                  # Multi-tenant login
│   ├── OrganizationSelector.jsx     # Org selection & creation
│   └── AuthCallback.jsx             # Google OAuth callback
├── lib/
│   └── api.js                       # API client with auth
└── App.jsx                          # Main layout + routing
```

### Backend (NestJS)
```
food-inventory-saas/src/
├── schemas/
│   ├── tenant.schema.ts             # Tenant data structure
│   ├── user-tenant-membership.schema.ts  # User-Org relationship
│   └── user.schema.ts
├── auth/
│   ├── auth.controller.ts           # Login & switch endpoints
│   ├── auth.service.ts              # Multi-tenant login logic
│   └── token.service.ts             # JWT generation
├── guards/
│   └── tenant.guard.ts              # Extract tenant from JWT
└── dto/
    └── auth.dto.ts                  # Login/switch DTOs
```

---

## Quick Start: Add Tenant-Aware Feature

### 1. Check Module Enablement
```javascript
import { useModuleAccess, useVertical } from '@/hooks/useModuleAccess';

const MyComponent = () => {
  const hasEcommerce = useModuleAccess('ecommerce');
  const vertical = useVertical(); // 'FOOD_SERVICE', 'RETAIL', etc.
  
  if (!hasEcommerce) {
    return <AccessDenied />;
  }
  
  return <FeatureUI />;
};
```

### 2. Get Current Tenant
```javascript
import { useAuth } from '@/hooks/use-auth';

const MyComponent = () => {
  const { tenant, user, memberships, selectTenant } = useAuth();
  
  console.log(tenant.name);              // "My Restaurant"
  console.log(tenant.vertical);          // "FOOD_SERVICE"
  console.log(tenant.enabledModules);    // { tables: true, inventory: true, ... }
  
  return (
    <div>
      <h1>{tenant.name}</h1>
      <p>{tenant.businessType}</p>
    </div>
  );
};
```

### 3. Hide Menu Item by Module
```javascript
// In App.jsx navLinks
const navLinks = [
  {
    name: 'E-commerce Store',
    href: 'storefront',
    icon: Store,
    requiresModule: 'ecommerce'  // Add this property
  },
];

// Filter in render
{navLinks.map(link => {
  if (link.requiresModule && !tenant?.enabledModules?.[link.requiresModule]) {
    return null;  // Hide this menu item
  }
  return <SidebarMenuItem key={link.href}>...</SidebarMenuItem>;
})}
```

### 4. Conditional Route Access
```javascript
<Route path="storefront"
  element={
    tenant?.enabledModules?.ecommerce
      ? <StorefrontSettings />
      : <Navigate to="/dashboard" replace />
  }
/>
```

---

## Tenant Object Structure

```javascript
{
  id: "507f1f77bcf86cd799439011",           // MongoDB ObjectId
  code: "REST-001",                          // Unique code
  name: "Mi Restaurante Premium",
  businessType: "Restaurante Formal",
  
  // Vertical categorization
  vertical: "FOOD_SERVICE",  // FOOD_SERVICE | RETAIL | SERVICES | LOGISTICS | HYBRID
  
  // Which features are enabled
  enabledModules: {
    // Core
    inventory: true,
    orders: true,
    customers: true,
    accounting: true,
    chat: true,
    
    // FOOD_SERVICE specific
    tables: true,
    recipes: true,
    kitchenDisplay: true,
    menuEngineering: true,
    
    // RETAIL specific
    pos: false,
    variants: false,
    ecommerce: false,
    loyaltyProgram: false,
    
    // SERVICES specific
    appointments: false,
    resources: false,
    
    // LOGISTICS specific
    shipments: false,
    tracking: false,
  },
  
  subscriptionPlan: "premium",
  isConfirmed: true,
  status: "active",
  
  // Configuration
  settings: {
    currency: { primary: "USD" },
    taxes: { ivaRate: 0.16 },
    inventory: { fefoEnabled: true },
    orders: { autoConfirmOrders: false },
  },
  
  // AI features
  aiAssistant: {
    autoReplyEnabled: true,
    knowledgeBaseTenantId: "...",
    capabilities: { ... }
  }
}
```

---

## Membership Object Structure

```javascript
{
  id: "507f191e810c19729de860ea",
  userId: "507f1f77bcf86cd799439010",
  tenantId: "507f1f77bcf86cd799439011",
  roleId: "507f191e810c19729de860eb",
  
  tenant: {  // Full tenant object
    id: "507f1f77bcf86cd799439011",
    name: "Mi Restaurante",
    code: "REST-001",
    vertical: "FOOD_SERVICE",
    enabledModules: { ... }
  },
  
  role: {
    id: "507f191e810c19729de860eb",
    name: "admin",
    permissions: ["orders_read", "inventory_write", ...]
  },
  
  status: "active",        // active | inactive | invited
  isDefault: true,         // User's preferred org
  permissionsCache: [...]
}
```

---

## API Endpoints

### Login
```
POST /api/v1/auth/login
{
  email: "user@example.com",
  password: "secure123"
}

Response:
{
  success: true,
  data: {
    user: { ... },
    memberships: [{ ... }, { ... }],  // All orgs user can access
    accessToken: "eyJ...",
    refreshToken: "eyJ..."
  }
}
```

### Switch Tenant
```
POST /api/v1/auth/switch-tenant
Headers: Authorization: Bearer <accessToken>

{
  membershipId: "507f191e810c19729de860ea",
  rememberAsDefault: true
}

Response:
{
  success: true,
  data: {
    user: { ... },
    tenant: { ... },  // New selected tenant
    membership: { ... },
    accessToken: "eyJ...",  // New token WITH tenant context
    refreshToken: "eyJ..."
  }
}
```

---

## localStorage Structure

```javascript
// After login (before org selection)
localStorage = {
  accessToken: "eyJ...",
  refreshToken: "eyJ...",
  user: { id, email, role, ... },
  memberships: [{ ... }, { ... }],
  // tenant NOT set yet - user needs to select
}

// After selecting organization
localStorage = {
  accessToken: "eyJ...",
  refreshToken: "eyJ...",
  user: { ... },
  memberships: [{ ... }, { ... }],
  tenant: { id, name, vertical, enabledModules, ... },
  activeMembershipId: "507f191e810c19729de860ea",
  lastLocation: "/orders",
}
```

---

## Vertical Types & Default Modules

### FOOD_SERVICE
Modules: inventory, orders, customers, tables, recipes, kitchenDisplay, menuEngineering, accounting

### RETAIL
Modules: inventory, orders, customers, pos, variants, ecommerce, loyaltyProgram, accounting

### SERVICES (Hotels, Clinics, Salons)
Modules: appointments, resources, booking, servicePackages, inventory, accounting

### LOGISTICS
Modules: shipments, tracking, routes, fleet, warehousing, dispatch, inventory

### HYBRID
Any combination of the above

---

## Key Hooks & Functions

### useAuth()
```javascript
const {
  user,                    // Current user
  tenant,                  // Current selected tenant
  memberships,             // All orgs user can access
  activeMembershipId,      // Currently selected org ID
  isMultiTenantEnabled,    // Feature flag
  login,                   // (email, password, tenantCode) => Promise
  selectTenant,            // (membershipId, options) => Promise
  logout,                  // () => void
  hasPermission,           // (permissionName) => boolean
  saveLastLocation,        // (path) => void
  getLastLocation,         // () => string
  isSwitchingTenant,       // Is switching in progress?
  tenantConfirmed,         // Is tenant confirmed?
} = useAuth();
```

### useModuleAccess(moduleName)
```javascript
const hasInventory = useModuleAccess('inventory');  // boolean
```

### useAnyModuleAccess(moduleNames)
```javascript
const hasRestaurant = useAnyModuleAccess(['tables', 'kitchenDisplay']);  // boolean
```

### useAllModulesAccess(moduleNames)
```javascript
const hasFullPOS = useAllModulesAccess(['pos', 'variants', 'inventory']);  // boolean
```

### useVertical()
```javascript
const vertical = useVertical();  // 'FOOD_SERVICE', 'RETAIL', etc.
```

---

## Common Patterns

### Hide Feature by Vertical
```javascript
const component = () => {
  const vertical = useVertical();
  
  if (vertical !== 'FOOD_SERVICE') {
    return null;
  }
  
  return <RestaurantFeature />;
};
```

### Show Only for Specific Verticals
```javascript
const supportedVerticals = ['FOOD_SERVICE', 'SERVICES'];
const isSupported = supportedVerticals.includes(tenant?.vertical);

{isSupported && <Feature />}
```

### Combine Module + Permission Check
```javascript
const hasAccess = hasModuleAccess('orders') && hasPermission('orders_write');

{hasAccess && <OrderButton />}
```

### Get Module Config by Vertical
```javascript
const moduleConfig = {
  FOOD_SERVICE: { tables: true, kitchenDisplay: true },
  RETAIL: { pos: true, variants: true, ecommerce: true },
  SERVICES: { appointments: true, resources: true },
};

const tenantModules = moduleConfig[tenant.vertical];
```

---

## Error Scenarios

### User Has No Active Memberships
- User sees error message
- User is logged out
- Can contact admin to be added to an organization

### Organization is Inactive
- Cannot switch to inactive org
- Error: "La membresía no está activa"

### Feature Module Not Enabled
- Menu item is hidden
- Route returns 404/redirects to dashboard
- Component returns null

### Tenant Confirmed = false
- User may see onboarding
- Some features may be restricted

---

## Testing Checklist

- [ ] User can login with email/password
- [ ] Multi-tenant login shows organization selector
- [ ] User can switch between organizations
- [ ] Switching updates JWT token
- [ ] Menu items hide/show based on tenant.enabledModules
- [ ] Routes redirect if module not enabled
- [ ] localStorage persists tenant selection
- [ ] Auto-select on page refresh if saved preference exists
- [ ] Module-specific hooks return correct values
- [ ] Vertical defaults to FOOD_SERVICE if not set
- [ ] Permissions work in combination with modules

---

## Debugging

### Check Current Tenant in Console
```javascript
// In browser console
JSON.parse(localStorage.getItem('tenant'))
```

### Check All Memberships
```javascript
JSON.parse(localStorage.getItem('memberships'))
```

### Check JWT Payload
```javascript
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);  // { id, email, tenantId, membershipId, ... }
```

### Check Enabled Modules
```javascript
const tenant = JSON.parse(localStorage.getItem('tenant'));
console.log(tenant.enabledModules);
```

### Check if Feature Enabled
```javascript
const { tenant } = useAuth();
console.log('Ecommerce:', tenant?.enabledModules?.ecommerce);
console.log('Tables:', tenant?.enabledModules?.tables);
```

