# 📚 Knowledge Base: Módulo Restaurante
*Guía de Gestión de Mesas, KDS (Pantallas de Cocina) y Reservaciones*

## 📌 ¿Qué puedo hacer aquí?
Si tu negocio opera como un Restaurante, Bar o Cafetería con atención en sitio, este módulo te permite visualizar el mapa de tu local, asignar meseros a las mesas, enviar pedidos digitalmente a la cocina (KDS) y gestionar las reservaciones de tus clientes.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo abro una cuenta para la "Mesa 5"?**
- **¿Cómo sabe el cocinero qué debe preparar sin usar papel?**
- **¿Cómo registro que un cliente llamó para reservar una mesa para esta noche?**

---

## 👟 Paso a Paso

### A. Abrir una Mesa (Dine-In)
1. En el Punto de Venta (POS), cambia la vista superior de "Mostrador" (Takeout) a **"Mapa de Mesas"** (Dine-In).
2. Verás un plano visual de tu restaurante organizado por zonas (Ej. *Salón Principal, Terraza*).
3. Las mesas tienen colores:
   - **Verde:** Disponible.
   - **Rojo/Naranja:** Ocupada.
4. Haz clic en una mesa Verde (ej. Mesa 5).
5. Ingresa el **Número de Comensales** (Personas) sentadas en la mesa.
6. El sistema te asignará automáticamente como el Mesero responsable (o te pedirá que elijas uno).
7. Agrega los productos solicitados al carrito y haz clic en **"Enviar a Cocina"** (Send to Kitchen). La mesa cambiará a estado Ocupada.

### B. Usar el Kitchen Display System (KDS) - Para los Cocineros
*El KDS es la pantalla táctil o tablet que se coloca dentro de la cocina para reemplazar las impresoras de tickets de papel.*

1. El personal de cocina debe ingresar al módulo **KDS (Cocina)** desde su tablet.
2. Verán una cuadrícula con los "Tickets" (Órdenes) entrantes. Arriba de cada ticket dirá "Mesa 5" o "Para Llevar".
3. A medida que el cocinero avanza, debe tocar (Tap) los productos o el ticket:
   - **Primer Toque (Amarillo):** Estado "En Preparación" (Preparing).
   - **Segundo Toque (Verde):** Estado "Listo" (Ready).
4. Cuando el ticket completo está "Listo", desaparece de la pantalla de cocina y el sistema manda una notificación silenciosa al POS del mesero indicando que puede buscar la comida.

### C. Crear una Reservación
*Un cliente llama por teléfono para reservar para el viernes.*

1. Navega al menú principal y selecciona **Reservaciones**.
2. Haz clic en **"Nueva Reservación"**.
3. Ingresa los datos del cliente:
   - Nombre y Teléfono (o búscalo en el CRM si es un cliente frecuente).
4. Selecciona la **Fecha y Hora** de la reserva.
5. Ingresa la **Cantidad de Personas**.
6. *Opcional:* Selecciona una Mesa Específica si el cliente pidió la "Mesa junto a la ventana". Si no, déjalo en blanco para asignarla cuando llegue.
7. Añade notas especiales (Ej. "Cumpleaños", "Alergia al maní").
8. Haz clic en **"Guardar Reservación"**.

### D. Cobrar y Liberar una Mesa
1. Desde el Mapa de Mesas, haz clic en la mesa Ocupada (Roja).
2. Verifica que todo lo consumido esté en la cuenta.
3. Haz clic en **"Pagar / Checkout"**.
4. Procesa el pago (efectivo, tarjeta, etc.) como se explicó en la guía de *Órdenes y Facturación*.
5. Una vez cobrada totalmente, la mesa se "Liberará" internamente y volverá a mostrarse en color Verde para recibir a nuevos clientes.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Bloqueo de Mesas:** No puedes asentar a clientes nuevos en una mesa que aún tiene un saldo pendiente por cobrar de un grupo anterior.
- **Tiempos de Cocina (SLA):** El KDS mide cuánto tiempo tarda un ticket en pantalla. Si una orden pasa de, por ejemplo, 20 minutos sin ser marcada como "Preparando", el ticket parpadeará en rojo para alertar sobre la demora o cuello de botella.
- **Unión de Mesas:** Si llega un grupo de 10 personas y juntas las Mesas 1 y 2 físicamente, el sistema POS permite la acción "Unir Mesas" (Merge Tables) para que operen bajo una sola cuenta temporal.

---
*SmartKubik Knowledge Base V1.03 - Restaurante y KDS*
