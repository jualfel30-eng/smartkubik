# Ejemplos de Configuración Multi-Unidad

## ⚠️ Regla de Oro del Factor de Conversión

**El Factor de Conversión indica cuántas unidades BASE equivalen a 1 unidad de VENTA.**

Fórmula: `1 [unidad de venta] = [Factor] x [unidad base]`

---

## Ejemplo 1: Tomates (Base: gramos)

### Configuración del Producto
- **Unidad Base del Inventario**: `gramos`
- **Inventario**: 100,000 gramos (100 kg)

### Unidades de Venta

#### Opción A: Vender en Kilogramos
- **Nombre**: Kilogramos
- **Abreviación**: kg
- **Factor de Conversión**: `1000` ← **1 kg = 1000 gramos**
- **Precio por Unidad**: $3.00 (por kg)
- **Mínimo**: 0.2 kg
- **Incremento**: 0.1 kg

#### Opción B: Vender en Gramos
- **Nombre**: Gramos
- **Abreviación**: g
- **Factor de Conversión**: `1` ← **1 g = 1 gramo**
- **Precio por Unidad**: $0.003 (por gramo)
- **Mínimo**: 200 g
- **Incremento**: 100 g

### Ventas de Ejemplo
- Cliente compra **2.5 kg** → Descuento de inventario: **2,500 gramos** ✅
- Cliente compra **500 g** → Descuento de inventario: **500 gramos** ✅

---

## Ejemplo 2: Queso (Base: gramos)

### Configuración del Producto
- **Unidad Base del Inventario**: `gramos`
- **Inventario**: 50,000 gramos (50 kg)

### Unidades de Venta

#### Vender en Kilogramos
- **Factor**: `1000` (1 kg = 1000 g)
- **Precio**: $20/kg

#### Vender en Libras
- **Factor**: `453.592` (1 lb = 453.592 g)
- **Precio**: $9.07/lb

---

## Ejemplo 3: Bebidas (Base: unidad)

### Configuración del Producto
- **Unidad Base del Inventario**: `unidad`
- **Inventario**: 1000 unidades

### Unidades de Venta

#### Vender por Unidad
- **Factor**: `1` (1 unidad = 1 unidad)
- **Precio**: $2.50/unidad

#### Vender por Six-Pack
- **Factor**: `6` (1 six-pack = 6 unidades)
- **Precio**: $13.50/six-pack

#### Vender por Caja (24 unidades)
- **Factor**: `24` (1 caja = 24 unidades)
- **Precio**: $48.00/caja

### Ventas de Ejemplo
- Cliente compra **2 six-packs** → Descuento: **12 unidades** ✅
- Cliente compra **1 caja** → Descuento: **24 unidades** ✅

---

## Ejemplo 4: Harina (Base: kg)

### Configuración del Producto
- **Unidad Base del Inventario**: `kg`
- **Inventario**: 500 kg

### Unidades de Venta

#### Vender en Kilogramos
- **Factor**: `1` (1 kg = 1 kg)
- **Precio**: $2.00/kg

#### Vender en Gramos
- **Factor**: `0.001` ← **1 gramo = 0.001 kg**
- **Precio**: $0.002/g

#### Vender en Sacos de 25kg
- **Factor**: `25` (1 saco = 25 kg)
- **Precio**: $45.00/saco

---

## 🚨 Errores Comunes

### ❌ ERROR: Mismo factor para kg y g cuando la base es "unidad"
```json
{
  "unitOfMeasure": "unidad",
  "sellingUnits": [
    { "abbreviation": "kg", "conversionFactor": 1 },  // ❌ INCORRECTO
    { "abbreviation": "g", "conversionFactor": 1 }    // ❌ INCORRECTO
  ]
}
```

### ✅ CORRECTO: Base en gramos
```json
{
  "unitOfMeasure": "gramos",
  "sellingUnits": [
    { "abbreviation": "kg", "conversionFactor": 1000 },  // ✅ 1 kg = 1000 g
    { "abbreviation": "g", "conversionFactor": 1 }       // ✅ 1 g = 1 g
  ]
}
```

---

## Verificación Rápida

Para verificar que configuraste bien:

1. **Crea inventario** en unidad base (ej: 10000 gramos)
2. **Crea orden** con unidad de venta (ej: 2.5 kg)
3. **Verifica inventario** se redujo correctamente:
   - Si vendiste 2.5 kg y el factor es 1000
   - Debería reducir 2500 gramos ✅
   - Si solo redujo 2.5, el factor está MAL ❌

---

## Caso de Uso: Tomates Configuración Correcta

Para vender tomates por kg O por gramos, con inventario en gramos:

```json
{
  "sku": "TOMATE-001",
  "name": "Tomates",
  "unitOfMeasure": "gramos",  // ← UNIDAD BASE
  "hasMultipleSellingUnits": true,
  "sellingUnits": [
    {
      "name": "Kilogramos",
      "abbreviation": "kg",
      "conversionFactor": 1000,      // ← 1 kg = 1000 g
      "pricePerUnit": 3.00,
      "costPerUnit": 1.80,
      "isDefault": true,
      "minimumQuantity": 0.2,
      "incrementStep": 0.1
    },
    {
      "name": "Gramos",
      "abbreviation": "g",
      "conversionFactor": 1,         // ← 1 g = 1 g
      "pricePerUnit": 0.003,          // $3/kg = $0.003/g
      "costPerUnit": 0.0018,
      "minimumQuantity": 200,
      "incrementStep": 100
    }
  ]
}
```

### Crear Inventario
```json
{
  "productSku": "TOMATE-001",
  "totalQuantity": 100000,    // ← 100,000 gramos = 100 kg
  "averageCostPrice": 1.80
}
```

### Ejemplo de Venta
```json
// Opción 1: Vender 2.5 kg
{
  "items": [{
    "productId": "...",
    "quantity": 2.5,
    "selectedUnit": "kg"        // → Descuenta 2500 gramos
  }]
}

// Opción 2: Vender 500 g
{
  "items": [{
    "productId": "...",
    "quantity": 500,
    "selectedUnit": "g"         // → Descuenta 500 gramos
  }]
}
```
