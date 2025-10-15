# Documentacion General - Smartkubik SaaS

> **Version:** v1.03  
> **Ultima revision:** 2025-01-11  
> **Repositorios incluidos:** `food-inventory-saas` (backend NestJS), `food-inventory-admin` (panel React), `food-inventory-storefront` (storefront Next.js)

Este documento consolida el conocimiento funcional y tecnico del proyecto Smartkubik, un SaaS multi-tenant orientado a retail y food service en Venezuela. Resume la arquitectura, los modulos disponibles, los flujos principales, la configuracion de despliegue y los pendientes estrategicos para nuevas iteraciones.

---

## 1. Resumen Ejecutivo
- **Producto:** Plataforma SaaS multi-tenant para gestion de inventario, ventas, compras, CRM, contabilidad y storefront.
- **Stack principal:** NestJS + MongoDB para API, React (Vite) para el panel administrativo, Next.js 15 para el storefront publico.
- **Estado actual:** Core del sistema operativo y listo para deploy. Vertical restaurant completada a nivel de modulos (integracion progresiva con Orders V2). Documentacion de despliegue y seguridad disponible.
- **Mercado objetivo:** Mayoristas y distribuidores alimentarios, restaurantes multi-sucursal, negocios retail con necesidad de control fiscal venezolano (IVA 16%, IGTF 3%).
- **Diferenciadores clave:** Motor fiscal venezolano, soporte multi-tenant completo, verticales activables por tenant, storefront multi-dominio, integracion WhatsApp (Whapi), auditoria y seguridad reforzadas.

## Biblioteca de Documentos
- `DOC-MODULO-PRODUCTOS.md` resumen del catalogo de productos y configuraciones de inventario.
- `DOC-MODULO-INVENTARIO.md` uso del tablero de existencias, ajustes y alertas.
- `DOC-MODULO-COMPRAS.md` gestion de ordenes de compra, proveedores y plantillas recurrentes.
- `DOC-MODULO-ORDENES.md` flujo completo de ventas, pagos y envio a cocina.
- `DOC-MODULO-PAGOS.md` cuentas por pagar, plantillas y conciliacion de pagos.
- `DOC-MODULO-CONTABILIDAD.md` libro diario, plan de cuentas y reportes financieros.
- `DOC-MODULO-CRM.md` gestion de contactos, tiers y tipos de cliente.
- `DOC-MODULO-CALENDARIO.md` agenda de eventos, tareas y automatizaciones operativas.
- `DOC-MODULO-TENANT-CONFIG.md` configuracion integral del tenant (identidad, delivery, chat, usuarios).
- `DOC-FLUJO-INVENTARIOS.md` interaccion entre productos, inventario y compras.
- `DOC-FLUJO-VENTAS-INVENTARIO-PAGOS-CONTABILIDAD.md` automatizaciones desde ventas hasta contabilidad.
- `DOC-FLUJO-CRM-CONTACTOS.md` como ventas, compras y usuarios actualizan el CRM.

---

## 2. Arquitectura de Plataforma

### 2.1 Panoramica de aplicaciones

| Componente | Directorio | Stack | Rol |
|------------|------------|-------|-----|
| API SaaS (Backend) | `food-inventory-saas` | NestJS 10 + MongoDB | Servicios REST, seguridad, multitenencia, contabilidad, workflows |
| Admin App | `food-inventory-admin` | React 18 + Vite + shadcn/ui | Panel para tenants, configuracion de modulos, operaciones diarias |
| Storefront | `food-inventory-storefront` | Next.js 15 + Tailwind | Tienda publica multi-dominio con tematizacion dinamica |
| Scripts / Deploy | `deploy.sh`, `deploy-hetzner.sh`, `scripts/` | Bash + TS | Automatizacion de despliegue, migraciones y semillas |

### 2.2 Componentes tecnicos
- **API Gateway:** NestJS con modularizacion por dominio (43 modulos) y capa de seguridad con guards, decorators y rate limiting (`@nestjs/throttler`).
- **Persistencia:** MongoDB con schemas optimizados para inventario perecedero, indices para queries mas utilizadas y campos multi-tenant (`tenantId`).
- **Jobs / scheduler:** `@nestjs/schedule` para tareas recurrentes (actualizacion de tasas, limpieza de reservas).
- **Realtime / websockets:** Socket.IO configurado para notificaciones internas (kitchen display, dashboards).
- **Panel React:** Router basado en `react-router-dom@7`, contextos para autenticacion (`use-auth`), turnos (`ShiftContext`), CRM y contabilidad.
- **Storefront:** App Router con ISR, theming por tenant, factory de templates (`src/lib/templateFactory.ts`).
- **Integraciones:** Whapi SDK (`src/lib/whapi-sdk`), LangChain/OpenAI (`src/modules/openai`), Google OAuth, SMTP.

### 2.3 Estructura del monorepo
```
FOOD-INVENTORY-SAAS-COMPLETO/
|-- food-inventory-saas/       # Backend NestJS
|-- food-inventory-admin/      # Panel React + shadcn/ui
|-- food-inventory-storefront/ # Storefront Next.js
|-- scripts/                   # Backups y migraciones
|-- nginx-configs/             # Plantillas de nginx para multi-dominio
`-- *.md                       # Documentacion operativa y roadmap
```

---

## 3. Modelo Multi-Tenant, Seguridad y Gobierno

### 3.1 Filosofia multi-tenant
- Cada tenant posee configuraciones de impuestos, inventario, storefront, modulos habilitados y planes de suscripcion (`src/schemas/tenant.schema.ts`).
- **Memberships:** Usuarios asociados via `UserTenantMembership` con estados (invited, active, suspended) y multiples roles por tenant.
- **Feature Flags:** Variables de entorno sincronizadas entre backend y frontend (`ENABLE_*`, `VITE_ENABLE_*`) para activar releases por fases.
- **Limites por plan:** `getPlanLimits` en `super-admin.service.ts` define maximos (usuarios, productos, pedidos) aplicados a nivel de servicio.

### 3.2 Seguridad
- Autenticacion con JWT (access + refresh) y guards (`JwtAuthGuard`, `TenantGuard`, `PermissionsGuard`).
- Permisos granulares (`permissions` collection) mapeados a roles por tenant.
- Sanitizacion de entrada (`sanitize-html`), validacion con `class-validator`, rate limiting configurable (por defecto 100 req/60s).
- Auditoria: `audit-log` module con endpoints para super-admin; cada accion sensible registra `performedBy`, `ipAddress`, `before/after`.
- Scripts de pruebas de seguridad (`npm run test:security:*`) cubren sanitizacion, rate limiting y ownership.
- CSP, logger sanitizado, validaciones de paginacion documentadas en `SECURITY-*` archivos.

### 3.3 Gobierno y Super Admin
- Layout dedicado (`src/layouts/SuperAdminLayout.jsx`) con acceso a:
  - Gestion de tenants, usuarios y configuracion de modulos.
  - CRM global de leads, calendario centralizado, knowledge base, panel de metrics (`GlobalMetricsDashboard`).
  - Auditoria y ajustes globales (OpenAI API key, limites).
- Impersonacion segura (`super-admin.service.ts:impersonateUser`) con registro en audit log.

---

## 4. Backend (NestJS) - Vision por modulos

### 4.1 Modulos core (100% operativos)
- **Autenticacion y usuarios:** Flujos de registro, confirmacion, recuperacion de clave, multi-tenant login, invitaciones.
- **Productos e inventario:** Soporte FEFO, lotes por item (`OrderItemLot`), multiples unidades de medida, alertas de stock/expiracion, motor de reservas.
- **Ordenes y pagos:** Workflow completo (draft -> confirmed -> delivered), reservas de inventario, estados de pago (`pending`, `partial`, `paid`, etc.), integracion con pagos, split bills, envio a cocina, canales (`online`, `pos`, `whatsapp`), asignaciones por usuario.
- **CRM:** Clasificacion automatica por gasto, historico de compras, segmentos, notas, pipeline basico.
- **Contabilidad:** Plan de cuentas dinamico (`generateNextCode`), libro diario, asientos automaticos (COGS y ventas), reportes (Accounts Receivable, Accounts Payable, Cash Flow), estados financieros (P&G, Balance).
- **Pagos / Payables:** `payables` module con CRUD completo, historial de estados, vinculo a purchase orders, cuentas contables por linea.
- **Compras / proveedores:** Ordenes de compra, recepcion de inventario, integracion con payables.
- **Analitica y reportes:** Dashboard `/dashboard/summary`, reportes via `/reports/*`, endpoints para graficos (feature flag).
- **Storefront config:** `storefront` y `storefront-config` proveen APIs para personalizar templates, colores, dominio.
- **Appointments / Services / Resources:** Reservas de recursos, agenda, servicios paquetizados para vertical de servicios.
- **Bank accounts:** Catalogo de bancos, integracion con movimientos (feature flag), preparacion para conciliacion.
- **Eventos y auditoria:** `events` y `audit-log` centralizan actividad del sistema.

### 4.2 Vertical restaurant (implementado, pendiente integrar con Orders V2)
- **Mesas (`tables`):** endpoints CRUD + estadisticas de floor plan.
- **Modificadores (`modifier-groups`, `modifier`):** grupos obligatorios/opcionales por producto.
- **Split bills (`bill-splits`):** division por items, porcentajes o montos; soporte de propinas.
- **Kitchen display (`kitchen-display`):** Tickets, estados de preparacion, sockets para actualizacion en tiempo real.
- **Guia de integracion:** ver `INTEGRATION-GUIDE.md` para conectar modulos con UI de orders.

### 4.3 Integraciones y servicios de soporte
- **Whapi SDK:** `src/lib/whapi-sdk` para WhatsApp inbox y newsletters; permisos `chat_read`, `chat_write`.
- **Exchange rate:** Modulod `exchange-rate` consulta APIs externas con fallback manual configurable.
- **LangChain + OpenAI:** `openai.service.ts` gestiona embeddings y chat completions usando clave configurada por super-admin.
- **Mail/SMS:** SMTP via `nodemailer`; hooks para notificaciones email/WhatsApp.
- **Vector DB / Knowledge base:** Preparado para features de IA contextual (articulos, respuestas rapidas).
- **Seeding y migraciones:** scripts en `scripts/*.ts` (`db:seed`, `seed:restaurant`, migraciones de vertical, limpieza de tenants).

---

## 5. Frontend Admin (React + Vite)

### 5.1 Arquitectura y herramientas
- App Vite + React 18 con modulacion por feature.
- Libreria de UI `shadcn/ui`, iconografia `lucide-react`, graficos `recharts`, calendario `fullcalendar`.
- Contextos clave: `useAuth`, `ShiftContext`, `CrmContext`, `AccountingContext`, `FormStateContext`.
- Rutas protegidas con `ProtectedRoute` y `useAuth.hasPermission`.
- Tema claro/oscuro y tema sistema via `ThemeProvider`.
- Feature flags consumidos desde `VITE_ENABLE_*`.

### 5.2 Areas funcionales principales
- **Dashboard (`DashboardView.jsx`):** KPIs diarios, ordenes recientes, alertas de stock.
- **Inventario y productos:** CRUD, importaciones/exportaciones (Excel), seguimiento FEFO, variantes, lotes.
- **CRM (`CRMManagement.jsx`):** Segmentacion (Diamante/Oro/Plata/Bronce), historial, notas, pipeline.
- **Ordenes V2 (`orders/v2`):** Tabla con paginacion, busqueda debounced, creacion de ordenes (`NewOrderFormV2`), selector de estado, dialogo de pagos con calculo fiscal (IVA/IGTF) en tiempo real, envio a cocina cuando el modulo restaurant esta habilitado.
- **Pagos y cuentas por pagar:** `PaymentDialogV2`, `PayablesManagement.jsx` para gestionar payables y pagos parciales.
- **Contabilidad (`AccountingManagement.jsx`):** Libro diario, plan de cuentas, estados financieros, reportes.
- **Compras y proveedores:** `ComprasManagement.jsx`, historial de compras, integracion con inventario.
- **Servicios / Recursos / Citas:** Gestion de agendas, asignacion de recursos, calendario (`CalendarView.jsx`).
- **Bank accounts & reconciliation:** UI preparada a traves de feature flags.
- **WhatsApp Inbox:** `WhatsAppInbox.jsx` + `WhatsAppConnection.jsx` (con QR) dentro de `SettingsPage`.
- **Storefront Settings:** Editor visual (`StorefrontConfigView`, `StorefrontSettings/*`) para logos, colores, redes sociales, templates.
- **Super Admin:** Layout dedicado (tenants, auditoria, knowledge base, calendar global, CRM global).
- **Shift management:** Boton de `Clock In/Out` asociado a `ShiftContext`.

### 5.3 Experiencia multitenant
- Selector de tenant (`TenantPickerDialog`), guardado de ultima ruta por tenant, permisos dinamicos.
- `tenant.enabledModules` controla visibilidad de pestanas (restaurante, chat, etc.).
- Onboarding y landing (`SmartKubikLanding`) para presentar producto.

---

## 6. Storefront (Next.js 15)

- Rutas dinamicas por dominio o slug (`src/app/[domain]/`), soporte ISR y fallback incremental.
- Templates disponibles: `ModernEcommerce` (principal) y `ModernServices` (legacy). Factory permite agregar nuevos.
- Theming: variables CSS y design tokens configurables desde admin (colores, logos, hero content, redes sociales, WhatsApp).
- Flujos disponibles: listado de productos, detalle, carrito, checkout, llamado a API `POST /orders`.
- Configuracion rapida mediante `INSTALLATION.md` (env vars, scripts).
- SEO dinamico por tenant (`generateMetadata` en templates).

---

## 7. Modelos y esquemas relevantes

| Dominio | Archivo | Destacado |
|---------|---------|-----------|
| Tenant | `src/schemas/tenant.schema.ts` | Configura vertical, modulos habilitados, settings fiscales, tokens Whapi |
| Ordenes | `src/schemas/order.schema.ts` | Soporte de lotes FEFO, modifiers aplicados, split bills, shipping, metricas |
| Payables | `src/schemas/payable.schema.ts` | Historia de estados, lineas contables, enlace a PurchaseOrder |
| Contabilidad | `src/schemas/journal-entry.schema.ts`, `chart-of-accounts.schema.ts` | Asientos automaticos, plan de cuentas dinamico |
| Kitchen | `src/schemas/kitchen-order.schema.ts` | Tickets, estados por estacion, sockets |
| Modifiers | `src/schemas/modifier*.schema.ts` | Grupos, reglas obligatorias, precios |
| Memberships | `src/schemas/user-tenant-membership.schema.ts` | Estados, roles multiples |
| Bank | `src/schemas/bank-account.schema.ts`, `bank-statement.schema.ts` | Preparacion para conciliacion bancaria |

---

## 8. Flujos funcionales clave

1. **Venta completa (B2B/B2C):**  
   Cliente -> Orden (reserva inventario) -> Confirmacion -> Pago parcial/total (IVA + IGTF) -> Actualizacion de inventario -> Asientos automaticos (venta + COGS) -> Actualizacion de CRM -> Indicadores en dashboard.

2. **Reservas y envio a cocina (restaurante):**  
   Mesa asignada -> Orden con modificadores -> Confirmacion -> `sendToKitchen` (OrdersManagementV2) -> Ticket en Kitchen Display -> Actualizacion de estados -> Facturacion / split bill -> Pagos -> Propinas registradas.

3. **Compras y payables:**  
   Orden de compra -> Recepcion de inventario -> Generacion de Payable (supplier, payroll, servicios) -> Pagos parciales -> Reporte Accounts Payable -> Integracion contable.

4. **Cuentas por cobrar:**  
   Orden confirmada pero no pagada -> Reporte Accounts Receivable -> Seguimiento CRM -> Cobro -> Liquidacion del saldo.

5. **Contabilidad automatizada:**  
   - `createJournalEntryForSale`: separa ingresos, descuentos, costos de envio.  
   - `createJournalEntryForCOGS`: debita Costo de Mercancia y acredita Inventario post venta.  
   - Reportes P&G y Balance construidos a partir de plan de cuentas.

6. **Storefront multi-tenant:**  
   Tenant configura dominio y theme -> Cliente visita `https://storefront/{tenant}` -> Productos y carrito interactuan con API -> Orden generada en backend -> Notificacion a tenant.

7. **Turnos y asignacion de operadores:**  
   Usuario hace clock-in -> Ordenes creadas asignan automaticamente `assignedTo` cuando el usuario esta activo -> Dashboard y analytics reportan desempeno.

8. **Soporte y chat:**  
   Integracion WhatsApp via Whapi (config en Settings) -> Inbox centralizado -> Permisos `chat_read/chat_write` controlan acceso.

---

## 9. Configuracion, despliegue y ambientes

### 9.1 Requisitos
- Node.js 20+, npm 10+, MongoDB 7 (Atlas recomendado), Redis opcional para cache.
- Variables de entorno definidas en `.env.example` (backend) y `.env` (frontend).

### 9.2 Backend (`food-inventory-saas`)
```bash
npm install
cp .env.example .env    # Ajustar Mongo, JWT, correo, Whapi, OpenAI
npm run start:dev       # Desarrollo
npm run build && npm run start:prod

# Seeders utiles
npm run db:seed
npm run seed:super-admin
npm run seed:restaurant
```

### 9.3 Admin (`food-inventory-admin`)
```bash
npm install
cp .env.example .env     # Si necesitas override, mantener flags
npm run dev              # http://localhost:5174
npm run build && npm run preview
```

### 9.4 Storefront (`food-inventory-storefront`)
```bash
npm install
cp .env.local.example .env.local   # Definir API URL
npm run dev                        # http://localhost:3001
npm run build && npm start
```

### 9.5 Despliegue
- Guias completas: `DEPLOYMENT-GUIDE-HETZNER.md`, `SUBDOMAIN-SETUP-GUIDE.md`, `DEPLOYMENT-CHECKLIST.md`.
- Scripts: `deploy.sh`, `quick-deploy.sh`, `fix-build.sh`.
- Nginx: plantillas en `nginx-configs/` para admin, API y storefront multi-dominio.
- Backups: script `scripts/backup-before-phase.sh` (respaldos de BD y codigo antes de cada fase).

### 9.6 Observabilidad y mantenimiento
- Logging centralizado (`LOG_FILE_PATH`), niveles configurables via `LOG_LEVEL`.
- Auditoria accesible desde panel super-admin.
- Scripts de verificacion de tenant (`verify-tenant`, `clear-tenant`) para soporte.

---

## 10. Seguridad y cumplimiento
- Revisiones formales documentadas en `SECURITY-*.md`: CSRF, CSP, rate limiting, sanitizacion, validacion de delete, indices.
- Recomendaciones de despliegue: HTTPS obligatorio, rotacion de JWT secret, variables en gestor seguro, backups automaticos.
- Logs sensibles sanitizados (`SECURITY-FIX-LOGGER-SANITIZATION.md`).
- Validaciones de ownership para endpoints multi-tenant (`SECURITY-FIX-DELETE-VALIDATION.md`).

---

## 11. Roadmap y pendientes

### 11.1 Integraciones pendientes priorizadas
1. Conectar completamente modulos de restaurante con Orders V2 (ver `INTEGRATION-GUIDE.md`).
2. Completar logica de conciliacion bancaria (`bank-reconciliation.service.ts` tiene skeleton).
3. Activar dashboard avanzado y analytics (feature flags `ENABLE_DASHBOARD_CHARTS`, `ENABLE_ADVANCED_REPORTS`).
4. Implementar `ENABLE_BANK_*` para movimientos bancarios y transfers.
5. Desarrollar fase 3 de contabilidad (conciliacion, impuestos, presupuestos) - ver `INFORME_DE_PROGRESO.md`.

### 11.2 Oportunidades futuras
- Integracion WhatsApp marketing (newsletters) usando SDK existente.
- Notificaciones push y mobile app (React Native) - pendiente en roadmap principal.
- Pipelines CI/CD (ver `IMPLEMENTATION-ROADMAP.md` para sugerencias).
- Integracion contable externa (ProfitPlus, Saint) segun necesidades locales.

---

## 12. Documentos complementarios
- `DOC-MODULO-*` y `DOC-FLUJO-*`: ver seccion "Biblioteca de Documentos" para modulos y flujos.
- `CURRENT-STATE.md`: Fotografia del proyecto v1.03 con tablero de modulos.
- `IMPLEMENTATION-ROADMAP.md`: Plan por fases 2024-2025, buenas practicas de versionado y rollback.
- `INTEGRATION-GUIDE.md`: Pasos concretos para integrar vertical restaurante en Orders V2.
- `SECURITY-*.md`: Paquete completo de hallazgos y remediaciones de seguridad.
- `PROYECTO_COMPLETO_README.md`: Resumen comercial y tecnico de la entrega.
- `RELEASE-NOTES-v2.0.0-SECURITY.md`: Mejoras de seguridad agrupadas.
- `STAGING-VALIDATION-RESULTS.md` y `STOREFRONT-VERIFICATION-RESULTS.md`: Evidencias de QA.

---

## 13. Contacto y soporte
- **Super Admin Panel:** Gestion centralizada de tenants, modulos y auditoria.
- **Scripts de soporte:** `debug-api.js` (frontend) y `scripts/debug-data.ts` (backend) para diagnostico.
- **Integracion WhatsApp:** Configurar token Whapi en tenant settings para habilitar inbox.
- **IA / OpenAI:** Configurar clave desde Super Admin -> Ajustes para habilitar embeddings y asistentes.

---

Este documento sirve como base de conocimiento para onboarding de nuevos desarrolladores, handover a operaciones y planificacion de roadmap. Actualizar junto a `CURRENT-STATE.md` despues de cada release significativo.
