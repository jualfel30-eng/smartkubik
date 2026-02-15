# Sistema de Descuentos - Diseño e Implementación

## Resumen

Sistema completo de descuentos con registro de auditoría para transparencia y control. Permite descuentos en productos individuales, items de órdenes, y descuentos generales en toda la orden.

## Cambios Implementados

### 1. Schema de Productos (product.schema.ts)
**Agregado:**
- `pricingRules.bulkDiscountEnabled`: Boolean para activar descuentos por volumen
- `pricingRules.bulkDiscountRules`: Array de reglas de descuento automático
  ```typescript
  bulkDiscountRules: [{
    minQuantity: number,      // Cantidad mínima para aplicar
    discountPercentage: number // Porcentaje de descuento
  }]
  ```

**Ejemplo:**
```json
{
  "bulkDiscountEnabled": true,
  "bulkDiscountRules": [
    { "minQuantity": 10, "discountPercentage": 5 },
    { "minQuantity": 50, "discountPercentage": 10 },
    { "minQuantity": 100, "discountPercentage": 15 }
  ]
}
```

### 2. Schema de Order Items (order.schema.ts - OrderItem)
**Agregado:**
- `discountPercentage`: Porcentaje de descuento aplicado al item
- `discountAmount`: Monto del descuento en moneda
- `discountReason`: Razón del descuento (venta al mayor, cliente frecuente, promoción, etc.)
- `discountApprovedBy`: Usuario que aprobó el descuento (ObjectId)

### 3. Schema de Orden (order.schema.ts - Order)
**Agregado:**
- `generalDiscountPercentage`: Descuento general aplicado a toda la orden (%)
- `generalDiscountReason`: Razón del descuento general
- `generalDiscountApprovedBy`: Usuario que aprobó el descuento general (ObjectId)

**Nota:** El campo `discountAmount` ya existía y almacena el monto total de descuentos.

### 4. Schema de Auditoría de Descuentos (discount-audit.schema.ts)
**Nuevo archivo creado** para registrar TODOS los descuentos aplicados.

**Campos principales:**
- `discountType`: "order" | "order_item" | "product"
- `orderId`, `orderNumber`: Referencia a la orden
- `productId`, `productSku`, `productName`: Referencia al producto
- `originalAmount`: Monto antes del descuento
- `discountPercentage`: Porcentaje aplicado
- `discountAmount`: Monto del descuento
- `finalAmount`: Monto final
- `reason`: Razón del descuento
- `appliedBy`, `appliedByName`: Usuario que aplicó
- `approvedBy`, `approvedByName`: Usuario que aprobó (si es diferente)
- `customerId`, `customerName`: Cliente que recibió el descuento
- `quantity`: Cantidad de productos (para descuentos por volumen)
- `wasBulkDiscount`: Si fue descuento automático por volumen
- `metadata`: Datos adicionales

**Índices:**
- Por tenant y fecha
- Por orden, producto, usuario, cliente
- Por tipo de descuento

## Tareas Pendientes de Implementación

### Backend

#### 1. Crear Módulo de Descuentos
**Archivo:** `src/modules/discounts/discounts.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscountAudit, DiscountAuditSchema } from '../../schemas/discount-audit.schema';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DiscountAudit.name, schema: DiscountAuditSchema },
    ]),
  ],
  providers: [DiscountsService],
  controllers: [DiscountsController],
  exports: [DiscountsService],
})
export class DiscountsModule {}
```

#### 2. Crear Servicio de Descuentos
**Archivo:** `src/modules/discounts/discounts.service.ts`

**Métodos necesarios:**
- `recordDiscount(data)`: Registra un descuento en la auditoría
- `calculateBulkDiscount(product, quantity)`: Calcula descuento automático por volumen
- `validateDiscountPermission(user, discountPercentage, maxAllowed)`: Valida si el usuario puede aplicar el descuento
- `getDiscountHistory(filters)`: Obtiene historial de descuentos

#### 3. Agregar Permiso
**Archivo:** `src/seeders/permissions.seed.ts`

Agregar nuevo permiso:
```typescript
{
  name: 'apply_discounts',
  description: 'Aplicar descuentos a productos y órdenes',
  category: 'Ventas'
}
```

#### 4. Modificar Servicio de Órdenes
**Archivo:** `src/modules/orders/orders.service.ts`

Al crear/actualizar órdenes:
1. Calcular descuentos automáticos por volumen
2. Aplicar descuentos manuales
3. Registrar en auditoría
4. Recalcular totales

**Ejemplo de lógica:**
```typescript
// En createOrder o updateOrder
for (const item of order.items) {
  const product = await this.productModel.findById(item.productId);

  // Calcular descuento automático por volumen
  if (product.pricingRules?.bulkDiscountEnabled) {
    const bulkDiscount = this.discountsService.calculateBulkDiscount(
      product,
      item.quantity
    );
    if (bulkDiscount > 0) {
      item.discountPercentage = bulkDiscount;
      item.discountAmount = (item.unitPrice * item.quantity * bulkDiscount) / 100;

      // Registrar en auditoría
      await this.discountsService.recordDiscount({
        discountType: 'order_item',
        orderId: order._id,
        orderNumber: order.orderNumber,
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        originalAmount: item.unitPrice * item.quantity,
        discountPercentage: bulkDiscount,
        discountAmount: item.discountAmount,
        finalAmount: (item.unitPrice * item.quantity) - item.discountAmount,
        reason: 'Descuento automático por volumen',
        appliedBy: user.id,
        appliedByName: user.name,
        wasBulkDiscount: true,
        quantity: item.quantity,
        tenantId: user.tenantId
      });
    }
  }

  // Recalcular precio del item
  item.totalPrice = (item.unitPrice * item.quantity) - (item.discountAmount || 0);
}

// Aplicar descuento general si existe
if (order.generalDiscountPercentage > 0) {
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const generalDiscountAmount = (subtotal * order.generalDiscountPercentage) / 100;
  order.discountAmount = generalDiscountAmount;

  // Registrar en auditoría
  await this.discountsService.recordDiscount({
    discountType: 'order',
    orderId: order._id,
    orderNumber: order.orderNumber,
    originalAmount: subtotal,
    discountPercentage: order.generalDiscountPercentage,
    discountAmount: generalDiscountAmount,
    finalAmount: subtotal - generalDiscountAmount,
    reason: order.generalDiscountReason,
    appliedBy: order.generalDiscountApprovedBy || user.id,
    appliedByName: user.name,
    customerId: order.customerId,
    customerName: order.customerName,
    tenantId: user.tenantId
  });
}
```

### Frontend

#### 5. UI para Descuentos por Volumen en Productos
**Archivo:** `ProductsManagement.jsx`

En el formulario de edición de productos, agregar sección:

```jsx
{/* Descuentos por Volumen */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>Descuentos por Volumen</Label>
    <Switch
      checked={editingProduct.pricingRules?.bulkDiscountEnabled}
      onCheckedChange={(checked) => {
        setEditingProduct(prev => ({
          ...prev,
          pricingRules: {
            ...prev.pricingRules,
            bulkDiscountEnabled: checked
          }
        }));
      }}
    />
  </div>

  {editingProduct.pricingRules?.bulkDiscountEnabled && (
    <div className="space-y-2">
      <Label>Reglas de Descuento</Label>
      {(editingProduct.pricingRules?.bulkDiscountRules || []).map((rule, index) => (
        <div key={index} className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="Cantidad mínima"
            value={rule.minQuantity}
            onChange={(e) => {
              const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
              rules[index].minQuantity = Number(e.target.value);
              setEditingProduct(prev => ({
                ...prev,
                pricingRules: {
                  ...prev.pricingRules,
                  bulkDiscountRules: rules
                }
              }));
            }}
          />
          <Input
            type="number"
            placeholder="% Descuento"
            value={rule.discountPercentage}
            onChange={(e) => {
              const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
              rules[index].discountPercentage = Number(e.target.value);
              setEditingProduct(prev => ({
                ...prev,
                pricingRules: {
                  ...prev.pricingRules,
                  bulkDiscountRules: rules
                }
              }));
            }}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
              rules.splice(index, 1);
              setEditingProduct(prev => ({
                ...prev,
                pricingRules: {
                  ...prev.pricingRules,
                  bulkDiscountRules: rules
                }
              }));
            }}
          >
            Eliminar
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
          rules.push({ minQuantity: 0, discountPercentage: 0 });
          setEditingProduct(prev => ({
            ...prev,
            pricingRules: {
              ...prev.pricingRules,
              bulkDiscountRules: rules
            }
          }));
        }}
      >
        + Agregar Regla
      </Button>
    </div>
  )}
</div>
```

#### 6. UI para Descuentos en Items de Órdenes
**Archivo:** `OrdersManagementV2.jsx`

En la tabla de items de la orden, agregar columna y botón de descuento:

```jsx
// En la columna de acciones de cada item
{hasPermission('apply_discounts') && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      setDiscountingItem(item);
      setDiscountDialogOpen(true);
    }}
  >
    <Percent className="h-4 w-4" />
  </Button>
)}

// Dialog para aplicar descuento
<Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Aplicar Descuento</DialogTitle>
      <DialogDescription>
        Producto: {discountingItem?.productName}
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>Monto Original</Label>
        <p className="text-lg font-semibold">
          ${(discountingItem?.unitPrice * discountingItem?.quantity).toFixed(2)}
        </p>
      </div>
      <div>
        <Label>Porcentaje de Descuento (%)</Label>
        <Input
          type="number"
          min="0"
          max={discountingItem?.pricingRules?.maximumDiscount || 100}
          value={discountPercentage}
          onChange={(e) => setDiscountPercentage(Number(e.target.value))}
        />
      </div>
      <div>
        <Label>Razón del Descuento</Label>
        <Select value={discountReason} onValueChange={setDiscountReason}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar razón" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="venta_mayor">Venta al Mayor</SelectItem>
            <SelectItem value="cliente_frecuente">Cliente Frecuente</SelectItem>
            <SelectItem value="promocion">Promoción</SelectItem>
            <SelectItem value="ajuste_precio">Ajuste de Precio</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
        {discountReason === 'otro' && (
          <Input
            className="mt-2"
            placeholder="Especificar razón..."
            value={customDiscountReason}
            onChange={(e) => setCustomDiscountReason(e.target.value)}
          />
        )}
      </div>
      <div>
        <Label>Descuento a Aplicar</Label>
        <p className="text-lg font-semibold text-green-600">
          -${((discountingItem?.unitPrice * discountingItem?.quantity * discountPercentage) / 100).toFixed(2)}
        </p>
      </div>
      <div>
        <Label>Total con Descuento</Label>
        <p className="text-2xl font-bold">
          ${((discountingItem?.unitPrice * discountingItem?.quantity) -
             ((discountingItem?.unitPrice * discountingItem?.quantity * discountPercentage) / 100)).toFixed(2)}
        </p>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
        Cancelar
      </Button>
      <Button onClick={handleApplyItemDiscount}>
        Aplicar Descuento
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 7. UI para Descuento General en Orden
**Archivo:** `OrdersManagementV2.jsx`

En el resumen de la orden (donde está el subtotal, IVA, total):

```jsx
{/* En el resumen de totales */}
{hasPermission('apply_discounts') && (
  <div className="flex justify-between items-center border-t pt-2">
    <div className="flex items-center gap-2">
      <span className="text-sm">Descuento General:</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setGeneralDiscountDialogOpen(true)}
      >
        <Percent className="h-4 w-4 mr-1" />
        Aplicar
      </Button>
    </div>
    <span className="text-sm font-semibold text-green-600">
      -{formatCurrency(generalDiscount || 0)}
    </span>
  </div>
)}

<Dialog open={generalDiscountDialogOpen} onOpenChange={setGeneralDiscountDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Aplicar Descuento General</DialogTitle>
      <DialogDescription>
        Este descuento se aplicará sobre el subtotal de la orden
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>Subtotal</Label>
        <p className="text-lg font-semibold">${subtotal.toFixed(2)}</p>
      </div>
      <div>
        <Label>Porcentaje de Descuento (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={generalDiscountPercentage}
          onChange={(e) => setGeneralDiscountPercentage(Number(e.target.value))}
        />
      </div>
      <div>
        <Label>Razón del Descuento</Label>
        <Textarea
          placeholder="Ej: Cliente frecuente, Venta especial..."
          value={generalDiscountReason}
          onChange={(e) => setGeneralDiscountReason(e.target.value)}
        />
      </div>
      <div>
        <Label>Descuento Total</Label>
        <p className="text-2xl font-bold text-green-600">
          -${((subtotal * generalDiscountPercentage) / 100).toFixed(2)}
        </p>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setGeneralDiscountDialogOpen(false)}>
        Cancelar
      </Button>
      <Button onClick={handleApplyGeneralDiscount}>
        Aplicar Descuento
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Casos de Uso

### 1. Descuento Automático por Volumen
1. Admin configura reglas en producto: "10+ unidades = 5%, 50+ = 10%"
2. Cliente agrega 15 unidades al carrito
3. Sistema calcula automáticamente 5% de descuento
4. Se registra en auditoría como descuento automático
5. Factura muestra el descuento aplicado

### 2. Descuento Manual en Item
1. Cajero tiene permiso `apply_discounts`
2. Cliente pide descuento en un producto
3. Cajero hace clic en botón de descuento del item
4. Aplica 10% con razón "Cliente frecuente"
5. Sistema registra: usuario, razón, montos
6. Gerente puede revisar el historial de descuentos

### 3. Descuento General en Orden
1. Cliente compra por $1000
2. Gerente decide dar 15% de descuento general
3. Aplica el descuento con razón "Compra al mayor"
4. Sistema resta $150 del total
5. Se registra en auditoría

### 4. Reportes de Descuentos
1. Gerente entra a reportes
2. Filtra descuentos del último mes
3. Ve: total descontado, por usuario, por razón
4. Identifica patrones o abusos

## Beneficios

1. **Transparencia**: Todos los descuentos quedan registrados
2. **Control**: Permisos para aplicar descuentos
3. **Auditoría**: Historial completo con usuario, razón, montos
4. **Automatización**: Descuentos por volumen automáticos
5. **Flexibilidad**: Descuentos en items o en toda la orden
6. **Reportes**: Análisis de descuentos aplicados

## Próximos Pasos

1. Implementar servicio de descuentos en backend
2. Agregar permiso `apply_discounts` al sistema
3. Modificar servicio de órdenes para calcular descuentos
4. Implementar UI para descuentos en productos
5. Implementar UI para descuentos en órdenes
6. Crear módulo de reportes de descuentos
7. Agregar descuentos a PDFs de facturas
8. Testing completo del flujo
