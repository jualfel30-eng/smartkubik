# 📚 Knowledge Base: Órdenes y Facturación
*Cómo Procesar Pedidos, Dividir Cuentas y Cobrar*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Órdenes es donde ocurre la magia transaccional. Aquí puedes tomar el pedido de un cliente, agregar modificadores (ej. "Sin cebolla"), aplicar descuentos, cobrar en múltiples monedas ( USD/Bs ) simultáneamente, y enviar comandas a la cocina o el recibo a la impresora fiscal.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo cobro una cuenta si el cliente me paga mitad en Dólares y mitad en Bolívares?**
- **¿Cómo divido una cuenta de restaurante entre 3 amigos?**
- **¿Cómo aplico un descuento a un cliente VIP?**

---

## 👟 Paso a Paso

### A. Procesar un Pedido Estándar
1. En la pantalla principal del Punto de Venta (POS), asegúrate de tener una Sesión de Caja abierta.
2. Haz clic en las categorías (lado izquierdo) y selecciona los productos que el cliente desea.
3. *Si el producto tiene modificadores (ej. Hamburguesa):* Se abrirá una ventana para que elijas los "Agregados" (ej. Extra Tocino) o "Exclusiones" (ej. Sin Tomate).
4. El producto aparecerá en el **Carrito/Ticket** del lado derecho con el subtotal calculado.
5. Haz clic en el botón verde **"Pagar / Checkout"**.

### B. Aplicar Pagos Multi-Moneda (Pago Mixto)
*El cliente tiene una cuenta de $20. Quiere pagar $10 en efectivo y el resto en Bolívares por Pago Móvil.*

1. Dentro de la pantalla de Pagos (Checkout), verás el Total a Pagar en USD y su equivalente en VES (usando la tasa BCV del día).
2. Haz clic en **"Agregar Pago"** (Add Payment).
3. Selecciona el Método 1: **"Efectivo USD"**. Ingresa "10" en el teclado numérico y acepta.
4. El sistema restará esos $10 y te mostrará el saldo adeudado actualizado (en $ y en Bs).
5. Haz clic nuevamente en **"Agregar Pago"**.
6. Selecciona el Método 2: **"Pago Móvil VES"**. El sistema colocará automáticamente el monto exacto restante en Bolívares.
7. Opcional: Ingresa el número de referencia bancaria del Pago Móvil.
8. Una vez el saldo adeudado llegue a cero (0), el botón **"Completar Orden"** se habilitará. Haz clic en él.

### C. Dividir la Cuenta (Split Bill)
*Una mesa de 3 personas quiere pagar su cuenta por separado.*

1. En el Ticket (Carrito), antes de darle a Pagar, haz clic en el botón de **"Dividir Cuenta / Split Bill"** (ícono de ticket tijera).
2. Elige el método de división:
   - **Por Personas (Partes Iguales):** El sistema divide el total matemáticamente entre X cantidad de personas que tú elijas.
   - **Por Productos:** El sistema te permite arrastrar las bebidas y platos específicos a la "Cuenta de la Persona 1" y la "Cuenta de la Persona 2".
3. Procede al pago. El sistema te pedirá cobrarle a la Persona 1 primero y luego te mostrará la pantalla de cobro para la Persona 2.

### D. Aplicar un Descuento o Cupón
1. En el Carrito, haz clic en el ícono de **"% Descuento"**.
2. Selecciona entre un Descuento Porcentual (Ej. 10%) o Fijo (Ej. $5).
3. Escribe el motivo del descuento o autorízalo con el PIN de Gerente si el sistema te lo exige.
4. Si tienes un Cupón Promocional, introdúcelo en la barra de "Código de Cupón" y el sistema validará sus reglas automáticamente.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Inventario:** Cuando haces clic en "Completar Orden", todos los productos del carrito se descuentan inmediatamente de tu Inventario.
- **Cancelaciones y Devoluciones:** Si te equivocas en un pedido *después de pagado*, no puedes simplemente "editarlo". Deberás buscarlo en el Historial de Órdenes y usar el botón **"Devolución / Refund"** para reversar el inventario y el dinero (generando una nota de crédito fiscal si aplica).
- **Propinas:** Si la tienda tiene activada la configuración de restaurante, en la pantalla de pago se mostrarán botones rápidos para sumar 10%, 15% o 20% de propina al total antes de pasar la tarjeta.

---
*SmartKubik Knowledge Base V1.03 - Gestión de Órdenes y Pagos*
