# Doc - Modulo Pagos y Cuentas por Pagar

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Finanzas` -> `Pagos` (componente `PayablesManagement`)  
> **APIs relacionadas:** `/payables`, `/payables/:id`, `/payables/:id/payments`, `/payables/templates`, `/payments`, `/customers` (tipo supplier), `/chart-of-accounts`  
> **Permisos requeridos:**  
> - `purchases_read` y `purchases_create` para crear cuentas por pagar  
> - `payables_read`, `payables_create`, `payables_update` para gestionar payables  
> - `payments_create` para registrar pagos

## 1. Proposito del modulo
Centraliza la gestion de gastos y obligaciones: registrar cuentas por pagar, crear proveedores al vuelo, definir plantillas recurrentes, generar pagos parciales o totales y monitorear balances. Alimenta Contabilidad (asientos) y Reportes (Accounts Payable, Cash Flow).

## 2. Estructura principal

### 2.1 Tabs superiores (`Tabs` component)
- **Cuentas por Pagar:** Listado principal de gastos y facturas pendientes de pago. Permite la creación manual y el registro de pagos.
- **Pagos Recurrentes:** Permite definir plantillas para gastos periódicos (ej. alquiler, servicios) y generarlos automáticamente.
- **Historial de Pagos Pendientes:** Un historial completo de todas las cuentas por pagar registradas, ideal para búsquedas y auditorías.
- **Historial de Pagos (General):** Debajo de las pestañas, se encuentra una tabla con el historial de **todos** los pagos realizados en el sistema (tanto de ventas como de cuentas por pagar).

### 2.2 Listado de Cuentas por Pagar
- Tabla con columnas: proveedor, fecha, monto total, monto pagado y estado.
- Acciones por fila: `Ver` (abre un diálogo con todos los detalles) y `Pagar` (abre el `PaymentDialog`).
- Botón `Registrar Cuenta por Pagar`: abre un formulario en diálogo para crear un nuevo gasto.

### 2.3 Formulario de nueva cuenta (`Registrar Cuenta por Pagar`)
- **Datos del proveedor:** Selector `SearchableSelect` para elegir un proveedor existente o crear uno nuevo sobre la marcha.
- **Detalles del gasto:** Tipo (`Factura de Compra`, `Pago de Servicio`, `Nómina`, etc.), fecha de emisión y vencimiento.
- **Líneas contables:** Permite añadir múltiples líneas, cada una con su descripción, monto y cuenta de gasto asociada del Plan de Cuentas.
- **Guardado:** Envía `POST /payables` y refresca el listado.

### 2.4 Diálogo de pagos (`PaymentDialog`)
- Permite registrar un pago (parcial o total) contra la cuenta por pagar seleccionada.
- **Campo Clave: `Cuenta Bancaria`:** Un selector para elegir la cuenta bancaria desde la cual se está realizando el pago.
- **Automatización:** Si se selecciona una cuenta bancaria, el sistema crea automáticamente un movimiento de `retiro` en el historial de esa cuenta, dejándolo listo para la conciliación.
- Otros campos: método de pago, monto, fecha y número de referencia.
- Crea el movimiento vía `createPayment` y actualiza el estado de la cuenta por pagar.

### 2.5 Diálogo de detalles
- Muestra un resumen completo de la cuenta por pagar: proveedor, fechas, estado, líneas de gasto, y un resumen de montos (total, pagado, pendiente).

### 2.6 Historial de Pagos (General)
- Una tabla que consolida todos los pagos, tanto de ventas como de cuentas por pagar.
- Columnas: Fecha, Concepto, Monto, Método y Referencia.
- Útil para una visión global de todos los egresos e ingresos.

### 2.7 Plantillas recurrentes (`RecurringPayables`)
- Diálogo para definir plantillas con nombre, proveedor, frecuencia (mensual, trimestral, etc.), fecha de inicio y líneas de gasto.
- Un botón `Generar Pago` permite crear la cuenta por pagar a partir de la plantilla cuando llegue el momento.

## 3. Flujos habituales

### 3.1 Registrar factura y pago parcial
1. Abrir `Registrar Cuenta por Pagar`.
2. Seleccionar un proveedor o crearlo.
3. Cargar las líneas de gasto con sus cuentas contables.
4. Guardar. La nueva cuenta por pagar aparecerá en el listado.
5. En la tabla, usar la acción `Pagar`.
6. En el diálogo de pago, **seleccionar la cuenta bancaria** desde la que se pagó, el método y el monto.
7. Guardar el pago. El saldo de la cuenta por pagar se actualizará y se creará un movimiento en el módulo de Cuentas Bancarias.
8. Verificar en Contabilidad que los asientos se generaron y en Reportes `Accounts Payable`.

### 3.2 Configurar gasto recurrente
1. Ir a la pestaña `Pagos Recurrentes`.
2. Crear una plantilla con proveedor, frecuencia y líneas de gasto.
3. Cada período, usar `Generar Pago` para crear la cuenta por pagar automáticamente.
4. Registrar el pago siguiendo el flujo del punto 3.1.

### 3.3 Conciliación Bancaria
1. El antiguo método de exportar a Excel ha sido reemplazado por una integración directa.
2. Cada pago registrado desde este módulo (siempre que se seleccione una cuenta bancaria) genera una transacción de `retiro` en el módulo de **Cuentas Bancarias**.
3. La conciliación real se realiza ahora en `Finanzas` -> `Cuentas Bancarias`.
4. Para más detalles, consultar la documentación `DOC-MODULO-CUENTAS-BANCARIAS.md` y `DOC-FLUJO-CUENTAS-BANCARIAS.md`.

## 4. Integraciones y automatizaciones
- **CRM:** La creación de proveedores alimenta la base de datos de `customers` con el tipo `supplier`.
- **Contabilidad:** Cada cuenta por pagar y su pago correspondiente generan asientos automáticos en el Libro Diario.
- **Compras:** Las órdenes de compra pueden generar cuentas por pagar automáticamente, que luego se gestionan y pagan desde este módulo.
- **Cuentas Bancarias (NUEVO):** Al registrar un pago y seleccionar una cuenta bancaria, se crea automáticamente una transacción de `retiro` en dicha cuenta, lista para ser conciliada.
- **Pagos de Órdenes:** El historial de pagos general también muestra los cobros de ventas para una visión consolidada.
- **Reportes:** Los datos de este módulo alimentan los reportes de Cuentas por Pagar (Accounts Payable) y Flujo de Caja (Cash Flow).
- **Notificaciones:** El backend puede configurarse para enviar alertas de vencimiento.


## 5. Buenas practicas de soporte
- Asegurarse de que el plan de cuentas tenga cuentas de gasto activas antes de registrar lineas.  
- Validar RIF y datos de contacto cuando se crea proveedor nuevo para evitar duplicados.  
- Mantener notas claras (numero de factura, periodo) para facilitar auditorias.  
- Revisar `status` del payable (`draft`, `open`, `partial`, `paid`, `void`) al diagnosticar diferencias.  
- Si un pago no aparece, comprobar permisos `payments_create` y que la llamada a API no devolvio error (consultar `toast.error`).  
- Para plantillas, confirmar que la frecuencia y fecha de inicio coincidan con el calendario del proveedor.

## 6. Recursos vinculados
- UI: `food-inventory-admin/src/components/PayablesManagement.jsx`, `PaymentDialog.jsx`, `SearchableSelect`, `RecurringPayables` auxiliares.  
- Backend: `food-inventory-saas/src/modules/payables/`, `payments`, `recurring-payables`, `customers`, `accounting`.  
- Documentos: `DOC-MODULO-CONTABILIDAD.md`, `DOC-MODULO-ORDENES.md`, `DOC-FLUJO-VENTAS-INVENTARIO-PAGOS-CONTABILIDAD.md`.

