# SmartKubik — Mapa del Sistema

> Página principal de la wiki. Inventario completo de todos los módulos, rutas y componentes del sistema.
> Última actualización: 2026-04-28

---

## Vista General

SmartKubik es un **ERP/SaaS multi-tenant** diseñado para múltiples verticales de negocio. Consta de tres componentes principales:

| Componente | Stack | Ubicación | Descripción |
|---|---|---|---|
| **Backend API** | NestJS + MongoDB + Redis + BullMQ | `food-inventory-saas/src/` | API REST con 114 módulos registrados, ~1,257 endpoints |
| **Admin Frontend** | React 18 + Vite + Tailwind + shadcn/ui | `food-inventory-admin/src/` | Panel de administración con 603+ componentes |
| **Storefront Público** | Next.js 15 (App Router) | `food-inventory-storefront/src/` | Tienda pública multi-tenant con 4 templates |

---

## Verticales de Negocio Soportadas

| Vertical | Clave | Módulos Característicos |
|---|---|---|
| Food / Retail | `FOOD_SERVICE`, `RETAIL` | Inventario, Compras, Órdenes, POS, Recetas |
| Restaurantes | `FOOD_SERVICE` | Mesas, Cocina (KDS), Reservas, Ingeniería de Menú |
| Beauty / Salones | `SERVICES` (profile: `barbershop-salon`, `clinic-spa`) | Citas, Profesionales, Galería, Paquetes |
| Hospitality | `HOSPITALITY` | Operaciones Hotel, Plano de Planta, Integraciones PMS |
| Servicios Generales | `SERVICES` | Citas, Recursos, Servicios |
| Manufactura / Producción | `MANUFACTURING` | BOM, MRP, Centros de Trabajo, Control de Calidad |
| Auto Parts | `RETAIL` (profile: `auto-parts`) | Inventario, Órdenes, Fulfillment |

---

## Inventario de Módulos Backend (114 registrados)

### Core Operations (Prioridad 1)

| # | Módulo | Archivo | Endpoints Principales | Complejidad |
|---|---|---|---|---|
| 1 | **Products** | `modules/products/` | CRUD productos, variantes, SKU, multi-unidad | Alta |
| 2 | **Inventory** | `modules/inventory/` | Stock, movimientos, alertas, reportes | Alta |
| 3 | **Inventory Movements** | `modules/inventory/` (sub-módulo) | Historial de movimientos de stock | Media |
| 4 | **Purchases** | `modules/purchases/` | Órdenes de compra, recepción, aprobación | Alta |
| 5 | **Suppliers** | `modules/suppliers/` | Gestión de proveedores, perfiles virtuales | Media |
| 6 | **Orders** | `modules/orders/` | Ventas, POS, fulfillment, descuentos | Muy Alta |
| 7 | **Cash Register** | `modules/cash-register/` | Sesiones de caja, apertura/cierre, movimientos | Media |
| 8 | **Transfer Orders** | `modules/transfer-orders/` | Traslados push/pull entre almacenes | Alta |
| 9 | **Warehouses** | `modules/warehouses/` | Almacenes, ubicaciones (bins) | Media |
| 10 | **Customers** | `modules/customers/` | CRM, clientes, proveedores, pipeline | Alta |
| 11 | **Auth** | `auth/` | Login, JWT, tokens, 2FA | Alta |
| 12 | **Users** | `modules/users/` | Gestión de usuarios | Baja |
| 13 | **Roles** | `modules/roles/` | Roles de usuario (GLOBAL) | Baja |
| 14 | **Permissions** | `modules/permissions/` | Permisos granulares | Baja |

### Finanzas (Prioridad 2)

| # | Módulo | Archivo | Endpoints Principales | Complejidad |
|---|---|---|---|---|
| 15 | **Accounting** | `modules/accounting/` | Plan de cuentas, asientos, libros, IVA, ISLR, declaraciones | Muy Alta (91 endpoints) |
| 16 | **Billing** | `modules/billing/` | Facturación electrónica, secuencias, retenciones | Alta |
| 17 | **Payments** | `modules/payments/` | Procesamiento de pagos, métodos, conciliación | Alta |
| 18 | **Bank Accounts** | `modules/bank-accounts/` | Cuentas bancarias, transacciones, transferencias, alertas | Alta |
| 19 | **Bank Reconciliation** | `modules/bank-reconciliation/` | Conciliación bancaria | Media |
| 20 | **Payables** | `modules/payables/` | Cuentas por pagar | Media |
| 21 | **Recurring Payables** | `modules/recurring-payables/` | Pagos recurrentes | Baja |
| 22 | **Exchange Rate** | `modules/exchange-rate/` | Tasas de cambio (USD/VES/EUR) | Baja |
| 23 | **Liquidations** | `modules/liquidations/` | Liquidaciones contables | Media |
| 24 | **Fixed Assets** | `modules/fixed-assets/` | Activos fijos, depreciación | Media |
| 25 | **Investments** | `modules/investments/` | Inversiones | Media |
| 26 | **Transaction History** | `modules/transaction-history/` | Historial de transacciones de clientes | Media |

### Restaurante (Prioridad 3a)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 27 | **Tables** | `modules/tables/` | Mesas, secciones, combinación de mesas | Media |
| 28 | **Kitchen Display** | `modules/kitchen-display/` | Sistema KDS para cocina | Media |
| 29 | **Reservations** | `modules/reservations/` | Reservas de restaurante | Media |
| 30 | **Menu Engineering** | `modules/menu-engineering/` | Análisis de rentabilidad de menú | Media |
| 31 | **Bill Splits** | `modules/bill-splits/` | División de cuentas | Media |
| 32 | **Wait List** | `modules/wait-list/` | Lista de espera | Baja |
| 33 | **Modifier Groups** | `modules/modifier-groups/` | Modificadores de productos (extras, opciones) | Media |
| 34 | **Restaurant Storefront** | `modules/restaurant-storefront/` | Menú online para restaurantes | Media |

### Beauty / Servicios (Prioridad 3b)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 35 | **Appointments** | `modules/appointments/` | Citas, servicios, recursos, cola, auditoría | Muy Alta |
| 36 | **Beauty** | `modules/beauty/` | Paquetes, servicios, profesionales, galería, reseñas, loyalty, WhatsApp | Alta |
| 37 | **Service Packages** | `modules/service-packages/` | Paquetes de servicios | Media |
| 38 | **Hospitality Integrations** | `modules/hospitality-integrations/` | PMS, calendar integrations | Media |

### Producción / Manufactura (Prioridad 3c)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 39 | **Bill of Materials** | `modules/production/` | Listas de materiales (BOM) | Alta |
| 40 | **Manufacturing Orders** | `modules/production/` | Órdenes de producción, MRP | Alta |
| 41 | **Work Centers** | `modules/production/` | Centros de trabajo | Media |
| 42 | **Routing** | `modules/production/` | Rutas de producción | Media |
| 43 | **Production Versions** | `modules/production/` | Versiones de producción | Media |
| 44 | **Quality Control** | `modules/production/` | Control de calidad | Media |
| 45 | **Waste** | `modules/waste/` | Control de mermas | Media |

### Marketing y Ventas (Prioridad 3d)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 46 | **Marketing** | `modules/marketing/` | Campañas, triggers, A/B testing, workflows, delivery | Muy Alta |
| 47 | **Promotions** | `modules/promotions/` | Promociones (%, fijo, buy-x-get-y, bundle) | Media |
| 48 | **Coupons** | `modules/coupons/` | Cupones de descuento | Media |
| 49 | **Loyalty** | `modules/loyalty/` | Programa de fidelización (puntos) | Media |
| 50 | **Product Campaign** | `modules/product-campaign/` | Campañas de productos | Media |
| 51 | **Product Affinity** | `modules/product-affinity/` | Afinidad cliente-producto | Media |
| 52 | **Newsletter** | `modules/newsletter/` | Boletín de noticias | Baja |
| 53 | **Social Links** | `modules/social-links/` | Bio links | Baja |

### RRHH y Nómina (Prioridad 4)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 54 | **Payroll (umbrella)** | `modules/payroll/` | Módulo paraguas: runs, structures, calendar, absences | Alta |
| 55 | **Payroll Employees** | `modules/payroll-employees/` | Perfiles de empleados, contratos | Alta |
| 56 | **Payroll Calendar** | `modules/payroll-calendar/` | Calendario de nómina | Media |
| 57 | **Payroll Localizations** | `modules/payroll-localizations/` | Localizaciones fiscales | Media |
| 58 | **Payroll Reports** | `modules/payroll-reports/` | Reportes de nómina | Media |
| 59 | **Payroll Webhooks** | `modules/payroll-webhooks/` | Webhooks de nómina | Baja |
| 60 | **Commissions** | `modules/commissions/` | Comisiones, metas, bonos | Media |
| 61 | **Tips** | `modules/tips/` | Propinas | Media |
| 62 | **Shifts** | `modules/shifts/` | Turnos de trabajo | Media |

### CRM Avanzado (Prioridad 5a)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 63 | **Opportunities** | `modules/opportunities/` | Pipeline de ventas, oportunidades | Alta |
| 64 | **Opportunity Stages** | `modules/opportunity-stages/` | Etapas del pipeline | Baja |
| 65 | **Opportunity Ingest** | `modules/opportunity-ingest/` | Ingesta de leads | Baja |
| 66 | **Playbooks** | `modules/playbooks/` | Playbooks de ventas | Media |
| 67 | **Activities** | `modules/activities/` | Actividades CRM | Media |
| 68 | **Reminders** | `modules/reminders/` | Recordatorios | Baja |
| 69 | **Calendars** | `modules/calendars/` | Calendarios (Google, Outlook) | Media |

### Storefront y Delivery (Prioridad 5b)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 70 | **Storefront** | `modules/storefront/` | CRUD de storefront | Media |
| 71 | **Storefront Config** | `modules/storefront-config/` | Configuración de tienda pública | Media |
| 72 | **Delivery** | `modules/delivery/` | Despacho, shipping providers | Media |
| 73 | **Drivers** | `modules/drivers/` | Portal de repartidores | Media |

### Notificaciones y Comunicación (Prioridad 5c)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 74 | **Notifications** | `modules/notifications/` | Servicio de notificaciones multi-canal | Alta |
| 75 | **Notification Center** | `modules/notification-center/` | Centro de notificaciones, WebSocket, WebPush | Media |
| 76 | **Mail** | `modules/mail/` | Email (Gmail OAuth, Outlook, Resend) | Alta |
| 77 | **Whapi (WhatsApp)** | `modules/whapi/` | WhatsApp Business API | Media |
| 78 | **Chat** | `chat/` | Chat interno, conversaciones | Media |

### IA y Asistente (Prioridad 5d)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 79 | **Assistant** | `modules/assistant/` | Asistente IA (usa Knowledge Base + OpenAI) | Alta |
| 80 | **OpenAI** | `modules/openai/` | Integración OpenAI | Media |
| 81 | **Knowledge Base** | `modules/knowledge-base/` | Base de conocimiento vectorial | Media |
| 82 | **Vector DB** | `modules/vector-db/` | Base de datos vectorial | Media |
| 83 | **Intelligence** | `modules/intelligence/` | BI proactivo, notificaciones inteligentes | Media |
| 84 | **Tenant Events** | `modules/tenant-events/` | Eventos de tenant para BI (GLOBAL) | Baja |

### Analytics y Reportes (Prioridad 5e)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 85 | **Analytics** | `modules/analytics/` | Analytics general | Media |
| 86 | **Dashboard** | `modules/dashboard/` | Dashboard KPIs | Media |
| 87 | **Reports** | `modules/reports/` | Reportes generales | Media |
| 88 | **Reviews** | `modules/reviews/` | Reseñas de clientes | Baja |
| 89 | **Ratings** | `modules/ratings/` | Calificaciones | Baja |

### Infraestructura y Admin (Prioridad 5f)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 90 | **Super Admin** | `modules/super-admin/` | Panel de super-administrador (importa ~25 módulos) | Muy Alta |
| 91 | **Onboarding** | `modules/onboarding/` | Registro de tenants, seeding inicial | Alta |
| 92 | **Organizations** | `modules/organizations/` | Multi-organización, membresías | Media |
| 93 | **Feature Flags** | `modules/feature-flags/` | Feature flags por tenant | Baja |
| 94 | **Health** | `modules/health/` | Health check del servidor | Baja |
| 95 | **Uploads** | `modules/uploads/` | Subida de archivos | Baja |
| 96 | **Data Import** | `modules/data-import/` | Importación masiva de datos | Media |
| 97 | **Audit Log** | `modules/audit-log/` | Log de auditoría | Baja |
| 98 | **Security Monitoring** | `modules/security-monitoring/` | Monitoreo de seguridad | Baja |
| 99 | **Server Performance** | `modules/server-performance/` | Métricas de rendimiento | Baja |
| 100 | **Seeder** | `database/seeds/` | Datos semilla | Baja |
| 101 | **Migrations** | `database/migrations/` | Migraciones de BD | Baja |
| 102 | **Country Plugin** | `country-plugins/` | Plugins de localización fiscal | Media |

### Unidades y Precios (Auxiliares)

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 103 | **Unit Types** | `modules/unit-types/` | Tipos de unidades de medida | Baja |
| 104 | **Unit Conversions** | `modules/unit-conversions/` | Conversiones entre unidades | Baja |
| 105 | **Pricing** | `modules/pricing/` | Motor de precios | Media |
| 106 | **Price Lists** | `modules/price-lists/` | Listas de precios | Media |
| 107 | **Price History** | `modules/pricing/` (sub) | Historial de precios | Baja |
| 108 | **Consumables** | `modules/consumables/` | Consumibles | Baja |
| 109 | **Supplies** | `modules/supplies/` | Suministros | Baja |

### Otros

| # | Módulo | Archivo | Descripción | Complejidad |
|---|---|---|---|---|
| 110 | **Todos** | `modules/todos/` | Tareas pendientes | Baja |
| 111 | **Events** | `modules/events/` | Eventos del sistema | Media |
| 112 | **Locations** | `modules/locations/` | Ubicaciones geográficas | Baja |
| 113 | **Business Locations** | `modules/business-locations/` | Sedes de negocio | Baja |
| 114 | **Subscription Plans** | `modules/subscription-plans/` | Planes de suscripción SaaS | Media |
| 115 | **Tenant Payment Config** | `modules/tenant-payment-config/` | Config de pagos por tenant | Baja |
| 116 | **Binance Pay** | `modules/binance-pay/` | Pagos con cripto | Baja |
| 117 | **Product Dedup** | `modules/product-dedup/` | Deduplicación de productos | Baja |

---

## Mapa de Rutas Frontend (Admin)

### Rutas Públicas (sin autenticación)

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | SmartKubikLanding | Landing page principal |
| `/v2` | SmartKubikLandingV2 | Landing page v2 |
| `/skubik` | SkubikBeautyLanding | Landing de beauty |
| `/skubik/afiliados` | SkubikAffiliateLanding | Landing de afiliados |
| `/skubik/panel` | SkubikAffiliatePanel | Panel de afiliados |
| `/fundadores` | FoundersPage | Página de fundadores |
| `/links` | LinksPage | Página de enlaces |
| `/blog` | BlogIndex | Índice del blog |
| `/blog/:slug` | BlogPost | Artículo de blog |
| `/docs` | DocsLanding | Documentación |
| `/docs/:category` | DocsCategoryPage | Categoría de docs |
| `/docs/:category/:slug` | DocsArticle | Artículo de docs |
| `/login` | LoginRouteGate | Login |
| `/register` | Register | Registro |
| `/register/beauty` | MobileRegisterBeauty | Registro beauty (mobile) |
| `/confirm-account` | ConfirmAccount | Confirmación de cuenta |
| `/forgot-password` | ForgotPassword | Recuperar contraseña |
| `/reset-password` | ResetPassword | Resetear contraseña |
| `/auth/callback` | AuthCallback | Callback OAuth |
| `/trial-expired` | TrialExpired | Trial expirado |
| `/checkin/:tenantId` | PublicCheckinPage | Checkin público |

### Rutas Protegidas (dentro de TenantLayout)

| Ruta | Componente | Módulo Requerido | Permiso |
|---|---|---|---|
| `/dashboard` | TodayDashboard + DashboardView | — | dashboard_read |
| `/inventory-management` | InventoryRouteGate | — | inventory_read |
| `/orders/new` | OrdersPOS | — | orders_read |
| `/orders/history` | OrdersHistory | — | orders_read |
| `/fulfillment` | FulfillmentDashboard | fulfillment | orders_read |
| `/purchases` | ComprasManagement | — | purchases_read |
| `/crm` | CrmRouteGate | — | customers_read |
| `/storefront` | StorefrontRouteGate | ecommerce | dashboard_read |
| `/accounting` | AccountingManagement | — | accounting_read |
| `/accounts-payable` | PayablesManagement | — | accounting_read |
| `/receivables` | PaymentsManagementDashboard | — | accounting_read |
| `/billing/create` | BillingCreateForm | — | billing_read |
| `/billing/sequences` | BillingSequencesManager | — | billing_read |
| `/billing/retenciones` | WithholdingManagement | — | billing_read |
| `/bank-accounts` | BankAccountsRouteGate | bankAccounts | accounting_read |
| `/bank-accounts/:id/reconciliation` | BankReconciliationView | — | — |
| `/cash-register` | CashRegisterRouteGate | cashRegister | cash_register_read |
| `/fixed-assets` | FixedAssetsView | fixedAssets | reports_read |
| `/investments` | InvestmentsView | investments | reports_read |
| `/payroll/employees` | CRMManagement (forceEmployeeTab) | payroll | payroll_employees_read |
| `/payroll/runs` | PayrollRunsDashboard | payroll | payroll_employees_read |
| `/payroll/runs/wizard` | PayrollRunWizard | payroll | payroll_employees_read |
| `/payroll/structures` | PayrollStructuresManager | payroll | payroll_employees_read |
| `/payroll/calendar` | PayrollCalendarTimeline | payroll | payroll_employees_read |
| `/payroll/absences` | PayrollAbsencesManager | payroll | payroll_employees_read |
| `/appointments` | AppointmentsRouteGate | — | appointments_read |
| `/services` | ServicesRouteGate | — | appointments_read |
| `/resources` | ProfessionalsRouteGate | — | appointments_read |
| `/reviews` | ReviewsManagement | — | appointments_read |
| `/tips` | TipsPage | tips | tips_read |
| `/commissions` | CommissionsRouteGate | commissions | commissions_read |
| `/restaurant/floor-plan` | TablesPage | restaurant | restaurant_read |
| `/restaurant/kitchen-display` | KitchenDisplay | restaurant | restaurant_read |
| `/restaurant/reservations` | ReservationsPage | restaurant | restaurant_read |
| `/restaurant/menu-engineering` | MenuEngineeringPage | restaurant | restaurant_read |
| `/restaurant/recipes` | RecipesPage | restaurant | restaurant_read |
| `/restaurant/purchase-orders` | PurchaseOrdersPage | restaurant | restaurant_read |
| `/restaurant/storefront` | StorefrontHub | restaurant | restaurant_read |
| `/hospitality/operations` | HospitalityOperationsDashboard | appointments | appointments_read |
| `/hospitality/floor-plan` | HotelFloorPlanPage | appointments | appointments_read |
| `/hospitality/deposits` | PaymentsManagementDashboard | — | — |
| `/production` | ProductionManagement | production | inventory_read |
| `/waste-control` | WasteManagementPage | — | — |
| `/marketing` | MarketingPage | marketing | marketing_read |
| `/whatsapp` | WhatsAppInbox | — | chat_read |
| `/calendar` | CalendarModule | — | events_read |
| `/organizations` | OrganizationsManagement | — | — |
| `/business-locations` | BusinessLocationsManagement | — | — |
| `/subsidiaries` | SubsidiariesPanel | — | — |
| `/settings` | SettingsRouteGate | — | — |
| `/data-import` | DataImportPage | — | data_import_read |
| `/reports` | ReportsRouteGate | — | reports_read |
| `/assistant` | AssistantPage | — | dashboard_read |
| `/hr/shifts` | ShiftManagement | — | — |
| `/fichar` | TimeClock | — | — |

### Rutas Especiales

| Ruta | Componente | Descripción |
|---|---|---|
| `/organizations` (público) | OrganizationSelector | Selector de organización post-login |
| `/onboarding` | OnboardingGate | Wizard de onboarding |
| `/super-admin/*` | SuperAdminLayout | Panel super-admin |
| `/driver/*` | DriverLayout | Portal de repartidores |

---

## Mapa del Storefront (Next.js)

### Rutas Públicas

| Ruta | Descripción |
|---|---|
| `/[domain]` | Homepage de la tienda |
| `/[domain]/productos` | Catálogo de productos |
| `/[domain]/productos/[id]` | Detalle de producto |
| `/[domain]/carrito` | Carrito de compras |
| `/[domain]/checkout` | Proceso de pago |
| `/[domain]/orden` | Buscar orden |
| `/[domain]/orden/[orderNumber]` | Tracking de orden |
| `/[domain]/mis-ordenes` | Historial de órdenes |
| `/[domain]/login` | Login de cliente |
| `/[domain]/registro` | Registro de cliente |
| `/[domain]/perfil` | Perfil de cliente |
| `/[domain]/book` | Wizard de reserva (servicios) |
| `/[domain]/reservations` | Gestión de reservas |
| `/[domain]/beauty` | Storefront de beauty |
| `/[domain]/beauty/reservar` | Wizard de reserva beauty (5 pasos) |
| `/[domain]/beauty/reserva/[bookingNumber]` | Confirmación de reserva beauty |

### Templates Disponibles

| Template | Clave | Uso |
|---|---|---|
| Modern Ecommerce | `modern-ecommerce` | E-commerce genérico (default) |
| Premium Storefront | `premium` | E-commerce premium |
| Modern Services | `modern-services` | Servicios y reservas |
| Beauty Storefront | `beauty` | Salones de belleza |

---

## Stack de Seguridad

```
Request → UserThrottlerGuard (3 tiers: short/medium/long)
        → JwtAuthGuard (Bearer token)
        → TenantGuard (x-tenant-id header)
        → PermissionsGuard (@Permissions decorator)
```

**Rate Limiting (producción)**:
- Short: 50 req/min
- Medium: 300 req/10min
- Long: 1000 req/hora

---

## Proveedores de Contexto (Frontend)

El frontend usa React Context (no Redux). Estos son los providers que envuelven la app:

```
Router
└── ThemeProvider (dark/light/system)
    └── MuiThemeBridge
        └── AuthProvider (JWT, user, tenant, memberships)
            └── CountryPluginProvider (localización fiscal)
                └── NotificationProvider
                    └── ProtectedRoute (requireOrganization)
                        └── ShiftProvider (turnos)
                            └── BusinessLocationProvider (sedes)
                                └── AccountingProvider
                                    └── CashRegisterProvider
                                        └── FabProvider
                                            └── TenantLayout
```

---

---

## Checklist de Documentación por Módulo

Estimación de complejidad basada en: número de endpoints, dependencias, schemas, y lógica de negocio.

### Prioridad 1 — Core Operations

| Módulo | Complejidad | Endpoints (est.) | Deps | Estado |
|---|---|---|---|---|
| products/ | Alta | ~40 | 9 imports | ✅ Completado (6 docs) |
| inventory/ | Alta | ~30 | 4 imports | ✅ Completado (6 docs) |
| purchases/ | Alta | ~25 | 10 imports | ✅ Completado (6 docs combinado con suppliers) |
| suppliers/ | Media | ~15 | 1 import | ✅ Completado (incluido en purchases/) |
| orders/ | Muy Alta | ~50 | 15 imports | ✅ Completado (6 docs combinado con cash-register) |
| cash-register/ | Media | ~15 | 0 imports | ✅ Completado (incluido en orders/) |
| transfers/ + warehouses/ | Alta | ~20+10 | 1+1 imports | ✅ Completado (6 docs) |
| customers-crm/ | Alta | ~35 | 5 imports | ✅ Completado (6 docs) |
| auth-users-roles/ | Alta | ~25 | 4 imports | ✅ Completado (6 docs) |

### Prioridad 2 — Finanzas

| Módulo | Complejidad | Endpoints (est.) | Deps | Estado |
|---|---|---|---|---|
| accounting/ | Muy Alta | ~91 | 0 imports (base) | ✅ Completado (6 docs) |
| billing/ | Alta | ~20 | 2 imports | ✅ Completado (overview) |
| payments/ | Alta | ~20 | 3 imports | ✅ Completado (overview) |
| bank-accounts/ | Alta | ~25 | 3 imports | ✅ Completado (overview) |
| payables/ | Media | ~15 | 3 imports | ✅ Completado (overview) |

### Prioridad 3 — Verticales

| Módulo | Complejidad | Endpoints (est.) | Deps | Estado |
|---|---|---|---|---|
| restaurant/ (9 sub-módulos) | Alta | ~87 total | variado | ✅ Completado (overview) |
| beauty/ (4 módulos) | Alta | ~70+ total | 3+5 imports | ✅ Completado (overview) |
| production/ (7 sub-módulos) | Alta | ~65+ total | variado | ✅ Completado (overview) |
| marketing/ (8 sub-módulos) | Muy Alta | ~88+ total | 3 imports | ✅ Completado (overview) |

### Prioridad 4 — RRHH

| Módulo | Complejidad | Endpoints (est.) | Deps | Estado |
|---|---|---|---|---|
| payroll/ (6 sub-módulos) | Alta | ~40 total | variado | ✅ Completado (overview) |
| commissions/ + tips/ | Media | ~65 total | 1+1 imports | ✅ Completado (overview) |
| shifts/ | Media | ~6 | 0 imports | ✅ Completado (overview) |

### Prioridad 5 — Complementarios

| Módulo | Complejidad | Endpoints (est.) | Deps | Estado |
|---|---|---|---|---|
| storefront/ (config + público) | Media | ~20 | 2 imports | ✅ Completado (overview) |
| delivery/ + drivers/ | Media | ~9 total | 0 imports | ✅ Completado (overview) |
| analytics-reports/ | Media | ~20+ total | 1+2 imports | ✅ Completado (overview) |
| notifications/ (4 sub-módulos) | Alta | ~25+ total | variado | ✅ Completado (overview) |
| infrastructure/ (6+ sub-módulos) | Baja-Media | ~20+ total | variado | ✅ Completado (overview) |
| crm-avanzado/ (opportunities, playbooks, etc.) | Media | ~30 total | variado | ✅ Completado (overview) |
| ai-assistant/ (5 sub-módulos) | Alta | ~7 endpoints | 14 imports | ✅ Completado (overview) |
| platform/ (onboarding, orgs, super-admin) | Media | ~30+ total | variado | ✅ Completado (overview) |

### Frontend y Storefront

| Documento | Complejidad | Estado |
|---|---|---|
| frontend/overview.md | Media | ✅ Completado (incluye patterns, nav, mobile) |
| frontend/component-patterns.md | Media | ✅ Incluido en overview |
| frontend/navigation-map.md | Baja | ✅ Incluido en overview |
| frontend/mobile.md | Media | ✅ Incluido en overview |
| storefront/overview.md | Media | ✅ Completado (incluye flows + API contract) |
| storefront/customer-flows.md | Media | ✅ Incluido en overview + guide |
| storefront/api-contract.md | Media | ✅ Incluido en overview |

### Guías Cross-Módulo

| Guía | Módulos Involucrados | Estado |
|---|---|---|
| purchase-to-stock.md | Purchases → Inventory → Accounting → Payables | ✅ Completado |
| order-lifecycle.md | Orders → Inventory → Payments → Delivery → Billing | ✅ Completado |
| transfer-between-locations.md | TransferOrders → Inventory → Warehouses | ✅ Completado |
| customer-journey.md | Storefront → Orders → Payments → Loyalty | ✅ Completado |
| payroll-cycle.md | PayrollStructures → Employees → PayrollRuns → Accounting | ✅ Completado |
| accounting-flow.md | JournalEntries → ChartOfAccounts → Reports → Reconciliation | ✅ Completado |

---

*Última actualización: 2026-04-28*
