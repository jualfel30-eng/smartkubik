# Fase 4 · Plan de Rollout y Go-Live Retail
## Food Inventory SaaS · Octubre 2025

> **Objetivo**: Definir la estrategia de despliegue controlado de verticales retail, incluyendo pilotos, métricas de éxito y procedimientos de rollback.
>
> **Estado**: 🛠️ En progreso (Fase 4)

---

## 1. Feature Flags y Configuración

| Flag | Descripción | Default | Observaciones |
|------|-------------|---------|---------------|
| `ENABLE_VERTICAL_PROFILES` | Habilita selección `verticalProfile` y atributos dinámicos | `false` | Encender por tenant piloto |
| `DASHBOARD_CHARTS` | Activa paneles con atributos dinámicos | `true` (admin) | Validar performance antes de GA |
| `ENABLE_ASSISTANT_VERTICALS` | Permite IA consultar atributos específicos | `false` | Encender tras validar prompts |
| `ENABLE_VERTICAL_IMPORT_EXPORT` | Plantillas dinámicas para CSV/XLSX | `false` | Depende de QA de importaciones |

> Flags administrados desde panel Super Admin; documentar valores previos en `docs/flags/history.md` (crear).

---

## 2. Fases del Despliegue

| Fase | Tenants | Acciones clave | Criterios de avance |
|------|---------|----------------|---------------------|
| **Piloto Controlado (Semana 1)** | 1 moda, 1 ferretería | Encender `ENABLE_VERTICAL_PROFILES`, asistir en carga inicial | QA Cycle 1 sin P1/P0, feedback positivo |
| **Piloto Ampliado (Semana 2-3)** | +1 calzado, +1 tecnología | Habilitar dashboards e IA; monitorear métricas | NPS ≥ 8, IA con 90% prompts exitosos |
| **Pre-GA (Semana 4)** | Tenants interesados registrados | Activar imports/exports; preparar comunicaciones | Manuales publicados, trainings completados |
| **GA** | Todos los tenants retail | Flags `true` por default, activar en nuevo onboarding | 0 incidentes críticos en 7 días |

---

## 3. Métricas y Monitoreo

- **Uso**:
  - Nº de productos con `attributes` ≠ {} por vertical.
  - Nº de órdenes creadas con atributos dinámicos.
  - Tiempo promedio de creación de producto (telemetría UI).
- **Calidad**:
  - Bugs por severidad (Linear/Jira).
  - KPI de IA: prompts exitosos / totales.
  - Reportes/exports fallidos.
- **Satisfacción**:
  - NPS de piloto.
  - Feedback de trainings (encuesta).
- **Dashboards**:
  - Latencia en `/analytics/*`.
  - Uso de tablas de atributos (clicks, exports).

> Configurar tablero en Looker/Metabase `Retail Rollout Monitoring`.

---

## 4. Procedimiento de Rollback

1. **Detección**: incidente P0/P1 o regresión crítica en alimentación.
2. **Acción inmediata**:
   - Desactivar `ENABLE_VERTICAL_PROFILES` y `ENABLE_ASSISTANT_VERTICALS` vía flag.
   - Comunicar a tenants afectados (Slack/Correo).
3. **Reversión de datos**:
   - Ejecutar script `scripts/tools/rollback-vertical-attributes.ts` (pendiente) para remover atributos nuevos si es necesario.
   - Restaurar backups de catálogo si se corrompen (usar `backups/` generados en Fase 3).
4. **Postmortem**:
   - Ticket root-cause.
   - Cronograma para reactivar.

---

## 5. Plan de Comunicación

- **Previo a piloto**:
  - Email “Nueva experiencia retail – programa piloto” (adjuntar guía rápida).
  - Reunión 1:1 para configuración inicial.
- **Durante piloto**:
  - Check-in semanal (15 min) para feedback.
  - Reporte de bugs y estado compartido en Notion.
- **Pre-GA**:
  - Webinar “Retail multi-vertical” (ver enablement).
  - Actualizar landing page y pricing materials.
- **GA**:
  - Email masivo + blog post.
  - Notificación in-app (modal con CTA a manuales).

---

## 6. Checklist de Go-Live

| Ítem | Responsable | Estado |
|------|-------------|--------|
| QA Cycles completados (plan QA) | QA Lead | ⏳ |
| Scripts de seeds y rollback listos | Ingeniería | ⏳ |
| Flags configurados para pilotos | DevOps | ⏳ |
| Manuales y guías publicados | Producto/CS | ⏳ |
| Trainings realizados | Customer Success | ⏳ |
| Métricas configuradas (dashboard) | Data Team | ⏳ |
| Comunicaciones redactadas y aprobadas | Marketing | ⏳ |

---

## 7. Riesgos y Contingencias

- **Carga masiva incorrecta** → Mantener soporte de import en piloto, validar plantillas antes de GA.
- **Performance de analytics** → Monitorear latencia; feature flag para degradar tablas de atributos si es necesario.
- **IA responde con errores** → Mantener fallback a mensajes informativos; registrar prompts problemáticos.
- **Cambio de vertical post-onboarding** → Proceso manual acompañado por soporte hasta nueva iteración.

---

## 8. Cierre de Fase 4

- Completar informe final consolidando:
  - Resultados QA.
  - Feedback trainings.
  - Métricas piloto.
  - Plan de mejoras para Fase 5 (optimización/UX).
- Presentar en Steering semanal y obtener aprobación para GA.

> Este plan se actualizará después de cada fase del rollout; conservar versiones en `docs/verticals/rollout-history/`.
