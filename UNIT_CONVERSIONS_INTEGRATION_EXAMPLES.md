# 📐 Ejemplos de Integración - Sistema de Conversión de Unidades

## ✅ Implementación Completada

### Backend (100% funcional)
- ✅ Schema: `unit-conversion.schema.ts`
- ✅ DTOs: `unit-conversion.dto.ts`
- ✅ Service: `unit-conversions.service.ts`
- ✅ Controller: `unit-conversions.controller.ts`
- ✅ Module: `unit-conversions.module.ts`
- ✅ Registrado en AppModule

### Frontend (100% funcional)
- ✅ Hook: `useUnitConversions.js`
- ✅ Dialog: `UnitConversionDialog.jsx`
- ✅ Manager: `UnitConversionManager.jsx`
- ✅ Converter: `UnitConverter.jsx`

---

## 🔌 Ejemplos de Integración

### 1️⃣ Agregar gestión de unidades a la vista de productos

**Opción A: En la vista de detalles de producto**

```jsx
// En ProductDetailsPage.jsx o similar
import { UnitConversionManager } from '../components/UnitConversionManager';
import { UnitConverter } from '../components/UnitConverter';

function ProductDetailsPage() {
  const [product, setProduct] = useState(null);

  return (
    <div className="space-y-6">
      {/* Información básica del producto */}
      <ProductInfoCard product={product} />

      {/* NUEVO: Gestión de unidades */}
      <UnitConversionManager product={product} />

      {/* NUEVO: Convertidor rápido */}
      <UnitConverter product={product} />

      {/* Otras secciones... */}
    </div>
  );
}
```

**Opción B: Como tab adicional en ProductsManagementWithTabs**

```jsx
// En ProductsManagementWithTabs.jsx
import { UnitConversionManager } from './UnitConversionManager';

// Agregar tab
<TabsList>
  <TabsTrigger value="products">Productos</TabsTrigger>
  <TabsTrigger value="consumables">Consumibles</TabsTrigger>
  <TabsTrigger value="supplies">Suministros</TabsTrigger>
  <TabsTrigger value="unit-conversions">Unidades</TabsTrigger>
</TabsList>

// Agregar contenido del tab
<TabsContent value="unit-conversions">
  <UnitConversionsTab />
</TabsContent>
```

### 2️⃣ Integrar convertidor en formularios de compra

```jsx
// En PurchaseForm.jsx
import { useUnitConversions } from '../hooks/useUnitConversions';

function PurchaseForm() {
  const { convertUnit, getConfigByProductId } = useUnitConversions();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [purchaseUnit, setPurchaseUnit] = useState('');

  // Cargar configuración cuando se selecciona producto
  useEffect(() => {
    if (selectedProduct) {
      getConfigByProductId(selectedProduct._id).then(config => {
        if (config) {
          setPurchaseUnit(config.defaultPurchaseUnit || config.baseUnit);
        }
      });
    }
  }, [selectedProduct]);

  // Convertir a unidad base al guardar
  const handleSubmit = async () => {
    const baseQuantity = await convertUnit(
      quantity,
      purchaseUnit,
      config.baseUnit,
      selectedProduct._id
    );

    // Guardar con cantidad en unidad base
    await savePurchase({
      productId: selectedProduct._id,
      quantity: baseQuantity,
      unit: config.baseUnit,
      originalQuantity: quantity,
      originalUnit: purchaseUnit,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Selector de producto */}
      <ProductSelector onChange={setSelectedProduct} />

      {/* Cantidad con selector de unidad */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Cantidad"
        />
        <UnitSelector
          productId={selectedProduct?._id}
          value={purchaseUnit}
          onChange={setPurchaseUnit}
          filterType="purchase"
        />
      </div>

      {/* Mostrar equivalencia */}
      {quantity && purchaseUnit && (
        <p className="text-sm text-muted-foreground">
          = {baseQuantity} {config.baseUnit} (unidad base)
        </p>
      )}
    </form>
  );
}
```

### 3️⃣ Mostrar conversiones en lista de productos

```jsx
// En ProductsList.jsx
import { Badge } from './ui/badge';
import { Calculator } from 'lucide-react';

function ProductRow({ product }) {
  const [hasUnitConfig, setHasUnitConfig] = useState(false);
  const { getConfigByProductId } = useUnitConversions();

  useEffect(() => {
    getConfigByProductId(product._id).then(config => {
      setHasUnitConfig(!!config);
    });
  }, [product._id]);

  return (
    <TableRow>
      <TableCell>{product.name}</TableCell>
      <TableCell>
        {hasUnitConfig && (
          <Badge variant="secondary" className="gap-1">
            <Calculator className="h-3 w-3" />
            Multi-unidad
          </Badge>
        )}
      </TableCell>
      {/* ... */}
    </TableRow>
  );
}
```

### 4️⃣ Crear componente UnitSelector reutilizable

```jsx
// components/UnitSelector.jsx
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useUnitConversions } from '../hooks/useUnitConversions';

export function UnitSelector({
  productId,
  value,
  onChange,
  filterType = null, // 'purchase', 'stock', 'consumption', o null para todas
  className = ''
}) {
  const { getConfigByProductId } = useUnitConversions();
  const [units, setUnits] = useState([]);

  useEffect(() => {
    if (!productId) return;

    getConfigByProductId(productId).then(config => {
      if (!config) return;

      const availableUnits = [
        { value: config.baseUnit, label: `${config.baseUnit} (${config.baseUnitAbbr})` }
      ];

      if (config.conversions) {
        config.conversions
          .filter(c => c.isActive && (!filterType || c.unitType === filterType))
          .forEach(c => {
            availableUnits.push({
              value: c.unit,
              label: `${c.unit} (${c.abbreviation})`
            });
          });
      }

      setUnits(availableUnits);
    });
  }, [productId, filterType]);

  if (units.length === 0) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Seleccionar unidad" />
      </SelectTrigger>
      <SelectContent>
        {units.map(unit => (
          <SelectItem key={unit.value} value={unit.value}>
            {unit.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 5️⃣ Ejemplo de uso en recetas (consumibles)

```jsx
// En RecipeForm.jsx
function RecipeIngredientRow({ ingredient, onChange }) {
  const { convertUnit } = useUnitConversions();
  const [quantity, setQuantity] = useState(ingredient.quantity);
  const [unit, setUnit] = useState(ingredient.unit);
  const [baseQuantity, setBaseQuantity] = useState(null);

  // Convertir a unidad base en tiempo real
  useEffect(() => {
    if (quantity && unit && ingredient.productId) {
      convertUnit(quantity, unit, 'unidad', ingredient.productId)
        .then(setBaseQuantity)
        .catch(() => setBaseQuantity(null));
    }
  }, [quantity, unit]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <Input
        type="number"
        value={quantity}
        onChange={(e) => {
          setQuantity(e.target.value);
          onChange({ ...ingredient, quantity: e.target.value });
        }}
      />
      <UnitSelector
        productId={ingredient.productId}
        value={unit}
        onChange={(newUnit) => {
          setUnit(newUnit);
          onChange({ ...ingredient, unit: newUnit });
        }}
        filterType="consumption"
      />
      <div className="flex items-center text-sm text-muted-foreground">
        {baseQuantity && `≈ ${baseQuantity.toFixed(2)} unidades`}
      </div>
    </div>
  );
}
```

---

## 🎯 Casos de Uso Específicos

### Caso 1: Servilletas en Hamburguesas
```javascript
// Configuración de unidades para servilletas
const servilletasConfig = {
  productSku: "SERV-001",
  productId: "...",
  baseUnit: "unidad",
  baseUnitAbbr: "und",
  conversions: [
    {
      unit: "paquete",
      abbreviation: "paq",
      factor: 50,              // 1 paquete = 50 unidades
      unitType: "stock",
      isActive: true,
      isDefault: true
    },
    {
      unit: "caja",
      abbreviation: "cj",
      factor: 2000,            // 1 caja = 2000 unidades
      unitType: "purchase",
      isActive: true,
      isDefault: true
    }
  ],
  defaultPurchaseUnit: "caja",
  defaultStockUnit: "paquete",
  defaultConsumptionUnit: "unidad"
};

// Al crear receta de hamburguesa
const hamburguesaRecipe = {
  name: "Hamburguesa Clásica",
  ingredients: [
    {
      productId: servilletasId,
      quantity: 3,
      unit: "unidad"  // Se consume 3 servilletas por hamburguesa
    }
  ]
};

// Al hacer compra
const purchase = {
  productId: servilletasId,
  quantity: 5,
  unit: "caja"  // Compro 5 cajas = 10,000 unidades
};

// El sistema convierte automáticamente
await convertUnit(5, "caja", "unidad", servilletasId);
// Resultado: 10000 unidades
```

### Caso 2: Bebidas
```javascript
// Configuración para Coca-Cola
const cocaColaConfig = {
  productSku: "BEB-001",
  baseUnit: "ml",
  baseUnitAbbr: "ml",
  conversions: [
    {
      unit: "litro",
      abbreviation: "L",
      factor: 1000,
      unitType: "stock",
    },
    {
      unit: "galón",
      abbreviation: "gal",
      factor: 3785.41,
      unitType: "purchase",
    },
    {
      unit: "vaso",
      abbreviation: "vs",
      factor: 400,  // Vaso de 400ml
      unitType: "consumption",
    }
  ],
  defaultPurchaseUnit: "galón",
  defaultStockUnit: "litro",
  defaultConsumptionUnit: "vaso"
};
```

---

## 🔄 Flujo Completo: De Compra a Consumo

```javascript
// 1. COMPRA: Comprar en unidad grande
async function createPurchase() {
  const purchaseData = {
    productId: "...",
    quantity: 10,
    unit: "caja",
    unitPrice: 50  // $50 por caja
  };

  // Convertir a unidad base para inventario
  const baseQuantity = await convertUnit(
    purchaseData.quantity,
    purchaseData.unit,
    config.baseUnit,
    productId
  );

  // Guardar en inventario con unidad base
  await updateInventory({
    productId,
    quantity: baseQuantity,  // 20,000 unidades
    unit: config.baseUnit    // "unidad"
  });

  // Guardar compra con datos originales
  await savePurchase({
    ...purchaseData,
    baseQuantity,
    totalPrice: purchaseData.quantity * purchaseData.unitPrice
  });
}

// 2. RECETA: Definir consumo en unidad pequeña
const recipe = {
  productId: "...",
  quantity: 3,
  unit: "unidad"  // 3 servilletas por hamburguesa
};

// 3. VENTA: Al vender 50 hamburguesas
async function processSale(quantity) {
  // Calcular consumo
  const consumedUnits = recipe.quantity * quantity;  // 3 * 50 = 150 unidades

  // Descontar del inventario
  await updateInventory({
    productId,
    quantity: -consumedUnits,
    unit: config.baseUnit
  });

  // Verificar si es necesario reabastecer
  const currentStock = await getInventory(productId);
  const minimumStock = 1000;  // 1000 unidades

  if (currentStock < minimumStock) {
    // Convertir a unidad de compra para orden
    const cajasNeeded = await convertUnit(
      minimumStock - currentStock,
      config.baseUnit,
      config.defaultPurchaseUnit,
      productId
    );

    await createPurchaseOrder({
      productId,
      quantity: Math.ceil(cajasNeeded),
      unit: config.defaultPurchaseUnit
    });
  }
}
```

---

## 📊 API Endpoints Disponibles

```javascript
// Crear configuración
POST /api/v1/unit-conversions
Body: {
  productSku: "SERV-001",
  productId: "507f1f77bcf86cd799439011",
  baseUnit: "unidad",
  baseUnitAbbr: "und",
  conversions: [...]
}

// Listar configuraciones
GET /api/v1/unit-conversions?page=1&limit=20&productId=...

// Obtener por producto
GET /api/v1/unit-conversions/by-product/:productId

// Convertir unidades
POST /api/v1/unit-conversions/convert
Body: {
  value: 1,
  fromUnit: "caja",
  toUnit: "unidad",
  productId: "507f1f77bcf86cd799439011"
}
Response: {
  success: true,
  data: {
    originalValue: 1,
    originalUnit: "caja",
    convertedValue: 2000,
    convertedUnit: "unidad"
  }
}

// Actualizar configuración
PATCH /api/v1/unit-conversions/:id

// Eliminar configuración
DELETE /api/v1/unit-conversions/:id
```

---

## ✅ Checklist de Integración

### Para integrar en tu proyecto:

- [ ] 1. Importar hook `useUnitConversions` donde sea necesario
- [ ] 2. Agregar `UnitConversionManager` en vista de productos
- [ ] 3. Agregar `UnitConverter` para conversiones rápidas
- [ ] 4. Crear `UnitSelector` component para formularios
- [ ] 5. Actualizar formularios de compra para usar conversiones
- [ ] 6. Actualizar formularios de recetas para usar conversiones
- [ ] 7. Modificar cálculos de inventario para trabajar con unidad base
- [ ] 8. Agregar indicadores visuales (badges) en listas
- [ ] 9. Actualizar reportes para mostrar conversiones
- [ ] 10. Probar flujo completo: Compra → Almacenamiento → Consumo

---

## 🚀 Próximos Pasos Sugeridos

1. **Migración de Datos**: Crear script para configurar unidades en productos existentes
2. **Validaciones**: Agregar validaciones para evitar conversiones inválidas
3. **Reportes**: Crear reportes que muestren consumo en diferentes unidades
4. **Optimización**: Cachear configuraciones de unidades frecuentemente usadas
5. **UX Mejorada**: Agregar tooltips explicativos sobre conversiones
6. **Bulk Operations**: Permitir configurar unidades para múltiples productos

---

## 💡 Tips de Implementación

1. **Siempre trabaja con la unidad base en la BD**: Guarda cantidades en unidad base, muestra en UI con unidades convenientes
2. **Usa conversiones en tiempo real**: Muestra equivalencias mientras el usuario escribe
3. **Valida antes de guardar**: Asegúrate que las unidades existan en la configuración
4. **Maneja errores gracefully**: Si no hay config de unidades, usa unidad simple
5. **Performance**: Carga configs de unidades una sola vez y cachea en memoria

---

**✨ Sistema de Conversión de Unidades completamente funcional y listo para usar!**
