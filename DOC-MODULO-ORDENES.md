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
- **`PaymentDialogV2`:** registrar pagos unicos o mixtos para ordenes existentes. Calcula balance pendiente, valida montos y llama `POST /orders/:id/payments`.  
- **`OrderDetailsDialog`:** muestra resumen, productos, totales, entregas, notas, historial de pagos; permite generar PDF (presupuesto/factura) y abrir `SplitBillModal` para cuentas divididas.  
- **`OrderStatusSelector`:** listado de estados (draft, pending, confirmed, processing, delivered, cancelled, refunded). Actualiza orden via API y refresca la tabla.  
- **`SplitBillModal` (restaurante):** dividir cuentas por personas o montos, integracion con `bill-splits`.

## 3. Flujos operativos

### 3.1 Crear y cobrar una orden
1. Completar datos del cliente y entrega.  
2. Agregar productos; ajustar cantidades, unidades, modificadores.  
3. Seleccionar metodo de pago (unico o mixto).  
4. Revisar totales (IVA, IGTF, envio).  
5. `Crear Orden`. Se genera numero correlativo, reserva inventario y actualiza CRM.  
6. Si queda balance pendiente, usar `Registrar Pago` desde la tabla o `PaymentDialogV2` para saldar en uno o varios pasos.  
7. Cambiar estado a `confirmed` o `delivered` segun avance. Esto dispara asientos contables (ventas, costo, impuestos) y libera inventario.

### 3.2 Ordenes con entrega y seguimiento
1. Seleccionar `delivery` o `envio_nacional`; capturar direccion o ubicacion mapa.  
2. El componente calcula costo de envio y muestra distancia/duracion (si aplica).  
3. Guardar orden. El backend registra `shipping` con metodo, costo, direccion y metricas; la informacion aparece en `OrderDetailsDialog`.  
4. Cambiar estado a `processing` cuando salga a reparto y `delivered` al completar.

### 3.3 Integracion con cocina (vertical restaurante)
1. Habilitar modulos `restaurant`, `tables` o `kitchenDisplay`.  
2. Crear orden y dejarla en estado `confirmed`.  
3. En la tabla, usar `Enviar a Cocina`. El sistema envia payload a `/kitchen-display/create` (ticket, prioridad, notas).  
4. Cocina administra tickets en `KitchenDisplay` hasta completar; los estados se reflejan en la orden y en inventario.

## 4. Automatizaciones posteriores a la orden
- **Inventario:** reserva y descuento de stock (manejo de lotes FEFO y multi-unidad).  
- **CRM:** actualiza historico del cliente, clasificaciones y actividades.  
- **Contabilidad:** genera asientos de venta e IGTF, registra COGS (ver `AccountingService`).  
- **Pagos:** cada registro en `PaymentDialogV2` crea movimiento en `payments` y actualiza `payables` de cuentas por cobrar.  
- **Kitchen / Mesas:** integra con modulos de restaurante cuando estan habilitados.  
- **Storefront:** ordenes creadas desde storefront llegan por la misma API y se gestionan aqui.

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

