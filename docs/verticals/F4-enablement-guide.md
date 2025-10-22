# Fase 4 · Enablement y Documentación Retail
## Food Inventory SaaS · Octubre 2025

> **Objetivo**: Preparar manuales operativos, guías rápidas y materiales de lanzamiento para tenants retail multi-vertical sin romper la experiencia existente en alimentación.
>
> **Estado**: 🛠️ En progreso (Fase 4)

---

## 1. Audiencias y Mensajes Clave

| Audiencia | Necesidades | Mensaje principal | Material propuesto |
|-----------|-------------|-------------------|--------------------|
| **Soporte Nivel 1** | Resolver tickets sobre atributos y configuraciones | “Los formularios cambian según el vertical; valida `tenant.verticalProfile.key` antes de diagnosticar.” | Playbook de troubleshooting + árbol de decisiones |
| **Store Managers** | Configurar catálogo e inventario según su vertical | “Selecciona el perfil correcto y usa plantillas de importación con columnas `productAttr_` y `variantAttr_`.” | Guía paso a paso + video corto |
| **Equipo Comercial** | Explicar beneficios a prospectos | “Un solo SaaS soporta moda, calzado, ferretería y tecnología con UI adaptativa.” | Slides comparativas + demo script |
| **Producto/QA Interno** | Validar regresiones y features futuras | “Usar perfiles preconfigurados para reproducir escenarios.” | QA plan (documento separado) |

---

## 2. Manuales y Guías

### 2.1 Manual Operativo por Vertical
- **Formato**: Markdown + PDF exportado.
- **Ubicación**: `docs/verticals/manuales/<vertical>.md`.
- **Contenido mínimo**:
  1. Resumen del vertical (atributos, particularidades).
  2. Configuración inicial (selector de vertical, overrides).
  3. Gestión de productos (campos obligatorios, plantillas import/export).
  4. Inventario (matriz, seriales, alerts).
  5. Órdenes (flujo de creación, filtros por atributos).
  6. Dashboard & reportes (interpretación de gráficas/atributos).
  7. Preguntas frecuentes y errores comunes.

> **Responsable**: Equipo Producto. ETA: 3 días por vertical (puede trabajar en paralelo).

### 2.2 Guías Rápidas (1 página)
- **Formato**: Notion / PDF con bullets e iconografía.
- **Enfoque**: “Primeros 15 minutos” → elegir vertical, importar catálogo, validar dashboards.
- **Distribución**: Enviar a clientes piloto + publicar en Zendesk/Help Center.

### 2.3 FAQ Global
- Centralizar preguntas frecuentes en `docs/verticals/faq-retail.md` con secciones:
  - Configuración (¿puedo cambiar de vertical? impacta en datos).
  - Importaciones (errores comunes con atributos).
  - Dashboards (por qué no se ve columna X).
  - IA (cómo habilitar prompts específicos).
- Vincular a respuestas rápidas para soporte.

---

## 3. Trainings y Demos

| Sesión | Objetivo | Formato | Duración | Responsable | Material |
|--------|----------|---------|----------|-------------|----------|
| Kickoff interno | Alineación de equipos (soporte, ventas, producto) | Live demo + Q&A | 60 min | PM Retail | Demo script + slides |
| Capacitación Store Managers | Enseñar flujo completo (productos → órdenes → dashboard) | Webinar interactivo | 90 min | Customer Success | Manual + práctica en sandbox |
| Taller IA & Analytics | Mostrar consultas por atributo y lectura de reportes | Workshop hands-on | 45 min | Data Analyst | Prompt book + dataset demo |

**Seguimiento**: registrar asistentes, preguntas, tareas pendientes en CRM (`training_notes`).

---

## 4. Playbook de Soporte

1. **Identificar vertical activo**: revisar `tenant.verticalProfile.key` en Admin → Configuración.
2. **Confirmar feature flags**: `ENABLE_VERTICAL_PROFILES`, `DASHBOARD_CHARTS`, `ENABLE_ASSISTANT_VERTICALS`.
3. **Diagnóstico rápido por módulo**:
   - Productos: validar columnas en plantilla y atributos requeridos.
   - Inventario: revisar combinaciones y estado de alertas.
   - Órdenes: revisar filtros `itemAttributeKey/Value` y export CSV.
   - Dashboard: revisar `analytics/*` responses en network tab.
4. **Escalamiento**:
   - Tier 2 si: datos inconsistentes, seriales duplicados, IA sin acceso a atributos.
   - Tier 3 (Ingeniería) si: errores 500, fallos de persistencia, dashboards vacíos.
5. **Checklist de cierre**:
   - Incluir captura, payload, tenant ID, vertical.
   - Documentar fix o workaround en Zendesk macro.

---

## 5. Comunicaciones y Recursos

- **Changelog**: Añadir sección “Retail multi-vertical” en `RELEASE-NOTES-v2.0.0-SECURITY.md` (actualizar archivo).
- **Anuncio interno**: Post en Notion + Slack `#general` con:
  - Resumen de features.
  - Enlace a manuales y QA plan.
  - Calendario de trainings.
- **Anuncio externo**:
  - Email marketing segmentado (prospectos retail).
  - Blog post “Un solo SaaS para moda, ferretería y tecnología” (Marketing).

---

## 6. To-Do y Responsables

| Tarea | Due | Owner | Estado |
|-------|-----|-------|--------|
| Crear manual `manuales/retail-fashion.md` | 22-oct | PM Retail | ⏳ |
| Crear manual `manuales/retail-footwear.md` | 24-oct | PM Retail | ⏳ |
| Crear manual `manuales/retail-hardware.md` | 26-oct | Producto | ⏳ |
| Crear manual `manuales/retail-tech.md` | 28-oct | Producto | ⏳ |
| Generar guía rápida PDF (por vertical) | 29-oct | Customer Success | ⏳ |
| Publicar FAQ en Help Center | 30-oct | Soporte L1 | ⏳ |
| Actualizar release notes | 21-oct | PM Retail | ⏳ |
| Preparar campañas marketing | 31-oct | Marketing | ⏳ |

> Seguimiento semanal en reunión Retail Ops. Actualizar estados en Notion board `Retail Enablement`.

---

## 7. Riesgos y Mitigaciones

- **Sobrecarga de información para clientes** → Mitigar escalonando entregas (manual completo + guía rápida).
- **Soporte sin contexto** → Mitigar con playbook y training obligatorio.
- **Cambios futuros de verticales** → Documentar proceso de rollback y acompañamiento (ver plan de rollout).

---

## 8. Checklist para cerrar Enablement

1. Manuales revisados y aprobados por Producto y Soporte.
2. FAQ publicada y enlazada desde el dashboard admin.
3. Trainings impartidos con feedback registrado.
4. Comunicaciones (internas/externas) enviadas y archivadas.
5. Indicadores de preparación (Nº personas formadas, satisfacción, incidencias) listos para informe final.

> Este documento se considera completo cuando todos los ítems del checklist estén marcados como ✅ y quede registrada evidencia en el informe de entrega de Fase 4.
