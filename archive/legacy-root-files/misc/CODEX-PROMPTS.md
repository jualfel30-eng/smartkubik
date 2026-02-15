# Prompts para Codex - Integración de Módulos de Restaurante

## ⚠️ IMPORTANTE: Arquitectura Modular

Este sistema soporta **múltiples verticales** (restaurante, retail, ecommerce).
Los módulos de restaurante deben ser **condicionales** basados en `tenant.enabledModules.restaurant`.

**Regla crítica:** Siempre verificar `tenant?.enabledModules?.restaurant` antes de mostrar UI específica de restaurante.

---

## 🎯 PROMPT 1: Integración Completa (Recomendado)

```
TASK: Integrate restaurant modules into OrdersManagement with conditional checks

CONTEXT:
- I have 4 restaurant modules fully implemented (backend + frontend)
- ModifierSelector, SplitBillModal, KitchenDisplay, FloorPlan components exist
- They need to be integrated into the orders workflow
- CRITICAL: These features should ONLY appear when tenant.enabledModules.restaurant === true
- This ensures the system works for restaurants AND non-restaurants (retail, ecommerce)

FILES TO READ FIRST:
1. /INTEGRATION-GUIDE.md (complete integration instructions)
2. /food-inventory-admin/src/hooks/use-auth.jsx (to understand tenant structure)
3. /food-inventory-admin/src/components/orders/v2/CreateOrderModal.jsx
4. /food-inventory-admin/src/components/orders/v2/OrderDetailModal.jsx
5. /food-inventory-admin/src/components/orders/v2/OrdersManagementV2.jsx
6. /food-inventory-admin/src/components/restaurant/ModifierSelector.jsx
7. /food-inventory-admin/src/components/restaurant/SplitBillModal.jsx

MODIFICATIONS NEEDED:

=== 1. CreateOrderModal.jsx ===
- Import useAuth hook to access tenant
- Add states for modifier selection
- Modify addProduct() function to check for modifiers conditionally
- Only load modifiers if tenant.enabledModules.restaurant OR tenant.enabledModules.retail
- Add ModifierSelector component to JSX
- Update item display to show modifiers and special instructions
- Add table selector (conditional on restaurant module)

Key pattern:
```jsx
import { useAuth } from '../../hooks/use-auth';
const { tenant } = useAuth();

const supportsModifiers = tenant?.enabledModules?.restaurant ||
                          tenant?.enabledModules?.retail;

if (supportsModifiers) {
  // Check for modifiers
}
```

=== 2. OrderDetailModal.jsx ===
- Import useAuth hook to access tenant
- Add states for bill split
- Load existing split if order.isSplit (conditional check)
- Add "Dividir Cuenta" button ONLY if tenant.enabledModules.restaurant === true
- Display split details if exists (conditional)
- Add SplitBillModal component to JSX

Key pattern:
```jsx
const { tenant } = useAuth();

// Only show split UI if restaurant module enabled
{tenant?.enabledModules?.restaurant && order.status === 'confirmed' && !order.isSplit && (
  <Button>Dividir Cuenta</Button>
)}
```

=== 3. OrdersManagementV2.jsx ===
- Import useAuth hook to access tenant
- Add sendToKitchen() function with module verification
- Add "Enviar a Cocina" button ONLY if tenant.enabledModules.restaurant === true
- Button should only show for confirmed orders

Key pattern:
```jsx
const { tenant } = useAuth();

const sendToKitchen = async (order) => {
  if (!tenant?.enabledModules?.restaurant) {
    toast.error('Módulo de restaurante no habilitado');
    return;
  }
  // ... rest of logic
};

// In render:
{tenant?.enabledModules?.restaurant && order.status === 'confirmed' && (
  <Button onClick={() => sendToKitchen(order)}>
    Enviar a Cocina
  </Button>
)}
```

REQUIREMENTS:
1. Preserve ALL existing functionality
2. Do NOT break non-restaurant tenants
3. Use existing import patterns and component structure
4. Follow the code style of existing files
5. Add proper error handling
6. Use existing toast/notification system

VERIFICATION:
After changes, ensure:
- A restaurant tenant (restaurant: true) sees all features
- A retail tenant (restaurant: false) does NOT see restaurant-specific UI
- Modifiers still work for retail (for product variants)
- No console errors
- All imports are correct

Follow INTEGRATION-GUIDE.md sections 1-3 exactly, with the conditional checks as specified.
```

---

## 🎯 PROMPT 2: Solo ModifierSelector (Paso por Paso)

```
TASK: Integrate ModifierSelector into CreateOrderModal with conditional logic

CONTEXT:
- ModifierSelector component exists at /food-inventory-admin/src/components/restaurant/ModifierSelector.jsx
- Need to add it to CreateOrderModal.jsx
- CRITICAL: Only check for modifiers if tenant.enabledModules.restaurant OR retail is true
- This allows restaurants to use modifiers AND retail stores to use them for product variants

FILES TO MODIFY:
- /food-inventory-admin/src/components/orders/v2/CreateOrderModal.jsx

STEPS:
1. Import useAuth hook: `import { useAuth } from '../../hooks/use-auth';`
2. Import ModifierSelector component
3. Add const { tenant } = useAuth(); inside component
4. Add states: showModifierSelector, selectedProduct, modifierGroups
5. Modify addProduct() function to conditionally check for modifiers
6. Add ModifierSelector to JSX with proper handlers
7. Update item display to show modifiers and special instructions

CONDITIONAL LOGIC:
```jsx
const supportsModifiers = tenant?.enabledModules?.restaurant ||
                          tenant?.enabledModules?.retail;

if (supportsModifiers) {
  // Load modifiers from API
  // Show ModifierSelector if product has modifiers
}
// Otherwise add product directly without modifiers
```

Follow INTEGRATION-GUIDE.md section "INTEGRACIÓN 1" exactly.
```

---

## 🎯 PROMPT 3: Solo SplitBillModal (Paso por Paso)

```
TASK: Integrate SplitBillModal into OrderDetailModal (restaurant-only feature)

CONTEXT:
- SplitBillModal component exists at /food-inventory-admin/src/components/restaurant/SplitBillModal.jsx
- Need to add it to OrderDetailModal.jsx
- CRITICAL: This is a restaurant-only feature, only show if tenant.enabledModules.restaurant === true
- A retail store should NOT see "Dividir Cuenta" button

FILES TO MODIFY:
- /food-inventory-admin/src/components/orders/v2/OrderDetailModal.jsx

STEPS:
1. Import useAuth hook and SplitBillModal
2. Add const { tenant } = useAuth();
3. Add states: showSplitModal, billSplit
4. Add useEffect to load existing split (with conditional check)
5. Add "Dividir Cuenta" button wrapped in conditional
6. Add split details display wrapped in conditional
7. Add SplitBillModal component to JSX

CONDITIONAL LOGIC:
```jsx
// Only show if restaurant module enabled
{tenant?.enabledModules?.restaurant && order.status === 'confirmed' && !order.isSplit && (
  <Button>Dividir Cuenta</Button>
)}

// Only show split details if restaurant enabled
{tenant?.enabledModules?.restaurant && order.isSplit && billSplit && (
  <div>Split Details</div>
)}
```

Follow INTEGRATION-GUIDE.md section "INTEGRACIÓN 2" exactly.
```

---

## 🎯 PROMPT 4: Solo Botón "Enviar a Cocina" (Paso por Paso)

```
TASK: Add "Send to Kitchen" button to OrdersManagementV2 (restaurant-only feature)

CONTEXT:
- Backend endpoint /kitchen-display/create already exists
- Need to add button in OrdersManagementV2.jsx
- CRITICAL: This is a restaurant-only feature, only show if tenant.enabledModules.restaurant === true
- A retail store should NOT see this button

FILES TO MODIFY:
- /food-inventory-admin/src/components/orders/v2/OrdersManagementV2.jsx

STEPS:
1. Import useAuth hook and ChefHat icon
2. Add const { tenant } = useAuth();
3. Add sendToKitchen() function with module verification
4. Add estimatePrepTime() helper function
5. Add button wrapped in conditional check

CONDITIONAL LOGIC:
```jsx
const sendToKitchen = async (order) => {
  // Verify module enabled first
  if (!tenant?.enabledModules?.restaurant) {
    toast.error('Módulo de restaurante no habilitado');
    return;
  }
  // ... rest of logic
};

// In render:
{tenant?.enabledModules?.restaurant && order.status === 'confirmed' && (
  <Button onClick={() => sendToKitchen(order)}>
    <ChefHat /> Enviar a Cocina
  </Button>
)}
```

Follow INTEGRATION-GUIDE.md section "INTEGRACIÓN 3" exactly.
```

---

## 🎯 PROMPT 5: Crear Seed Data Script

```
TASK: Create seed script for restaurant test data

CONTEXT:
- Need sample data to test restaurant modules
- Should create modifier groups, modifiers, tables, and products
- Must be idempotent (can run multiple times without duplicating)

FILE TO CREATE:
- /food-inventory-saas/src/database/seeds/restaurant-data.seed.ts

DATA TO CREATE:

1. MODIFIER GROUPS (3-5 groups):
   - "Punto de Cocción" (selectionType: 'single', required: true)
     └ Modifiers: "Término Medio" (+$0), "Bien Cocido" (+$0), "Tres Cuartos" (+$0)

   - "Toppings Extra" (selectionType: 'multiple', minSelections: 0, maxSelections: 5)
     └ Modifiers: "Queso" (+$1), "Bacon" (+$2), "Aguacate" (+$1.5), "Jalapeños" (+$0.5)

   - "Tamaño Bebida" (selectionType: 'single', required: true)
     └ Modifiers: "Pequeña" (+$0), "Mediana" (+$1), "Grande" (+$2)

2. TABLES (10-15 tables):
   - Section "Terraza": 5 tables (2-4 persons each)
   - Section "Interior": 5 tables (4-6 persons each)
   - Section "VIP": 3 tables (6-8 persons each)
   - All with grid positions for floor plan visualization

3. SAMPLE PRODUCTS with modifier groups assigned:
   - "Hamburguesa Clásica" → assigned to "Punto de Cocción" and "Toppings Extra"
   - "Pizza Margarita" → assigned to custom groups
   - "Refresco" → assigned to "Tamaño Bebida"

REQUIREMENTS:
- Use NestJS seeding patterns
- Check if data exists before creating (prevent duplicates)
- Use proper TypeScript types from schemas
- Add to package.json as: "seed:restaurant": "ts-node src/database/seeds/restaurant-data.seed.ts"
- Log progress and results
- Handle errors gracefully

STRUCTURE:
```typescript
import { ModifierGroup } from '../../schemas/modifier-group.schema';
import { Modifier } from '../../schemas/modifier.schema';
import { Table } from '../../schemas/table.schema';
import { Product } from '../../schemas/product.schema';

async function seedRestaurantData(tenantId: string) {
  // 1. Create modifier groups
  // 2. Create modifiers for each group
  // 3. Create tables with positions
  // 4. Create sample products
  // 5. Assign modifier groups to products
}
```
```

---

## 🎯 PROMPT 6: Crear ModifierGroupsManagement UI (Opcional)

```
TASK: Create full CRUD UI for managing modifier groups

CONTEXT:
- Backend endpoints exist for all CRUD operations
- Need admin interface to create/edit/delete modifier groups and modifiers
- Should follow existing management component patterns

FILE TO CREATE:
- /food-inventory-admin/src/components/restaurant/ModifierGroupsManagement.jsx

FEATURES NEEDED:
1. List all modifier groups (table view with shadcn/ui Table)
2. Create new group button → modal
3. Edit group button → modal
4. Delete group button with confirmation
5. Expand group to see modifiers list
6. Add modifier to group → inline form
7. Edit/delete individual modifiers
8. Assign group to products → multi-select modal

API ENDPOINTS AVAILABLE:
- GET /modifier-groups (list all)
- POST /modifier-groups (create)
- GET /modifier-groups/:id (get one)
- PATCH /modifier-groups/:id (update)
- DELETE /modifier-groups/:id (delete)
- POST /modifiers (create modifier)
- GET /modifiers/by-group/:groupId (list modifiers)
- PATCH /modifiers/:id (update modifier)
- DELETE /modifiers/:id (delete modifier)
- POST /modifier-groups/assign-products (assign to products)

FOLLOW PATTERNS FROM:
- /food-inventory-admin/src/components/InventoryDashboard.jsx
- /food-inventory-admin/src/components/CRMManagement.jsx

USE COMPONENTS:
- shadcn/ui: Button, Card, Dialog, Table, Input, Select, Badge
- lucide-react: icons (Plus, Edit, Trash2, ChevronDown, ChevronUp)

REQUIREMENTS:
- Responsive design
- Loading states
- Error handling with toast notifications
- Confirmation dialogs for destructive actions
- Form validation
- Search/filter functionality
```

---

## 📋 Orden de Ejecución Recomendado

1. **PROMPT 1** (Integración Completa) - 30-60 minutos
   - Hace todo de una vez
   - Más rápido
   - Recomendado si Codex funciona bien

2. **PROMPTS 2, 3, 4** (Paso a Paso) - 20 minutos cada uno
   - Más control
   - Puedes probar cada integración antes de continuar
   - Recomendado si quieres verificar cada paso

3. **PROMPT 5** (Seed Data) - 20-30 minutos
   - Datos de prueba
   - Necesario para testing

4. **PROMPT 6** (ModifierGroupsManagement UI) - 45-60 minutos
   - Opcional pero útil
   - Evita usar MongoDB directo

---

## ✅ Verificación Post-Integración

Después de que Codex complete las modificaciones:

```bash
# 1. Verificar que compila
cd food-inventory-admin
npm run build

# 2. Probar localmente
npm run dev

# 3. Verificar en navegador:
# - Crear tenant con restaurant: true → debe ver todas las features
# - Crear tenant con restaurant: false → NO debe ver features de restaurant
# - Console debe estar sin errores
```

---

## 🆘 Si Codex Tiene Problemas

Si Codex no entiende o comete errores:

1. **Dale más contexto:**
   - "Read file X first to understand structure"
   - "Follow the exact pattern from INTEGRATION-GUIDE.md"

2. **Divide el prompt:**
   - En vez de PROMPT 1, usa PROMPT 2, 3, 4 por separado

3. **Corrige manualmente:**
   - Usa INTEGRATION-GUIDE.md como referencia
   - El código está documentado paso a paso

4. **Pide revisión:**
   - "Review the changes and verify they follow the conditional logic pattern"

---

**Con estos prompts, Codex debería completar la integración en 1-3 horas total.**
