# Frontend Patterns - Quick Reference Guide

## Índice Rápido

- [Stack Tecnológico](#stack-tecnológico)
- [Componentes por Módulo](#componentes-por-módulo)
- [Patrones CRUD](#patrones-crud)
- [Custom Hooks Principales](#custom-hooks-principales)
- [Estructura de Archivos](#estructura-de-archivos)
- [Checklist para Nuevo Módulo](#checklist-para-nuevo-módulo)

---

## Stack Tecnológico

| Herramienta | Versión | Uso |
|------------|---------|-----|
| React | 18.2 | Framework principal |
| React Router | 7.6 | Enrutamiento SPA |
| Radix UI | v1+ | Componentes base accesibles |
| TailwindCSS | 4.1 | Styling |
| TanStack React Table | 8.21 | Tablas avanzadas |
| react-hook-form | 7.56 | Formularios (opcional) |
| Zod | 3.24 | Validación de esquemas |
| Sonner | 2.0 | Toast notifications |
| date-fns | 3.0 | Manejo de fechas |
| jsPDF + AutoTable | 3.0 + 5.0 | Generación PDF |
| ExcelJS | 4.4 | Exportación Excel |
| Recharts | 2.15 | Gráficas |
| FullCalendar | 6.1 | Calendario |
| Leaflet | 1.9 | Mapas |

---

## Componentes por Módulo

### Módulo: CRM/Contactos

```
components/
├── CRMManagement.jsx (700+ líneas)
│   ├── Búsqueda y filtrado
│   ├── Gestión de clientes
│   ├── Gestión de empleados
│   └── Acciones bulk
└── payroll/EmployeeDetailDrawer.jsx
    ├── Perfil
    ├── Contrato
    ├── Compensación
    └── Documentos
```

**Funciones API clave:**
- `GET /customers?page=1&limit=25`
- `POST /customers`
- `PATCH /customers/{id}`
- `DELETE /customers/{id}`
- `GET /payroll/employees`

### Módulo: Inventario

```
components/
├── InventoryDashboard.jsx (Orquestador)
├── InventoryManagement.jsx
│   ├── Búsqueda y filtros
│   ├── Paginación
│   ├── Gestión de lotes
│   └── Importación/Exportación
├── ProductsManagementWithTabs.jsx
└── ComprasManagement.jsx
```

**Funciones API clave:**
- `GET /inventory?page=1&limit=25`
- `POST /inventory`
- `PATCH /inventory/{id}`
- `GET /products`
- `POST /products`

### Módulo: Órdenes

```
components/
├── OrdersManagementV2.jsx
├── NewOrderFormV2.jsx (400+ líneas)
│   ├── Selección de cliente
│   ├── Agregar productos
│   ├── Cálculo de envío
│   ├── Aplicar descuentos
│   └── Seleccionar modificadores
├── OrdersDataTableV2.jsx
├── OrderStatusSelector.jsx
└── SplitBillModal.jsx
    ├── División por persona
    └── División por artículos
```

**Funciones API clave:**
- `GET /orders?page=1&limit=25`
- `POST /orders`
- `PATCH /orders/{id}`
- `POST /orders/{id}/status`
- `POST /delivery/calculate`
- `GET /orders/__lookup/payment-methods`

### Módulo: Contabilidad

```
components/
├── AccountingDashboard.jsx
├── JournalEntryForm.jsx (250 líneas)
│   ├── Selección de fecha
│   ├── Tabla de líneas editable
│   ├── Validación débitos = créditos
│   └── Cálculos automáticos
├── JournalEntriesView.jsx
├── ChartOfAccountForm.jsx
├── ChartOfAccountsView.jsx
├── BalanceSheetView.jsx
└── ProfitLossView.jsx
```

**Funciones API clave:**
- `GET /accounting/accounts`
- `POST /accounting/accounts`
- `GET /accounting/journal-entries`
- `POST /accounting/journal-entries`
- `GET /accounting/reports/balance-sheet`
- `GET /accounting/reports/profit-and-loss`

### Módulo: Pagos/Cuentas por Pagar

```
components/
├── PayablesManagement.jsx
│   ├── Tabla de cuentas por pagar
│   ├── Crear cuentas por pagar
│   ├── Crear plantillas recurrentes
│   └── Registrar pagos
└── PaymentDialog.jsx
```

**Funciones API clave:**
- `GET /payables`
- `POST /payables`
- `PATCH /payables/{id}`
- `DELETE /payables/{id}`
- `POST /payables/recurring`
- `POST /payments`

---

## Patrones CRUD

### Crear (Create)

```javascript
// 1. Estado local
const [newItem, setNewItem] = useState(initialState);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// 2. Validar
if (!newItem.name) {
  setError('El nombre es requerido');
  return;
}

// 3. API Call
setLoading(true);
try {
  const response = await fetchApi('/endpoint', {
    method: 'POST',
    body: JSON.stringify(newItem),
  });
  toast.success('Creado exitosamente');
  // Recargar lista
  await loadData();
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}
```

### Leer (Read)

```javascript
// Con búsqueda y paginación
const [data, setData] = useState([]);
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(25);
const [total, setTotal] = useState(0);

useEffect(() => {
  loadData();
}, [page, limit, searchTerm]);

const loadData = async () => {
  const params = new URLSearchParams({ page, limit });
  const response = await fetchApi(`/endpoint?${params}`);
  setData(response.data);
  setTotal(response.pagination.total);
};
```

### Actualizar (Update)

```javascript
// En tabla o modal
const handleEdit = (item) => {
  setEditingId(item.id);
  setEditForm(item);
  setIsEditDialogOpen(true);
};

const handleSave = async () => {
  setLoading(true);
  try {
    await fetchApi(`/endpoint/${editingId}`, {
      method: 'PATCH',
      body: JSON.stringify(editForm),
    });
    toast.success('Actualizado exitosamente');
    await loadData();
    setIsEditDialogOpen(false);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Eliminar (Delete)

```javascript
// Con confirmación
const handleDelete = async (id) => {
  if (!confirm('¿Está seguro de que desea eliminar este elemento?')) {
    return;
  }

  setLoading(true);
  try {
    await fetchApi(`/endpoint/${id}`, {
      method: 'DELETE',
    });
    toast.success('Eliminado exitosamente');
    await loadData();
  } catch (err) {
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Custom Hooks Principales

| Hook | Ubicación | Uso |
|------|-----------|-----|
| `useAuth` | `hooks/use-auth.jsx` | Autenticación, usuario, tenant, permisos |
| `useCRM` | `context/CrmContext.jsx` | Datos de CRM, clientes, empleados |
| `useManufacturingOrders` | `hooks/useManufacturingOrders.js` | Órdenes de fabricación |
| `useSupplies` | `hooks/useSupplies.ts` | Gestión de suministros |
| `useConsumables` | `hooks/useConsumables.ts` | Gestión de consumibles |
| `useDashboardCharts` | `hooks/use-dashboard-charts.js` | Gráficas de dashboard |
| `useExchangeRate` | `hooks/useExchangeRate.js` | Tasas de cambio |
| `useUnitConversions` | `hooks/useUnitConversions.js` | Conversiones de unidades |
| `useBillOfMaterials` | `hooks/useBillOfMaterials.js` | Lista de materiales |
| `useBusinessModel` | `hooks/useBusinessModel.js` | Configuración de negocio |

### Patrón de Custom Hook

```javascript
export const useMyHook = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/endpoint', { /* params */ });
      setData(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createItem = useCallback(async (item) => {
    try {
      setLoading(true);
      const response = await fetchApi('/endpoint', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      await loadData();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  return { data, loading, error, loadData, createItem };
};
```

---

## Estructura de Archivos

### Por Componente (Patrón Recomendado)

```
features/
├── customers/
│   ├── components/
│   │   ├── CustomerForm.jsx
│   │   ├── CustomerTable.jsx
│   │   └── CustomerDetailDrawer.jsx
│   ├── hooks/
│   │   └── useCustomers.js
│   ├── pages/
│   │   └── CustomersPage.jsx
│   └── types/
│       └── customer.ts
```

### Estructura Actual

```
src/
├── components/
│   ├── CRMManagement.jsx
│   ├── InventoryDashboard.jsx
│   └── [...otros componentes]
├── hooks/
│   ├── use-auth.jsx
│   ├── useSupplies.ts
│   └── [...otros hooks]
├── context/
│   ├── CrmContext.jsx
│   ├── AuthContext.jsx
│   └── [...otros contextos]
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── [...otras páginas]
├── lib/
│   ├── api.js
│   ├── utils.js
│   └── [...utilidades]
└── types/
    └── consumables.ts
```

---

## Checklist para Nuevo Módulo

### 1. Setup Inicial

- [ ] Crear carpeta en `components/` (ej: `mymodule/`)
- [ ] Crear hook en `hooks/` (ej: `useMyModule.js`)
- [ ] Crear contexto si es necesario en `context/`
- [ ] Crear tipos en `types/` si es TypeScript
- [ ] Registrar rutas en `App.jsx`

### 2. Componente Principal

```jsx
// components/MyModuleDashboard.jsx
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function MyModuleDashboard() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Mi Módulo</h2>
        <p className="text-muted-foreground">Descripción</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Listado</TabsTrigger>
          <TabsTrigger value="create">Crear</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <MyModuleList />
        </TabsContent>

        <TabsContent value="create">
          <MyModuleForm onSuccess={() => setActiveTab('list')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 3. Custom Hook

```javascript
// hooks/useMyModule.js
import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useMyModule = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadItems = useCallback(async (page = 1, limit = 25, filters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const response = await fetchApi(`/my-module?${params}`);
      setItems(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createItem = async (itemData) => {
    try {
      setLoading(true);
      await fetchApi('/my-module', {
        method: 'POST',
        body: JSON.stringify(itemData),
      });
      await loadItems();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { items, loading, error, loadItems, createItem };
};
```

### 4. Tabla con Paginación

```jsx
// components/MyModuleList.jsx
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useMyModule } from '@/hooks/useMyModule';

export function MyModuleList() {
  const { items, loading, loadItems } = useMyModule();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    loadItems(page, pageSize);
  }, [page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Editar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <Button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
          Anterior
        </Button>
        <span>Página {page}</span>
        <Button onClick={() => setPage(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
```

### 5. Formulario de Creación

```jsx
// components/MyModuleForm.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMyModule } from '@/hooks/useMyModule';
import { toast } from 'sonner';

export function MyModuleForm({ onSuccess }) {
  const { createItem, loading, error } = useMyModule();
  const [form, setForm] = useState({ name: '', description: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      await createItem(form);
      toast.success('Creado exitosamente');
      setForm({ name: '', description: '' });
      onSuccess?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ingrese nombre"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Ingrese descripción"
        />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear'}
      </Button>
    </form>
  );
}
```

### 6. Registrar Ruta

```jsx
// App.jsx
<Route element={<ProtectedRoute />}>
  {/* ... otras rutas */}
  <Route path="/my-module" element={<MyModuleDashboard />} />
</Route>
```

### 7. Agregar al Menú

```jsx
// App.jsx - En el Sidebar
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link to="/my-module">
      <Package className="h-4 w-4" />
      <span>Mi Módulo</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

---

## Patrones de Error Handling

### Notificaciones Toast

```javascript
import { toast } from 'sonner';

// Éxito
toast.success('Operación completada');

// Error
toast.error('Ocurrió un error');

// Info
toast.info('Cargando datos...');

// Personalizado
toast.custom((t) => (
  <div>Mensaje personalizado</div>
));
```

### Alert en Formularios

```jsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

---

## Performance Tips

1. **useCallback para funciones**: Evita re-renders innecesarios
2. **useMemo para datos**: Cachea cálculos costosos
3. **Lazy load componentes**: `const Component = lazy(() => import(...))`
4. **Debouncing en búsquedas**: 600ms es estándar
5. **useRef para prevenir duplicados**: Especialmente en useEffect

---

## Testing Patterns

```javascript
// Estructura básica de tests
describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const { getByRole, getByLabelText } = render(<MyModuleForm />);
    fireEvent.change(getByLabelText('Name'), { target: { value: 'Test' } });
    fireEvent.click(getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
    });
  });
});
```

---

## Recursos Útiles

- **Documentación Radix UI**: https://www.radix-ui.com/
- **TanStack Table**: https://tanstack.com/table/
- **Tailwind CSS**: https://tailwindcss.com/
- **React Router**: https://reactrouter.com/
- **date-fns**: https://date-fns.org/

---

## Quick Imports

```javascript
// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Hooks
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Utilities
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Icons
import { Plus, Edit, Trash2, Search, Filter, Loader2, AlertCircle } from 'lucide-react';
```

