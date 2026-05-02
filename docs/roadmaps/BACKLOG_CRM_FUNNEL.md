# BACKLOG TÉCNICO – CRM + Embudo de ventas

## Epics
1) Datos y esquemas
2) Dedupe y merge
3) SLA y alertas
4) Migraciones iniciales
5) Configuración y flags

---

## 1) Datos y esquemas
- Ticket: Crear schema `StageHistory` con `opportunityId`, `fromStage`, `toStage`, `changedAt`, `changedBy`, `probability`, `valueWeighted`. Agregar índice por `opportunityId` y `changedAt`.
- Ticket: Añadir constraints por etapa (nuevo negocio/expansión) para campos obligatorios definidos en `ROADMAP_CRM_FUNNEL.md` (Calificado, Demo, Propuesta, Negociación, Perdido).
- Ticket: Añadir campos `nextStep` (string) y `nextStepDue` (date) a Oportunidad; validar `nextStepDue` ≤14 días desde `now()` al guardar.
- Ticket: Crear catálogo `reasonLost` y relacionarlo a Oportunidad; exigir nota cuando `reasonLost = Otros`.
- Ticket: Definir modelos de Territorio/Equipo/Cola y relación con Contacto/Oportunidad; flag `strategicAccount` en Cuenta para compartir.

## 2) Dedupe y merge
- Ticket: Normalización email (lower/trim) y teléfono (E.164) al crear/actualizar Contacto.
- Ticket: Endpoint/UI para sugerir duplicados (match exacto email o phone; sospecha dominio+nombre+país).
- Ticket: Flujo de merge con aprobación RevOps y auditoría (qué campos se conservan, quién ejecuta, timestamp).

## 3) SLA y alertas
- Ticket: Job/trigger de aging por etapa (alertas 7/14/21 días sin cambio); escalar al manager al día 21.
- Ticket: Alerta `nextStepDue` 48h antes de vencer y cuando vencido.
- Ticket: SLA MQL: medir timestamp de MQL y de primer contacto; alertar si >24h.
- Ticket: Auto-enviar a cola de territorio si Contacto/Oportunidad sin owner >4h; aceptación/rechazo SQL con razón obligatoria.

## 4) Migraciones iniciales
- Ticket: Normalizar emails/phones existentes (lower/E.164).
- Ticket: Backfill territorios/owners; crear colas y asignar leads sin owner.
- Ticket: Poblar `reasonLost` donde falte (mapear a catálogo; resto “Otros” + nota).
- Ticket: Cargar probabilidades base de etapas y flag de embudos múltiples.

## 5) Configuración y flags
- Ticket: Probabilidades editables por admin; catálogo `reasonLost` editable (auditable).
- Ticket: Alertas aging/SLA configurables por territorio/equipo.
- Ticket: Feature flag embudos múltiples y flag `strategicAccount` para sharing.
