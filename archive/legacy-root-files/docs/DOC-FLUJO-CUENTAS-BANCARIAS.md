# Doc - Flujo Integrado de Cuentas Bancarias

> **Versión cubierta:** v1.03  
> **Objetivo:** Explicar cómo el módulo de Cuentas Bancarias se integra con los flujos de cobros (ventas) y pagos (compras, cuentas por pagar) para automatizar el registro de movimientos y facilitar la conciliación bancaria.

## 1. Visión general del ciclo
El módulo de Cuentas Bancarias actúa como el receptor final de las operaciones financieras. No inicia flujos, sino que los centraliza y los verifica contra la realidad del banco.

```
Órdenes de Venta -> Registro de Cobro -> Movimiento de Depósito (Cta. Bancaria)
  ^                                                                 |
  |                                                                 v
  +--------------------- Conciliación Bancaria <-------------------+
  |                                                                 ^
  v                                                                 |
Órdenes de Compra / Cuentas por Pagar -> Registro de Pago -> Movimiento de Retiro (Cta. Bancaria)
```

El objetivo es que cada cobro a un cliente o pago a un proveedor que se realice a través de un banco quede reflejado automáticamente como un movimiento en el historial de la cuenta correspondiente, listo para ser conciliado.

## 2. Paso a paso del flujo

### 2.1 Desde el Cobro de una Venta
1.  **Se registra un pago:** En el módulo de `Órdenes`, un usuario registra un pago para una orden de venta a través del `PaymentDialogV2`.
2.  **Se selecciona una cuenta bancaria:** Al registrar el pago, el usuario elige un método de pago (ej. "Transferencia Zelle") y **selecciona la cuenta bancaria** donde se recibió el dinero.
3.  **Se crea el movimiento de pago:** El sistema guarda el pago y actualiza el saldo de la orden de venta.
4.  **Automatización -> Creación de Transacción Bancaria:** Inmediatamente, el servicio `PaymentsService` llama al `BankTransactionsService` y crea un nuevo registro en el historial de la cuenta bancaria seleccionada.
    - **Tipo:** `deposit`
    - **Monto:** El monto del pago recibido.
    - **Descripción:** Incluye información del pago, como "Pago recibido - Venta #123".
    - **Referencia:** El número de referencia introducido en el diálogo de pago.

### 2.2 Desde el Pago de una Compra o Gasto
1.  **Se registra un pago:** En el módulo de `Pagos` (`PayablesManagement`), un usuario decide pagar una factura de un proveedor o un gasto registrado (una "cuenta por pagar").
2.  **Se selecciona una cuenta bancaria:** Al igual que en las ventas, el usuario elige el método de pago y **selecciona la cuenta bancaria desde la cual se emitió el pago**.
3.  **Se crea el movimiento de pago:** El sistema guarda el pago y actualiza el saldo de la cuenta por pagar.
4.  **Automatización -> Creación de Transacción Bancaria:** De forma análoga al cobro, el sistema crea automáticamente un nuevo movimiento en el historial de la cuenta bancaria seleccionada.
    - **Tipo:** `withdrawal`
    - **Monto:** El monto del pago realizado.
    - **Descripción:** Incluye información del pago, como "Pago realizado - Factura #ABC".
    - **Referencia:** El número de referencia del pago.

### 2.3 El Rol de la Conciliación Bancaria
1.  **Acumulación de Movimientos:** A lo largo del día/semana/mes, el historial de la cuenta bancaria en el sistema se va llenando de estos movimientos de `depósito` y `retiro` generados automáticamente por las operaciones.
2.  **Proceso de Verificación:** Cuando el usuario realiza la conciliación bancaria, importa el estado de cuenta del banco.
3.  **Conciliación Automática:** El sistema toma los movimientos del banco y los compara con los movimientos de `depósito` y `retiro` que se generaron automáticamente. Si encuentra coincidencias de fecha y monto, las marca como "Conciliadas".
4.  **Conciliación Manual:** Si un movimiento del banco no tiene una contraparte clara (quizás por una diferencia en la fecha o un error de tipeo en el monto), aparecerá en la lista de "pendientes" para que el usuario lo concilie manualmente, seleccionando el movimiento correcto de la lista de sugerencias.

## 3. Automatizaciones Clave
- **Creación de Transacciones Bancarias:** La integración más importante. El sistema no espera que el usuario registre los depósitos o retiros manualmente en el módulo bancario. Se crean solos a partir de los módulos operativos (Ventas y Pagos), eliminando la doble digitación y reduciendo errores.
- **Sugerencias de Conciliación:** Durante la conciliación manual, el sistema filtra y sugiere las transacciones del sistema que más probablemente coinciden con un movimiento del banco, agilizando el proceso.
- **Actualización de Saldo Post-Conciliación:** Al importar un estado de cuenta y proporcionar el saldo final, el sistema ajusta el saldo de la cuenta en la plataforma para que refleje la realidad del banco, sirviendo como un punto de control financiero.

## 4. Buenas Prácticas para Tenants
- **Asociar Siempre la Cuenta Bancaria:** Es fundamental que al registrar cualquier pago (recibido o emitido) que pase por un banco, el usuario seleccione la cuenta bancaria correcta. Si no lo hace, el movimiento no se creará y la conciliación será imposible.
- **Usar Referencias Claras:** Animar a los usuarios a que pongan números de referencia únicos y claros en cada pago. Esto aumenta drásticamente la tasa de éxito de la conciliación automática.
- **Realizar Conciliaciones Periódicas:** Recomendar realizar el proceso de conciliación de forma regular (semanal o mensual) para detectar rápidamente cualquier discrepancia, error o transacción no autorizada.

## 5. Documentos y Componentes Relacionados
- **Documentos:** `DOC-MODULO-CUENTAS-BANCARIAS.md`, `DOC-MODULO-ORDENES.md`, `DOC-MODULO-PAGOS.md`.
- **UI Principal:** `BankReconciliationView.jsx`, `PaymentDialogV2.jsx` (para cobros), `PayablesManagement.jsx` (para pagos).
- **Backend:** `BankTransactionsService` es el servicio clave que recibe las llamadas de `PaymentsService` para crear los movimientos. `BankReconciliationService` orquesta el proceso de comparación.

Este flujo asegura que la contabilidad y la tesorería no sean entes separados, sino que la operación diaria alimente de forma natural y automática los registros financieros, dejando la conciliación como un simple acto de verificación en lugar de un tedioso proceso de digitación de datos.
