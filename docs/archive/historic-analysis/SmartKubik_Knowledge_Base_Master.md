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
# 📚 Phase 4: Knowledge Base Action Plan
*Del Blueprint Arquitectónico al Manual Funcional*

Para garantizar que ningún módulo ni funcionalidad quede por fuera al momento de crear la biblioteca de ayuda para los Tenants y el Asistente (RAG), se ha trazado el siguiente **Plan de Generación de Base de Conocimientos (Knowledge Base)**.

## 🎯 Objetivo de los Documentos
A diferencia de los documentos `DOMAIN_XX` (centrados en bases de datos y APIs), cada documento de esta Fase 4 responderá a **las intenciones de un usuario final (Gerente o Cajero)**. El formato estará optimizado para que el Chatbot con RAG extraiga respuestas paso a paso.

## 📝 Estructura del Formato (Standard Template)
Cada módulo tendrá su archivo propio (`KB_MODULO.md`) siguiendo esta estructura semántica:
1. **📌 ¿Qué puedo hacer aquí?** (Resumen de 2 líneas del módulo).
2. **❓ Casos de Uso (FAQ)** (Ej: ¿Cómo crear una variante?).
3. **👟 Paso a Paso** (Lista numerada exacta de botones a presionar o datos a llenar).
4. **⚠️ Reglas de Negocio / Advertencias** (Ej: "No puedes borrar un producto si tiene inventario").

---

## 🗺️ Mapa de Generación de Knowledge Base (Checklist)

Se generarán módulos independientes agrupados por la experiencia del usuario (Role-Based KB):

### 1. 📋 Inventario y Catálogo (The Engine Room)
- [ ] **KB_CATALOG**: "Guía para Crear Productos, Variantes y Sus Categorías"
- [ ] **KB_INVENTORY**: "Guía para Recibir Compras, Mover Lotes y Configurar Alertas"
- [ ] **KB_UNITS**: "Cómo configurar Unidades de Medida y sus Equivalencias (Conversiones)"

### 2. 🏪 Ventas, Restaurante y POS (Front of House)
- [ ] **KB_POS_SESSION**: "Cómo Abrir, Cuadrar y Cerrar Turnos de Caja (Z-Read)"
- [ ] **KB_ORDER_MANAGEMENT**: "Cómo Procesar un Pedido, Aplicar Descuentos y Dividir Cuentas"
- [ ] **KB_RESTAURANT**: "Guía de Gestión de Mesas, KDS (Pantallas de Cocina) y Reservaciones"

### 3. CRM & Marketing (Growth Hub)
- [ ] **KB_CRM**: "Cómo Gestionar Clientes y Oportunidades B2B (Pipelines)"
- [ ] **KB_CAMPAIGNS**: "Guía para Enviar Newsletters y Configurar Campañas de WhatsApp"
- [ ] **KB_REVIEWS**: "Cómo Contestar Reseñas y Validar el Sentimiento de los Clientes"

### 4. 💰 Precios y Fidelidad (Pricing Engine)
- [ ] **KB_PRICE_LISTS**: "Cómo Asignar Listas de Precios B2B Mayoristas vs Detal"
- [ ] **KB_PROMOTIONS**: "Cómo Crear Cupones, Combos y Promociones (2x1)"
- [ ] **KB_COMMISSIONS**: "Cómo Configurar Reglas de Propinas y Comisiones a Colaboradores"

### 5. 🚚 Logística y Storefront (Delivery & Online Shopping)
- [ ] **KB_DELIVERY_ZONES**: "Cómo Trazar Polígonos de Reparto (Mapas) y Tarifar por Kilómetro"
- [ ] **KB_STOREFRONT**: "Cómo Personalizar los Colores, Logo y Redes Sociales de Tu Tienda Web"

### 6. Contabilidad (Fiscal Compliance)
- [ ] **KB_BILLING_SENIAT**: "Guía Definitiva: Facturación, Notas de Crédito y Libros de Compra/Venta"
- [ ] **KB_ACCOUNTING**: "Entendiendo tu Catálogo de Cuentas y Cuadre de Cobranzas/Pagos"

### 7. ⚙️ Configuraciones Finales del Tenant
- [ ] **KB_SETTINGS**: "Guía para Vincular tu WhatsApp, SendGrid y Personalizar tu Empresa"

---
*Nota: Los módulos correspondientes a Nómina y Manufactura se pausarán en redacción hasta que el asistente "Claude" finalice la programación operativa listada en la fase estructural.*
# 📚 Knowledge Base: Facturación Fiscal y SENIAT
*Guía Definitiva para Cumplimiento Fiscal, Retenciones e IGTF*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Facturación garantiza que tu negocio cumpla con las leyes tributarias de Venezuela (SENIAT). Transforma una simple "Orden de Venta" del POS en un documento legal o Factura Electrónica/Providencia que genera asientos contables reales y afecta tus libros de IVA.

---

## ❓ Casos de Uso (FAQ)
- **¿Qué es una Nota de Entrega y por qué no es una Factura Fiscal?**
- **¿Cómo registro que un cliente "Gran Contribuyente" me retuvo el 75% del IVA?**
- **¿Por qué el sistema me cobró 3% de IGTF automático?**

---

## 👟 Paso a Paso

### A. Entender los Tipos de Documento Comercial
Cuando completas un pago en el POS o Módulo de Ventas, el sistema te pedirá emitir un comprobante. Opciones comunes:
1. **Nota de Entrega (Delivery Note):** Es un control interno no fiscal (Ej. Para presupuestos o control interno de almacén). No debes usarlo para evitar pagar impuestos, ya que la ley lo prohíbe.
2. **Factura Fiscal (Invoice):** Es el documento legal (Factura formato Libre o Máquina Fiscal). Registra el IVA (16%), Exentos, o Tasas Reducidas (8%).
3. **Nota de Crédito (Credit Note):** Única forma legal de anular o devolver una Factura ya emitida al cliente.
4. **Nota de Débito (Debit Note):** Para cobrar recargos sobre una factura ya emitida.

### B. Emisión de Factura Fiscal (Máquina o Imprenta Autorizada)
1. Al "Pagar" en el POS, si tu sistema está conectado a una Impresora Fiscal (Ej. Bematech, Bixolon), el sistema generará automáticamente el Ticket Fiscal y grabará en la Nube el **Número de Factura Fiscal** físico que arrojó la máquina.
2. Si eres emisor de **Facturación Electrónica / Serie Libre**, el sistema tomará tu secuencia automatizada (Ej. Nro. 000105) y generará el PDF timbrado para imprimir o enviar por correo.

### C. Pago en Divisa Extranjera e IGTF (Impuesto a las Grandes Transacciones Financieras)
*La ley exige (a empresas designadas Sujetos Pasivos Especiales) cobrar un 3% a los pagos recibidos en dólares físicos.*

1. Cobra una orden de $10 en el Checkout.
2. Si seleccionas el Método de Pago: **"Efectivo Dólares (USD)"** o **"Zelle"**.
3. El sistema evaluará si tú eres Sujeto Especial:
   - Si lo eres, el carrito agregará automáticamente un `Recargo IGTF (3%)` al total de la deuda.
   - El cliente tendrá que pagar $10.30 (o pagar los $0.30 equivalentes en Bolívares usando la tasa BCV del día).

### D. Declaración de Retención de IVA por el "Cliente Especial"
*Si le vendes a Polar o Banesco, ellos no te pagarán el 100% de la factura. Te retendrán el IVA (75% o 100%) y te darán un "Comprobante de Retención".*

1. Navega a **Facturación / Contabilidad > Documentos Fiscales** (Invoices).
2. Busca la Factura del cliente especial que dice *Estado: Pendiente por Pagar*.
3. Haz clic en **"Registrar Retención / Pago"**.
4. Ingresa el **Número de Comprobante de Retención** físico o digital que te entregó el cliente (Suele empezar por el año/mes).
5. Indica el monto base retenido. El sistema matará esa porción de la deuda de la factura en "Cuentas por Cobrar" y la trasladará a tus activos de "Crédito Fiscal" en Contabilidad.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Conversión BCV Inmutable:** Según la providencia del SENIAT 0071, las facturas en moneda extranjera DEBEN mostrar su equivalente en Bolívares usando la tasa de cambio oficial del BCV del DÍA DE LA EMISIÓN. Si reimprimes una factura de hace 2 meses, el sistema usará la tasa histórica de ese día, no la de hoy, caso contrario alterarías tus libros contables históricos (Corrupción de datos).
- **Control de Secuencia Estricto:** Si el "Consecutivo de Factura" actual es la 100, la siguiente tiene que ser obligatoriamente la 101. El sistema bloqueará (`SequenceLock`) cualquier intento de saltarse números para prevenir multas del ente regulador.
- **Libros de Compra y Venta:** Toda Factura generada y recepcionada viaja automáticamente al Libro de IVA. Solo un contador con permisos especiales puede modificar dichos libros a fin de mes.

---
*SmartKubik Knowledge Base V1.03 - Facturación y SENIAT*
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
# 📚 Knowledge Base: Catálogo y Productos
*Guía para Crear Productos, Variantes y Categorías*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Catálogo es el corazón de tu negocio. Aquí podrás registrar todo lo que vendes (o produces), organizarlo por categorías y crear variantes (como "Talla" o "Sabor") para mantener tu punto de venta (POS) y tienda en línea limpios y fáciles de navegar.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo agrego un producto nuevo al sistema?**
- **¿Cómo creo opciones para un mismo producto (ej. Refresco Pequeño, Mediano, Grande)?**
- **¿Cómo agrupo mis productos para que aparezcan juntos en el menú o tienda?**

---

## 👟 Paso a Paso

### A. Crear una Categoría Nueva
*Antes de crear productos, es recomendable tener "carpetas" (categorías) para organizarlos.*

1. Navega en el menú principal a **Inventario > Catálogo > Categorías**.
2. Haz clic en el botón superior derecho **"Nueva Categoría"**.
3. Completa los campos obligatorios:
   - **Nombre:** (Ej. *Bebidas*, *Pizzas*, *Ferretería*).
   - **Categoría Padre (Opcional):** Si quieres que "Refrescos" esté dentro de "Bebidas", selecciona la categoría principal aquí.
4. Sube una imagen representativa y haz clic en **"Guardar"**.

### B. Crear un Producto Simple
1. Navega a **Inventario > Catálogo > Productos**.
2. Haz clic en **"Nuevo Producto"**.
3. En la pestaña **Información General**:
   - Ingresa el **Nombre**, **SKU** (Código de barra o identificador único) y elige la **Categoría**.
   - Define el Tipo de Producto:
     - *Físico/Inventariable:* Si quieres llevar control de stock.
     - *Servicio:* Si es mano de obra o intangible (no descuenta inventario).
4. En la pestaña **Precios y Unidades**:
   - Establece la **Unidad de Manejo** (Ej. Unidad, Kg, Litro).
   - Ingresa el **Costo** base y el **Precio de Venta**. Configura los impuestos (IVA) si aplican.
5. Haz clic en **"Guardar Producto"**.

### C. Crear un Producto con Variantes (Opciones Múltiples)
Si vendes "Camisetas" en tallas S, M, L y colores Rojo, Azul, no crees 6 productos distintos. Crea variantes:

1. Crea o Edita un producto (Siguiendo el paso B).
2. Ve a la pestaña **Variantes**.
3. Activa la opción **"Este producto tiene múltiples opciones"**.
4. Haz clic en **"Añadir Opción"**:
   - **Nombre de Opción:** "Talla" -> **Valores:** S, M, L.
   - **Nombre de Opción:** "Color" -> **Valores:** Rojo, Azul.
5. El sistema generará todas las combinaciones posibles automáticamente (ej. *Camiseta Talla M, Color Azul*).
6. Asigna un **SKU único y un Precio distinto (si aplica)** a cada fila generada.
7. Haz clic en **"Guardar y Actualizar Variantes"**.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Bloqueos de SKU:** No puedes usar el mismo código SKU para dos productos distintos. Debe ser alfanumérico y único.
- **Cambio de Tipo:** Una vez que un producto es marcado como "Servicio", no puede convertirse en "Inventariable" si ya tiene ventas asociadas.
- **Borrado Lógico:** Si eliminas un producto que ya fue vendido históricamente, no desaparecerá de tus reportes financieros viejos (para mantener la legalidad contable); solo se ocultará de tu punto de venta actual (quedará archivado).

---
*SmartKubik Knowledge Base V1.03 - Catálogo y Productos*
# 📚 Knowledge Base: Comisiones y Propinas
*Cómo Configurar Reglas de Propinas y Comisiones a Colaboradores*

## 📌 ¿Qué puedo hacer aquí?
Este módulo te permite automatizar los incentivos de tu equipo de trabajo. Ya no tienes que sacar cuentas a mano el viernes por la noche; el sistema puede calcular qué porcentaje de propinas (Tips) o comisiones de venta le toca a cada mesero, cajero o estilista según su rendimiento o reglas establecidas.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo le doy el 5% de comisión al vendedor cada vez que venda un producto específico?**
- **¿Cómo reparto las propinas de una mesa entre el mesero y el cocinero (Tronco)?**
- **¿Puedo comisionar en base a la ganancia de la factura y no sobre el total de la venta?**

---

## 👟 Paso a Paso

### A. Crear un Plan de Comisiones para Vendedores
*Ideal para negocios de retail o proveedores de servicios donde los empleados ganan sobre sus ventas individuales.*

1. Navega a **RRHH / Configuración > Planes de Comisión**.
2. Haz clic en **"Nuevo Plan"**.
3. Nombra el Plan (Ej. *Comisión Especial Vendedores Junio*).
4. Elige la Base de Cálculo:
   - **Sobre las Ventas Brutas:** (Ej. 5% de lo facturado).
   - **Sobre el Margen de Ganancia:** El sistema resta el costo del producto primero, y paga comisión solo de la utilidad.
5. Selecciona el Tipo de Tasa:** Porcentaje (Ej. 5%) o Monto Fijo (Ej. $2 por cada venta).
6. **Bono o Meta (Opcional):** Puedes poner una condición "Si vende más de $1000 este mes".
7. Haz clic en **Guardar**. Luego, asigna al empleado específico este plan en su perfil (`EmployeeProfile`).

### B. Configurar Reglas de Propinas Compartidas (Tronco/Tip Splitting)
*Ideal para Restaurantes. Un cliente deja $10 de propina; el mesero se lleva $7 y la cocina $3.*

1. Navega a **Restaurante / Configuración > Reglas de Distribución de Propinas**.
2. Haz clic en **"Nueva Regla"**.
3. Selecciona el Pool (Fondo) de Propinas activo para la sucursal.
4. Agrega los "Roles" que participarán:
   - Rol A: *Restaurante_Mesero* -> Porcentaje: **70%**.
   - Rol B: *Restaurante_Cocinero* -> Porcentaje: **30%**.
5. *Condición:* Puedes indicar que los cocineros solo reciban propina de las mesas que superen las 2 horas de servicio, o hacerlo universal.
6. Guarda la regla. Al final del turno (en la Lectura Z), el sistema generará el reporte **Tips Report** con los montos exactos para cada empleado.

### C. Pago de las Comisiones (Liquidación)
*El mesero tiene $50 acumulados de propina en la semana.*

1. Ve a **RRHH > Liquidaciones (Liquidation Run)**.
2. Crea una "Corrida de Liquidación" para las fechas deseadas.
3. El sistema sumará todas las facturas procesadas por el empleado y le aplicará el plan de comisión activo.
4. Verás una tabla resumen y podrás emitir una "Cuenta por Pagar" o "Pago" (Pasando esos $50 al módulo de Contabilidad para que se reflejen en la caja).

---

## ⚠️ Reglas de Negocio y Advertencias
- **Descuentos Afectan Comisiones:** Si un empleado otorga un descuento del 100% (invitación de la casa) a una factura, su comisión será de $0. El sistema calcula las comisiones **post-descuento**, protegiendo la rentabilidad del negocio.
- **Facturas Anuladas / Devoluciones:** Si hoy un mesero genera una comisión de $5 y la cobra en efectivo al final del día... pero **mañana** el cliente devuelve el producto (Refund), el sistema registrará un saldo negativo de comisiones (-$5) para ese mesero. Esa deuda se descontará automáticamente en su próximo turno o quincena.
- **Registro del Cajero:** Para que las comisiones funcionen en Retail, el usuario que hace login en el Punto de Venta (User ID) debe ser la misma persona designada como "Vendedor". Si los empleados prestan contraseñas, las comisiones se asignarán erróneamente.

---
*SmartKubik Knowledge Base V1.03 - Comisiones y Propinas*
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
# 📚 Knowledge Base: Zonas de Reparto y Logística
*Cómo Trazar Polígonos de Reparto (Mapas) y Tarifar por Kilómetro*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Envíos y Logística te permite definir exactamente a dónde entregas tus productos y cuánto cobras por ello. Funciona dibujando áreas geográficas (Polígonos) en un mapa de Google/Leaflet o estableciendo reglas de distancia desde tu sucursal.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo cobro más caro el envío si el cliente vive cruzando el río?**
- **¿Puedo enviar paquetes con una empresa externa como Zoom o MRW?**
- **¿Cómo bloqueo compras en línea de personas que viven fuera de mi zona de cobertura?**

---

## 👟 Paso a Paso

### A. Trazar una Zona de Reparto Local (Polígonos)
*Ideal para envíos en moto (Delivery) propios del negocio.*

1. Ve a **Logística > Zonas de Entrega (Delivery Zones)**.
2. Haz clic en **"Nueva Zona"**.
3. **Paso Geoespacial:** Aparecerá un mapa interactivo (centrado en la dirección de tu sucursal).
4. Usa el ratón para hacer clic y "dibujar" un polígono cerrado sobre el mapa (Ej. Dibuja un cuadrado alrededor del sector Este de la ciudad).
5. **Configuración de Tarifa:**
   - Ingresa un Nombre (Ej. "Zona Este").
   - Define el Costo Base de envío para las direcciones que caigan dentro de esta figura (Ej. *$3.00*).
   - *Opcional:* Permite "Envío Gratis" si la compra dentro de la zona supera los $50.
6. Haz clic en **"Guardar Zona"**.

### B. Configurar Proveedores de Envío Nacional
*Ideal cuando envías paquetes a otras ciudades a través de empresas como Tealca o MRW.*

1. Dirígete a **Logística > Proveedores de Envío (Shipping Providers)**.
2. Haz clic en **"Añadir Proveedor"**.
3. Selecciona el proveedor del catálogo (o crea uno genérico).
4. Agrega los métodos de envío que ofrecen:
   - "Envío Estándar Nacional (3-5 días)" -> Costo: $5.00.
   - "Envío Express (24H)" -> Costo: $10.00.
5. Puedes habilitar la opción de "Tracking" si planeas brindar a tus clientes un número de guía.
6. Guarda el Proveedor.

### C. ¿Qué experimenta el Cliente en tu Storefront?
1. Cuando tu cliente ingrese en tu Tienda Web (Storefront) e intente pagar (Checkout), el sistema de mapas le pedirá su dirección.
2. **Magia detrás de escena:** El sistema cruza las coordenadas geográficas (Latitud/Longitud) de su casa con los Polígonos que trazaste en el Paso A.
3. Si el cliente está "dentro" del polígono, el carrito sumará automáticamente los $3.00 de envío.
4. Si el cliente está "fuera" del mapa, el sistema le bloqueará la opción de "Delivery Local" y solo le mostrará las tarifas del "Envío Nacional" (MRW/Tealca).

---

## ⚠️ Reglas de Negocio y Advertencias
- **Superposición de Zonas (Overlapping):** Evita dibujar un Polígono A encima del Polígono B. Si las coordenadas de una casa caen en áreas donde las tarifas se cruzan, el sistema podría generar un error de cálculo o frustrar al cliente. Trata de dibujar fronteras claras.
- **Rutas de Manufactura (Confusión Frecuente):** En las opciones de Logística verás algo llamado "Ruteo" (Routing). Ten en cuenta que esto NO se refiere a las motos de los repartidores. En este ERP, *Routing* es un término industrial que se refiere al viaje que hace la materia prima dentro de una fábrica para convertirse en producto ensamblado (Módulo MRP).

---
*SmartKubik Knowledge Base V1.03 - Logística y Zonas de Entrega*
# 📚 Knowledge Base: Inventario y Almacenes
*Guía para Recibir Compras, Mover Lotes y Configurar Alertas*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Inventario es donde llevas el control físico de tus productos "Inventariables". Te permite registrar las compras (entradas), auditar tu stock existente, manejar códigos de lote y fechas de caducidad (si aplica), y mover productos entre diferentes sucursales o depósitos.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo registro la mercancía que acaba de llegar del proveedor?**
- **¿Cómo muevo inventario del Almacén Principal a la Tienda?**
- **¿Cómo el sistema me avisa si me estoy quedando sin stock?**

---

## 👟 Paso a Paso

### A. Registrar una Recepción de Mercancía (Entrada de Inventario)
*Usa este proceso cada vez que recibas una encomienda o factura de tu proveedor para actualizar tus cantidades y costos físicos.*

1. Navega en el menú principal a **Inventario > Almacenes** (o Recepciones).
2. Haz clic en **"Nueva Recepción"** (o "Registrar Movimiento -> Entrada").
3. Selecciona el **Almacén de Destino** (ej. "Depósito Central" o "Tienda Principal").
4. Busca y selecciona el/los Producto(s) que vas a ingresar.
5. Para cada producto, debes definir:
   - **Cantidad Recibida:** El número de unidades.
   - **Costo Unitario:** Cuánto te costó comprarlo. *(Nota: Esto actualizará el margen de ganancia en tus reportes).*
   - **Lote y Caducidad (Opcional):** Si manejas alimentos o medicinas, ingresa el número de lote y la fecha de vencimiento.
6. Agrega una Nota o Referencia (ej. "Factura #1234 Proveedor XYZ").
7. Haz clic en **"Procesar Entrada"**. El inventario "Disponible" aumentará inmediatamente.

### B. Mover Inventario entre Almacenes (Traslados)
*Si tienes más de una sucursal, debes registrar los envíos entre ellas para que cuadren las cuentas.*

1. Navega a **Inventario > Movimientos**.
2. Haz clic en **"Nuevo Traslado"**.
3. Selecciona:
   - **Almacén Origen:** De dónde sale la mercancía.
   - **Almacén Destino:** A dónde llega.
4. Escanea o busca los productos y especifica la cantidad a mover.
5. El sistema verificará que tengas suficiente *Cantidad Disponible* en el Origen. Si no, no te dejará continuar.
6. Haz clic en **"Procesar Traslado"**. 
7. *(Importante: El almacén origen descontará sus unidades al instante, y el destino registrará la entrada)*.

### C. Ajuste de Inventario (Mermas, Daños o Cuadre Físico)
*Cuando haces un conteo físico y notas que te falta (o sobra) un producto porque se perdió, dañó o regaló.*

1. Navega a **Inventario > Ajustes** (o Movimientos).
2. Haz clic en **"Nuevo Ajuste"**.
3. Selecciona el Almacén.
4. Tipo de Ajuste:
   - **Salida / Reducción:** (Inventario perdido, robado, merma, vencido).
   - **Entrada / Aumento:** (Apareció inventario oculto/sobrante).
5. Escoge el producto, la cantidad a ajustar y **escribe obligatoriamente el motivo del ajuste** para fines de auditoría gerencial.
6. Haz clic en **"Guardar Ajuste"**.

### D. Configurar Alertas de Bajo Stock
1. Navega a **Inventario > Catálogo > Productos**.
2. Edita un producto existente (pestaña Inventario).
3. Localiza el campo **"Cantidad Mínima" (Punto de Reorden)**.
4. Ingresa un número (ej. "5"). 
5. Cuando el stock real llegue a 5 unidades, el sistema generará una notificación automática avisándote que debes contactar al proveedor.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Stock Comprometido:** Si creas una Orden de Venta en el POS (pero no la has despachado), el inventario pasará a estado "Reservado" o "Comprometido". No podrás hacer un traslado de esas unidades comprometidas, aunque físicamente sigan en el almacén.
- **Costeo Ponderado:** Si compras un producto hoy a 10$ y mañana a 12$, el sistema calculará un costo promedio automático. Ajustar los costos manualmente por fuera de las entradas puede alterar tu rentabilidad.
- **Auditoría:** Todos los movimientos de inventario guardan la fecha, hora y el Nombre del Usuario que los ejecutó. No hay forma legal de borrar un historial de movimiento sin dejar rastro en el reporte (`AuditLog`).

---
*SmartKubik Knowledge Base V1.03 - Inventario y Almacenes*
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
# 📚 Knowledge Base: Caja y Turnos (POS)
*Cómo Abrir, Cuadrar y Cerrar Turnos de Caja (Z-Read)*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Sesiones de Caja (Cash Register) es el control financiero de tu tienda física o restaurante. Te asegura que todo el dinero en efectivo que ingresa (o sale) durante la jornada cuadre perfectamente con las ventas registradas por el cajero, previniendo robos o pérdidas matemáticas.

---

## ❓ Casos de Uso (FAQ)
- **¿Qué es el "Fondo de Caja" al abrir el turno?**
- **¿Cómo registro si saqué dinero de la caja para pagar un delivery?**
- **¿Qué es el Cuadre Ciego o Lectura Z (Z-Read)?**

---

## 👟 Paso a Paso

### A. Abrir un Turno de Caja (Iniciando el día)
*Nadie puede procesar una venta en el Punto de Venta (POS) si no tiene una sesión de caja abierta.*

1. Ingresa a la pantalla principal del **Punto de Venta (POS)**.
2. Si es tu primera conexión del día, el sistema te pedirá automáticamente **"Abrir Sesión de Caja"**.
3. Ingresa el **Fondo Acumulado (Opening Balance):** Este es el dinero en efectivo con el que estás empezando el día (el "sencillo" para dar vuelto).
4. *Opcional:* Puedes ingresar el conteo detallado por denominación (Ej. 5 billetes de $1, 2 billetes de $5).
5. Haz clic en **"Abrir Caja"**. Ahora puedes empezar a facturar.

### B. Retiros o Ingresos de Efectivo Manuales (Cash Drops / Pay Outs)
*Útil cuando sacas dinero de la caja para pagar un "gasto hormiga" o cuando guardas exceso de efectivo en la caja fuerte por seguridad.*

1. Dentro de tu sesión activa del Punto de Venta, ve al menú **"Movimientos de Caja"** (o "Cash Management").
2. Selecciona el tipo de movimiento:
   - **Retiro (Pay Out):** Sacaste dinero. Ej: "Pago para el hielo o agua potable".
   - **Ingreso (Pay In):** Entró dinero no proveniente de una venta. Ej: "El gerente dejó $50 más para dar vuelto".
   - **Depósito de Seguridad (Drop):** Trasladar dinero a la caja fuerte del local.
3. Ingresa el **Monto** exacto y una **Razón** (obligatoria).
4. Haz clic en **"Guardar Movimiento"**.

### C. Cuadrar y Cerrar el Turno (Lectura Z)
*Al final de la jornada laboral o cuando cambias de cajero.*

1. Navega en el menú del POS y selecciona **"Cerrar Sesión / Cuadre de Caja"**.
2. **Cuadre Ciego:** El sistema te pedirá que cuentes e ingreses cuánto dinero físico REAL tienes en la gaveta, *antes de mostrarte cuánto deberías tener*.
   - Ingresa cuánto tienes en Efectivo (Bolívares y Dólares).
   - Ingresa los comprobantes físicos (vouchers) de Tarjetas de Débito/Crédito y Zelle.
3. Haz clic en **"Declarar Montos"**.
4. ¡El momento de la verdad! El sistema mostrará la **Reconciliación**:
   - *Esperado:* Lo que el sistema sumó en el día.
   - *Declarado:* Lo que tú contaste.
   - *Diferencia:* Si hay un sobrante o faltante.
5. Agrega una **Nota de Cierre** explicando el descuadre (si lo hubo).
6. Haz clic en **"Cerrar Turno Definitivamente"**.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Un Usuario, Una Caja:** El sistema no permite que dos usuarios tengan abierta la misma sesión de caja al mismo tiempo por razones de responsabilidad financiera.
- **Multimoneda (USD/VES):** Durante el cuadre, debes ser muy preciso al separar el efectivo en dólares del efectivo en bolívares. Mezclarlos generará descuadres irreconciliables debido a la tasa de cambio local.
- **Auditoría Gerencial:** Los cajeros no pueden editar ni borrar sesiones cerradas. Solo un Gerente o Administrador puede acceder al historial de **"Lecturas Z"** para revisar los cierres históricos en la sección de reportes.

---
*SmartKubik Knowledge Base V1.03 - Sesiones de Caja*
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
# 📚 Knowledge Base: Mi Tienda Web (Storefront)
*Cómo Personalizar tu Tienda Web y Vender por Internet*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Storefront es la "cara" pública de tu negocio. Te permite tener una página web propia donde tus clientes pueden ver tu catálogo en tiempo real, pedir delivery o reservar una mesa, sin necesidad de descargar ninguna aplicación externa (SaaS E-commerce).

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo cambio los colores de mi tienda para que coincidan con mi logo?**
- **¿Cómo agrego un botón flotante de WhatsApp a mi página web?**
- **¿Cómo hago para que mi tienda aparezca correctamente en Google (SEO)?**

---

## 👟 Paso a Paso

### A. Personalizar la Identidad Visual (Branding)
*Asegúrate de que la tienda se sienta tuya y no como una plantilla genérica.*

1. Navega a **Configuraciones > Mi Tienda (Storefront)**.
2. Sube tu logotipo:
   - Usa un archivo PNG con fondo transparente (Recomendado). Este logo aparecerá en el encabezado de todas las páginas de tu tienda y en los recibosPDF.
3. Elige los **Colores del Tema (Theme Colors)**:
   - *Color Primario:* El color principal que tendrán los botones de "Agregar al Carrito" y "Pagar".
   - *Color Secundario:* Para los detalles de fondo o alertas menores.
4. *Opcional:* Selecciona si prefieres el Tema Claro (Light Mode) o el Tema Oscuro (Dark Mode) por defecto para tus clientes.
5. Haz clic en **Guardar Cambios**.

### B. Agregar Enlaces de Redes Sociales y WhatsApp
*Muestra tus perfiles de Instagram o Facebook en el pie de página de tu tienda.*

1. Dentro de la configuración de Storefront, ve a la pestaña **"Redes Sociales"**.
2. Añade la URL completa de tu red social:
   - Ej. Instagram: `https://instagram.com/mitienda`
   - Ej. Facebook: `https://facebook.com/mitienda`
3. **Botón Flotante de WhatsApp:**
   - Activa el interruptor "Mostrar ChatFlotante de WhatsApp".
   - Ingresa tu código de país (Ej. `+58` o `+52`) seguido de tu número móvil.
   - Escribe un mensaje predeterminado (Ej. *"Hola, tengo una pregunta sobre un producto"*).
4. Guarda los cambios. Al instante aparecerá el ícono verde de WhatsApp en tu página web pública.

### C. Configurar el Posicionamiento en Buscadores (SEO)
*Esto es vital para que las personas encuentren tu tienda o restaurante cuando buscan en Google.*

1. En el menú de Storefront, busca la sección **SEO (Search Engine Optimization)**.
2. Configura el **Título Principal (Meta Title):** Debe ser atractivo. (Ej. *La Mejor Pizzería de Caracas - PizzaYa*).
3. Redacta la **Descripción Larga (Meta Description):** Máximo 160 caracteres. (Ej. *Pide las mejores pizzas artesanales a domicilio. Ingredientes frescos y entrega en menos de 30 minutos.*).
4. Agrega una **Imagen OG (Open Graph):** Esta es la foto grande que sale automáticamente como vista previa cuando alguien envía el enlace (URL) de tu tienda por un chat de WhatsApp o lo pública en Facebook.
5. Guarda los ajustes. (Nota: Google puede tardar desde horas hasta semanas en rastrear y mostrar estos nuevos cambios en sus resultados de búsqueda).

---

## ⚠️ Reglas de Negocio y Advertencias
- **Sincronización de Catálogo:** Lo que se vende en tu caja registradora (POS) afecta directamente al *Storefront*. Si un producto llega a "Cero" unidades en la tienda física, aparecerá automáticamente como "Agotado" (Out of Stock) en la web, evitando que te hagan pedidos de mercancía que ya no tienes.
- **Botón de Apagado Rápido:** Si tu cocina colapsa y no recibes más pedidos, puedes usar el botón "Pausar Pedidos En Línea" en la configuración general. Los clientes podrán seguir viendo el catálogo, pero el botón de pago se desactivará temporalmente con un mensaje de disculpas.

---
*SmartKubik Knowledge Base V1.03 - Storefront y SEO*
# 📚 Knowledge Base: Unidades y Conversiones
*Cómo Configurar Unidades de Medida y sus Equivalencias*

## 📌 ¿Qué puedo hacer aquí?
Este módulo es vital si compras insumos al mayor y los vendes al detal (ej. Compras un saco de 50 Kg de harina, pero vendes pizzas de 200 gramos). Aquí configuras las reglas matemáticas para que el inventario se descuente correctamente sin importar cómo empaquetas o preparas tus productos.

---

## ❓ Casos de Uso (FAQ)
- **¿Qué hago si compro por "Cajas" pero vendo por "Unidades"?**
- **¿Cómo le digo al sistema que un Litro son 1000 mililitros?**
- **¿Por qué necesito una Unidad Base y Unidades Derivadas?**

---

## 👟 Paso a Paso

### A. Entendiendo "Tipos de Unidades" vs "Conversiones"
- **TIPO DE UNIDAD (Unit Type):** Es la familia universal de la medida. Ej: Peso, Volumen, Longitud.
- **UNIDAD DE CONVERSIÓN (Unit Conversion):** Es la regla específica para tu producto. Ej: "Para el producto *Cerveza XYZ*, 1 Caja = 24 Botellas".

### B. Crear un Tipo de Unidad (Medidas Estándar)
*Nota: El sistema ya trae configuradas las medidas estándar (Kg, Gr, Litros), pero puedes crear las tuyas propias (Ej. "Porciones", "Baldes").*

1. Navega a **Configuración > Unidades de Medida** (o Tipo de Unidad).
2. Haz clic en **"Nuevo Tipo de Unidad"**.
3. Selecciona la categoría global (Ej. Volumen, Empaque).
4. Define tu **Unidad Base**: Esta debe ser la medida más pequeña en la que consumes o vendes. (Ej. Para peso, la unidad base suele ser el *Gramo*, no el *Kilo*).
5. Crea las reglas hacia arriba. Ejemplo si tu base es Gramo (gr):
   - Kilogramo (Kg) = Equivalencia: 1000.
   - Saco = Equivalencia: 50000 (Si el saco trae 50kg).
6. Haz clic en **"Guardar"**.

### C. Configurar una Conversión Específica a un Producto (Cajas a Unidades)
*Este es el caso más común en inventario. Compras Cajas, vendes Unidades sueltas.*

1. Navega a **Inventario > Catálogo > Productos**.
2. Edita el producto deseado (Ej. *Refresco Lata 355ml*).
3. Localiza la pestaña o sección de **"Unidades y Conversiones"**.
4. Define la **Unidad de Inventario (Unidad Base):** Generalmente será "Unidad" (Ej. 1 lata).
5. Define la **Unidad de Compra:** Generalmente será "Caja" o "Display".
6. Establece el **Factor de Conversión**:
   - *Regla:* "1 [Unidad de Compra] contiene X [Unidades de Inventario]".
   - *Ejemplo:* 1 Caja contiene 24 Unidades. A la inversa, equivale a que multiplicas por 24.
7. Guarda los cambios del producto.

### D. ¿Qué pasa ahora cuando hago una compra o una venta?
- **Al Comprar (Entrada):** Cuando vayas al módulo de Recepciones e ingreses "5 Cajas" de Refresco, el sistema multiplicará automáticamente 5 x 24 y sumará **120 unidades** a tu inventario real.
- **Al Vender (Punto de Venta):** Cuando un cliente compre 1 Refresco, el sistema descontará 1 unidad. Te quedarán 119 unidades en stock (o matemáticamente: 4 Cajas y 19 latas).

---

## ⚠️ Reglas de Negocio y Advertencias
- **No cambies la Unidad Base:** Si ya tienes inventario registrado de un producto en "Unidades", cambiar su unidad base a "Kilos" causará un colapso matemático en los saldos históricos de la base de datos.
- **Operaciones de Cocina (Consumibles):** En los ingredientes y recetas (BOM), siempre utiliza la **Unidad de Consumo**. Por ejemplo, puedes comprar Carne por Kilo, guardarla por Kilo, pero tu receta de Hamburguesa consumirá "200 gramos". El factor de conversión se encargará del resto (descontará 0.200 Kg).
- **Consistencia de Categoría:** El sistema te impedirá lógicamente tratar de convertir Peso en Volumen (Ej. Gramos a Litros) a menos que manejes densidades (que actualmente no es soportado de forma estandarizada).

---
*SmartKubik Knowledge Base V1.03 - Unidades y Conversiones*
