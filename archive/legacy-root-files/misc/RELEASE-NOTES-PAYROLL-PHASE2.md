# Release notes – Payroll module, Fase 2

## Nuevas capacidades clave
- **Builder balanceado**: simulador obligatorio y validaciones neto = devengos – deducciones antes de activar estructuras.
- **Asignaciones masivas**: CRM muestra filtros, badges y resumen de impacto al aplicar/remover estructuras.
- **Dashboard de nómina con cobertura**: cada corrida expone `structureSummary`, links de drill-down y métricas de cobertura.
- **Calendario y recordatorios**: timeline de períodos con alertas operativas, job diario que crea evento/tarea y correo `payroll_cutoff_reminder` con enlaces directos a runs/ausencias. Bitácora de envíos y destinatarios en `metadata.reminders`.
- **Validaciones de cierre**: se bloquea close/post cuando hay runs pendientes, turnos sin cerrar, contratos vencidos o ausencias sin aprobar; se registra la bitácora de validación en `metadata.lastValidation/validationLog`.
- **Unit tests del motor**: casos edge para porcentajes encadenados y loops, protegiendo regresiones.
- **Guías operativas**: `STEP-BY-STEP-HR-GUIDE.md` y `payroll-structure-examples.md` documentan el flujo completo y ejemplos concretos.

## Cambios frontend
- `PayrollStructuresManager` incorpora simulador balance rule, deep-linking vía query y resumen de coberturas.
- `CRMManagement` agrega filtros por estructura, badges, y diálogo de asignación con condiciones (contratos activos, evitar duplicados) + export CSV.
- `PayrollRunsDashboard` muestra cobertura por estructura, drill-down al builder y breakdown detallado (conceptos, auditoría, integration cues).
- `PayrollCalendarTimeline` añade drill-down a runs/ausencias por `calendarId` y badges de recordatorios enviados/destinatarios.
- Sección de alertas en timeline con bitácora de validaciones recientes (runs/turnos/ausencias/cobertura) para depurar cierres bloqueados.

## Cambios backend
- `payroll-runs.service` guarda `metadata.structureSummary` y unit tests del motor en Jest.
- `payroll-structures.service` asegura balance antes de guardar/activar; preview audit extendida.
- `payroll-calendar.service` devuelve `complianceFlags` enriquecidos y deja trazabilidad de validaciones de cierre/post (conteos y mensajes) en `validationLog`.
- `payroll-calendar-reminder.service` normaliza IDs y persiste bitácora de envíos (destinatarios, éxitos/fallos) para evitar duplicados manuales.

## Notas de migración / soporte
- Validar que clientes legacy ejecuten al menos una simulación antes de activar estructuras.
- Para corridas anteriores a esta fase, `structureSummary` aparece vacío (no requieres migración, solo recalcular al correr nuevas nóminas).
