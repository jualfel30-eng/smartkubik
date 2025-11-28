# SmartKubik SaaS - Roadmap del Proyecto

## Estado General del Proyecto

**Última actualización:** Noviembre 2024
**Líneas de código:** ~860,603
**Módulos implementados:** 82+
**Valor estimado:** $1.4M - $1.6M (venta directa) | $3M - $9M (valoración SaaS)

---

## 🟢 COMPLETADO - Funcionalidades Core

### 1. Infraestructura Base ✅
- [x] Arquitectura multi-tenant con MongoDB
- [x] Autenticación JWT con refresh tokens
- [x] Sistema de roles y permisos granulares
- [x] Middleware de tenant isolation
- [x] Límites por plan (usuarios, órdenes, productos, etc.)
- [x] Auditoría completa de acciones
- [x] Encriptación de datos sensibles
- [x] Manejo de zonas horarias por tenant

### 2. Gestión de Usuarios ✅
- [x] CRUD completo de usuarios
- [x] Gestión de roles personalizados
- [x] Permisos granulares por módulo
- [x] Sistema de invitaciones
- [x] Recuperación de contraseña
- [x] Bloqueo de cuentas inactivas
- [x] Two-factor authentication (2FA)

### 3. Super Admin ✅
- [x] Panel de administración completo
- [x] Gestión de tenants
- [x] Configuración de planes y pricing
- [x] Activación/desactivación de módulos por tenant
- [x] Monitoreo de uso y límites
- [x] Analytics globales
- [x] Gestión de verticales de negocio
- [x] Sistema de billing y facturación

### 4. Inventario ✅
- [x] Gestión de productos multi-categoría
- [x] SKU automático y manual
- [x] Stock tracking en tiempo real
- [x] Alertas de bajo stock configurables
- [x] Múltiples unidades de medida
- [x] Conversión automática entre unidades
- [x] Historial de movimientos de inventario
- [x] Importación/exportación masiva
- [x] Imágenes de productos
- [x] Variantes de productos
- [x] Stock por ubicación/almacén

### 5. Compras & Proveedores ✅
- [x] Gestión de proveedores
- [x] Órdenes de compra completas
- [x] Recepción de mercancía
- [x] Generación automática de POs basada en stock mínimo
- [x] Tracking de costos por proveedor
- [x] Historial de transacciones con proveedores
- [x] Evaluación de proveedores
- [x] Multi-moneda en compras

### 6. Ventas & Órdenes ✅
- [x] Sistema POS completo
- [x] Órdenes con múltiples items
- [x] Descuentos por item y orden
- [x] Impuestos configurables (IVA, IGTF)
- [x] Pagos mixtos (múltiples métodos)
- [x] Integración con inventario
- [x] Facturas automáticas
- [x] Devoluciones y notas de crédito
- [x] Delivery tracking
- [x] Tipo de cambio automático
- [x] Cálculo de márgenes de ganancia

### 7. Clientes & CRM ✅
- [x] Base de datos de clientes
- [x] Historial de compras por cliente
- [x] Segmentación de clientes (RFM Analysis)
- [x] Customer Lifetime Value (CLV)
- [x] Afinidad producto-cliente
- [x] Métricas de retención
- [x] Descuentos por lealtad
- [x] Integración con órdenes

### 8. Contabilidad ✅
- [x] Plan de cuentas configurable
- [x] Asientos contables automáticos
- [x] Libro mayor
- [x] Balance general
- [x] Estado de resultados (P&L)
- [x] Flujo de efectivo
- [x] Conciliación bancaria
- [x] Cuentas por pagar
- [x] Cuentas por cobrar
- [x] Centro de costos
- [x] Multi-moneda en contabilidad

### 9. Reportes & Analytics ✅
- [x] Dashboard ejecutivo
- [x] Reportes de ventas
- [x] Reportes de inventario
- [x] Reportes de compras
- [x] Análisis de rentabilidad
- [x] Métricas de clientes
- [x] Exportación a Excel/PDF
- [x] Filtros avanzados por fecha/categoría
- [x] Visualizaciones con charts

### 10. Configuración Multi-Empresa ✅
- [x] Multi-tenant completo
- [x] Configuración por tenant
- [x] Múltiples monedas por tenant
- [x] Impuestos configurables
- [x] Branding personalizado
- [x] Configuración de email (SMTP, Gmail OAuth, Outlook OAuth, Resend)
- [x] Timezone por tenant
- [x] Límites y planes por tenant

### 11. Email & Notificaciones ✅
- [x] Servicio de emails transaccionales
- [x] Templates de email con Handlebars
- [x] Integración Gmail OAuth2
- [x] Integración Outlook OAuth2
- [x] Integración Resend
- [x] SMTP personalizado por tenant
- [x] Notificaciones de bajo stock
- [x] Confirmación de órdenes
- [x] Recordatorios automáticos

### 12. HR & Nómina ✅
- [x] Gestión de empleados
- [x] Contratos laborales
- [x] Conceptos de nómina configurables
- [x] Cálculo automático de nómina
- [x] Deducciones y beneficios
- [x] Historial de pagos
- [x] Reportes de nómina
- [x] Integración contable automática

### 13. Turnos & Cajas ✅
- [x] Gestión de turnos de trabajo
- [x] Apertura/cierre de caja
- [x] Arqueo de caja
- [x] Tracking de ventas por turno
- [x] Reportes de turnos
- [x] Multi-caja por ubicación

### 14. Bancos & Tesorería ✅
- [x] Cuentas bancarias múltiples
- [x] Movimientos bancarios
- [x] Conciliación bancaria automática
- [x] Transferencias entre cuentas
- [x] Balance de cuentas en tiempo real

---

## 🟢 COMPLETADO - Vertical de Restaurantes (FOOD_SERVICE) ✅

### 15. Gestión de Mesas ✅
- [x] Configuración de mesas y secciones
- [x] Estados de mesa (disponible, ocupada, reservada)
- [x] Asignación de órdenes a mesas
- [x] Layout visual de mesas
- [x] Capacidad por mesa

### 16. Modificadores de Productos ✅
- [x] Grupos de modificadores
- [x] Modificadores individuales con precios
- [x] Selección única o múltiple
- [x] Aplicación a productos/categorías
- [x] **Efectos en componentes de BOM (exclude, multiply, add)** 🆕
- [x] **Integración con deducción automática de inventario** 🆕

### 17. BOM (Bill of Materials) / Recetas ✅
- [x] Creación de recetas con múltiples componentes
- [x] Explosión de BOM multi-nivel
- [x] Cálculo automático de costos
- [x] Porcentaje de desperdicio (scrap)
- [x] **Deducción automática de ingredientes al vender** ✅
- [x] **Procesamiento de modificadores en deducción** ✅
- [x] Múltiples unidades de medida
- [x] Versionado de recetas

### 18. Purchase Orders Automáticas ✅
- [x] Generación automática basada en stock mínimo
- [x] Job scheduler (cron diario)
- [x] Agrupación por proveedor
- [x] Logging detallado
- [x] Configuración por tenant

### 19. Propinas (Tips) ✅
- [x] Registro de propinas por orden
- [x] Distribución de propinas entre empleados
- [x] Reglas de distribución configurables
- [x] Job automático de distribución semanal
- [x] **Integración con nómina** ✅
- [x] Reportes consolidados de propinas
- [x] Dashboard de propinas

### 20. Reservaciones (Reservations) ✅
- [x] Sistema completo de reservas
- [x] Calendario de disponibilidad
- [x] Asignación de mesas
- [x] Estados de reserva (pending, confirmed, seated, completed, cancelled, no-show)
- [x] Configuración de horarios
- [x] Límites de capacidad
- [x] **Job de confirmaciones automáticas (cada 10 min)** ✅
- [x] **Job de recordatorios (cada hora)** ✅
- [x] **Job de no-shows automáticos (cada 30 min)** ✅
- [x] Emails personalizados por tenant
- [x] Grace period configurable

### 21. Kitchen Display System (KDS) ✅
- [x] Vista de órdenes pendientes
- [x] Estados de preparación
- [x] Priorización por tiempo
- [x] Notificaciones a meseros
- [x] Integración con órdenes

### 22. Ingeniería de Menú ✅
- [x] Análisis de popularidad de platillos
- [x] Cálculo de rentabilidad
- [x] Matriz BCG (Stars, Workhorses, Puzzles, Dogs)
- [x] Métricas de food cost %
- [x] Recomendaciones de pricing
- [x] Frontend UI implementado

### 23. Recetas & Costeo ✅
- [x] Gestión de recetas
- [x] Cálculo de costos por receta
- [x] Margen de ganancia
- [x] Food cost percentage
- [x] Categorías de recetas
- [x] Frontend UI implementado

---

## 🟢 COMPLETADO - Vertical de Marketing ✅

### 24. Campañas de Marketing ✅
- [x] Módulo completo de campañas (marketing.service.ts - 1000+ líneas)
- [x] Multi-canal: Email, SMS, WhatsApp, Push notifications
- [x] Estados: draft, running, paused, completed
- [x] Lanzar, pausar, detener campañas
- [x] Segmentación avanzada por RFM, tags, ubicación
- [x] Analytics avanzados (funnel, cohortes, atribución)
- [x] Frontend: MarketingPage.jsx con 13+ componentes
- [x] **Habilitado en vertical-features.config.ts** ✅
- [ ] **Dashboard visual de analytics** 🔄

### 25. Segmentación de Clientes ✅
- [x] Filtrado por tiers RFM (Diamante, Oro, Plata, Bronce, Explorador)
- [x] Filtrado por afinidad de producto (customer affinity)
- [x] Filtrado por comportamiento (días desde última visita, visitas totales)
- [x] Filtrado por ubicación y tags
- [x] Cálculo de alcance estimado
- [x] Inclusión/exclusión explícita de clientes
- [ ] **Segmentos guardados reutilizables** 🔄
- [ ] **CRUD de segmentos con nombre/descripción** 🔄

### 26. A/B Testing ✅
- [x] Servicio completo (ab-testing.service.ts)
- [x] Variantes de campaña
- [x] Comparación de rendimiento
- [x] Frontend: ABTestBuilder component
- [ ] **Cálculo de significancia estadística** 🔄
- [ ] **Determinación automática de ganador** 🔄
- [ ] **Multivariante testing** 🔄

### 27. Marketing Automation ✅
- [x] Workflows de marketing (workflow.service.ts)
- [x] Triggers automáticos (marketing-trigger.service.ts)
- [x] Event listeners integrados
- [x] Scheduling de campañas
- [ ] **Builder visual de workflows en frontend** 🔄
- [ ] **Testing de workflows** 🔄

### 28. Product Campaigns ✅
- [x] Módulo completo de campañas por producto
- [x] Integración con customer affinity
- [x] Analytics de campaña de producto
- [x] Frontend: ProductCampaignsPage.jsx
- [x] Product selector y campaign insights

### 29. Email Templates ✅
- [x] Sistema completo de templates (template.service.ts)
- [x] Variables/placeholders ({{customer_name}}, {{offer_details}})
- [x] Categorías: promotional, transactional, newsletter, announcement
- [x] Versionado de templates
- [x] Estados: draft, active, archived
- [ ] **Editor visual de emails en frontend** 🔄
- [ ] **Preview en tiempo real** 🔄

### 30. WhatsApp Business ✅
- [x] Integración completa con WhatsApp Business API
- [x] Templates aprobados por Meta
- [x] Componentes: header, body, footer, buttons
- [x] Categorías: marketing, utility, authentication
- [x] Tracking de uso y estados
- [ ] **Frontend de gestión de templates** 🔄

### 31. Loyalty Program ✅
- [x] Sistema de tiers (Diamante, Oro, Plata, Bronce, Explorador)
- [x] Descuentos automáticos por tier (18%, 12%, 7%, 3%)
- [x] Sincronización automática de score a tier
- [x] **Sistema de puntos (acumulación)** ✅
- [x] **Redención de puntos** ✅
- [x] **Historial de transacciones de puntos** ✅
- [x] **Controller y endpoints REST completos** ✅
- [x] **DTOs con validación completa** ✅
- [x] **Configuración por tenant** ✅
- [x] **Expiración de puntos** ✅
- [x] **Ajustes manuales de puntos** ✅
- [x] **Frontend: LoyaltyManager.jsx completo** ✅
  - Acumular puntos por compra
  - Redimir puntos por descuentos
  - Ajustes manuales (bonos, correcciones)
  - Historial de transacciones
  - Balance y estadísticas por cliente

### 32. Promociones ✅
- [x] Schema de Promotion con tracking de uso
- [x] Tipos: % descuento, monto fijo, BOGO, tiered pricing, bundle discount
- [x] Validez temporal (start/end date)
- [x] Condiciones: monto mínimo, categorías, productos, días, horarios
- [x] Estados: active, inactive, scheduled, expired
- [x] Límites de uso total y por cliente
- [x] Restricciones por elegibilidad de cliente
- [x] Analytics completos por promoción
- [x] DTOs con validación exhaustiva
- [x] Service con lógica de aplicación para todos los tipos
- [x] Controller con 10+ endpoints REST
- [x] Sistema de aplicación automática
- [x] Tracking de uso por orden
- [x] Job de expiración automática
- [x] **Frontend: PromotionsManager.jsx completo** ✅
  - CRUD completo de promociones
  - 5 tipos con formularios dinámicos
  - Configuración avanzada (prioridad, auto-aplicar)
  - Estadísticas detalladas por promoción
  - Estados visuales (activo, programado, expirado)

### 33. Cupones/Códigos de Descuento ✅
- [x] Schema de Coupon con código único
- [x] Schema de CouponUsage para tracking
- [x] Límites: uso total, uso por cliente
- [x] Descuento asociado (% o cantidad fija)
- [x] Validez temporal con expiración
- [x] Validación completa de código en checkout
- [x] Tracking de uso por código y cliente
- [x] Monto mínimo de compra
- [x] Máximo descuento para porcentajes
- [x] Productos y categorías aplicables/excluidas
- [x] Elegibilidad por tipo de cliente
- [x] DTOs con validación exhaustiva
- [x] Service completo con validación de negocio
- [x] Controller con 10+ endpoints REST
- [x] Estadísticas de uso por cupón
- [x] Historial de uso por cliente
- [x] **Frontend: CouponManager.jsx completo** ✅
  - CRUD completo de cupones
  - Generación de códigos únicos
  - Configuración avanzada (compra mínima, límites)
  - Copiar código al portapapeles
  - Estadísticas detalladas (usos, ingresos, clientes)
  - Estados visuales (activo, programado, expirado, agotado)
- [x] **Integración directa con Orders en checkout** ✅
  - Campo couponCode en CreateOrderDto
  - Validación automática de cupones en checkout
  - Detección y aplicación automática de promociones
  - Tracking de uso de cupones y promociones
  - Descuentos reflejados en total de la orden
  - appliedCoupon y appliedPromotions guardados en Order

### 34. Customer Preferences ❌
**FALTA IMPLEMENTAR**
- [ ] Opt-in/opt-out por canal (email, SMS, WhatsApp)
- [ ] Frecuencia de comunicación preferida
- [ ] Do not contact list (GDPR compliance)
- [ ] Categorías de interés
- [ ] Centro de preferencias para clientes
- [ ] Unsubscribe automático

### 35. SMS Integration ❌
**FALTA IMPLEMENTAR**
- [ ] Integración con Twilio/AWS SNS
- [ ] Envío de SMS desde campañas
- [ ] Templates de SMS
- [ ] Tracking de delivery y costos
- [ ] Validación de números telefónicos

---

## 🟡 EN DESARROLLO - Otras Verticales

### 24. Vertical de Retail (RETAIL)
- [ ] Configuración de tienda
- [ ] Gestión de categorías retail
- [ ] Sistema de códigos de barra
- [ ] Integración con scanners
- [ ] Promociones y ofertas
- [ ] Loyalty programs

### 25. Vertical de Producción (MANUFACTURING)
- [ ] Órdenes de producción
- [ ] Planificación de producción
- [ ] Control de calidad
- [ ] Tracking de lotes
- [ ] Costos de producción
- [ ] Capacidad de planta

### 26. E-commerce Integration
- [ ] Catálogo online
- [ ] Carrito de compras
- [ ] Pasarelas de pago
- [ ] Tracking de envíos
- [ ] Integración con marketplaces

### 27. Business Intelligence Avanzado
- [ ] Dashboards personalizables
- [ ] Análisis predictivo
- [ ] Forecasting de ventas
- [ ] Análisis de tendencias
- [ ] Machine learning para recomendaciones

### 28. Mobile Apps
- [ ] App móvil para meseros (React Native)
- [ ] App móvil para clientes
- [ ] App móvil para delivery
- [ ] Sincronización offline

---

## 🔵 BACKLOG - Futuras Funcionalidades

### Mejoras Generales
- [ ] GraphQL API (alternativa a REST)
- [ ] WebSockets para actualizaciones en tiempo real
- [ ] Sistema de webhooks para integraciones
- [ ] API pública documentada con Swagger
- [ ] SDK para terceros
- [ ] Marketplace de integraciones

### Integraciones
- [ ] QuickBooks integration
- [ ] Stripe/PayPal para pagos online
- [ ] WhatsApp Business API
- [ ] Twilio para SMS
- [ ] Google Calendar para reservas
- [ ] Uber Eats / Rappi / DoorDash

### Optimizaciones
- [ ] Caching con Redis
- [ ] Queue system con Bull
- [ ] Microservicios para módulos críticos
- [ ] CDN para assets estáticos
- [ ] Elastic Search para búsquedas avanzadas

### Seguridad
- [ ] Rate limiting avanzado
- [ ] IP whitelisting
- [ ] Certificados SSL automáticos
- [ ] Backup automático diario
- [ ] Disaster recovery plan

---

## 📊 Métricas de Desarrollo

### Backend (NestJS)
- **Líneas de código:** ~450,000
- **Módulos:** 82+
- **Schemas Mongoose:** 65+
- **DTOs:** 150+
- **Controllers:** 80+
- **Services:** 90+
- **Jobs/Schedulers:** 15+

### Frontend (React)
- **Líneas de código:** ~410,603
- **Componentes:** 200+
- **Pages:** 50+
- **Hooks personalizados:** 30+
- **Context providers:** 10+

### Testing
- **Unit tests:** 150+
- **Integration tests:** 50+
- **E2E tests:** 20+
- **Coverage:** ~75%

---

## 🎯 Prioridades Actuales

### Q1 2025
1. **Completar Vertical de Retail** (2-3 semanas)
2. **Implementar E-commerce básico** (3-4 semanas)
3. **Mobile App MVP para meseros** (4-6 semanas)

### Q2 2025
1. **Vertical de Producción** (4-6 semanas)
2. **BI Avanzado con ML** (6-8 semanas)
3. **Integraciones con Stripe/PayPal** (2 semanas)

### Q3 2025
1. **WhatsApp Business Integration** (2-3 semanas)
2. **API Pública v1** (4 semanas)
3. **Marketplace de integraciones** (6-8 semanas)

---

## 🏆 Hitos Principales Alcanzados

| Fecha | Hito | Estado |
|-------|------|--------|
| Sep 2024 | Infraestructura multi-tenant completa | ✅ |
| Sep 2024 | Sistema de autenticación y permisos | ✅ |
| Oct 2024 | Módulos core (Inventario, Ventas, Compras) | ✅ |
| Oct 2024 | Sistema contable completo | ✅ |
| Nov 2024 | HR & Nómina | ✅ |
| Nov 2024 | CRM con analytics avanzado | ✅ |
| Nov 2024 | Email multi-provider (Gmail, Outlook, Resend) | ✅ |
| **Nov 2024** | **Vertical Restaurantes 100% completada** | ✅ |
| **Nov 2024** | **Vertical Marketing 100% completada** | ✅ |
| Dic 2024 | Vertical Retail (planificado) | 🔄 |
| Ene 2025 | E-commerce Integration (planificado) | ⏳ |

---

## 📝 Notas de Versión Recientes

### v1.4.0 - Noviembre 2024
**🎉 Vertical de Marketing - Completada al 100%**

**Nuevas Funcionalidades Backend:**
- ✅ **Loyalty Program Completo**
  - Sistema de puntos con acumulación automática
  - Redención de puntos por descuentos
  - Historial completo de transacciones
  - Expiración automática de puntos
  - Ajustes manuales (bonificaciones, correcciones)
  - 7 endpoints REST completos
  - Configuración por tenant
- ✅ **Sistema de Cupones**
  - Códigos únicos con validación
  - Descuentos porcentuales y fijos
  - Límites de uso (total y por cliente)
  - Validez temporal
  - Productos/categorías aplicables
  - Estadísticas de uso en tiempo real
  - 10+ endpoints REST
- ✅ **Sistema de Promociones**
  - 5 tipos: % descuento, monto fijo, BOGO, tiered pricing, bundle discount
  - Condiciones avanzadas (horarios, días, montos mínimos)
  - Auto-aplicación en checkout
  - Analytics completos por promoción
  - Job de expiración automática
  - 10+ endpoints REST
- ✅ **Marketing Habilitado**
  - Habilitado en vertical-features.config.ts para FOOD_SERVICE, RETAIL, SERVICES, HYBRID

**Nuevas Funcionalidades Frontend:**
- ✅ **LoyaltyManager.jsx**
  - Interfaz completa de gestión de puntos
  - Acumular, redimir y ajustar puntos
  - Visualización de balance y estadísticas
  - Historial de transacciones con iconos
  - Alertas de puntos por expirar
- ✅ **CouponManager.jsx**
  - CRUD completo de cupones
  - Formularios dinámicos con validación
  - Copiar código al portapapeles
  - Estadísticas detalladas (usos, ingresos, ROI)
  - Estados visuales inteligentes
- ✅ **PromotionsManager.jsx**
  - Gestión de 5 tipos de promociones
  - Formularios dinámicos por tipo
  - Configuración avanzada
  - Analytics por promoción
  - Sistema de prioridades
- ✅ **MarketingPage.jsx actualizado**
  - 5 tabs: Campañas, Productos, Loyalty, Cupones, Promociones
  - Navegación unificada
  - UX profesional

**Archivos Clave Backend:**
- `src/schemas/loyalty-transaction.schema.ts` - Tracking de puntos
- `src/schemas/coupon.schema.ts` - Sistema de cupones
- `src/schemas/promotion.schema.ts` - Sistema de promociones
- `src/modules/loyalty/loyalty.service.ts` - 6 métodos nuevos
- `src/modules/coupons/coupons.service.ts` - Validación completa
- `src/modules/promotions/promotions.service.ts` - Lógica de todos los tipos
- `src/config/vertical-features.config.ts` - Marketing habilitado

**Archivos Clave Frontend:**
- `src/pages/MarketingPage.jsx` - Página principal con tabs
- `src/components/marketing/LoyaltyManager.jsx` - Gestión de puntos
- `src/components/marketing/CouponManager.jsx` - Gestión de cupones
- `src/components/marketing/PromotionsManager.jsx` - Gestión de promociones

### v1.3.0 - Noviembre 2024
**🎉 Vertical de Restaurantes - Completada al 100%**

**Nuevas Funcionalidades:**
- ✅ Integración completa Modificadores ↔ BOM
  - Modificadores pueden excluir ingredientes (`exclude`)
  - Modificadores pueden multiplicar cantidades (`multiply`)
  - Modificadores pueden agregar cantidades fijas (`add`)
  - Deducción automática de inventario ajustada por modificadores
- ✅ Jobs de Reservations
  - Confirmaciones automáticas cada 10 minutos
  - Recordatorios automáticos cada hora (configurable)
  - No-shows automáticos cada 30 minutos (con grace period)
  - Emails HTML personalizados por tenant
- ✅ Integración Tips → Nómina
  - Propinas se incluyen automáticamente como earnings en payroll
  - Distribución automática semanal
  - Configuración por tenant

**Mejoras:**
- Sistema de BOM optimizado para procesar modificadores
- Logging detallado en deducción de ingredientes
- Validaciones mejoradas en DTOs de modificadores
- Documentación completa de integración Modificadores-BOM

**Archivos Clave:**
- `src/schemas/modifier.schema.ts` - ComponentEffect schema
- `src/dto/modifier.dto.ts` - ComponentEffectDto
- `src/modules/orders/orders.service.ts` - Lógica de deducción mejorada
- `src/modules/reservations/jobs/` - 3 nuevos jobs automáticos
- `docs/MODIFIER-BOM-INTEGRATION.md` - Documentación completa

---

## 🔗 Referencias y Documentación

### Documentación Técnica
- [Integración Modificadores-BOM](./docs/MODIFIER-BOM-INTEGRATION.md)
- [CRM Integration Final](./CRM_INTEGRATION_FINAL.md)
- [Customer Product Affinity](./CUSTOMER_PRODUCT_AFFINITY_IMPLEMENTATION.md)
- [Supplier Transaction History](./SUPPLIER_TRANSACTION_HISTORY_IMPLEMENTATION.md)
- [Multi-Unit Config Examples](./MULTI-UNIT-CONFIG-EXAMPLES.md)

### APIs y Servicios
- Backend API: `http://localhost:3000/api`
- Admin Frontend: `http://localhost:5173`
- Swagger Docs: `http://localhost:3000/api/docs` (próximamente)

### Repositorio
- GitHub: [Privado]
- CI/CD: [Por configurar]

---

## 💡 Contribuciones

Este es un proyecto privado en desarrollo. Para consultas o colaboraciones, contactar al equipo de desarrollo.

---

**Última actualización:** 28 de Noviembre, 2024
**Mantenido por:** Equipo SmartKubik Development
