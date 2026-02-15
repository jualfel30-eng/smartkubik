# Doc - Modulo Inventario

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Inventarios` -> `Inventario`  
> **API relacionada:** `/inventory`, `/inventory/adjust`, `/inventory/bulk-adjust`  
> **Permisos requeridos:**  
> - `inventory_read` para consultar existencias  
> - `inventory_create` para ingresar stock inicial  
> - `inventory_update` para ajustes manuales y masivos

## 1. Proposito del modulo
El modulo Inventario es el tablero operativo para controlar cantidades disponibles, costos promedio, lotes y alertas de stock o vencimiento. Permite cargar inventario inicial, registrar ajustes con trazabilidad y sincronizar la informacion con Compras, Ventas y Contabilidad.

## 2. Flujo general de uso
1. Navegar a `Inventarios > Inventario`.  
2. Revisar la tabla filtrando por categoria o buscando SKU/Nombre.  
3. Identificar alertas (`Stock Critico`, `Proximo a vencer`).  
4. Ejecutar acciones: agregar stock inicial, ajustar cantidades, importar conteos masivos, exportar para auditoria.  
5. Validar que los ajustes se reflejen en reportes y modulos dependientes (Ordenes, Compras, Contabilidad).

## 3. Vistas clave en la UI
- **Barra de acciones rapidas:**  
  - `Importar`: permite cargar un archivo XLSX/CSV con ajustes masivos. Incluye opcion para descargar plantilla (`SKU`, `NuevaCantidad`).  
  - `Exportar`: genera Excel o CSV con stock actual, costo promedio y vencimientos.  
  - `Actualizar`: refresca datos desde la API.  
  - `Agregar Inventario`: abre dialogo para ingresar stock inicial o recepciones manuales.
- **Filtros y busqueda:**  
  - Buscar por nombre, SKU o marca.  
  - Filtro por categoria (se nutre de las categorias definidas en Productos).
- **Tabla de existencias:**  
  - Columnas: SKU, producto, categoria, stock disponible, costo promedio, vencimiento del primer lote, estado.  
  - Estado utiliza badges: `Stock Critico`, `Proximo a vencer`, `Disponible`.  
  - Acciones por fila: `Editar` (ajuste puntual), `Eliminar` (pendiente de conexion a API).
- **Dialogo "Agregar Inventario":**  
  - Selector de producto (busqueda incremental).  
  - Cantidad y costo promedio.  
  - Para productos perecederos: seccion de lotes (numero, cantidad, fecha de vencimiento).  
  - Guarda via `POST /inventory`.
- **Dialogo "Ajustar Inventario":**  
  - Muestra informacion actual (cantidad disponible).  
  - Campo `Nueva Cantidad Total` y `Razon del Ajuste`.  
  - Envia `POST /inventory/adjust` y registra movimiento con auditoria.  
- **Dialogo "Previsualizacion de Importacion":**  
  - Tabla con los registros detectados.  
  - Campo `Razon del Ajuste Masivo` obligatorio antes de confirmar.  
  - Confirmacion ejecuta `POST /inventory/bulk-adjust`.

## 4. Procedimientos frecuentes

### 4.1 Registrar inventario inicial o recepcion manual
1. Click en `Agregar Inventario`.  
2. Seleccionar el producto (lista sincronizada con modulo Productos).  
3. Indicar cantidad total y costo promedio unitario.  
4. Si aplica, detallar lotes y fechas de vencimiento (recomendable seguir FEFO).  
5. Guardar. El stock disponible aumenta y se registran lotes en la base de datos.

### 4.2 Ajustar stock puntual
1. En la tabla, elegir `Editar` sobre el producto.  
2. Ingresar la nueva cantidad total (el sistema calculara la diferencia contra el stock actual).  
3. Registrar una razon clara (ej: conteo fisico, merma, devolucion).  
4. Guardar. El sistema crea un movimiento de ajuste y actualiza alertas.

### 4.3 Importar conteo masivo
1. Descargar plantilla desde `Importar > Descargar Plantilla`.  
2. Rellenar `SKU` y `NuevaCantidad` para cada producto.  
3. Subir archivo desde `Importar > Importar Archivo`.  
4. Revisar la previsualizacion; agregar la razon del ajuste.  
5. Confirmar. Cada registro genera un ajuste individual, ideal para inventarios periodicos o integracion con WMS externos.

### 4.4 Exportar inventario actual
- Usar `Exportar > .xlsx` o `.csv` para compartir el estado con contabilidad, auditores o para carga en BI. Incluye costo promedio y fecha de vencimiento del primer lote.

## 5. Integraciones con otros modulos
- **Productos:** toma configuraciones de perecibilidad, unidades base y puntos de reorden para calcular alertas.  
- **Compras:** recepciones creadas desde Compras actualizan este modulo automaticamente; los ajustes manuales deben coordinarse con el equipo de compras para evitar duplicidades.  
- **Ordenes/Ventas:** cada venta descuenta stock disponible via backend, respetando FEFO y unidades configuradas.  
- **Contabilidad:** los ajustes generan movimientos que se reflejan en asientos (COGS, variaciones de inventario) mediante `AccountingService`.  
- **Alertas:** datos de `GET /inventory/alerts/*` alimentan la seccion de Compras (productos con stock critico o proximos a vencer).

## 6. Buenas practicas y soporte
- Registrar siempre la razon del ajuste (obligatorio en UI) para mantener trazabilidad ante auditorias.  
- En productos perecederos, validar que las fechas de vencimiento se capturen en formato correcto (YYYY-MM-DD) para que FEFO funcione.  
- Programar importaciones masivas fuera de horas pico para evitar bloqueos en el flujo de ventas.  
- Si un SKU no aparece en la importacion, revisar que exista en Productos y que el archivo use exactamente el mismo valor.  
- Para detectar diferencias entre stock fisico y sistemico, exportar inventario antes y despues de un conteo y comparar en hoja de calculo.  
- Soporte: ante inconsistencias, revisar `/inventory/adjust` logs y auditoria interna (pendiente de UI) o ejecutar `scripts/verify-tenant-data.ts`.

## 7. Recursos vinculados
- UI: `food-inventory-admin/src/components/InventoryManagement.jsx`  
- API: `food-inventory-saas/src/modules/inventory/`  
- Documentos complementarios: `DOC-MODULO-PRODUCTOS.md`, `DOC-MODULO-COMPRAS.md`, `DOC-FLUJO-INVENTARIOS.md`

