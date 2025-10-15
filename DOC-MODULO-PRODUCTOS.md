# Doc - Modulo Productos

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Inventarios` -> `Productos`  
> **API relacionada:** `/products`, `/products/bulk` (backend NestJS)  
> **Permisos requeridos:**  
> - `products_read` para visualizar  
> - `products_create` para altas e importaciones  
> - `products_update` para edicion  
> - `products_delete` para bajas

## 1. Proposito del modulo
El modulo Productos centraliza el catalogo comercial del tenant. Desde aqui se definen las fichas maestras que alimentan inventario, compras, ordenes de venta, storefront y reportes. Cada producto incluye identidad basica (SKU, nombre, marca), clasificacion, configuracion fiscal, reglas de inventario FEFO y multiples unidades de venta.

## 2. Flujo general de uso
1. Abrir `Inventarios > Productos`.  
2. Filtrar o buscar SKU/Nombre para localizar un producto.  
3. Usar las acciones (`Agregar`, `Editar`, `Eliminar`, `Importar`, `Exportar`) segun la tarea.  
4. Confirmar que los indicadores de stock minimo, FEFO y unidades de venta cuadren con la operacion diaria.  
5. Sincronizar con otros modulos: Compras toma la lista para generar ordenes de compra, Inventario utiliza la configuracion de lotes y puntos de reposicion, Ventas aplica precios y unidades habilitadas.

## 3. Vistas clave en la UI
- **Barra de filtros:**  
  - Busqueda por nombre, SKU, marca.  
  - Filtro por categoria.  
  - Filtro de estado (`Todos`, `Activos`, `Inactivos`).  
  - Selector de items por pagina.
- **Tabla de productos:**  
  - Columnas: SKU, nombre, categoria, unidad base, precio base, costo, estado.  
  - Badges de estado (`Activo`, `Inactivo`).  
  - Botones rapidos para editar o borrar.  
  - Indicador de FEFO y perecibilidad.
- **Acciones en lote:**  
  - Descargar plantilla XLSX.  
  - Importar archivo masivo (muestra vista previa antes de confirmar).  
  - Exportar listado a Excel/CSV aplicando los filtros actuales.
- **Dialogo "Agregar/Editar Producto":**  
  - Secciones: Imagenes, Identidad (nombre, marca, SKU, codigo de barras), Clasificacion (categoria, subcategoria, descripcion, ingredientes), Propiedades (perecible, vendido por peso, unidad base, exento de IVA).  
  - Configuracion de inventario: stock minimo, maximo, punto y cantidad de reorden, opciones FEFO (lotes, vencimiento, temperatura).  
  - Unidades de venta multiples: nombre comercial, abreviatura, factor de conversion, precio, costo, cantidad minima, incremento, unidad por defecto y activa.  
  - Datos de proveedor para compras rapidas (opcional).  
  - Variantes (estructura soporta multiples variantes, la UI actual trabaja sobre la variante principal).
- **Dialogo de importacion masiva:**  
  - Muestra tabla previa con columnas detectadas.  
  - Valida cabeceras requeridas (`sku`, `name`, `category`, `variantName`, etc.).  
  - Permite cancelar o confirmar para enviar a `/products/bulk`.

## 4. Procedimientos frecuentes

### 4.1 Crear un producto nuevo
1. Click en `Agregar Producto`.  
2. Completar datos basicos. Recomendacion: usar un formato consistente para SKU (`CATEGORIA-SUBCATEGORIA-XX`).  
3. Definir inventario (minimo, maximo, reorden) acorde al tiempo de reposicion y volumen de ventas.  
4. Activar `Es Perecedero` si el producto requiere fecha de vencimiento; establecer vida util y temperatura (`ambiente`, `refrigerado`, `congelado`).  
5. Si se vende en multiples presentaciones (kg, cajas, combos), habilitar "Unidades de venta multiples" y configurar:  
   - `conversionFactor`: cuantas unidades base equivalen a una unidad de venta.  
   - `pricePerUnit` y `costPerUnit`: montos finales que se usaran en ordenes y calculos de margen.  
   - `isDefault`: unidad sugerida al crear una orden.  
6. Guardar. El producto queda disponible inmediatamente para inventario, compras y ventas.

### 4.2 Editar o actualizar productos
1. Seleccionar el producto y presionar `Editar`.  
2. Ajustar campos permitidos (descripcion, reglas de inventario, unidades de venta, imagenes).  
3. Guardar. El backend realiza `PATCH /products/:id`; los cambios afectan nuevas operaciones pero no alteran historial pasado.  
4. Para desactivar una unidad de venta sin eliminarla marcar `Activa` en falso; el sistema la excluye de futuros pedidos pero conserva historicos.

### 4.3 Eliminar productos
- Disponible desde el menu de acciones de cada fila.  
- Ejecuta `DELETE /products/:id`.  
- Solo permitido si no hay dependencias criticas (el backend valida). Para bajas logicas sin perder historial se recomienda crear categoria "Archivado" o usar estado Inactivo.

### 4.4 Importacion masiva (XLSX)
1. Descargar plantilla para conocer el formato.  
2. Completar datos en la plantilla (maximo 3 imagenes por producto mediante URL).  
3. `Acciones en lote > Importar` y seleccionar el archivo.  
4. Revisar la vista previa: validar columnas, totales y posibles errores.  
5. Confirmar. El sistema usa `/products/bulk` para crear/actualizar. Mensajes de error incluyen lineas problematica y columna faltante.  
6. Posterior a la importacion, revisar alertas de inventario para configurar puntos de reorden.

### 4.5 Exportar catalogo
- `Exportar > Excel/CSV` genera un archivo filtrado con campos clave (SKU, nombre, categoria, precio costo y venta). Ideal para auditorias, integraciones externas o cargas al storefront.

## 5. Integraciones con otros modulos
- **Inventario:**  
  - Los parametros `unitOfMeasure`, `hasMultipleSellingUnits` y `inventoryConfig` determinan como se reservan cantidades y como se calculan alertas.  
  - Los lotes y fechas de vencimiento provienen de los productos marcados como perecederos.
- **Compras:**  
  - El dialogo de orden de compra usa este catalogo para seleccionar items y sugerir costos.  
  - El proveedor asociado al crear un producto nuevo agiliza la creacion de ordenes de compra y el registro en `Payables`.
- **Ventas / Ordenes:**  
  - `pricePerUnit`, `costPerUnit`, `isDefault` alimentan el motor de precios dinamicos y los calculos de margen.  
  - `sellingUnits` define las opciones disponibles para `NewOrderFormV2`.
- **Storefront:**  
  - Imagenes, descripcion y categorias se exponen en la tienda publica cuando el tenant habilita el storefront.

## 6. Datos y API relevantes
- **Lectura paginada:** `GET /products?page=1&limit=25&search=...&category=...&isActive=true`.  
- **Creacion:** `POST /products` con payload JSON (ver `handleAddProduct` en `ProductsManagement.jsx` para estructura).  
- **Actualizacion:** `PATCH /products/:id`.  
- **Eliminacion:** `DELETE /products/:id`.  
- **Importacion:** `POST /products/bulk` con `{ products: [...] }`.  
- Las respuestas incluyen `pagination` y `data` con variantes y configuracion completa.

## 7. Buenas practicas y soporte
- Mantener SKUs unicos y legibles; evitar espacios y caracteres especiales.  
- Revisar periodicamente los puntos de reorden vs. ventas promedias para evitar quiebres.  
- Para productos vendidos por peso activar unidades decimales y definir `minimumQuantity` y `incrementStep`.  
- Usar imagenes optimizadas (<500 KB) para mejorar rendimiento del storefront y del panel.  
- Recomendacion de soporte: ante inconsistencia de stock revisar si el producto esta configurado como perecedero y si los lotes se cargaron correctamente en Inventario.  
- Cuando la importacion masiva falla, descargar el error y validar cabeceras o campos numericos (no dejar celdas con texto en columnas numericas).

## 8. Recursos vinculados
- UI: `food-inventory-admin/src/components/ProductsManagement.jsx`  
- API: `food-inventory-saas/src/modules/products/`  
- Documentos: `DOC-MODULO-INVENTARIO.md`, `DOC-FLUJO-INVENTARIOS.md`

