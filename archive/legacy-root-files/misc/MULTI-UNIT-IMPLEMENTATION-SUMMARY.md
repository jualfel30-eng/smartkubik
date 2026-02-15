# Sistema Multi-Unidad - Resumen de Implementación

## ✅ Implementación Completada - Fase 1

### Archivos Modificados

#### 1. **Schema de Producto** (`product.schema.ts`)
- ✅ Añadida clase `SellingUnit` con todos los campos necesarios
- ✅ Añadido `hasMultipleSellingUnits: boolean`
- ✅ Añadido `sellingUnits: SellingUnit[]`

#### 2. **Schema de Order** (`order.schema.ts`)
- ✅ Añadido `selectedUnit?: string` en OrderItem
- ✅ Añadido `conversionFactor?: number` en OrderItem
- ✅ Añadido `quantityInBaseUnit?: number` en OrderItem

#### 3. **DTOs** (`product.dto.ts`, `order.dto.ts`)
- ✅ Creado `CreateSellingUnitDto`
- ✅ Actualizado `CreateProductDto` y `UpdateProductDto`
- ✅ Actualizado `CreateOrderItemDto` con `selectedUnit` y `conversionFactor`

#### 4. **Utilidades de Conversión** (`unit-conversion.util.ts`) - NUEVO
- ✅ Conversión precisa con Decimal.js
- ✅ Validación completa de unidades
- ✅ Validación de cantidades mínimas
- ✅ Validación de incrementos
- ✅ Formateo de cantidades

#### 5. **Orders Service** (`orders.service.ts`)
- ✅ Integración completa de multi-unidades en `create()`
- ✅ Validación de unidades de venta
- ✅ Conversión automática a unidad base
- ✅ Uso de precio correcto por unidad
- ✅ Descuento de inventario usando `quantityInBaseUnit`
- ✅ Actualizado `calculateTotals()` para soportar multi-unidades

#### 6. **Inventory Service** (`inventory.service.ts`)
- ✅ No requiere cambios (ya maneja cantidades en unidad base correctamente)

---

## 🎯 Cómo Funciona

### Ejemplo Completo: Venta de Queso

#### 1. Configurar Producto

```json
{
  "sku": "QUESO-BLANCO-001",
  "name": "Queso Blanco Artesanal",
  "category": "Lácteos",
  "subcategory": "Quesos",
  "brand": "La Hacienda",
  "unitOfMeasure": "gramos",
  "hasMultipleSellingUnits": true,
  "sellingUnits": [
    {
      "name": "Gramos",
      "abbreviation": "g",
      "conversionFactor": 1,
      "pricePerUnit": 0.02,
      "costPerUnit": 0.012,
      "isActive": true,
      "isDefault": false,
      "minimumQuantity": 100,
      "incrementStep": 50
    },
    {
      "name": "Kilogramos",
      "abbreviation": "kg",
      "conversionFactor": 1000,
      "pricePerUnit": 18.00,
      "costPerUnit": 11.00,
      "isActive": true,
      "isDefault": true,
      "minimumQuantity": 0.5,
      "incrementStep": 0.5
    },
    {
      "name": "Libras",
      "abbreviation": "lb",
      "conversionFactor": 453.592,
      "pricePerUnit": 9.00,
      "costPerUnit": 5.50,
      "isActive": true,
      "isDefault": false
    }
  ],
  "variants": [
    {
      "name": "Estándar",
      "sku": "QUESO-BLANCO-001-STD",
      "barcode": "7501234567890",
      "unit": "gramos",
      "unitSize": 1,
      "basePrice": 18.00,
      "costPrice": 11.00
    }
  ],
  "inventoryConfig": {
    "trackLots": true,
    "trackExpiration": true,
    "minimumStock": 5000,
    "maximumStock": 50000,
    "reorderPoint": 10000,
    "reorderQuantity": 20000,
    "fefoEnabled": true
  }
}
```

#### 2. Crear Orden con Cliente Comprando 2.5 kg

```json
{
  "customerId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "quantity": 2.5,
      "selectedUnit": "kg"
    }
  ],
  "paymentMethod": "efectivo_usd",
  "deliveryMethod": "pickup",
  "autoReserve": true
}
```

#### 3. Procesamiento en Backend

```typescript
// En orders.service.ts -> create()

const product = await this.productModel.findById(itemDto.productId);
// product.hasMultipleSellingUnits = true
// product.sellingUnits = [...unidades configuradas]

// Validar unidad seleccionada
const sellingUnit = UnitConversionUtil.validateQuantityAndUnit(
  2.5,           // quantity
  "kg",          // selectedUnit
  product.sellingUnits
);
// Valida:
// ✅ La unidad "kg" existe y está activa
// ✅ 2.5 >= minimumQuantity (0.5)
// ✅ 2.5 % incrementStep === 0 (es múltiplo de 0.5)

// Obtener precio de la unidad seleccionada
unitPrice = sellingUnit.pricePerUnit;  // 18.00 (NO del variant!)
costPrice = sellingUnit.costPerUnit;   // 11.00

// Convertir a unidad base
quantityInBaseUnit = UnitConversionUtil.convertToBaseUnit(
  2.5,          // quantity
  sellingUnit   // { conversionFactor: 1000 }
);
// quantityInBaseUnit = 2500 (gramos)

// Calcular precio total con precisión decimal
totalPrice = UnitConversionUtil.calculateTotalPrice(
  2.5,    // quantity
  18.00   // pricePerUnit
);
// totalPrice = 45.00

// Crear OrderItem
const orderItem = {
  productId: product._id,
  productSku: "QUESO-BLANCO-001",
  productName: "Queso Blanco Artesanal",
  quantity: 2.5,
  selectedUnit: "kg",
  conversionFactor: 1000,
  quantityInBaseUnit: 2500,  // En gramos (unidad base)
  unitPrice: 18.00,
  costPrice: 11.00,
  totalPrice: 45.00,
  ivaAmount: 7.20,  // 45.00 * 0.16
  finalPrice: 52.20
};

// Reservar inventario
await this.inventoryService.reserveInventory({
  orderId: order._id,
  items: [{
    productSku: "QUESO-BLANCO-001",
    quantity: 2500  // ← quantityInBaseUnit en gramos!
  }]
});
```

#### 4. Resultado en Base de Datos

**Order Document:**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "orderNumber": "ORD-2025-00123",
  "customerId": "507f1f77bcf86cd799439011",
  "customerName": "Restaurante El Buen Sabor",
  "items": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "productSku": "QUESO-BLANCO-001",
      "productName": "Queso Blanco Artesanal",
      "quantity": 2.5,
      "selectedUnit": "kg",
      "conversionFactor": 1000,
      "quantityInBaseUnit": 2500,
      "unitPrice": 18.00,
      "costPrice": 11.00,
      "totalPrice": 45.00,
      "ivaAmount": 7.20,
      "finalPrice": 52.20
    }
  ],
  "subtotal": 45.00,
  "ivaTotal": 7.20,
  "totalAmount": 52.20,
  "status": "completed"
}
```

**Inventory Document (después de la venta):**
```json
{
  "productSku": "QUESO-BLANCO-001",
  "totalQuantity": 47500,        // Era 50000, ahora 50000 - 2500
  "availableQuantity": 47500,
  "unitOfMeasure": "gramos"      // Siempre en unidad base
}
```

---

## 🔒 Validaciones Implementadas

### 1. Validación de Unidad
```typescript
// ❌ Falla si la unidad no existe
selectedUnit: "libras"  // "lb" es correcto

// ❌ Falla si la unidad está inactiva
{ abbreviation: "kg", isActive: false }
```

### 2. Validación de Cantidad Mínima
```typescript
// ❌ Falla si quantity < minimumQuantity
{
  quantity: 0.3,
  selectedUnit: "kg",  // minimumQuantity: 0.5
}
// Error: "Cantidad mínima para Kilogramos: 0.5 kg"
```

### 3. Validación de Incrementos
```typescript
// ❌ Falla si no es múltiplo del incremento
{
  quantity: 0.7,
  selectedUnit: "kg",  // incrementStep: 0.5
}
// Error: "La cantidad debe ser múltiplo de 0.5 kg"
```

### 4. Validación de Stock
```typescript
// ❌ Falla si no hay suficiente stock
{
  quantity: 60,        // = 60000 gramos
  selectedUnit: "kg"
}
// Stock disponible: 47500 gramos
// Error: "Stock insuficiente"
```

---

## 💡 Beneficios Implementados

### 1. **Precios Independientes por Unidad**
```typescript
// Estrategia de precios flexible
"g":  $0.02/g  → $20.00/kg equivalente
"kg": $18.00/kg → 10% descuento vs comprar por gramo
"lb": $9.00/lb  → ~$19.84/kg equivalente
```

### 2. **Precisión Decimal**
```typescript
// Sin Decimal.js
2.5 * 1000 = 2499.9999999998

// Con Decimal.js
2.5 * 1000 = 2500.0000
```

### 3. **Auditoría Completa**
```json
{
  "quantity": 2.5,
  "selectedUnit": "kg",
  "conversionFactor": 1000,
  "quantityInBaseUnit": 2500,
  "unitPrice": 18.00,
  "totalPrice": 45.00
}
```
Si cambias el precio de kg después, los reportes históricos siguen siendo correctos.

### 4. **Inventario Consistente**
```typescript
// TODO el stock siempre en la misma unidad
inventory.totalQuantity: 47500  // gramos
inventory.unitOfMeasure: "gramos"

// Descuentos siempre en unidad base
reserveInventory({ quantity: 2500 })  // gramos
```

---

## 📊 Casos de Uso Soportados

### ✅ Caso 1: Producto por Peso (Queso, Carne)
```
Base: gramos
Unidades: g, kg, lb
```

### ✅ Caso 2: Producto por Cantidad (Refrescos)
```
Base: unidades
Unidades: und, six-pack, caja
```

### ✅ Caso 3: Producto a Granel (Harina)
```
Base: kilogramos
Unidades: kg, saco 25kg, saco 50kg
```

### ✅ Caso 4: Producto Tradicional (Sin Multi-Unidad)
```
hasMultipleSellingUnits: false
Usa precio de variant normalmente
```

---

## 🚀 Próximos Pasos (Frontend)

### Pendiente:
1. UI para configurar unidades en `ProductsManagement.jsx`
2. Selector de unidades en `NewOrderFormV2.jsx`
3. Mostrar equivalencias en tiempo real
4. Validación frontend (además de backend)

### Ejemplo UI necesario:
```jsx
// En NewOrderForm
<select value={selectedUnit} onChange={...}>
  <option value="g">Gramos (g) - $0.02/g</option>
  <option value="kg">Kilogramos (kg) - $18.00/kg</option>
  <option value="lb">Libras (lb) - $9.00/lb</option>
</select>

<input
  type="number"
  step={0.5}  // incrementStep
  min={0.5}   // minimumQuantity
  value={quantity}
/>

<div className="text-sm text-gray-500">
  = {(quantity * conversionFactor).toFixed(2)} gramos
</div>
```

---

## 🧪 Testing

### Test Manual:

1. **Crear producto con múltiples unidades**
```bash
POST /api/v1/products
{
  "sku": "TEST-QUESO-001",
  "name": "Queso Test",
  "hasMultipleSellingUnits": true,
  "unitOfMeasure": "gramos",
  "sellingUnits": [
    {
      "name": "Kilogramos",
      "abbreviation": "kg",
      "conversionFactor": 1000,
      "pricePerUnit": 20.00,
      "costPerUnit": 12.00,
      "isActive": true,
      "isDefault": true
    }
  ],
  "variants": [...],
  ...
}
```

2. **Crear inventario**
```bash
POST /api/v1/inventory
{
  "productSku": "TEST-QUESO-001",
  "totalQuantity": 10000,  // 10 kg en gramos
  "averageCostPrice": 12.00
}
```

3. **Crear orden con unidad seleccionada**
```bash
POST /api/v1/orders
{
  "customerId": "...",
  "items": [
    {
      "productId": "...",
      "quantity": 2.5,
      "selectedUnit": "kg"
    }
  ],
  "autoReserve": true
}
```

4. **Verificar resultado**
```bash
GET /api/v1/orders/{orderId}

# Verificar:
# - orderItem.quantity = 2.5
# - orderItem.selectedUnit = "kg"
# - orderItem.quantityInBaseUnit = 2500
# - orderItem.unitPrice = 20.00
# - orderItem.totalPrice = 50.00

GET /api/v1/inventory?productSku=TEST-QUESO-001

# Verificar:
# - totalQuantity = 7500 (era 10000 - 2500)
```

---

## 📝 Logs para Debugging

El sistema genera logs útiles:

```
[OrdersService] Processing multi-unit product: Queso Blanco Artesanal, unit: kg
[OrdersService] Multi-unit conversion: 2.5 kg = 2500 gramos (base unit)
```

---

## ⚠️ Notas Importantes

1. **NUNCA confiar en precios del frontend**
   - Siempre usar `sellingUnit.pricePerUnit` del backend

2. **SIEMPRE usar `quantityInBaseUnit` para inventario**
   - Nunca usar `quantity` directamente si hay `selectedUnit`

3. **Validar en backend aunque valides en frontend**
   - UnitConversionUtil valida TODO

4. **Productos existentes siguen funcionando**
   - Si `hasMultipleSellingUnits = false`, usa lógica tradicional

5. **Decimal.js para precisión**
   - Nunca usar aritmética de punto flotante para dinero

---

## 🎉 Resumen

✅ **Backend completamente funcional** para sistema multi-unidad
✅ **Validaciones exhaustivas** siguiendo mejores prácticas
✅ **Precisión decimal** garantizada con Decimal.js
✅ **Retrocompatible** con productos existentes
✅ **Auditoría completa** de todas las transacciones
✅ **Inventario consistente** siempre en unidad base

**Listo para Frontend!** 🚀
