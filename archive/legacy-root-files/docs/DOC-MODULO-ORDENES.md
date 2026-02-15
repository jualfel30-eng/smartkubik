# Doc - Modulo Ordenes de Venta

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Ventas` -> `Ordenes` (componente `OrdersManagementV2`)  
> **APIs relacionadas:** `/orders`, `/orders/:id`, `/orders/:id/payments`, `/kitchen-display/create`, `/modifier-groups/product/:id`, `/delivery/calculate`  
> **Permisos requeridos:**  
> - `orders_read` para visualizar y filtrar historial  
> - `orders_create` para generar nuevas ordenes  
> - `orders_update` para cambiar estados y registrar pagos  
> - `orders_write` (restaurante) para enviar a cocina

## 1. Proposito del modulo
Gestion integral del ciclo de venta: captura de pedidos, calculo fiscal venezolano (IVA 16% e IGTF 3%), control de estados, registro de pagos parciales/mixtos y seguimiento de balances. Se conecta automaticamente con inventario (reservas/descargos), CRM (historial del cliente), pagos y contabilidad.

## 2. Secciones de la vista principal

### 2.1 Encabezado
- Titulo y descripcion del modulo.  
- Boton `NewOrderFormV2` (formulario embebido) para crear ordenes sin salir de la pantalla.

### 2.2 Formulario Nueva Orden (`NewOrderFormV2`)
- **Datos del cliente:** busqueda incremental por nombre o RIF (autocompleta desde CRM). Permite crear clientes al vuelo y guardar ubicacion.  
- **Metodo de entrega:** `pickup`, `delivery`, `envio_nacional`. El sistema calcula costos de envio (`/delivery/calculate`) usando direccion y monto.  
- **Mesas (restaurante):** selector opcional cuando el tenant tiene modulos restaurantes activos.  
- **Productos:** busqueda con soporte para unidades multiples, venta por peso, modificadores, instrucciones especiales y multi-unidad.  
- **Metodo de pago:** soporta pagos unicos o `pago_mixto` (abre `MixedPaymentDialog` para dividir montos y lineas). El formulario calcula IGTF automaticamente en metodos sujetos al impuesto.  
- **Totales:** subtotal, IVA, IGTF y envio. Si el metodo de pago es en VES muestra conversion con tasa BCV (`useExchangeRate`).  
- **Notas:** instrucciones generales de la orden.  
- **Botones:** limpiar formulario y `Crear Orden`. Requiere items, datos de cliente y metodo de pago.

### 2.3 Historial de Ordenes (`OrdersDataTableV2`)
- **Filtros:** busqueda por cliente/RIF/numero, seleccion de limite por pagina, boton `Actualizar`.  
- **Columnas clave:** numero de orden, cliente, monto total, balance, estado de pago (badge), estado comercial (selector), acciones de ver/imprimir, pagar, enviar a cocina (si aplica).  
- **Paginacion:** controlado por respuesta de la API con `pagination.totalPages`.  
- **Estados de pago:** `pending`, `partial`, `paid`, `overpaid`, `refunded`.

### 2.4 Dialogos secundarios
- **`PaymentDialogV2`:** Permite registrar pagos únicos o mixtos para órdenes existentes. 
  - **Campo Clave: `Cuenta Bancaria`:** Un selector para elegir la cuenta bancaria donde se recibió el pago. 
  - **Automatización:** Si se selecciona una cuenta, el sistema crea automáticamente un movimiento de `depósito` en el historial de esa cuenta, preparándolo para la conciliación.
- **`OrderDetailsDialog`:** Muestra el resumen completo de la orden, incluyendo productos, pagos, historial y notas. Permite generar un PDF y abrir el modal para dividir la cuenta.
- **`OrderStatusSelector`:** Un menú para cambiar el estado comercial de la orden (confirmado, procesando, entregado, etc.).
- **`SplitBillModal` (restaurante):** Permite dividir la cuenta por personas o montos.

## 3. Flujos operativos

### 3.1 Crear y cobrar una orden
1. Completar datos del cliente y entrega.
2. Agregar productos, ajustando cantidades y modificadores.
3. Seleccionar método de pago (único o mixto).
4. Revisar totales (IVA, IGTF, envío).
5. `Crear Orden`. Esto reserva el inventario y actualiza el CRM.
6. Si queda un saldo pendiente, usar la acción `Registrar Pago` desde la tabla.
7. En el diálogo de pago, **seleccionar la cuenta bancaria** donde se recibió el dinero, el método y el monto.
8. Guardar el pago. El saldo de la orden se actualizará y se creará un movimiento de `depósito` en el módulo de Cuentas Bancarias.
9. Cambiar estado a `confirmed` o `delivered` para disparar los asientos contables y la descarga final de inventario.

### 3.2 Ordenes con entrega y seguimiento
1. Seleccionar `delivery` o `envio_nacional` y capturar la dirección.
2. El sistema calcula el costo de envío y lo añade al total.
3. Al guardar, la información de envío queda registrada y visible en los detalles de la orden.
4. Cambiar el estado (`processing`, `delivered`) para seguir el progreso.

### 3.3 Integracion con cocina (vertical restaurante)
1. Con los módulos de restaurante activos, crear una orden y ponerla en estado `confirmed`.
2. Usar la acción `Enviar a Cocina` desde la tabla de órdenes.
3. El sistema envía un ticket al `KitchenDisplay` para que el personal de cocina lo prepare.

## 4. Automatizaciones posteriores a la orden
- **Inventario:** Reserva y posterior descargo de stock, manejando lotes (FEFO) y múltiples unidades.
- **CRM:** Actualiza el historial de compras del cliente y su clasificación.
- **Contabilidad:** Genera asientos automáticos de venta, impuestos (IGTF) y costo de la mercancía vendida (COGS).
- **Cuentas Bancarias (NUEVO):** Al registrar un pago y seleccionar una cuenta bancaria, se crea automáticamente una transacción de `depósito` en dicha cuenta, lista para ser conciliada en el módulo de Cuentas Bancarias.
- **Kitchen / Mesas:** Se integra con los módulos de restaurante cuando están habilitados.
- **Storefront:** Las órdenes creadas desde la tienda online llegan por la misma API y se gestionan en este módulo.

## 5. API y datos relevantes
- `GET /orders?page&limit&search` -> listado paginado.  
- `POST /orders` -> crea orden con items, pagos iniciales y configuracion de envio/mesa.  
- `PATCH /orders/:id/status` (interno via selector) -> actualiza estado comercial.  
- `POST /orders/:id/payments` -> registra pagos unicos o mixtos.  
- `POST /kitchen-display/create` -> envia orden a cocina (requiere modulos restaurante).  
- `GET /modifier-groups/product/:id` -> obtiene grupos de modificadores para items configurables.  
- `POST /delivery/calculate` -> calcula costo de envio segun metodo.  
- Las respuestas de orden incluyen `items`, `payments`, `shipping`, `metrics`, `tableId`, `isSplit`, `activeSplitId`.

## 6. Buenas practicas de soporte
- Verificar que el tenant tenga habilitados metodos de pago en CRM (`paymentMethods`) antes de crear ordenes.  
- Si el IGTF no aparece, revisar configuracion del metodo (`igtfApplicable`) y exenciones por producto (`igtfExempt`).  
- Para pedidos en VES, confirmar que la tasa BCV este disponible; si la API de tasa falla el sistema aun calcula total en USD.  
- Al usar pagos mixtos, asegurarse de que la suma de montos corresponda al total; el dialogo mixto muestra el acumulado.  
- Si los productos no se cargan, revisar permisos `products_read` y disponibilidad de inventario.  
- Para ordenes que no envian a cocina, validar estado `confirmed` y habilitacion del modulo restaurante.

## 7. Recursos vinculados
- UI: `food-inventory-admin/src/components/orders/v2/` (OrdersManagementV2, NewOrderFormV2, PaymentDialogV2, OrderDetailsDialog, MixedPaymentDialog, OrderStatusSelector).  
- Backend: `food-inventory-saas/src/modules/orders/`, `payments`, `kitchen-display`, `delivery`, `restaurant` auxiliares.  
- Documentos relacionados: `DOC-MODULO-PRODUCTOS.md`, `DOC-MODULO-INVENTARIO.md`, `DOC-MODULO-PAGOS.md`, `DOC-FLUJO-VENTAS-INVENTARIO-PAGOS-CONTABILIDAD.md`.

