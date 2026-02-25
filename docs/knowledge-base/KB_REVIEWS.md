# 📚 Knowledge Base: Reseñas y Feedback
*Cómo Contestar Reseñas y Validar el Sentimiento de los Clientes*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Reseñas recolecta la retroalimentación de tus clientes que han realizado compras en tu Storefront (Tienda Web) o Puntos de Venta Físicos. Te permite monitorear tu reputación, identificar quejas rápidamente e interactuar con tus consumidores para retenerlos.

---

## ❓ Casos de Uso (FAQ)
- **¿Qué hago cuando un cliente deja una reseña de 1 estrella acusando mal servicio?**
- **¿Cómo oculto una reseña ofensiva de mi página web pública?**
- **¿Puedo premiar a los clientes que dejan reseñas de 5 estrellas?**

---

## 👟 Paso a Paso

### A. Monitorear e Interactuar con Reseñas Recientes
1. Navega a **CRM > Reseñas / Calificaciones** (Reviews).
2. Verás una bandeja de entrada (Inbox) con los últimos comentarios recibidos, ordenados por fecha.
3. El sistema muestra la métrica principal: "Estrellas (del 1 al 5)".
4. Haz clic en una reseña específica para expandirla.
5. Usa el campo **"Responder a la Reseña"**: Agradece a los clientes positivos o brinda una solución (Ej. "Revisaremos con nuestro equipo de cocina") a las críticas.
6. Tu respuesta aparecerá públicamente debajo del comentario del cliente en tu tienda web.

### B. Ocultar o Moderar Reseñas Públicas
*Si recibes comentarios automatizados (Spam), insultos o contenido malicioso.*

1. Abre la reseña ofensiva en el módulo.
2. Localiza el interruptor (Toggle) de **"Publicado"** o **"Visible en Storefront"**.
3. Cambia el interruptor al estado "Apagado" (Inactivo).
4. La reseña se mantendrá en tu sistema para propósitos de estadística, pero no será visible para otros clientes en la URL pública de tu tienda o restaurante.

### C. Activar la Petición Automática de Reseñas (Opcional usando Playbooks)
*No esperes a que los clientes comenten solo cuando están enojados; pídeles reseñas cuando estén felices.*

1. Ve a **Marketing > Playbooks**.
2. Verifica si tienes activado el Playbook: "Review Request" (Petición de Reseña).
3. Este robot enviará automáticamente un correo electrónico o un WhatsApp (si tu plan lo permite) diciendo: *"¡Gacias por tu visita! ¿Calificarías tu experiencia del 1 al 5?"* exactamente 2 horas después de que el ticket de su orden es cerrado en el POS.

---

## ⚠️ Reglas de Negocio y Advertencias
- **No se pueden alterar las palabras del cliente:** Por motivos de integridad y reglas antifraude en comercio electrónico, tú como administrador no puedes editar ni corregir errores ortográficos en lo que escribió el cliente original. Solo puedes ocultar la reseña completa o responder.
- **Relación con las Órdenes:** Toda reseña verificada está atada estrictamente a un ID de Orden (`orderId`). Esto evita que trolls de internet o competidores llenen tu sistema de reseñas falsas, ya que el sistema solo permite reseñar a clientes que efectivamente hayan pagado una cuenta real.

---
*SmartKubik Knowledge Base V1.03 - Reseñas y Sentimiento de Cliente*
