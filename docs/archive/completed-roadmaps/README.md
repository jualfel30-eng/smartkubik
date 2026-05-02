# Completed roadmaps & implementation plans (archive)

Esta carpeta archiva documentos de planificación, roadmaps y reportes de implementación que **describen features ya implementadas en el código**. Se conservan como referencia histórica del razonamiento original detrás de cada feature, pero **no son fuente de verdad activa** — para eso, ver `docs/wiki/` y `docs/wiki/system-map.md`.

## Origen

Migrados desde el directorio padre `V1.03/` (fuera del repo principal) y el root del repo durante el cleanup del 2026-05-02. Se acumularon ahí entre noviembre 2025 y abril 2026 mientras el proyecto evolucionaba sin política clara de archivado.

## Cuándo consultar estos documentos

- Querés entender **por qué** se implementó algo de cierta manera (decisiones de diseño históricas).
- Estás haciendo arqueología de código y necesitás contexto de la fase en la que se construyó.
- Querés saber qué se prometió vs qué se entregó (gap analysis).

## Cuándo NO consultar

- Si necesitás saber cómo funciona algo HOY → `docs/wiki/modules/<X>.md` o el código directamente.
- Si vas a implementar algo nuevo → `docs/wiki/system-map.md` y `docs/wiki/patterns/`.
- Si buscás procedimientos operativos → `CLAUDE.md` raíz.

## Índice

### Por vertical

**Beauty**:
- [FASE_1_COMPLETADA.md](./FASE_1_COMPLETADA.md) — backend beauty (schemas/services, fase 1)
- [FASE_2_WHATSAPP_COMPLETADA.md](./FASE_2_WHATSAPP_COMPLETADA.md) — integración WhatsApp para appointments
- [FASE_3_INSTRUCCIONES.md](./FASE_3_INSTRUCCIONES.md) — storefront beauty frontend ⚠️ *El .md dice "50% completado al 29-mar", pero verificación de código (2026-05-02) confirmó 100% — el frontend (rutas /beauty + wizard 5-pasos + .ics + WhatsApp) se construyó después de marzo*
- [INFORME-TECNICO-BEAUTY-STOREFRONT.md](./INFORME-TECNICO-BEAUTY-STOREFRONT.md) — guía técnica beauty storefront (arquitectura, APIs, schemas)
- [SMARTKUBIK_BEAUTY_STOREFRONT_PROMPT_ADAPTED.md](./SMARTKUBIK_BEAUTY_STOREFRONT_PROMPT_ADAPTED.md) — prompt UX original del beauty storefront
- [INSTRUCCIONES_GEMINI_GALLERY_SAVAGE.md](./INSTRUCCIONES_GEMINI_GALLERY_SAVAGE.md) — instrucciones generación galería para barbería demo "Savage"
- [ROADMAP_MOBILE_UX_BEAUTY.md](./ROADMAP_MOBILE_UX_BEAUTY.md) — mobile-first UX para beauty ⚠️ *Fases 1-3 completadas al 100% (25+ componentes mobile + PWA + Push + MobilePOS + TodayDashboard). Fases 4-5 (offline-first IndexedDB, check-in QR, drag&drop reagenda) son scope futuro y aún no se construyeron*

**Restaurant**:
- [ROADMAP_RESTAURANTE_IMPLEMENTACION.md](./ROADMAP_RESTAURANTE_IMPLEMENTACION.md) — vertical restaurante (infraestructura backend + frontend)
- [ROADMAP_RESTAURANTES_INDEX.md](./ROADMAP_RESTAURANTES_INDEX.md) — índice del set de docs restaurant
- [ROADMAP_RESTAURANTES_00_RESUMEN_EJECUTIVO.md](./ROADMAP_RESTAURANTES_00_RESUMEN_EJECUTIVO.md) — resumen ejecutivo
- [ROADMAP_RESTAURANTES_01_FASE_1_CRITICO_CORREGIDO.md](./ROADMAP_RESTAURANTES_01_FASE_1_CRITICO_CORREGIDO.md) — Fase 1 críticos corregidos
- [ROADMAP_RESTAURANTES_GUIA_IMPLEMENTACION.md](./ROADMAP_RESTAURANTES_GUIA_IMPLEMENTACION.md) — guía implementación
- [ROADMAP_RESTAURANTES_QUICK_WINS.md](./ROADMAP_RESTAURANTES_QUICK_WINS.md) — quick wins iniciales
- [ROADMAP_RESTAURANTES_VENEZUELA_ESPECIFICO.md](./ROADMAP_RESTAURANTES_VENEZUELA_ESPECIFICO.md) — adaptaciones Venezuela

**Billing & HKA (facturación electrónica)**:
- [BILLING_API_DOCUMENTATION.md](./BILLING_API_DOCUMENTATION.md) — API de facturación (9 endpoints)
- [BILLING_MODULE_ACTIVATION_PLAN.md](./BILLING_MODULE_ACTIVATION_PLAN.md) — plan activación módulo billing
- [BILLING_UI_IMPLEMENTATION.md](./BILLING_UI_IMPLEMENTATION.md) — UI billing (dashboard, forms, detail views)
- [ROADMAP_HKA_FACTORY_INTEGRATION.md](./ROADMAP_HKA_FACTORY_INTEGRATION.md) — integración HKA SENIAT (facturas, notas, retenciones IVA/ISLR)
- [IMPRENTA_DIGITAL_IMPLEMENTATION_SUMMARY.md](./IMPRENTA_DIGITAL_IMPLEMENTATION_SUMMARY.md) — proveedor imprenta digital
- [ROADMAP_FACTURACION_DIGITAL.md](./ROADMAP_FACTURACION_DIGITAL.md) — roadmap general facturación digital
- [ROADMAP_FACTURACION_DIGITAL_FASE0.md](./ROADMAP_FACTURACION_DIGITAL_FASE0.md) — fase 0 facturación
- [ROADMAP_FISCAL_MODULE_OVERVIEW.md](./ROADMAP_FISCAL_MODULE_OVERVIEW.md) — overview módulo fiscal
- [RESUMEN_TRABAJO_BILLING.md](./RESUMEN_TRABAJO_BILLING.md) — resumen trabajo billing

**Accounting & impuestos**:
- [ACCOUNTING_SYSTEM_ANALYSIS.md](./ACCOUNTING_SYSTEM_ANALYSIS.md) — análisis chart of accounts (5 tipos)
- [ACCOUNTING_SUMMARY.md](./ACCOUNTING_SUMMARY.md) — resumen sistema contable
- [README_ACCOUNTING.md](./README_ACCOUNTING.md) — README accounting
- [CHART_OF_ACCOUNTS.md](./CHART_OF_ACCOUNTS.md) — chart of accounts matrix
- [ANALISIS_SISTEMA_IMPUESTOS.md](./ANALISIS_SISTEMA_IMPUESTOS.md) — análisis sistema impuestos
- [REFERENCIAS_CODIGO_IMPUESTOS.md](./REFERENCIAS_CODIGO_IMPUESTOS.md) — referencias código impuestos

### Por feature transversal

**Operaciones**:
- [IMPLEMENTACION_COMPLETADA.md](./IMPLEMENTACION_COMPLETADA.md) — transfer orders bidireccional (PUSH/PULL)
- [WORKFLOW_TRANSFERENCIAS_PROPUESTO.md](./WORKFLOW_TRANSFERENCIAS_PROPUESTO.md) — diseño workflow bidireccional
- [PLAN-INTEGRACION-CAJA-ORDENES.md](./PLAN-INTEGRACION-CAJA-ORDENES.md) — integración cash register + orders
- [PROMPT_MULTI_LOCATION.md](./PROMPT_MULTI_LOCATION.md) — multi-sede / multi-location
- [ROADMAP-COMPLETE-ORDER-WORKFLOW.md](./ROADMAP-COMPLETE-ORDER-WORKFLOW.md) — order workflow unificado

**Arquitectura**:
- [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) — arquitectura multi-tenant (AuthContext, memberships, feature flags)
- [MULTI_TENANT_QUICK_REFERENCE.md](./MULTI_TENANT_QUICK_REFERENCE.md) — referencia rápida multi-tenant
- [MULTI_TENANT_SYSTEM_ANALYSIS.md](./MULTI_TENANT_SYSTEM_ANALYSIS.md) — análisis sistema multi-tenant
- [README_MULTI_TENANT.md](./README_MULTI_TENANT.md) — README multi-tenant

**RRHH / Compensación**:
- [COMMISSION_MODULE_ROADMAP.md](./COMMISSION_MODULE_ROADMAP.md) — compensación variable (propinas + comisiones + bonos + earnings engine + integración payroll). Implementado al 100%: 6 schemas, 3 services (38KB+50KB+31KB), Listener `order.completed`, dashboard 60KB + módulo mobile.

**Analytics**:
- [ANALYTICS_ROADMAP.md](./ANALYTICS_ROADMAP.md) — dashboard customizable estilo Power BI. Implementado al 100%: `MetricSelector.jsx`, `CustomAnalytics.jsx` (372 líneas), `SavedViewsManager.jsx`, backend `getCustomMetrics()` con 11+ métricas dinámicas. Las 3 fases (KPIs esenciales, accordion detallado, constructor custom) están.

**Schemas y DTOs**:
- [ROADMAP_SCHEMAS_Y_DTOS.md](./ROADMAP_SCHEMAS_Y_DTOS.md) — specs schemas + DTOs

**Operaciones de DB**:
- [MIGRACION_DB_OPCIONAL.md](./MIGRACION_DB_OPCIONAL.md) — script migración Mongo (campos type, discrepancies a transfer-orders)

**Fases generales del proyecto**:
- [ROADMAP_FASE_1_VENEZUELA.md](./ROADMAP_FASE_1_VENEZUELA.md) — Fase 1 Venezuela (completada Nov 2025)

## Casos que requieren revisión humana

Resueltos durante Ola 4 (2026-05-02):
- ✅ FASE_3_INSTRUCCIONES → archivado (100% completado, no 50%)
- ✅ COMMISSION_MODULE_ROADMAP → archivado (IMPLEMENTED FULL)
- ✅ ANALYTICS_ROADMAP → archivado (IMPLEMENTED FULL)
- ✅ ROADMAP_MOBILE_UX_BEAUTY → archivado (Fases 1-3 done; 4-5 son scope futuro)
- 🟡 BACKLOG_CRM_FUNNEL → movido a `docs/roadmaps/` (PARTIAL ~45%, sigue activo)
- 🟡 PROMPT_PRODUCT_DEDUPLICATION → movido a `docs/roadmaps/` (NOT_IMPLEMENTED)
- 🟡 CONTEXTO_MIGRACION_HOMEPAGE → movido a `docs/roadmaps/` (NOT_IMPLEMENTED)
- 🟡 INTERNATIONALIZATION-ROADMAP → movido a `docs/roadmaps/` (Planning Phase)
