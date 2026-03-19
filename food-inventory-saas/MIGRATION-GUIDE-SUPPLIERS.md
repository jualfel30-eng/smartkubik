# Guía de Migración: Virtual Suppliers a Suppliers

## ¿Qué hace esta migración?

Este script resuelve el problema de proveedores que **no cargan sus condiciones de pago** al seleccionarlos en el formulario de compras.

### El Problema

Existen dos tipos de proveedores en el sistema:

1. **Proveedores completos**: Tienen registro en `customers` (CRM) **Y** en `suppliers` (con `paymentSettings`)
   - ✅ **Sus condiciones de pago SÍ cargan** automáticamente

2. **Virtual Suppliers**: Solo tienen registro en `customers` con `customerType: 'supplier'`
   - ❌ **Sus condiciones de pago NO cargan** porque no tienen registro en `suppliers`

### La Solución

El script automáticamente:
1. Encuentra todos los Virtual Suppliers (proveedores sin registro en `suppliers`)
2. Analiza sus órdenes de compra históricas para extraer:
   - **Métodos de pago** más comunes que han usado
   - **Crédito promedio** (días de crédito típicos)
3. Crea un registro en `suppliers` con esos `paymentSettings`

**Resultado:**
- ✅ Todos los proveedores tendrán `paymentSettings` configurados
- ✅ Las condiciones de pago cargarán automáticamente al seleccionarlos
- ✅ Los métodos de pago reflejan su historial real de transacciones

---

## ¿Es seguro ejecutarlo?

**SÍ, es completamente seguro:**
- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin duplicar datos
- ✅ **No destructivo**: No modifica proveedores existentes, solo crea los faltantes
- ✅ **Basado en historial**: Usa datos reales de órdenes de compra
- ✅ **Manejo de errores**: Si algo falla, continúa con el siguiente proveedor

---

## Cómo ejecutar la migración

### Paso 1: Ubicarse en el directorio del backend
```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas
```

### Paso 2: Ejecutar el script de migración
```bash
node src/scripts/migrate-suppliers-direct.js
```

**IMPORTANTE**: Usa `migrate-suppliers-direct.js` (versión con MongoDB directo), NO `migrate-virtual-suppliers-to-suppliers.ts` (versión con NestJS), para evitar problemas con path aliases.

### Paso 3: Ver el progreso
El script mostrará en tiempo real:
```
🚀 Iniciando migración de Virtual Suppliers a Suppliers...

📦 Encontrados 25 proveedores en CRM

[1/25] Procesando: Distribuidora XYZ, C.A....
  ✅ Creado registro Supplier
     - Métodos de pago: transferencia, zelle, efectivo
     - Crédito promedio: 15 días

[2/25] Procesando: Panadería La Moderna...
  ⏭️  Ya tiene registro en Suppliers

[3/25] Procesando: Quesería Los Andes...
  ✅ Creado registro Supplier
     - Métodos de pago: zelle, binance
     - Crédito promedio: 0 días

...

======================================================================
📊 RESUMEN DE MIGRACIÓN
======================================================================
✅ Proveedores procesados:     25
🆕 Registros Supplier creados: 18
⏭️  Ya existían:                7
❌ Errores:                    0
======================================================================

🎉 Migración completada exitosamente!

💡 Ahora todos los proveedores tienen registros en la colección Suppliers.
   Las condiciones de pago se cargarán automáticamente al seleccionarlos.
```

---

## ¿Qué significa cada símbolo?

- ✅ **Creado registro Supplier**: Se creó un nuevo registro con paymentSettings extraídos del historial
- ⏭️  **Ya tiene registro**: El proveedor ya tenía un registro en Suppliers (se omite)
- ❌ **Error**: Hubo un problema (el script continúa con el siguiente)

---

## ¿Cuánto tarda?

Muy rápido, típicamente:
- 25 proveedores = **~5-10 segundos**
- 100 proveedores = **~20-30 segundos**
- 500 proveedores = **~1-2 minutos**

---

## Verificar resultados

### Antes de la migración:
```javascript
// En ComprasManagement.jsx, al seleccionar un proveedor sin registro:
// - Los campos de métodos de pago quedan vacíos
// - No se muestra toast de "Condiciones de Pago Cargadas"
```

### Después de la migración:
```javascript
// Al seleccionar CUALQUIER proveedor:
// ✅ Se pre-seleccionan sus métodos de pago
// ✅ Se configura crédito si aplica
// ✅ Aparece toast: "Condiciones de Pago Cargadas"
```

### Verificación en la base de datos:
```javascript
// Conectarse a MongoDB y ejecutar:
db.suppliers.find({ tenantId: ObjectId("your-tenant-id") }).count()

// Antes: ~7 registros (solo los editados manualmente)
// Después: ~25 registros (todos los proveedores del CRM)
```

---

## Lógica de extracción de paymentSettings

### 1. Métodos de pago
- Analiza **todas** las órdenes de compra del proveedor
- Cuenta cuántas veces se usó cada método de pago
- **Ordena por frecuencia** (más usado primero)
- Ejemplo:
  ```javascript
  // Si el proveedor tiene 10 órdenes:
  // - 6 órdenes con "transferencia"
  // - 3 órdenes con "zelle"
  // - 1 orden con "efectivo"

  // Resultado: acceptedPaymentMethods: ["transferencia", "zelle", "efectivo"]
  ```

### 2. Crédito
- Filtra órdenes donde `paymentTerms.isCredit === true`
- Calcula el **promedio** de `creditDays`
- Ejemplo:
  ```javascript
  // Si tiene 3 órdenes a crédito:
  // - Orden 1: 15 días
  // - Orden 2: 30 días
  // - Orden 3: 20 días

  // Resultado: defaultCreditDays: 22 (promedio redondeado)
  ```

### 3. Fallback
- Si el proveedor **no tiene órdenes históricas**:
  ```javascript
  paymentSettings: {
    acceptedPaymentMethods: ["efectivo"], // Método default
    acceptsCredit: false,
    defaultCreditDays: 0,
    requiresAdvancePayment: false,
    advancePaymentPercentage: 0,
  }
  ```

---

## ¿Puedo ejecutarlo múltiples veces?

**Sí, sin problema.** El script es idempotente:
- Revisa si ya existe un registro en `suppliers` antes de crear uno nuevo
- Si ya existe → **omite** ese proveedor (muestra ⏭️)
- Si no existe → **crea** el registro

---

## ¿Afecta a las compras futuras?

**No.** Las compras futuras seguirán funcionando exactamente igual:
- Esta migración solo **crea** registros faltantes en `suppliers`
- **No modifica** registros existentes
- **No afecta** órdenes de compra (ni nuevas ni históricas)

---

## Solución de problemas

### Error: "Cannot find module '@nestjs/core'"
```bash
npm install
```

### Error: "Connection refused"
Asegúrate de que MongoDB esté corriendo y que las variables de entorno estén configuradas correctamente en `.env`

### El script se queda colgado
- Revisa que la conexión a MongoDB esté funcionando
- Verifica que no haya problemas de red
- Ctrl+C para cancelar y volver a intentar

### Veo muchos errores en el resumen
- Revisa los mensajes de error arriba en el log
- Probablemente algunos proveedores tienen datos incompletos
- Los errores NO afectan el resto de la migración

### Las condiciones de pago NO cargan después de la migración
**Causa**: tenantId almacenado como ObjectId en lugar de String

**Síntoma**: La migración se ejecuta exitosamente pero las condiciones de pago no se cargan al seleccionar proveedores en el frontend.

**Solución**: Ejecutar el script de corrección global:
```bash
node src/scripts/fix-all-supplier-tenantids.js
```

Este script convierte todos los `tenantId` ObjectId a String, asegurando que las queries del backend funcionen correctamente.

---

## ¿Necesito ejecutar ambas migraciones?

Si tienes órdenes de compra históricas, se recomienda ejecutar **ambas migraciones** en este orden:

### 1. Primero: `migrate-virtual-suppliers-to-suppliers.ts` (esta migración)
**Por qué primero:** Crea los registros Supplier base con paymentSettings

### 2. Segundo: `migrate-historical-supplier-product-links.ts` (migración de enlaces producto-proveedor)
**Por qué segundo:** Vincula productos con proveedores en `Product.suppliers[]`

**Resultado final:**
- ✅ Todos los proveedores tienen `paymentSettings` configurados
- ✅ Todos los productos muestran qué proveedores los venden (con precios)
- ✅ Las condiciones de pago cargan automáticamente al seleccionar proveedores

---

## Código del script

El script está en:
```
src/scripts/migrate-virtual-suppliers-to-suppliers.ts
```

Puedes revisarlo o modificarlo según tus necesidades.

---

¿Preguntas? Revisa el código del script o consulta con el equipo de desarrollo.
