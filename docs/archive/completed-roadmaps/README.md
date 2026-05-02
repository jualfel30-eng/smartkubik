# Completed roadmaps & implementation plans (archive)

Esta carpeta archiva documentos de planificación, roadmaps y reportes de implementación que **describen features ya implementadas en el código**. Se conservan como referencia histórica del razonamiento original detrás de cada feature, pero **no son fuente de verdad activa** — para eso, ver `docs/wiki/` y `docs/wiki/system-map.md`.

## Origen

Migrados desde el directorio padre `V1.03/` (fuera del repo principal) durante el cleanup del 2026-05-02. Se acumularon ahí entre noviembre 2025 y abril 2026 mientras el proyecto evolucionaba sin política clara de archivado.

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
- [INFORME-TECNICO-BEAUTY-STOREFRONT.md](./INFORME-TECNICO-BEAUTY-STOREFRONT.md) — guía técnica beauty storefront (arquitectura, APIs, schemas)
- [SMARTKUBIK_BEAUTY_STOREFRONT_PROMPT_ADAPTED.md](./SMARTKUBIK_BEAUTY_STOREFRONT_PROMPT_ADAPTED.md) — prompt UX original del beauty storefront
- [INSTRUCCIONES_GEMINI_GALLERY_SAVAGE.md](./INSTRUCCIONES_GEMINI_GALLERY_SAVAGE.md) — instrucciones generación galería para barbería demo "Savage"

**Restaurant**:
- [ROADMAP_RESTAURANTE_IMPLEMENTACION.md](./ROADMAP_RESTAURANTE_IMPLEMENTACION.md) — vertical restaurante (infraestructura backend + frontend)

**Billing & HKA (facturación electrónica)**:
- [BILLING_API_DOCUMENTATION.md](./BILLING_API_DOCUMENTATION.md) — API de facturación (9 endpoints)
- [BILLING_MODULE_ACTIVATION_PLAN.md](./BILLING_MODULE_ACTIVATION_PLAN.md) — plan activación módulo billing
- [BILLING_UI_IMPLEMENTATION.md](./BILLING_UI_IMPLEMENTATION.md) — UI billing (dashboard, forms, detail views)
- [ROADMAP_HKA_FACTORY_INTEGRATION.md](./ROADMAP_HKA_FACTORY_INTEGRATION.md) — integración HKA SENIAT (facturas, notas, retenciones IVA/ISLR)
- [IMPRENTA_DIGITAL_IMPLEMENTATION_SUMMARY.md](./IMPRENTA_DIGITAL_IMPLEMENTATION_SUMMARY.md) — proveedor imprenta digital

**Accounting**:
- [ACCOUNTING_SYSTEM_ANALYSIS.md](./ACCOUNTING_SYSTEM_ANALYSIS.md) — análisis chart of accounts (5 tipos)

### Por feature transversal

**Operaciones**:
- [IMPLEMENTACION_COMPLETADA.md](./IMPLEMENTACION_COMPLETADA.md) — transfer orders bidireccional (PUSH/PULL)
- [WORKFLOW_TRANSFERENCIAS_PROPUESTO.md](./WORKFLOW_TRANSFERENCIAS_PROPUESTO.md) — diseño workflow bidireccional
- [PLAN-INTEGRACION-CAJA-ORDENES.md](./PLAN-INTEGRACION-CAJA-ORDENES.md) — integración cash register + orders
- [PROMPT_MULTI_LOCATION.md](./PROMPT_MULTI_LOCATION.md) — multi-sede / multi-location

**Arquitectura**:
- [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) — arquitectura multi-tenant (AuthContext, memberships, feature flags)

**Operaciones de DB**:
- [MIGRACION_DB_OPCIONAL.md](./MIGRACION_DB_OPCIONAL.md) — script migración Mongo (campos type, discrepancies a transfer-orders)

## Casos pendientes de revisión humana

Estos NO están en este archivo porque su status de implementación es ambiguo:

- `FASE_3_INSTRUCCIONES.md` — ¿beauty storefront completado al 100% o sigue al 50%?
- `COMMISSION_MODULE_ROADMAP.md` — ¿solo propinas o compensación variable completa?
- `ANALYTICS_ROADMAP.md` — ¿redesign de "selectable metrics" implementado o sigue como dashboard fijo?
- `BACKLOG_CRM_FUNNEL.md` — ¿cuántos de los 5 epics están cerrados?
- `ROADMAP_MOBILE_UX_BEAUTY.md` — declarado "Fase 1 en curso" — verificar si avanzó
- `PROMPT_PRODUCT_DEDUPLICATION.md` — feature aún no implementada según audit
- `CONTEXTO_MIGRACION_HOMEPAGE.md` — homepage de marketing aún no construida según audit
