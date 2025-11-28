# Integración Modificadores ↔ BOM (Bill of Materials)

## Descripción General

Esta funcionalidad permite que los modificadores de un producto afecten automáticamente la deducción de ingredientes del inventario cuando se completa una orden.

## Casos de Uso

### 1. **Excluir Ingrediente** (`action: "exclude"`)
Cuando un cliente pide "Sin X ingrediente", ese ingrediente NO se deduce del inventario.

**Ejemplo:** Hamburguesa sin cebolla

```json
POST /modifiers
{
  "name": "Sin Cebolla",
  "groupId": "6543...",
  "priceAdjustment": 0,
  "componentEffects": [
    {
      "componentProductId": "abc123...",  // ID del producto "Cebolla"
      "action": "exclude"
    }
  ]
}
```

**Resultado:**
- Orden: 1 Hamburguesa + "Sin Cebolla"
- BOM de Hamburguesa: Pan (100g), Carne (150g), Queso (30g), Cebolla (20g), Lechuga (15g)
- Deducción de inventario: Pan ✅, Carne ✅, Queso ✅, Cebolla ❌ (excluida), Lechuga ✅

---

### 2. **Multiplicar Cantidad** (`action: "multiply"`)
Para modificadores tipo "Extra X", se multiplica la cantidad del ingrediente.

**Ejemplo:** Extra queso (doble porción)

```json
POST /modifiers
{
  "name": "Extra Queso",
  "groupId": "6543...",
  "priceAdjustment": 2.50,
  "componentEffects": [
    {
      "componentProductId": "def456...",  // ID del producto "Queso"
      "action": "multiply",
      "quantity": 2  // Multiplicador: 2x
    }
  ]
}
```

**Resultado:**
- Orden: 1 Hamburguesa + "Extra Queso"
- BOM de Hamburguesa: Queso (30g)
- Deducción de inventario: Queso = 30g × 2 = **60g** ✅

---

### 3. **Agregar Cantidad Fija** (`action: "add"`)
Para agregar una cantidad específica adicional de un ingrediente.

**Ejemplo:** Agregar 50g de bacon

```json
POST /modifiers
{
  "name": "Agregar Bacon",
  "groupId": "6543...",
  "priceAdjustment": 3.00,
  "componentEffects": [
    {
      "componentProductId": "ghi789...",  // ID del producto "Bacon"
      "action": "add",
      "quantity": 50  // Agregar 50g adicionales
    }
  ]
}
```

**Resultado:**
- Orden: 1 Hamburguesa + "Agregar Bacon"
- BOM de Hamburguesa: Bacon (0g - no viene por defecto)
- Deducción de inventario: Bacon = 0g + 50g = **50g** ✅

---

## Modificadores Múltiples

Los modificadores se pueden combinar. El sistema procesa TODOS los efectos de componentes.

**Ejemplo:** Sin cebolla + Extra queso

```javascript
// Orden
{
  "items": [
    {
      "productId": "hamburguesa_123",
      "quantity": 1,
      "modifiers": [
        {
          "modifierId": "mod_sin_cebolla",
          "name": "Sin Cebolla",
          "priceAdjustment": 0,
          "quantity": 1
        },
        {
          "modifierId": "mod_extra_queso",
          "name": "Extra Queso",
          "priceAdjustment": 2.50,
          "quantity": 1
        }
      ]
    }
  ]
}
```

**Resultado:**
- Cebolla: **Excluida** (0g)
- Queso: **Duplicado** (60g en lugar de 30g)
- Resto de ingredientes: deducción normal

---

## Escenario Avanzado: Cantidad de Modificador > 1

Si un modificador tiene `quantity > 1`, el efecto se multiplica.

**Ejemplo:** 2x "Extra Queso"

```javascript
{
  "modifiers": [
    {
      "modifierId": "mod_extra_queso",  // multiply: 2
      "quantity": 2  // Aplicado 2 veces
    }
  ]
}
```

**Resultado:**
- Queso base: 30g
- Multiplicador del modificador: 2x
- Cantidad del modificador: 2
- Deducción final: 30g × 2 × 2 = **120g**

---

## Logging

El sistema registra todas las operaciones de modificadores en los logs:

```
[OrdersService] Modifier "Sin Cebolla" excluded component 6543abc from order ORD-2024-001
[OrdersService] Modifier "Extra Queso" multiplied component 6543def by 2 (qty: 1)
[OrdersService] Deducted 60 g of QUESO_001 (Queso Cheddar). New quantity: 940
```

---

## Configuración en Frontend

### Crear Modificador con Efectos

```javascript
// En el formulario de modificadores
const formData = {
  name: "Sin Cebolla",
  description: "Excluye la cebolla del platillo",
  groupId: modifierGroupId,
  priceAdjustment: 0,
  available: true,
  sortOrder: 1,
  componentEffects: [
    {
      componentProductId: "product_id_cebolla",
      action: "exclude"
    }
  ]
};

await fetch('/api/modifiers', {
  method: 'POST',
  body: JSON.stringify(formData)
});
```

### Actualizar Modificador Existente

```javascript
// Agregar efectos a modificador existente
const updateData = {
  componentEffects: [
    {
      componentProductId: "product_id_queso",
      action: "multiply",
      quantity: 2
    }
  ]
};

await fetch(`/api/modifiers/${modifierId}`, {
  method: 'PATCH',
  body: JSON.stringify(updateData)
});
```

---

## Validaciones

El sistema valida:

1. **`componentProductId`**: Debe ser un ObjectId válido de un producto existente
2. **`action`**: Solo acepta: `"exclude"`, `"multiply"`, `"add"`
3. **`quantity`**: Opcional para `exclude`, requerido para `multiply` y `add` (≥ 0)

---

## Notas Importantes

1. **Los modificadores sin `componentEffects` solo afectan el precio** - comportamiento legacy
2. **Si un componente no está en el BOM, el efecto se ignora** - no se puede excluir lo que no existe
3. **Los efectos se aplican ANTES del scrap percentage** - el desperdicio se calcula sobre la cantidad ajustada
4. **Si `componentQuantity` llega a 0, el ingrediente se omite completamente** - no se agrega a `flatIngredients`
5. **La deducción automática debe estar habilitada** en configuración del tenant: `settings.inventory.enableAutomaticIngredientDeduction = true`

---

## Ejemplo Completo: Configurar "Hamburguesa Personalizada"

### 1. Crear productos/ingredientes
```
- Pan (ID: prod_001)
- Carne (ID: prod_002)
- Queso (ID: prod_003)
- Cebolla (ID: prod_004)
- Lechuga (ID: prod_005)
- Bacon (ID: prod_006)
```

### 2. Crear BOM de Hamburguesa
```json
{
  "productId": "hamburguesa_classic",
  "name": "BOM Hamburguesa Clásica",
  "components": [
    { "componentProductId": "prod_001", "quantity": 100, "unit": "g" },
    { "componentProductId": "prod_002", "quantity": 150, "unit": "g" },
    { "componentProductId": "prod_003", "quantity": 30, "unit": "g" },
    { "componentProductId": "prod_004", "quantity": 20, "unit": "g" },
    { "componentProductId": "prod_005", "quantity": 15, "unit": "g" }
  ]
}
```

### 3. Crear Grupo de Modificadores
```json
{
  "name": "Personalización",
  "selectionType": "multiple",
  "required": false,
  "applicableProducts": ["hamburguesa_classic"]
}
```

### 4. Crear Modificadores
```json
[
  {
    "name": "Sin Cebolla",
    "groupId": "grupo_personalizacion",
    "priceAdjustment": 0,
    "componentEffects": [
      { "componentProductId": "prod_004", "action": "exclude" }
    ]
  },
  {
    "name": "Extra Queso",
    "groupId": "grupo_personalizacion",
    "priceAdjustment": 2.50,
    "componentEffects": [
      { "componentProductId": "prod_003", "action": "multiply", "quantity": 2 }
    ]
  },
  {
    "name": "Agregar Bacon",
    "groupId": "grupo_personalizacion",
    "priceAdjustment": 3.00,
    "componentEffects": [
      { "componentProductId": "prod_006", "action": "add", "quantity": 50 }
    ]
  }
]
```

### 5. Crear Orden con Modificadores
```json
{
  "items": [
    {
      "productId": "hamburguesa_classic",
      "quantity": 2,
      "modifiers": [
        { "modifierId": "mod_sin_cebolla", "name": "Sin Cebolla", "priceAdjustment": 0 },
        { "modifierId": "mod_extra_queso", "name": "Extra Queso", "priceAdjustment": 2.50 }
      ]
    }
  ]
}
```

### 6. Deducción Resultante (para 2 hamburguesas)
```
Pan:     100g × 2 = 200g ✅
Carne:   150g × 2 = 300g ✅
Queso:   30g × 2 × 2 (extra) = 120g ✅  (en lugar de 60g)
Cebolla: EXCLUIDA = 0g ❌ (en lugar de 40g)
Lechuga: 15g × 2 = 30g ✅
```

---

## Troubleshooting

### "El modificador no está afectando el inventario"

1. Verificar que el tenant tiene `enableAutomaticIngredientDeduction = true`
2. Verificar que el producto tiene un BOM activo
3. Verificar que el `componentProductId` del efecto coincide con un componente del BOM
4. Revisar logs del servidor para ver si hay errores

### "Se deduce inventario incorrecto"

1. Verificar el `action` del modificador (`exclude`, `multiply`, `add`)
2. Verificar el `quantity` para `multiply` y `add`
3. Verificar si hay múltiples modificadores afectando el mismo componente
4. Revisar el campo `quantity` del modificador aplicado en la orden

---

## Migración de Datos Existentes

Los modificadores creados **antes** de esta funcionalidad seguirán funcionando normalmente (solo afectan precio). Para agregar efectos de componentes:

```javascript
// Script de migración
const modifiers = await db.modifiers.find({ name: /^Sin / });

for (const modifier of modifiers) {
  // Identificar ingrediente a excluir del nombre
  // "Sin Cebolla" → buscar producto "Cebolla"
  const ingredient = modifier.name.replace('Sin ', '');
  const product = await db.products.findOne({
    name: new RegExp(ingredient, 'i')
  });

  if (product) {
    await db.modifiers.updateOne(
      { _id: modifier._id },
      {
        $set: {
          componentEffects: [{
            componentProductId: product._id,
            action: 'exclude'
          }]
        }
      }
    );
  }
}
```

---

## Referencias

- **Schema:** `src/schemas/modifier.schema.ts` (ComponentEffect)
- **DTO:** `src/dto/modifier.dto.ts` (ComponentEffectDto)
- **Lógica:** `src/modules/orders/orders.service.ts` (líneas 1354-1406)
- **Module:** `src/modules/orders/orders.module.ts`
