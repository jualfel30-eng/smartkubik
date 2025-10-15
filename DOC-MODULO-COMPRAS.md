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
  - Cada orden aprobada genera movimientos de entrada, actualiza costo promedio y lotes.  
  - Las alertas se recalculan tras crear la compra.
- **Productos:**  
  - Usa catalogo existente para sugerir costos y propiedades; al crear producto+compra inicial se sincroniza con modulo Productos automaticamente.
- **Cuentas por pagar:**  
  - El backend crea registros de `Payable` con el total, estado inicial y condiciones de pago.  
  - Los pagos posteriores (desde Payables Management) liquidan el saldo de la compra.
- **Contabilidad:**  
  - Movimientos de compra alimentan asientos de inventario y cuentas por pagar, y se reflejan en reportes (Accounts Payable, Cash Flow).
- **Alertas automatizadas:**  
  - APIs `/inventory/alerts/low-stock` y `/inventory/alerts/near-expiration` se consumen al entrar al modulo; se recomienda revisar diariamente.

## 6. Buenas practicas operativas
- Después de registrar una compra revisar el historial para confirmar estado y montos.  
- Si el proveedor no existe, validar RIF y datos de contacto para evitar duplicados; considerar completar la ficha en CRM si se requiere informacion adicional.  
- Definir costos unitarios reales (incluyendo impuestos, fletes) para que el costo promedio refleje la realidad y se calculen correctamente los margenes.  
- Para anticipos, registrar porcentaje exacto acordado; luego crear el pago desde Cuentas por Pagar usando el mismo metodo de pago para mantener conciliacion.  
- Ante discrepancias de stock tras una compra, revisar si la orden genero lotes y confirmar que no exista un ajuste manual posterior que haya modificado la cantidad.

## 7. Soporte y diagnostico
- Revisar `PurchaseHistory` y el backend (`/purchases/:id`) para verificar el estado (`draft`, `received`, etc.).  
- Usar `debug-api.js` (frontend) para depurar llamadas si el formulario arroja error de validacion.  
- Consultar `food-inventory-saas/src/modules/purchases/` para revisar DTOs y reglas de negocio (por ejemplo, validaciones de anticipo).  
- En caso de fallas recurrentes, validar que el tenant tenga habilitado el modulo de compras en `tenant.enabledModules`.

## 8. Recursos vinculados
- UI: `food-inventory-admin/src/components/ComprasManagement.jsx`, `PurchaseHistory.jsx`  
- API/Servicios: `food-inventory-saas/src/modules/purchases/`, `payables`, `inventory`  
- Documentos relacionados: `DOC-MODULO-PRODUCTOS.md`, `DOC-MODULO-INVENTARIO.md`, `DOC-FLUJO-INVENTARIOS.md`

