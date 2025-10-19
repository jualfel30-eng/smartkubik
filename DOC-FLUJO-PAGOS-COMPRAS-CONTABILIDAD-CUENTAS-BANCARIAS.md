# Doc - Flujo Integrado de Compras, Pagos, Contabilidad y Cuentas Bancarias

> **Versión cubierta:** v1.03  
> **Objetivo:** Explicar el ciclo de vida completo de un egreso, desde la creación de una orden de compra hasta su pago y conciliación bancaria, destacando las automatizaciones entre los módulos involucrados.

## 1. Visión general del ciclo
Este flujo describe cómo el sistema gestiona las obligaciones financieras con proveedores y otros acreedores, asegurando que cada paso quede registrado tanto a nivel operativo como contable y bancario.

```
Compras (Orden de Compra)
  -> Genera una Cuenta por Pagar (Módulo de Pagos)
     -> Registro de Pago (Seleccionando Cuenta Bancaria)
        -> Genera Movimiento de Retiro (Módulo Cuentas Bancarias)
        -> Genera Asiento Contable (Módulo Contabilidad)
           -> Conciliación Bancaria
```

El objetivo es crear un sistema de "caja negra" donde las acciones operativas (como pagar una factura) disparen automáticamente todas las actualizaciones financieras necesarias sin intervención manual.

## 2. Paso a paso del flujo de egresos

### 2.1 Creación de la Obligación (Módulo de Compras)
1.  **Se crea una Orden de Compra:** En el módulo de `Compras`, un usuario registra una nueva orden para un proveedor, detallando los productos, cantidades y costos.
2.  **Automatización -> Creación de Cuenta por Pagar:** Al guardar la Orden de Compra, el sistema realiza dos acciones clave:
    - **Actualiza el Inventario:** Incrementa el stock de los productos recibidos.
    - **Crea un `Payable`:** Automáticamente, genera una "Cuenta por Pagar" en el módulo de `Pagos` por el monto total de la compra, asociándola al proveedor.
3.  **Impacto Contable Inicial:** Simultáneamente, se genera un asiento contable que debita la cuenta de Inventario y acredita la cuenta de Cuentas por Pagar.

### 2.2 Gestión y Pago (Módulo de Pagos)
1.  **Visualización de la Deuda:** La nueva Cuenta por Pagar aparece en la pestaña "Cuentas por Pagar" dentro del módulo de `Pagos`, con estado "Abierto".
2.  **Se registra el Pago:** El usuario hace clic en la acción `Pagar` para esa cuenta.
3.  **Selección de Cuenta Bancaria:** En el diálogo de pago (`PaymentDialog`), el usuario introduce el monto, el método de pago, la referencia y, de forma crucial, **selecciona la Cuenta Bancaria** desde la cual se está emitiendo el dinero.

### 2.3 Impacto Financiero y Contable (Módulos de Cuentas Bancarias y Contabilidad)
1.  **Automatización -> Creación de Transacción Bancaria:** Al confirmar el pago, el sistema crea un movimiento de `retiro` en el historial de la cuenta bancaria seleccionada. Este movimiento queda inmediatamente disponible para la conciliación.
2.  **Automatización -> Creación de Asiento Contable:** Al mismo tiempo, el `AccountingService` genera un nuevo asiento en el Libro Diario que:
    - **Debita** la cuenta de Cuentas por Pagar (saldando la deuda con el proveedor).
    - **Acredita** la cuenta contable asociada a la cuenta bancaria (reflejando la salida de dinero del banco).

### 2.4 Verificación Final (Módulo de Cuentas Bancarias)
1.  **Proceso de Conciliación:** Días o semanas después, el administrador importa el estado de cuenta del banco en el módulo de `Cuentas Bancarias`.
2.  **Coincidencia Automática:** El sistema buscará una coincidencia entre los movimientos del estado de cuenta y los movimientos de `retiro` generados por los pagos a proveedores. Gracias a la referencia y al monto, muchas de estas transacciones se conciliarán automáticamente.
3.  **Verificación Completa:** El ciclo se cierra cuando el movimiento de retiro en el sistema es verificado contra el movimiento real del banco, asegurando que el pago fue procesado correctamente y que los registros contables y de tesorería son precisos.

## 3. Automatizaciones Clave
- **Creación de Cuentas por Pagar:** Las órdenes de compra se convierten en deudas registradas sin necesidad de crear la cuenta por pagar manualmente.
- **Generación de Transacciones Bancarias:** Los pagos a proveedores se reflejan automáticamente en el historial del banco dentro del sistema, eliminando la necesidad de registrar el egreso dos veces.
- **Asientos Contables Doble Partida:** Cada paso (la compra y el pago) genera su correspondiente asiento contable, manteniendo el balance general cuadrado en todo momento.

## 4. Buenas Prácticas para el Usuario
- **Centralizar Pagos:** Todos los pagos a proveedores deben registrarse a través del módulo de `Pagos` para asegurar que el flujo automático funcione.
- **Seleccionar Siempre la Cuenta Bancaria:** Es vital que al registrar un pago que no sea en efectivo, se seleccione la cuenta bancaria correcta para habilitar la conciliación.
- **Usar Referencias Claras:** Utilizar el número de factura del proveedor o un identificador único en el campo de referencia del pago facilita enormemente la conciliación automática.

## 5. Documentos y Componentes Relacionados
- **Documentos:** `DOC-MODULO-COMPRAS.md`, `DOC-MODULO-PAGOS.md`, `DOC-MODULO-CONTABILIDAD.md`, `DOC-MODULO-CUENTAS-BANCARIAS.md`.
- **UI Principal:** `ComprasManagement.jsx`, `PayablesManagement.jsx`, `PaymentDialog.jsx`, `BankReconciliationView.jsx`.
- **Backend:** `PurchasesService`, `PayablesService`, `PaymentsService`, `BankTransactionsService`, `AccountingService`.

Este flujo integrado garantiza una trazabilidad completa de los egresos, desde la necesidad de compra hasta la verificación final en el banco, proporcionando un control financiero robusto y minimizando el trabajo manual.
