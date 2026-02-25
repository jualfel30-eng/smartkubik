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
