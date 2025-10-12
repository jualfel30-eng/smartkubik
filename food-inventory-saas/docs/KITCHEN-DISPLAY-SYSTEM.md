# Kitchen Display System (KDS) - Documentation

## Descripción General

El **Kitchen Display System (KDS)** es un sistema de gestión de órdenes para cocina que permite a los restaurantes rastrear y gestionar la preparación de alimentos en tiempo real. El sistema ofrece tracking granular a nivel de item, timers automáticos, priorización de órdenes, y un flujo de trabajo optimizado para operaciones de cocina eficientes.

---

## Características Principales

### 1. **Tracking de Órdenes en Tiempo Real**
- Visualización de todas las órdenes activas en una pantalla de cocina
- Auto-refresh cada 10 segundos para mantener datos actualizados
- Grid responsive que se adapta a diferentes tamaños de pantalla
- Color coding visual por status y prioridad

### 2. **Gestión Granular de Items**
- Cada item dentro de una orden tiene su propio estado independiente
- Estados de item: `pending` → `preparing` → `ready` → `served`
- Tracking automático de tiempos por item (startedAt, readyAt, prepTime)
- Soporte para modificadores y instrucciones especiales visibles

### 3. **Sistema de Timers Inteligente**
- Timer principal que muestra tiempo transcurrido desde que llegó la orden
- Tiempo estimado de preparación configurable
- Código de colores basado en progreso vs estimación
- Timers individuales para cada item

### 4. **Priorización y Alertas**
- 3 niveles de prioridad: `normal`, `urgent`, `asap`
- Marcado de órdenes urgentes con efectos visuales (pulsating border)
- Alertas visuales con iconos de advertencia
- Filtrado rápido por prioridad y urgencia

### 5. **Bump System**
- Botón "Bump" para completar órdenes y enviar a servir
- Validación: solo se puede hacer bump cuando todos los items están listos
- Tracking de tiempo total de preparación al hacer bump
- Estado `completed` distingue órdenes terminadas

### 6. **Estaciones de Cocina**
- Asignación de órdenes a estaciones específicas (grill, fryer, salads, etc.)
- Filtrado por estación para displays dedicados
- Asignación opcional de cocinero responsable

### 7. **Estadísticas en Tiempo Real**
- Total de órdenes del día
- Órdenes en preparación (contador activo)
- Órdenes listas para servir
- Tiempo promedio de espera/preparación

---

## Arquitectura del Sistema

### Backend Components

#### 1. **Schemas**

**`kitchen-order.schema.ts`**
```typescript
@Schema()
export class KitchenOrderItem {
  itemId: string;                // ID del OrderItem original
  productName: string;
  quantity: number;
  modifiers: string[];           // ["Sin Queso", "Extra Bacon"]
  specialInstructions?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  startedAt?: Date;
  readyAt?: Date;
  prepTime?: number;            // En segundos
}

@Schema({ timestamps: true })
export class KitchenOrder extends Document {
  orderId: Types.ObjectId;      // Referencia a Order
  orderNumber: string;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  tableNumber?: string;
  customerName?: string;
  items: KitchenOrderItem[];
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'asap';
  notes?: string;
  receivedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalPrepTime?: number;
  waitTime?: number;
  assignedTo?: Types.ObjectId;  // Cocinero asignado
  station?: string;              // "grill", "fryer", etc.
  isUrgent: boolean;
  estimatedPrepTime: number;     // En minutos
  tenantId: Types.ObjectId;
  isDeleted: boolean;
}
```

**Índices Compuestos:**
```typescript
KitchenOrderSchema.index({ tenantId: 1, status: 1, createdAt: 1 });
KitchenOrderSchema.index({ tenantId: 1, station: 1, status: 1 });
KitchenOrderSchema.index({ tenantId: 1, priority: 1 });
KitchenOrderSchema.index({ tenantId: 1, isUrgent: 1 });
KitchenOrderSchema.index({ orderNumber: 1 });
```

#### 2. **DTOs**

**`CreateKitchenOrderDto`**
```typescript
{
  orderId: string;              // Required: ID de la Order
  station?: string;             // Opcional: "grill", "fryer"
  priority?: 'normal' | 'urgent' | 'asap';
  notes?: string;
  estimatedPrepTime?: number;   // En minutos
}
```

**`UpdateItemStatusDto`**
```typescript
{
  kitchenOrderId: string;
  itemId: string;               // ID del item dentro de la kitchen order
  status: 'pending' | 'preparing' | 'ready' | 'served';
}
```

**`BumpOrderDto`**
```typescript
{
  kitchenOrderId: string;
  notes?: string;               // Notas adicionales al completar
}
```

**`MarkUrgentDto`**
```typescript
{
  kitchenOrderId: string;
  isUrgent: boolean;
}
```

**`FilterKitchenOrdersDto`**
```typescript
{
  status?: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  station?: string;
  priority?: 'normal' | 'urgent' | 'asap';
  isUrgent?: boolean;
}
```

#### 3. **Service Methods**

**`kitchen-display.service.ts`**

| Método | Descripción | Parámetros | Retorno |
|--------|-------------|------------|---------|
| `createFromOrder()` | Crea kitchen order desde Order confirmada | `CreateKitchenOrderDto`, `tenantId` | `KitchenOrder` |
| `findActive()` | Obtiene órdenes activas con filtros | `FilterKitchenOrdersDto`, `tenantId` | `KitchenOrder[]` |
| `updateItemStatus()` | Actualiza estado de item individual | `UpdateItemStatusDto`, `tenantId` | `KitchenOrder` |
| `bumpOrder()` | Completa orden (bump) | `BumpOrderDto`, `tenantId` | `KitchenOrder` |
| `markUrgent()` | Marca/desmarca orden como urgente | `MarkUrgentDto`, `tenantId` | `KitchenOrder` |
| `assignCook()` | Asigna orden a cocinero | `AssignCookDto`, `tenantId` | `KitchenOrder` |
| `cancel()` | Cancela orden de cocina | `CancelKitchenOrderDto`, `tenantId` | `KitchenOrder` |
| `reopen()` | Reabre orden si se bumpeó por error | `ReopenKitchenOrderDto`, `tenantId` | `KitchenOrder` |
| `getStats()` | Estadísticas del día | `tenantId` | `Stats` |

**Lógica de Auto-Actualización de Status:**

```typescript
// El status general de la orden se actualiza automáticamente basado en items
private async updateOrderStatus(kitchenOrder: any): Promise<void> {
  const statuses = kitchenOrder.items.map(item => item.status);

  // Todos pending → order status = 'new'
  if (statuses.every(s => s === 'pending')) {
    kitchenOrder.status = 'new';
  }

  // Al menos uno preparing → order status = 'preparing'
  else if (statuses.some(s => s === 'preparing')) {
    kitchenOrder.status = 'preparing';
    if (!kitchenOrder.startedAt) {
      kitchenOrder.startedAt = new Date();
      kitchenOrder.waitTime = (startedAt - receivedAt) / 1000;
    }
  }

  // Todos ready → order status = 'ready'
  else if (statuses.every(s => s === 'ready' || s === 'served')) {
    kitchenOrder.status = 'ready';
  }
}
```

#### 4. **REST API Endpoints**

**Base URL:** `/kitchen-display`

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| POST | `/create` | Crear orden de cocina | `restaurant_write`, `orders_write` |
| GET | `/active` | Obtener órdenes activas | `restaurant_read` |
| PATCH | `/item-status` | Actualizar status de item | `restaurant_write` |
| POST | `/bump` | Completar orden (bump) | `restaurant_write` |
| PATCH | `/urgent` | Marcar urgente | `restaurant_write` |
| PATCH | `/assign-cook` | Asignar cocinero | `restaurant_write` |
| POST | `/cancel` | Cancelar orden | `restaurant_write` |
| POST | `/reopen` | Reabrir orden | `restaurant_write` |
| GET | `/stats` | Estadísticas del día | `restaurant_read` |

**Ejemplo de Request/Response:**

```bash
# Crear Kitchen Order
POST /kitchen-display/create
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "orderId": "6789abcdef123456",
  "station": "grill",
  "priority": "normal",
  "estimatedPrepTime": 15
}

# Response 201 Created
{
  "_id": "kitchen123",
  "orderId": "6789abcdef123456",
  "orderNumber": "ORD-001",
  "orderType": "dine-in",
  "tableNumber": "12",
  "items": [
    {
      "itemId": "item1",
      "productName": "Hamburguesa Classic",
      "quantity": 2,
      "modifiers": ["Sin Queso", "Extra Bacon"],
      "status": "pending",
      "specialInstructions": "Término medio"
    }
  ],
  "status": "new",
  "priority": "normal",
  "receivedAt": "2025-10-11T10:30:00Z",
  "estimatedPrepTime": 15,
  "isUrgent": false,
  "station": "grill"
}
```

```bash
# Actualizar Item Status
PATCH /kitchen-display/item-status
{
  "kitchenOrderId": "kitchen123",
  "itemId": "item1",
  "status": "preparing"
}

# Response 200 OK
{
  ...
  "items": [
    {
      "itemId": "item1",
      "status": "preparing",
      "startedAt": "2025-10-11T10:32:00Z"  // Auto-set
    }
  ],
  "status": "preparing",  // Auto-updated
  "startedAt": "2025-10-11T10:32:00Z",
  "waitTime": 120  // seconds
}
```

---

### Frontend Components

#### 1. **KitchenDisplay Component**

**Ruta:** `/restaurant/kitchen-display`

**Características:**
- Auto-refresh cada 10 segundos
- Grid responsive con cards de órdenes
- Dashboard con estadísticas en tiempo real
- Filtros rápidos (Todas, Nuevas, En Preparación, Listas, Urgentes)
- Dark theme optimizado para pantallas de cocina

**Estados Visuales:**
```javascript
const getStatusColor = (status) => {
  return {
    new: 'bg-blue-500',        // Azul: Nueva orden
    preparing: 'bg-yellow-500', // Amarillo: En preparación
    ready: 'bg-green-500',      // Verde: Lista para servir
    completed: 'bg-gray-400',   // Gris: Completada
    cancelled: 'bg-red-500',    // Rojo: Cancelada
  }[status];
};

const getPriorityColor = (priority) => {
  return {
    normal: 'border-gray-300',
    urgent: 'border-orange-500',
    asap: 'border-red-500',
  }[priority];
};
```

**Timer Logic:**
```javascript
const calculateElapsedTime = (receivedAt) => {
  const now = new Date();
  const received = new Date(receivedAt);
  return Math.floor((now - received) / 1000); // seconds
};

const getTimerColor = (elapsed, estimated) => {
  if (elapsed < estimated * 60) return 'text-green-400';  // On time
  if (elapsed < estimated * 60 * 1.2) return 'text-yellow-400'; // +20%
  return 'text-red-400'; // Late
};
```

#### 2. **OrderTicket Component**

**Props:**
```typescript
interface OrderTicketProps {
  order: KitchenOrder;
  onUpdateItemStatus: (kitchenOrderId, itemId, status) => void;
  onBump: (kitchenOrderId) => void;
  onMarkUrgent: (kitchenOrderId, isUrgent) => void;
  onCancel: (kitchenOrderId, reason) => void;
  elapsedTime: number;
}
```

**Características:**
- Ticket visual con estilo de orden de cocina
- Timer local que incrementa cada segundo
- Click en items para avanzar status (pending → preparing → ready)
- Botón Bump habilitado solo cuando todos los items están ready
- Menú de acciones (marcar urgente, cancelar)
- Visualización de modificadores e instrucciones especiales
- Efecto de pulsating border para órdenes urgentes

**Flujo de Interacción:**
```
1. Click en item → avanza status automáticamente
   pending → preparing (auto-set startedAt)
   preparing → ready (auto-set readyAt, calcula prepTime)

2. Cuando todos los items están ready → habilita botón Bump

3. Click en Bump → marca orden como completed
   - Auto-set completedAt
   - Calcula totalPrepTime
   - Remueve de pantalla de cocina (filtro activo)
```

---

## Flujo de Trabajo Completo

### 1. Crear Kitchen Order desde Order Confirmada

**Trigger:** Cuando una Order es confirmada por el mesero/cajero

```typescript
// En OrdersController al confirmar orden
await kitchenDisplayService.createFromOrder({
  orderId: order._id,
  station: 'main',
  priority: 'normal',
  estimatedPrepTime: 15
}, tenantId);
```

**Resultado:**
- Se crea KitchenOrder con status `new`
- Aparece en pantalla KDS con timer iniciado
- Todos los items en status `pending`

### 2. Cocina Comienza a Preparar Items

**Acción:** Cocinero hace click en un item

```typescript
await apiClient.patch('/kitchen-display/item-status', {
  kitchenOrderId: order._id,
  itemId: item.itemId,
  status: 'preparing'
});
```

**Resultado:**
- Item status → `preparing`
- `item.startedAt` → timestamp actual
- Order status → `preparing` (auto-update)
- `order.startedAt` → timestamp (si es el primer item)
- `order.waitTime` → calculado (receivedAt - startedAt)

### 3. Item Terminado

**Acción:** Click en item nuevamente

```typescript
await apiClient.patch('/kitchen-display/item-status', {
  kitchenOrderId: order._id,
  itemId: item.itemId,
  status: 'ready'
});
```

**Resultado:**
- Item status → `ready`
- `item.readyAt` → timestamp actual
- `item.prepTime` → calculado (readyAt - startedAt)
- Si todos los items ready → Order status → `ready`
- Botón Bump se habilita

### 4. Bump Order (Completar)

**Acción:** Click en botón "BUMP - Completar Orden"

```typescript
await apiClient.post('/kitchen-display/bump', {
  kitchenOrderId: order._id
});
```

**Resultado:**
- Order status → `completed`
- `order.completedAt` → timestamp actual
- `order.totalPrepTime` → calculado (completedAt - startedAt)
- Orden desaparece de pantalla activa
- Mesero ve orden lista para recoger

### 5. Escenarios Especiales

**Marcar Urgente:**
```typescript
// Manager/Supervisor marca orden como urgente
await apiClient.patch('/kitchen-display/urgent', {
  kitchenOrderId: order._id,
  isUrgent: true
});
// Orden aparece con pulsating border rojo y sube en orden de prioridad
```

**Cancelar Orden:**
```typescript
await apiClient.post('/kitchen-display/cancel', {
  kitchenOrderId: order._id,
  reason: 'Cliente canceló pedido'
});
// Order status → 'cancelled'
// Desaparece de pantalla
```

**Reabrir (si se bumpeó por error):**
```typescript
await apiClient.post('/kitchen-display/reopen', {
  kitchenOrderId: order._id
});
// Status vuelve a 'ready' o 'preparing' según items
// Reaparece en pantalla
```

---

## Configuración e Integración

### 1. Habilitación del Módulo

**En Tenant Settings:**
```javascript
tenant.enabledModules.restaurant = true;
```

**Permisos Necesarios:**
- `restaurant_read` - Ver KDS
- `restaurant_write` - Gestionar órdenes en KDS
- `orders_write` - Crear kitchen orders desde orders

### 2. Asignación de Permisos a Roles

```javascript
// Ejemplo: Rol de Cocinero
{
  name: 'Cocinero',
  permissions: [
    'restaurant_read',
    'restaurant_write',
    'orders_read'  // Para ver detalles de órdenes
  ]
}

// Ejemplo: Rol de Chef/Supervisor
{
  name: 'Chef',
  permissions: [
    'restaurant_read',
    'restaurant_write',
    'orders_read',
    'orders_write'  // Para crear kitchen orders
  ]
}
```

### 3. Integración con OrdersManagement

**Agregar botón "Enviar a Cocina" en OrdersManagement:**

```jsx
// En componente de Order Detail
const handleSendToKitchen = async (orderId) => {
  try {
    await apiClient.post('/kitchen-display/create', {
      orderId,
      priority: 'normal',
      estimatedPrepTime: 15
    });

    toast.success('Orden enviada a cocina');
  } catch (error) {
    toast.error('Error al enviar orden a cocina');
  }
};

// Botón
<Button onClick={() => handleSendToKitchen(order._id)}>
  <ChefHat className="mr-2" />
  Enviar a Cocina
</Button>
```

**Auto-creación al confirmar orden:**

```typescript
// En orders.service.ts - método confirmOrder()
async confirmOrder(orderId: string, tenantId: string) {
  const order = await this.orderModel.findByIdAndUpdate(
    orderId,
    { status: 'confirmed' },
    { new: true }
  );

  // Auto-crear kitchen order si restaurante habilitado
  if (order && this.tenantHasRestaurantModule(tenantId)) {
    await this.kitchenDisplayService.createFromOrder({
      orderId: order._id,
      priority: this.determinePriority(order),
      estimatedPrepTime: this.estimatePrepTime(order.items.length)
    }, tenantId);
  }

  return order;
}
```

---

## Casos de Uso

### 1. Restaurante de Servicio Rápido

**Setup:**
- Una pantalla grande en cocina con KDS
- Filtro: todas las órdenes (sin separación por estaciones)
- Auto-creación de kitchen orders al confirmar órdenes

**Flujo:**
1. Cajero confirma orden → aparece automáticamente en KDS
2. Cocinero ve orden nueva (azul) con timer
3. Hace click en items mientras prepara
4. Cuando todos listos → Bump
5. Mesero recoge orden completada

### 2. Restaurante con Múltiples Estaciones

**Setup:**
- Varias pantallas (una por estación: grill, fryer, salads)
- Cada pantalla filtra por `station`
- Órden se divide entre estaciones

**Flujo:**
1. Mesero envía orden manualmente desde POS
2. Sistema crea kitchen order con estación según items
3. Items de carne → pantalla "grill"
4. Items de frituras → pantalla "fryer"
5. Cada estación completa sus items independientemente
6. Cuando todos listos → expediter hace bump

### 3. Servicio a Domicilio

**Setup:**
- Filtro por `orderType: 'delivery'`
- Prioridad automática basada en tiempo de entrega
- Timer muestra tiempo hasta entrega prometida

**Flujo:**
1. Cliente hace pedido online
2. Sistema calcula tiempo de preparación + entrega
3. Kitchen order creada con `priority: 'urgent'` si tiempo ajustado
4. Cocina prioriza órdenes urgentes
5. Bump marca orden lista para empaque
6. Driver recoge orden

---

## Performance y Optimización

### 1. Índices de Base de Datos

```typescript
// Críticos para queries frecuentes
{ tenantId: 1, status: 1, createdAt: 1 }  // findActive()
{ tenantId: 1, station: 1, status: 1 }     // Por estación
{ tenantId: 1, isUrgent: 1 }               // Órdenes urgentes
```

### 2. Auto-Refresh Optimizado

```javascript
// Frontend: polling cada 10 segundos
useEffect(() => {
  loadOrders();
  const interval = setInterval(loadOrders, 10000);
  return () => clearInterval(interval);
}, [filters]);
```

**Alternativa WebSocket (futura):**
```typescript
// Real-time updates sin polling
socket.on('kitchen-order-updated', (order) => {
  setOrders(prev => prev.map(o =>
    o._id === order._id ? order : o
  ));
});
```

### 3. Paginación para Historial

```typescript
// Para ver órdenes completadas/canceladas
async findHistory(tenantId: string, page: number, limit: number) {
  return this.kitchenOrderModel
    .find({
      tenantId,
      status: { $in: ['completed', 'cancelled'] },
      isDeleted: false
    })
    .sort({ completedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
}
```

---

## Troubleshooting

### Problema: Órdenes no aparecen en KDS

**Posibles Causas:**
1. Módulo restaurant no habilitado en tenant
2. Usuario sin permiso `restaurant_read`
3. Kitchen order no creada (revisar logs)
4. Filtro activo oculta las órdenes

**Solución:**
```javascript
// 1. Verificar módulo
tenant.enabledModules.restaurant === true

// 2. Verificar permisos
user.permissions.includes('restaurant_read')

// 3. Verificar creación
const kitchenOrder = await KitchenOrder.findOne({ orderId });
console.log(kitchenOrder);

// 4. Resetear filtros
setFilters({ status: null, station: null, priority: null, isUrgent: null });
```

### Problema: Timer no actualiza

**Causa:** Componente no re-renderiza

**Solución:**
```javascript
// OrderTicket.jsx - Timer local
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentElapsed(prev => prev + 1);
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### Problema: No se puede hacer Bump

**Causa:** Items no están todos en `ready`

**Solución:**
```javascript
const canBump = () => {
  return order.items.every(item => item.status === 'ready');
};

// Mostrar items pendientes
const pendingItems = order.items.filter(i => i.status !== 'ready');
console.log('Items pendientes:', pendingItems);
```

---

## Mejoras Futuras

### 1. WebSocket para Real-Time Updates
- Eliminar polling HTTP
- Push inmediato de cambios
- Sincronización entre múltiples pantallas

### 2. Impresión de Tickets
- Auto-print al crear kitchen order
- Impresoras por estación
- Formato térmico optimizado

### 3. Notificaciones Sonoras
- Alerta cuando nueva orden llega
- Alerta cuando orden excede tiempo estimado
- Diferentes sonidos por prioridad

### 4. Analytics Avanzados
- Tiempo promedio por tipo de item
- Performance por cocinero
- Picos de demanda por hora
- Identificación de cuellos de botella

### 5. Integración con Hardware
- KDS tablets dedicados
- Bump bars físicos
- Display screens de cliente (Order Ready)

---

## Testing

### Unit Tests

```typescript
// kitchen-display.service.spec.ts
describe('KitchenDisplayService', () => {
  it('should create kitchen order from order', async () => {
    const result = await service.createFromOrder(dto, tenantId);
    expect(result.status).toBe('new');
    expect(result.items.every(i => i.status === 'pending')).toBe(true);
  });

  it('should auto-update order status when item changes', async () => {
    await service.updateItemStatus({
      kitchenOrderId,
      itemId,
      status: 'preparing'
    }, tenantId);

    const order = await KitchenOrder.findById(kitchenOrderId);
    expect(order.status).toBe('preparing');
    expect(order.startedAt).toBeDefined();
  });

  it('should calculate prep times correctly', async () => {
    // Set startedAt 300 seconds ago
    const startedAt = new Date(Date.now() - 300000);

    await service.updateItemStatus({
      kitchenOrderId,
      itemId,
      status: 'ready'
    }, tenantId);

    const order = await KitchenOrder.findById(kitchenOrderId);
    const item = order.items.find(i => i.itemId === itemId);
    expect(item.prepTime).toBeCloseTo(300, 1);
  });
});
```

### Integration Tests

```typescript
describe('KitchenDisplay Integration', () => {
  it('should complete full workflow', async () => {
    // 1. Create order
    const order = await createTestOrder();

    // 2. Create kitchen order
    const kitchenOrder = await createKitchenOrder(order._id);
    expect(kitchenOrder.status).toBe('new');

    // 3. Start preparing items
    for (const item of kitchenOrder.items) {
      await updateItemStatus(kitchenOrder._id, item.itemId, 'preparing');
    }

    let updated = await getKitchenOrder(kitchenOrder._id);
    expect(updated.status).toBe('preparing');

    // 4. Mark items ready
    for (const item of kitchenOrder.items) {
      await updateItemStatus(kitchenOrder._id, item.itemId, 'ready');
    }

    updated = await getKitchenOrder(kitchenOrder._id);
    expect(updated.status).toBe('ready');

    // 5. Bump order
    await bumpOrder(kitchenOrder._id);

    updated = await getKitchenOrder(kitchenOrder._id);
    expect(updated.status).toBe('completed');
    expect(updated.completedAt).toBeDefined();
    expect(updated.totalPrepTime).toBeGreaterThan(0);
  });
});
```

---

## Conclusión

El Kitchen Display System es un componente fundamental para operaciones de restaurante eficientes. Con tracking en tiempo real, gestión granular de items, y timers automáticos, el sistema permite a las cocinas optimizar flujos de trabajo y mejorar tiempos de servicio.

**Próximos Pasos:**
1. ✅ Backend completo (schemas, service, controller, module)
2. ✅ Frontend completo (KitchenDisplay, OrderTicket)
3. ✅ Routing y navegación
4. ⏳ Integración con OrdersManagement
5. ⏳ Testing E2E
6. ⏳ Deploy a staging

**Recursos Adicionales:**
- [Documentación de Tables Module](./TABLES-MODULE.md)
- [Documentación de Modifiers](./MODIFIERS-MODULE.md)
- [Documentación de Bill Splits](./BILL-SPLITS-MODULE.md)
