# Module Access Control - Frontend

Sistema de control de acceso basado en módulos para el frontend.

## Hooks Disponibles

### useModuleAccess(moduleName)

Verifica si un módulo específico está habilitado para el tenant actual.

```jsx
import { useModuleAccess } from '../hooks/useModuleAccess';

function TablesPage() {
  const hasTablesAccess = useModuleAccess('tables');

  if (!hasTablesAccess) {
    return <ModuleAccessDenied moduleName="tables" />;
  }

  return <TablesManagement />;
}
```

### useAnyModuleAccess(moduleNames)

Verifica si AL MENOS UNO de los módulos está habilitado.

```jsx
import { useAnyModuleAccess } from '../hooks/useModuleAccess';

function FoodServiceDashboard() {
  const hasFoodServiceFeatures = useAnyModuleAccess(['tables', 'recipes', 'kitchenDisplay']);

  if (!hasFoodServiceFeatures) {
    return <div>No tienes características de servicio de alimentos habilitadas</div>;
  }

  return <Dashboard />;
}
```

### useAllModulesAccess(moduleNames)

Verifica si TODOS los módulos están habilitados.

```jsx
import { useAllModulesAccess } from '../hooks/useModuleAccess';

function CompleteRetailSuite() {
  const hasCompleteRetailSuite = useAllModulesAccess(['pos', 'variants', 'ecommerce']);

  if (!hasCompleteRetailSuite) {
    return <div>Necesitas el paquete completo de retail</div>;
  }

  return <RetailFullFeatures />;
}
```

### useVertical()

Obtiene el vertical del tenant actual.

```jsx
import { useVertical } from '../hooks/useModuleAccess';

function CustomDashboard() {
  const vertical = useVertical(); // 'FOOD_SERVICE', 'RETAIL', 'SERVICES', 'LOGISTICS'

  return (
    <div>
      {vertical === 'FOOD_SERVICE' && <FoodServiceDashboard />}
      {vertical === 'RETAIL' && <RetailDashboard />}
      {vertical === 'LOGISTICS' && <LogisticsDashboard />}
    </div>
  );
}
```

## Componentes

### ModuleProtectedRoute

Protege rutas enteras basándose en módulos habilitados.

```jsx
import ModuleProtectedRoute from '../components/ModuleProtectedRoute';
import TablesManagement from '../pages/TablesManagement';

// En tu router:
{
  path: '/tables',
  element: <ModuleProtectedRoute
    component={TablesManagement}
    requiredModule="tables"
  />
}
```

### ModuleAccessDenied

Pantalla mostrada cuando el usuario no tiene acceso a un módulo.

```jsx
import ModuleAccessDenied from '../components/ModuleAccessDenied';

<ModuleAccessDenied moduleName="tables" vertical="RETAIL" />
```

## Renderizado Condicional

### Ocultar elementos del menú

```jsx
import { useModuleAccess } from '../hooks/useModuleAccess';

function Sidebar() {
  const hasTables = useModuleAccess('tables');
  const hasRecipes = useModuleAccess('recipes');
  const hasPOS = useModuleAccess('pos');

  return (
    <nav>
      <MenuItem to="/products">Productos</MenuItem>
      <MenuItem to="/orders">Órdenes</MenuItem>

      {hasTables && <MenuItem to="/tables">Mesas</MenuItem>}
      {hasRecipes && <MenuItem to="/recipes">Recetas</MenuItem>}
      {hasPOS && <MenuItem to="/pos">Punto de Venta</MenuItem>}
    </nav>
  );
}
```

### Deshabilitar funcionalidades

```jsx
import { useModuleAccess } from '../hooks/useModuleAccess';

function ProductForm() {
  const hasVariants = useModuleAccess('variants');

  return (
    <form>
      <Input label="Nombre del producto" />
      <Input label="Precio" />

      <Button
        disabled={!hasVariants}
        title={!hasVariants ? 'Módulo de variantes no habilitado' : ''}
      >
        Agregar Variante
      </Button>
    </form>
  );
}
```

### Renderizado condicional de secciones

```jsx
import { useModuleAccess, useVertical } from '../hooks/useModuleAccess';

function Dashboard() {
  const hasTables = useModuleAccess('tables');
  const hasShipments = useModuleAccess('shipments');
  const vertical = useVertical();

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Widgets comunes */}
      <SalesWidget />
      <ProductsWidget />

      {/* Widgets específicos por vertical */}
      {hasTables && <TablesOccupancyWidget />}
      {hasShipments && <ShipmentsInTransitWidget />}

      {/* Mensaje personalizado por vertical */}
      {vertical === 'LOGISTICS' && (
        <WelcomeMessage>Bienvenido al panel de logística</WelcomeMessage>
      )}
    </div>
  );
}
```

## Nombres de Módulos

Usa los nombres exactos de los módulos:

**Core:**
- `inventory`
- `orders`
- `customers`
- `suppliers`
- `reports`
- `accounting`

**Food Service:**
- `tables`
- `recipes`
- `kitchenDisplay`
- `menuEngineering`

**Retail:**
- `pos`
- `variants`
- `ecommerce`
- `loyaltyProgram`

**Services:**
- `appointments`
- `resources`
- `booking`
- `servicePackages`

**Logistics:**
- `shipments`
- `tracking`
- `routes`
- `fleet`
- `warehousing`
- `dispatch`

## Flujo de Trabajo

1. Usuario hace login → Contexto de Auth carga tenant con `enabledModules`
2. Hooks verifican `tenant.enabledModules[moduleName]`
3. Componentes se renderizan o ocultan según permisos
4. Si usuario intenta acceder a URL de módulo deshabilitado → `ModuleAccessDenied`

## Ejemplo Completo

```jsx
import { useState } from 'react';
import { useModuleAccess, useVertical } from '../hooks/useModuleAccess';
import ModuleAccessDenied from '../components/ModuleAccessDenied';

function ProductsPage() {
  const hasVariants = useModuleAccess('variants');
  const hasPOS = useModuleAccess('pos');
  const vertical = useVertical();

  return (
    <div>
      <h1>Gestión de Productos</h1>

      {/* Botón visible solo si tiene variantes */}
      {hasVariants && (
        <Button onClick={() => openVariantModal()}>
          Crear Variante
        </Button>
      )}

      {/* Botón con tooltip si no tiene acceso */}
      <Button
        disabled={!hasPOS}
        title={!hasPOS ? 'Necesitas el módulo POS' : ''}
      >
        Vender en POS
      </Button>

      {/* Mensaje personalizado por vertical */}
      {vertical === 'FOOD_SERVICE' && (
        <Alert>Recuerda configurar las recetas de tus platos</Alert>
      )}

      <ProductsList />
    </div>
  );
}
```
