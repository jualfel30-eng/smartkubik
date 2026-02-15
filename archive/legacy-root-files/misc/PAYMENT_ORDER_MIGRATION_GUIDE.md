# 🔗 Guía: Migración de Vínculos Pago-Orden

## 📋 Problema Identificado

Después de que Gemini borró la base de datos el 18 de diciembre de 2025, se restauró el backup del 15 de noviembre. Sin embargo, el módulo de **Cuentas por Cobrar** dejó de funcionar correctamente.

### ¿Por qué falló el módulo?

El sistema SmartKubik tiene una arquitectura específica para vincular pagos con órdenes:

```
Payment (Pago)
   ├── allocations[] (asignaciones)
   │    ├── documentId: ObjectId (referencia a Order)
   │    ├── documentType: "order"
   │    └── amount: number
   │
Order (Orden)
   ├── payments[] (array de ObjectId → Payment)
   ├── paidAmount: number (suma de todos los pagos)
   └── paymentStatus: "pending" | "partial" | "paid"
```

**El problema:**
- Los **pagos** se restauraron del backup ✅
- Las **órdenes** se restauraron del backup ✅
- Las **asignaciones** (`payment.allocations[]`) se restauraron ✅
- **PERO** los vínculos bidireccionales (`order.payments[]`, `order.paidAmount`, `order.paymentStatus`) **NO** se recalcularon ❌

### ¿Por qué no se recalcularon?

El backup restauró los datos en el estado del 15 de noviembre, pero entre el 15 de noviembre y el 18 de diciembre **se crearon nuevos pagos y asignaciones** que NO estaban en el backup.

Además, el sistema normalmente vincula pagos a órdenes cuando se ejecuta el endpoint:
```
POST /payments/:id/apply
```

Pero este endpoint NO se ejecuta automáticamente al restaurar un backup. Es una operación manual que ocurre cuando el usuario asigna un pago a una orden desde el frontend.

## 🔧 Solución: Migración Automática

Se creó una migración que reconstruye todos los vínculos payment-order basándose en los datos existentes.

### Archivos Creados

1. **Migración**: `food-inventory-saas/src/database/migrations/link-payments-to-orders.migration.ts`
   - Lee todos los pagos con `allocations[]`
   - Para cada asignación tipo "order", vincula el pago a la orden
   - Recalcula `order.paidAmount` sumando todas las asignaciones
   - Actualiza `order.paymentStatus` según el monto pagado

2. **Script ejecutor**: `scripts/run-payment-order-migration.sh`
   - Script interactivo para ejecutar la migración fácilmente
   - Verifica que el backend esté corriendo
   - Solicita token JWT de super admin
   - Ejecuta el endpoint `POST /migrations/link-payments-to-orders`

## 🚀 Cómo Ejecutar la Migración

### Opción 1: Script Interactivo (Recomendado)

```bash
./scripts/run-payment-order-migration.sh
```

El script te guiará paso a paso:
1. Verifica que el backend esté corriendo
2. Te pide el JWT token de super admin
3. Ejecuta la migración
4. Muestra los resultados

### Opción 2: Manualmente con cURL

1. **Inicia el backend** (si no está corriendo):
   ```bash
   cd food-inventory-saas
   npm run start:dev
   ```

2. **Obtén tu JWT token**:
   - Ve a http://localhost:5173
   - Inicia sesión como super admin
   - Abre DevTools (F12)
   - Ve a: Application > Local Storage > http://localhost:5173
   - Copia el valor de `token`

3. **Ejecuta la migración**:
   ```bash
   curl -X POST http://localhost:3001/migrations/link-payments-to-orders \
     -H "Authorization: Bearer TU_JWT_TOKEN_AQUI" \
     -H "Content-Type: application/json"
   ```

### Opción 3: Desde Swagger/Postman

1. Ve a http://localhost:3001/api (Swagger UI)
2. Autentícate con tu JWT token
3. Busca el endpoint: `POST /migrations/link-payments-to-orders`
4. Click en "Try it out" → "Execute"

## 📊 Qué Hace la Migración

La migración ejecuta los siguientes pasos:

### Paso 1: Resetear Órdenes
```
Limpia los campos:
- order.payments = []
- order.paidAmount = 0
- order.paymentStatus = "pending"
```

### Paso 2: Procesar Pagos con Allocations
```
Para cada pago:
  Para cada allocation donde documentType = "order":
    - Agregar payment._id a order.payments[]
    - Sumar allocation.amount a order.paidAmount
```

### Paso 3: Calcular Estados de Pago
```
Para cada orden:
  Si paidAmount >= totalAmount:
    paymentStatus = "paid"
  Sino si paidAmount > 0:
    paymentStatus = "partial"
  Sino:
    paymentStatus = "pending"
```

### Paso 4: Procesar Pagos Legacy
```
Para pagos con payment.orderId (sin allocations):
  - Vincular directamente a la orden
  - Actualizar montos y estado
```

## 📈 Resultado Esperado

Después de ejecutar la migración, verás un log como este:

```
🔄 Iniciando migración: Link Payments to Orders
📋 Paso 1: Limpiando datos antiguos en órdenes...
   ✅ 81 órdenes reseteadas
📋 Paso 2: Buscando pagos con asignaciones a órdenes...
   🔍 Encontrados 36 pagos con allocations
   ✅ 36 pagos procesados
   📊 20 órdenes afectadas
📋 Paso 4: Actualizando órdenes con pagos vinculados...
   ✓ Orden ORD-251002-182420-0203: 2 pagos, $66.46 pagado, status: paid
   ✓ Orden ORD-251006-222620-0380: 1 pago, $424.56 pagado, status: paid
   ...
📋 Paso 5: Procesando pagos legacy con orderId directo...
   🔍 Encontrados 0 pagos legacy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MIGRACIÓN COMPLETADA: Link Payments to Orders
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Estadísticas:
   - Órdenes reseteadas: 81
   - Pagos procesados: 36
   - Órdenes actualizadas: 20
   - Pagos legacy vinculados: 0
   - Errores: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## ✅ Verificación

Después de ejecutar la migración:

1. **Ve al módulo de Cuentas por Cobrar**:
   - http://localhost:5173/accounting/reports/accounts-receivable

2. **Deberías ver**:
   - ✅ Órdenes con pagos pendientes o parciales
   - ✅ Montos correctos en "Monto Pagado"
   - ✅ Saldos calculados correctamente
   - ✅ Estados de pago actualizados (paid/partial/pending)

3. **Ejecuta el script de diagnóstico**:
   ```bash
   ./scripts/diagnose-accounts-receivable.sh
   ```

   Deberías ver que las órdenes ahora tienen el campo `payments` poblado:
   ```
   📦 Orden #ORD-251002-182420-0203
      Pagos (array length): 2  ← Antes era 2, ahora sigue siendo 2 ✅
   ```

## 🔍 Diagnóstico de Problemas

### Problema: "order.payments[] sigue vacío"

**Causa**: Los pagos no tienen allocations, o las allocations no tienen `documentType: "order"`

**Solución**:
```bash
# Verifica la estructura de un pago
mongosh "$MONGODB_URI" --eval "db.payments.findOne({ allocations: { \$exists: true } })"
```

### Problema: "Migration failed: Unauthorized"

**Causa**: Token JWT inválido o expirado

**Solución**: Obtén un nuevo token siguiendo los pasos de la Opción 2

### Problema: "Backend no responde"

**Causa**: El backend no está corriendo

**Solución**:
```bash
cd food-inventory-saas
npm run start:dev
```

## 📚 Documentación Técnica

### Endpoint de Migración

```typescript
POST /migrations/link-payments-to-orders
Headers:
  Authorization: Bearer {JWT_TOKEN}
  Content-Type: application/json

Response (Success):
{
  "success": true,
  "message": "Payments linked to orders migration completed successfully"
}
```

### Código Fuente

- **Migración**: [link-payments-to-orders.migration.ts](food-inventory-saas/src/database/migrations/link-payments-to-orders.migration.ts)
- **Controller**: [migrations.controller.ts:94-110](food-inventory-saas/src/database/migrations/migrations.controller.ts#L94-L110)
- **Module**: [migrations.module.ts](food-inventory-saas/src/database/migrations/migrations.module.ts)

## ⚠️ Advertencias

1. **Esta migración ES IDEMPOTENTE**: Puedes ejecutarla múltiples veces sin problemas
2. **NO PIERDE DATOS**: Solo recalcula vínculos basándose en datos existentes
3. **REQUIERE PERMISOS DE SUPER ADMIN**: Solo usuarios super admin pueden ejecutarla
4. **IMPACTO EN PRODUCCIÓN**: La migración procesa TODAS las órdenes y pagos del sistema

## 🎯 Resumen

**Problema**: Cuentas por Cobrar no mostraba órdenes después de restaurar backup

**Causa**: Los vínculos payment-order no se reconstruyeron al restaurar

**Solución**: Migración automática que recalcula todos los vínculos

**Resultado**: Módulo de Cuentas por Cobrar funcionando correctamente

---

**Última actualización**: 19 de diciembre de 2025
**Autor**: Claude Code
**Contexto**: Recuperación post-borrado de base de datos por Gemini
