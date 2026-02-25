# 📚 Knowledge Base: Contabilidad y Cuentas por Pagar
*Entendiendo tu Catálogo de Cuentas y Cuadre de Cobranzas/Pagos*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Contabilidad asegura que los números de tu negocio siempre tengan un balance perfecto. Funciona bajo el principio de "Partida Doble". Aquí registrarás los gastos de tu negocio (como el alquiler o la luz), las deudas con tus proveedores y podrás auditar el flujo de caja real contra las cuentas bancarias.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo registro que pagué $500 por el Alquiler del local?**
- **¿Qué es una "Cuenta por Pagar" (Payable)?**
- **¿Por qué el monto de "Ingresos" en el POS no coincide exacto con mi cuenta de Banco?**

---

## 👟 Paso a Paso

### A. Registrar un Gasto Operativo Manual (Journal Entry)
*Asientos de diario. Para gastos que no están atados a proveedores recurrentes.*

1. Navega a **Contabilidad > Asientos Contables (Journal Entries)**.
2. Haz clic en **"Nuevo Asiento"**.
3. Ponle un nombre/referencia (Ej. "Pago Servicio Eléctrico Corpoelec").
4. El sistema de Partida Doble exige que coloques de dónde sale el dinero y hacia dónde va:
   - **Registro 1 (Débito):** Selecciona la cuenta `Gastos / Servicios Públicos`. Coloca el Moto: $100.
   - **Registro 2 (Crédito):** Selecciona la cuenta `Banco (Activo) / Banesco`. Coloca el Monto: $100.
5. El sistema verificará que la sumatoria total sea cero ($100 - $100).
6. Haz clic en **"Guardar Asiento"**.

### B. Gestionar Cuentas por Pagar (Deudas a Proveedores)
*Recibiste mercancía por $1000 hoy, pero negociaste pagarla en 30 días.*

1. Navega a **Contabilidad > Cuentas por Pagar (Payables)**.
2. Haz clic en **"Nueva Cuenta por Pagar"**.
3. Selecciona a tu **Proveedor** y asocia el ID de la **Orden de Compra** (si existe en Inventario).
4. Ingresa el **Monto Total Adeudado** ($1000).
5. Selecciona la **Fecha de Vencimiento (Due Date):** (Ej. Dentro de 30 días).
6. El estado del Payable será `abierto (open)`.
7. **Para pagarlo:** Cuando pasen los 30 días, entra de nuevo, haz clic en "Registrar Pago", ingresa el monto pagado y elige de qué cuenta bancaria tuya salió el dinero. El estado pasará a `cerrado (paid)`.

### C. Reconciliación Bancaria
*Verifica que tu software dice la verdad en comparación con tu estado de cuenta real del Banco.*

1. Ve a **Contabilidad > Cajas y Bancos > Reconciliación**.
2. Selecciona la Cuenta (Ej. Banesco).
3. Introduce el **Balance Final** que dice tu página web del banco hoy (Ej. $5,200).
4. El sistema listará todas las transacciones (Ventas, Pagos, Gastos) que "cree" que sucedieron este mes.
5. Haz clic en el botón [✔️] al lado de cada transacción en el sistema a medida que validas que sí aparece en tu estado de cuenta del banco.
6. Si al final todo cuadra, el sistema te permitirá "Cerrar el Período Contable".

---

## ⚠️ Reglas de Negocio y Advertencias
- **Bloqueo (Sequence Lock):** Si un Asiento Contable está "Conciliado" y cerrado, nadie, ni siquiera un gerente, podrá borrarlo o editar el monto, porque violaría las normas internacionales de auditoría contable (NIC/NIIF).
- **Gastos Mensuales:** Puedes usar el módulo de *Recurring Payables* para gastos fijos (como la licencia de software o el alquiler). El sistema creará la Cuenta por Pagar automáticamente el día 1 de cada mes sin que tengas que teclear nada.

---
*SmartKubik Knowledge Base V1.03 - Contabilidad y Finanzas*
