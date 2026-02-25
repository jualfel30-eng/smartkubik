# Domain 2: Catalog & Inventory

## 📌 Visión General
Este dominio es el motor operativo de la plataforma para cualquier tenant basado en productos físicos. Gestiona no solo el catálogo (productos simples, variables, fabricados o insumos), sino también la complejidad algorítmica de múltiples unidades de medida, múltiples almacenes (Warehouses > Zones > Aisles > Bins), control de lotes con fechas de vencimiento, alertas preventivas y trazabilidad histórica de movimientos (Kardex).

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia de este dominio se distribuye en colecciones entrelazadas:

- **`Product`** (`product.schema.ts`): La entidad maestra del catálogo. 
  - Sub-esquemas internos muy ricos: `ProductVariant` (para tallas/colores), `ProductSupplier` (para manejar proveedores, costos y monedas de pago particulares, ej. divisas vs VES), y `SellingUnit` (ej. vender 1 caja o 1 kg del mismo producto).
  - Incluye lógicas nativas como `isSoldByWeight`, `pricingRules` (descuentos por volumen), y `inventoryConfig` (FEFO, trackExpiration).
- **`UnitType` & `UnitConversion`** (`unit-type.schema.ts`, `unit-conversion.schema.ts`): Proveen la capacidad matemática de crear conversiones dinámicas (ej. de Cajas a Unidades, de Kilogramos a Gramos), permitiendo comprar en una unidad, almacenar en otra y vender en una distinta.
- **`Warehouse` & `BinLocation`** (`warehouse.schema.ts`): Define los almacenes de un tenant, y de forma jerárquica las "Ubicaciones Dinámicas" (picking, bulk, receiving, quarantine) dentro de pasillos y estantes.
- **`Inventory` & `InventoryMovement`** (`inventory.schema.ts`):
  - `Inventory`: Representa el estado actual ("Snapshot"). Trackea `totalQuantity`, `availableQuantity`, `reservedQuantity` y `committedQuantity`.
  - Contiene arrays internos de `InventoryLot` para seguimiento exhaustivo (trazabilidad FIFO/FEFO).
  - `InventoryMovement`: Actúa como el libro mayor inmutable (Ledger) de todo lo que entra, sale o se transfiere entre Almacenes/Bins, afectando los costos (Kardex).

## ⚙️ Backend (API Layer)
La API expone microservicios y submódulos altamente especializados:

- **`ProductsController` (`/products`)**: CRUD y filtros de alto rendimiento (`products.service.ts` pesa más de 44KB debido a sus aggregations complejas para aplicar reglas de precios y variantes).
- **`ProductsPublicController` (`/products-public/`)**: Endpoint desprotegido diseñado para hidratar las tiendas online (Storefront) de los tenants, consumiendo índices de rendimiento sin requerir token JWT.
- **`InventoryController` (`/inventory`)**: Expone el stock en tiempo real y permite el re-cálculo o validación. (`inventory.service.ts` pesa 50KB+, centralizando la lógica del Kardex).
- **`InventoryMovementsController` (`/inventory-movements`)**: Permite ejecutar transacciones de entrada/salida explícita, inyectando el rastro de la persona que lo movió y afectando los promedios de costos (`averageCostPrice`).
- **`InventoryAlertsController` (`/inventory-alerts`)**: Servicio para emitir reportes de stock bajo (Reorder Point) o productos por vencer.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **God Services ("Bloat")**: Archivos como `inventory.service.ts` (50KB) y `products.service.ts` (44KB) concentran excesiva responsabilidad. Tienen lógica de negocio, validaciones transaccionales y queries pesadas de Mongo mezcladas. Deberían fragmentarse utilizando patrones genéricos de Repositorio o inyectando servicios de dominio más pequeños (ej. `ProductPricingService`, `InventoryValidationService`).
2. **Duplicidad de Complejidad en Pricing**: El esquema `Product` almacena reglas de descuentos por niveles (`bulkDiscountRules`), variaciones por locación (`locationPricing`), márgenes mínimos (`minimumMargin`) y monedas (`usdPrice`). Esto genera gran acoplamiento al armar consultas, lo que requerirá separar en un módulo puro de "Pricing Engine" futuro.
3. **Manejo Desacoplado de Lotes vs Movimientos**: Dentro de `InventorySchema` existen los `InventoryLot`, pero las acciones de alterarlo se procesan a través de `InventoryMovementSchema`. Mantener la consistencia atómica entre estas dos grandes colecciones mediante la aplicación y no en base de datos impone riesgos de carrera (Race Conditions) si no se estandarizan las transacciones (Transactions de MongoDB).

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- Extraer de `Product` y de `Inventory` las lógicas pesadas a servicios orquestadores (`Facade Pattern`).
- Revisar si el "Storefront" requiere verdaderamente el `ProductsPublicController` completo o solo vistas materializadas o una caché de Redis de alta velocidad, ya que las consultas públicas de MongoDB pueden volverse un cuello de botella con mucho tráfico.
