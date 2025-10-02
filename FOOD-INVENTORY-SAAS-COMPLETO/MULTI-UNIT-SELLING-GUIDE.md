# Guía: Sistema de Múltiples Unidades de Venta

## Descripción General

Este sistema permite que un mismo producto se venda en diferentes unidades de medida, manteniendo un solo inventario en la unidad base.

## Casos de Uso

### Ejemplo 1: Queso Blanco
```
Producto: Queso Blanco
Unidad Base: gramos (para inventario)
Stock actual: 50,000 g

Unidades de venta configuradas:
1. Gramos (100g, 200g, 500g) - Precio: $2.00 por 100g
2. Kilogramos (1kg = 1000g) - Precio: $18.00 por kg
3. Libras (1lb = 453.592g) - Precio: $9.00 por lb

Cuando vendes:
- "2 kg" → Descuenta 2000g del inventario, cobra $36.00
- "500 g" → Descuenta 500g del inventario, cobra $10.00
- "1 lb" → Descuenta 453.592g del inventario, cobra $9.00
```

### Ejemplo 2: Refresco Pepsi
```
Producto: Pepsi 355ml
Unidad Base: unidades (para inventario)
Stock actual: 500 unidades

Unidades de venta configuradas:
1. Unidad (1 und = 1) - Precio: $1.50 por unidad
2. Six-Pack (1 pack = 6 unidades) - Precio: $8.00 por pack
3. Caja (1 caja = 24 unidades) - Precio: $30.00 por caja

Cuando vendes:
- "1 caja" → Descuenta 24 unidades, cobra $30.00
- "3 unidades" → Descuenta 3 unidades, cobra $4.50
- "2 six-packs" → Descuenta 12 unidades, cobra $16.00
```

### Ejemplo 3: Harina de Trigo
```
Producto: Harina de Trigo
Unidad Base: kilogramos (para inventario)
Stock actual: 1000 kg

Unidades de venta configuradas:
1. Kilogramos (mínimo 1kg) - Precio: $3.00 por kg
2. Saco 25kg (1 saco = 25 kg) - Precio: $70.00 por saco
3. Saco 50kg (1 saco = 50 kg) - Precio: $135.00 por saco

Cuando vendes:
- "2 sacos de 50kg" → Descuenta 100kg, cobra $270.00
- "5 kg" → Descuenta 5kg, cobra $15.00
- "1 saco de 25kg" → Descuenta 25kg, cobra $70.00
```

## Schema del Producto

### SellingUnit
```typescript
{
  name: "Kilogramos",              // Nombre descriptivo
  abbreviation: "kg",              // Abreviación para mostrar
  conversionFactor: 1000,          // 1 kg = 1000 gramos (unidad base)
  pricePerUnit: 18.00,             // Precio por kilogramo
  costPerUnit: 10.00,              // Costo por kilogramo
  isActive: true,                  // Unidad disponible para venta
  isDefault: true,                 // Unidad por defecto al vender
  minimumQuantity: 0.1,            // Mínimo 100 gramos
  incrementStep: 0.1               // Incrementos de 100g
}
```

### Campos en Product
```typescript
{
  sku: "QUESO-BLANCO-001",
  name: "Queso Blanco Artesanal",
  unitOfMeasure: "gramos",         // Unidad base para inventario
  hasMultipleSellingUnits: true,   // Activar sistema multi-unidad
  sellingUnits: [
    {
      name: "Gramos",
      abbreviation: "g",
      conversionFactor: 1,           // 1g = 1g (unidad base)
      pricePerUnit: 0.02,            // $0.02 por gramo
      costPerUnit: 0.012,
      isActive: true,
      isDefault: false,
      minimumQuantity: 100,          // Mínimo 100g
      incrementStep: 50              // De 50 en 50 gramos
    },
    {
      name: "Kilogramos",
      abbreviation: "kg",
      conversionFactor: 1000,        // 1kg = 1000g
      pricePerUnit: 18.00,           // $18 por kg
      costPerUnit: 11.00,
      isActive: true,
      isDefault: true,               // Esta es la unidad por defecto
      minimumQuantity: 0.5,          // Mínimo 500g
      incrementStep: 0.5             // De 500g en 500g
    },
    {
      name: "Libras",
      abbreviation: "lb",
      conversionFactor: 453.592,     // 1lb = 453.592g
      pricePerUnit: 9.00,
      costPerUnit: 5.50,
      isActive: true,
      isDefault: false
    }
  ]
}
```

## Flujo de Venta

### 1. Usuario selecciona producto
```javascript
// Frontend muestra las unidades disponibles
const product = {
  name: "Queso Blanco",
  sellingUnits: [
    { abbreviation: "g", name: "Gramos", pricePerUnit: 0.02 },
    { abbreviation: "kg", name: "Kilogramos", pricePerUnit: 18.00, isDefault: true },
    { abbreviation: "lb", name: "Libras", pricePerUnit: 9.00 }
  ]
}
```

### 2. Usuario elige unidad y cantidad
```javascript
// Usuario selecciona: 2.5 kg
const orderItem = {
  productId: "...",
  quantity: 2.5,
  selectedUnit: "kg",
  conversionFactor: 1000  // Se calcula automáticamente
}

// Cálculos:
// - Cantidad en unidad base: 2.5 * 1000 = 2500 gramos
// - Precio total: 2.5 * $18.00 = $45.00
```

### 3. Backend procesa la orden

```typescript
// orders.service.ts
async createOrder(createOrderDto: CreateOrderDto, user: any) {
  for (const item of createOrderDto.items) {
    const product = await this.productsService.findOne(item.productId);

    let unitPrice: number;
    let conversionFactor = 1;
    let quantityInBaseUnit = item.quantity;

    // Si tiene múltiples unidades y se seleccionó una
    if (product.hasMultipleSellingUnits && item.selectedUnit) {
      const sellingUnit = product.sellingUnits.find(
        u => u.abbreviation === item.selectedUnit && u.isActive
      );

      if (!sellingUnit) {
        throw new Error('Unidad de venta no válida');
      }

      // Validar cantidad mínima
      if (sellingUnit.minimumQuantity && item.quantity < sellingUnit.minimumQuantity) {
        throw new Error(`Cantidad mínima: ${sellingUnit.minimumQuantity} ${sellingUnit.abbreviation}`);
      }

      // Usar precio de la unidad seleccionada
      unitPrice = sellingUnit.pricePerUnit;
      conversionFactor = sellingUnit.conversionFactor;

      // Convertir a unidad base para descuento de inventario
      quantityInBaseUnit = item.quantity * conversionFactor;

    } else {
      // Usar precio de la variante o producto base
      unitPrice = variant?.basePrice || product.variants[0]?.basePrice;
    }

    // Descontar del inventario usando quantityInBaseUnit
    await this.inventoryService.reserveStock(
      product._id,
      quantityInBaseUnit,  // En unidad base (gramos)
      order._id
    );

    // Guardar en OrderItem
    orderItems.push({
      productId: product._id,
      productSku: product.sku,
      productName: product.name,
      quantity: item.quantity,              // 2.5
      selectedUnit: item.selectedUnit,      // "kg"
      conversionFactor: conversionFactor,   // 1000
      quantityInBaseUnit: quantityInBaseUnit, // 2500 (gramos)
      unitPrice: unitPrice,                 // 18.00
      totalPrice: item.quantity * unitPrice, // 45.00
      // ... otros campos
    });
  }
}
```

### 4. Descuento de Inventario

```typescript
// inventory.service.ts
async reserveStock(productId: string, quantity: number, orderId: string) {
  // quantity ya viene convertida a unidad base
  // Para "2.5 kg" → quantity = 2500 (gramos)

  const inventory = await this.inventoryModel.findOne({
    productId,
    tenantId: user.tenantId
  });

  if (inventory.currentStock < quantity) {
    throw new Error('Stock insuficiente');
  }

  inventory.currentStock -= quantity;
  inventory.reservedStock += quantity;
  await inventory.save();
}
```

## Frontend: UI para Configurar Unidades

```jsx
// ProductForm.jsx - Sección de unidades de venta
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={hasMultipleSellingUnits}
      onChange={(e) => setHasMultipleSellingUnits(e.target.checked)}
    />
    <label>Este producto se vende en múltiples unidades</label>
  </div>

  {hasMultipleSellingUnits && (
    <>
      <div className="mb-2">
        <label>Unidad Base (para inventario)</label>
        <select value={unitOfMeasure} onChange={...}>
          <option value="gramos">Gramos (g)</option>
          <option value="kilogramos">Kilogramos (kg)</option>
          <option value="unidades">Unidades</option>
          <option value="litros">Litros (L)</option>
        </select>
      </div>

      <div className="border rounded p-4">
        <h3>Unidades de Venta</h3>
        {sellingUnits.map((unit, index) => (
          <div key={index} className="grid grid-cols-6 gap-2 mb-2">
            <input
              placeholder="Nombre (ej: Kilogramos)"
              value={unit.name}
              onChange={...}
            />
            <input
              placeholder="Abrev. (ej: kg)"
              value={unit.abbreviation}
              onChange={...}
            />
            <input
              type="number"
              placeholder="Factor de conversión"
              value={unit.conversionFactor}
              onChange={...}
              title="Ej: 1 kg = 1000 gramos"
            />
            <input
              type="number"
              placeholder="Precio"
              value={unit.pricePerUnit}
              onChange={...}
            />
            <input
              type="checkbox"
              checked={unit.isDefault}
              onChange={...}
              title="Unidad por defecto"
            />
            <button onClick={() => removeUnit(index)}>Eliminar</button>
          </div>
        ))}
        <button onClick={addUnit}>+ Agregar Unidad</button>
      </div>
    </>
  )}
</div>
```

## Frontend: Selector de Unidad en Orden

```jsx
// NewOrderForm.jsx - Al agregar producto
<div className="product-item">
  <label>Producto: {product.name}</label>

  {product.hasMultipleSellingUnits ? (
    <>
      <div>
        <label>Unidad</label>
        <select
          value={selectedUnit}
          onChange={(e) => {
            const unit = product.sellingUnits.find(u => u.abbreviation === e.target.value);
            setSelectedUnit(e.target.value);
            setUnitPrice(unit.pricePerUnit);
            setConversionFactor(unit.conversionFactor);
          }}
        >
          {product.sellingUnits
            .filter(u => u.isActive)
            .map(unit => (
              <option key={unit.abbreviation} value={unit.abbreviation}>
                {unit.name} ({unit.abbreviation}) - ${unit.pricePerUnit.toFixed(2)}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label>Cantidad ({selectedUnit})</label>
        <input
          type="number"
          step={currentUnit?.incrementStep || 1}
          min={currentUnit?.minimumQuantity || 0.01}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="text-sm text-gray-500">
        Equivale a: {(quantity * conversionFactor).toFixed(2)} {product.unitOfMeasure}
      </div>
    </>
  ) : (
    <div>
      <label>Cantidad</label>
      <input type="number" value={quantity} onChange={...} />
    </div>
  )}

  <div className="font-bold">
    Subtotal: ${(quantity * unitPrice).toFixed(2)}
  </div>
</div>
```

## Conversiones Comunes

### Peso
```javascript
const weightUnits = [
  { name: "Gramos", abbr: "g", factor: 1 },
  { name: "Kilogramos", abbr: "kg", factor: 1000 },
  { name: "Libras", abbr: "lb", factor: 453.592 },
  { name: "Onzas", abbr: "oz", factor: 28.3495 },
  { name: "Toneladas", abbr: "t", factor: 1000000 }
];
```

### Volumen
```javascript
const volumeUnits = [
  { name: "Mililitros", abbr: "ml", factor: 1 },
  { name: "Litros", abbr: "L", factor: 1000 },
  { name: "Galones", abbr: "gal", factor: 3785.41 },
  { name: "Onzas fluidas", abbr: "fl oz", factor: 29.5735 }
];
```

### Cantidad
```javascript
const quantityUnits = [
  { name: "Unidades", abbr: "und", factor: 1 },
  { name: "Docena", abbr: "doz", factor: 12 },
  { name: "Caja (24)", abbr: "caja", factor: 24 },
  { name: "Paquete (6)", abbr: "pack", factor: 6 }
];
```

## Mejores Prácticas

### 1. Naming de Unidades
- Usar nombres descriptivos: "Kilogramos" no "kg" en el campo name
- Abreviaturas estándar: "kg", "lb", "g"
- Consistencia en todo el sistema

### 2. Precios
- Siempre calcular precios basados en la unidad de venta
- No usar "precio por gramo" si normalmente vendes por kg
- Considerar descuentos por volumen (1 kg más barato que comprar 1000g)

### 3. Inventario
- SIEMPRE usar la unidad base para stock
- Nunca mezclar unidades en el inventario
- Convertir TODO a la unidad base antes de guardar

### 4. Validaciones
- Respetar `minimumQuantity` y `incrementStep`
- Validar que la unidad seleccionada esté activa
- Verificar stock en unidad base

### 5. UX
- Mostrar unidad por defecto primero
- Indicar equivalencias claramente
- Permitir cambio de unidad sin perder el carrito

## Migración de Productos Existentes

Los productos existentes sin `hasMultipleSellingUnits` seguirán funcionando normalmente. Para migrarlos:

```javascript
// Script de migración opcional
async function migrateProduct(productId) {
  const product = await Product.findById(productId);

  // Ejemplo: Queso que se vendía por kg
  product.unitOfMeasure = "gramos"; // Cambiar a unidad base
  product.hasMultipleSellingUnits = true;
  product.sellingUnits = [
    {
      name: "Gramos",
      abbreviation: "g",
      conversionFactor: 1,
      pricePerUnit: product.variants[0].basePrice / 1000, // Convertir precio de kg a g
      costPerUnit: product.variants[0].costPrice / 1000,
      isActive: true,
      isDefault: false,
      minimumQuantity: 100
    },
    {
      name: "Kilogramos",
      abbreviation: "kg",
      conversionFactor: 1000,
      pricePerUnit: product.variants[0].basePrice,
      costPerUnit: product.variants[0].costPrice,
      isActive: true,
      isDefault: true
    }
  ];

  await product.save();
}
```

## Reportes y Análisis

Al generar reportes de ventas, considera:

```javascript
// Siempre mostrar unidad vendida
order.items.forEach(item => {
  console.log(`
    Producto: ${item.productName}
    Cantidad vendida: ${item.quantity} ${item.selectedUnit || 'und'}
    Cantidad en inventario: ${item.quantityInBaseUnit} ${product.unitOfMeasure}
    Precio unitario: $${item.unitPrice}
    Total: $${item.totalPrice}
  `);
});

// Para análisis, usar siempre unidad base
const totalSold = items.reduce((sum, item) => sum + item.quantityInBaseUnit, 0);
console.log(`Total vendido: ${totalSold} ${product.unitOfMeasure}`);
```

## Troubleshooting

### Problema: Stock negativo
**Causa:** Conversión incorrecta o no se usó `quantityInBaseUnit`
**Solución:** Siempre descontar usando `quantityInBaseUnit`

### Problema: Precios incorrectos
**Causa:** Usando precio de unidad base en lugar de unidad seleccionada
**Solución:** Usar `sellingUnit.pricePerUnit` cuando `selectedUnit` esté presente

### Problema: No se muestran las unidades
**Causa:** `hasMultipleSellingUnits` es `false` o `sellingUnits` está vacío
**Solución:** Verificar que el producto tenga el flag activado y al menos una unidad activa
