# SmartKubik ERP SaaS — Análisis Exhaustivo del Producto
## Documento de Contexto para Estrategia Holística de Crecimiento
### Fecha: Febrero 2025 | Versión: V1.03

---

## TABLA DE CONTENIDOS
1. [Visión General del Producto](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura Multi-Tenant](#3-arquitectura-multi-tenant)
4. [Módulos y Funcionalidades — Admin (Frontend)](#4-módulos-admin)
5. [Módulos y Funcionalidades — Backend (API)](#5-módulos-backend)
6. [Storefront (Tienda Online por Tenant)](#6-storefront)
7. [Sistema de Blog y Contenido](#7-blog-y-contenido)
8. [Sistema de Documentación](#8-documentación)
9. [Landing Pages y Marketing Actual](#9-landing-y-marketing)
10. [Flujo de Registro y Onboarding](#10-registro-y-onboarding)
11. [Super-Admin y Gestión de Plataforma](#11-super-admin)
12. [Integraciones con Terceros](#12-integraciones)
13. [Verticales de Negocio Soportados](#13-verticales)
14. [Planes de Suscripción Actuales](#14-planes)
15. [Fortalezas y Potencialidades](#15-fortalezas)
16. [Debilidades y Puntos Negativos](#16-debilidades)
17. [Análisis del Embudo de Ventas Actual](#17-embudo-de-ventas)
18. [Barreras de Entrada para Usuarios](#18-barreras-de-entrada)
19. [Recomendaciones Estratégicas](#19-recomendaciones)
20. [Métricas del Codebase](#20-métricas)

---

## 1. VISIÓN GENERAL DEL PRODUCTO

**SmartKubik** es un ERP SaaS multi-tenant diseñado para pequeñas y medianas empresas de múltiples industrias. No es un simple sistema de inventario — es una plataforma integral que abarca:

- Inventario y almacenes múltiples
- Punto de Venta (POS)
- Gestión de órdenes con workflow completo
- Contabilidad (Plan de cuentas, Estado de resultados, Balance general, Flujo de caja)
- Facturación electrónica (cumplimiento SENIAT Venezuela)
- CRM con pipeline de oportunidades
- Marketing con campañas, A/B testing, cupones y fidelización
- Nómina y RRHH completo
- Manufactura (BOM, órdenes de producción, control de calidad)
- Gestión de restaurantes (KDS, mesas, recetas, merma)
- Hotelería (floor plan, reservaciones, housekeeping)
- Storefront e-commerce auto-generado por tenant
- Asistente IA integrado (OpenAI + RAG con Pinecone)
- WhatsApp Business integrado
- Blog con CMS (Sanity)
- Documentación pública por vertical

**La propuesta de valor central**: Un solo software que reemplaza múltiples herramientas (inventario, POS, contabilidad, CRM, e-commerce, nómina, marketing) a un precio accesible para PyMEs.

---

## 2. STACK TECNOLÓGICO

### Frontend (Admin Panel)
| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | Framework UI |
| Vite | 6.3.5 | Build tool & HMR |
| React Router | v7 | Routing |
| Tailwind CSS | v4 | Styling |
| Radix UI / shadcn/ui | Latest | Componentes UI accesibles |
| Framer Motion | - | Animaciones |
| OGL | - | WebGL 3D effects (landing) |
| Recharts | - | Gráficos y charts |
| MUI v7 | 7.x | Calendarios, date pickers |
| React Hook Form | - | Formularios |
| jsPDF | - | Generación de PDFs |
| Sanity Client | - | Blog CMS |
| Socket.IO Client | - | WebSockets real-time |
| Lucide React | - | Iconografía |

### Backend (API)
| Tecnología | Versión | Uso |
|---|---|---|
| NestJS | Latest | Framework backend |
| MongoDB / Mongoose | - | Base de datos principal |
| Redis | - | Cache, colas de trabajo |
| BullMQ | - | Job queues asíncronos |
| Passport JWT | - | Autenticación |
| Socket.IO | - | WebSockets |
| LangChain | - | Orquestación IA |
| Pinecone | - | Vector DB para RAG |
| OpenAI | - | GPT para asistente IA |
| WHAPI | - | WhatsApp Business |
| Nodemailer | - | Email |
| Sharp | - | Procesamiento imágenes |
| class-validator | - | Validación DTOs |
| Winston | - | Logging |
| Helmet | - | Seguridad HTTP |

### Storefront (Tienda Online)
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15 | Framework SSR/SSG |
| TypeScript | Strict | Type safety |
| Tailwind CSS | - | Styling |
| ISR | 60s/5min | Caché incremental |

### CMS
| Tecnología | Uso |
|---|---|
| Sanity Studio | Blog y contenido editorial |

### Infraestructura (evidencia en repo)
| Componente | Tecnología |
|---|---|
| Hosting | Hetzner (Linux) |
| SSL | Wildcard certificates |
| Proxy | Nginx |
| Subdominios | Wildcard por tenant |

---

## 3. ARQUITECTURA MULTI-TENANT

### Modelo de Aislamiento
- **Base de datos compartida** con aislamiento por `tenantId` en cada query
- Cada tenant tiene su propia configuración (módulos, moneda, impuestos, branding)
- Los usuarios pertenecen a uno o varios tenants (memberships)
- Cambio de tenant sin re-login (tenant switching)

### Guards de Seguridad (5 capas)
1. **JwtAuthGuard** — Valida token JWT
2. **TenantGuard** — Verifica tenant activo con suscripción válida
3. **PermissionsGuard** — RBAC por endpoint (resource_action pattern)
4. **SuperAdminGuard** — Bypass para super-admin
5. **ModuleAccessGuard** — Feature flags por módulo habilitado

### Roles y Permisos
- **Super Admin** — Acceso total a la plataforma
- **Admin** — Todos los permisos de su tenant
- **Manager** — Subconjunto (ventas, operaciones)
- **Staff** — Limitado (entrada de pedidos, inventario)
- **Custom Roles** — Configurables por tenant

---

## 4. MÓDULOS Y FUNCIONALIDADES — ADMIN (FRONTEND)

### 4.1 Dashboard Principal
- KPIs financieros en tiempo real
- Gráficos de ventas por tendencia y categoría
- Niveles de stock y alertas
- Rotación de productos (FIFO/FEFO)
- Rendimiento de empleados
- Segmentación de clientes
- Análisis de atributos de ventas e inventario
- Ingeniería de menú (food cost)
- Custom analytics builder
- Display de tasas de cambio (multi-moneda)

### 4.2 Inventario
- **Productos**: CRUD, variantes (SKU), precios por nivel/volumen, escaneo IA de etiquetas (OpenAI Vision hasta 3 imágenes)
- **Stock multi-almacén**: Ubicaciones por bin, tracking por lote/batch
- **Movimientos**: IN/OUT/ADJUSTMENT con historial completo
- **Reservaciones**: Reservar stock para pedidos pendientes
- **Alertas**: Stock bajo, próximo a vencimiento
- **Unidades**: Matriz de conversión compleja, unidades por peso
- **Precios**: Listas de precios múltiples, descuentos por volumen, precios por ubicación
- **Códigos de barras**: Scanner integrado (QR/barcode)
- **Importación bulk**: Wizard multi-paso con mapeo de campos
- **Reportes**: Valoración de inventario, resumen por producto/almacén

### 4.3 Órdenes y Ventas
- **Creación de órdenes**: Motor de cálculo (subtotal, descuentos, impuestos, envío)
- **Workflow completo**: pending → confirmed → sent → delivered/canceled
- **Pagos múltiples**: Registrar uno o más pagos por orden
- **Reconciliación**: Confirmar pago + asignar cuenta bancaria
- **Fulfillment**: Tracking de envío, notas de entrega
- **Exportación CSV**
- **Tracking público**: Por número de orden (público, sin auth)
- **Analytics**: Ventas por fuente (POS/Storefront/WhatsApp)
- **POS/Caja registradora**: Sesiones diarias, apertura/cierre

### 4.4 Clientes
- **CRUD completo** con soft delete
- **Historial de compras** por producto
- **Historial de transacciones** con filtros
- **Estadísticas**: Total gastado, cantidad de pedidos, productos favoritos
- **Segmentación** de clientes

### 4.5 Contabilidad
- **Plan de cuentas** (Chart of Accounts)
- **Asientos contables** (manuales y automáticos)
- **Estado de resultados** (P&L)
- **Balance general** (con fecha de corte)
- **Flujo de caja**
- **Balance de prueba** (Trial Balance)
- **Libro mayor** (General Ledger por cuenta)
- **Cuentas por cobrar** (aging 30/60/90 días)
- **Cuentas por pagar** (aging)
- **Conciliación bancaria** (matching de transacciones)
- **Entradas recurrentes** (asientos automáticos)
- **Activos fijos** e **inversiones**

### 4.6 Facturación Electrónica
- **Creación de facturas** (estado borrador)
- **Emisión con timbrado fiscal SENIAT**
- **Generación XML SENIAT** con URL de verificación y QR
- **Descarga PDF** de factura
- **Envío por WhatsApp** (PDF directo)
- **Libros de ventas** (por canal: digital/máquina fiscal) — JSON/CSV/PDF
- **Secuencias de documentos** múltiples por tenant
- **Validación para cumplimiento SENIAT**
- **Retención ISLR/IVA**

### 4.7 CRM y Oportunidades
- **Pipeline Kanban** (drag & drop)
- **Etapas personalizables** con probabilidad de cierre
- **Lead scoring**: MQL → SQL (aceptar/rechazar)
- **Timeline de actividades** (emails, reuniones, llamadas)
- **Captura de leads**: Formulario web + UTM tracking
- **Captura bulk**: CSV, Ads, LinkedIn, Chat
- **Generación de cotizaciones** desde oportunidad
- **Generación de facturas** desde oportunidad
- **Visibilidad por ownership** (cada vendedor ve lo suyo)
- **Playbooks**: Automatización de flujos de ventas

### 4.8 Marketing
- **Campañas**: Creación, lanzamiento, pausa
- **A/B Testing**: Builder y resultados
- **Audiencia**: Filtrado por criterios, estimación de alcance
- **Cupones**: Manager de cupones de descuento
- **Fidelización**: Programa de lealtad
- **Promociones**: Manager de promociones
- **Analytics**:
  - Performance over time
  - Funnel de conversión
  - Análisis de cohortes
  - Atribución de ingresos (multi-touch)
  - Comparación de períodos
- **Campañas de productos**: Insights y builder

### 4.9 Nómina y RRHH
- **Perfiles de empleados** con contratos
- **Estructuras salariales** (salary, deductions, benefits)
- **Ejecución de nómina** (runs)
- **Calendarios de nómina** (períodos)
- **Ausencias y licencias**
- **Reportes de nómina**
- **Generación de documentos** (carta de trabajo, constancia de ingresos — PDF)
- **Comisiones**: Planes, metas, bonos, tracking
- **Propinas**: Distribución y pooling (por horas, por ventas, custom)
- **Reloj de entrada/salida**: TimeClock (QR, ubicación)
- **Gestión de turnos**: Creación, asignación, detección de conflictos

### 4.10 Restaurante
- **Kitchen Display System (KDS)**: Cola de órdenes en tiempo real, alertas sonoras, colores por urgencia
- **Gestión de mesas**: Floor plan interactivo
- **Reservaciones**: Calendario, preferencias del comensal
- **Ingeniería de menú**: Análisis de rentabilidad por platillo
- **Recetas**: Gestión con cálculo de COGS
- **Control de merma/desperdicio**: Tracking diario, análisis de costos
- **Bill splits**: División de cuentas

### 4.11 Hotelería
- **Dashboard de operaciones**
- **Floor plan de hotel**: Gestión de habitaciones y disponibilidad
- **Gestión de pagos y depósitos**
- **Políticas de cancelación / no-show**
- **Housekeeping**: Asignación de tareas
- **Check-in/Check-out** de huéspedes
- **Integración PMS** (webhooks)

### 4.12 Manufactura
- **Bill of Materials (BOM)**: Multi-nivel
- **Órdenes de producción**: Workflow completo
- **Centros de trabajo**: Capacidad y planificación
- **Rutas de producción**: Pasos del proceso
- **Versiones de producción**: Versionamiento de procesos
- **Control de calidad**: Inspecciones y registros

### 4.13 Proveedores
- **CRUD completo**
- **Configuración de pago** (método, moneda)
- **Sincronización de precios** a productos vinculados
- **Órdenes de compra** (Purchase Orders)

### 4.14 Logística y Entregas
- **Cálculo de costos de envío** (pickup, local, nacional)
- **Tarifas por ubicación** (geolocalización)
- **Tarifas por estado/ciudad**
- **Envío gratis por monto**
- **Portal de conductores**
- **Tracking de entregas**
- **Fulfillment dashboard**

### 4.15 Comunicación
- **WhatsApp Inbox**: Conversaciones bidireccionales con clientes, soporte de media
- **Email**: Configuración SMTP, templates
- **Notificaciones**: Centro de notificaciones en tiempo real
- **Calendario**: Eventos, multi-timezone
- **Recordatorios**: Widget de tareas pendientes
- **Lista de tareas** (TodoList)

### 4.16 Asistente IA
- **Chat integrado** (OpenAI configurable — gpt-4o-mini por defecto)
- **Knowledge Base**: Documentos propios del negocio
- **Capacidades**: Búsqueda de inventario, consulta de órdenes, agenda
- **Auto-reply**: Respuesta automática opcional para clientes
- **RAG**: Retrieval Augmented Generation con Pinecone

### 4.17 Configuración del Tenant
- Información básica (nombre, logo, contacto)
- Configuración fiscal (RIF, tipo de contribuyente — Venezuela)
- Moneda y localización
- Módulos habilitados (on/off por módulo)
- Métodos de pago
- Configuración de envío
- Integración de email y WhatsApp
- Knowledge base para IA
- Preferencias de facturación
- Templates de documentos
- Storefront settings (e-commerce propio)

---

## 5. MÓDULOS Y FUNCIONALIDADES — BACKEND (API)

### Escala del Backend
- **108+ módulos NestJS**
- **139 controladores API**
- **180+ esquemas MongoDB**
- **500+ endpoints RESTful**

### Endpoints Destacados por Módulo

**Productos**: CRUD, bulk create, escaneo IA de etiquetas, barcode lookup, historial de precios, cálculo de precios con descuentos por volumen/ubicación.

**Órdenes**: Creación, workflow de estados, pagos múltiples, reconciliación bancaria, fulfillment tracking, exportación CSV, tracking público, analytics por fuente.

**Inventario**: Multi-almacén, movimientos, reservaciones, ajustes manuales y bulk, lotes/batches, alertas (stock bajo, vencimiento), valorización.

**Facturación**: Documentos con timbrado SENIAT, XML, PDF, envío WhatsApp, libros de ventas, secuencias múltiples.

**Contabilidad**: Plan de cuentas, asientos, P&L, balance, cash flow, trial balance, general ledger, aging AR/AP.

**Nómina**: Empleados, contratos, estructuras salariales, ejecución de nómina, comisiones, propinas, ausencias, documentos PDF.

**CRM/Oportunidades**: Pipeline, lead scoring MQL/SQL, actividades, captura web/bulk, generación de cotizaciones/facturas.

**Marketing**: Campañas, analytics (funnel, cohortes, atribución), audiencia, estimación de alcance.

**Kitchen Display**: Órdenes de cocina, estados de items, bump, urgencia, asignación a cocineros, estadísticas.

**Super-Admin**: Gestión de tenants, impersonación de usuarios, feature flags, métricas globales, knowledge base, asistente IA.

### Características Técnicas Avanzadas
- **WebSockets (Socket.IO)**: Actualizaciones en tiempo real (KDS, órdenes, notificaciones)
- **BullMQ**: Cola de trabajo asíncrona para emails, PDFs, nómina, marketing, imports
- **Rate Limiting**: Throttler con buckets short/medium/long
- **Seguridad**: Helmet, CORS configurable, sanitización HTML, audit trail
- **Cron Jobs**: Nómina, renovaciones, tasas de cambio, reconciliación
- **Multi-moneda**: Módulo de tasas de cambio con conversión

---

## 6. STOREFRONT (TIENDA ONLINE POR TENANT)

### Arquitectura
- Next.js 15 con App Router
- TypeScript strict
- Rutas dinámicas por dominio: `/:domain/`
- ISR con revalidación cada 60s (config) y 5min (productos)

### Templates Disponibles
1. **Modern E-commerce** — Tienda online completa con header, hero, grid de productos, categorías, newsletter, footer
2. **Modern Services** — Para empresas de servicios (legacy)
3. **Premium** — Template premium con dark mode por defecto, componentes diferenciados

### Funcionalidades
- **Catálogo de productos** con filtros y paginación
- **Detalle de producto** con variantes, unidades de venta, compra por peso/dinero
- **Carrito de compras** (localStorage, persistente)
- **Checkout completo** con validación de formularios
- **Tema dinámico** por tenant (colores, logo, estilos via CSS variables)
- **Dark mode** toggle con persistencia
- **SEO** dinámico por tenant (metadata, OG tags)
- **Responsive** completo (mobile 1col, tablet 2col, desktop 3-4col)
- **Image optimization** con next/image (AVIF, WebP)

### URLs
```
/:domain           → Homepage de la tienda
/:domain/productos → Catálogo
/:domain/productos/:id → Detalle
/:domain/carrito   → Carrito
/:domain/checkout  → Proceso de compra
```

### Limitación Importante
- El carrito se almacena solo en localStorage (sin cuenta de cliente en storefront)
- No hay sistema de cuentas de cliente (login de compradores)
- No hay historial de pedidos desde el storefront (solo tracking por número de orden)
- No hay wishlist ni reviews de productos

---

## 7. SISTEMA DE BLOG Y CONTENIDO

### CMS: Sanity Studio
- Blog administrado externamente en Sanity Studio
- Posts con: título, slug, imagen principal, autor, fecha, categorías, body (Portable Text)
- Componentes del blog en el admin:
  - `BlogNavbar` — Navegación del blog
  - `BlogCategoryNav` — Navegación por categorías
  - `BlogSidebar` — Sidebar con contenido relacionado
  - `AuthorBox` — Información del autor
  - `ProgressBar` — Barra de progreso de lectura
  - `TableOfContents` — Tabla de contenidos
  - `RelatedPosts` — Posts relacionados
  - `CtaBox` — Call-to-action box
  - `ROICalculator` — Calculadora de ahorro de inventario (interactiva)

### Newsletter
- **EXISTE** un componente `NewsletterForm` en el blog
- **PERO NO FUNCIONA**: Solo hace `console.log(email)` y muestra un toast. **No envía el email a ningún backend ni servicio de email marketing.**
- **Desconexión total**: No hay endpoint de API para suscripciones, no hay integración con Mailchimp/SendGrid/etc.

---

## 8. SISTEMA DE DOCUMENTACIÓN

### Docs por Vertical
Documentación pública organizada por industria:
- Restaurantes
- Retail
- Logística
- General

### Páginas
- `DocsLanding` — Landing de documentación con búsqueda
- `DocsCategoryPage` — Categorías por vertical
- `DocsArticle` — Artículos individuales
- SEO completo con breadcrumbs y metadata

### Contenido
- Guías de uso del software
- Casos de uso por industria
- Tutoriales paso a paso

---

## 9. LANDING PAGES Y MARKETING ACTUAL

### Landing Pages
- **SmartKubikLanding.jsx** — Landing principal (338KB — muy grande, con WebGL)
  - Efectos WebGL: PrismaticBurst (OGL raymarching), LightRaysCanvas (shaders custom)
  - Secciones: Hero, Features, Verticales, Web de Ventas, Pricing, CTA
- **SmartKubikLandingV2.jsx** — Variante alternativa de landing
- **FoundersPage** — Página de fundadores/about
- **WebVentasSection** — Sección destacando la web auto-generada (incluida en landing)
- **WebVentasSectionDemo** — Demo interactiva de la web de ventas

### Homepage Estática
- `homepage.html` y `homepage-v2-pitch.html` — Versiones HTML estáticas (fuera de React)

### Lo que FALTA en Marketing:
- No hay página de pricing independiente
- No hay testimonios reales
- No hay casos de estudio
- No hay video demo del producto
- No hay chat en vivo en la landing
- No hay lead magnet (ebook, webinar, etc.)
- No hay free trial automático (el registro requiere seleccionar plan de pago)
- No hay tracking de visitantes web (no se mencionan analytics de marketing como GA, Mixpanel, etc.)

---

## 10. FLUJO DE REGISTRO Y ONBOARDING

### Flujo Actual (Register.jsx)
1. **Paso 1**: Seleccionar plan (Fundamental $39, Crecimiento $99, Expansión $149)
2. **Paso 2**: Datos del negocio (nombre, vertical, categoría, número de usuarios)
3. **Paso 3**: Datos del administrador (nombre, email, teléfono, contraseña)
4. **Paso 4**: Resumen y confirmación

### Post-Registro
- Se envía confirmación por email (código)
- Redirige a `/confirm-account`
- Tras confirmación, redirige a `/organizations` y luego al dashboard

### Problemas del Flujo Actual
1. **No hay free trial**: El usuario debe comprometerse con un plan desde el primer paso
2. **No hay plan gratuito**: Barrera de entrada inmediata para explorar
3. **No hay demo interactiva**: El usuario no puede probar antes de registrarse
4. **No hay onboarding guiado** post-registro (existe `TutorialContext` pero el contenido es básico)
5. **El paso 1 muestra precios** antes de que el usuario entienda el valor
6. **Desconexión Landing → Registro**: No hay flujo suave desde la landing al registro con contexto preservado
7. **No hay remarketing**: Si alguien abandona el registro, se pierde completamente

---

## 11. SUPER-ADMIN Y GESTIÓN DE PLATAFORMA

### Funcionalidades Actuales del Super-Admin
- **Listado de tenants** (tabla básica: nombre, email, plan, status)
- **Configuración por tenant** (editar módulos, plan, estado)
- **Impersonación de usuarios** (acceder como un usuario de cualquier tenant)
- **Feature flags** (toggle de features globales y por tenant)
- **Knowledge Base** global (subir documentos, consultar, borrar)
- **Asistente IA** (consulta directa al asistente con KB)
- **Métricas globales** (endpoint /super-admin/metrics)
- **Gestión de planes** (PlanForm, PlanManagement)
- **Calendario** de plataforma

### Lo que FALTA en Super-Admin
- **Dashboard ejecutivo**: No hay vista de métricas de negocio del SaaS (MRR, churn, LTV, CAC)
- **Pipeline de ventas del SaaS**: El `SuperAdminCrm` es solo una tabla de tenants — no hay pipeline, no hay scoring, no hay automatización
- **Comunicación con tenants**: No hay forma de enviar emails masivos, notificaciones in-app, o newsletters a los tenants
- **Analíticas de uso**: No se trackea cómo usan el software los tenants (qué módulos, frecuencia, engagement)
- **Health score de tenants**: No hay indicador de "salud" del tenant para prevenir churn
- **Facturación del SaaS**: No hay integración de cobro recurrente (Stripe Billing o similar)
- **Support tickets**: No hay sistema de soporte integrado

---

## 12. INTEGRACIONES CON TERCEROS

### Activas y Funcionales
| Integración | Uso | Estado |
|---|---|---|
| OpenAI (GPT) | Asistente IA, escaneo de etiquetas | Funcional |
| Pinecone | Vector DB para RAG | Funcional |
| WHAPI | WhatsApp Business messaging | Funcional |
| Sanity CMS | Blog y contenido | Funcional |
| Socket.IO | Real-time (KDS, notificaciones) | Funcional |
| SENIAT | Facturación electrónica Venezuela | Funcional |
| Google OAuth | Login con Google | Funcional |
| Google Maps/Leaflet | Mapas para ubicaciones | Funcional |

### Ausentes / Necesarias
| Integración | Uso Necesario |
|---|---|
| Stripe Billing | Cobro recurrente de suscripciones |
| Mailchimp / SendGrid | Email marketing y newsletter |
| Google Analytics / Mixpanel | Analytics de visitantes y comportamiento |
| Intercom / Crisp | Chat en vivo y soporte |
| Zapier / Make | Automatizaciones externas |
| Instagram API | Publicación y tracking |
| Facebook Pixel | Remarketing |
| Hotjar / FullStory | Heatmaps y session recording |

---

## 13. VERTICALES DE NEGOCIO SOPORTADOS

### Configuración por Vertical (verticalProfiles.js)

| Vertical | Código | Características Especiales |
|---|---|---|
| Servicios de Comida | `food-service` | Unidades por peso, lotes, vencimiento, food cost, propinas, menú engineering |
| Moda/Ropa | `retail-fashion` | Matriz tallas, colores, géneros |
| Calzado | `retail-footwear` | Tallas zapatos, ancho, materiales |
| Ferretería | `retail-hardware` | Dimensiones, compatibilidad, packs |
| Tecnología | `retail-tech` | Números de serie, garantías, specs |
| Juguetes | `retail-toys` | Rangos de edad, licencias, seguridad |
| Manufactura | `manufacturing` | BOMs, centros de trabajo, QC |
| Hotelería | (módulo hospitality) | Habitaciones, housekeeping, PMS |
| Logística | (módulo logistics) | Almacenes, distribución, transporte |
| Servicios | (módulo services) | Citas, paquetes de servicios, membresías |
| Híbrido | `HYBRID` | Hotel+restaurante, restaurante+tienda, resort |

### Verticales en Registro
El formulario de registro ofrece:
- Servicios de Comida (Restaurante, Cafetería, Food Truck, Catering, Bar)
- Minoristas/Distribución (Supermercado, Abarrotes, Distribuidor, etc.)
- Servicios (Hotel, Hospital, Escuela, Corporativo)
- Logística (Almacén, Centro de Distribución, Transporte Refrigerado)
- Fabricantes (Alimentos, Química, Farmacéutica, Metalmecánica, Textil, etc.)
- Mixta (Hotel+Restaurante, Resort, Centro Comercial Gastronómico)

---

## 14. PLANES DE SUSCRIPCIÓN ACTUALES

### Plan Fundamental — $39/mes
- 1 usuario
- 1 sucursal
- Todos los módulos básicos
- Web de ventas vinculada
- Analítica básica
- Backup mensual
- Soporte estándar

### Plan Crecimiento — $99/mes ⭐ Más popular
- Todo lo del Fundamental
- Hasta 5 usuarios
- Hasta 2 sucursales
- Funciones IA avanzadas
- WhatsApp + ventas/reservas
- Automatizaciones IA
- Agente IA predictivo
- Mayor personalización web
- Integraciones Full (Gmail/Outlook)
- Backup semanal
- Soporte prioritario

### Plan Expansión — $149/mes
- Todo lo del Crecimiento
- Usuarios ilimitados
- Sucursales ilimitadas
- Soporte dedicado / SLA
- Migración gratuita
- Asistente IA ilimitado
- Backup diario
- Dominio web propio
- Acceso prioritario a nuevas funciones
- Web sin publicidad

---

## 15. FORTALEZAS Y POTENCIALIDADES

### Fortalezas Técnicas
1. **Amplitud funcional excepcional**: 108+ módulos backend, 150+ componentes frontend — rivaliza con ERPs enterprise
2. **Multi-tenant nativo**: Aislamiento completo de datos con memberships multi-organización
3. **Multi-vertical real**: No es un ERP genérico — tiene configuración específica por industria (food, fashion, hardware, tech, manufacturing)
4. **IA integrada de fábrica**: Asistente con RAG (Pinecone), escaneo de etiquetas con Vision, conocimiento del negocio del tenant
5. **Storefront auto-generado**: Cada negocio obtiene su tienda online sin trabajo adicional
6. **Facturación fiscal completa**: Cumplimiento SENIAT (ventaja competitiva en LATAM)
7. **Stack moderno y performante**: React 18 + Vite + NestJS + MongoDB — escalable
8. **WebSockets real-time**: KDS, notificaciones, importación en vivo
9. **Efectos visuales premium**: WebGL en landing (diferenciador de marca)
10. **Sistema de permisos granular**: RBAC con module access + feature flags

### Fortalezas de Producto
1. **All-in-one real**: Inventario + POS + Contabilidad + CRM + Marketing + Nómina + E-commerce en un solo sistema
2. **Precio agresivo**: $39-149/mes vs competidores que cobran $100+ por CADA módulo
3. **LATAM-first**: Diseñado para el mercado latino (español nativo, SENIAT, moneda local)
4. **Vertical diversity**: Sirve desde un food truck hasta una fábrica o un resort
5. **KDS real**: Kitchen Display System que competidores solo ofrecen como add-on costoso
6. **WhatsApp nativo**: Canal de comunicación #1 en LATAM integrado de fábrica
7. **Manufactura incluida**: BOM, QC, centros de trabajo — normalmente un módulo enterprise separado

### Potencialidades No Explotadas
1. **Marketplace de servicios**: Conectar tenants entre sí (ej: restaurante compra a distribuidor que usa SmartKubik)
2. **White-label**: El storefront podría ser una plataforma de e-commerce white-label
3. **App móvil**: Con la infraestructura API-first, una app nativa sería directa
4. **Inteligencia de industria**: Los datos agregados de múltiples negocios del mismo tipo podrían generar benchmarks e insights únicos
5. **Community-led growth**: La base de usuarios comparte problemas comunes — potencial para comunidad
6. **Partner/referral program**: Los tenants satisfechos podrían referir a otros negocios similares
7. **API pública**: Permitir integraciones de terceros
8. **Consultoría asistida por IA**: Usar los datos del tenant para sugerencias proactivas de optimización

---

## 16. DEBILIDADES Y PUNTOS NEGATIVOS

### Debilidades Técnicas
1. **App.jsx monolítico** (55KB, 1,340 líneas): Todo el routing en un solo archivo — dificulta mantenimiento
2. **SmartKubikLanding.jsx excesivo** (338KB): Una sola componente de landing page de 338KB es insostenible
3. **Estado distribuido sin patrón claro**: Ni Redux ni Zustand — múltiples contexts con posible duplicación
4. **Newsletter sin backend**: El form de newsletter literalmente no hace nada (`console.log`)
5. **Sin testing robusto**: El framework existe (Vitest) pero no hay evidencia de alta cobertura
6. **Storefront limitado**: No hay cuentas de cliente, no hay wishlist, no hay reviews
7. **Sin sistema de cobro automatizado**: No hay Stripe Billing ni procesador de pagos recurrentes para las suscripciones del SaaS
8. **api.js de 73KB**: El archivo de API del frontend es un monolito que debería dividirse

### Debilidades de Producto/Negocio
1. **Sin free trial**: Barrera de entrada masiva — el usuario debe pagar antes de probar
2. **Sin plan gratuito**: No hay forma de "probar sin riesgo"
3. **Onboarding débil**: No hay tour guiado, no hay setup wizard, no hay contenido de bienvenida personalizado por vertical
4. **Embudo de ventas inexistente**: Landing → Registro → Dashboard sin nurturing intermedio
5. **Sin analytics de uso**: No se sabe cómo usan los tenants el software, qué módulos ignoran, cuándo están en riesgo de churn
6. **Sin comunicación post-registro**: No hay drip campaign de emails educativos
7. **Super-Admin primitivo**: Solo una tabla de tenants — sin pipeline, sin métricas SaaS, sin health score
8. **Sin soporte in-app**: No hay chat de soporte, no hay tickets, no hay centro de ayuda integrado
9. **Dependencia de Venezuela**: SENIAT y configuración fiscal están hardcodeados para Venezuela; la expansión requiere trabajo significativo
10. **Sin social proof**: No hay testimonios, no hay caso de estudio, no hay "usado por X empresas"
11. **Sin video demo**: No hay forma visual rápida de entender qué hace el software
12. **Sin Linktree/link-in-bio**: No hay forma de compartir links desde redes sociales (el pedido original del usuario)
13. **Blog desconectado**: Sanity CMS externo sin conexión con el embudo de ventas
14. **Sin remarketing**: Si alguien visita la landing y se va, se pierde para siempre
15. **Sin programa de referidos**: Los usuarios satisfechos no tienen incentivo para referir

### Debilidades de UX
1. **Solo en español**: Sin i18n implementado (roadmap existe pero no está hecho)
2. **Mobile-first no garantizado**: Responsive existe pero no optimizado para mobile-first
3. **Complejidad abrumadora**: Con 20+ módulos, un nuevo usuario puede sentirse perdido
4. **Sin personalización progresiva**: Se muestran todos los módulos desde el día 1 en vez de activar gradualmente

---

## 17. ANÁLISIS DEL EMBUDO DE VENTAS ACTUAL

### Estado Actual: FRAGMENTADO Y DESCONECTADO

```
[Visitante Web] → Landing Page (efectos WebGL impresionantes)
       ↓
[Blog] → Contenido en Sanity (desconectado del embudo)
       ↓  ← Newsletter NO FUNCIONA (console.log)
       ↓
[Docs] → Documentación por vertical
       ↓
[Registro] → Selección de plan OBLIGATORIA (barrera)
       ↓
[Confirm Email] → Código por email
       ↓
[Dashboard] → Sin onboarding guiado
       ↓
[Uso del Software] → Sin tracking de engagement
       ↓
[¿Renovación?] → Sin cobro automático
       ↓
[¿Churn?] → Sin alertas ni prevención
```

### Puntos de Fuga del Embudo
1. **Landing → Registro**: Sin lead capture intermedio (newsletter rota, sin lead magnet)
2. **Registro paso 1**: Precios primero = abandono alto
3. **Post-registro**: Sin drip emails educativos
4. **Primeros 7 días**: Sin onboarding que guíe al "aha moment"
5. **Día 30**: Sin trigger de renovación/upgrade
6. **Ongoing**: Sin engagement tracking = churn silencioso

### Lo que NO existe
- Lead scoring
- Email automation
- Drip campaigns
- In-app messaging
- Usage analytics
- Health score
- Churn prediction
- NPS surveys
- Referral program
- Upgrade prompts
- Feature adoption tracking

---

## 18. BARRERAS DE ENTRADA PARA USUARIOS

### Barreras Identificadas

1. **Barrera económica**: Sin free trial ni plan gratis — el usuario debe pagar $39/mes desde el día 1 sin haber probado nada
2. **Barrera de confianza**: Sin testimonios, sin casos de estudio, sin social proof visible
3. **Barrera de complejidad**: 20+ módulos pueden ser intimidantes para una PyME que solo necesita inventario + ventas
4. **Barrera de migración**: ¿Cómo migro mis datos actuales? No hay wizard de migración visible ni promesa de asistencia
5. **Barrera técnica**: ¿Necesito conocimientos técnicos? No hay video que muestre lo fácil que es
6. **Barrera de idioma**: Solo español — excluye mercados angloparlantes/lusófonos
7. **Barrera de riesgo**: "¿Y si no me gusta?" — Sin política de devolución visible, sin trial
8. **Barrera de soporte**: "¿Quién me ayuda si me trabo?" — Sin chat de soporte visible
9. **Barrera de descubrimiento**: Sin presencia en redes, sin SEO trabajado, sin paid ads, sin referidos
10. **Barrera de integración**: "¿Se conecta con lo que ya uso?" — Sin directorio de integraciones visible

### Recomendaciones para Reducir Barreras
- **Free trial de 14 días** (todas las funciones)
- **Plan gratuito limitado** (1 usuario, funciones básicas)
- **Video tour de 2 minutos** en la landing
- **Onboarding personalizado** por vertical
- **Chat de soporte en vivo** (al menos horario laboral)
- **Garantía de satisfacción** de 30 días
- **Asistente de migración** de datos con wizard
- **Testimonios y casos de estudio** reales
- **FAQ expandido** sobre barreras comunes

---

## 19. RECOMENDACIONES ESTRATÉGICAS

### Prioridad Alta — Embudo de Ventas

1. **Implementar Free Trial de 14 días**: Sin tarjeta de crédito, acceso completo. Esto es lo más impactante que se puede hacer para adquisición.

2. **Arreglar la Newsletter**: Conectar el formulario del blog a un servicio real (Resend/SendGrid) y crear un endpoint en el backend. Cada suscriptor es un lead.

3. **Crear Linktree propio**: Una página `smartkubik.com/links` (o `/l`) que sirva como hub de enlaces para Instagram/redes:
   - Link a registro (free trial)
   - Link al blog
   - Link a WhatsApp de soporte
   - Link a demo en video
   - Link a comunidad
   - Administrable desde el super-admin

4. **Drip Campaign de Onboarding**: 7 emails post-registro que guíen al "aha moment" según la vertical del tenant.

5. **Video Demo**: Un video de 2-3 minutos que muestre el software en acción, idealmente segmentado por vertical.

### Prioridad Alta — Retención

6. **Usage Analytics**: Trackear qué módulos usa cada tenant, con qué frecuencia, para detectar churn temprano.

7. **In-App Onboarding**: Tour guiado post-registro personalizado por vertical (ya existe `TutorialContext`, expandirlo).

8. **Stripe Billing**: Automatizar cobro de suscripciones para reducir fricción y churn involuntario.

9. **Health Score de Tenants**: Algoritmo que combine uso, frecuencia, módulos activos → alertar cuando un tenant está en riesgo.

### Prioridad Media — Comunidad y Growth

10. **Comunidad WhatsApp**: Grupo para tenants, compartir tips, networking, Q&A. Bajo costo, alto impacto en retención.

11. **Programa de Referidos**: "Invita a un negocio amigo y ambos obtienen 1 mes gratis."

12. **Social Proof**: Recolectar testimonios, crear casos de estudio (aunque sean de los primeros usuarios).

13. **Blog Strategy**: Crear contenido SEO-optimizado sobre problemas que las PyMEs buscan (ej: "cómo controlar inventario en restaurante").

14. **Linktree como Feature del Producto**: Ofrecer a cada tenant su propio Linktree branded como valor agregado del storefront.

### Prioridad Media — Producto

15. **Plan Gratuito**: Un tier "Starter" con 1 usuario, funciones limitadas, que sirva como puerta de entrada permanente.

16. **Cuentas de Cliente en Storefront**: Login para compradores, historial de pedidos, wishlist.

17. **Dashboard del Super-Admin**: Métricas SaaS reales (MRR, churn, LTV, CAC, tenants activos vs inactivos).

18. **Soporte In-App**: Chat o sistema de tickets accesible desde el dashboard del tenant.

### Prioridad Baja — Expansión

19. **Internacionalización (i18n)**: English + Portuguese para expandir mercado.

20. **App Móvil**: PWA o React Native para operaciones en campo (inventario, POS).

21. **Marketplace entre Tenants**: Conectar proveedores con restaurantes que usen SmartKubik.

22. **API Pública**: Documentada, para que desarrolladores externos creen integraciones.

---

## 20. MÉTRICAS DEL CODEBASE

### Admin (React)
- ~496 archivos fuente (.jsx/.tsx/.js/.ts)
- 150+ componentes
- 46+ custom hooks
- 32+ page components
- 50+ UI primitives (shadcn/ui)
- 8 React Contexts
- App.jsx: 55KB (1,340 líneas)
- Landing: 338KB
- API wrapper: 73KB

### Backend (NestJS)
- 108+ módulos NestJS
- 139 controladores
- 180+ esquemas MongoDB
- 500+ endpoints REST

### Storefront (Next.js)
- ~60 archivos fuente (.tsx/.ts)
- 3 templates (ecommerce, services, premium)
- 5 rutas dinámicas por tenant

### Blog (Sanity)
- CMS externo
- 11 componentes de blog en el admin

---

## CONCLUSIÓN

SmartKubik es un producto **técnicamente impresionante y funcionalmente completo** que rivaliza con ERPs mucho más costosos. Sin embargo, tiene una **desconexión crítica entre el producto y su capacidad de venderlo**:

- El producto es de $1M+ en desarrollo, pero se vende como si fuera un side project
- Tiene 20+ módulos pero no tiene un video que los muestre
- Tiene newsletter pero no funciona
- Tiene blog pero no captura leads
- Tiene un CRM para los clientes del tenant pero no para los clientes del SaaS
- Tiene IA integrada pero no la usa para mejorar la retención
- Tiene multi-vertical pero no tiene onboarding personalizado

**El gap más grande no es de producto — es de Go-to-Market.** El software está listo; lo que falta es la máquina que lo ponga frente a los usuarios correctos, los convenza de probarlo, los guíe al "aha moment", y los retenga como clientes de largo plazo.

Este documento debería servir como base para diseñar esa estrategia holística en Claude Desktop.

---

*Generado mediante análisis exhaustivo del código fuente real del proyecto (no de documentación desactualizada). Febrero 2025.*
