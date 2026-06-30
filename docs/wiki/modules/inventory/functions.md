# Inventario — Catálogo de Funciones

> Todas las funciones del módulo de Inventario, Movimientos y Alertas.
> Última actualización: 2026-04-28

---

## Resumen

| Función | Descripción | Quién la usa | Módulos relacionados |
|---|---|---|---|
| Crear inventario | Registra stock inicial de un producto | Almacenero | Products, Warehouses |
| Listar inventario | Consulta stock con filtros y paginación | Todos | Products |
| Resumen de stock | Stock agrupado por producto y almacén | Admin | Warehouses |
| Ajustar inventario | Corrige cantidad manualmente | Almacenero | — |
| Ajuste masivo (bulk) | Importa Excel y ajusta múltiples productos | Admin | — |
| Reservar inventario | Aparta stock para una orden en proceso | Sistema (POS) | Orders |
| Liberar reserva | Devuelve stock reservado a disponible | Sistema | Orders |
| Confirmar inventario | Descuenta stock definitivamente | Sistema | Orders |
| Agregar stock por compra | Incrementa stock al recibir mercancía | Sistema | Purchases |
| Descontar stock por SKU | Reduce stock por producción/uso | Sistema | Production |
| Transferencia entre almacenes | Mueve stock de un almacén a otro | Almacenero | Warehouses |
| Crear movimiento | Registra un movimiento de inventario | Sistema | — |
| Historial de movimientos | Consulta movimientos con filtros | Admin | — |
| Vista de documentos | Movimientos agrupados por orden/referencia | Admin | — |
| Exportar movimientos | PDF o CSV de movimientos | Admin | — |
| Generar recibo | PDF de comprobante de recepción | Almacenero | — |
| Alertas de stock bajo | Detecta productos bajo el mínimo | Sistema | Events |
| Alertas de vencimiento | Detecta lotes próximos a vencer | Sistema | — |
| Reglas de alerta | CRUD de reglas de notificación | Admin | — |
| Actualizar lotes | Gestiona lotes de un inventario | Almacenero | — |
| Resumen de inventario | KPIs: total, valor, alertas | Dashboard | — |
| Imprimir etiquetas de estante | Genera hoja imprimible de etiquetas de precio por producto | Admin / Cajero | Products |

---

## Crear Inventario

### ¿Qué hace?
Registra la existencia inicial de un producto en el almacén. Si el producto ya tiene inventario, incrementa la cantidad existente en vez de crear un duplicado.

### ¿Cuándo se usa?
Al recibir mercancía por primera vez o al hacer un inventario inicial del negocio.

### Paso a paso
1. El usuario abre "Agregar Inventario" en la pestaña de Inventario
2. Busca y selecciona el producto
3. Si el producto tiene variantes, selecciona la variante y cantidad/costo para cada una
4. Si es perecedero, agrega lotes con número de lote, cantidad, fecha de vencimiento
5. Opcionalmente selecciona almacén y ubicación (bin)
6. El sistema verifica si ya existe inventario para ese producto
7. Si ya existe: incrementa la cantidad. Si no: crea un nuevo registro
8. Asigna automáticamente el almacén por defecto del tenant si no se especifica

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/inventory`
- **Servicio**: `inventory.service.ts → create()`
- **Lógica de auto-merge**: Busca inventario existente por `productId + tenantId`. Si existe y está inactivo, lo reactiva. Si está activo, suma cantidad.
- **Costo promedio**: Al agregar stock, recalcula el costo promedio ponderado
- **Warehouse automático**: Si no se especifica `warehouseId`, busca el almacén por defecto del tenant vía `getDefaultWarehouse()`
- **Permisos**: `inventory_create`

---

## Ajustar Inventario

### ¿Qué hace?
Corrige manualmente la cantidad de un producto cuando el conteo físico no coincide con lo que dice el sistema. Registra un movimiento de ajuste con la razón del cambio.

### ¿Cuándo se usa?
Después de un conteo físico, cuando se detecta daño, merma, o cualquier discrepancia entre el stock real y el del sistema.

### Paso a paso
1. En la tabla de inventario, el usuario hace clic en los botones +/- del producto
2. Ingresa la cantidad a agregar o restar
3. Selecciona la razón: Conteo físico, Daño, Merma, Devolución, Otro
4. El sistema crea un movimiento de tipo "adjustment"
5. Si la nueva cantidad es menor, crea movimiento OUT. Si es mayor, crea IN.
6. Actualiza el balance del inventario

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/inventory/adjust`
- **Servicio**: `inventory.service.ts → adjustInventory()`
- **Validación**: `newQuantity >= 0` (no puede ser negativo)
- **Side effects**: Crea InventoryMovement, actualiza Inventory, evalúa alertas
- **Permisos**: `inventory_update`

---

## Ajuste Masivo (Bulk)

### ¿Qué hace?
Permite actualizar las cantidades de muchos productos de una vez importando un archivo Excel. Útil después de un inventario general.

### ¿Cuándo se usa?
Después de un conteo físico completo del almacén, o cuando se necesita sincronizar el sistema con la realidad de muchos productos.

### Paso a paso
1. El usuario descarga la plantilla Excel desde "Importar"
2. Llena la plantilla: SKU, VariantSKU (opcional), NuevaCantidad, atributos custom
3. Sube el archivo .xlsx
4. El sistema muestra una vista previa de los cambios
5. El usuario selecciona la razón global ("Conteo físico", "Otro", etc.)
6. El sistema procesa cada fila dentro de una transacción MongoDB
7. Si alguna fila falla, toda la operación se revierte

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/inventory/bulk-adjust`
- **Servicio**: `inventory.service.ts → bulkAdjustInventory()`
- **Transacción**: MongoDB session — todo o nada
- **Soporte de atributos**: Si el producto tiene `attributeCombinations`, el ajuste puede dirigirse a una combinación específica
- **Permisos**: `inventory_update`

---

## Reservar / Liberar / Confirmar Inventario

### ¿Qué hace?
Sistema de tres pasos que previene sobreventa:
1. **Reservar**: Al iniciar una orden, mueve stock de "disponible" a "reservado"
2. **Liberar**: Si la orden se cancela, devuelve stock a "disponible"
3. **Confirmar**: Al completar la orden, descuenta definitivamente del stock total

### ¿Cuándo se usa?
Automáticamente por el módulo de Órdenes. El cajero no ve este proceso — ocurre detrás de escena.

### Lo que pasa por detrás (técnico)
- **Reservar**: `POST /api/v1/inventory/reserve` → `reserveInventory()`
  - Mueve de `availableQuantity` a `reservedQuantity`
  - Soporta FEFO (First-Expired-First-Out) para lotes perecederos
  - Default 30 min de expiración
  - Busca inventario por `productSku` o `variantSku` (backward compatible)
- **Liberar**: `POST /api/v1/inventory/release` → `releaseInventory()`
  - Devuelve de `reservedQuantity` a `availableQuantity`
  - Puede liberar todo (sin `productSkus`) o SKUs específicos
- **Confirmar**: `commitInventory()` (llamado internamente por Orders)
  - Reduce `reservedQuantity` y `totalQuantity`
  - Permisos: `inventory_update`

---

## Agregar Stock por Compra

### ¿Qué hace?
Cuando se recibe una orden de compra, esta función incrementa el inventario del producto, actualiza el costo promedio, y sincroniza el costo de la variante en el producto.

### ¿Cuándo se usa?
Automáticamente por el módulo de Compras cuando se ejecuta `receivePurchaseOrder()`.

### Lo que pasa por detrás (técnico)
- **Método**: `inventory.service.ts → addStockFromPurchase(item, user, session?)`
- **Busca inventario** por `productId` (no por SKU — fix del bug de contaminación cruzada)
- **Si no existe**: Crea nuevo inventario con `warehouseId` del item o el almacén por defecto
- **Si existe**: Suma cantidad y recalcula costo promedio ponderado
- **Side effects**: 
  - Actualiza `variant.costPrice` en el Product si cambió
  - Crea movimiento de tipo `in` con referencia a la PO
  - Evalúa alertas
- ⚠️ **Gotcha histórico**: Este método creaba doble stock hasta el fix del 2026-03-14 (el controller también llamaba a `inventoryMovementsService.create` que a su vez sumaba stock)

---

## Transferencia entre Almacenes

### ¿Qué hace?
Mueve una cantidad de un producto desde un almacén (origen) a otro (destino). Crea dos movimientos vinculados: salida en origen y entrada en destino.

### ¿Cuándo se usa?
Cuando una sede necesita mercancía que otra sede tiene en exceso.

### Paso a paso
1. En movimientos, el usuario crea una transferencia
2. Selecciona producto, almacén origen, almacén destino, cantidad
3. Opcionalmente selecciona bins específicos
4. El sistema verifica stock suficiente en origen
5. Crea movimiento OUT en origen (reduce stock)
6. Crea movimiento IN en destino (incrementa stock)
7. Ambos movimientos quedan vinculados por un `transferId` (UUID)

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/inventory-movements/transfers`
- **Servicio**: `inventory-movements.service.ts → createTransfer()`
- **Validación**: Stock suficiente en origen, almacenes diferentes
- **Vinculación**: `transferId` (UUID) + `linkedMovementId` (ObjectId)
- **Permisos**: `inventory_write`

---

## Alertas de Stock Bajo

### ¿Qué hace?
Evalúa automáticamente si el stock de un producto ha caído por debajo del umbral configurado. Si es así, dispara una notificación.

### ¿Cuándo se usa?
Automáticamente cada vez que cambia el stock de un producto (compra, venta, ajuste, transferencia).

### Lo que pasa por detrás (técnico)
- **Método**: `inventory-alerts.service.ts → evaluateForInventory(inventory, user)`
- **Lógica**: Busca reglas activas para el productId (global + por almacén). Si `availableQuantity <= minQuantity` → dispara
- **Debounce**: 6 horas entre disparos de la misma regla (evita spam)
- **Side effects**: Emite evento `inventory.alert.triggered` + crea evento vía EventsService
- **Pipeline alternativo**: `getLowStockAlerts()` compara `totalQuantity` del inventario contra `minimumStock` del producto (del `inventoryConfig`)

---

## Generar Recibo PDF

### ¿Qué hace?
Genera un comprobante PDF profesional para un movimiento de inventario (típicamente una recepción de mercancía).

### ¿Cuándo se usa?
Cuando el almacenero necesita un comprobante físico de lo que se recibió, para firmar o archivar.

### Contenido del PDF
- Header con logo, nombre del negocio, RIF, ciudad
- Datos del movimiento: ID, fecha, tipo, razón, referencia
- Panel de recepción: quién recibió, notas
- Tabla de producto: SKU, nombre, cantidad, costo unitario, costo total
- Balance después: total, disponible, reservado, costo promedio
- Líneas de firma
- Footer con timestamp

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/inventory/movements/:id/receipt`
- **Servicio**: `inventory-receipt-pdf.service.ts → generateReceipt()`
- **Permisos**: `inventory_read`

---

## Exportar Movimientos

### ¿Qué hace?
Exporta el historial de movimientos de inventario a PDF o CSV con filtros aplicados.

### Formatos
- **PDF**: Tabla con encabezados, totales de entradas/salidas/neto, branding del negocio
- **CSV**: UTF-8 con BOM (compatible con Excel), columnas: Fecha, Tipo, SKU, Producto, Cantidad, Costo Unitario, Costo Total, Razón, Referencia, Notas, Almacén

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/inventory-movements/export?format=pdf|csv`
- **Presets de fecha**: today, yesterday, this_week, last_week, this_month, last_month, custom
- **Permisos**: `inventory_read`

---

## Resumen de Inventario (KPIs)

### ¿Qué hace?
Calcula métricas globales del inventario del tenant para el dashboard.

### Métricas
- **Total de productos**: Productos distintos con inventario activo
- **Productos con stock bajo**: Donde `totalQuantity < product.inventoryConfig.minimumStock`
- **Productos con vencimiento**: Lotes que vencen en los próximos N días
- **Valor total del inventario**: `Σ(totalQuantity × averageCostPrice)` de todos los productos

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/inventory/reports/summary`
- **Servicio**: `inventory.service.ts → getInventorySummary()`
- **Permisos**: `inventory_read`

---

## Imprimir Etiquetas de Estante

### ¿Qué hace?
Genera una hoja imprimible (A4) con etiquetas de precio para colocar en estante. Cada etiqueta muestra: logo/nombre de la tienda, nombre del producto, marca, SKU, precio y la referencia de moneda. El usuario elige los productos, configura qué se muestra, y obtiene un PDF listo para imprimir.

### ¿Cuándo se usa?
Al reponer mercancía en sala o al actualizar precios, para imprimir las etiquetas de góndola de varios productos de una vez.

### Paso a paso
1. Desde la pestaña de Inventario, el usuario abre el **Asistente de Impresión de Etiquetas**
2. **Paso 1** — selecciona los productos (con filtros por categoría/subcategoría/proveedor). Si un producto tiene **unidades de venta múltiple**, puede elegir imprimir una etiqueta por cada unidad
3. **Paso 2 (Configuración)** — moneda (VES/REF) y tasa, y los toggles: Mostrar Marca, Fecha, Logo, SKU, y **Mostrar unidad de venta** (ver abajo)
4. **Paso 3** — vista previa de la hoja y botón **Imprimir** (abre el diálogo de impresión del navegador)

### Toggle "Mostrar unidad de venta"
- **Solo aparece** si la selección incluye al menos un producto con unidades de venta múltiple (`hasMultipleSellingUnits`). Si todas son de unidad base, el toggle no se renderiza para no confundir.
- **Default: apagado.** Las unidades de venta múltiple son control interno del tenant y **no deben salir al cliente final**. Con el toggle apagado la etiqueta muestra solo el nombre del producto y `REF` (sin la unidad).
- **Encendido**: añade la unidad entre paréntesis en el nombre (ej. `Leche evaporada 410grs (Lata de 410 grs)`) y la abreviatura en la línea de referencia (`REF/LATA 410 GRS`). Útil solo cuando un producto tiene varias unidades distintas y hay que diferenciar las etiquetas.
- El toggle gobierna **ambas** apariciones de la unidad a la vez; nunca queda duplicada sin control. (Antes de jun-2026 la unidad se imprimía siempre, llegando a aparecer hasta 3 veces por etiqueta, duplicando info ya presente en el nombre.)

### Lo que pasa por detrás (técnico)
- **Frontend-only** (no hay endpoint propio; los productos vienen de la API de Products/Inventory).
- **Componentes**: `food-inventory-admin/src/components/inventory/ShelfLabelWizard.jsx` (asistente, selección, config) y `ShelfLabelSheet.jsx` (render imprimible de la hoja).
- **Composición del nombre/unidad**: se decide en tiempo de render en `ShelfLabelSheet` según `config.showSellingUnit`; el nombre base y la unidad se guardan por separado en el item (`productName`, `sellingUnitName`, `sellingUnitAbbr`), no se hornean al seleccionar — así el toggle actualiza la vista previa al instante.
- **Permisos**: acceso al módulo de Inventario.

---

*Última actualización: 2026-06-30*
*Archivos fuente: `inventory.controller.ts`, `inventory.service.ts`, `inventory-movements.controller.ts`, `inventory-movements.service.ts`, `inventory-alerts.controller.ts`, `inventory-alerts.service.ts`, `food-inventory-admin/src/components/inventory/ShelfLabelWizard.jsx`, `ShelfLabelSheet.jsx`*
