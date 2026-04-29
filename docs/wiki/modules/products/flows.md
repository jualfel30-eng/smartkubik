# Productos — Flujos de Operación

> Diagramas de secuencia para los flujos principales del módulo de Productos.
> Última actualización: 2026-04-28

---

## Flujo 1: Crear Producto Simple

### Descripción
El flujo más básico: un administrador crea un nuevo producto en el catálogo con al menos una variante.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Admin
    participant F as 🖥️ Frontend
    participant API as ⚙️ Controller
    participant S as 📦 ProductsService
    participant DB as 🗄️ MongoDB

    U->>F: Clic "+ Agregar Producto"
    F->>F: Muestra formulario modal
    U->>F: Llena datos + variante + precios
    U->>F: Clic "Guardar"
    F->>F: Comprime imágenes (max 500KB)
    F->>API: POST /products
    API->>API: Valida DTO (class-validator)
    API->>S: create(dto, user)
    S->>DB: Busca Tenant por ID
    DB-->>S: Tenant (con limits y usage)
    S->>S: Verifica límite de productos
    S->>S: Verifica límite de storage
    S->>S: Genera SKU si no se proporcionó
    S->>DB: Verifica SKU único
    S->>S: Genera SKUs de variantes
    S->>DB: Verifica barcodes únicos
    S->>S: Procesa pricing strategy
    S->>DB: Guarda producto
    DB-->>S: Producto creado
    S->>DB: Incrementa tenant.usage
    S-->>API: Producto
    API-->>F: { success: true, data: producto }
    F-->>U: Cierra modal, producto en tabla
```

### Desglose paso a paso

| Paso | Quién | Qué pasa | Archivo fuente |
|---|---|---|---|
| 1 | Usuario | Abre formulario de creación | ProductsManagement.jsx |
| 2 | Frontend | Comprime imágenes con sharp | ProductsManagement.jsx |
| 3 | Frontend | Envía POST /products | api.js |
| 4 | Controller | Valida DTO y permisos | products.controller.ts |
| 5 | Servicio | Busca tenant, verifica límites | products.service.ts → create() |
| 6 | Servicio | Genera SKU: `{PREFIX}-{NNNN}` | products.service.ts → generateSku() |
| 7 | Servicio | Verifica unicidad de SKU y barcodes | products.service.ts |
| 8 | Servicio | Calcula precios (markup/margin) | products.service.ts → processVariantPricing() |
| 9 | Servicio | Guarda en BD + incrementa usage | products.service.ts |

### Qué puede salir mal
- **Límite de productos excedido**: El plan del tenant no permite más productos → Error 400
- **SKU duplicado**: Otro producto ya tiene ese SKU → Se regenera automáticamente si fue auto-generado
- **Barcode duplicado**: Otro producto en el mismo tenant tiene ese barcode → Error 400
- **Storage excedido**: Las imágenes exceden el límite de almacenamiento del plan → Error 400

---

## Flujo 2: Crear Producto con Compra Inicial (Todo-en-Uno)

### Descripción
El flujo más completo: crea producto, vincula proveedor, genera orden de compra, y recibe la mercancía — todo de un solo formulario.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Admin
    participant F as 🖥️ Frontend
    participant PS as 📦 ProductsService
    participant CS as 👥 CustomersService
    participant SS as 🏭 SuppliersService
    participant PCS as 🛒 PurchasesService
    participant IS as 📊 InventoryService
    participant DB as 🗄️ MongoDB

    U->>F: Llena producto + proveedor + cantidad + condiciones de pago
    F->>PS: POST /products/with-initial-purchase

    rect rgb(230, 245, 230)
        Note over PS: 1. Crear Producto
        PS->>PS: Valida tenant + límites
        PS->>PS: Genera SKU
        PS->>DB: Guarda producto
    end

    rect rgb(230, 230, 245)
        Note over PS,CS: 2. Resolver Proveedor
        alt Proveedor existente
            PS->>CS: findOne(supplierId)
        else Proveedor nuevo
            PS->>CS: create(newSupplier)
        end
        PS->>SS: ensureSupplierProfile()
    end

    rect rgb(245, 230, 230)
        Note over PS,PCS: 3. Crear + Recibir Compra
        PS->>PCS: create(purchaseOrder)
        PCS-->>PS: PO creada
        PS->>PCS: receivePurchaseOrder(poId)
        PCS->>IS: addStockFromPurchase()
        IS->>DB: Crea/actualiza Inventory
        IS->>DB: Crea InventoryMovement
    end

    PS-->>F: Producto creado con stock
    F-->>U: Producto listo para vender
```

### Desglose paso a paso

| Paso | Quién | Qué pasa |
|---|---|---|
| 1 | ProductsService | Valida tenant, genera SKU, guarda producto |
| 2 | ProductsService | Resuelve o crea proveedor (Customer + Supplier profile) |
| 3 | ProductsService | Vincula proveedor al producto (suppliers[]) |
| 4 | PurchasesService | Crea orden de compra con el producto y cantidades |
| 5 | PurchasesService | Recibe la orden automáticamente (status → received) |
| 6 | InventoryService | Crea registro de inventario con stock y warehouseId |
| 7 | InventoryService | Crea movimiento de inventario tipo "purchase" |

### Qué puede salir mal
- **Proveedor nuevo sin datos completos**: Si se elige "nuevo proveedor" pero falta nombre o RIF → Error 400
- **Fallo en recepción**: Si la recepción de la compra falla, el producto queda creado pero sin stock

---

## Flujo 3: Actualizar Precios (con Cascada)

### Descripción
Cuando se actualiza el precio de un producto, el cambio se propaga a historial de precios y listas de precios. Si cambia el SKU, se propaga a inventario y movimientos.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Admin
    participant F as 🖥️ Frontend
    participant S as 📦 ProductsService
    participant PH as 📈 PriceHistoryService
    participant PL as 📋 PriceListsService
    participant DB as 🗄️ MongoDB

    U->>F: Edita precio en tabla (inline)
    F->>F: Actualización optimista (UI inmediata)
    F->>S: PATCH /products/:id { variants }

    S->>DB: Lee producto actual (before)
    S->>S: Detecta cambios de precio

    loop Por cada variante con cambio de precio
        S->>PH: recordPriceChange(productId, variantSku, oldPrice, newPrice, "manual")
        PH->>DB: Guarda registro de historial
    end

    opt Si hay customPrices en variantes
        S->>PL: assignProduct(priceListId, productId, customPrice)
    end

    opt Si cambió el SKU
        S->>DB: Actualiza Inventory.productSku
        S->>DB: Actualiza InventoryMovement.productSku
    end

    S->>DB: Actualiza producto
    S-->>F: Producto actualizado
    F-->>U: Toast "Guardado" (o undo 4 seg)
```

---

## Flujo 4: Escaneo de Etiqueta con IA

### Descripción
El usuario toma fotos de la etiqueta de un producto y la IA extrae la información automáticamente.

### Diagrama

```mermaid
sequenceDiagram
    participant U as 👤 Admin
    participant F as 🖥️ Frontend
    participant S as 📦 ProductsService
    participant AI as 🤖 OpenAI GPT-4o-mini
    participant DB as 🗄️ MongoDB

    U->>F: Clic "Escanear Etiqueta"
    U->>F: Toma 1-3 fotos de la etiqueta
    F->>S: POST /products/scan-label (multipart/form-data)

    S->>S: Comprime imágenes (sharp: 1600×2200, JPEG 75%)

    S->>AI: Chat completion con imágenes
    Note over AI: Prompt especializado:<br/>Extraer nombre, marca, ingredientes,<br/>alérgenos, vida útil, almacenamiento,<br/>categoría, unidad de medida

    AI-->>S: JSON con datos extraídos + confianza

    S->>DB: Busca categorías existentes del tenant
    S->>S: Intenta match de categoría extraída vs existentes
    S->>S: Limpia atributos vacíos

    S-->>F: Datos extraídos + matchedCategory + confianza
    F->>F: Pre-llena formulario de creación
    F-->>U: "Datos extraídos con 85% confianza"
    U->>U: Revisa, ajusta si es necesario, y crea producto
```

---

## Flujo 5: Búsqueda de Productos (con Stock)

### Descripción
La búsqueda de productos puede incluir opcionalmente información de stock, útil para el POS y el storefront.

### Diagrama

```mermaid
flowchart TD
    START["GET /products?search=harina&category=Alimentos"] --> FILTERS["Construir filtros"]
    FILTERS --> TENANT["+ tenantId"]
    FILTERS --> ACTIVE["+ isActive: true"]
    FILTERS --> CAT["+ category: /harina/i"]

    TENANT --> SEARCH{"¿Tiene search?"}
    SEARCH -->|"Sí"| REGEX["Construye regex multi-palabra<br/>ej: 'harina' → /harina/i"]
    SEARCH -->|"No"| SORT["Aplica sortBy + sortOrder"]

    REGEX --> FIELDS["Busca en: name, brand, sku,<br/>variants.name, variants.sku,<br/>variants.barcode"]

    FIELDS --> STOCK{"¿includeInventory?"}
    STOCK -->|"Sí"| INV_QUERY["Consulta Inventory por<br/>cada productId"]
    STOCK -->|"No"| PAGINATE

    INV_QUERY --> ATTACH["Adjunta availableQuantity,<br/>totalQuantity, lots"]
    ATTACH --> MIN_STOCK{"¿minAvailableQuantity?"}
    MIN_STOCK -->|"Sí"| FILTER_STOCK["Filtra productos<br/>con stock insuficiente"]
    MIN_STOCK -->|"No"| PAGINATE

    FILTER_STOCK --> PAGINATE["Pagina resultados<br/>(page, limit)"]
    PAGINATE --> RESPONSE["Retorna { products, pagination }"]
```

---

## Flujo 6: Producto en Storefront Público

### Descripción
El storefront solo muestra productos tipo "simple" que tengan stock disponible.

### Diagrama

```mermaid
sequenceDiagram
    participant C as 🛒 Cliente
    participant ST as 🖥️ Storefront (Next.js)
    participant API as ⚙️ PublicController
    participant S as 📦 ProductsService
    participant DB as 🗄️ MongoDB

    C->>ST: Visita tienda.smartkubik.com/productos
    ST->>API: GET /public/products?tenantId=xxx&page=1
    API->>S: findAll(query, tenantId, { includeInventory: true, minAvailableQuantity: 1 })
    
    S->>DB: Query productos WHERE<br/>productType=SIMPLE<br/>isActive=true<br/>tenantId=xxx
    DB-->>S: Productos
    
    S->>DB: Query inventarios de esos productos
    DB-->>S: Inventarios
    
    S->>S: Filtra: solo productos con stock ≥ 1
    S->>S: Adjunta availableQuantity a cada producto
    
    S-->>API: Productos con stock
    API-->>ST: { success, data, pagination }
    ST-->>C: Grid de productos disponibles
```

---

*Última actualización: 2026-04-28*
*Archivos fuente: `products.controller.ts`, `products-public.controller.ts`, `products.service.ts`, `ProductsManagement.jsx`*
