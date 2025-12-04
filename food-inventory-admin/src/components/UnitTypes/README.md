# Componentes UnitTypes - Guía de Uso

Este directorio contiene los componentes React para el sistema global de Unidades de Medida (UoM).

## Componentes Disponibles

### 1. `UnitTypeSelector`
Selector dropdown para elegir un tipo de unidad (Peso, Volumen, etc.).

**Props:**
- `value?: string` - ID del UnitType seleccionado
- `onChange: (unitTypeId: string | undefined) => void` - Callback al cambiar
- `category?: UnitCategory` - Filtrar por categoría específica
- `includeCustom?: boolean` - Incluir tipos personalizados (default: true)
- `label?: string` - Label del campo (default: "Tipo de Unidad")
- `placeholder?: string` - Texto placeholder
- `disabled?: boolean`
- `className?: string`

**Ejemplo:**
```tsx
import { UnitTypeSelector } from '@/components/UnitTypes';

<UnitTypeSelector
  value={formData.unitTypeId}
  onChange={(id) => setFormData({ ...formData, unitTypeId: id })}
  label="Tipo de Unidad"
/>
```

---

### 2. `UnitConversionDisplay`
Muestra las equivalencias de conversión para una cantidad específica.

**Props:**
- `unitTypeId: string` - ID del UnitType
- `quantity?: number` - Cantidad a convertir (default: 1)
- `fromUnit?: string` - Unidad de origen
- `className?: string`

**Ejemplo:**
```tsx
import { UnitConversionDisplay } from '@/components/UnitTypes';

<UnitConversionDisplay
  unitTypeId="507f1f77bcf86cd799439011"
  quantity={5}
  fromUnit="kilogramo"
/>
```

**Resultado:**
```
Equivalencias de 5 kilogramo:
5000    g
0.005   ton
11.023  lb
...
```

---

### 3. `UnitTypeFields`
Componente completo con todos los campos de UnitType para formularios de productos CONSUMABLE/SUPPLY.

**Props:**
- `unitTypeId?: string`
- `defaultUnit?: string`
- `purchaseUnit?: string`
- `stockUnit?: string`
- `consumptionUnit?: string`
- `onChange: (data) => void` - Callback con todos los campos
- `showConversions?: boolean` - Mostrar equivalencias (default: true)
- `disabled?: boolean`
- `className?: string`

**Ejemplo Completo:**
```tsx
import { UnitTypeFields } from '@/components/UnitTypes';
import { useState } from 'react';

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
      {/* Otros campos del formulario */}

      <UnitTypeFields
        unitTypeId={formData.unitTypeId}
        defaultUnit={formData.defaultUnit}
        purchaseUnit={formData.purchaseUnit}
        stockUnit={formData.stockUnit}
        consumptionUnit={formData.consumptionUnit}
        onChange={(data) => setFormData({ ...formData, ...data })}
        showConversions={true}
      />

      {/* Resto del formulario */}
    </form>
  );
}
```

---

## Hook useUnitTypes

Hook para interactuar con la API de UnitTypes.

### Métodos Disponibles

#### CRUD Operations
- `listUnitTypes(params?: UnitTypeQueryParams)` - Listar tipos
- `getCategories()` - Obtener categorías disponibles
- `getUnitType(id: string)` - Obtener por ID
- `getUnitTypeByName(name: string)` - Obtener por nombre
- `createUnitType(data: CreateUnitTypeDto)` - Crear tipo personalizado
- `updateUnitType(id: string, data: UpdateUnitTypeDto)` - Actualizar
- `deleteUnitType(id: string)` - Soft delete
- `hardDeleteUnitType(id: string)` - Hard delete

#### Conversion Operations
- `convertUnits(data: ConvertUnitsDto)` - Convertir entre unidades
- `getConversionFactor(unitTypeId, fromUnit, toUnit)` - Obtener factor
- `validateUnit(unitTypeId, unit)` - Validar si unidad existe

### Ejemplo de Uso

```tsx
import { useUnitTypes } from '@/hooks/useUnitTypes';
import { useEffect, useState } from 'react';

function MyComponent() {
  const { listUnitTypes, convertUnits, loading, error } = useUnitTypes();
  const [unitTypes, setUnitTypes] = useState([]);

  useEffect(() => {
    const load = async () => {
      const result = await listUnitTypes({
        category: 'weight',
        isActive: true
      });

      if (result.success) {
        setUnitTypes(result.data);
      }
    };
    load();
  }, []);

  const handleConvert = async () => {
    const result = await convertUnits({
      unitTypeId: '507f1f77bcf86cd799439011',
      quantity: 5,
      fromUnit: 'kilogramo',
      toUnit: 'gramo',
    });

    if (result.success) {
      console.log('Convertido:', result.data);
      // { original: { quantity: 5, unit: 'kilogramo' },
      //   converted: { quantity: 5000, unit: 'gramo' },
      //   factor: 1000, ... }
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Tu UI aquí */}
    </div>
  );
}
```

---

## Tipos TypeScript

### Interfaces Principales

```typescript
import {
  UnitType,
  UnitCategory,
  CustomConversionRule,
  ConvertUnitsDto,
  ConvertUnitsResponse,
  UNIT_CATEGORY_LABELS
} from '@/types/unit-types';
```

### Enumeraciones

```typescript
enum UnitCategory {
  WEIGHT = "weight",
  VOLUME = "volume",
  LENGTH = "length",
  UNIT = "unit",
  TIME = "time",
  AREA = "area",
  TEMPERATURE = "temperature",
  OTHER = "other",
}
```

### Labels para UI

```typescript
import { UNIT_CATEGORY_LABELS } from '@/types/unit-types';

// UNIT_CATEGORY_LABELS[UnitCategory.WEIGHT] => "Peso"
// UNIT_CATEGORY_LABELS[UnitCategory.VOLUME] => "Volumen"
```

---

## Integración en Formularios Existentes

### Para Productos CONSUMABLE

```tsx
import { UnitTypeFields } from '@/components/UnitTypes';
import { CreateConsumableConfigDto } from '@/types/consumables';

function CreateConsumableForm() {
  const [dto, setDto] = useState<CreateConsumableConfigDto>({
    productId: '...',
    consumableType: 'container',
    // ... otros campos
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos existentes */}

      <UnitTypeFields
        unitTypeId={dto.unitTypeId}
        defaultUnit={dto.defaultUnit}
        purchaseUnit={dto.purchaseUnit}
        stockUnit={dto.stockUnit}
        consumptionUnit={dto.consumptionUnit}
        onChange={(data) => setDto({ ...dto, ...data })}
      />

      <button type="submit">Crear</button>
    </form>
  );
}
```

### Para Productos SUPPLY

Misma integración que Consumables, solo cambia el tipo:

```tsx
import { CreateSupplyConfigDto } from '@/types/consumables';
```

---

## Migracion desde unitOfMeasure (Legacy)

Si tienes código existente usando `unitOfMeasure`:

**Antes:**
```tsx
<input
  name="unitOfMeasure"
  value={formData.unitOfMeasure}
  onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
  placeholder="ej: litro, kilogramo"
/>
```

**Después:**
```tsx
<UnitTypeFields
  unitTypeId={formData.unitTypeId}
  defaultUnit={formData.defaultUnit}
  purchaseUnit={formData.purchaseUnit}
  stockUnit={formData.stockUnit}
  consumptionUnit={formData.consumptionUnit}
  onChange={(data) => setFormData({ ...formData, ...data })}
/>
```

El campo `unitOfMeasure` sigue siendo válido para retrocompatibilidad, pero es **DEPRECATED**.

---

## Preguntas Frecuentes

### ¿Cuándo usar UnitType vs unitOfMeasure?

- **UnitType**: Para productos CONSUMABLE y SUPPLY que necesitan conversiones automáticas
- **unitOfMeasure (legacy)**: Solo para datos existentes, usar UnitType en su lugar

### ¿Puedo crear tipos de unidades personalizados?

Sí, usando `createUnitType()` del hook `useUnitTypes`:

```tsx
const { createUnitType } = useUnitTypes();

await createUnitType({
  name: 'Envases Especiales',
  category: UnitCategory.UNIT,
  baseUnit: { name: 'envase', abbreviation: 'env' },
  conversions: [
    { unit: 'envase', abbreviation: 'env', factor: 1.0 },
    { unit: 'caja', abbreviation: 'cja', factor: 12.0 },
  ],
});
```

### ¿Cómo muestro conversiones en tiempo real?

Usa `UnitConversionDisplay`:

```tsx
{defaultUnit && (
  <UnitConversionDisplay
    unitTypeId={unitTypeId}
    quantity={inputQuantity}
    fromUnit={defaultUnit}
  />
)}
```

---

## Próximos Pasos

1. **Testing**: Escribir tests para los componentes
2. **Admin Panel**: Crear UI para gestionar UnitTypes personalizados
3. **Validaciones**: Agregar validaciones visuales en formularios
4. **Documentación**: Expandir con más ejemplos de uso

---

**Documentación completa**: Ver [UOM_ARCHITECTURE.md](../../../docs/UOM_ARCHITECTURE.md)
