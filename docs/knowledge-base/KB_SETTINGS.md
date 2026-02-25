# 📚 Knowledge Base: Configuraciones e Integraciones
*Guía para Vincular tu WhatsApp, SendGrid y Personalizar tu Empresa*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Configuraciones (Settings) es la sala de máquinas de tu cuenta (Tenant). Aquí personalizas el nombre de tu empresa, tu logotipo para los reportes administrativos, y lo más importante: conectas el sistema con servicios externos (Integraciones API) como pasarelas de pago, envíos de correo o WhatsApp.

---

## ❓ Casos de Uso (FAQ)
- **¿Dónde pongo mi Logo nuevo para que salga impreso en la factura?**
- **¿Cómo conecto mi propio número telefónico para mandar campañas de WhatsApp?**
- **¿Qué hago si llegué al límite de correos electrónicos del mes?**

---

## 👟 Paso a Paso

### A. Configuración Básica de la Empresa
1. Navega a **Configuraciones > General**.
2. Rellena los **Datos Legales:** Nombre de la Empresa (Razón Social), Identificación Fiscal (RIF/NIT) y la Dirección Principal.
   - *Nota:* Esta información es la que se imprime automáticamente en el "Cabezote" (Header) de todas las facturas y notas de entrega del POS.
3. Sube el **Logotipo de la Empresa** (Para documentos internos).
4. Elige tu **Zona Horaria y Moneda Base** (Ej. Dólar Estadounidense - USD).

### B. Conectar un Proveedor de Correo (SendGrid / Mailgun)
*Si deseas usar tus campañas de Marketing, necesitas conectar una antena de correo externa.*

1. Navega a **Configuraciones > Integraciones > Correo Electrónico**.
2. Selecciona tu Proveedor (Ej. SendGrid).
3. Ingresa la **API Key** (Una contraseña larga que te da Sengrid en su portal).
4. Define el **Correo Remitente Predeterminado:** (Ej. `ventas@miempresa.com`) y el nombre que verán los clientes (Ej. `SmartKubik Store`).
5. Haz clic en **Guardar y Validar**. El sistema enviará un correo de prueba a tu bandeja.

### C. Conectar la Nube de WhatsApp (Meta Cloud API)
*Para enviar campañas masivas o mensajes pre-aprobados directo al celular del cliente.*

1. Navega a **Configuraciones > Integraciones > WhatsApp**.
2. Activa el Módulo de WhatsApp y selecciona el proveedor (Ej. Meta Cloud API).
3. Deberás ingresar los credenciales secretos que Facebook te entregó al registrar tu negocio:
   - *Phone Number ID* (ID del Número).
   - *Business Account ID* (ID de la cuenta comercial).
   - *Access Token* (Token de acceso de administrador).
4. Haz clic en **Guardar Configuración**. A partir de ahora los "Playbooks" y "Campañas" del módulo de marketing podrán disparar WhatsApps reales.

### D. Monitorear Límites de Consumo (Límites de Tenant)
*Como medida de seguridad contra el Spam, tu Tenant tiene límites diarios.*

1. Navega a **Configuraciones > Consumo y Límites**.
2. Verás unas barras de progreso con tu cuota diaria.
   - Ej. "Correos enviados hoy: 15 / 500".
   - Ej. "Mensajes de WhatsApp enviados hoy: 2 / 100".
3. Si el número de "Enviados" llega al Límite Máximo, el sistema pausará preventivamente todas tus campañas automáticas hasta que llegue el día siguiente (y se reinicie el contador) o hasta que hables con el equipo de soporte de SmartKubik para expandir tu plan.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Tokens Secretos:** NUNCA compartas tus contraseñas (API Keys) de Twilio o Sendgrid con tus empleados, ni las anotes en un cuaderno físico. Estos tokens dan un control absoluto sobre la facturación de tus empresas proveedoras. Si crees que un cajero las copió, debes ir a la página web del proveedor (Meta, Sendgrid), "Revocar" las credenciales e ingresar unas nuevas aquí en SmartKubik.
- **Auditoría Global:** Cualquier cambio hecho en esta pantalla de Configuraciones (Ej. Cambiar el RIF de la empresa o borrar la API Key de WhatsApp) quedará grabado eternamente en el Registro de Auditoría (`Audit Log`) bajo el usuario que hizo clic en "Guardar".

---
*SmartKubik Knowledge Base V1.03 - Configuraciones del Tenant*
