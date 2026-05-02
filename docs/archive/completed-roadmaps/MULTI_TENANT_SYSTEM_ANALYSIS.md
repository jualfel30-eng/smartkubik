# Multi-Tenant System Implementation Analysis

## Overview
The SmartKubik SaaS implements a complete multi-tenant system where users can belong to multiple organizations (tenants) and switch between them. Each tenant has its own configuration, including vertical/business type and enabled modules that adapt the UI and available features.

---

## 1. FRONTEND TENANT MANAGEMENT

### 1.1 Core Context: AuthContext (useAuth Hook)
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/hooks/use-auth.jsx`

The `AuthContext` is the central hub for all authentication and tenant management:

```javascript
// Key storage keys in localStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  TENANT: 'tenant',                    // Current selected tenant
  MEMBERSHIPS: 'memberships',          // All orgs user belongs to
  ACTIVE_MEMBERSHIP: 'activeMembershipId',  // Currently selected org ID
  LAST_LOCATION: 'lastLocation',       // Where user was before logout
};
```

**Key State Variables:**
- `user`: Currently logged-in user
- `tenant`: Current selected tenant (full tenant object)
- `memberships`: Array of all organizations user belongs to
- `activeMembershipId`: ID of currently selected membership
- `isMultiTenantEnabled`: Feature flag for multi-tenant mode

**Key Functions:**

1. **login(email, password, tenantCode)** - Initial login
   - Returns user + all memberships
   - For multi-tenant: user goes to organization selector
   - For single-tenant: user goes directly to dashboard

2. **selectTenant(membershipId, options)** - Switch between organizations
   - Fetches new tenant data
   - Generates new JWT token with tenant context
   - Stores as active membership
   - Updates context state

3. **normalizeTenant(rawTenant)** - Normalizes tenant data structure
```javascript
return {
  id: rawTenant.id || rawTenant._id,
  code: rawTenant.code,
  name: rawTenant.name,
  businessType: rawTenant.businessType,
  vertical: rawTenant.vertical,  // FOOD_SERVICE, RETAIL, SERVICES, LOGISTICS, HYBRID
  enabledModules: rawTenant.enabledModules,  // Which features are enabled
  subscriptionPlan: rawTenant.subscriptionPlan,
  isConfirmed: !isExplicitlyUnconfirmed,
  verticalProfile: { key, overrides },
  aiAssistant: { config }
};
```

---

### 1.2 Tenant Picker Component
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/components/auth/TenantPickerDialog.jsx`

Displays when user has multiple organizations:

```javascript
export function TenantPickerDialog({
  isOpen,
  memberships,        // Array of user's organizations
  defaultMembershipId, // Previously selected org
  onSelect,            // Callback when org is selected
  onCancel,
  isLoading,
  errorMessage,
})
```

Features:
- Radio group to select organization
- Shows org name, code, role
- "Remember this selection" checkbox to set as default
- Disabled if organization status isn't 'active'

---

### 1.3 Module Access Hooks
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/hooks/useModuleAccess.js`

Three hooks for checking module access:

```javascript
// Check if specific module is enabled
const useModuleAccess = (moduleName) => {
  const { tenant } = useAuth();
  return tenant?.enabledModules?.[moduleName] === true;
};

// Check if ANY of modules are enabled
const useAnyModuleAccess = (moduleNames) => {
  const { tenant } = useAuth();
  return moduleNames.some(name => tenant?.enabledModules?.[name] === true);
};

// Check if ALL modules are enabled
const useAllModulesAccess = (moduleNames) => {
  const { tenant } = useAuth();
  return moduleNames.every(name => tenant?.enabledModules?.[name] === true);
};

// Get tenant's vertical/business type
const useVertical = () => {
  const { tenant } = useAuth();
  return tenant?.vertical || 'FOOD_SERVICE';
};
```

---

## 2. TENANT DATA FLOW

### 2.1 Login Flow (MultiTenant)
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/pages/LoginV2.jsx`

```
User Login (email/password)
    ↓
Backend: POST /api/v1/auth/login
    ↓
Returns: { user, memberships: [...], accessToken, refreshToken }
    ↓
Frontend checks: isMultiTenantEnabled && memberships.length > 0
    ↓
Store memberships in localStorage
    ↓
Navigate to /organizations (OrganizationSelector)
    ↓
User selects organization → selectTenant(membershipId)
    ↓
New JWT token generated with tenant context
    ↓
Navigate to /dashboard with tenant selected
```

### 2.2 Tenant Switch Flow
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/lib/api.js`

```javascript
export const switchTenant = (membershipId, options = {}) => {
  return fetchApi('/auth/switch-tenant', {
    method: 'POST',
    body: JSON.stringify({
      membershipId,
      rememberAsDefault: Boolean(options.rememberAsDefault),
    }),
  });
};
```

In TenantLayout (App.jsx), user can click "Select Organization" button to switch tenants.

---

### 2.3 API Data Fetch
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/lib/api.js`

All API calls automatically include tenant context via JWT token:

```javascript
export const fetchApi = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = { ...options.headers };
  
  if (token && !options.isPublic) {
    headers['Authorization'] = `Bearer ${token}`;  // JWT with tenant context
  }
  
  const response = await fetch(`${baseUrl}/api/v1${url}`, {
    ...options,
    headers,
  });
  
  return response.json();
};
```

Backend extracts tenant ID from JWT to scope all data queries.

---

## 3. UI ADAPTATION BASED ON TENANT CONFIGURATION

### 3.1 Navigation Menu - Module-Based Visibility
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/App.jsx` (TenantLayout → SidebarNavigation)

```javascript
const navLinks = [
  { name: 'Panel de Control', href: 'dashboard', icon: LayoutDashboard, permission: 'dashboard_read' },
  { name: 'Órdenes', href: 'orders', icon: ShoppingCart, permission: 'orders_read' },
  { name: 'Inventario', href: 'inventory-management', icon: Package, permission: 'inventory_read' },
  { name: 'Mi Storefront', href: 'storefront', icon: Store, permission: 'dashboard_read', 
    requiresModule: 'ecommerce' },
  { name: 'Mesas', href: 'restaurant/floor-plan', icon: Utensils, permission: 'restaurant_read', 
    requiresModule: 'restaurant' },
  { name: 'Cocina (KDS)', href: 'restaurant/kitchen-display', icon: ChefHat, permission: 'restaurant_read', 
    requiresModule: 'restaurant' },
  { name: 'CRM', href: 'crm', icon: Users, permission: 'customers_read' },
  // ... more links
];

// In render, filter by module:
{navLinks.map(link => {
  if (link.requiresModule) {
    if (link.requiresModule === 'restaurant' && !restaurantModuleEnabled) {
      return null;  // Hide this menu item
    }
    if (link.requiresModule !== 'restaurant' && !tenant?.enabledModules?.[link.requiresModule]) {
      return null;  // Hide this menu item
    }
  }
  
  if (!hasPermission(link.permission)) {
    return null;  // Hide by permission
  }
  
  return <SidebarMenuItem key={link.href}>...</SidebarMenuItem>;
})}
```

Key logic:
- Tenant selector button only shows if `isMultiTenantEnabled && memberships.length > 0`
- Menu items filtered by:
  1. Module enabled in `tenant.enabledModules`
  2. User has permission
  3. Special logic for restaurant module (checks multiple related modules)

### 3.2 Restaurant Module Detection
```javascript
const restaurantModuleEnabled = Boolean(
  tenant?.enabledModules?.restaurant ||
  tenant?.enabledModules?.tables ||
  tenant?.enabledModules?.kitchenDisplay ||
  tenant?.enabledModules?.menuEngineering
);
```

### 3.3 Conditional Route Access
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/App.jsx` (TenantLayout → Routes)

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

## 4. BACKEND TENANT STRUCTURE

### 4.1 Tenant Schema
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/schemas/tenant.schema.ts`

```typescript
@Schema({ timestamps: true })
export class Tenant {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  businessType: string;  // "Restaurante", "Tienda", etc.

  @Prop({
    type: String,
    enum: ["FOOD_SERVICE", "RETAIL", "SERVICES", "LOGISTICS", "HYBRID"],
    default: "FOOD_SERVICE",
    required: true,
  })
  vertical: string;  // Main vertical/industry

  @Prop({ type: Object, default: {} })
  enabledModules: {
    // Core modules
    inventory?: boolean;
    orders?: boolean;
    customers?: boolean;
    suppliers?: boolean;
    reports?: boolean;
    accounting?: boolean;
    chat?: boolean;

    // FOOD_SERVICE specific
    tables?: boolean;
    recipes?: boolean;
    kitchenDisplay?: boolean;
    menuEngineering?: boolean;

    // RETAIL specific
    pos?: boolean;
    variants?: boolean;
    ecommerce?: boolean;
    loyaltyProgram?: boolean;

    // SERVICES specific
    appointments?: boolean;
    resources?: boolean;
    booking?: boolean;
    servicePackages?: boolean;

    // LOGISTICS specific
    shipments?: boolean;
    tracking?: boolean;
    routes?: boolean;
    fleet?: boolean;
    warehousing?: boolean;
    dispatch?: boolean;
  };

  @Prop({ type: String, required: true, default: "trial" })
  subscriptionPlan: string;

  @Prop({ type: Boolean, default: false })
  isConfirmed: boolean;

  @Prop({ type: String, required: true, default: "active" })
  status: string;  // "active" | "suspended" | "inactive"

  @Prop({ type: TenantSettingsSchema })
  settings: TenantSettings;  // Currency, taxes, inventory rules, etc.

  @Prop({
    type: {
      autoReplyEnabled: Boolean,
      knowledgeBaseTenantId: String,
      model: String,
      capabilities: { ... }
    }
  })
  aiAssistant: AiAssistantConfig;
}
```

### 4.2 User-Tenant Membership
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/schemas/user-tenant-membership.schema.ts`

```typescript
@Schema({ timestamps: true })
export class UserTenantMembership {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Role", required: true })
  roleId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["active", "inactive", "invited"],
    default: "active",
    required: true,
  })
  status: MembershipStatus;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;  // Remember this selection

  @Prop({ type: [String], default: [] })
  permissionsCache: string[];
}

// Unique constraint: User can belong to same tenant only once
UserTenantMembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
```

---

## 5. AUTHENTICATION & TENANT SWITCHING

### 5.1 Backend Login Endpoint
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/auth/auth.controller.ts`

```typescript
@Post("login")
async login(@Body() loginDto: LoginDto) {
  const result = await this.authService.login(loginDto);
  return {
    success: true,
    message: "Login exitoso",
    data: result,  // { user, memberships, accessToken, refreshToken }
  };
}
```

### 5.2 Backend Login Service (Multi-Tenant Flow)
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/auth/auth.service.ts`

```typescript
private async loginMultiTenantFlow(
  emailCandidates: string[],
  rawEmail: string,
  password: string,
  // ... other params
) {
  // Find user
  const user = await this.userModel
    .findOne({ email: { $in: emailCandidates } })
    .populate({
      path: "role",
      populate: { path: "permissions", select: "name" },
    })
    .exec();

  if (!user) {
    throw new UnauthorizedException("Credenciales inválidas");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException("Credenciales inválidas");
  }

  // Find all active memberships for this user
  const memberships: MembershipSummary[] = 
    await this.membershipsService.findActiveMembershipsForUser(user._id);

  // Generate tokens WITHOUT tenant context (user will select)
  const tokens = await this.tokenService.generateTokens(user, null);

  // Return user + all organizations they can access
  return {
    user: this.buildUserPayload(user, null),
    tenant: null,
    memberships,  // User will pick one on frontend
    ...tokens,
  };
}
```

### 5.3 Switch Tenant Endpoint
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/auth/auth.controller.ts`

```typescript
@Post("switch-tenant")
@UseGuards(JwtAuthGuard)
async switchTenant(@Body() switchTenantDto: SwitchTenantDto, @Request() req) {
  const result = await this.authService.switchTenant(
    req.user.id,
    switchTenantDto.membershipId,
    switchTenantDto.rememberAsDefault ?? false,
  );
  return {
    success: true,
    message: "Tenant cambiado exitosamente",
    data: result,  // { user, tenant, membership, accessToken, refreshToken }
  };
}
```

### 5.4 Switch Tenant Service
```typescript
async switchTenant(
  userId: string,
  membershipId: string,
  rememberAsDefault = false,
) {
  // Get membership record
  const membership = await this.membershipsService.getMembershipForUserOrFail(
    membershipId,
    userId,
  );

  // Validate membership is active
  if (membership.status !== "active") {
    throw new UnauthorizedException("La membresía no está activa");
  }

  // Load user, tenant, and role for this membership
  const [user, tenant, membershipRole] = await Promise.all([
    this.userModel.findById(userId).populate("role").exec(),
    this.membershipsService.resolveTenantById(membership.tenantId),
    this.membershipsService.resolveRoleById(membership.roleId),
  ]);

  // Validate all are active
  if (!user?.isActive) throw new UnauthorizedException("Usuario inválido");
  if (!tenant || tenant.status !== "active") throw new UnauthorizedException("Tenant inactivo");
  if (!membershipRole) throw new UnauthorizedException("Rol inválido");

  // Generate NEW tokens WITH tenant context
  const tokens = await this.tokenService.generateTokens(user, tenant, {
    membershipId: membership._id.toString(),
    roleOverride: membershipRole,
  });

  // Optionally set as default membership
  if (rememberAsDefault) {
    await this.membershipsService.setDefaultMembership(userId, membershipId);
  }

  return {
    user: this.buildUserPayload(user, tenant),
    tenant: this.buildTenantPayload(tenant),
    membership,
    ...tokens,
  };
}
```

---

## 6. JWT TOKEN STRUCTURE

The JWT token includes tenant context:

```javascript
// Token payload (without tenant - for org selection):
{
  id: userId,
  email: userEmail,
  role: { name, permissions },
  iat: timestamp,
  exp: expiration
}

// Token payload (with tenant - after selection):
{
  id: userId,
  email: userEmail,
  role: { name, permissions },
  tenantId: tenantId,      // Tenant context
  membershipId: membershipId,
  iat: timestamp,
  exp: expiration
}
```

Backend extracts `tenantId` from JWT to automatically scope all queries to that tenant.

---

## 7. ORGANIZATION SELECTOR PAGE

**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/pages/OrganizationSelector.jsx`

Features:
1. **Auto-select logic:**
   - If user has saved preference (activeMembershipId), auto-select that organization
   - If only one membership exists, auto-select it
   - Redirects to last visited location

2. **Business Verticals:**
   - FOOD_SERVICE: Restaurante, Cafetería, Food Truck, Catering, Bar
   - RETAIL: Supermercado, Tienda, Distribuidor, Moda, Tecnología, etc.
   - SERVICES: Hotel, Hospital, Escuela, Oficina Corporativa
   - LOGISTICS: Almacén, Centro Distribución, Transporte
   - HYBRID: Combinations (Hotel+Restaurante, etc.)

3. **Create New Organization:**
   - Select vertical → auto-populate categories
   - Fill in business details (name, address, phone, email)
   - Enable selected modules based on vertical

---

## 8. EXAMPLE: MODULE VISIBILITY IN COMPONENTS

### Example 1: Settings Page
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/components/SettingsPage.jsx`

```javascript
{tenant?.enabledModules?.chat && hasPermission('chat_read') && 
  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
}
```

### Example 2: Orders Management
**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/components/orders/v2/OrdersManagementV2.jsx`

```javascript
const restaurantFeaturesEnabled = 
  tenant?.enabledModules?.restaurant ||
  tenant?.enabledModules?.tables ||
  tenant?.enabledModules?.kitchenDisplay;

// Show table selector only if restaurant features enabled
{restaurantFeaturesEnabled && (
  <TableSelector 
    tables={tables}
    selectedTable={selectedTable}
    onSelect={setSelectedTable}
  />
)}
```

---

## 9. KEY FILES SUMMARY

| File | Purpose |
|------|---------|
| `use-auth.jsx` | Core auth context & tenant management |
| `useModuleAccess.js` | Hooks to check module enablement |
| `TenantPickerDialog.jsx` | Organization selector component |
| `OrganizationSelector.jsx` | Page to select/create organizations |
| `api.js` | API client with auth token injection |
| `App.jsx` | Main app layout with sidebar & routing |
| `LoginV2.jsx` | Login page with multi-tenant support |
| `tenant.schema.ts` | MongoDB schema for tenants |
| `user-tenant-membership.schema.ts` | User-Tenant relationship |
| `auth.controller.ts` | Backend login/switch endpoints |
| `auth.service.ts` | Multi-tenant login logic |

---

## 10. FEATURE FLAGS

**Location:** `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/config/features.js`

```javascript
const multiTenantEnabled = isFeatureEnabled('MULTI_TENANT_LOGIN');
```

- When `MULTI_TENANT_LOGIN` is enabled:
  - Login returns memberships array
  - User must select organization before accessing dashboard
  - Tenant picker dialog available in sidebar

---

## SUMMARY

The multi-tenant system is fully implemented with:

1. **Frontend:** React Context (AuthContext) manages user, tenant, and memberships
2. **Storage:** localStorage persists auth tokens, current tenant, and memberships
3. **Switching:** User can switch between organizations via TenantPickerDialog
4. **Scoping:** JWT tokens include tenantId for automatic data scoping
5. **UI Adaptation:** Components check `tenant.enabledModules` to show/hide features
6. **Vertical Support:** Each tenant has a `vertical` (FOOD_SERVICE, RETAIL, etc.) and `businessType`
7. **Permissions:** Combined with module enablement for fine-grained access control

Users can create/manage multiple organizations, each with independent:
- Data
- Configuration (currency, taxes, etc.)
- Module enablement
- Users & roles
- Settings
