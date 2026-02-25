# 📚 Knowledge Base: CRM y Clientes
*Cómo Gestionar Clientes y Oportunidades B2B (Pipelines)*

## 📌 ¿Qué puedo hacer aquí?
El módulo CRM (Customer Relationship Management) es tu centro de ventas y fidelización. Te permite registrar a todos tus clientes (empresas o personas naturales), llevar un historial de sus compras y administrar "Oportunidades de Venta" mediante un embudo (Pipeline) para cerrar grandes contratos o eventos.

---

## ❓ Casos de Uso (FAQ)
- **¿Cuál es la diferencia entre un Cliente B2C y un B2B?**
- **¿Cómo rastreo a un prospecto que me cotizó 100 pizzas para una fiesta?**
- **¿Cómo guardo notas sobre las reuniones que he tenido con un cliente?**

---

## 👟 Paso a Paso

### A. Crear un Perfil de Cliente
1. Navega a **CRM > Clientes**.
2. Haz clic en **"Nuevo Cliente"**.
3. Elige el **Tipo de Entidad**:
   - *Persona (B2C):* Juan Pérez (Consumidor final).
   - *Empresa (B2B):* Hotel XYZ (Cliente corporativo).
4. Completa la información básica: Nombre/Razón Social, RIF/Cédula, Correo y Teléfono.
5. *Opcional pero recomendado:*
   - Selecciona el **Score / Nivel (Tier):** Para categorizar si es un cliente VIP o Standard, lo cual se puede vincular a Descuentos automáticos.
   - Asigna una **Lista de Precios** si quieres que este cliente siempre tenga el precio Mayorista.
6. Haz clic en **"Guardar"**.

### B. Crear y Mover una Oportunidad (Pipeline B2B)
*Este flujo se usa para ventas largas: ej. Cotizar un servicio de Catering corporativo que toma semanas en cerrarse.*

1. Navega a **CRM > Oportunidades (Pipeline)**.
2. Verás una vista de tablero estilo "Kanban" con columnas (ej. *Prospecto, Negociación, Cerrado*).
3. Haz clic en **"Nueva Oportunidad"**.
4. Define:
   - **Título:** Ej. "Catering Evento Anual Banco XYZ".
   - **Cliente:** Selecciona al cliente corporativo de tu base de datos.
   - **Monto Estimado:** Ej. $2,500.
   - **Probabilidad de Cierre:** % de éxito estimado.
5. Haz clic en **"Guardar"**. La oportunidad aparecerá en la columna "Prospecto" (o la etapa inicial configurada).
6. **Para avazar el trato:** A medida que hables con el cliente, simplemente **arrastra (drag and drop)** la tarjeta de la oportunidad a la siguiente columna (ej. de "Cotización" a "Negociación").

### C. Registrar Actividades y Notas (Log Activity)
*Para no olvidar qué hablaste con el cliente ayer por teléfono.*

1. Abre y edita una Oportunidad o un Perfil de Cliente.
2. Ve a la sección **"Actividades" o "Bitácora"**.
3. Haz clic en **"Registrar Actividad"**.
4. Selecciona el Tipo: *Correo, Llamada, Reunión o Nota Interna.*
5. Escribe un resumen breve: *Ej. "Le gustó la cotización, pero me pidió rebajar $100. Lo llamaré mañana"*.
6. Haz clic en **"Guardar"**. Tu equipo de ventas ahora podrá ver todo el historial para no duplicar esfuerzos.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Billetes Vencidos (Lost Deals):** Si una oportunidad no se concreta, nunca la borres. Debes moverla a la etapa "Cerrado / Perdido" y colocar el motivo. Esto te dará analíticas reales de por qué estás perdiendo ventas.
- **RUT/RIF Duplicados:** El sistema CRM no permitirá que crees dos clientes con el mismo número de Identificación Fiscal (RIF/NIT) para evitar facturas cruzadas o contabilidad sucia.
- **Integración con Cuentas (Payables):** Al crear facturas a crédito para un cliente B2B del CRM, éstas pasarán automáticamente al módulo de Cuentas por Cobrar en Contabilidad. Si editas o borras al cliente, no se eliminarán las deudas o facturas asociadas por seguridad fiscal.

---
*SmartKubik Knowledge Base V1.03 - CRM y Oportunidades*
