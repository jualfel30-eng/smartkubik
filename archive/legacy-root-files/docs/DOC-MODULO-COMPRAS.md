# Doc - Modulo Compras

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Inventarios` -> `Compras`  
> **API relacionada:** `/purchases`, `/inventory/alerts/*`, `/products/with-initial-purchase`  
> **Permisos requeridos:**  
> - `purchases_read` para consultar alertas e historial  
> - `purchases_create` para generar ordenes de compra o compras iniciales  
> - `purchases_update` para editar ordenes (segun UI futura)  
> - `products_create` y `inventory_create` (solo si se usa la opcion de crear producto + compra inicial)

## 1. Proposito del modulo
Compras conecta el analisis de necesidades (stock critico, proximos a vencer) con la ejecucion de ordenes de compra y recepciones. Permite crear ordenes detalladas con datos de proveedor, condiciones de pago y costos, y ofrece plantillas para incorporar nuevos productos con su inventario inicial.

## 2. Componentes principales de la vista
- **Tarjetas de Alertas:**  
  - `Stock Critico`: lista productos con `availableQuantity` por debajo del punto de reorden.  
  - `Proximo a Vencer`: muestra lotes que expiran dentro de X dias (default 30).  
  - Cada tarjeta incluye boton `Reordenar` que precarga el producto en una nueva orden.
- **Boton "Añadir Inventario" (Nueva Orden de Compra):**  
  - Abre un formulario de varias secciones para capturar proveedor, items, pagos y notas.  
  - Permite crear proveedor nuevo en linea (validacion de RIF).  
  - Al guardar ejecuta `POST /purchases`. El backend registra la orden, actualiza inventario y genera el Payable asociado.
- **Boton "Crear Producto + Compra Inicial":**  
  - Abre dialogo independiente para registrar un producto completamente nuevo y su primer ingreso de inventario en un solo paso (`POST /products/with-initial-purchase`).  
  - Incluye configuracion de perecibles, lotes, proveedor y costo inicial.
- **Historial de Compras (`PurchaseHistory.jsx`):**  
  - Tabla con compras recientes, estado, proveedor, monto total, fecha, acciones (ver detalle).  
  - Permite filtrar por rango de fechas y estado (segun implementacion del componente).
- **Banners informativos:**  
  - Notas sobre IGTF, impuestos y recomendaciones de abastecimiento.

## 3. Flujo para crear una orden de compra
1. Presionar `Añadir Inventario`.  
2. **Proveedor:**  
   - Buscar proveedor existente por nombre o RIF.  
   - Si no existe, introducir datos basicos (nombre legal, RIF, contacto, telefono/email). El sistema validara el formato del RIF (`J-99999999`).  
3. **Datos de la orden:**  
   - Fecha de compra (default: hoy).  
   - Campo de notas internas (opcional).  
4. **Items:**  
   - Buscar productos por nombre/SKU.  
   - Para cada item definir cantidad, costo unitario, lotes y vencimiento (si es perecedero).  
   - Se calcula total automatica e individual.  
   - Se puede eliminar items antes de guardar.  
5. **Condiciones de pago:**  
   - Marcar si la compra es a credito (`isCredit`).  
   - Seleccionar fecha de vencimiento; el sistema calcula dias de credito.  
   - Seleccionar metodos de pago aceptados (efectivo, transferencia, pago movil, zelle, binance, paypal) o agregar texto personalizado.  
   - Activar `requiresAdvancePayment` si el proveedor exige anticipo; registrar porcentaje. El sistema calcula monto adelantado y saldo pendiente.  
6. Guardar. Se muestra confirmacion (`toast.success`). La orden pasa al historial y dispara actualizacion de inventario y cuentas por pagar.

## 4. Crear producto + compra inicial en un solo paso
1. Abrir `Crear Producto` desde la seccion superior.  
2. Completar ficha del producto (similar al modulo Productos).  
3. Indicar datos de inventario inicial (cantidad, costo, lote, vencimiento).  
4. Definir proveedor (existente o nuevo).  
5. Guardar. El sistema crea el producto, lo asocia a inventario y registra una orden de compra inicial para asegurar trazabilidad contable.

## 5. Integraciones y efectos colaterales
- **Inventario:**  
  - Cada orden aprobada genera movimientos de entrada, actualiza el costo promedio y registra los lotes.
- **Productos:**  
  - Utiliza el catálogo existente para sugerir costos y propiedades.
- **Cuentas por Pagar (Integración Clave):**  
  - Al guardar una Orden de Compra, el sistema **automáticamente genera una Cuenta por Pagar (Payable)** en el módulo de `Pagos`.
  - La gestión del pago (parcial o total) y su posterior conciliación bancaria **no se realizan en Compras**, sino directamente en el módulo de `Pagos`.
  - Para más detalles sobre el flujo de pago y conciliación, consulte `DOC-MODULO-PAGOS.md`.
- **Contabilidad:**  
  - Los movimientos de compra alimentan los asientos de inventario y cuentas por pagar.
- **Alertas automatizadas:**  
  - El módulo consume las APIs de `low-stock` y `near-expiration` para sugerir reórdenes.

## 6. Buenas practicas operativas
- Después de registrar una compra, es una buena práctica ir al módulo de `Pagos` para verificar la Cuenta por Pagar generada.
- Al crear un proveedor, validar el RIF y datos de contacto para evitar duplicados.
- Definir los costos unitarios reales para que el sistema calcule los márgenes de ganancia correctamente.
- Al momento de realizar el pago en el módulo de `Pagos`, **es crucial seleccionar la cuenta bancaria correcta** desde la cual se emitió el pago. Esto es lo que permite que el sistema genere el movimiento de `retiro` y lo prepare para una conciliación fácil y automática.

## 7. Soporte y diagnostico
- Si una Orden de Compra no genera su respectiva Cuenta por Pagar, revisar los logs del backend (`POST /purchases`) para verificar que la creación del `Payable` asociado fue exitosa.
- Consultar `food-inventory-saas/src/modules/purchases/` para revisar las reglas de negocio.

## 8. Recursos vinculados
- UI: `food-inventory-admin/src/components/ComprasManagement.jsx`, `PurchaseHistory.jsx`  
- API/Servicios: `food-inventory-saas/src/modules/purchases/`, `payables`, `inventory`  
- Documentos relacionados: `DOC-MODULO-PRODUCTOS.md`, `DOC-MODULO-INVENTARIO.md`, `DOC-FLUJO-INVENTARIOS.md`, `DOC-MODULO-PAGOS.md`

