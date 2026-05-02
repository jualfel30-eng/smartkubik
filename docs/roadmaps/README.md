# Active roadmaps

Esta carpeta contiene **roadmaps de features y planes vigentes** que aún no están implementados o están en planificación activa. A diferencia de `docs/archive/completed-roadmaps/`, estos siguen siendo referencia útil para decisiones futuras.

## Política de gestión

- Cuando un roadmap se completa → mover a `docs/archive/completed-roadmaps/` con nota de "implementado en commit X / fecha Y".
- Cuando un roadmap se descarta → mover a `docs/archive/historic-analysis/` con nota de "descartado por <razón>".
- Cuando un roadmap se actualiza → editar in-place y commitear con mensaje claro del cambio.

## Convención

Cada roadmap debería tener al inicio:
- **Status**: `Planning` | `In Progress` | `Blocked by X` | `Paused`
- **Owner**: persona o equipo responsable
- **Última revisión**: fecha
- **Próximo milestone**: descripción + fecha estimada

Si un roadmap no se revisa en 90 días, debería revisarse o moverse a archive.

## Índice

### Expansión geográfica
- [ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md](./ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md) — soporte multi-país (después de Venezuela)
- [ROADMAP_FASE_3_EXPANSION.md](./ROADMAP_FASE_3_EXPANSION.md) — expansión internacional fase 3
- [INTERNATIONALIZATION-ROADMAP.md](./INTERNATIONALIZATION-ROADMAP.md) — i18n general (declarado "Planning Phase" sin avance verificado)

### CRM y ventas
- [ROADMAP_CRM_FUNNEL.md](./ROADMAP_CRM_FUNNEL.md) — embudo de ventas CRM
- [PASO1_TALLER_VALIDACION_CRM_FUNNEL.md](./PASO1_TALLER_VALIDACION_CRM_FUNNEL.md) — taller validación CRM
- [BACKLOG_CRM_FUNNEL.md](./BACKLOG_CRM_FUNNEL.md) — backlog técnico CRM ⚠️ **PARTIAL ~45%** (verificado 2026-05-02):
    - Epic 1 (Datos): 80% — schemas core OK (StageHistory, nextStep/nextStepDue, validación 14d), faltan modelos maestros Territory/Team/Queue + flag strategicAccount + índices StageHistory
    - Epic 3 (SLA): 50% — job aging diario + alertas 7/14/21d implementados, faltan alerta nextStepDue 48h, SLA MQL 24h, dashboard SLA por equipo
    - Epic 2 (Dedupe contactos): 0% — no normalización email/phone, no endpoint duplicates, no UI merge
    - Epic 4 (Migraciones): 0% — no scripts backfill nextStep/nextStepDue ni reasonLost
    - Epic 5 (Feature flags CRM): 0% — feature-flags.service no tiene flags `crm.*`
    - **Bloqueadores**: definir modelos Territory/Team/Queue + agregar flags CRM + ejecutar migraciones de backfill ANTES de habilitar dedupe en prod

### Analytics y KPIs
- [ROADMAP-KPI-FINANCIEROS.md](./ROADMAP-KPI-FINANCIEROS.md) — KPIs financieros customizables

### Productos
- [PROMPT_PRODUCT_DEDUPLICATION.md](./PROMPT_PRODUCT_DEDUPLICATION.md) — dedup & merge de productos duplicados (NOT_IMPLEMENTED, feature aún no priorizada)

### Marketing / Landing
- [CONTEXTO_MIGRACION_HOMEPAGE.md](./CONTEXTO_MIGRACION_HOMEPAGE.md) — context + design system para construir homepage marketing (NOT_IMPLEMENTED)
