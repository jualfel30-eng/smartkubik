# Plan de Implementación: Soporte para Productos por Peso en Storefront

## Resumen Ejecutivo

Implementar funcionalidad en el storefront público para permitir que los clientes compren productos vendidos por peso, especificando la cantidad deseada según las unidades de medida configuradas por el tenant (kg, g, lb, etc.).

## Contexto Actual

### Infraestructura Backend (YA EXISTE)
- ✅ `Product.isSoldByWeight: boolean`
- ✅ `Product.sellingUnits: SellingUnit[]` con:
  - `name`: "Kilogramos", "Gramos", etc.
  - `abbreviation`: "kg", "g", "lb"
  - `conversionFactor`: Factor a unidad base
  - `pricePerUnit`: Precio por unidad
  - `minimumQuantity`: Cantidad mínima (ej: 100g)
  - `incrementStep`: Incremento permitido (ej: 100g pasos)
  - `isDefault`: Si es la unidad por defecto
- ✅ `OrderItem` schema acepta `selectedUnit` y `conversionFactor`

### Problema Actual
El storefront frontend NO aprovecha esta infraestructura:
- No muestra unidades de venta disponibles
- Solo permite cantidades enteras (1, 2, 3...)
- No envía `selectedUnit` al crear órdenes

## Archivos Afectados

### Frontend (7 archivos)
1. `/food-inventory-storefront/src/types/index.ts` - Tipos TypeScript
2. `/food-inventory-storefront/src/lib/api.ts` - Transformación de productos
3. `/food-inventory-storefront/src/app/[domain]/productos/[id]/ProductDetailClient.tsx` - Detalle producto
4. `/food-inventory-storefront/src/components/CartSidebar.tsx` - Carrito sidebar
5. `/food-inventory-storefront/src/app/[domain]/checkout/CheckoutPageClient.tsx` - Checkout
6. (Opcional) `/food-inventory-storefront/src/app/[domain]/carrito/page.tsx` - Página carrito completo

### Backend (2 archivos)
1. `/food-inventory-saas/src/modules/orders/orders-public.controller.ts` - DTO público
2. `/food-inventory-saas/src/modules/products/products-public.controller.ts` - Incluir sellingUnits

## Plan de Implementación Detallado

### FASE 1: Backend - Exponer SellingUnits en API Pública

#### 1.1 Actualizar CreatePublicOrderItemDto
**Archivo**: `orders-public.controller.ts` líneas 18-40

**Cambios**:
```typescript
export class CreatePublicOrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.01) // Permitir decimales
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  // AGREGAR ESTOS CAMPOS:
  @IsOptional()
  @IsString()
  selectedUnit?: string; // "kg", "g", "lb"

  @IsOptional()
  @IsNumber()
  conversionFactor?: number; // Factor usado para convertir

  @IsOptional()
  attributes?: Record<string, any>;
}
```

#### 1.2 Verificar Products Public Controller
**Archivo**: `products-public.controller.ts`

**Verificar**: Que el endpoint GET `/api/v1/public/products` y GET `/api/v1/public/products/:id` retornen:
- `isSoldByWeight`
- `sellingUnits` (array completo)
- `hasMultipleSellingUnits`
- `unitOfMeasure`

Si NO los retorna, modificar para incluirlos en la respuesta.

### FASE 2: Frontend - Actualizar Tipos y Transformaciones

#### 2.1 Actualizar Types
**Archivo**: `types/index.ts` líneas 47-59

**Cambios**:
```typescript
// AGREGAR NUEVO TIPO:
export interface SellingUnit {
  name: string;
  abbreviation: string;
  conversionFactor: number;
  pricePerUnit: number;
  costPerUnit: number;
  isActive: boolean;
  isDefault: boolean;
  minimumQuantity?: number;
  incrementStep?: number;
}

// ACTUALIZAR Product:
export interface Product {
  _id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  ingredients?: string;
  isActive: boolean;
  tenantId: string;

  // AGREGAR:
  isSoldByWeight?: boolean;
  hasMultipleSellingUnits?: boolean;
  unitOfMeasure?: string;
  sellingUnits?: SellingUnit[];
}

// ACTUALIZAR CartItem:
export interface CartItem {
  product: Product;
  quantity: number;

  // AGREGAR:
  selectedUnit?: string; // "kg", "g", "lb"
  conversionFactor?: number;
  unitPrice?: number; // Precio de la unidad seleccionada
}

// ACTUALIZAR OrderData items:
export interface OrderData {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    productId: string;
    quantity: number;
    price: number;

    // AGREGAR:
    selectedUnit?: string;
    conversionFactor?: number;
  }[];
  total: number;
  notes?: string;
}
```

#### 2.2 Actualizar transformProduct()
**Archivo**: `lib/api.ts` líneas 23-59

**Cambios**:
```typescript
function transformProduct(product: any): any {
  // ... código existente ...

  return {
    _id: product._id,
    name: product.name,
    // ... resto de campos existentes ...

    // AGREGAR:
    isSoldByWeight: product.isSoldByWeight || false,
    hasMultipleSellingUnits: product.hasMultipleSellingUnits || false,
    unitOfMeasure: product.unitOfMeasure || 'unidad',
    sellingUnits: product.sellingUnits || [],
  };
}
```

### FASE 3: Frontend - Componente ProductDetailClient

#### 3.1 Agregar Estado para Unidades
**Archivo**: `ProductDetailClient.tsx` líneas 25-28

**Cambios**:
```typescript
const [quantity, setQuantity] = useState(1);
const [selectedUnit, setSelectedUnit] = useState<string>(''); // AGREGAR
const [addedToCart, setAddedToCart] = useState(false);
```

#### 3.2 Inicializar Unidad por Defecto
**Agregar useEffect**:
```typescript
useEffect(() => {
  if (product.sellingUnits && product.sellingUnits.length > 0) {
    const defaultUnit = product.sellingUnits.find(u => u.isDefault) || product.sellingUnits[0];
    setSelectedUnit(defaultUnit.abbreviation);
  }
}, [product]);
```

#### 3.3 Selector de Unidades (ANTES de Quantity Selector)
**Insertar ANTES de línea 177**:

```tsx
{/* Unit Selector (solo si tiene sellingUnits) */}
{product.sellingUnits && product.sellingUnits.length > 0 && (
  <div className="mb-6">
    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
      Unidad de Venta
    </label>
    <select
      value={selectedUnit}
      onChange={(e) => {
        setSelectedUnit(e.target.value);
        // Resetear cantidad al cambiar unidad
        const unit = product.sellingUnits?.find(u => u.abbreviation === e.target.value);
        if (unit?.minimumQuantity) {
          setQuantity(unit.minimumQuantity);
        }
      }}
      className={`w-full px-4 py-2 border rounded-lg ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700 text-gray-100'
          : 'bg-white border-gray-300'
      }`}
    >
      {product.sellingUnits.map(unit => (
        <option key={unit.abbreviation} value={unit.abbreviation}>
          {unit.name} ({unit.abbreviation}) - {formatPrice(unit.pricePerUnit)}/{unit.abbreviation}
        </option>
      ))}
    </select>
  </div>
)}
```

#### 3.4 Input de Cantidad (Decimal o Entero)
**Reemplazar líneas 177-199**:

```tsx
{/* Quantity Selector */}
<div className="mb-6">
  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
    Cantidad {selectedUnit && `(${selectedUnit})`}
  </label>

  {/* Si hay unidades de peso, usar input numérico decimal */}
  {product.isSoldByWeight && selectedUnit ? (
    <div className="flex items-center gap-4">
      <input
        type="number"
        value={quantity}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value) && value > 0) {
            setQuantity(value);
          }
        }}
        min={product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.minimumQuantity || 0.01}
        step={product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.incrementStep || 0.01}
        className={`flex-1 px-4 py-2 border rounded-lg text-center ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700 text-gray-100'
            : 'bg-white border-gray-300'
        }`}
      />
      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {selectedUnit}
      </span>
    </div>
  ) : (
    // Input tradicional con +/- para productos sin peso
    <div className="flex items-center space-x-4">
      <button
        onClick={decrementQuantity}
        className={`p-2 border rounded-lg ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
      >
        <Minus className="h-5 w-5" />
      </button>
      <span className={`text-xl font-semibold w-12 text-center ${isDarkMode ? 'text-white' : ''}`}>
        {quantity}
      </span>
      <button
        onClick={incrementQuantity}
        className={`p-2 border rounded-lg ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )}

  {/* Mostrar info de mínimo/incremento si aplica */}
  {selectedUnit && product.sellingUnits && (
    <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      {(() => {
        const unit = product.sellingUnits.find(u => u.abbreviation === selectedUnit);
        if (!unit) return null;
        const parts = [];
        if (unit.minimumQuantity) parts.push(`Mínimo: ${unit.minimumQuantity}${unit.abbreviation}`);
        if (unit.incrementStep) parts.push(`Incremento: ${unit.incrementStep}${unit.abbreviation}`);
        return parts.join(' • ');
      })()}
    </p>
  )}
</div>
```

#### 3.5 Actualizar handleAddToCart
**Reemplazar líneas 50-74**:

```typescript
const handleAddToCart = () => {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  // Clave única: productId + selectedUnit
  const cartKey = `${product._id}-${selectedUnit || 'default'}`;
  const existingIndex = cart.findIndex(
    (item: any) =>
      item.product._id === product._id &&
      (item.selectedUnit || 'default') === (selectedUnit || 'default')
  );

  // Calcular precio unitario basado en la unidad seleccionada
  let unitPrice = product.price;
  let conversionFactor = 1;

  if (selectedUnit && product.sellingUnits) {
    const unit = product.sellingUnits.find(u => u.abbreviation === selectedUnit);
    if (unit) {
      unitPrice = unit.pricePerUnit;
      conversionFactor = unit.conversionFactor;
    }
  }

  const cartItem = {
    product,
    quantity,
    selectedUnit: selectedUnit || undefined,
    conversionFactor: conversionFactor !== 1 ? conversionFactor : undefined,
    unitPrice: unitPrice !== product.price ? unitPrice : undefined,
  };

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push(cartItem);
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cartUpdated'));

  setAddedToCart(true);
  setTimeout(() => {
    setAddedToCart(false);
    openCart();
  }, 500);
};
```

### FASE 4: Frontend - CartSidebar

#### 4.1 Mostrar Unidad en CartItem
**Archivo**: `CartSidebar.tsx` líneas 186-192

**Cambios**:
```tsx
<h3 className={`font-medium text-sm mb-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
  {item.product.name}
</h3>
<p className="text-sm font-semibold text-[var(--primary-color)] mb-2">
  {formatPrice(item.unitPrice || item.product.price)}
  {item.selectedUnit && <span className="text-xs ml-1">/{item.selectedUnit}</span>}
</p>
```

#### 4.2 Actualizar Quantity Display
**Líneas 203-205**:
```tsx
<span className={`text-sm font-medium min-w-[2rem] text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
  {item.quantity}{item.selectedUnit ? ` ${item.selectedUnit}` : ''}
</span>
```

#### 4.3 Actualizar calculateTotal()
**Líneas 102-104**:
```typescript
const calculateTotal = () => {
  return cartItems.reduce((sum, item) => {
    const price = item.unitPrice || item.product.price;
    return sum + price * item.quantity;
  }, 0);
};
```

### FASE 5: Frontend - CheckoutPageClient

#### 5.1 Actualizar calculateTotal()
**Archivo**: `CheckoutPageClient.tsx` líneas 67-69

**Cambios**:
```typescript
const calculateTotal = () => {
  return cartItems.reduce((sum, item) => {
    const price = item.unitPrice || item.product.price;
    return sum + price * item.quantity;
  }, 0);
};
```

#### 5.2 Incluir selectedUnit en OrderData
**Líneas 107-111**:
```typescript
items: cartItems.map((item) => ({
  productId: item.product._id,
  quantity: item.quantity,
  price: item.unitPrice || item.product.price,
  selectedUnit: item.selectedUnit,
  conversionFactor: item.conversionFactor,
})),
```

## Casos Edge y Validaciones

### 1. Productos SIN sellingUnits
- Comportamiento actual se mantiene (cantidad entera)
- No mostrar selector de unidades

### 2. Productos CON sellingUnits
- Mostrar selector de unidades
- Input numérico decimal
- Validar mínimo y paso si están configurados

### 3. Carrito Mixto
- Permitir items con y sin unidades en el mismo carrito
- Cálculo de total correcto según precio unitario

### 4. Compatibilidad hacia Atrás
- Órdenes antiguas sin `selectedUnit` siguen funcionando
- Productos sin `sellingUnits` usan precio base

## Testing

### Casos de Prueba

1. **Producto Simple (sin peso)**
   - Cantidad entera (1, 2, 3...)
   - Precio fijo por unidad

2. **Producto por Peso (1 unidad)**
   - Solo mostrar esa unidad
   - Permitir decimales
   - Validar mínimo si existe

3. **Producto por Peso (múltiples unidades)**
   - Selector de unidades visible
   - Cambiar unidad cambia precio
   - Calcular total correctamente

4. **Carrito Mixto**
   - Producto A: 2 unidades (simple)
   - Producto B: 1.5 kg (peso)
   - Total calculado correctamente

5. **Checkout**
   - Orden creada con `selectedUnit`
   - Backend acepta `selectedUnit`
   - Order guardada correctamente

## Orden de Implementación Recomendado

1. ✅ **Backend primero** (cambios mínimos, no rompe nada)
   - Actualizar DTOs
   - Verificar endpoints retornan sellingUnits

2. ✅ **Frontend Types** (base para todo)
   - Actualizar interfaces
   - Actualizar transformProduct()

3. ✅ **ProductDetailClient** (núcleo de la funcionalidad)
   - Selector de unidades
   - Input decimal
   - handleAddToCart con unidades

4. ✅ **CartSidebar** (visualización)
   - Mostrar unidad
   - Calcular total correctamente

5. ✅ **CheckoutPageClient** (enviar datos)
   - Incluir selectedUnit en orden
   - Total correcto

6. ✅ **Testing** (verificar todo funciona)

## Decisiones de UX

### Selector de Unidades
- Dropdown simple (select) con nombre completo y precio
- Mostrar precio por unidad claramente
- Auto-seleccionar unidad por defecto

### Input de Cantidad
- Si `isSoldByWeight`: input numérico con step decimal
- Si NO: botones +/- tradicionales
- Mostrar unidad al lado del input

### Carrito
- Mostrar unidad junto al precio y cantidad
- Permitir cambiar cantidad sin cambiar unidad
- Para cambiar unidad, volver al producto

### Precio Display
- Siempre mostrar precio por unidad seleccionada
- En carrito: "15.50 /kg" o "3.25 /lb"
- Total calculado automáticamente

## Riesgos y Mitigaciones

### Riesgo 1: Conversiones Incorrectas
**Mitigación**:
- Backend calcula conversión final
- Frontend solo muestra y envía factor
- Validar conversionFactor es coherente

### Riesgo 2: Productos sin sellingUnits configurados
**Mitigación**:
- Siempre verificar existencia de sellingUnits
- Fallback a comportamiento actual
- No romper productos existentes

### Riesgo 3: Carrito con items antiguos
**Mitigación**:
- CartItem.selectedUnit es opcional
- Manejar undefined gracefully
- Migración suave sin limpiar carritos

## Estimación de Esfuerzo

- Backend: 1 hora
- Frontend Types & API: 1 hora
- ProductDetailClient: 3 horas
- CartSidebar: 1 hora
- CheckoutPageClient: 1 hora
- Testing: 2 horas

**Total: ~9 horas**

## Notas Finales

- Toda la infraestructura backend YA EXISTE
- No requiere migraciones de BD
- Cambios son aditivos, no rompen funcionalidad existente
- Compatible hacia atrás con productos sin sellingUnits
