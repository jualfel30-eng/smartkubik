# Guía de Migración: Enlaces Proveedor-Producto desde Compras Históricas

## ¿Qué hace esta migración?

Este script recorre todas las órdenes de compra históricas que ya fueron **recibidas** (status: "received") y automáticamente vincula cada producto con su proveedor en el campo `Product.suppliers[]`.

**Resultado:**
- Los productos mostrarán qué proveedores los venden
- Se guarda el precio de costo de cada proveedor
- Se sincronizan los métodos de pago aceptados
- Se marca el primer proveedor como "preferido"

## ¿Es seguro ejecutarlo?

**SÍ, es completamente seguro:**
- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin duplicar datos
- ✅ **No destructivo**: No elimina ni modifica datos existentes, solo agrega enlaces
- ✅ **Manejo de errores**: Si algo falla, continúa con el siguiente producto
- ✅ **Logging completo**: Muestra progreso detallado de cada operación

## Cómo ejecutar la migración

### Paso 1: Ubicarse en el directorio del backend
```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas
```

### Paso 2: Ejecutar el script de migración
```bash
npx ts-node src/scripts/migrate-historical-supplier-product-links.ts
```

### Paso 3: Ver el progreso
El script mostrará en tiempo real:
```
🚀 Iniciando migración de enlaces proveedor-producto desde compras históricas...

📦 Encontradas 45 órdenes de compra recibidas

[1/45] Procesando orden OC-260314-123456-A1B2...
  ✅ Nuevo enlace: Pan Baguette → Panadería La Moderna
  ✅ Nuevo enlace: Queso Blanco → Quesería Los Andes
  🔄 Actualizado: Leche Entera → Distribuidora XYZ

[2/45] Procesando orden OC-260315-234567-C3D4...
  ✅ Nuevo enlace: Arroz Premium → Importadora ABC
...

======================================================================
📊 RESUMEN DE MIGRACIÓN
======================================================================
✅ Órdenes procesadas:        45
📦 Productos procesados:      127
🆕 Enlaces nuevos creados:    89
🔄 Enlaces actualizados:      38
❌ Errores:                   0
======================================================================

🎉 Migración completada exitosamente!
```

## ¿Qué significa cada símbolo?

- ✅ **Nuevo enlace**: Producto no tenía este proveedor, se agregó por primera vez
- 🔄 **Actualizado**: Producto ya tenía el proveedor, se actualizó el precio
- ❌ **Error**: Hubo un problema (el script continúa con el siguiente)

## ¿Cuánto tarda?

Depende de cuántas compras históricas tengas:
- 50 órdenes con ~3 productos cada una = **~2-3 minutos**
- 200 órdenes con ~5 productos cada una = **~5-10 minutos**
- 500+ órdenes = **~15-20 minutos**

## Verificar resultados

Después de ejecutar la migración:

### 1. En el módulo de Productos:
- Ve a cualquier producto
- Busca la pestaña/sección "Proveedores"
- Deberías ver los proveedores que lo venden con sus precios

### 2. En el módulo de Proveedores:
- Ve a cualquier proveedor
- Busca la sección "Productos"
- Deberías ver todos los productos que ese proveedor vende

### 3. Verificación en la base de datos (opcional):
```javascript
// Conectarse a MongoDB y ejecutar:
db.products.findOne({ name: "Pan Baguette" })

// Deberías ver algo como:
{
  _id: ObjectId("..."),
  name: "Pan Baguette",
  suppliers: [
    {
      supplierId: ObjectId("..."),
      supplierName: "Panadería La Moderna",
      costPrice: 2.50,
      paymentCurrency: "USD",
      acceptedPaymentMethods: ["zelle", "transferencia"],
      isPreferred: true,
      lastUpdated: ISODate("2026-03-18T...")
    }
  ]
}
```

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
- Probablemente algunos productos o proveedores fueron eliminados
- Los errores NO afectan el resto de la migración

## ¿Puedo ejecutarlo múltiples veces?

**Sí, sin problema.** El script es idempotente:
- Si un producto ya tiene un proveedor vinculado → solo actualiza el precio
- Si no lo tiene → lo agrega como nuevo
- **No crea duplicados**

## ¿Afecta a las compras futuras?

**No.** Las compras nuevas seguirán funcionando exactamente igual:
- Cuando recibes una orden → se vincula automáticamente (como siempre)
- Esta migración solo afecta compras **históricas** (del pasado)

## Código del script

El script está en:
```
src/scripts/migrate-historical-supplier-product-links.ts
```

Puedes revisarlo o modificarlo según tus necesidades.

---

¿Preguntas? Revisa el código del script o consulta con el equipo de desarrollo.
