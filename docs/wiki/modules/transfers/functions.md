# Transferencias y Almacenes — Catálogo de Funciones

> Funciones de Transfer Orders y Warehouses.
> Última actualización: 2026-04-28

---

## Resumen — Transferencias

| Función | Descripción | Quién |
|---|---|---|
| Crear transferencia | Crea orden borrador (PUSH) | Almacenero origen |
| Crear solicitud (PULL) | Destino solicita mercancía | Almacenero destino |
| Solicitar aprobación | Borrador → Solicitado | Almacenero |
| Aprobar transferencia | Solicitado → Aprobado (con ajuste de cantidades) | Admin |
| Aprobar solicitud PULL | Origen aprueba solicitud del destino | Admin origen |
| Rechazar solicitud PULL | Origen rechaza solicitud | Admin origen |
| Marcar en preparación | Aprobado → En Preparación | Almacenero |
| Despachar (dispatch) | En Preparación → En Tránsito (**descuenta inventario**) | Almacenero origen |
| Recibir | En Tránsito → Recibido/Parcial (**incrementa inventario**) | Almacenero destino |
| Reportar discrepancia | Documenta diferencias con evidencia | Almacenero destino |
| Despacho express | Borrador → En Tránsito en un solo clic | Almacenero |
| Cancelar | Cancela antes del despacho | Admin |
| Revertir a borrador | Deshace solicitud/aprobación | Admin |

## Resumen — Almacenes

| Función | Descripción |
|---|---|
| Crear almacén | Registra almacén con código, nombre, ubicación |
| Listar almacenes | Lista con filtros (activo, tenant, cross-tenant) |
| Actualizar almacén | Edita datos, gestiona default |
| Eliminar almacén | Soft delete |
| Crear bin location | Ubicación específica dentro del almacén |
| Listar bins | Lista bins por almacén con filtros |
| Actualizar bin | Edita ubicación, tipo, capacidad |
| Eliminar bin | Soft delete |
| Actualizar ocupación | Incrementa/decrementa uso de una ubicación |

---

## Despachar Transferencia (dispatch) — Operación Crítica

### ¿Qué hace?
Envía la mercancía del almacén origen al destino. **Esta operación descuenta el inventario del origen y es irreversible.**

### ¿Cuándo se usa?
Cuando la mercancía está empacada y lista para enviarse al otro almacén/sede.

### Paso a paso
1. El almacenero marca la orden como "En Preparación"
2. Prepara los items físicamente
3. Hace clic en "Despachar" (o usa "Enviar Ahora" para todo el flujo express)
4. El sistema verifica stock disponible en el almacén origen
5. Por cada item:
   - Convierte la cantidad a unidad base usando `conversionFactor`
   - Busca el inventario del producto en el almacén origen
   - Verifica que `availableQuantity >= quantityInBaseUnit`
   - Descuenta del inventario
   - Crea movimiento de tipo TRANSFER OUT
6. Cambia status a `IN_TRANSIT`
7. Si se proporcionó tracking, lo guarda

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/transfer-orders/:id/dispatch`
- **Servicio**: `transfer-orders.service.ts → ship()`
- **Validación**: Solo desde `IN_PREPARATION` (o estados aprobados si se normaliza legacy)
- **Autorización**: Solo el tenant de origen puede despachar
- **Query de inventario**: Usa `productId: { $in: [ObjectId, String, toString()] }` para manejar tipo mixto
- **Fallback**: Si no encuentra inventario con `warehouseId`, busca sin warehouseId (registros antiguos) y le asigna
- **Filtro**: `isActive: { $ne: false }, isDeleted: { $ne: true }` (maneja undefined)
- **Conversión**: `baseQty = item.conversionFactor ? qty × conversionFactor : qty`
- **Movimiento**: Tipo `TRANSFER`, con `transferId` (UUID), `sourceWarehouseId`, `destinationWarehouseId`, `balanceAfter`

### Qué puede salir mal
| Error | Causa | Solución |
|---|---|---|
| "No existe inventario del producto X en el almacén origen" | Inventario no encontrado (tipo mixto de productId) | Verificar que el producto tiene inventario en ese almacén |
| "Stock insuficiente" | `availableQuantity < baseQty` | Reducir cantidad o esperar reabastecimiento |

---

## Recibir Transferencia — Operación Crítica

### ¿Qué hace?
Confirma la recepción de mercancía en el almacén destino. **Incrementa el inventario del destino y detecta discrepancias automáticamente.**

### ¿Cuándo se usa?
Cuando la mercancía llega al almacén de destino y se verifica contra lo enviado.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/transfer-orders/:id/receive`
- **Servicio**: `transfer-orders.service.ts → receive()`
- **Autorización**: Solo el tenant de destino puede recibir
- **Por cada item recibido**:
  1. Busca item correspondiente en la orden
  2. Valida `receivedQuantity ≤ shippedQuantity`
  3. Para cross-tenant: busca producto por SKU en el tenant destino
  4. Busca o crea inventario en el almacén destino
  5. Convierte cantidad a unidad base
  6. Incrementa `totalQuantity` y `availableQuantity`
  7. Crea movimiento TRANSFER IN con mismo `transferId` del OUT
- **Detección de discrepancias**: Si `received < shipped` → auto-genera discrepancia con razón "Faltante: X unidades"
- **Status final**: `RECEIVED` si todo coincide, `PARTIALLY_RECEIVED` si hay faltantes

---

## Despacho Express ("Enviar Ahora")

### ¿Qué hace?
Encadena todos los pasos del flujo en una sola acción: crea → solicita → aprueba → prepara → despacha.

### ¿Cuándo se usa?
Para transferencias urgentes que no necesitan pasar por el flujo de aprobación.

### Lo que pasa por detrás (frontend)
- El frontend ejecuta secuencialmente cada endpoint:
  1. `POST /transfer-orders` (crear)
  2. `POST /transfer-orders/:id/request` (solicitar)
  3. `POST /transfer-orders/:id/approve` (aprobar)
  4. `POST /transfer-orders/:id/prepare` (preparar)
  5. `POST /transfer-orders/:id/dispatch` (despachar)
- Si algún paso falla, la orden queda en el último estado exitoso
- Muestra toast "Procesando transferencia express..."

---

## Crear Almacén

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/warehouses`
- **Validaciones**: Código único por tenant, nombre requerido
- **Si `isDefault=true`**: Limpia el flag en todos los demás almacenes del tenant
- **Soft delete**: Usa `isDeleted: false` como estado normal

---

## Crear Bin Location

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/bin-locations`
- **Validaciones**: Código + warehouseId requeridos, código único dentro del almacén
- **Tipos**: `picking` (default), `bulk`, `receiving`, `shipping`, `quarantine`
- **Capacidad**: `maxCapacity` opcional, `currentOccupancy` inicia en 0

---

*Última actualización: 2026-04-28*
*Archivos fuente: `transfer-orders.service.ts`, `warehouses.service.ts`, `bin-locations.service.ts`*
