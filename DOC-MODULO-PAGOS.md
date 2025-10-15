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
- **Cuentas por Pagar:** listado principal de payables, creacion manual, registro de pagos e inspeccion detallada.  
- **Pagos Registrados:** historial de pagos aplicados a ordenes o payables (fuente `getPayments`).  
- **Plantillas Recurrentes:** gestiona plantillas para gastos periodicos y generacion automatica (`createRecurringPayable`).  
- **Configuracion auxiliar:** acceso a plan de cuentas para mapear lineas.

### 2.2 Listado de Cuentas por Pagar
- Tabla con columnas: proveedor, tipo, fecha de emision/vencimiento, monto total, pagado, saldo, estado.  
- Acciones por fila: `Ver` (dialogo detallado), `Pagar` (abre `PaymentDialog` especifico para payables).  
- Filtros basicos por estado (pendiente, parcial, pagado) y busqueda (implementado con `filteredPayables`).  
- Boton `Registrar Cuenta por Pagar`: abre formulario en dialogo.

### 2.3 Formulario de nueva cuenta (`Registrar Cuenta por Pagar`)
- **Datos del proveedor:** selector `SearchableSelect` para elegir existente o crear nuevo (crea registro en CRM con `customerType = supplier`).  
- **Detalles del gasto:** tipo (`purchase_order`, `service_payment`, `utility_bill`, `payroll`, `other`), fechas, notas.  
- **Lineas contables:** descripcion, monto, cuenta contable (plan de cuentas). Permite multiples lineas, validando montos > 0.  
- **Guardado:** envia `POST /payables` y refresca listado.

### 2.4 Dialogo de pagos (para payables)
- Permite registrar uno o varios pagos contra la cuenta seleccionada.  
- Calcula saldo pendiente y exige metodo/monto.  
- Crea movimientos via `createPayment` (`POST /payables/:id/payments` o endpoint equivalente).  
- Tras registrar, refresca payables y pagos para mantener consistencia.

### 2.5 Dialogo de detalles
- Muestra informacion completa del payable: proveedor, tipo, estado, fechas, lineas con cuentas y montos, notas, resumen (total, pagado, saldo).  
- Util para auditorias o seguimiento antes de registrar pago.

### 2.6 Pagos Registrados
- Tabla alimentada por `getPayments()` con filtros por metodo, rango de fechas y estado (segun implementacion).  
- Cada registro incluye referencia, monto, metodo, fecha y documento asociado (orden o payable).  
- Opcion de exportar para conciliaciones.

### 2.7 Plantillas recurrentes
- Dialogo `CreateRecurringPayableDialog`: define nombre, proveedor, frecuencia (mensual/trimestral/anual), fecha de inicio, tipo de gasto y lineas.  
- Soporta creacion de nuevo proveedor.  
- Se guardan via `createRecurringPayable`; luego se pueden generar payables individuales con `generatePayableFromTemplate`.  
- Ideal para alquileres, servicios publicos, suscripciones.

## 3. Flujos habituales

### 3.1 Registrar factura y pago parcial
1. Abrir `Registrar Cuenta por Pagar`.  
2. Seleccionar proveedor o crearlo (nombre, RIF, contactos).  
3. Cargar lineas contables con cuentas de gasto.  
4. Guardar.  
5. En la tabla, usar `Pagar`. Registrar monto parcial con metodo (transferencia, pago movil, etc.).  
6. Revisar saldo pendiente; repetir pagos hasta cerrar (estado `paid`).  
7. Verificar en Contabilidad que los asientos se generaron y en Reportes `Accounts Payable`.

### 3.2 Configurar gasto recurrente
1. Ir a pestaña `Plantillas`.  
2. Crear plantilla con proveedor, frecuencia y lineas.  
3. Cada periodo, usar `Generar desde plantilla` para crear payable automaticamente (soporta autopoblado de lineas).  
4. Registrar pago cuando corresponda; el sistema mantiene historial por plantilla.

### 3.3 Conciliacion con Pagos realizados
1. Revisar tab `Pagos Registrados` para listar todos los pagos (ordenes y payables).  
2. Filtrar por metodo/fecha para cuadrar con estados bancarios.  
3. Exportar si se requiere cargar en Excel o subir a sistema externo.  
4. Si falta un pago, ubicar la orden/ payables y registrar desde su dialogo correspondiente.

## 4. Integraciones y automatizaciones
- **CRM:** creacion de proveedores escribe en coleccion `customers` con tipo `supplier`.  
- **Contabilidad:** cada payable y pago genera asientos (`ChartOfAccounts` y `JournalEntries`).  
- **Compras:** ordenes de compra generan payables automaticamente, visibles aqui para seguimiento.  
- **Pagos de ordenes:** los movimientos registrados en `OrdersManagement` aparecen en el tab de pagos para conciliacion general.  
- **Reportes:** Accounts Payable y Cash Flow utilizan datos de payables/pagos para analitica financiera.  
- **Notificaciones:** se puede integrar con alertas para vencimientos (via `payables` service en backend).

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

