# Payroll Calendar API

## Listar calendarios
`GET /api/v1/payroll-calendar`
- Requiere `payroll_employees_read`
- Devuelve períodos ordenados por `payDate`.
- Cada ítem incluye `metadata.runStats`, `metadata.structureSummary`, banderas de cumplimiento (`pendingRuns`, `pendingShifts`, `pendingAbsences`, `expiredContracts`, `structureCoveragePercent`) y `metadata.reminders` (último recordatorio automático antes del corte).
- Cuando un período entra en la ventana de 5 días antes del corte, se genera un evento/tarea y se envía una alerta usando la plantilla `payroll_cutoff_reminder` a `tenant.contactInfo.email` y a los correos configurados en `tenant.settings.payroll.notificationEmails` (si existen).

## Crear
`POST /api/v1/payroll-calendar`
```json
{
  "name": "Nómina Junio",
  "frequency": "monthly",
  "periodStart": "2024-06-01",
  "periodEnd": "2024-06-30",
  "cutoffDate": "2024-06-25",
  "payDate": "2024-06-30",
  "structureId": "..."
}
```

## Generar períodos futuros
`POST /api/v1/payroll-calendar/generate`
```json
{
  "frequency": "monthly",
  "count": 3,
  "anchorDate": "2025-01-01",
  "cutoffOffsetDays": 5,
  "payDateOffsetDays": 0,
  "namePrefix": "Nómina automática",
  "structureId": "..."
}
```
- Si no se envía `anchorDate`, usa el siguiente día después del último período con la misma frecuencia.
- Crea períodos en estado `draft`, evitando traslapes y dejando configuradas `metadata.reminders`.

## Actualizar
`PATCH /api/v1/payroll-calendar/:id`
- Permite modificar fechas, estructura asociada o `status` (siguiendo transiciones válidas).

## Cerrar/Reabrir
- `PATCH /api/v1/payroll-calendar/:id/close`
- `PATCH /api/v1/payroll-calendar/:id/reopen`

> Estados permitidos: `draft → open → closed → posted`. Reaperturas solo desde `closed`.
> Un período solo se puede cerrar/publicar cuando todas las nóminas ligadas (`calendarId`) están en estado `posted` o `paid`, no existan turnos pendientes de cierre (`clockOut` faltante), no haya contratos activos vencidos en el rango, la última nómina tenga 100 % de cobertura por estructuras, y (en caso de recordatorios) la alerta automática ya puede haber sido emitida.

## Recordatorios automáticos
- Un job diario genera un evento/tarea en el calendario general cuando `cutoffDate` está dentro de los próximos 5 días (`type = payroll`, color naranja) y marca `metadata.reminders.cutoffReminderSent*`.
- Estos eventos se almacenan en `EventsService` y sincronizan con Todos para dar seguimiento.

## Integración con Payroll Runs
- El endpoint `POST /api/v1/payroll/runs` acepta `calendarId`. Las fechas del run deben coincidir con `periodStart/periodEnd` del calendario seleccionado.
- Cada vez que se calcula una nómina asociada, el calendario actualiza `metadata.structureSummary`, `metadata.lastRun*` y banderas como `complianceFlags.pendingRuns`.
- Usa el filtro `calendarId` en `GET /api/v1/payroll/runs` para monitorear ejecuciones por período.
