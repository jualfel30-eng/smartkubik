# Arquitectura del Sistema de Unidades de Medida (UoM)

## 📋 Visión General

Este documento describe la arquitectura del sistema de conversión de unidades de medida (UoM) del Food Inventory SaaS, basado en las mejores prácticas de ERPs líderes como Odoo, SAP y NetSuite.

## 🎯 Principios de Diseño

### 1. Separación por Tipo de Producto

```
Productos SIMPLE (mercancía)
├─ Para: Ventas a clientes
├─ Sistema: SellingUnits (embebido en Product)
└─ Ejemplo: Vender arroz en kg, g, lb

Productos SUPPLY/CONSUMABLE
├─ Para: Operaciones de cadena de suministro
├─ Sistema: UnitType (global) + Config específico
└─ Ejemplo: Comprar servilletas en cajas, almacenar en paquetes, consumir por unidad
```

### 2. DRY (Don't Repeat Yourself)

**Antes (❌ Problemático)**:
```
Producto A: 1 kg = 1000 g (definido manualmente)
Producto B: 1 kg = 1000 g (definido manualmente)
Producto C: 1 kg = 1000 g (definido manualmente)
```

**Ahora (✅ Óptimo)**:
```
UnitType "Peso":
  - kg = 1.0
  - g = 0.001
  - lb = 0.453592

Producto A → Usa UnitType "Peso"
Producto B → Usa UnitType "Peso"
Producto C → Usa UnitType "Peso"
```

### 3. Configuración Antes, Selección Durante

**Flujo recomendado**:
1. **Antes**: Admin configura UnitTypes a nivel de sistema
2. **Durante creación**: Usuario selecciona UnitType y unidad por defecto
3. **Después (opcional)**: Sobrescribir conversiones específicas si es necesario

**Anti-patrón a evitar**:
- ❌ Configurar conversiones durante la creación del producto
- ❌ Duplicar conversiones estándar en cada producto

---

## 🏗️ Arquitectura por Capas

### Capa 1: UnitTypes (Sistema Global)

**Propósito**: Biblioteca de tipos de unidades reutilizables

```typescript
// Schema: UnitType
{
  _id: ObjectId,
  name: "Peso",
  category: "weight",
  baseUnit: {
    name: "kilogramo",
    abbreviation: "kg"
  },
  conversions: [
    {
      unit: "kilogramo",
      abbreviation: "kg",
      pluralName: "kilogramos",
      factor: 1.0,
      isBase: true
    },
    {
      unit: "gramo",
      abbreviation: "g",
      pluralName: "gramos",
      factor: 0.001,
      isBase: false
    },
    {
      unit: "libra",
      abbreviation: "lb",
      pluralName: "libras",
      factor: 0.453592,
      isBase: false
    }
  ],
  isSystemDefined: true,  // No editable por usuarios
  tenantId: null,         // null = global, ObjectId = tenant-specific
  isActive: true
}
```

**UnitTypes Predefinidos**:
- **Peso**: kg, g, lb, oz, ton, mg
- **Volumen**: L, ml, gal, oz fl, cup, tbsp, tsp
- **Longitud**: m, cm, mm, in, ft, yd
- **Unidades**: und, paquete, caja, docena, par
- **Tiempo**: hr, min, seg, día, semana, mes

### Capa 2: Product (Productos SIMPLE)

**Para mercancía de venta**

```typescript
// Schema: Product (productType: SIMPLE)
{
  _id: ObjectId,
  sku: "ARR-001",
  name: "Arroz Premium",
  productType: "simple",

  // Referencia al UnitType para conversiones
  unitTypeId: ObjectId → UnitType("Peso"),

  // Unidad base para inventario
  baseUnit: "kilogramo",

  // Unidades de venta con precios
  sellingUnits: [
    {
      unitRef: "kg",           // Referencia a conversion en UnitType
      pricePerUnit: 10.00,
      costPerUnit: 5.00,
      isDefault: true,
      minimumQuantity: 0.5,    // Mínimo 500g
      incrementStep: 0.1       // En pasos de 100g
    },
    {
      unitRef: "g",
      pricePerUnit: 0.01,
      costPerUnit: 0.005,
      isDefault: false
    },
    {
      unitRef: "lb",
      pricePerUnit: 4.54,
      costPerUnit: 2.27,
      isDefault: false
    }
  ]
}
```

**Ventajas**:
- ✅ No duplica factores de conversión (vienen de UnitType)
- ✅ Solo almacena precios y restricciones de venta
- ✅ Conversiones consistentes en todo el sistema

### Capa 3: Consumables & Supplies (Productos operacionales)

**Para suministros y consumibles**

```typescript
// Schema: ProductConsumableConfig
{
  _id: ObjectId,
  productId: ObjectId,
  consumableType: "cup",

  // Referencia al UnitType
  unitTypeId: ObjectId → UnitType("Unidades"),

  // Unidades específicas de operación
  defaultUnit: "unidad",           // Base
  purchaseUnit: "caja",            // Se compra en cajas
  stockUnit: "paquete",            // Se almacena en paquetes
  consumptionUnit: "unidad",       // Se consume por unidad

  // Conversiones opcionales específicas (sobrescribe UnitType)
  customConversions: [
    {
      unit: "caja",
      factor: 2000,     // 1 caja = 2000 unidades (específico del proveedor)
      context: "purchase"
    },
    {
      unit: "paquete",
      factor: 50,       // 1 paquete = 50 unidades
      context: "stock"
    }
  ],

  isReusable: false,
  isAutoDeducted: true,
  defaultQuantityPerUse: 1
}
```

```typescript
// Schema: ProductSupplyConfig
{
  _id: ObjectId,
  productId: ObjectId,
  supplyCategory: "cleaning",
  supplySubcategory: "detergent",

  // Referencia al UnitType
  unitTypeId: ObjectId → UnitType("Volumen"),

  // Unidades específicas
  defaultUnit: "litro",
  purchaseUnit: "garrafa",         // Garrafa de 5L
  stockUnit: "litro",
  consumptionUnit: "mililitro",

  // Conversión personalizada
  customConversions: [
    {
      unit: "garrafa",
      factor: 5.0,      // 1 garrafa = 5 litros
      context: "purchase"
    }
  ],

  requiresTracking: true,
  estimatedMonthlyConsumption: 20  // 20 litros/mes
}
```

**Ventajas**:
- ✅ Usa conversiones del UnitType como base
- ✅ Permite sobrescribir con conversiones específicas (ej: caja del proveedor)
- ✅ Clara separación entre compra/almacén/consumo

---

## 🔄 Flujos de Trabajo

### Flujo 1: Crear Producto SIMPLE (Mercancía)

```
1. Usuario va a "Crear Producto"
   └─ Selecciona tipo: SIMPLE

2. Selecciona UnitType
   └─ Dropdown: [Peso, Volumen, Unidades, ...]
   └─ Selecciona: "Peso"

3. Sistema muestra unidades disponibles
   ├─ ✓ kilogramo (kg) - Base
   ├─ ✓ gramo (g)
   ├─ ✓ libra (lb)
   └─ ✓ onza (oz)

4. Usuario configura precios
   ├─ kg: $10.00 (default)
   ├─ g: $0.01
   └─ lb: $4.54

5. Usuario guarda producto
   └─ Sistema almacena referencias, NO factores de conversión

6. DESPUÉS de crear (opcional)
   └─ Botón: "Gestionar Unidades de Venta"
   └─ Permite añadir/editar/eliminar unidades
```

### Flujo 2: Crear Producto CONSUMABLE

```
1. Usuario va a "Crear Producto"
   └─ Selecciona tipo: CONSUMABLE

2. Completa información básica
   ├─ Nombre: "Vaso desechable 12oz"
   ├─ SKU: "CONS-001"
   └─ Selecciona UnitType: "Unidades"

3. Usuario guarda producto base
   └─ En este punto NO configura conversiones

4. DESPUÉS de crear
   └─ Botón: "Configurar como Consumible"
   └─ Modal se abre:
      ├─ Tipo de consumible: [Vaso ▼]
      ├─ Unidad base: [unidad ▼]
      ├─ Unidad de compra: [caja ▼] = 2000 unidades
      ├─ Unidad de almacén: [paquete ▼] = 50 unidades
      ├─ Auto-deducir: [✓]
      ├─ Cantidad por uso: [1]
      └─ [Guardar Configuración]

5. Sistema crea ProductConsumableConfig
   └─ Con referencias a UnitType + conversiones específicas
```

### Flujo 3: Conversión en Compras

```
Ejemplo: Comprar servilletas

1. Usuario crea Orden de Compra
   ├─ Producto: Servilletas (SERV-001)
   └─ Sistema consulta ProductConsumableConfig:
      └─ purchaseUnit: "caja"

2. Usuario ingresa cantidad
   ├─ 5 cajas
   └─ Sistema muestra equivalencias:
      ├─ 5 cajas = 10,000 unidades (base)
      └─ 5 cajas = 200 paquetes (almacén)

3. Al recibir mercancía
   ├─ Inventario se actualiza: +10,000 unidades
   └─ Vista de almacén muestra: "200 paquetes"

4. Al consumir (venta de hamburguesa)
   ├─ Hamburguesa requiere: 3 servilletas
   ├─ Se vende: 50 hamburguesas
   └─ Auto-deducción:
      ├─ 50 × 3 = 150 unidades
      ├─ Inventario: 10,000 - 150 = 9,850 und
      └─ Vista almacén: "197 paquetes" (9,850 ÷ 50)
```

---

## 🔧 APIs y Endpoints

### UnitTypes API

```typescript
// Listar tipos de unidades
GET /unit-types
Query: ?category=weight&isActive=true&includeCustom=true
Response: UnitType[]

// Obtener un tipo específico
GET /unit-types/:id
Response: UnitType

// Crear tipo personalizado (admin)
POST /unit-types
Body: CreateUnitTypeDto
Response: UnitType

// Actualizar tipo personalizado
PATCH /unit-types/:id
Body: UpdateUnitTypeDto
Response: UnitType

// Eliminar tipo (soft delete)
DELETE /unit-types/:id
Response: { success: true }

// Convertir entre unidades
POST /unit-types/convert
Body: {
  unitTypeId: string,
  fromUnit: string,
  toUnit: string,
  quantity: number
}
Response: {
  original: { quantity: 5, unit: "kg" },
  converted: { quantity: 5000, unit: "g" },
  factor: 0.001
}
```

### Products API (Cambios)

```typescript
// Crear producto SIMPLE
POST /products
Body: {
  name: "Arroz Premium",
  sku: "ARR-001",
  productType: "simple",
  unitTypeId: "673abc123...",  // NUEVO
  baseUnit: "kg",               // NUEVO
  sellingUnits: [
    {
      unitRef: "kg",            // CAMBIO: era conversionFactor
      pricePerUnit: 10.00,
      isDefault: true
    }
  ]
}

// VALIDACIÓN: Si productType === "simple"
// - DEBE tener unitTypeId
// - DEBE tener baseUnit
// - sellingUnits debe usar unitRef (no conversionFactor)
// - NO DEBE tener unitConversionConfig
```

### Consumables API (Cambios)

```typescript
// Crear configuración de consumible
POST /consumables/configs
Body: {
  productId: string,
  consumableType: string,
  unitTypeId: string,          // NUEVO (opcional, usa el del producto)
  defaultUnit: string,          // NUEVO
  purchaseUnit: string,         // NUEVO
  stockUnit: string,            // NUEVO
  consumptionUnit: string,      // NUEVO
  customConversions: [          // NUEVO (opcional)
    {
      unit: "caja",
      factor: 2000,
      context: "purchase"
    }
  ],
  isAutoDeducted: boolean,
  defaultQuantityPerUse: number
}
```

---

## 📊 Modelo de Datos Completo

```
┌─────────────────┐
│   UnitType      │ ← Sistema Global (predefinidos + custom)
│ ─────────────── │
│ name            │
│ category        │
│ baseUnit        │
│ conversions[]   │
│ isSystemDefined │
│ tenantId?       │
└────────┬────────┘
         │
         │ Referenciado por (unitTypeId)
         │
    ┌────┴──────────────────────────┐
    │                                │
    ▼                                ▼
┌─────────────────┐        ┌──────────────────────┐
│    Product      │        │ ProductConsumable    │
│ (SIMPLE)        │        │ Config               │
│ ─────────────── │        │ ──────────────────── │
│ unitTypeId  ────┼───────▶│ unitTypeId           │
│ baseUnit        │        │ purchaseUnit         │
│ sellingUnits[]  │        │ stockUnit            │
│  ├ unitRef      │        │ consumptionUnit      │
│  ├ price        │        │ customConversions[]  │
│  └ cost         │        └──────────────────────┘
└─────────────────┘                 │
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ ProductSupplyConfig  │
                         │ ──────────────────── │
                         │ unitTypeId           │
                         │ purchaseUnit         │
                         │ stockUnit            │
                         │ consumptionUnit      │
                         │ customConversions[]  │
                         └──────────────────────┘
```

---

## ⚠️ Migraciones y Compatibilidad

### Migración de Datos Existentes

#### Productos SIMPLE

**Antes**:
```typescript
{
  sellingUnits: [
    {
      name: "kilogramo",
      abbreviation: "kg",
      conversionFactor: 1.0,  // ← A eliminar
      pricePerUnit: 10.00
    }
  ]
}
```

**Después**:
```typescript
{
  unitTypeId: ObjectId("UnitType:Peso"),  // ← NUEVO
  baseUnit: "kg",                          // ← NUEVO
  sellingUnits: [
    {
      unitRef: "kg",        // ← CAMBIO
      pricePerUnit: 10.00   // ← Se mantiene
    }
  ]
}
```

**Script de migración**:
```typescript
async function migrateSimpleProducts() {
  const simpleProducts = await Product.find({ productType: 'simple' });

  for (const product of simpleProducts) {
    // Detectar categoría de unidad
    const baseUnitAbbr = product.sellingUnits[0]?.abbreviation;
    const unitType = await inferUnitType(baseUnitAbbr);

    // Actualizar producto
    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          unitTypeId: unitType._id,
          baseUnit: baseUnitAbbr
        }
      }
    );

    // Actualizar sellingUnits (eliminar conversionFactor)
    const updatedUnits = product.sellingUnits.map(unit => ({
      unitRef: unit.abbreviation,
      pricePerUnit: unit.pricePerUnit,
      costPerUnit: unit.costPerUnit,
      isDefault: unit.isDefault,
      minimumQuantity: unit.minimumQuantity,
      incrementStep: unit.incrementStep
    }));

    await Product.updateOne(
      { _id: product._id },
      { $set: { sellingUnits: updatedUnits } }
    );
  }
}
```

#### ProductConsumableConfig

**Antes**:
```typescript
{
  unitOfMeasure: "unidad"  // Solo un string
}
```

**Después**:
```typescript
{
  unitTypeId: ObjectId("UnitType:Unidades"),
  defaultUnit: "unidad",
  purchaseUnit: "caja",
  stockUnit: "paquete",
  consumptionUnit: "unidad",
  customConversions: [
    { unit: "caja", factor: 2000, context: "purchase" },
    { unit: "paquete", factor: 50, context: "stock" }
  ]
}
```

**Script de migración**:
```typescript
async function migrateConsumableConfigs() {
  const configs = await ProductConsumableConfig.find();

  for (const config of configs) {
    const unitType = await inferUnitType(config.unitOfMeasure);

    await ProductConsumableConfig.updateOne(
      { _id: config._id },
      {
        $set: {
          unitTypeId: unitType._id,
          defaultUnit: config.unitOfMeasure,
          purchaseUnit: config.unitOfMeasure,  // Default
          stockUnit: config.unitOfMeasure,     // Default
          consumptionUnit: config.unitOfMeasure // Default
        },
        $unset: {
          unitOfMeasure: ""  // Eliminar campo viejo
        }
      }
    );
  }
}
```

### Retrocompatibilidad

Durante la transición, mantener ambos sistemas:

```typescript
// En ProductsService
async getProduct(id: string) {
  const product = await this.productModel.findById(id);

  // Si tiene unitTypeId (nuevo sistema)
  if (product.unitTypeId) {
    const unitType = await this.unitTypesService.findOne(product.unitTypeId);
    return {
      ...product.toObject(),
      unitType,
      sellingUnits: product.sellingUnits.map(unit => ({
        ...unit,
        // Calcular conversionFactor dinámicamente para retrocompatibilidad
        conversionFactor: unitType.conversions.find(c => c.abbreviation === unit.unitRef)?.factor
      }))
    };
  }

  // Si NO tiene unitTypeId (sistema viejo)
  return product;
}
```

---

## 🧪 Testing

### Unit Tests

```typescript
describe('UnitTypesService', () => {
  it('should convert 5 kg to 5000 g', async () => {
    const result = await service.convert({
      unitTypeId: pesoUnitType._id,
      fromUnit: 'kg',
      toUnit: 'g',
      quantity: 5
    });

    expect(result.converted.quantity).toBe(5000);
  });

  it('should throw error for incompatible units', async () => {
    await expect(
      service.convert({
        unitTypeId: pesoUnitType._id,
        fromUnit: 'kg',
        toUnit: 'L',  // Litros (volumen) no compatible con Peso
        quantity: 5
      })
    ).rejects.toThrow('Incompatible units');
  });
});

describe('ProductsService', () => {
  it('should prevent SIMPLE products from using UnitConversion', async () => {
    await expect(
      service.create({
        productType: 'simple',
        unitConversionConfig: { ... }  // ← NO permitido
      })
    ).rejects.toThrow('SIMPLE products must use SellingUnits');
  });

  it('should require unitTypeId for SIMPLE products', async () => {
    await expect(
      service.create({
        productType: 'simple',
        // Missing unitTypeId
      })
    ).rejects.toThrow('unitTypeId is required');
  });
});
```

### Integration Tests

```typescript
describe('Product Creation Flow', () => {
  it('should create SIMPLE product with UnitType', async () => {
    const unitType = await createUnitType('Peso');

    const product = await request(app)
      .post('/products')
      .send({
        name: 'Arroz',
        productType: 'simple',
        unitTypeId: unitType._id,
        baseUnit: 'kg',
        sellingUnits: [
          { unitRef: 'kg', pricePerUnit: 10 },
          { unitRef: 'g', pricePerUnit: 0.01 }
        ]
      });

    expect(product.body.unitTypeId).toBe(unitType._id);
    expect(product.body.sellingUnits).toHaveLength(2);
  });
});
```

---

## 📚 Referencias

- [Odoo UoM Documentation](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/uom.html)
- [SAP Material Master UoM](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/0f4ab800d01c4366b0c9aaff06a64320/9c69e50c986844b292ffc962ce65fb6f.html)
- [NetSuite Multiple UoM](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2211898.html)

---

## 🚀 Siguientes Pasos

1. ✅ Implementar schema UnitType
2. ✅ Crear servicio y controlador
3. ✅ Seed data con tipos predefinidos
4. ✅ Migrar schemas de Product, Consumable, Supply
5. ✅ Actualizar servicios
6. ✅ Crear frontend (tipos, hooks, componentes)
7. ✅ Testing completo
8. ✅ Documentación de usuario
