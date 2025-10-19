# Doc - Módulo Cuentas Bancarias y Conciliación

> **Versión cubierta:** v1.03  
> **Ubicación en la app:** Menú lateral `Finanzas` -> `Cuentas Bancarias` (componente `BankAccountsManagement`) y `Conciliación Bancaria` (componente `BankReconciliationView`)  
> **APIs relacionadas:** `/bank-accounts`, `/bank-accounts/:id/movements`, `/bank-reconciliation/import`, `/bank-reconciliation/manual`, `/bank-reconciliation/statement/:statementId`  
> **Permisos requeridos:**  
> - `accounting_read` para ver cuentas, movimientos y conciliaciones.  
> - `accounting_write` para crear cuentas, importar estados y conciliar.

## 1. Propósito del módulo
Este módulo es el centro de control de la tesorería. Permite registrar todas las cuentas bancarias de la empresa, visualizar el historial de transacciones (movimientos) de cada una y, lo más importante, ejecutar un proceso de conciliación bancaria para asegurar que los registros del sistema coincidan perfectamente con los estados de cuenta del banco. Su objetivo final es garantizar la exactitud del flujo de caja y la integridad de los datos financieros.

## 2. Estructura principal

### 2.1 Listado de Cuentas Bancarias (`BankAccountsManagement`)
- **Vista principal:** Una tabla que muestra todas las cuentas bancarias registradas.
- **Columnas:** Nombre del banco, número de cuenta, moneda, tipo de cuenta y saldo actual.
- **Acciones por fila:**
    - `Ver Movimientos`: Navega a la vista de historial de transacciones de la cuenta.
    - `Conciliar`: Inicia el proceso de conciliación bancaria para esa cuenta.
    - `Editar` / `Eliminar`: Gestiona los datos de la cuenta.
- **Botón `Nueva Cuenta Bancaria`:** Abre un formulario para registrar una nueva cuenta.

### 2.2 Historial de Movimientos (`BankAccountMovements`)
- **Resumen:** Muestra tarjetas con el saldo actual, total de depósitos y total de retiros para el período seleccionado.
- **Filtros:** Permite filtrar los movimientos por rango de fechas.
- **Tabla de Movimientos:** Un listado detallado de cada transacción registrada en el sistema para esa cuenta, incluyendo fecha, tipo (depósito, retiro, etc.), descripción, referencia, monto y saldo resultante.
- **Exportación:** Un botón para exportar la vista actual a un archivo Excel.

### 2.3 Vista de Conciliación Bancaria (`BankReconciliationView`)
Esta es la pantalla principal para el proceso de conciliación. Se divide en tres áreas clave:

#### 2.3.1 Información y Resumen
- **Detalles de la cuenta:** Muestra el nombre del banco, número de cuenta y saldo actual.
- **Totales pendientes:** Tarjetas que resumen el total de "Depósitos pendientes" y "Retiros pendientes" extraídos del estado de cuenta importado que aún no se han conciliado.

#### 2.3.2 Área de Importación
- **Formulario de Estado de Cuenta:** Campos para introducir la información del estado de cuenta que se va a importar:
    - `Fecha de corte`: Fecha de finalización del estado de cuenta.
    - `Saldo inicial`: Saldo al inicio del período según el banco.
    - `Saldo final`: Saldo al final del período según el banco.
    - `Moneda`: Moneda del estado de cuenta.
- **Selector de Archivo:** Para subir el estado de cuenta en formato `CSV` o `XLSX`.
- **Botón `Importar estado`:** Inicia el proceso de importación y conciliación automática.

#### 2.3.3 Área de Conciliación Manual
- **Tabla "Movimientos pendientes por conciliar":** La sección más importante. Muestra una lista de todas las transacciones del estado de cuenta que el sistema no pudo conciliar automáticamente.
- **Columnas:** Fecha, Descripción, Referencia y Monto del movimiento bancario.
- **Acción `Conciliar`:** Por cada fila, un botón que abre el diálogo de conciliación manual.

### 2.4 Diálogo de Conciliación Manual
- **Movimiento Bancario:** Muestra los detalles de la transacción del banco que se está intentando conciliar.
- **Movimiento del Sistema (Selector):** Un menú desplegable que muestra una lista de transacciones registradas en el sistema que son candidatas a coincidir con el movimiento bancario (sugeridas por similitud de monto o referencia).
- **Botón `Conciliar movimiento`:** Confirma la unión entre el movimiento del banco y la transacción seleccionada del sistema.

## 3. Flujos habituales

### 3.1 Registrar y Configurar una Cuenta Bancaria
1.  Ir a `Finanzas` -> `Cuentas Bancarias`.
2.  Hacer clic en `Nueva Cuenta Bancaria`.
3.  Llenar los datos: nombre del banco, número de cuenta, moneda, tipo y saldo inicial.
4.  Guardar. La cuenta aparecerá en el listado.

### 3.2 Realizar una Conciliación Bancaria Completa
1.  **Descargar Estado de Cuenta:** Obtener el estado de cuenta de la página web de tu banco en formato `CSV` o `XLSX`.
2.  **Iniciar Proceso:** En el módulo de `Cuentas Bancarias`, buscar la cuenta correcta y hacer clic en `Conciliar`.
3.  **Importar:**
    - Llenar los datos del formulario (fecha de corte, saldos, moneda).
    - Seleccionar el archivo descargado del banco.
    - Hacer clic en `Importar estado`.
4.  **Revisar Automáticas:** El sistema procesará el archivo, conciliará automáticamente las coincidencias obvias y mostrará un resumen.
5.  **Conciliar Manualmente:**
    - Revisar la tabla de "Movimientos pendientes por conciliar".
    - Para cada movimiento, hacer clic en `Conciliar`.
    - En la ventana emergente, seleccionar la transacción del sistema que corresponde.
    - Hacer clic en `Conciliar movimiento`.
    - Repetir el proceso hasta que la lista de pendientes esté vacía.
6.  **Finalizar:** Una vez que no quedan movimientos pendientes, la cuenta está oficialmente conciliada para ese período.

## 4. Integraciones y automatizaciones
- **Ventas y Cobros:** Cuando se registra un pago de una orden de venta y se asocia a una cuenta bancaria, se crea automáticamente un movimiento de `depósito` en el historial de la cuenta.
- **Compras y Pagos:** Cuando se registra un pago a un proveedor (desde una cuenta por pagar o una orden de compra) y se asocia a una cuenta bancaria, se crea automáticamente un movimiento de `retiro`.
- **Contabilidad:** Aunque no es directo, la conciliación asegura que los saldos de las cuentas bancarias en el Balance General sean correctos y fiables.

## 5. Buenas prácticas de soporte
- **Formato de archivo:** Asegurarse de que el cliente está subiendo un archivo `CSV` o `XLSX` válido. El sistema incluye un parser (`utils/bank-statement.parser.ts`) que espera ciertas columnas (fecha, descripción, referencia, monto). Si la importación falla, el formato del archivo es la primera causa a investigar.
- **Saldos correctos:** Es crucial que los saldos inicial y final introducidos en el formulario de importación coincidan exactamente con los del estado de cuenta bancario para evitar descuadres.
- **Transacciones no registradas:** Si un movimiento del banco no tiene contraparte en el sistema, es porque el usuario olvidó registrar un gasto o un ingreso. Deberá registrarlo en el módulo correspondiente (Pagos, Cuentas por Pagar, etc.) y luego volver a la conciliación para empatarlo.
- **Duplicados:** Si aparecen más transacciones en el sistema que en el banco, puede ser un indicio de registros duplicados que deben ser investigados y anulados.

## 6. Recursos vinculados
- **UI:** 
  - `food-inventory-admin/src/components/BankAccountsManagement.jsx`
  - `food-inventory-admin/src/components/BankAccountMovements.jsx`
  - `food-inventory-admin/src/components/BankReconciliationView.jsx`
  - `food-inventory-admin/src/hooks/use-bank-reconciliation.js`
- **Backend:** 
  - `food-inventory-saas/src/modules/bank-reconciliation/`
  - `food-inventory-saas/src/modules/bank-accounts/`
- **Utils:**
  - `food-inventory-saas/src/utils/bank-statement.parser.ts` (lógica para leer los archivos de banco)
