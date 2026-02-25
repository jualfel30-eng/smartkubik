# 📚 Knowledge Base: Campañas y Marketing
*Guía para Enviar Newsletters y Configurar Campañas de WhatsApp*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Marketing es tu motor de fidelización masiva. Te permite enviar correos electrónicos a tu base de suscriptores, programar campañas por WhatsApp a segmentos específicos y crear "Playbooks" o flujos automatizados para que el sistema hable con el cliente por ti (ej. felicitándolo en su cumpleaños).

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo envío una promoción a todos mis clientes de Navidad?**
- **¿Cómo configuro el botón de "Suscribirse al Newsletter" de mi tienda web?**
- **¿Qué es un Playbook y por qué lo necesito?**

---

## 👟 Paso a Paso

### A. Crear y Enviar una Campaña Masiva (Newsletter)
*Envía correos electrónicos visuales o plantillas de texto a miles de clientes a la vez.*

1. Ve a **Marketing > Campañas**.
2. Haz clic en **"Nueva Campaña"**.
3. Elige el **Canal**:
   - *Email:* Para boletines informativos o promociones largas.
   - *WhatsApp:* Para notificaciones directas (asegúrate de usar una plantilla pre-aprobada por Meta).
4. Define el **Segmento (Público Objetivo)**:
   - "Todos los Suscriptores".
   - "Clientes VIP" (Configurados en el CRM).
   - "Clientes que no compraron hace 30 días".
5. Diseña el contenido:
   - Ingresa el *Asunto* (Email) y el *Cuerpo del Mensaje*.
   - Puedes usar **Variables Dinámicas**. Si escribes `Hola {{nombre}}`, el sistema pondrá el nombre real de cada cliente.
6. **Programación:**
   - Selecciona "Enviar Ahora" o programa una fecha y hora futura.
7. Haz clic en **"Confirmar y Lanzar"**.

### B. Funcionalidad de Newsletter (Suscripciones Públicas)
*Si usas la tienda en línea (Storefront), los usuarios pueden registrarse voluntariamente.*

1. Navega a **Marketing > Suscriptores Newsletter**.
2. Aquí verás la lista de correos recolectada desde tu sitio web.
3. El sistema gestiona automáticamente el *opt-out* (desuscripción): Si un cliente hace clic en "Cancelar Suscripción" en uno de tus correos, pasará a la lista negra y el sistema bloqueará automáticamente futuros correos promocionales para evitar demandas de Spam.

### C. Configurar un "Playbook" (Automatizaciones)
*Un Playbook es un robot que hace el marketing por ti basado en reglas lógicas condicionales.*

1. Ve a **Marketing > Playbooks (Automatizaciones)**.
2. Clic en **"Nuevo Playbook"**.
3. **Elige el Disparador (Trigger):**
   - "Cuando el Trato en el CRM cambie a 'Negociación'".
   - "Cuando sea el Cumpleaños del cliente".
   - "Cuando un Carrito sea Abandonado en la Web".
4. **Define las Reglas (Pasos):**
   - *Paso 1:* Retrasar la acción por 2 días.
   - *Paso 2:* Enviar un WhatsApp diciendo: "Hola, dejamos tu carrito guardado con un 10% de descuento".
5. Enciende (Activa) el Playbook. El sistema trabajará silenciosamente 24/7.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Pre-Aprobación de WhatsApp (Meta):** A diferencia de los correos, NO puedes enviar lo que quieras por la Cloud API oficial de WhatsApp en el momento que quieras. Las *WhatsAppTemplates* deben ser enviadas a Meta/WhatsApp primero; una vez que ellos la "Aprueben", recién aparecerá disponible en el módulo de campañas para su uso.
- **Cuotas de Envío (Límites):** Tu plan o "Tenant Settings" tiene límites máximos de envío diario (`maxEmailsPerDay`, `maxWhatsappPerDay`) para evitar abultar tu tarjeta de crédito con proveedores externos como SendGrid o Twilio. Si alcanzas el tope, la campaña se pausará.

---
*SmartKubik Knowledge Base V1.03 - Marketing y Campañas*
