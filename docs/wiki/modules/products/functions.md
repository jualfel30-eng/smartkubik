# Productos — Catálogo de Funciones

> Todas las funciones/acciones disponibles en el módulo de Productos.
> Última actualización: 2026-04-28

---

## Resumen

| Función | Descripción | Quién la usa | Módulos relacionados |
|---|---|---|---|
| Crear producto | Registra un nuevo producto con variantes | Administrador | Tenant (límites) |
| Crear producto con compra inicial | Crea producto + proveedor + orden de compra + recepción en un paso | Administrador | Purchases, Inventory, Suppliers |
| Crear productos masivamente | Importa múltiples productos en una transacción | Administrador | Tenant (límites) |
| Listar productos | Busca y filtra productos con paginación | Todos los roles | Inventory (stock opcional) |
| Ver producto | Consulta el detalle completo de un producto | Todos los roles | — |
| Buscar por código de barras | Encuentra producto escaneando un barcode | Cajero, Almacenero | — |
| Actualizar producto | Modifica datos, precios, variantes, SKU | Administrador | Price History, Price Lists, Inventory |
| Eliminar producto | Borra un producto del catálogo | Administrador | Tenant (usage) |
| Vincular proveedor | Agrega un proveedor al producto | Administrador | Suppliers |
| Listar categorías | Obtiene categorías únicas del catálogo | Todos | — |
| Listar subcategorías | Obtiene subcategorías (opcionalmente por categoría) | Todos | — |
| Escanear etiqueta (IA) | Extrae datos de producto desde fotos de etiquetas | Administrador | OpenAI |
| Ver historial de precios | Consulta cambios históricos de precio | Administrador | Price History |
| Calcular precio con descuentos | Obtiene precio final con ubicación y volumen | Sistema/POS | — |

---

## Crear Producto

### ¿Qué hace?
Registra un nuevo producto en el catálogo del negocio con toda su información: nombre, marca, categoría, al menos una variante con precios, configuración de inventario, y datos fiscales.

### ¿Cuándo se usa?
Cuando el negocio incorpora un nuevo artículo a su catálogo — ya sea mercancía para vender, materia prima para producción, consumible, o suministro.

### Paso a paso
1. El usuario hace clic en "+ Agregar Producto" en la pantalla de Inventario → Productos
2. Llena el formulario: nombre, marca, categoría, tipo de producto, imágenes (máx. 3, comprimidas a 500KB)
3. Configura al menos una variante con precio de costo y precio de venta
4. Opcionalmente habilita múltiples unidades de venta (ej: vender por kg cuando se compra por sacos)
5. Configura stock mínimo/máximo y punto de reorden
6. El sistema genera el SKU automáticamente si no se proporciona (patrón: `{3 letras del tenant}-{número}`)
7. El sistema valida que el código de barras sea único en todo el tenant
8. El sistema verifica que el tenant no haya alcanzado su límite de productos (según su plan)
9. Se guarda el producto y se incrementa el contador de uso del tenant

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/products`
- **Servicio**: `products.service.ts → create()`
- **Validaciones**:
  - Tenant existe y está confirmado
  - `tenant.usage.currentProducts < tenant.limits.maxProducts`
  - `tenant.usage.currentStorage` no excede límite con nuevas imágenes
  - SKU único por tenant (si se proporciona)
  - Barcodes únicos por tenant (índice parcial, solo no-vacíos)
  - Si `productType=SIMPLE`, no puede tener `UnitConversion` configurado
- **Efectos secundarios**:
  - Incrementa `tenant.usage.currentProducts` en 1
  - Incrementa `tenant.usage.currentStorage` por el tamaño de imágenes
  - Auto-genera SKUs para variantes (variante 0 = SKU del producto, demás = `{SKU}-VAR{N}`)
  - Procesa estrategia de precios (markup/margin) si está configurada
- **Permisos requeridos**: `products_create`

### Errores comunes
| Error | Causa | Solución |
|---|---|---|
| "Has alcanzado el límite de productos" | Plan del tenant excedido | Actualizar plan de suscripción |
| "SKU ya existe" | Otro producto usa ese SKU | Cambiar el SKU o dejar vacío para auto-generar |
| "Barcode duplicado" | Otro producto tiene ese código de barras | Verificar que el barcode es correcto |

---

## Crear Producto con Compra Inicial

### ¿Qué hace?
Crea un producto nuevo Y al mismo tiempo genera una orden de compra con un proveedor, la recibe automáticamente, y actualiza el inventario — todo en un solo paso.

### ¿Cuándo se usa?
Cuando un proveedor entrega mercancía nueva que el negocio nunca ha manejado antes. En vez de crear el producto, luego ir a compras, luego crear la orden y recibirla, todo se hace en un formulario.

### Paso a paso
1. El usuario elige "Nuevo Producto con Compra" en la interfaz
2. Llena datos del producto (nombre, marca, categoría, variante, precios)
3. Selecciona un proveedor existente O crea uno nuevo (nombre, RIF, contacto)
4. Indica cantidad recibida, precio de costo, lote, fecha de vencimiento
5. Configura condiciones de pago (contado/crédito, moneda, métodos)
6. El sistema: crea el producto → vincula al proveedor → crea la orden de compra → la recibe automáticamente → actualiza inventario

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/products/with-initial-purchase`
- **Servicio**: `products.service.ts → createWithInitialPurchase()`
- **Validaciones**: Mismas del create() + validación del proveedor
- **Efectos secundarios**:
  - Crea el producto (mismos efectos que create())
  - Crea o resuelve el proveedor vía `CustomersService`
  - Crea la orden de compra vía `PurchasesService.create()`
  - Recibe la orden vía `PurchasesService.receivePurchaseOrder()`
  - La recepción crea: inventario + movimiento de inventario + cuenta por pagar (si es crédito)
- **Permisos requeridos**: `products_create`

---

## Crear Productos Masivamente (Bulk Import)

### ¿Qué hace?
Permite cargar decenas de productos de una vez desde un archivo Excel. Cada producto se crea individualmente dentro de una transacción de MongoDB — si uno falla, se revierten todos.

### ¿Cuándo se usa?
Al iniciar el uso del sistema y necesitar cargar el catálogo completo, o al incorporar una línea nueva de productos de un proveedor.

### Paso a paso
1. El usuario descarga la plantilla Excel desde el toolbar de productos
2. Llena la plantilla con los datos de cada producto (SKU, nombre, marca, precios, etc.)
3. Sube el archivo .xlsx desde "Importar productos"
4. El sistema procesa cada fila como un producto con una variante
5. Si todo va bien, se crean todos los productos. Si alguno falla, ninguno se crea.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/products/bulk`
- **Servicio**: `products.service.ts → bulkCreate()`
- **Transacción**: MongoDB session — commit all o abort all
- **Defaults aplicados automáticamente**: unitOfMeasure="unidad", inventoryConfig con stocks predeterminados (min:10, max:100, reorder:20, qty:50)
- **Permisos requeridos**: `products_create`

### Errores comunes
| Error | Causa | Solución |
|---|---|---|
| "Error en producto X (SKU: Y): ..." | Fallo en un producto específico. Toda la importación se revierte | Corregir el producto problemático y reintentar toda la carga |

---

## Listar Productos

### ¿Qué hace?
Busca y filtra productos del catálogo con paginación, búsqueda por texto, y múltiples filtros.

### ¿Cuándo se usa?
Prácticamente siempre — al ver el catálogo, buscar un producto en el POS, filtrar por categoría, etc.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/products`
- **Servicio**: `products.service.ts → findAll()`
- **Búsqueda avanzada**: Soporta búsqueda multi-palabra no contigua. Busca en: `name`, `brand`, `sku`, `variants.name`, `variants.sku`, `variants.barcode`
- **Filtros**: category (regex), brand, productType, isActive, supplierId, ids específicos
- **Ordenamiento**: name, category, createdAt, updatedAt, sku, brand, price, cost
- **Paginación**: Default 20 por página, máximo 20,000
- **Stock opcional**: Si se solicita, adjunta `availableQuantity`, `totalQuantity`, `lots` de Inventory
- **Filtro de stock**: `minAvailableQuantity` pre-filtra productos con stock insuficiente
- **Permisos requeridos**: `products_read`

---

## Buscar por Código de Barras

### ¿Qué hace?
Encuentra un producto y su variante específica a partir de un código de barras escaneado.

### ¿Cuándo se usa?
En el punto de venta (POS), al recibir mercancía, o al hacer conteo de inventario — el usuario escanea el barcode con la cámara del dispositivo.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/products/lookup/barcode/:barcode`
- **Servicio**: `products.service.ts → findByBarcode()`
- **Retorna**: `{ product, variant }` — el producto con campos limitados y la variante exacta que coincide con el barcode
- **Permisos requeridos**: `products_read`

---

## Actualizar Producto

### ¿Qué hace?
Modifica cualquier campo del producto: nombre, precios, variantes, SKU, categorías, imágenes, configuración fiscal, etc.

### ¿Cuándo se usa?
Cuando cambia el precio de un producto, se agrega una nueva variante, se corrige información, o se actualizan imágenes.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `PATCH /api/v1/products/:id`
- **Servicio**: `products.service.ts → update()`
- **Efectos secundarios**:
  - Si cambia el SKU: se propaga a `Inventory.productSku` y `InventoryMovement.productSku`
  - Si cambian precios (basePrice, costPrice, wholesalePrice): se registra en `PriceHistoryService`
  - Si hay `customPrices` en variantes: se sincronizan a `PriceListsService`
  - Se recalcula el uso de storage del tenant si cambian las imágenes
- **Permisos requeridos**: `products_update`
- **Frontend**: Soporta edición inline (precios y categoría editables directamente en la tabla, con undo de 4 segundos)

---

## Escanear Etiqueta con IA

### ¿Qué hace?
Toma 1 a 3 fotos de la etiqueta de un producto y usa inteligencia artificial (GPT-4o-mini) para extraer automáticamente: nombre, marca, ingredientes, alérgenos, vida útil, temperatura de almacenamiento, categoría y más.

### ¿Cuándo se usa?
Cuando se quiere agilizar la carga de productos nuevos — en vez de escribir todo a mano, se toman fotos de la etiqueta y el sistema llena los campos automáticamente.

### Paso a paso
1. El usuario hace clic en "Escanear Etiqueta" en el toolbar
2. Toma 1 a 3 fotos de la etiqueta del producto (máx. 5MB c/u, formatos: JPEG, PNG, WebP, HEIC)
3. El sistema comprime las imágenes (1600×2200, JPEG 75%)
4. Envía las imágenes a OpenAI GPT-4o-mini con un prompt especializado
5. La IA extrae toda la información disponible en la etiqueta
6. El sistema intenta hacer match de la categoría extraída con las categorías existentes del tenant
7. Retorna los datos extraídos con un porcentaje de confianza
8. Los datos se usan para pre-llenar el formulario de creación de producto

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/products/scan-label`
- **Servicio**: `products.service.ts → scanProductLabel()`
- **IA**: OpenAI GPT-4o-mini, temperature 0.1, max_tokens 2000
- **Compresión**: sharp (resize + JPEG quality 75)
- **Permisos requeridos**: `products_create`

---

## Vincular Proveedor a Producto

### ¿Qué hace?
Agrega un proveedor a la lista de proveedores de un producto, con su precio de costo, tiempo de entrega, y cantidad mínima de pedido.

### ¿Cuándo se usa?
Cuando se descubre que un nuevo proveedor puede suministrar un producto existente, o cuando se quiere registrar las condiciones comerciales de un proveedor.

### Lo que pasa por detrás (técnico)
- **Endpoint**: `POST /api/v1/products/:id/suppliers`
- **Servicio**: `products.service.ts → addSupplier()`
- **Validaciones**: Proveedor no duplicado, producto existe
- **Si `isPreferred=true`**: Desactiva `isPreferred` en todos los demás proveedores del producto
- **Permisos requeridos**: `products_update`

---

## Calcular Precio con Descuentos

### ¿Qué hace?
Calcula el precio final de una variante considerando precios por ubicación y descuentos por volumen.

### ¿Cuándo se usa?
Internamente por el POS y el storefront para mostrar el precio correcto según la sede y la cantidad.

### Resolución de precio (orden de prioridad)
1. **Precio por ubicación**: Si se indica `locationId` y existe `locationPricing` activo → usa ese precio
2. **Descuento por volumen**: Si se indica `quantity` y existe un `volumeDiscount` aplicable → aplica descuento
3. **Precio base**: Usa `variant.basePrice` como fallback

### Lo que pasa por detrás (técnico)
- **Endpoint**: `GET /api/v1/products/:id/variant/:variantSku/price?locationId=&quantity=`
- **Respuesta**: `{ productId, variantSku, basePrice, finalPrice, priceSource, locationId, quantity }`
- **`priceSource`**: `"base"`, `"location"`, `"volume_fixed"`, o `"volume_discount"`
- **Permisos requeridos**: `products:read`

---

## Endpoints Públicos (Storefront)

Estos endpoints NO requieren autenticación y son usados por la tienda online.

| Endpoint | Descripción | Filtros especiales |
|---|---|---|
| `GET /api/v1/public/products` | Lista productos para storefront | Solo `productType=SIMPLE`, excluye consumibles, requiere stock > 0 |
| `GET /api/v1/public/products/:id` | Detalle de producto público | Requiere `tenantId` como query param |
| `GET /api/v1/public/products/categories/list` | Categorías públicas | Solo de productos activos tipo SIMPLE |

---

*Última actualización: 2026-04-28*
*Archivos fuente: `products.controller.ts`, `products-public.controller.ts`, `products.service.ts`*
