# Roadmap Completo: Sistema Unificado de Procesamiento de Órdenes

**Fecha de creación**: 27 de Diciembre, 2025
**Objetivo**: Implementar un sistema completo de gestión de órdenes que garantice coherencia fiscal, contable e inventario con la mejor UX posible.

---

## Contexto y Necesidad del Negocio

### Problema Actual
El sistema tiene componentes separados (pago, facturación, inventario, contabilidad) que funcionan de manera independiente, creando riesgos de:
- **Huecos fiscales**: Se puede facturar sin pagar, o pagar sin facturar
- **Inconsistencias contables**: Registros manuales propensos a error
- **Descontrol de inventario**: No se sabe qué está reservado, vendido o pendiente de entregar
- **Duplicación de facturas**: Se puede emitir múltiples facturas para una misma orden
- **Mala experiencia de usuario**: Cajeros pierden tiempo navegando entre módulos

### Visión del Sistema Ideal
Un workflow automático y obligatorio donde:
1. **Crear Orden** → Productos se reservan en inventario
2. **Registrar Pago** → Sistema valida y registra contablemente
3. **Emitir Factura/Nota** → Automáticamente vinculada al pago (una orden = una factura)
4. **Entregar Factura** → Email/impresión/WhatsApp
5. **Actualizar Inventario** → Productos pasan de "reservado" a "vendido"
6. **Gestionar Entrega** → Dashboard para monitorear deliveries/pickups pendientes

**Todo en un solo flujo unificado, sin posibilidad de saltarse pasos críticos.**

---

## FASE 1: Order Processing Drawer Unificado

**Prioridad**: 🔴 CRÍTICA
**Tiempo estimado**: 2-3 días
**Dependencias**: Ninguna

### 1.1 Objetivos
- Reemplazar botones separados de "Pagar" y "Facturar" con un wizard unificado
- Garantizar que no se pueda facturar sin pagar
- Garantizar que una orden solo tenga UNA factura
- Automatizar descuento de inventario al completar proceso
- Generar asientos contables automáticamente

### 1.2 Diseño del Componente

#### Estructura del Drawer

```
┌──────────────────────────────────────────────────────┐
│ Procesar Orden #12345                         [X]   │
├──────────────────────────────────────────────────────┤
│ Progreso: ●●●○○ (3 de 5 pasos)                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 📦 PASO 1: RESUMEN DE ORDEN ✓                       │
│ ┌────────────────────────────────────────────────┐  │
│ │ Cliente: Juan Pérez                            │  │
│ │ Productos: 3 items                             │  │
│ │ Subtotal: $100.00                              │  │
│ │ IVA (16%): $16.00                              │  │
│ │ Total: $116.00                                 │  │
│ │                                                │  │
│ │ Tipo de Entrega: [🏪 Venta en Tienda ▼]       │  │
│ │   ○ Venta en tienda (inmediato)               │  │
│ │   ○ Retiro programado (pickup)                │  │
│ │   ○ Delivery local                            │  │
│ │   ○ Envío nacional                            │  │
│ └────────────────────────────────────────────────┘  │
│ [Continuar →]                                       │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 💳 PASO 2: REGISTRO DE PAGO ← (Paso actual)         │
│ ┌────────────────────────────────────────────────┐  │
│ │ Balance Pendiente: $119.48                     │  │
│ │                                                │  │
│ │ Método de Pago: [Zelle USD ▼]                 │  │
│ │                                                │  │
│ │ Desglose:                                      │  │
│ │   Monto orden:      $116.00                   │  │
│ │   IGTF (3%):        $  3.48  ← Calculado auto │  │
│ │   ──────────────────────────                  │  │
│ │   Total a cobrar:   $119.48                   │  │
│ │                                                │  │
│ │ [Registrar Pago Completo] [Pago Parcial]      │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ 🔒 PASO 3: EMISIÓN FISCAL (Bloqueado hasta pagar)   │
│ 🔒 PASO 4: ENTREGA DE FACTURA (Bloqueado)           │
│ 🔒 PASO 5: CONFIRMACIÓN FINAL (Bloqueado)           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 1.3 Lógica de Validación por Paso

#### Paso 1: Resumen de Orden
**Estado**: Siempre habilitado
**Acciones**:
- Mostrar productos, cantidades, precios
- Mostrar totales (subtotal, IVA, IGTF si aplica, total)
- Selector de tipo de entrega (afecta workflow posterior)
- Botón "Continuar" siempre habilitado

**Reglas**:
- Si cambia tipo de entrega después de pagar → mostrar advertencia

---

#### Paso 2: Registro de Pago
**Estado**: Habilitado si `order.paymentStatus !== 'paid'`
**Bloqueado si**: Ya se pagó el total

**Acciones**:
- Integrar `PaymentDialogV2` existente
- Mostrar balance pendiente
- Permitir pagos parciales
- Calcular IGTF automático si método es divisas extranjeras
- Al registrar pago:
  - Crear registro en `order.paymentRecords[]`
  - Actualizar `order.paidAmount`
  - Actualizar `order.paymentStatus` (pending/partial/paid)
  - Generar asiento contable automático:
    ```
    Débito: Caja/Banco ($119.48)
    Crédito: Cuentas por Cobrar ($116.00)
    Crédito: IGTF por Pagar ($3.48)
    ```

**Reglas**:
- Si `paidAmount >= totalAmount` → Desbloquear Paso 3
- Si `paidAmount < totalAmount` → Mostrar balance pendiente, mantener Paso 3 bloqueado
- No permitir pagos que excedan el total

---

#### Paso 3: Emisión Fiscal
**Estado**: Habilitado si `order.paymentStatus === 'paid'`
**Bloqueado si**: No se ha pagado el total

**Acciones**:
- Tipo de documento:
  - ✅ Factura (con RIF, registro fiscal)
  - ✅ Nota de Entrega (sin validez fiscal, para control interno)
- Mostrar vista previa del documento
- Botón "Emitir Factura" o "Emitir Nota de Entrega"
- Al emitir:
  - Crear `BillingDocument` en base de datos
  - Actualizar `order.billingDocumentId`
  - Actualizar `order.billingDocumentType` (invoice/delivery_note)
  - Si es factura: Generar asiento contable:
    ```
    Débito: Cuentas por Cobrar ($116.00)
    Crédito: Ventas ($100.00)
    Crédito: IVA por Pagar ($16.00)
    ```
  - Registrar en Libro IVA si aplica

**Reglas de Validación Fiscal** (Backend):
```typescript
// Restricción crítica: Una orden solo puede tener UNA factura
if (order.billingDocumentId) {
  throw new BadRequestException(
    'Esta orden ya tiene una factura emitida. ' +
    'Use la opción "Ver Factura Original" para reimprimir.'
  );
}

// No permitir facturar sin pagar
if (order.paidAmount < order.totalAmount) {
  throw new BadRequestException(
    'Debe registrar el pago completo antes de emitir factura.'
  );
}
```

**Reglas**:
- Una orden solo puede tener UNA factura (restricción de base de datos)
- Si ya existe factura → Mostrar "Factura #F001234 emitida" + botón "Ver Original"
- Si se pagó completo → Desbloquear este paso
- Al emitir factura → Desbloquear Paso 4

---

#### Paso 4: Entrega de Factura
**Estado**: Habilitado si `order.billingDocumentId !== null`
**Bloqueado si**: No se ha emitido factura

**Acciones**:
- Opciones de entrega:
  - 📧 **Email**: Enviar PDF a `order.customerEmail`
  - 📱 **WhatsApp**: Enviar PDF a `order.customerPhone`
  - 🖨️ **Imprimir**: Abrir diálogo de impresión del navegador
  - 💾 **Descargar**: Descargar PDF
  - ✅ **Cliente no requiere copia** (para ventas en tienda)

- Mostrar vista previa del PDF
- Permitir seleccionar múltiples opciones
- Al confirmar entrega → Desbloquear Paso 5

**Reglas**:
- Si tipo documento es "Nota de Entrega" → Este paso es opcional
- Si eligió "Imprimir" → Abrir print dialog del navegador
- Al completar cualquier acción → Desbloquear Paso 5

---

#### Paso 5: Confirmación Final
**Estado**: Habilitado si completó Paso 4 (o Paso 3 si es Nota de Entrega)
**Bloqueado si**: Aún no entregó factura

**Acciones AUTOMÁTICAS al hacer click en "Finalizar Orden"**:

1. **Actualizar Inventario**:
   ```typescript
   for (const item of order.items) {
     // Cambiar de "reserved" a "out"
     await inventoryService.recordTransaction({
       productId: item.productId,
       quantity: -item.quantity,
       type: 'out',
       reason: 'sale',
       orderId: order._id
     });
   }
   ```

2. **Generar Asiento de COGS (Costo de Mercancía Vendida)**:
   ```typescript
   const totalCost = order.items.reduce((sum, item) =>
     sum + (item.costPrice * item.quantity), 0
   );

   // Asiento:
   // Débito: Costo de Ventas ($totalCost)
   // Crédito: Inventario ($totalCost)
   ```

3. **Actualizar Estado de Orden**:
   ```typescript
   if (order.fulfillmentType === 'store') {
     order.status = 'completed';
     order.fulfillmentStatus = 'delivered';
   } else {
     order.status = 'confirmed';
     order.fulfillmentStatus = 'pending'; // Va a fulfillment dashboard
   }
   ```

4. **Mostrar Resumen**:
   ```
   ┌────────────────────────────────────────┐
   │ ✅ Orden Procesada Exitosamente        │
   ├────────────────────────────────────────┤
   │ Orden #12345                           │
   │ ✓ Pagado: $119.48                      │
   │ ✓ Factura: F001234                     │
   │ ✓ Inventario actualizado               │
   │ ✓ Registros contables generados        │
   │                                        │
   │ Próximo paso:                          │
   │ 📦 Preparar pedido para entrega        │
   │                                        │
   │ [Ver en Dashboard de Entregas]         │
   │ [Cerrar]                               │
   └────────────────────────────────────────┘
   ```

**Reglas**:
- Este paso NO se puede deshacer
- Si falla algún proceso (inventario, contabilidad) → Hacer rollback completo
- Si es venta en tienda → Marcar como "Completed" (no va a fulfillment)
- Si es delivery/pickup → Marcar como "Awaiting Fulfillment"

---

### 1.4 Archivos a Crear/Modificar

#### Frontend

**Nuevo archivo**: `/src/components/orders/OrderProcessingDrawer.jsx`
```jsx
export function OrderProcessingDrawer({
  isOpen,
  onClose,
  order,
  onUpdate
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [fulfillmentType, setFulfillmentType] = useState(order.fulfillmentType);

  const canProceedToStep = (step) => {
    switch (step) {
      case 1: return true;
      case 2: return fulfillmentType !== null;
      case 3: return order.paymentStatus === 'paid';
      case 4: return order.billingDocumentId !== null;
      case 5: return order.invoiceDelivered === true;
      default: return false;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Procesar Orden #{order.orderNumber}</SheetTitle>
        </SheetHeader>

        {/* Progress Bar */}
        <Progress value={(currentStep / 5) * 100} />

        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          current={currentStep}
          canProceedTo={canProceedToStep}
        />

        {/* Step Content */}
        <div className="py-4">
          {currentStep === 1 && <Step1OrderSummary {...props} />}
          {currentStep === 2 && <Step2Payment {...props} />}
          {currentStep === 3 && <Step3Billing {...props} />}
          {currentStep === 4 && <Step4InvoiceDelivery {...props} />}
          {currentStep === 5 && <Step5Confirmation {...props} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
          >
            Anterior
          </Button>
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceedToStep(currentStep + 1)}
          >
            Siguiente
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Modificar**: `/src/components/orders/v2/OrdersManagementV2.jsx`
```jsx
// Antes: Dos botones separados
<Button onClick={() => handleOpenPaymentDialog(order)}>Pagar</Button>
<Button onClick={() => handleOpenBillingDrawer(order)}>Facturar</Button>

// Después: Un solo botón
<Button onClick={() => handleOpenProcessingDrawer(order)}>
  {getProcessButtonLabel(order)}
</Button>

function getProcessButtonLabel(order) {
  if (!order.paymentStatus || order.paymentStatus === 'pending') return 'Procesar';
  if (order.paymentStatus === 'paid' && !order.billingDocumentId) return 'Facturar';
  if (order.billingDocumentId) return 'Ver Proceso';
  return 'Procesar';
}
```

#### Backend

**Modificar**: `/src/schemas/order.schema.ts`
```typescript
@Schema({ timestamps: true })
export class Order {
  // ... campos existentes ...

  // FULFILLMENT & DELIVERY
  @Prop({
    type: String,
    enum: ['pending', 'picking', 'packed', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  })
  fulfillmentStatus: string;

  @Prop({
    type: String,
    enum: ['store', 'pickup', 'delivery_local', 'delivery_national'],
    default: 'store'
  })
  fulfillmentType: string;

  @Prop({ type: Date })
  fulfillmentDate?: Date;

  @Prop({ type: String })
  trackingNumber?: string;

  @Prop({ type: String })
  deliveryNotes?: string;

  // BILLING DOCUMENT LINK
  @Prop({ type: Types.ObjectId, ref: 'BillingDocument' })
  billingDocumentId?: Types.ObjectId;

  @Prop({ type: String })
  billingDocumentNumber?: string;

  @Prop({
    type: String,
    enum: ['none', 'invoice', 'delivery_note'],
    default: 'none'
  })
  billingDocumentType: string;

  @Prop({ type: Boolean, default: false })
  invoiceDelivered: boolean;
}
```

**Modificar**: `/src/modules/billing/billing.service.ts`
```typescript
async create(dto: CreateBillingDocumentDto, user: any) {
  // FISCAL VALIDATION: One Order = One Invoice (maximum)
  if (dto.type === 'invoice' && dto.relatedOrderId) {
    const existingInvoice = await this.billingModel.findOne({
      'references.orderId': dto.relatedOrderId,
      type: 'invoice',
      status: { $in: ['issued', 'validated', 'draft'] },
      tenantId: user.tenantId,
    });

    if (existingInvoice) {
      throw new BadRequestException(
        `Esta orden ya tiene una factura asociada (${existingInvoice.documentNumber}). ` +
        `Una orden solo puede tener una factura según regulaciones fiscales de Venezuela.`
      );
    }
  }

  // ... resto del código ...

  // Auto-update order with billing document reference
  if (dto.relatedOrderId) {
    await this.orderModel.updateOne(
      { _id: dto.relatedOrderId, tenantId: user.tenantId },
      {
        $set: {
          billingDocumentId: newDoc._id,
          billingDocumentNumber: newDoc.documentNumber,
          billingDocumentType: dto.type,
        }
      }
    );
  }
}
```

**Crear nuevo**: `/src/modules/orders/orders.controller.ts` - Endpoint de completar orden
```typescript
@Post(':id/complete')
@Permissions('orders_update')
async completeOrder(@Param('id') id: string, @Request() req) {
  return this.ordersService.completeOrder(id, req.user);
}
```

**Crear nuevo**: `/src/modules/orders/orders.service.ts`
```typescript
async completeOrder(id: string, user: any): Promise<OrderDocument> {
  const order = await this.orderModel.findOne({ _id: id, tenantId: user.tenantId });

  if (!order) {
    throw new NotFoundException('Orden no encontrada');
  }

  // Validate order is fully paid
  if (order.paymentStatus !== 'paid') {
    throw new BadRequestException(
      'La orden debe estar completamente pagada antes de completarla'
    );
  }

  // Validate order has billing document
  if (!order.billingDocumentId) {
    throw new BadRequestException(
      'La orden debe tener una factura o nota de entrega emitida'
    );
  }

  // Update inventory (reserved → out)
  for (const item of order.items) {
    await this.inventoryService.recordTransaction({
      productId: item.productId,
      variantId: item.variantId,
      quantity: -item.quantity,
      type: 'out',
      reason: 'sale',
      orderId: order._id,
      tenantId: user.tenantId,
    });
  }

  // Generate COGS journal entry
  const totalCost = order.items.reduce((sum, item) => {
    const cost = item.costPrice || 0;
    return sum + (cost * item.quantity);
  }, 0);

  await this.accountingService.createJournalEntry({
    date: new Date(),
    description: `COGS - Orden #${order.orderNumber}`,
    tenantId: user.tenantId,
    lines: [
      {
        accountCode: '5101', // Costo de Ventas
        debit: totalCost,
        credit: 0,
      },
      {
        accountCode: '1401', // Inventario
        debit: 0,
        credit: totalCost,
      }
    ]
  });

  // Update order status
  if (order.fulfillmentType === 'store') {
    order.status = 'completed';
    order.fulfillmentStatus = 'delivered';
  } else {
    order.status = 'confirmed';
    order.fulfillmentStatus = 'pending';
  }

  order.fulfillmentDate = new Date();
  await order.save();

  return order;
}
```

### 1.5 Testing Plan

#### Test Cases Críticos

**TC1: Happy Path - Venta en Tienda**
```
1. Crear orden con 2 productos
2. Abrir OrderProcessingDrawer
3. Paso 1: Verificar totales, seleccionar "Venta en tienda"
4. Paso 2: Registrar pago completo en efectivo
   - Verificar: Asiento contable creado (Caja/CR)
5. Paso 3: Emitir factura
   - Verificar: BillingDocument creado
   - Verificar: order.billingDocumentId actualizado
   - Verificar: No se puede emitir segunda factura
6. Paso 4: Seleccionar "Imprimir"
7. Paso 5: Completar orden
   - Verificar: Inventario actualizado (out)
   - Verificar: COGS registrado
   - Verificar: order.status = 'completed'
```

**TC2: Pago Parcial**
```
1. Crear orden $100
2. Registrar pago $50
3. Verificar: Paso 3 bloqueado
4. Registrar segundo pago $50
5. Verificar: Paso 3 desbloqueado
```

**TC3: Intento de Factura Duplicada**
```
1. Completar orden hasta Paso 3
2. Cerrar drawer
3. Reabrir drawer
4. Ir a Paso 3
5. Verificar: Muestra "Factura ya emitida", botón "Emitir" deshabilitado
```

**TC4: Delivery Workflow**
```
1. Crear orden, seleccionar "Delivery local"
2. Completar proceso hasta Paso 5
3. Verificar: order.status = 'confirmed'
4. Verificar: order.fulfillmentStatus = 'pending'
5. Verificar: Orden aparece en Fulfillment Dashboard
```

---

## FASE 2: Fulfillment Dashboard (Gestión de Entregas)

**Prioridad**: 🟡 ALTA
**Tiempo estimado**: 2-3 días
**Dependencias**: Fase 1 completada

### 2.1 Objetivos
- Crear dashboard para monitorear órdenes pagadas pendientes de entrega
- Workflow de estados (Pending → Picking → Packed → In Transit → Delivered)
- Notificaciones automáticas a clientes
- Alertas de entregas atrasadas

### 2.2 Modelo de Datos

**Ya agregado en Fase 1**:
```typescript
Order {
  fulfillmentStatus: 'pending' | 'picking' | 'packed' | 'in_transit' | 'delivered'
  fulfillmentType: 'store' | 'pickup' | 'delivery_local' | 'delivery_national'
  fulfillmentDate: Date
  trackingNumber: string
  deliveryNotes: string
}
```

### 2.3 Estados de Fulfillment

#### Estados por Tipo de Entrega

| Tipo              | Estados Aplicables                                        |
|-------------------|-----------------------------------------------------------|
| Store             | `pending` → `delivered` (instantáneo)                     |
| Pickup            | `pending` → `packed` → `delivered`                        |
| Delivery Local    | `pending` → `picking` → `packed` → `in_transit` → `delivered` |
| Delivery Nacional | `pending` → `picking` → `packed` → `in_transit` → `delivered` |

#### Flujo de Estados

```
┌─────────────────────────────────────────────────────┐
│                   PICKING                           │
│  (Preparando pedido en almacén)                     │
│                                                     │
│  Acciones:                                          │
│  - Cajero/Picker busca productos                   │
│  - Verifica cantidades                             │
│  - Confirma disponibilidad                         │
│  [Marcar como Empacado →]                          │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│                   PACKED                            │
│  (Empacado, listo para enviar)                      │
│                                                     │
│  Acciones:                                          │
│  - Producto empacado en caja/bolsa                 │
│  - Etiqueta de envío impresa                       │
│  - Esperando courier/cliente                       │
│                                                     │
│  Si Pickup: Cliente puede venir a recoger          │
│  Si Delivery: [Asignar a Courier →]               │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│                 IN_TRANSIT                          │
│  (En camino al cliente)                             │
│                                                     │
│  Acciones:                                          │
│  - Courier recogió pedido                          │
│  - # Tracking: [Ingresar código]                   │
│  - Notificar cliente vía SMS/Email                 │
│  [Confirmar Entrega →]                             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│                  DELIVERED                          │
│  (Entregado exitosamente)                           │
│                                                     │
│  Acciones automáticas:                              │
│  - order.status = 'completed'                      │
│  - Enviar encuesta de satisfacción                 │
│  - Pedir review del producto                       │
└─────────────────────────────────────────────────────┘
```

### 2.4 Diseño del Dashboard

```
┌───────────────────────────────────────────────────────────────────┐
│ 📦 Entregas Pendientes                              [Actualizar] │
├───────────────────────────────────────────────────────────────────┤
│ Filtros:                                                          │
│ [Tipo de Entrega ▼] [Estado ▼] [Fecha ▼] [Búsqueda...]          │
├───────────────────────────────────────────────────────────────────┤
│ Orden     Cliente      Tipo        Estado      Fecha    Acción   │
├───────────────────────────────────────────────────────────────────┤
│ #12345    Juan Pérez   Pickup      Packed      Hoy      [✓ Entregar] │
│ #12346    María García Delivery    Picking     Ayer     [📦 Empacar]  │
│ #12347    Pedro Castro Nacional    In Transit  2d       [🚚 Ver Tracking] │
│ #12348 ⚠️ Ana López    Delivery    Pending     5d ⚠️    [⚡ Urgente]  │
├───────────────────────────────────────────────────────────────────┤
│ Total: 24 órdenes pendientes                                      │
│ 🔴 3 urgentes (>3 días)  🟡 8 para hoy  🟢 13 programadas        │
└───────────────────────────────────────────────────────────────────┘
```

### 2.5 Componentes a Crear

**Archivo**: `/src/components/fulfillment/FulfillmentDashboard.jsx`

```jsx
export function FulfillmentDashboard() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: 'all'
  });

  const fetchPendingOrders = async () => {
    const data = await fetchApi('/orders?fulfillmentStatus=pending,picking,packed,in_transit');
    setOrders(data);
  };

  const updateFulfillmentStatus = async (orderId, newStatus) => {
    await fetchApi(`/orders/${orderId}/fulfillment`, {
      method: 'PATCH',
      body: { status: newStatus }
    });
    fetchPendingOrders();
  };

  return (
    <div className="p-6">
      <h1>Entregas Pendientes</h1>

      <FiltersBar filters={filters} onChange={setFilters} />

      <DataTable
        columns={FULFILLMENT_COLUMNS}
        data={filteredOrders}
        onStatusChange={updateFulfillmentStatus}
      />

      <FulfillmentStats orders={orders} />
    </div>
  );
}
```

**Archivo**: `/src/components/fulfillment/OrderFulfillmentCard.jsx`

```jsx
export function OrderFulfillmentCard({ order, onStatusChange }) {
  const getNextStatus = () => {
    const flow = {
      pending: 'picking',
      picking: 'packed',
      packed: order.fulfillmentType === 'pickup' ? 'delivered' : 'in_transit',
      in_transit: 'delivered'
    };
    return flow[order.fulfillmentStatus];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <h3>Orden #{order.orderNumber}</h3>
            <p>{order.customerName}</p>
          </div>
          <StatusBadge status={order.fulfillmentStatus} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <p>Tipo: {FULFILLMENT_TYPE_LABELS[order.fulfillmentType]}</p>
          <p>Productos: {order.items.length} items</p>
          <p>Total: {formatCurrency(order.totalAmount)}</p>

          {order.trackingNumber && (
            <p>Tracking: {order.trackingNumber}</p>
          )}

          {isOverdue(order.createdAt) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Entrega atrasada</AlertTitle>
              <AlertDescription>
                Esta orden tiene {getDaysOverdue(order.createdAt)} días de retraso
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => onStatusChange(order._id, getNextStatus())}
          className="w-full"
        >
          {getActionLabel(order.fulfillmentStatus)}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### 2.6 Backend - Endpoints

**Archivo**: `/src/modules/orders/orders.controller.ts`

```typescript
@Patch(':id/fulfillment')
@Permissions('orders_fulfill')
async updateFulfillment(
  @Param('id') id: string,
  @Body() dto: UpdateFulfillmentDto,
  @Request() req
) {
  return this.ordersService.updateFulfillment(id, dto, req.user);
}

@Get('pending-fulfillment')
@Permissions('orders_view')
async getPendingFulfillment(@Request() req, @Query() query) {
  return this.ordersService.findAll({
    tenantId: req.user.tenantId,
    fulfillmentStatus: { $in: ['pending', 'picking', 'packed', 'in_transit'] },
    ...query
  });
}
```

**Archivo**: `/src/modules/orders/dto/update-fulfillment.dto.ts`

```typescript
export class UpdateFulfillmentDto {
  @IsEnum(['pending', 'picking', 'packed', 'in_transit', 'delivered'])
  status: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}
```

**Archivo**: `/src/modules/orders/orders.service.ts`

```typescript
async updateFulfillment(
  id: string,
  dto: UpdateFulfillmentDto,
  user: any
): Promise<OrderDocument> {
  const order = await this.orderModel.findOne({
    _id: id,
    tenantId: user.tenantId
  });

  if (!order) {
    throw new NotFoundException('Orden no encontrada');
  }

  // Validate status transition
  const validTransitions = {
    pending: ['picking', 'packed'],
    picking: ['packed'],
    packed: ['in_transit', 'delivered'],
    in_transit: ['delivered']
  };

  const currentStatus = order.fulfillmentStatus;
  const newStatus = dto.status;

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new BadRequestException(
      `Invalid status transition from ${currentStatus} to ${newStatus}`
    );
  }

  // Update order
  order.fulfillmentStatus = dto.status;
  if (dto.trackingNumber) order.trackingNumber = dto.trackingNumber;
  if (dto.deliveryNotes) order.deliveryNotes = dto.deliveryNotes;

  if (dto.status === 'delivered') {
    order.status = 'completed';
    order.fulfillmentDate = new Date();
  }

  await order.save();

  // Send notification to customer
  await this.notificationService.sendFulfillmentUpdate(order, dto.status);

  return order;
}
```

### 2.7 Notificaciones Automáticas

**Servicio de Notificaciones**:
```typescript
// /src/modules/notifications/notifications.service.ts

async sendFulfillmentUpdate(order: Order, status: string) {
  const messages = {
    packed: {
      title: '📦 Tu pedido está listo',
      body: `Orden #${order.orderNumber} empacada y lista para ${
        order.fulfillmentType === 'pickup' ? 'recoger' : 'envío'
      }`
    },
    in_transit: {
      title: '🚚 Tu pedido va en camino',
      body: `Orden #${order.orderNumber} está siendo enviada.${
        order.trackingNumber ? ` Tracking: ${order.trackingNumber}` : ''
      }`
    },
    delivered: {
      title: '✅ Pedido entregado',
      body: `Orden #${order.orderNumber} fue entregada exitosamente. ¿Cómo calificarías tu experiencia?`
    }
  };

  const message = messages[status];

  if (message) {
    // Email
    if (order.customerEmail) {
      await this.emailService.send({
        to: order.customerEmail,
        subject: message.title,
        template: 'fulfillment-update',
        data: { order, message }
      });
    }

    // SMS (si está configurado)
    if (order.customerPhone) {
      await this.smsService.send({
        to: order.customerPhone,
        message: `${message.title}\n${message.body}`
      });
    }

    // WhatsApp (si está configurado)
    if (order.customerPhone && this.whatsappEnabled) {
      await this.whatsappService.send({
        to: order.customerPhone,
        message: message.body
      });
    }
  }
}
```

### 2.8 Testing Plan - Fulfillment

**TC5: Pickup Workflow**
```
1. Crear orden con fulfillmentType = 'pickup'
2. Completar hasta Paso 5
3. Verificar: Aparece en Fulfillment Dashboard
4. Click "Empacar"
5. Verificar: Status cambia a 'packed'
6. Verificar: Cliente recibe notificación
7. Click "Entregar"
8. Verificar: Status cambia a 'delivered'
9. Verificar: Order.status = 'completed'
```

**TC6: Delivery con Tracking**
```
1. Crear orden delivery
2. Completar proceso
3. En Fulfillment Dashboard: Click "Picking"
4. Click "Empacar"
5. Click "Enviar"
6. Ingresar tracking number
7. Verificar: Cliente recibe email con tracking
8. Click "Confirmar entrega"
9. Verificar: Order completed
```

---

## FASE 3: Mejoras Contables y Fiscales

**Prioridad**: 🟡 MEDIA
**Tiempo estimado**: 3-4 días
**Dependencias**: Fase 1 y 2 completadas

### 3.1 IGTF Payment Book

**Objetivo**: Registrar todos los pagos sujetos a IGTF en un libro fiscal separado, similar al Libro IVA.

#### 3.1.1 Modelo de Datos

**Archivo**: `/src/schemas/igtf-payment-book.schema.ts`

```typescript
@Schema({ timestamps: true })
export class IgtfPaymentBook {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: Date, required: true })
  paymentDate: Date;

  @Prop({ type: String, required: true })
  paymentMethod: string; // 'zelle', 'paypal', 'crypto', etc.

  @Prop({ type: String, required: true })
  currency: string; // 'USD', 'EUR', etc.

  @Prop({ type: Number, required: true })
  baseAmount: number; // Monto sin IGTF

  @Prop({ type: Number, required: true })
  igtfRate: number; // 3% (0.03)

  @Prop({ type: Number, required: true })
  igtfAmount: number; // Monto calculado de IGTF

  @Prop({ type: Number, required: true })
  totalAmount: number; // baseAmount + igtfAmount

  @Prop({ type: String })
  customerName: string;

  @Prop({ type: String })
  customerRif: string;

  @Prop({ type: String })
  reference: string; // Número de referencia del pago

  @Prop({
    type: String,
    enum: ['pending', 'declared', 'paid'],
    default: 'pending'
  })
  status: string;

  @Prop({ type: Date })
  declarationDate?: Date; // Fecha de declaración al SENIAT

  @Prop({ type: String })
  declarationNumber?: string; // Número de planilla
}
```

#### 3.1.2 Servicio IGTF

**Archivo**: `/src/modules/accounting/services/igtf-payment-book.service.ts`

```typescript
@Injectable()
export class IgtfPaymentBookService {
  constructor(
    @InjectModel(IgtfPaymentBook.name)
    private igtfModel: Model<IgtfPaymentBookDocument>,
  ) {}

  /**
   * Registrar pago con IGTF
   */
  async registerPayment(payment: {
    orderId: string;
    orderNumber: string;
    paymentDate: Date;
    paymentMethod: string;
    currency: string;
    baseAmount: number;
    igtfRate: number;
    customerName: string;
    customerRif?: string;
    reference?: string;
    tenantId: string;
  }) {
    const igtfAmount = payment.baseAmount * payment.igtfRate;
    const totalAmount = payment.baseAmount + igtfAmount;

    return this.igtfModel.create({
      ...payment,
      igtfAmount,
      totalAmount,
      status: 'pending',
    });
  }

  /**
   * Obtener reporte mensual de IGTF
   */
  async getMonthlyReport(tenantId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const entries = await this.igtfModel.find({
      tenantId,
      paymentDate: { $gte: startDate, $lte: endDate },
    }).sort({ paymentDate: 1 });

    const totalBase = entries.reduce((sum, e) => sum + e.baseAmount, 0);
    const totalIgtf = entries.reduce((sum, e) => sum + e.igtfAmount, 0);

    return {
      period: `${year}-${month.toString().padStart(2, '0')}`,
      entries,
      summary: {
        totalPayments: entries.length,
        totalBaseAmount: totalBase,
        totalIgtfAmount: totalIgtf,
        totalAmount: totalBase + totalIgtf,
      }
    };
  }

  /**
   * Marcar como declarado
   */
  async markAsDeclared(
    entryIds: string[],
    declarationDate: Date,
    declarationNumber: string,
    tenantId: string
  ) {
    return this.igtfModel.updateMany(
      { _id: { $in: entryIds }, tenantId },
      {
        $set: {
          status: 'declared',
          declarationDate,
          declarationNumber,
        }
      }
    );
  }
}
```

#### 3.1.3 Integración con Payment Flow

**Modificar**: `/src/modules/orders/orders.service.ts`

```typescript
async registerPayment(orderId: string, paymentDto: CreatePaymentDto, user: any) {
  const order = await this.orderModel.findOne({ _id: orderId, tenantId: user.tenantId });

  // ... código existente de registro de pago ...

  // Si el pago es en divisas extranjeras, registrar IGTF
  const foreignCurrencies = ['USD', 'EUR', 'COP', 'BRL', 'CLP'];
  if (foreignCurrencies.includes(paymentDto.currency)) {
    const igtfRate = 0.03; // 3%
    const baseAmount = paymentDto.amount;

    await this.igtfPaymentBookService.registerPayment({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      paymentDate: new Date(),
      paymentMethod: paymentDto.method,
      currency: paymentDto.currency,
      baseAmount,
      igtfRate,
      customerName: order.customerName,
      customerRif: order.customerRif,
      reference: paymentDto.reference,
      tenantId: user.tenantId,
    });
  }

  return order;
}
```

#### 3.1.4 Vista de Reporte IGTF

**Archivo**: `/src/components/accounting/IgtfReportPage.jsx`

```jsx
export function IgtfReportPage() {
  const [period, setPeriod] = useState({ year: 2025, month: 12 });
  const [report, setReport] = useState(null);

  const fetchReport = async () => {
    const data = await fetchApi(
      `/accounting/igtf-report?year=${period.year}&month=${period.month}`
    );
    setReport(data);
  };

  return (
    <div className="p-6">
      <h1>Libro de Pagos IGTF</h1>

      <div className="flex gap-4 mb-6">
        <Select value={period.year} onChange={(y) => setPeriod({...period, year: y})}>
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
        </Select>

        <Select value={period.month} onChange={(m) => setPeriod({...period, month: m})}>
          {MONTHS.map((month, i) => (
            <option key={i} value={i+1}>{month}</option>
          ))}
        </Select>

        <Button onClick={fetchReport}>Generar Reporte</Button>
      </div>

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumen {report.period}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pagos</p>
                  <p className="text-2xl font-bold">{report.summary.totalPayments}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Base</p>
                  <p className="text-2xl font-bold">{formatCurrency(report.summary.totalBaseAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IGTF Acumulado</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(report.summary.totalIgtfAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <DataTable
            columns={IGTF_COLUMNS}
            data={report.entries}
          />

          <div className="mt-4">
            <Button onClick={() => exportToExcel(report)}>
              Exportar a Excel
            </Button>
            <Button onClick={() => markAsDeclared(report.entries)}>
              Marcar como Declarado
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

### 3.2 Dashboard Contable en Tiempo Real

**Archivo**: `/src/components/dashboard/AccountingWidget.jsx`

```jsx
export function AccountingWidget() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await fetchApi('/accounting/daily-metrics');
      setMetrics(data);
    };
    fetchMetrics();

    // Actualizar cada 5 minutos
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <Skeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas del Día</CardTitle>
        <CardDescription>
          Actualizado: {new Date(metrics.timestamp).toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MetricRow
            label="Ventas del Día"
            value={formatCurrency(metrics.dailySales)}
            icon={TrendingUp}
            trend={metrics.salesTrend}
          />

          <MetricRow
            label="IVA Acumulado"
            value={formatCurrency(metrics.accumulatedIVA)}
            icon={Receipt}
            sublabel={`${metrics.ivaTransactions} facturas`}
          />

          <MetricRow
            label="IGTF Acumulado"
            value={formatCurrency(metrics.accumulatedIGTF)}
            icon={DollarSign}
            sublabel={`${metrics.igtfPayments} pagos en divisas`}
          />

          <Separator />

          <MetricRow
            label="Utilidad Bruta"
            value={formatCurrency(metrics.grossProfit)}
            icon={PiggyBank}
            sublabel={`Margen: ${metrics.profitMargin}%`}
            variant={metrics.grossProfit > 0 ? 'success' : 'destructive'}
          />

          <div className="text-xs text-muted-foreground">
            Costo de Ventas: {formatCurrency(metrics.cogs)}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          Ver Reportes Completos
        </Button>
      </CardFooter>
    </Card>
  );
}
```

**Backend Endpoint**:
```typescript
// /src/modules/accounting/accounting.controller.ts

@Get('daily-metrics')
@Permissions('accounting_view')
async getDailyMetrics(@Request() req) {
  const tenantId = req.user.tenantId;
  const today = startOfDay(new Date());

  const sales = await this.journalEntryModel.aggregate([
    {
      $match: {
        tenantId,
        date: { $gte: today },
        'lines.accountCode': '4101', // Ventas
      }
    },
    {
      $unwind: '$lines'
    },
    {
      $match: {
        'lines.accountCode': '4101'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$lines.credit' }
      }
    }
  ]);

  const dailySales = sales[0]?.total || 0;

  // ... similar queries for IVA, IGTF, COGS ...

  return {
    timestamp: new Date(),
    dailySales,
    accumulatedIVA: ivaTotal,
    ivaTransactions: ivaCount,
    accumulatedIGTF: igtfTotal,
    igtfPayments: igtfCount,
    cogs: cogsTotal,
    grossProfit: dailySales - cogsTotal,
    profitMargin: ((dailySales - cogsTotal) / dailySales * 100).toFixed(2),
    salesTrend: calculateTrend(), // vs ayer
  };
}
```

---

## FASE 4: Devoluciones y Notas de Crédito

**Prioridad**: 🟢 MEDIA-BAJA
**Tiempo estimado**: 3-4 días
**Dependencias**: Fases 1, 2, 3 completadas

### 4.1 Mejores Prácticas de Devoluciones (ERPs Líderes)

#### SAP, Oracle NetSuite, Odoo:
1. **No modificar facturas emitidas** (ilegal fiscalmente en Venezuela y mayoría de países)
2. **Crear Nota de Crédito** que anula total o parcialmente la factura original
3. **Reversión automática de asientos contables** (negativo)
4. **Devolución de inventario** (productos vuelven a stock)
5. **Gestión de reembolsos** o crédito a favor del cliente

### 4.2 Tipos de Devoluciones

| Tipo                | Descripción                                      | Acción                |
|---------------------|--------------------------------------------------|-----------------------|
| **Total**           | Cliente devuelve todos los productos            | Nota de crédito 100% + Reembolso |
| **Parcial**         | Cliente devuelve algunos productos              | Nota de crédito parcial + Reembolso parcial |
| **Cambio**          | Cliente quiere otro producto                    | NC + Nueva orden |
| **Defectuoso**      | Producto con fallas                             | NC + Reemplazo sin cargo |

### 4.3 Workflow de Devoluciones

```
┌───────────────────────────────────────────────────────┐
│ OrderDetailsDialog - Orden #12345                     │
│ Estado: Completed | Pagado: $119.48 | Factura: F001234│
├───────────────────────────────────────────────────────┤
│ [Ver Factura] [Crear Devolución] ← Solo ciertos roles│
└───────────────────────────────────────────────────────┘
                      ↓ Click
┌───────────────────────────────────────────────────────┐
│ Crear Devolución - Orden #12345                       │
├───────────────────────────────────────────────────────┤
│ Selecciona los productos a devolver:                  │
│                                                       │
│ ☑ Producto A (2 unidades) - $50.00                   │
│ ☐ Producto B (1 unidad) - $30.00                     │
│ ☑ Producto C (3 unidades) - $36.48                   │
│                                                       │
│ Subtotal devuelto: $86.48                            │
│ IVA devuelto: $13.84                                  │
│ Total a reembolsar: $100.32                           │
│                                                       │
│ Razón de devolución:                                  │
│ ○ Producto defectuoso                                │
│ ○ Error en el pedido                                 │
│ ● Cliente cambió de opinión                          │
│ ○ Otro: [________]                                   │
│                                                       │
│ Método de reembolso:                                  │
│ ● Mismo método de pago original                      │
│ ○ Crédito a favor (anticipo)                         │
│ ○ Cambio por otro producto                           │
│                                                       │
│ [Cancelar] [Crear Nota de Crédito →]                │
└───────────────────────────────────────────────────────┘
                      ↓ Confirmar
┌───────────────────────────────────────────────────────┐
│ ✅ Nota de Crédito Creada                             │
├───────────────────────────────────────────────────────┤
│ NC #NC000123                                          │
│ Monto: $100.32                                        │
│                                                       │
│ Acciones realizadas:                                  │
│ ✓ Nota de crédito emitida                            │
│ ✓ Asientos contables revertidos                      │
│ ✓ Inventario devuelto (5 unidades)                   │
│ ✓ Cliente notificado por email                       │
│                                                       │
│ Próximo paso:                                         │
│ → Procesar reembolso de $100.32                      │
│                                                       │
│ [Imprimir NC] [Procesar Reembolso →]                │
└───────────────────────────────────────────────────────┘
```

### 4.4 Modelo de Datos - Nota de Crédito

**Modificar**: `/src/schemas/billing-document.schema.ts`

```typescript
@Schema({ timestamps: true })
export class BillingDocument {
  // ... campos existentes ...

  @Prop({
    type: String,
    enum: ['invoice', 'delivery_note', 'credit_note'], // ← Agregar credit_note
    required: true
  })
  type: string;

  // Para notas de crédito
  @Prop({ type: Types.ObjectId, ref: 'BillingDocument' })
  originalInvoiceId?: Types.ObjectId; // Factura que se está anulando

  @Prop({ type: String })
  originalInvoiceNumber?: string;

  @Prop({ type: String })
  creditNoteReason?: string; // Razón de la devolución
}
```

**Nuevo Schema**: `/src/schemas/return-order.schema.ts`

```typescript
@Schema({ timestamps: true })
export class ReturnOrder {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  returnNumber: string; // RET-000001

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  originalOrderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  originalOrderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'BillingDocument' })
  creditNoteId?: Types.ObjectId;

  @Prop({ type: String })
  creditNoteNumber?: string;

  @Prop({
    type: [{
      productId: { type: Types.ObjectId, ref: 'Product' },
      productName: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
    }]
  })
  items: Array<{
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  ivaTotal: number;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({
    type: String,
    enum: ['defective', 'wrong_item', 'customer_request', 'other'],
    required: true
  })
  reason: string;

  @Prop({ type: String })
  reasonDetails?: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'refunded', 'rejected'],
    default: 'pending'
  })
  status: string;

  @Prop({
    type: String,
    enum: ['original_payment', 'store_credit', 'exchange'],
    required: true
  })
  refundMethod: string;

  @Prop({ type: Date })
  refundedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy: Types.ObjectId;
}
```

### 4.5 Servicio de Devoluciones

**Archivo**: `/src/modules/returns/returns.service.ts`

```typescript
@Injectable()
export class ReturnsService {
  constructor(
    @InjectModel(ReturnOrder.name) private returnModel: Model<ReturnOrderDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(BillingDocument.name) private billingModel: Model<BillingDocumentDocument>,
    private inventoryService: InventoryService,
    private accountingService: AccountingService,
    private billingService: BillingService,
  ) {}

  async createReturn(dto: CreateReturnDto, user: any) {
    const session = await this.returnModel.db.startSession();
    session.startTransaction();

    try {
      // 1. Validar que la orden existe y está pagada
      const order = await this.orderModel.findOne({
        _id: dto.orderId,
        tenantId: user.tenantId,
        paymentStatus: 'paid',
      });

      if (!order) {
        throw new BadRequestException('Orden no encontrada o no pagada');
      }

      // 2. Generar número de devolución
      const returnNumber = await this.generateReturnNumber(user.tenantId);

      // 3. Crear registro de devolución
      const returnOrder = await this.returnModel.create({
        tenantId: user.tenantId,
        returnNumber,
        originalOrderId: order._id,
        originalOrderNumber: order.orderNumber,
        items: dto.items,
        subtotal: dto.subtotal,
        ivaTotal: dto.ivaTotal,
        totalAmount: dto.totalAmount,
        reason: dto.reason,
        reasonDetails: dto.reasonDetails,
        refundMethod: dto.refundMethod,
        status: 'pending',
        processedBy: user.id,
      });

      // 4. Crear Nota de Crédito
      const creditNote = await this.billingService.create({
        type: 'credit_note',
        seriesId: dto.seriesId, // Serie para NC
        tenantId: user.tenantId,
        relatedOrderId: order._id,
        originalInvoiceId: order.billingDocumentId,
        originalInvoiceNumber: order.billingDocumentNumber,
        customerName: order.customerName,
        customerRif: order.customerRif,
        items: dto.items.map(item => ({
          description: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        subtotal: dto.subtotal,
        taxAmount: dto.ivaTotal,
        totalAmount: dto.totalAmount,
        creditNoteReason: dto.reason,
        status: 'issued',
      }, user);

      // 5. Actualizar ReturnOrder con NC
      returnOrder.creditNoteId = creditNote._id;
      returnOrder.creditNoteNumber = creditNote.documentNumber;
      await returnOrder.save();

      // 6. Devolver inventario
      for (const item of dto.items) {
        await this.inventoryService.recordTransaction({
          productId: item.productId,
          quantity: item.quantity, // Positivo (devuelve a stock)
          type: 'in',
          reason: 'return',
          returnOrderId: returnOrder._id,
          tenantId: user.tenantId,
        }, { session });
      }

      // 7. Reversión de asientos contables
      await this.reverseAccountingEntries(order, dto, user.tenantId, session);

      // 8. Commit transaction
      await session.commitTransaction();

      return returnOrder;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async reverseAccountingEntries(
    order: Order,
    returnDto: CreateReturnDto,
    tenantId: string,
    session: any
  ) {
    const subtotal = returnDto.subtotal;
    const iva = returnDto.ivaTotal;
    const total = returnDto.totalAmount;

    // Revertir asiento de venta (inverso)
    await this.accountingService.createJournalEntry({
      date: new Date(),
      description: `NC - Devolución Orden #${order.orderNumber}`,
      tenantId,
      lines: [
        {
          accountCode: '4101', // Ventas
          debit: subtotal, // ← Inverso (originalmente era crédito)
          credit: 0,
        },
        {
          accountCode: '2103', // IVA por Pagar
          debit: iva, // ← Inverso
          credit: 0,
        },
        {
          accountCode: '1102', // Cuentas por Cobrar
          debit: 0,
          credit: total, // ← Inverso
        }
      ],
      session,
    });

    // Revertir COGS (devolver costo al inventario)
    const returnedCost = returnDto.items.reduce((sum, item) => {
      const originalItem = order.items.find(i => i.productId === item.productId);
      const cost = originalItem?.costPrice || 0;
      return sum + (cost * item.quantity);
    }, 0);

    await this.accountingService.createJournalEntry({
      date: new Date(),
      description: `COGS Reversal - Devolución #${order.orderNumber}`,
      tenantId,
      lines: [
        {
          accountCode: '1401', // Inventario
          debit: returnedCost, // Devolver costo a inventario
          credit: 0,
        },
        {
          accountCode: '5101', // Costo de Ventas
          debit: 0,
          credit: returnedCost, // Reducir CMV
        }
      ],
      session,
    });
  }
}
```

### 4.6 Frontend - Return Dialog

**Archivo**: `/src/components/returns/CreateReturnDialog.jsx`

```jsx
export function CreateReturnDialog({ order, isOpen, onClose, onSuccess }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('customer_request');
  const [reasonDetails, setReasonDetails] = useState('');
  const [refundMethod, setRefundMethod] = useState('original_payment');

  const handleItemToggle = (item) => {
    if (selectedItems.find(i => i.productId === item.productId)) {
      setSelectedItems(selectedItems.filter(i => i.productId !== item.productId));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const calculateTotals = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const handleSubmit = async () => {
    const { subtotal, iva, total } = calculateTotals();

    try {
      const returnOrder = await fetchApi('/returns', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order._id,
          items: selectedItems,
          subtotal,
          ivaTotal: iva,
          totalAmount: total,
          reason,
          reasonDetails,
          refundMethod,
        })
      });

      toast.success('Nota de crédito creada exitosamente');
      onSuccess(returnOrder);
      onClose();
    } catch (error) {
      toast.error('Error al crear devolución', { description: error.message });
    }
  };

  const { subtotal, iva, total } = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Devolución - Orden #{order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Productos a devolver:</h3>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.productId} className="flex items-center gap-2 p-2 border rounded">
                  <Checkbox
                    checked={selectedItems.find(i => i.productId === item.productId)}
                    onCheckedChange={() => handleItemToggle(item)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} unidades × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Totales de devolución:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span>{formatCurrency(iva)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total a reembolsar:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Razón de devolución</Label>
            <Select value={reason} onValueChange={setReason}>
              <option value="defective">Producto defectuoso</option>
              <option value="wrong_item">Error en el pedido</option>
              <option value="customer_request">Cliente cambió de opinión</option>
              <option value="other">Otro</option>
            </Select>

            {reason === 'other' && (
              <Textarea
                placeholder="Especifique la razón..."
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <Label>Método de reembolso</Label>
            <RadioGroup value={refundMethod} onValueChange={setRefundMethod}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="original_payment" id="original" />
                <Label htmlFor="original">Mismo método de pago original</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="store_credit" id="credit" />
                <Label htmlFor="credit">Crédito a favor (anticipo)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="exchange" id="exchange" />
                <Label htmlFor="exchange">Cambio por otro producto</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedItems.length === 0}
          >
            Crear Nota de Crédito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.7 Testing - Devoluciones

**TC7: Devolución Total**
```
1. Completar orden #12345 ($100)
2. Click "Crear Devolución"
3. Seleccionar todos los productos
4. Razón: "Defectuoso"
5. Método: "Reembolso original"
6. Confirmar
7. Verificar: NC creada
8. Verificar: Inventario devuelto (+productos)
9. Verificar: Asientos contables revertidos
10. Verificar: Cliente notificado
```

**TC8: Devolución Parcial**
```
1. Orden con 3 productos ($100)
2. Devolver 1 producto ($30)
3. Verificar: NC por $30
4. Verificar: Solo 1 producto devuelto a inventario
5. Verificar: Asientos parciales correctos
```

---

## FASE 5: Servicios y Agendamientos

**Prioridad**: 🟢 BAJA (Futuro)
**Tiempo estimado**: 1 semana
**Dependencias**: Todas las fases anteriores

### 5.1 Adaptación para Vertical de Servicios

El mismo workflow de OrderProcessingDrawer debe funcionar para servicios:

**Diferencias clave**:
- En lugar de productos físicos → Servicios agendados
- No hay inventario físico → Disponibilidad de agenda
- Fulfillment = Ejecución del servicio en fecha/hora agendada

**Modelo**:
```typescript
Order {
  type: 'sale' | 'service', // ← Nuevo campo

  // Si type = 'service'
  serviceAppointments: [
    {
      serviceId: ObjectId,
      serviceName: string,
      date: Date,
      startTime: string,
      endTime: string,
      providerId: ObjectId, // Empleado que ejecutará
      status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    }
  ]
}
```

**Paso 5 del Wizard** (para servicios):
```
En lugar de "Actualizar Inventario":
→ "Marcar Servicio como Programado"
→ Notificar cliente con confirmación de cita
→ Agregar a calendario del proveedor
→ Enviar recordatorio 24h antes
```

---

## CRONOGRAMA COMPLETO

### Semana 1
- **Lunes-Martes**: Fase 1 - OrderProcessingDrawer (frontend base)
- **Miércoles**: Fase 1 - Backend validaciones y endpoints
- **Jueves**: Fase 1 - Testing e integración
- **Viernes**: Fase 1 - Correcciones y refinamiento

### Semana 2
- **Lunes-Martes**: Fase 2 - Fulfillment Dashboard (frontend)
- **Miércoles**: Fase 2 - Backend fulfillment service
- **Jueves**: Fase 2 - Notificaciones automáticas
- **Viernes**: Fase 2 - Testing completo

### Semana 3
- **Lunes-Martes**: Fase 3 - IGTF Payment Book
- **Miércoles**: Fase 3 - Dashboard contable en tiempo real
- **Jueves**: Fase 3 - Testing e integración
- **Viernes**: Fase 3 - Refinamiento y documentación

### Semana 4
- **Lunes-Martes**: Fase 4 - Returns & Credit Notes (frontend)
- **Miércoles**: Fase 4 - Backend returns service
- **Jueves**: Fase 4 - Testing completo
- **Viernes**: Buffer / Correcciones finales

### Semana 5+
- **Fase 5**: Adaptación para servicios (cuando se requiera)

---

## RIESGOS Y MITIGACIONES

### Riesgo 1: Complejidad del State Management en Wizard
**Impacto**: Alto
**Probabilidad**: Media
**Mitigación**:
- Usar Zustand o Context API para estado global
- Testing exhaustivo de cada paso
- Implementar logging detallado

### Riesgo 2: Reversión de Asientos Contables
**Impacto**: Crítico (afecta finanzas)
**Probabilidad**: Media
**Mitigación**:
- Usar transacciones de MongoDB (atomic operations)
- Testing con data de producción (anonimizada)
- Revisión de contador antes de deploy

### Riesgo 3: Integración con Sistemas Externos (Email/SMS)
**Impacto**: Medio
**Probabilidad**: Alta
**Mitigación**:
- Implementar queue system (Bull/Redis)
- Retry logic con exponential backoff
- Fallback a notificaciones in-app

### Riesgo 4: Performance con Grandes Volúmenes
**Impacto**: Alto
**Probabilidad**: Media
**Mitigación**:
- Indexar campos críticos (orderNumber, fulfillmentStatus, paymentStatus)
- Pagination en dashboards
- Caching de métricas contables

---

## MÉTRICAS DE ÉXITO

### KPIs Técnicos
- ✅ 100% de órdenes tienen factura o nota de entrega
- ✅ 0 facturas duplicadas por orden
- ✅ Tiempo de procesamiento < 2 minutos (crear orden → completar)
- ✅ 99.9% de asientos contables correctos

### KPIs de Usuario
- ⬆️ Reducción de 50% en tiempo de procesamiento de orden
- ⬆️ Reducción de 80% en errores de facturación
- ⬆️ 95% satisfacción de cajeros con nuevo workflow
- ⬆️ 0 órdenes perdidas sin facturar

### KPIs de Negocio
- 📈 Incremento de órdenes procesadas por día
- 📉 Reducción de devoluciones por error
- 💰 Mayor precisión en reportes fiscales (IVA, IGTF)
- ⚖️ Cumplimiento 100% con regulaciones SENIAT

---

## CONCLUSIÓN

Este roadmap implementa un sistema completo de gestión de órdenes que:

1. ✅ **Garantiza cumplimiento fiscal**: Una orden = Una factura
2. ✅ **Sincroniza inventario**: Automático al completar proceso
3. ✅ **Automatiza contabilidad**: Asientos generados sin intervención manual
4. ✅ **Mejora UX**: Workflow guiado, imposible saltarse pasos
5. ✅ **Gestiona entregas**: Dashboard para monitorear fulfillment
6. ✅ **Maneja devoluciones**: Notas de crédito con reversión contable

**Siguiente paso**: Implementar Fase 1 (OrderProcessingDrawer) como prioridad máxima.
