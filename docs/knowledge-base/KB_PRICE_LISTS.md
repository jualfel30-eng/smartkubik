# 📚 Knowledge Base: Listas de Precios
*Cómo Asignar Listas de Precios B2B Mayoristas vs Detal*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Listas de Precios te permite romper la regla de "Un solo precio para todos". Si eres un distribuidor, puedes configurarlo para que tu producto cueste $10 al público general en el mostrador, pero le cueste $7 a un cliente corporativo que compra al mayor.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo le doy un precio de "Revendedor" a ciertos clientes automáticamente?**
- **¿Qué pasa si un producto no tiene precio asignado en la Lista de "Mayoristas"?**
- **¿Puedo tener un precio distinto para mi sucursal A y mi sucursal B?**

---

## 👟 Paso a Paso

### A. Crear una Nueva Lista de Precios
1. Navega a **Inventario > Configuración > Listas de Precios**.
2. Haz clic en **"Nueva Lista"**.
3. Ponle un nombre descriptivo: Ej. *Distribuidor VIP* o *Lista de Empleados*.
4. **Tipo de Lista:**
   - *Porcentaje (Basado en el Costo/Base):* Ejemplo, puedes configurar que esta lista cobre siempre un "-20%" sobre el Precio Base. Es dinámico.
   - *Fijo (Manual):* Tú decidirás el precio producto por producto.
5. Haz clic en **"Guardar Lista"**.

### B. Asignar Productos a la Lista de Precios
*Te enseñamos el método manual Fijo para controlar exactamente el valor.*

1. Edita la lista que acabas de crear.
2. Ve a la pestaña **Reglas o Productos**.
3. Selecciona el producto (Ej. Refresco Lata).
4. El sistema te mostrará el *Precio Base Actual* (Ej. $1.50).
5. En la columna de **"Precio Custom"**, ingresa el precio exclusivo para esta lista (Ej. $1.00).
6. Haz clic en **Ageregar/Guardar**. Se recomienda hacer esto mediante un archivo Excel (Bulk Import) si manejas miles de productos.

### C. Asignar la Lista a un Cliente VIP
*Para que todo esto funcione, el cliente debe estar atado a la lista.*

1. Ve a **CRM > Clientes**.
2. Busca a tu Cliente (Ej. Hotel ABC). Edita su perfil.
3. En la sección de "Preferencias de Compra", ubica el campo: **Lista de Precios**.
4. Selecciona tu lista *Distribuidor VIP*.
5. Clica en **Guardar Cliente**.

### D. ¿Cómo se ve esto en el Punto de Venta (POS)?
1. Cuando entres a la pantalla del POS, el sistema usará por defecto el **Precio Base** ($1.50).
2. Pero, si usas el buscador de la parte superior táctil para **Asignar Cliente** y escoges a "Hotel ABC", el sistema detectará su Lista de Precios.
3. Instantáneamente, todos los botones del menú y del carrito bajarán su precio a **$1.00**. 

---

## ⚠️ Reglas de Negocio y Advertencias
- **Prevalencia del Precio Base:** Si a un cliente "VIP" se le antoja comprar una "Ensalada", pero tú **NO** le pusiste precio a la Ensalada en su Lista de Precios Especial... el sistema no le regalará el producto; tomará inteligentemente el **Precio Base** estándar como plan de respaldo (Fallback).
- **Incompatibilidad con Promociones:** Si una factura ya tiene aplicada una Lista de Precios muy agresiva (Ej. Especial Empleados al Costo), debes tener cuidado al permitir aplicar "Cupones de Descuento" extra encima de esto, podrías terminar vendiendo a pérdida (Margen negativo).
- **Costos Variables:** Modificar el "Costo de Compra" de un producto (Lo que tú le pagas a tu proveedor) NO alterará de inmediato la Lista de Precios Fija. Tendrás que ajustar las listas manualmente después de un aumento súbito de inflación o costo de importación.

---
*SmartKubik Knowledge Base V1.03 - Listas de Precios (B2B)*
