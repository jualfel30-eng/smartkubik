# Análisis Exhaustivo de Patrones de Frontend del ERP SmartKubik

## Estructura General del Proyecto

### Stack Tecnológico
- **Framework**: React 18.2 + React Router v7
- **Gestión de Estado**: Context API + Custom Hooks
- **Validación**: Zod + react-hook-form
- **UI Framework**: Radix UI (Componentes base)
- **Styling**: Tailwind CSS 4.1
- **Tablas**: TanStack React Table v8
- **Formularios**: react-hook-form v7
- **Notificaciones**: Sonner (Toast system)
- **Iconos**: Lucide React
- **Documentos**: jsPDF + jsPDF-AutoTable, ExcelJS
- **Calendario**: FullCalendar v6

---

## 1. ESTRUCTURA DE COMPONENTES

### Organización de Directorios

```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes base (Radix UI wraps)
│   ├── restaurant/     # Módulo específico
│   ├── production/     # Módulo específico
│   ├── payroll/        # Módulo específico
│   ├── orders/v2/      # Módulo específico (v2)
│   ├── tables/         # Componentes de tablas
│   ├── charts/         # Componentes de gráficas
│   ├── super-admin/    # Componentes admin
│   ├── hospitality/    # Módulo especializado
│   └── StorefrontSettings/  # Settings modulares
├── hooks/              # Custom hooks reutilizables
├── context/            # Context providers
├── pages/              # Páginas/Rutas
├── lib/               # Utilidades y API
└── types/             # TypeScript types
```

### Patrón de Componentes Modulares

Los módulos completos siguen este patrón:

1. **Componente Container** (ej: `InventoryDashboard.jsx`)
   - Maneja la navegación de pestañas
   - Coordina múltiples sub-módulos
   - Sincroniza estado con URL params

2. **Componentes de Dominio** (ej: `InventoryManagement.jsx`)
   - Lógica específica del módulo
   - Gestión de datos
   - CRUD operations

3. **Componentes UI** (ej: `Dialog`, `Table`)
   - Componentes visuales reutilizables
   - Wraps de Radix UI
   - Sin lógica de negocio

### Ejemplo: Estructura del Módulo Inventario

```jsx
// InventoryDashboard.jsx - Orquestador
export default function InventoryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  return (
    <Tabs value={getMainTab()} onValueChange={handleTabChange}>
      <TabsContent value="products">
        <ProductsManagementWithTabs activeSubTab={activeTab} />
      </TabsContent>
      <TabsContent value="inventory">
        <InventoryManagement />
      </TabsContent>
      <TabsContent value="purchases">
        <ComprasManagement />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 2. PATRONES DE FORMULARIOS

### Enfoque: Formularios con Estado Local + Validación Manual

**Nota**: El proyecto usa `react-hook-form` pero mayormente con validación manual y estado local.

### Patrón de Formulario Complejo: JournalEntryForm.jsx

```jsx
import { useState, useEffect } from 'react';
import { fetchChartOfAccounts, createJournalEntry } from '@/lib/api';

const JournalEntryForm = ({ onSuccess }) => {
  // Estado del formulario
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { accountId: '', description: '', debit: '', credit: '' },
    { accountId: '', description: '', debit: '', credit: '' },
  ]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const fetchedAccounts = await fetchChartOfAccounts();
        const formattedAccounts = fetchedAccounts.data.map(acc => ({ 
          value: acc._id, 
          label: `${acc.code} - ${acc.name}` 
        }));
        setAccounts(formattedAccounts);
      } catch (err) {
        setError('Error al cargar las cuentas.');
      }
    };
    loadAccounts();
  }, []);

  // Handlers para cambios de línea
  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  // Agregar/Remover líneas
  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', debit: '', credit: '' }]);
  };

  const removeLine = (index) => {
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  // Validación completa
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!date || !description.trim()) {
      setError('La fecha y la descripción son obligatorias.');
      return;
    }
    
    if (lines.some(line => !line.accountId)) {
      setError('Todas las líneas deben tener una cuenta seleccionada.');
      return;
    }

    if (lines.length < 2) {
      setError('Un asiento contable debe tener al menos dos líneas.');
      return;
    }

    const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);

    // Validar balance (Debe = Haber)
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      setError('El total de débitos debe ser igual al total de créditos.');
      return;
    }
    
    if (totalDebits === 0 && totalCredits === 0) {
      setError('El asiento debe tener valores mayores a cero.');
      return;
    }

    // Enviar
    setLoading(true);
    try {
      const entryData = {
        date: date.toISOString(),
        description,
        lines: lines.map(line => ({
          accountId: line.accountId,
          description: line.description,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
        })),
      };
      
      await createJournalEntry(entryData);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  // Cálculos en tiempo real
  const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const difference = totalDebits - totalCredits;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input 
            id="description" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Ej: Aporte de capital inicial"
          />
        </div>
      </div>

      {/* Tabla de líneas de asiento */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Cuenta</TableHead>
              <TableHead className="w-[40%]">Descripción</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">Haber</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Combobox
                    options={accounts}
                    value={line.accountId}
                    onChange={(value) => handleLineChange(index, 'accountId', value)}
                    placeholder="Seleccione una cuenta..."
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={line.description} 
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                    placeholder="Descripción de la línea"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number"
                    step="0.01"
                    value={line.debit}
                    onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                    className="text-right"
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number"
                    step="0.01"
                    value={line.credit}
                    onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                    className="text-right"
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeLine(index)} 
                    disabled={lines.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Resumen y totales */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addLine}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Línea
        </Button>
        <div className={cn(
          "text-right font-mono p-2 rounded-md text-sm",
          Math.abs(difference) > 0.01 ? "bg-destructive text-destructive-foreground" : "bg-muted"
        )}>
          <div>Total Debe: {totalDebits.toFixed(2)}</div>
          <div>Total Haber: {totalCredits.toFixed(2)}</div>
          <div className="font-bold mt-1 border-t pt-1">Diferencia: {difference.toFixed(2)}</div>
        </div>
      </div>

      {/* Errores */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || Math.abs(difference) > 0.01}>
          {loading ? 'Guardando...' : 'Guardar Asiento'}
        </Button>
      </div>
    </form>
  );
};
```

### Patrón de Formulario Complejo: NewOrderFormV2.jsx

```jsx
// Manejo avanzado de formularios con validaciones condicionales
const initialOrderState = {
  customerId: '',
  customerName: '',
  customerRif: '',
  taxType: 'V',
  items: [],
  deliveryMethod: 'pickup',
  notes: '',
  customerLocation: null,
  useExistingLocation: true,
  shippingAddress: {
    state: 'Carabobo',
    city: 'Valencia',
    street: '',
  },
};

export function NewOrderFormV2({ onOrderCreated }) {
  const { crmData: customers, loading: contextLoading } = useCrmContext();
  const { rate: bcvRate, loading: loadingRate, error: rateError } = useExchangeRate();
  const { tenant, hasPermission } = useAuth();
  const canApplyDiscounts = hasPermission('orders_apply_discounts');

  // Estados separados para búsquedas
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  const [newOrder, setNewOrder] = useState(initialOrderState);
  
  // Estados para descuentos
  const [showItemDiscountDialog, setShowItemDiscountDialog] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState(null);
  const [itemDiscountPercentage, setItemDiscountPercentage] = useState(0);
  const [itemDiscountReason, setItemDiscountReason] = useState('');

  // Cálculo dinámico de costo de envío
  useEffect(() => {
    const calculateShipping = async () => {
      if (newOrder.deliveryMethod === 'pickup') {
        setShippingCost(0);
        return;
      }

      // Validar que tenemos ubicación o dirección
      if (newOrder.deliveryMethod === 'delivery' && !newOrder.customerLocation?.coordinates) {
        setShippingCost(0);
        return;
      }

      setCalculatingShipping(true);
      try {
        const subtotal = newOrder.items.reduce((sum, item) => {
          const quantity = parseFloat(item.quantity) || 0;
          const price = item.finalPrice || item.unitPrice || 0;
          return sum + (price * quantity);
        }, 0);

        const payload = {
          method: newOrder.deliveryMethod,
          orderAmount: subtotal,
          ...(newOrder.deliveryMethod === 'delivery' && {
            customerLocation: newOrder.customerLocation.coordinates
          }),
          ...(newOrder.deliveryMethod === 'envio_nacional' && {
            destinationState: newOrder.shippingAddress.state,
            destinationCity: newOrder.shippingAddress.city,
          }),
        };

        const result = await fetchApi('/delivery/calculate', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setShippingCost(result.cost || 0);
      } catch (error) {
        console.error('Error calculating shipping:', error);
        setShippingCost(0);
      } finally {
        setCalculatingShipping(false);
      }
    };

    calculateShipping();
  }, [
    newOrder.deliveryMethod,
    newOrder.customerLocation,
    newOrder.shippingAddress.state,
    newOrder.shippingAddress.city,
    newOrder.items,
  ]);
}
```

### Características Clave de Formularios:

1. **Estado Local Transparente**: Cada campo está en su propio estado
2. **Validación Reactiva**: Se valida mientras se escribe
3. **Cálculos Dinámicos**: Totales, diferencias, impuestos se actualizan en tiempo real
4. **Error Handling Detallado**: Mensajes específicos para cada validación
5. **Operaciones CRUD en Líneas**: Agregar/editar/eliminar elementos de listas
6. **Integración con API**: Llamadas síncronas a funciones de API

---

## 3. DRAWERS Y MODALES

### Patrón: Drawer para Detalles Complejos (EmployeeDetailDrawer.jsx)

```jsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx';
import { useState, useCallback, useRef } from 'react';

export default function EmployeeDetailDrawer({ employee, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState(createEmptyProfileForm());
  const [contractForm, setContractForm] = useState(defaultContractForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar datos cuando se abre el drawer
  useEffect(() => {
    if (isOpen && employee) {
      loadEmployeeDetails();
    }
  }, [isOpen, employee?.id]);

  // Múltiples tabs con contenido complejo
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-w-4xl">
        <DrawerHeader>
          <DrawerTitle>{employee?.name}</DrawerTitle>
          <DrawerDescription>
            ID: {employee?.employeeNumber}
          </DrawerDescription>
        </DrawerHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="contract">Contrato</TabsTrigger>
            <TabsTrigger value="compensation">Compensación</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            {/* Formulario de perfil */}
          </TabsContent>

          <TabsContent value="contract" className="space-y-4">
            {/* Formulario de contrato */}
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4">
            {/* Formulario de compensación */}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {/* Gestión de documentos */}
          </TabsContent>
        </Tabs>

        <DrawerClose asChild>
          <Button variant="outline">Cerrar</Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
```

### Patrón: Modal para Acciones (SplitBillModal.jsx)

```jsx
export default function SplitBillModal({ order, onClose, onSuccess }) {
  const [splitType, setSplitType] = useState('by_person'); // 'by_person' | 'by_items'
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [tipPercentage, setTipPercentage] = useState(10);
  const [personNames, setPersonNames] = useState(['', '']);
  const [itemAssignments, setItemAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lógica condicional para diferentes tipos de división
  const handleSplitTypeChange = (type) => {
    setSplitType(type);
    if (type === 'by_items') {
      initializeAssignments();
    }
  };

  const handleNumberOfPeopleChange = (value) => {
    const num = parseInt(value) || 2;
    setNumberOfPeople(num);

    // Ajustar arrays dinámicamente
    const newNames = [...personNames];
    while (newNames.length < num) {
      newNames.push('');
    }
    setPersonNames(newNames.slice(0, num));

    if (splitType === 'by_items') {
      const newAssignments = [];
      for (let i = 0; i < num; i++) {
        newAssignments.push(
          itemAssignments[i] || {
            personName: newNames[i] || `Persona ${i + 1}`,
            itemIds: [],
            tipAmount: 0,
          }
        );
      }
      setItemAssignments(newAssignments);
    }
  };

  // Preview en tiempo real
  const calculateSplitPreview = () => {
    if (splitType === 'by_person') {
      const baseAmount = order.totalAmount;
      const tipTotal = (baseAmount * tipPercentage) / 100;
      const grandTotal = baseAmount + tipTotal;
      const amountPerPerson = grandTotal / numberOfPeople;
      const tipPerPerson = tipTotal / numberOfPeople;

      return {
        baseAmount,
        tipTotal,
        grandTotal,
        perPerson: amountPerPerson,
        tipPerPerson,
      };
    } else {
      // by_items: calcular por artículo asignado
      const parts = itemAssignments.map((assignment) => {
        let subtotal = 0;
        assignment.itemIds.forEach((itemId) => {
          const item = order.items.find((i) => i._id === itemId);
          if (item) {
            subtotal += item.finalPrice || item.totalPrice;
          }
        });

        const tip = (subtotal * tipPercentage) / 100;
        return {
          personName: assignment.personName,
          subtotal,
          tip,
          total: subtotal + tip,
        };
      });

      return {
        parts,
        baseAmount: order.totalAmount,
        tipTotal: parts.reduce((sum, p) => sum + p.tip, 0),
      };
    }
  };

  const preview = calculateSplitPreview();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dividir Cuenta</DialogTitle>
          <DialogDescription>
            Monto total: {order.totalAmount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        {/* Tipo de división */}
        <div className="space-y-4">
          <div>
            <Label>Tipo de División</Label>
            <ToggleGroup value={splitType} onValueChange={handleSplitTypeChange}>
              <ToggleGroupItem value="by_person">Por Persona</ToggleGroupItem>
              <ToggleGroupItem value="by_items">Por Artículos</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Número de personas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Número de Personas</Label>
              <Input 
                type="number" 
                min="1" 
                value={numberOfPeople}
                onChange={(e) => handleNumberOfPeopleChange(e.target.value)}
              />
            </div>
            <div>
              <Label>Propina (%)</Label>
              <Input 
                type="number" 
                min="0" 
                value={tipPercentage}
                onChange={(e) => setTipPercentage(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Nombres de personas */}
          {splitType === 'by_person' && (
            <div className="space-y-2">
              <Label>Nombres</Label>
              {personNames.map((name, index) => (
                <Input
                  key={index}
                  value={name}
                  onChange={(e) => handlePersonNameChange(index, e.target.value)}
                  placeholder={`Persona ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Asignación de artículos */}
          {splitType === 'by_items' && (
            <div className="space-y-3">
              {itemAssignments.map((assignment, personIdx) => (
                <Card key={personIdx}>
                  <CardContent className="pt-4">
                    <Input
                      value={assignment.personName}
                      onChange={(e) => handlePersonNameChange(personIdx, e.target.value)}
                      placeholder={`Persona ${personIdx + 1}`}
                      className="mb-3"
                    />
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <label key={item._id} className="flex items-center gap-2">
                          <Checkbox
                            checked={assignment.itemIds.includes(item._id)}
                            onChange={() => toggleItemAssignment(personIdx, item._id)}
                          />
                          <span className="text-sm">
                            {item.name} - ${(item.finalPrice || item.totalPrice).toFixed(2)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Preview de la división */}
        <Card className="bg-muted">
          <CardContent className="pt-4">
            {splitType === 'by_person' ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${preview.baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Propina Total:</span>
                  <span>${preview.tipTotal.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Por Persona:</span>
                  <span>${preview.perPerson.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {preview.parts.map((part, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{part.personName}: ${part.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${(preview.baseAmount + preview.tipTotal).toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSplit} disabled={loading}>
            {loading ? 'Dividiendo...' : 'Dividir Cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Patrones de Modales:

1. **Dialog**: Para formularios cortos y confirmaciones
2. **Drawer**: Para formularios complejos en dispositivos móviles
3. **Composición**: Frecuentemente contienen Tabs, Forms y Tablas
4. **Estado Aislado**: Cada modal gestiona su propio estado
5. **Callbacks**: `onClose`, `onSuccess` para comunicación con padre

---

## 4. TABLAS Y LISTADOS

### Patrón: Tabla con TanStack React Table

```jsx
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

export function OrdersDataTableV2({ columns, data, pagination, onPageChange, pageLimit, onPageLimitChange }) {
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? -1,
  });

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      onPageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      onPageChange(pagination.page + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabla */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Controles de paginación */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Mostrando {data?.length || 0} de {pagination.total || 0} órdenes
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Selector de filas por página */}
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Filas por página:</p>
              <Select
                value={pageLimit?.toString() || "25"}
                onValueChange={(value) => onPageLimitChange?.(parseInt(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageLimit?.toString() || "25"} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 25, 50, 100].map((limit) => (
                    <SelectItem key={limit} value={limit.toString()}>
                      {limit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botones de navegación */}
            {pagination.totalPages > 1 && (
              <>
                <div className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={pagination.page <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Patrón: Tabla con Búsqueda, Filtros y Paginación

```jsx
// InventoryManagement.jsx
const [inventoryData, setInventoryData] = useState([]);
const [filteredData, setFilteredData] = useState([]);
const [searchTerm, setSearchTerm] = useState('');
const [filterCategory, setFilterCategory] = useState('all');
const [committedSearch, setCommittedSearch] = useState('');

// Estados de paginación
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [totalItems, setTotalItems] = useState(0);
const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

const lastQueryRef = useRef({ search: null, limit: null });

// Cargar datos con búsqueda y filtros
const loadData = useCallback(async ({ page, limit, search }) => {
  try {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search && search.trim() !== '') {
      params.set('search', search.trim());
    }

    if (filterCategory !== 'all') {
      params.set('category', filterCategory);
    }

    const response = await fetchApi(`/inventory?${params.toString()}`);

    setInventoryData(response.data || []);
    setCurrentPage(response.pagination?.page || page);
    setTotalPages(response.pagination?.totalPages || 1);
    setTotalItems(response.pagination?.total || 0);
    setItemsPerPage(response.pagination?.limit || limit);

    lastQueryRef.current = { search, limit };
  } catch (err) {
    console.error("Error loading inventory:", err.message);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [filterCategory]);

// Búsqueda con debounce
useEffect(() => {
  const timer = setTimeout(() => {
    if (searchTerm.trim() !== committedSearch.trim()) {
      const newLimit = searchTerm.trim() ? SEARCH_ITEMS_PER_PAGE : DEFAULT_ITEMS_PER_PAGE;
      setCommittedSearch(searchTerm);
      setCurrentPage(1);
      loadData({ page: 1, limit: newLimit, search: searchTerm });
    }
  }, SEARCH_DEBOUNCE_MS);

  return () => clearTimeout(timer);
}, [searchTerm, committedSearch, loadData]);

// Cambio de categoría
useEffect(() => {
  setCurrentPage(1);
  loadData({ page: 1, limit: itemsPerPage, search: committedSearch });
}, [filterCategory, loadData]);
```

### Características de Tablas:

1. **Paginación Manual**: Control del servidor
2. **Búsqueda Debounceada**: Espera 600ms antes de buscar
3. **Filtros Múltiples**: Categoría, estado, etc.
4. **Filas por Página Configurable**: 10, 25, 50, 100
5. **Estado de Carga**: Indicadores visuales
6. **Mensajes Vacíos**: Cuando no hay resultados
7. **Exportación**: A CSV, Excel, PDF

---

## 5. INTEGRACIÓN CON API

### Patrón: Cliente API Centralizado (lib/api.js)

```javascript
const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

export const fetchApi = async (url, options = {}) => {
  const token = getAuthToken();

  const headers = { ...options.headers };

  // Dejar que el navegador establezca Content-Type para FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Prevención agresiva de caché
  headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';

  // Agregar token de autenticación
  if (token && !options.isPublic) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Detectar environment
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  const baseUrl = isDevelopment 
    ? 'http://localhost:3000' 
    : 'https://api.smartkubik.com';

  const response = await fetch(`${baseUrl}/api/v1${url}`, {
    ...options,
    headers,
  });

  // Manejo de errores
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      const errorText = await response.text();
      console.error("Failed to parse JSON response:", errorText);
      errorData = { message: response.statusText };
    }

    if (!errorData) {
      errorData = { message: response.statusText || 'Error en la petición a la API' };
    }

    let errorMessage = errorData.message || 'Error en la petición a la API';
    if (Array.isArray(errorMessage)) {
      errorMessage = errorMessage.join(', ');
    }
    if (!errorMessage) {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  }

  // Respuesta vacía (204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

// Funciones específicas por módulo
export const fetchChartOfAccounts = () => {
  return fetchApi(`/accounting/accounts`);
};

export const createJournalEntry = (entryData) => {
  return fetchApi('/accounting/journal-entries', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

export const getPayables = () => {
  return fetchApi('/payables');
};

export const createPayable = (payableData) => {
  return fetchApi('/payables', {
    method: 'POST',
    body: JSON.stringify(payableData),
  });
};

// Soporte para FormData (archivos)
export const uploadTenantLogo = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchApi('/tenant/logo', {
    method: 'POST',
    body: formData,
  });
};
```

### Patrón: Custom Hooks para Datos

```javascript
// useManufacturingOrders.js
export const useManufacturingOrders = () => {
  const [manufacturingOrders, setManufacturingOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadManufacturingOrders = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/manufacturing-orders${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setManufacturingOrders(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setManufacturingOrders([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createManufacturingOrder = async (orderData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/manufacturing-orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateManufacturingOrder = async (id, orderData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(orderData),
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmManufacturingOrder = async (id, confirmData = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify(confirmData),
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    manufacturingOrders,
    loading,
    error,
    loadManufacturingOrders,
    createManufacturingOrder,
    updateManufacturingOrder,
    confirmManufacturingOrder,
  };
};
```

### Características:

1. **Centralización**: Todas las APIs en un archivo
2. **Manejo de Headers**: Autenticación automática
3. **Gestión de Errores**: Parsing de errores JSON y texto
4. **Soporte para FormData**: Para subidas de archivos
5. **URLs Base Dinámicas**: Dev vs Producción
6. **Prevent Cache**: Headers específicos para no cachear

---

## 6. MANEJO DE ESTADO

### Context API: AuthContext

```jsx
// context/CrmContext.jsx
export const CrmContext = createContext();

export const CrmProvider = ({ children }) => {
  const [crmData, setCrmData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const lastQueryRef = useRef({
    page: 1,
    limit: 25,
    filters: {},
  });

  const loadCustomers = useCallback(async (page = 1, limit = 25, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.search && filters.search.trim() !== '') {
        params.set('search', filters.search.trim());
      }
      if (filters.customerType && filters.customerType !== 'all') {
        params.set('customerType', filters.customerType);
      }

      const response = await fetchApi(`/customers?${params.toString()}`);

      setCrmData(response.data?.customers || response.data || []);
      setTotalCustomers(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 0);
      setCurrentPage(page);
      setPageLimit(limit);
      
      lastQueryRef.current = {
        page,
        limit,
        filters: { ...filters },
      };
    } catch (err) {
      console.error("Error loading customers:", err.message);
      setCrmData([]);
      setTotalCustomers(0);
      setTotalPages(0);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCustomer = async (customerData) => {
    try {
      setLoading(true);
      const response = await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
      
      // Recargar la lista
      await loadCustomers(lastQueryRef.current.page, lastQueryRef.current.limit, lastQueryRef.current.filters);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCustomer = async (customerId, updates) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      
      await loadCustomers(lastQueryRef.current.page, lastQueryRef.current.limit, lastQueryRef.current.filters);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    crmData,
    loading,
    error,
    addCustomer,
    updateCustomer,
    loadCustomers,
    currentPage,
    pageLimit,
    totalCustomers,
    totalPages,
    setCurrentPage,
    setPageLimit,
  };

  return (
    <CrmContext.Provider value={value}>{children}</CrmContext.Provider>
  );
};

export const useCRM = () => {
  return useContext(CrmContext);
};
```

### Patrones de Estado:

1. **Context para Datos Globales**: Auth, CRM, Accounting
2. **Refs para Tracking**: `lastQueryRef` para mantener estado de búsqueda
3. **Memoización**: `useCallback` para evitar re-renders
4. **useRef para Refs de Carga**: Prevenir double-fetching en Strict Mode

---

## 7. EJEMPLOS PRÁCTICOS DE MÓDULOS COMPLETOS

### Módulo Completo: Inventario

**Estructura:**
- InventoryDashboard.jsx (Orquestador)
- InventoryManagement.jsx (Gestión de inventario)
- ProductsManagementWithTabs.jsx (Gestión de productos)
- ComprasManagement.jsx (Gestión de compras)

**Características:**
- Búsqueda y filtrado por categoría
- Paginación con límites configurables
- CRUD de inventarios
- Gestión de lotes y expiración
- Importación/exportación a Excel
- Validaciones en línea

### Módulo Completo: Contabilidad

**Componentes:**
- AccountingDashboard.jsx
- JournalEntryForm.jsx (Crear asientos)
- JournalEntriesView.jsx (Listar asientos)
- ChartOfAccountsView.jsx (Ver cuentas)
- BalanceSheetView.jsx (Reporte)
- ProfitLossView.jsx (Reporte)

**Características:**
- Validación de débitos = créditos
- Selección de cuentas con Combobox
- Cálculos automáticos
- Reportes financieros
- Integraciones con banco

### Módulo Completo: Órdenes

**Componentes:**
- OrdersManagementV2.jsx
- NewOrderFormV2.jsx (Crear orden)
- OrdersDataTableV2.jsx (Tabla de órdenes)
- OrderStatusSelector.jsx (Cambiar estado)
- SplitBillModal.jsx (Dividir cuenta)

**Características:**
- Búsqueda de clientes y productos
- Cálculo dinámico de envío
- Aplicación de descuentos
- División de cuentas
- Integración con modifiers (restaurante)
- Multi-moneda

---

## 8. UTILIDADES Y LIBRERÍAS

### Librerías Clave:

| Librería | Uso |
|----------|-----|
| @tanstack/react-table | Tablas avanzadas |
| @radix-ui/* | Componentes accesibles |
| sonner | Toast notifications |
| date-fns | Manejo de fechas |
| zod | Validación de esquemas |
| react-hook-form | Gestión de formularios |
| xlsx | Importación/exportación Excel |
| jsPDF | Generación de PDFs |
| recharts | Gráficas |
| @fullcalendar/react | Calendario |
| react-router-dom | Routing |
| leaflet | Mapas |

---

## 9. PATRONES DE VALIDACIÓN

### Validaciones Manuales (Más Común)

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);

  // Validaciones secuenciales
  if (!date || !description.trim()) {
    setError('La fecha y la descripción son obligatorias.');
    return;
  }
  
  if (lines.some(line => !line.accountId)) {
    setError('Todas las líneas deben tener una cuenta seleccionada.');
    return;
  }

  if (lines.length < 2) {
    setError('Un asiento contable debe tener al menos dos líneas.');
    return;
  }

  const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    setError('El total de débitos debe ser igual al total de créditos.');
    return;
  }
  
  if (totalDebits === 0 && totalCredits === 0) {
    setError('El asiento debe tener valores mayores a cero.');
    return;
  }

  // Enviar datos
  await submitForm();
};
```

### Validación con Zod (Menos usado)

```typescript
// Cuando se necesita validación más robusta
import { z } from 'zod';

const OrderSchema = z.object({
  customerId: z.string().min(1, 'Cliente requerido'),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(1),
  })).min(1, 'Al menos un artículo'),
  notes: z.string().optional(),
});
```

---

## 10. PATRONES DE CARGA Y ERRORES

### Loading States

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Indicadores visuales
{loading && <Loader2 className="animate-spin" />}
{error && <Alert variant="destructive">{error}</Alert>}

// Botones deshabilitados durante carga
<Button disabled={loading || Math.abs(difference) > 0.01}>
  {loading ? 'Guardando...' : 'Guardar'}
</Button>
```

### Notificaciones (Toast)

```javascript
import { toast } from 'sonner';

// Éxito
toast.success("Plantilla de pago recurrente creada con éxito.");

// Error
toast.error("No se pudo crear la plantilla.");

// Info
toast.info("Procesando...");
```

---

## 11. REFERENCIAS DE COMPONENTES BIEN IMPLEMENTADOS

### Top 5 Componentes para Estudiar:

1. **EmployeeDetailDrawer.jsx** (500+ líneas)
   - Drawer con tabs múltiples
   - Formularios anidados
   - Gestión compleja de estado
   - Validaciones condicionales

2. **NewOrderFormV2.jsx** (400+ líneas)
   - Formulario multietapa
   - Cálculos dinámicos
   - Integración con múltiples contextos
   - Búsquedas y selecciones

3. **CRMManagement.jsx** (700+ líneas)
   - Tabla compleja con filtros
   - Búsqueda debounceada
   - Paginación
   - Acciones bulk

4. **InventoryManagement.jsx** (600+ líneas)
   - Búsqueda y filtrado
   - Importación/exportación
   - Gestión de lotes
   - Múltiples modos de visualización

5. **JournalEntryForm.jsx** (250 líneas)
   - Validaciones de balance
   - Tabla editable
   - Cálculos en tiempo real
   - Error handling

---

## 12. PATRONES DE ENRUTAMIENTO

```jsx
// App.jsx - Rutas principales
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<DashboardView />} />
    
    <Route path="/crm" element={<CRMManagement />} />
    <Route path="/inventory" element={<InventoryDashboard />} />
    <Route path="/orders" element={<OrdersManagementV2 />} />
    <Route path="/accounting" element={<AccountingManagement />} />
    <Route path="/payroll" element={<PayrollManagement />} />
    
    <Route path="/settings" element={<SettingsPage />} />
  </Route>

  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>

// Sincronización con URL
const [searchParams, setSearchParams] = useSearchParams();

const handleTabChange = (newTab) => {
  setActiveTab(newTab);
  setSearchParams({ tab: newTab }, { replace: true }); // Persisten en URL
};
```

---

## 13. BEST PRACTICES OBSERVADAS

### ✅ Buenas Prácticas

1. **Separación de Responsabilidades**
   - Componentes de presentación vs. lógica
   - Hooks custom para reutilizar lógica
   - Contextos para estado global

2. **Manejo de Datos**
   - useRef para prevenir double-fetching
   - Refs para mantener estado de última búsqueda
   - Deduplicación de datos

3. **UX/DX**
   - Debouncing en búsquedas
   - Estados de carga claros
   - Mensajes de error descriptivos
   - Toast notifications

4. **Rendimiento**
   - useMemo para cálculos costosos
   - useCallback para callbacks estables
   - Lazy loading de componentes

5. **Formularios**
   - Validación progresiva
   - Feedback en tiempo real
   - Estados de guardado claros

### ⚠️ Patrones a Revisar

1. **No usar React Hook Form agresivamente**
   - Está disponible pero no es el patrón principal
   - Mejor usar estado local + validación manual

2. **No usar useQuery/useMutation de React Query**
   - Mejor uso de custom hooks + Context API
   - Más control manual pero menos magia

3. **Validación con Zod no es estándar**
   - Validación manual es la norma
   - Zod se usa puntualmente

---

## 14. ESTRUCTURA DE UN MÓDULO NUEVO (TEMPLATE)

```jsx
// pages/NewModule.jsx
import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export default function NewModulePage() {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Mi Nuevo Módulo</h2>
        <p className="text-muted-foreground">Descripción del módulo</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Listado</TabsTrigger>
          <TabsTrigger value="create">Crear</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ModuleList />
        </TabsContent>

        <TabsContent value="create">
          <ModuleForm onSuccess={() => setActiveTab('list')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// components/ModuleList.jsx
function ModuleList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Cargar datos
      const response = await fetchApi('/module?page=1&limit=25');
      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Tabla y filtros */}
    </div>
  );
}

// components/ModuleForm.jsx
function ModuleForm({ onSuccess }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar
    if (!formData.name) {
      setError('El nombre es requerido');
      return;
    }

    try {
      setLoading(true);
      await fetchApi('/module', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success('Creado exitosamente');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
```

---

## Conclusión

El frontend del ERP SmartKubik sigue patrones consistentes y bien definidos:

- **Componentes modulares** organizados por características
- **State management simple** con Context API + Hooks
- **Formularios con validación manual** en lugar de librerías pesadas
- **Tablas complejas** usando TanStack React Table
- **Integración API centralizada** en `lib/api.js`
- **UX robusta** con loading states, error handling y notificaciones

Estos patrones son escalables y mantenibles para aplicaciones empresariales complejas.

