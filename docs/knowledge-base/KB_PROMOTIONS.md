# 📚 Knowledge Base: Promociones y Cupones
*Cómo Crear Cupones, Combos y Promociones (2x1)*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Promociones está diseñado para incentivar tus ventas. Te permite crear reglas de descuento que se aplican automáticamente en el Punto de Venta (POS) o códigos de cupón secretos que tus clientes pueden introducir en tu Storefront (Tienda Web) para obtener rebajas.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo configuro una promoción "Lleva 2, Paga 1" (BOGO) los martes?**
- **¿Cómo creo un código de descuento que solo se pueda usar una vez por cliente?**
- **¿Puedo hacer un descuento que aplique solo a las Pizzas?**

---

## 👟 Paso a Paso

### A. Crear un Código de Cupón de Descuento
*Ideal para enviar por correo o dar a influencers (Ej. CODIGO10).*

1. Navega a **Marketing > Promociones > Cupones**.
2. Haz clic en **"Nuevo Cupón"**.
3. Define los parámetros principales:
   - **Código:** Escribe la palabra clave (Ej. `VERANO24`).
   - **Tipo de Descuento:** Fijo (Ej. *$5.00*) o Porcentual (Ej. *15%*).
4. Establece las **Condiciones (Reglas):**
   - *Compra Mínima:* Ej. El cliente debe gastar $30 para que el código funcione.
   - *Límite de Usos:* Puedes limitarlo a 100 usos en total, o "1 uso por cliente".
5. Selecciona la **Fecha de Expiración** (Validez).
6. Haz clic en **"Guardar y Activar"**. 

### B. Ocultar o Aplicar una Promoción a una Categoría
*Quieres que el Viernes Negro tenga 20% de descuento en la categoría "Licores", aplicable automáticamente.*

1. Navega a **Marketing > Promociones > Reglas**.
2. Haz clic en **"Nueva Promoción Automática"**.
3. Selecciona el Tipo: **"Por Categoría"**.
4. Define el descuento (Ej. *20%*).
5. Selecciona la Categoría objetivo: *Licores*.
6. Define el **Horario (Schedule):** 
   - Puedes configurarlo para que solo esté activo `"Los días Viernes"`.
7. Haz clic en **"Guardar"**. Ahora, cuando el cajero agregue un producto de la carpeta Licores, el precio bajará instantáneamente sin tener que meter un código de cupón.

### C. Crear una Promoción "Compra X, Lleva Y" (BOGO)
*Ej. Paga 2 Hamburguesas, llévate 3.*

1. Navega a la sección de **Promociones**.
2. Selecciona **Nueva Promoción Automática > Tipo "Buy X Get Y"**.
3. Llena la lógica del sistema:
   - *Condición (Buy X):* Selecciona el producto "Hamburguesa Clásica" y coloca Cantidad: `2`.
   - *Premio (Get Y):* Selecciona "Hamburguesa Clásica" y coloca Cantidad `1`. Configura el valor a descontar en el premio: `100% de descuento` (Gratis).
4. Guardar. Cuando el sistema detecte 3 hamburguesas en el carrito, cobrará el precio de 2.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Acumulación (Stacking):** Por defecto, el sistema impide que se junten dos promociones. Si un cliente está comprando Licores (20% Off), el cajero no podrá meter encima el cupón `VERANO24`. El sistema aplicará solo la promoción que represente **el mayor beneficio (descuento) para el cliente**.
- **Aprobación Gerencial:** Tu cajero podrá aplicar descuentos manuales en el Checkout, pero el sistema requiere permiso (`PermissionsGuard`) para generar cupones masivos. Protege este módulo para evitar fraude de empleados.
- **Cupones Vencidos:** Si el cliente intenta usar un cupón expirado en la tienda web, el front-end le indicará amablemente que la fecha ha caducado sin detener el flujo de compra.

---
*SmartKubik Knowledge Base V1.03 - Promociones y Cupones*
