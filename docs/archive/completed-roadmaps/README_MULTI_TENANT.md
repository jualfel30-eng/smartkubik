# SmartKubik Multi-Tenant System Documentation

Complete analysis of the multi-tenant implementation in the SmartKubik SaaS platform.

## Documentation Files

### 1. MULTI_TENANT_SYSTEM_ANALYSIS.md (657 lines)
**Comprehensive deep-dive into the multi-tenant implementation**

Contents:
- Overview of multi-tenant architecture
- Frontend tenant management (AuthContext, hooks, components)
- Tenant data flow (login, switching, API calls)
- UI adaptation based on tenant configuration
- Backend tenant structure (schemas, controllers, services)
- Authentication & tenant switching logic
- JWT token structure
- Organization selector page
- Module visibility patterns
- Key files summary
- Feature flags

**Use this when:** You need to understand the entire system architecture and implementation details.

---

### 2. MULTI_TENANT_QUICK_REFERENCE.md (459 lines)
**Quick lookup guide for developers**

Contents:
- File paths and locations
- Quick start guide for adding tenant-aware features
- Tenant object structure
- Membership object structure
- API endpoints
- localStorage structure
- Vertical types and default modules
- Key hooks and functions
- Common patterns
- Error scenarios
- Testing checklist
- Debugging tips

**Use this when:** You're actively developing and need quick answers about hooks, APIs, or object structures.

---

### 3. MULTI_TENANT_ARCHITECTURE.md (532 lines)
**Visual architecture diagrams and flow charts**

Contents:
- System architecture overview (ASCII diagram)
- User journey flow chart
- Module visibility flow
- Orders module example
- Token lifecycle
- Data isolation explanation
- Module configuration by vertical

**Use this when:** You need to understand the overall flow, architecture, or explain the system to others.

---

## Quick Navigation

### "How do I...?"

**Check if a module is enabled?**
→ See QUICK_REFERENCE.md → "Key Hooks & Functions" → useModuleAccess()

**Understand the login flow?**
→ See ARCHITECTURE.md → "User Journey: Multi-Tenant Flow"

**Add a tenant-aware feature?**
→ See QUICK_REFERENCE.md → "Quick Start: Add Tenant-Aware Feature"

**Get current tenant data?**
→ See QUICK_REFERENCE.md → "Key Hooks & Functions" → useAuth()

**Understand token structure?**
→ See ARCHITECTURE.md → "Token Lifecycle"

**Find a specific file?**
→ See SYSTEM_ANALYSIS.md → "Key Files Summary" or QUICK_REFERENCE.md → "Core Files & Paths"

**Debug tenant issues?**
→ See QUICK_REFERENCE.md → "Debugging"

---

## Key Concepts

### 1. Multi-Organization Support
Users can belong to multiple organizations (tenants) and switch between them seamlessly.

**Related Files:**
- Frontend: `/src/hooks/use-auth.jsx` (memberships, selectTenant)
- Frontend: `/src/components/auth/TenantPickerDialog.jsx` (org selector)
- Backend: `/src/auth/auth.service.ts` (switchTenant method)

### 2. Module-Based UI Adaptation
The UI adapts based on which modules are enabled for the current tenant.

**Related Files:**
- Frontend: `/src/hooks/useModuleAccess.js` (access check hooks)
- Frontend: `/src/App.jsx` (menu filtering by module)
- Backend: `/src/schemas/tenant.schema.ts` (enabledModules definition)

### 3. Vertical/Business Type Support
Each tenant is classified by a vertical (FOOD_SERVICE, RETAIL, SERVICES, LOGISTICS, HYBRID) which determines available modules.

**Related Files:**
- Frontend: `/src/pages/OrganizationSelector.jsx` (vertical selection)
- Backend: `/src/schemas/tenant.schema.ts` (vertical field)

### 4. Data Isolation
Each tenant's data is completely isolated. JWT token contains tenantId, and all queries are automatically scoped by tenant.

**Related Files:**
- Frontend: `/src/lib/api.js` (token injection)
- Backend: `/src/guards/tenant.guard.ts` (tenant extraction)
- Backend: All service methods query by tenantId

---

## Core Files

### Frontend (React)

| File | Purpose |
|------|---------|
| `src/hooks/use-auth.jsx` | Core auth context managing user, tenant, memberships |
| `src/hooks/useModuleAccess.js` | Hooks to check module enablement |
| `src/components/auth/TenantPickerDialog.jsx` | Organization selector component |
| `src/pages/LoginV2.jsx` | Multi-tenant login page |
| `src/pages/OrganizationSelector.jsx` | Organization selection & creation page |
| `src/lib/api.js` | API client with auth token injection |
| `src/App.jsx` | Main app layout with routing and sidebar |

### Backend (NestJS)

| File | Purpose |
|------|---------|
| `src/schemas/tenant.schema.ts` | Tenant data model |
| `src/schemas/user-tenant-membership.schema.ts` | User-Tenant relationship |
| `src/auth/auth.controller.ts` | Login and switch-tenant endpoints |
| `src/auth/auth.service.ts` | Multi-tenant login logic |
| `src/guards/tenant.guard.ts` | Extract tenant from JWT |
| `src/guards/jwt-auth.guard.ts` | JWT verification |

---

## Common Tasks

### Display Content for Specific Module

```javascript
import { useModuleAccess } from '@/hooks/useModuleAccess';

const MyComponent = () => {
  const hasEcommerce = useModuleAccess('ecommerce');
  
  if (!hasEcommerce) {
    return null;  // Hide component
  }
  
  return <Feature />;
};
```

### Get Current Tenant

```javascript
import { useAuth } from '@/hooks/use-auth';

const MyComponent = () => {
  const { tenant } = useAuth();
  
  return (
    <div>
      <h1>{tenant.name}</h1>
      <p>Vertical: {tenant.vertical}</p>
    </div>
  );
};
```

### Hide Menu Item by Module

In `src/App.jsx`, add `requiresModule` property to navigation links and filter during render.

### Switch Organization

User clicks "Select Organization" button → TenantPickerDialog opens → User selects org → `selectTenant()` is called → New JWT generated → Tenant context updated.

---

## Testing Scenarios

1. **Single Organization User**
   - Login → Auto-select org → Dashboard

2. **Multiple Organization User**
   - Login → Organization selector → User selects org → Dashboard

3. **Switching Organizations**
   - In sidebar, click org name → Select different org → Data updates

4. **Module Visibility**
   - Disable module for org → Menu item hides → Route redirects

5. **Saved Preference**
   - Select org with "Remember" → Logout → Login → Auto-select same org

---

## Architecture Overview

```
User logs in with email/password
    ↓
Backend returns user + all memberships
    ↓
Frontend shows organization selector
    ↓
User selects organization
    ↓
Backend generates JWT with tenant context
    ↓
Frontend stores tenant + new token
    ↓
Dashboard loads with:
  • Current tenant info
  • Filtered menu (by enabled modules)
  • Filtered routes (by permissions)
  ↓
All API calls include JWT
  ↓
Backend automatically scopes queries by tenantId
```

---

## Vertical Types

- **FOOD_SERVICE**: Restaurants, cafes, catering, bars
- **RETAIL**: Stores, supermarkets, e-commerce
- **SERVICES**: Hotels, hospitals, clinics, salons
- **LOGISTICS**: Warehouses, shipping, distribution
- **HYBRID**: Multi-vertical combinations

---

## Module Categories

**Core Modules** (all verticals):
- inventory, orders, customers, accounting, reports

**Food Service**: tables, recipes, kitchenDisplay, menuEngineering

**Retail**: pos, variants, ecommerce, loyaltyProgram

**Services**: appointments, resources, booking, servicePackages

**Logistics**: shipments, tracking, routes, fleet, warehousing, dispatch

---

## Key Data Structures

### User
```javascript
{
  id, email, password, firstName, lastName,
  role: { name, permissions },
  isActive
}
```

### Tenant
```javascript
{
  id, code, name, businessType,
  vertical: "FOOD_SERVICE" | "RETAIL" | "SERVICES" | "LOGISTICS" | "HYBRID",
  enabledModules: { inventory, orders, tables, ... },
  subscriptionPlan, isConfirmed, status,
  settings: { currency, taxes, inventory, ... },
  aiAssistant: { config }
}
```

### Membership
```javascript
{
  id, userId, tenantId, roleId,
  tenant: { ... },  // Full tenant object
  role: { ... },    // Role within this tenant
  status: "active" | "inactive" | "invited",
  isDefault
}
```

---

## API Endpoints Summary

**POST /auth/login**
- Request: { email, password }
- Response: { user, memberships, accessToken, refreshToken }

**POST /auth/switch-tenant**
- Request: { membershipId, rememberAsDefault }
- Response: { user, tenant, accessToken, refreshToken }

**All other endpoints**
- Header: Authorization: Bearer <accessToken>
- Token contains tenantId for automatic data scoping

---

## Storage

**localStorage keys:**
- `accessToken`: JWT token
- `refreshToken`: Refresh token
- `user`: Current user object
- `tenant`: Current selected tenant
- `memberships`: All organizations user can access
- `activeMembershipId`: Currently selected org ID
- `lastLocation`: Last visited page

---

## Important Notes

1. **Data Isolation is Critical**: Always include tenantId in queries
2. **JWT is Source of Truth**: Backend extracts tenantId from JWT for data scoping
3. **Module Checks on Frontend**: Components should check `tenant.enabledModules` before rendering
4. **Permission + Module**: Combine permission checks with module checks
5. **Auto-scoping**: Backend services automatically scope to req.user.tenantId
6. **Feature Flag**: `MULTI_TENANT_LOGIN` enables/disables multi-tenant mode

---

## Getting Started

1. Read **MULTI_TENANT_SYSTEM_ANALYSIS.md** for complete understanding
2. Use **MULTI_TENANT_QUICK_REFERENCE.md** for day-to-day development
3. Reference **MULTI_TENANT_ARCHITECTURE.md** for flow diagrams
4. Check specific source files for implementation details

---

## Questions?

- **How does tenant switching work?** → ARCHITECTURE.md → User Journey
- **What hooks are available?** → QUICK_REFERENCE.md → Key Hooks
- **How to add a feature?** → QUICK_REFERENCE.md → Quick Start
- **What are the data structures?** → QUICK_REFERENCE.md → Object Structures
- **How is data isolated?** → ARCHITECTURE.md → Data Isolation

---

## Version Info

- **Created**: 2025-11-06
- **Frontend Framework**: React + Context API
- **Backend Framework**: NestJS
- **Database**: MongoDB
- **Auth**: JWT tokens with tenant context

