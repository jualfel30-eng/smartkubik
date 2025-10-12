# Guía de Integración - Módulos de Restaurante

## 📋 Estado Actual

**Módulos Implementados (Backend + Frontend):**
1. ✅ Table Management (Gestión de Mesas)
2. ✅ Order Modifiers (Modificadores de Productos)
3. ✅ Split Bills & Payments (División de Cuentas)
4. ✅ Kitchen Display System (Sistema de Cocina)

**Estado:** Todos los módulos están **completos y funcionales**, pero **NO están integrados** en el flujo de OrdersManagement.

**Lo que funciona ahora:**
- `/restaurant/floor-plan` - Gestión de mesas (independiente)
- `/restaurant/kitchen-display` - Pantalla de cocina (independiente)
- Componentes `ModifierSelector` y `SplitBillModal` existen pero no se usan

**Lo que falta:** Conectar estos módulos al flujo de creación/gestión de órdenes.

---

## 🎯 Objetivo de Esta Guía

Integrar los 4 módulos de restaurante en el flujo de trabajo de **OrdersManagement**, para que:
1. Al agregar productos, se seleccionen modificadores
2. Al ver una orden, se pueda dividir la cuenta
3. Al confirmar una orden, se envíe automáticamente a cocina
4. Las mesas se puedan asociar a órdenes

## ⚠️ IMPORTANTE: Integración Modular por Vertical

**Los módulos de restaurante SOLO deben aparecer cuando `tenant.enabledModules.restaurant === true`**

Esto asegura que:
- Un **restaurante** verá: mesas, cocina, splits, modificadores
- Un **supermercado** NO verá: mesas, cocina, splits (pero SÍ modificadores para variantes)
- Una **tienda retail** funcionará sin cambios

**Regla de oro:** Siempre verificar `tenant.enabledModules.restaurant` antes de mostrar UI específica de restaurante.

---

## 📦 Archivos a Modificar

```
food-inventory-admin/src/components/
├── orders/v2/
│   ├── OrdersManagementV2.jsx          # Agregar botón "Enviar a Cocina"
│   ├── CreateOrderModal.jsx            # Integrar ModifierSelector
│   └── OrderDetailModal.jsx            # Integrar SplitBillModal
└── restaurant/
    ├── ModifierSelector.jsx            ✅ Ya existe
    ├── SplitBillModal.jsx              ✅ Ya existe
    ├── FloorPlan.jsx                   ✅ Ya existe
    └── KitchenDisplay.jsx              ✅ Ya existe
```

---

## 🔧 INTEGRACIÓN 1: ModifierSelector en CreateOrderModal

### Paso 1: Importar componente y hook

**Archivo:** `food-inventory-admin/src/components/orders/v2/CreateOrderModal.jsx`

```jsx
// Al inicio del archivo, agregar:
import { useAuth } from '../../hooks/use-auth';  // Hook para obtener tenant
import ModifierSelector from '../../restaurant/ModifierSelector';
```

### Paso 2: Agregar estado para modificadores

```jsx
// Dentro del componente CreateOrderModal:
const { tenant } = useAuth();  // Obtener tenant actual

const [showModifierSelector, setShowModifierSelector] = useState(false);
const [selectedProduct, setSelectedProduct] = useState(null);
const [modifierGroups, setModifierGroups] = useState([]);
```

### Paso 3: Modificar función addProduct (CON VERIFICACIÓN CONDICIONAL)

**Buscar la función actual `addProduct` y reemplazarla:**

```jsx
const addProduct = async (product) => {
  // ✅ CLAVE: Solo verificar modifiers si tenant es restaurante O retail
  // Los modifiers son útiles en múltiples verticales (variantes de producto)
  const supportsModifiers = tenant?.enabledModules?.restaurant ||
                            tenant?.enabledModules?.retail;

  if (supportsModifiers) {
    // 1. Verificar si el producto tiene modifier groups
    try {
      const response = await apiClient.get(
        `/modifier-groups/by-product/${product._id}`
      );

      const groups = response.data;

      if (groups && groups.length > 0) {
        // Producto tiene modificadores → mostrar selector
        setModifierGroups(groups);
        setSelectedProduct(product);
        setShowModifierSelector(true);
        return;  // ← Importante: salir aquí
      }
    } catch (error) {
      console.error('Error loading modifiers:', error);
      // Si falla, continuar y agregar sin modificadores
    }
  }

  // Si no hay modifiers O módulo no soporta → agregar directo
  addProductToOrder(product, [], null);
};

// Nueva función para agregar con modificadores
const addProductToOrder = (product, selectedModifiers, specialInstructions) => {
  const existingIndex = items.findIndex(
    (item) =>
      item.product._id === product._id &&
      JSON.stringify(item.modifiers) === JSON.stringify(selectedModifiers) &&
      item.specialInstructions === specialInstructions
  );

  if (existingIndex !== -1) {
    // Ya existe con mismos modificadores → incrementar cantidad
    const updatedItems = [...items];
    updatedItems[existingIndex].quantity += 1;
    setItems(updatedItems);
  } else {
    // Nuevo item o diferentes modificadores
    const newItem = {
      product,
      quantity: 1,
      modifiers: selectedModifiers,
      specialInstructions: specialInstructions || undefined,
      unitPrice: product.price,
      // Calcular precio con ajustes de modificadores
      finalPrice: product.price + selectedModifiers.reduce(
        (sum, mod) => sum + (mod.priceAdjustment * mod.quantity),
        0
      ),
    };
    setItems([...items, newItem]);
  }

  // Cerrar selector
  setShowModifierSelector(false);
  setSelectedProduct(null);
};
```

### Paso 4: Agregar el componente ModifierSelector

**Al final del JSX, antes del cierre del modal principal:**

```jsx
{/* Modal de Modificadores */}
{showModifierSelector && selectedProduct && (
  <ModifierSelector
    product={selectedProduct}
    modifierGroups={modifierGroups}
    onConfirm={(selectedModifiers, specialInstructions) => {
      addProductToOrder(selectedProduct, selectedModifiers, specialInstructions);
    }}
    onCancel={() => {
      setShowModifierSelector(false);
      setSelectedProduct(null);
    }}
  />
)}
```

### Paso 5: Actualizar visualización de items

**En la sección donde se muestran los items agregados, actualizar para mostrar modificadores:**

```jsx
{items.map((item, index) => (
  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
    <div className="flex-1">
      <p className="font-medium">{item.product.name}</p>

      {/* Mostrar modificadores si existen */}
      {item.modifiers && item.modifiers.length > 0 && (
        <div className="text-sm text-gray-600 mt-1">
          {item.modifiers.map((mod, i) => (
            <span key={i} className="mr-2">
              • {mod.name} {mod.quantity > 1 && `x${mod.quantity}`}
              {mod.priceAdjustment !== 0 && ` (${mod.priceAdjustment > 0 ? '+' : ''}$${mod.priceAdjustment})`}
            </span>
          ))}
        </div>
      )}

      {/* Mostrar instrucciones especiales */}
      {item.specialInstructions && (
        <p className="text-sm text-orange-600 italic mt-1">
          ⚠ {item.specialInstructions}
        </p>
      )}

      <p className="text-sm text-gray-500">
        ${item.unitPrice} x {item.quantity} = ${item.finalPrice * item.quantity}
      </p>
    </div>

    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => updateQuantity(index, item.quantity - 1)}>-</Button>
      <span>{item.quantity}</span>
      <Button size="sm" onClick={() => updateQuantity(index, item.quantity + 1)}>+</Button>
      <Button size="sm" variant="destructive" onClick={() => removeItem(index)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
))}
```

---

## 🔧 INTEGRACIÓN 2: SplitBillModal en OrderDetailModal

### Paso 1: Importar componente y hook

**Archivo:** `food-inventory-admin/src/components/orders/v2/OrderDetailModal.jsx`

```jsx
import { useAuth } from '../../hooks/use-auth';  // Hook para obtener tenant
import SplitBillModal from '../../restaurant/SplitBillModal';
import { Users } from 'lucide-react';
```

### Paso 2: Agregar estado

```jsx
const { tenant } = useAuth();  // Obtener tenant actual

const [showSplitModal, setShowSplitModal] = useState(false);
const [billSplit, setBillSplit] = useState(null);
```

### Paso 3: Cargar split existente (CON VERIFICACIÓN CONDICIONAL)

```jsx
useEffect(() => {
  // ✅ Solo cargar split si módulo restaurant habilitado
  if (tenant?.enabledModules?.restaurant && order?.isSplit && order?.activeSplitId) {
    loadBillSplit();
  }
}, [order, tenant]);

const loadBillSplit = async () => {
  try {
    const response = await apiClient.get(`/bill-splits/${order.activeSplitId}`);
    setBillSplit(response.data);
  } catch (error) {
    console.error('Error loading bill split:', error);
  }
};
```

### Paso 4: Agregar botón "Dividir Cuenta" (CON VERIFICACIÓN CONDICIONAL)

**En la sección de acciones de la orden (donde están botones de confirmar/cancelar):**

```jsx
{/* ✅ SOLO mostrar si módulo restaurant habilitado */}
{tenant?.enabledModules?.restaurant && order.status === 'confirmed' && !order.isSplit && (
  <Button
    onClick={() => setShowSplitModal(true)}
    variant="outline"
  >
    <Users className="mr-2 h-4 w-4" />
    Dividir Cuenta
  </Button>
)}

{/* Si ya está dividida, mostrar detalles (solo si restaurant habilitado) */}
{tenant?.enabledModules?.restaurant && order.isSplit && billSplit && (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <h4 className="font-semibold mb-2 flex items-center">
      <Users className="mr-2 h-4 w-4" />
      Cuenta Dividida ({billSplit.numberOfPeople} personas)
    </h4>

    <div className="space-y-2">
      {billSplit.parts.map((part, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span>{part.personName}</span>
          <span className={part.paymentStatus === 'paid' ? 'text-green-600 font-semibold' : ''}>
            ${part.totalAmount.toFixed(2)} - {part.paymentStatus === 'paid' ? '✓ Pagado' : 'Pendiente'}
          </span>
        </div>
      ))}
    </div>

    <Button
      size="sm"
      variant="outline"
      className="mt-3"
      onClick={() => setShowSplitModal(true)}
    >
      Ver Detalles del Split
    </Button>
  </div>
)}
```

### Paso 5: Agregar el componente SplitBillModal

```jsx
{/* Modal de Split Bill */}
{showSplitModal && order && (
  <SplitBillModal
    order={order}
    existingSplit={billSplit}
    onClose={() => setShowSplitModal(false)}
    onSplitCreated={(newSplit) => {
      setBillSplit(newSplit);
      setShowSplitModal(false);
      // Recargar orden para actualizar estado
      if (onUpdate) onUpdate();
    }}
  />
)}
```

---

## 🔧 INTEGRACIÓN 3: Botón "Enviar a Cocina"

### Paso 1: Agregar imports

**Archivo:** `food-inventory-admin/src/components/orders/v2/OrdersManagementV2.jsx`

```jsx
import { useAuth } from '../../hooks/use-auth';  // Hook para obtener tenant
import { ChefHat } from 'lucide-react';
```

### Paso 2: Obtener tenant y agregar función sendToKitchen (CON VERIFICACIÓN)

```jsx
const OrdersManagementV2 = () => {
  const { tenant } = useAuth();  // Obtener tenant actual

  // ... resto del código existente ...

  const sendToKitchen = async (order) => {
    // ✅ VERIFICAR que módulo restaurant está habilitado
    if (!tenant?.enabledModules?.restaurant) {
      toast.error('Módulo de restaurante no habilitado');
      return;
    }

    try {
      // Verificar que la orden esté confirmada
      if (order.status !== 'confirmed') {
        toast.error('Solo se pueden enviar a cocina órdenes confirmadas');
        return;
      }

      // Crear kitchen order
      await apiClient.post('/kitchen-display/create', {
        orderId: order._id,
        priority: 'normal',
        estimatedPrepTime: estimatePrepTime(order.items.length),
        notes: order.notes || undefined,
      });

      toast.success(`Orden #${order.orderNumber} enviada a cocina`);

      // Recargar lista de órdenes
      loadOrders();
    } catch (error) {
      console.error('Error sending to kitchen:', error);
      toast.error('Error al enviar orden a cocina');
    }
  };

// Helper para estimar tiempo de preparación
const estimatePrepTime = (itemCount) => {
  // 5 minutos base + 2 minutos por item adicional
  return 5 + (itemCount - 1) * 2;
};
```

### Paso 3: Agregar botón en acciones de orden (CON VERIFICACIÓN)

**En el menú de acciones de cada orden (dropdown o botones):**

```jsx
{/* ✅ SOLO mostrar si módulo restaurant habilitado */}
{tenant?.enabledModules?.restaurant && order.status === 'confirmed' && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => sendToKitchen(order)}
  >
    <ChefHat className="mr-2 h-4 w-4" />
    Enviar a Cocina
  </Button>
)}
```

### Paso 4: (OPCIONAL) Auto-envío a cocina al confirmar

**Si quieres que se envíe automáticamente al confirmar orden:**

```jsx
const confirmOrder = async (orderId) => {
  try {
    const response = await apiClient.patch(`/orders/${orderId}/confirm`);
    toast.success('Orden confirmada');

    // Auto-enviar a cocina si módulo restaurant está habilitado
    if (tenant?.enabledModules?.restaurant) {
      await sendToKitchen(response.data);
    }

    loadOrders();
  } catch (error) {
    console.error('Error confirming order:', error);
    toast.error('Error al confirmar orden');
  }
};
```

---

## 🔧 INTEGRACIÓN 4: Asociar Mesa a Orden

### Paso 1: Agregar selector de mesa en CreateOrderModal

**Archivo:** `food-inventory-admin/src/components/orders/v2/CreateOrderModal.jsx`

```jsx
import { MapPin } from 'lucide-react';

// Agregar estados
const [tables, setTables] = useState([]);
const [selectedTable, setSelectedTable] = useState(null);

// Cargar mesas disponibles
useEffect(() => {
  if (tenant?.enabledModules?.restaurant) {
    loadAvailableTables();
  }
}, []);

const loadAvailableTables = async () => {
  try {
    const response = await apiClient.get('/tables');
    // Filtrar solo mesas disponibles o reservadas
    const available = response.data.filter(
      t => t.status === 'available' || t.status === 'reserved'
    );
    setTables(available);
  } catch (error) {
    console.error('Error loading tables:', error);
  }
};
```

### Paso 2: Agregar selector en el formulario

```jsx
{/* Selector de Mesa (solo si módulo restaurant habilitado) */}
{tenant?.enabledModules?.restaurant && (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2">
      <MapPin className="inline mr-2 h-4 w-4" />
      Mesa (Opcional)
    </label>
    <select
      value={selectedTable || ''}
      onChange={(e) => setSelectedTable(e.target.value || null)}
      className="w-full p-2 border rounded"
    >
      <option value="">Sin mesa (Takeout/Delivery)</option>
      {tables.map((table) => (
        <option key={table._id} value={table._id}>
          Mesa {table.tableNumber} - {table.section} (Cap: {table.maxCapacity})
        </option>
      ))}
    </select>
  </div>
)}
```

### Paso 3: Incluir tableId al crear orden

```jsx
const handleSubmit = async () => {
  try {
    const orderData = {
      customerName: customer?.name || guestName,
      customerId: customer?._id,
      items: items.map(item => ({
        productId: item.product._id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        finalPrice: item.finalPrice,
        modifiers: item.modifiers || [],
        specialInstructions: item.specialInstructions,
      })),
      tableId: selectedTable || undefined, // Agregar esta línea
      paymentMethod,
      status: 'pending',
      // ... resto de campos
    };

    await apiClient.post('/orders', orderData);
    toast.success('Orden creada exitosamente');
    onClose();
  } catch (error) {
    console.error('Error creating order:', error);
    toast.error('Error al crear orden');
  }
};
```

### Paso 4: Actualizar estado de mesa al crear orden

**En el backend, el OrdersService ya debería manejar esto, pero si no:**

```typescript
// En orders.service.ts - método create()
async create(dto: CreateOrderDto, tenantId: string) {
  const order = await this.orderModel.create({
    ...dto,
    tenantId,
  });

  // Si tiene mesa asignada, marcar mesa como ocupada
  if (dto.tableId) {
    await this.tableModel.findByIdAndUpdate(dto.tableId, {
      status: 'occupied',
      currentOrderId: order._id,
      seatedAt: new Date(),
    });
  }

  return order;
}
```

---

## ✅ Checklist de Integración Completa

### CreateOrderModal
- [ ] Importar ModifierSelector
- [ ] Agregar estados para modificadores
- [ ] Modificar función addProduct para detectar modificadores
- [ ] Agregar ModifierSelector al JSX
- [ ] Actualizar visualización de items con modificadores
- [ ] Agregar selector de mesa (si restaurant habilitado)
- [ ] Incluir tableId al crear orden

### OrderDetailModal
- [ ] Importar SplitBillModal
- [ ] Agregar estado para split
- [ ] Cargar split existente si aplica
- [ ] Agregar botón "Dividir Cuenta"
- [ ] Mostrar detalles de split si existe
- [ ] Agregar SplitBillModal al JSX

### OrdersManagementV2
- [ ] Importar ChefHat icon
- [ ] Agregar función sendToKitchen
- [ ] Agregar helper estimatePrepTime
- [ ] Agregar botón "Enviar a Cocina"
- [ ] (Opcional) Auto-envío al confirmar

### Backend (Verificar)
- [ ] OrderSchema tiene campo tableId
- [ ] OrderSchema tiene campo isSplit, activeSplitId
- [ ] OrderItem tiene campos modifiers[], specialInstructions
- [ ] orders.service actualiza estado de mesa al crear orden

---

## 🧪 Testing Manual

### Test 1: Modificadores
1. Crear un Modifier Group (ej: "Punto de Cocción")
2. Agregar modificadores (Término Medio, Bien Cocido, etc.)
3. Asignar grupo a un producto (ej: Hamburguesa)
4. Crear nueva orden y agregar ese producto
5. ✅ Debe aparecer ModifierSelector
6. Seleccionar modificadores y confirmar
7. ✅ Item debe mostrar modificadores seleccionados
8. ✅ Precio debe ajustarse si hay priceAdjustment

### Test 2: División de Cuenta
1. Crear una orden con múltiples items
2. Confirmar la orden
3. Abrir detalle de orden
4. Click en "Dividir Cuenta"
5. ✅ Debe aparecer SplitBillModal
6. Dividir equitativamente entre 3 personas
7. ✅ Debe crear BillSplit con 3 partes
8. ✅ Orden debe mostrar "Cuenta Dividida"

### Test 3: Kitchen Display
1. Crear y confirmar una orden
2. Click en "Enviar a Cocina"
3. ✅ Debe crear KitchenOrder
4. Navegar a /restaurant/kitchen-display
5. ✅ Orden debe aparecer con status "new"
6. Click en un item para cambiar status
7. ✅ Item debe cambiar a "preparing"
8. Marcar todos los items como "ready"
9. ✅ Botón "Bump" debe habilitarse
10. Click en "Bump"
11. ✅ Orden debe desaparecer de pantalla

### Test 4: Mesas
1. Crear algunas mesas en /restaurant/floor-plan
2. Al crear nueva orden, seleccionar una mesa
3. ✅ Mesa debe aparecer en los datos de la orden
4. ✅ Mesa debe cambiar a status "occupied"
5. Al completar/cancelar orden
6. ✅ Mesa debe volver a "available"

---

## 🐛 Problemas Comunes

### Problema: ModifierSelector no aparece

**Causa:** Producto no tiene modifier groups asignados

**Solución:**
1. Ve a la interfaz de modifier groups (necesitarás crearla o usar MongoDB directamente)
2. Asigna el grupo al producto:
```javascript
// Via MongoDB
db.modifiergroups.updateOne(
  { _id: ObjectId("modifier-group-id") },
  { $addToSet: { applicableProducts: ObjectId("product-id") } }
);

// O vía API
POST /modifier-groups/assign-products
{
  "groupId": "modifier-group-id",
  "productIds": ["product-id-1", "product-id-2"]
}
```

### Problema: SplitBillModal da error al crear split

**Causa:** Validación de DTO falla

**Solución:** Verificar que el payload incluye todos los campos requeridos:
```javascript
// Para split equitativo
{
  orderId: "order-id",
  numberOfPeople: 3,
  tipPercentage: 10, // Opcional
  personNames: ["Persona 1", "Persona 2", "Persona 3"] // Opcional
}
```

### Problema: Botón "Enviar a Cocina" no aparece

**Causa:** Permisos o módulo no habilitado

**Solución:**
```javascript
// 1. Verificar módulo habilitado
tenant.enabledModules.restaurant = true;

// 2. Verificar permisos de usuario
user.permissions.includes('restaurant_write') === true;
user.permissions.includes('orders_write') === true;
```

### Problema: Mesa no se actualiza al crear orden

**Causa:** tableId no se está enviando o backend no actualiza

**Solución:** Verificar en orders.service.ts:
```typescript
if (dto.tableId) {
  await this.tablesService.occupyTable(dto.tableId, order._id);
}
```

---

## 📚 Próximos Pasos

Una vez completada la integración:

1. **Testing exhaustivo** de cada flujo
2. **Crear datos de prueba** (productos, mesas, modifier groups)
3. **Entrenar usuarios** en el nuevo flujo
4. **Monitorear performance** de Kitchen Display
5. **Recolectar feedback** para mejoras

---

## 🆘 Soporte

Si encuentras problemas durante la integración:

1. **Revisa logs del backend:** `npm run start:dev` y busca errores
2. **Revisa console del frontend:** Abre DevTools → Console
3. **Verifica permisos:** Usuario debe tener permisos correctos
4. **Verifica módulo:** tenant.enabledModules.restaurant debe ser true
5. **Revisa esta guía:** Todos los pasos están documentados

**Recursos:**
- Documentación completa: `/docs/KITCHEN-DISPLAY-SYSTEM.md`
- API Endpoints: Todos en `/kitchen-display/*`, `/tables/*`, `/modifier-groups/*`, `/bill-splits/*`
- Schemas: Todos en `/src/schemas/`

---

## 💡 Tips de Implementación

1. **Hazlo paso a paso:** No integres todo a la vez. Empieza por ModifierSelector.
2. **Prueba cada cambio:** Después de cada integración, prueba que funciona.
3. **Usa console.log:** Para debug, agrega logs temporales.
4. **Guarda backups:** Antes de modificar archivos importantes.
5. **Lee los errores:** Los mensajes de error suelen indicar exactamente qué falta.

---

**Esta guía cubre el 100% de la integración necesaria. Todo el código está listo, solo falta conectar las piezas.**
