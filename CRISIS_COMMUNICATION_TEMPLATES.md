
# Comunicación de Incidente Crítico - Borrado de Datos

Este documento contiene plantillas para comunicar el incidente a tus clientes (Tenants) de manera profesional y transparente, buscando mitigar el impacto en la reputación y controlar el pánico inicial.

---

## Opción A: Correo URGENTE Inicial (Recomendado enviar YA)

**Asunto:** AVISO IMPORTANTE: Interrupción mayor del servicio e incidente de datos - SmartKubik / Food Inventory SaaS

**Cuerpo del correo:**

Estimado cliente,

Le escribimos para informarle urgentemente sobre una interrupción crítica que afecta a nuestro servicio **Food Inventory SaaS**.

Actualmente estamos experimentando un incidente grave en nuestra infraestructura de base de datos que ha provocado la indisponibilidad de sus datos históricos (inventarios, transacciones y registros de clientes). Nuestro equipo de ingeniería identificó que un proceso de mantenimiento interno afectó erróneamente el entorno de producción.

**Estado actual:**
*   El servicio está nuevamente en línea y operativo para nuevas transacciones.
*   Sin embargo, estamos experimentando una pérdida de visibilidad de los datos históricos previos a [Hora del incidente].

**Siguientes pasos:**
Nuestro equipo está trabajando con la máxima prioridad 1 para evaluar el alcance total y explorar todas las vías de recuperación posibles. Entendemos perfectamente la gravedad de esta situación para su operación y nos disculpamos profundamente por este fallo en nuestros protocolos.

Le mantendremos informado con una actualización cada hora. Por favor, si tiene registros manuales o externos de sus últimas operaciones críticas, le recomendamos tenerlos a mano como respaldo temporal.

Atentamente,

[Tu Nombre / Equipo de Soporte]
[Tu Teléfono de Contacto de Emergencia]
Food Inventory SaaS Team

---

## Opción B: Guía para llamadas telefónicas (Si te llaman enfadados)

1.  **Reconocer el problema inmediatamente:** "Sí, estamos al tanto. Tenemos una situación crítica con la base de datos que ocurrió hace [X] minutos."
2.  **No dar falsas esperanzas todavía:** Evita decir "lo recuperaremos todo seguro" si no tenemos backup. Di: "Estamos evaluando las opciones de recuperación con nuestro proveedor de base de datos."
3.  **Ofrecer solución inmediata:** "El sistema ya permite operar ventas nuevas. ¿Necesita ayuda para configurar su caja y seguir vendiendo hoy mientras resolvemos lo de atrás?"
4.  **Asumir la culpa (sin aceptar responsabilidad legal explícita por daños financieros aún):** "Fue un error en un procedimiento de mantenimiento nuestro. Estamos dedicando todos los recursos a solucionarlo."

---

## Opción C: Para Clientes VIP (Ofrecimiento de Compensación)

Si la situación escala y confirmamos que la data es irrecuperable, necesitarás una estrategia de retención:

"Estimado [Nombre],
Lamentamos confirmar que la recuperación de los datos históricos no ha sido posible debido a un fallo en el sistema de copias de seguridad.

Sabemos que esto es inaceptable. Para apoyarles en la reconstrucción:
1. Ofrecemos **[X] meses de servicio gratuito** a partir de hoy.
2. Nuestro equipo técnico está disponible para ayudarle a re-importar manualmente sus productos si tiene un Excel o CSV reciente.
3. Estamos implementando hoy mismo nuevas medidas de seguridad (ya activas) para garantizar que esto no vuelva a ocurrir jamás."

---
