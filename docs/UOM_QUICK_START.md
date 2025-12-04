# Sistema Global UoM - Guía Rápida de Inicio

## 🚀 Quick Start (5 minutos)

### 1. Ejecutar Seed de UnitTypes

```bash
cd food-inventory-saas
npm run seed
```

Esto creará 7 tipos de unidades predefinidos:
- Peso (kg, g, mg, ton, lb, oz)
- Volumen (L, ml, cl, gal, fl oz, cup, tbsp, tsp)
- Longitud (m, cm, mm, km, in, ft, yd)
- Unidades (und, docena, par, gruesa)
- Tiempo (hr, min, seg, día, semana, mes)
- Área (m², cm², km², ft², in²)
- Temperatura (°C)

### 2. Usar Componentes en Frontend

```tsx
import { UnitTypeFields } from '@/components/UnitTypes';

function ConsumableForm() {
  const [formData, setFormData] = useState({
    productId: '...',
    consumableType: 'container',
    unitTypeId: undefined,
    defaultUnit: undefined,
    purchaseUnit: undefined,
    stockUnit: undefined,
    consumptionUnit: undefined,
  });

  return (
    <form>
      <UnitTypeFields
        unitTypeId={formData.unitTypeId}
        defaultUnit={formData.defaultUnit}
        purchaseUnit={formData.purchaseUnit}
        stockUnit={formData.stockUnit}
        consumptionUnit={formData.consumptionUnit}
        onChange={(data) => setFormData({ ...formData, ...data })}
        showConversions={true}
      />
    </form>
  );
}
```

### 3. Crear Consumable/Supply con UnitType

```typescript
import { useConsumables } from '@/hooks/useConsumables';

const { createConsumableConfig } = useConsumables();

await createConsumableConfig({
  productId: '507f1f77bcf86cd799439011',
  consumableType: 'container',
  // UnitType integration
  unitTypeId: '507f191e810c19729de860ea', // ID del tipo "Volumen"
  defaultUnit: 'litro',
  purchaseUnit: 'garrafa', // 5 litros (custom conversion)
  stockUnit: 'litro',
  consumptionUnit: 'mililitro',
  customConversions: [
    {
      unit: 'garrafa',
      abbreviation: 'grrf',
      factor: 5.0,
      context: 'purchase',
    },
  ],
});
```

### 4. Convertir Unidades

```typescript
import { useUnitTypes } from '@/hooks/useUnitTypes';

const { convertUnits } = useUnitTypes();

const result = await convertUnits({
  unitTypeId: '507f191e810c19729de860ea',
  quantity: 5,
  fromUnit: 'kilogramo',
  toUnit: 'gramo',
});

console.log(result.data);
// {
//   original: { quantity: 5, unit: 'kilogramo' },
//   converted: { quantity: 5000, unit: 'gramo' },
//   factor: 1000,
//   unitTypeName: 'Peso'
// }
```

---

## 📚 Documentación Completa

- **Arquitectura**: [UOM_ARCHITECTURE.md](./UOM_ARCHITECTURE.md)
- **Progreso**: [UOM_IMPLEMENTATION_PROGRESS.md](./UOM_IMPLEMENTATION_PROGRESS.md)
- **Componentes React**: [README.md](../food-inventory-admin/src/components/UnitTypes/README.md)

---

## 🔑 Conceptos Clave

### Productos SIMPLE
- Usan **SellingUnits** para precios de venta
- NO usan UnitType (conversiones no necesarias)

### Productos CONSUMABLE/SUPPLY
- Usan **UnitType** para operaciones
- 4 unidades configurables:
  - `defaultUnit`: Unidad base del producto
  - `purchaseUnit`: Unidad de compra al proveedor
  - `stockUnit`: Unidad en inventario
  - `consumptionUnit`: Unidad al usar
- Conversiones personalizadas opcionales

---

## 📝 Ejemplo Completo

**Escenario**: Aceite de cocina comprado en garrafas de 5L, almacenado en litros, usado en mililitros.

```typescript
// 1. Seleccionar UnitType "Volumen" (id obtenido del seed)
unitTypeId: '507f191e810c19729de860ea'

// 2. Configurar unidades
defaultUnit: 'litro'           // Base del producto
purchaseUnit: 'garrafa'        // Se compra en garrafas
stockUnit: 'litro'             // Se almacena en litros
consumptionUnit: 'mililitro'   // Se usa en ml

// 3. Definir conversión personalizada para garrafa
customConversions: [
  {
    unit: 'garrafa',
    abbreviation: 'grrf',
    factor: 5.0,              // 1 garrafa = 5 litros
    context: 'purchase'
  }
]
```

**Resultado**: El sistema convertirá automáticamente:
- Compras: 2 garrafas → 10 litros en stock
- Consumo: 500 ml → 0.5 litros descontados de stock
- Reportes: Todo en la unidad base (litros)

---

## 🚦 Endpoints Disponibles

### UnitTypes
```bash
GET    /unit-types                    # Listar todos
GET    /unit-types/categories         # Categorías disponibles
GET    /unit-types/:id                # Obtener por ID
POST   /unit-types                    # Crear personalizado
PATCH  /unit-types/:id                # Actualizar
DELETE /unit-types/:id                # Soft delete
POST   /unit-types/convert            # Convertir unidades
```

### Consumables/Supplies
```bash
POST   /consumables/configs           # Crear config (incluye UnitType)
PATCH  /consumables/configs/:id       # Actualizar (incluye UnitType)
POST   /supplies/configs              # Crear config (incluye UnitType)
PATCH  /supplies/configs/:id          # Actualizar (incluye UnitType)
```

---

## ⚠️ Migracion desde unitOfMeasure

Si tienes productos existentes con `unitOfMeasure`:

```typescript
// ANTES (legacy)
{
  unitOfMeasure: "litro"
}

// DESPUÉS (recomendado)
{
  unitTypeId: "507f191e810c19729de860ea",
  defaultUnit: "litro",
  purchaseUnit: "litro",
  stockUnit: "litro",
  consumptionUnit: "mililitro",
  unitOfMeasure: "litro" // Mantener para retrocompatibilidad
}
```

El campo `unitOfMeasure` sigue funcionando pero es **DEPRECATED**.

---

## 🎯 Próximos Pasos Recomendados

1. **Ejecutar seed**: `npm run seed` en backend
2. **Probar API**: Usar Postman/Insomnia con endpoints de UnitTypes
3. **Integrar en UI**: Agregar `<UnitTypeFields>` en formularios existentes
4. **Migrar datos**: Crear script para convertir `unitOfMeasure` a UnitType
5. **Crear tipos custom**: Si necesitas unidades específicas del negocio

---

_Sistema completado: 2025-11-30 | Ready to use 🚀_
