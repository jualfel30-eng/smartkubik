# Payroll Absences API

## Listar solicitudes
`GET /api/v1/payroll/absences/requests`

Parámetros opcionales: `status`, `employeeId`, `from`, `to`.
Requiere permiso `payroll_employees_read`.

## Crear solicitud
`POST /api/v1/payroll/absences/requests`

```json
{
  "employeeId": "64f...",
  "employeeName": "Juan Pérez",
  "leaveType": "vacation",
  "startDate": "2025-01-10",
  "endDate": "2025-01-15",
  "reason": "Vacaciones anuales"
}
```

Requiere `payroll_employees_write`. El backend calcula `totalDays` si no se envía y crea un balance si no existe.

## Aprobar / Rechazar
`PATCH /api/v1/payroll/absences/requests/:id/status`

```json
{
  "status": "approved"
}
```

O para rechazar:

```json
{
  "status": "rejected",
  "rejectionReason": "Documentación incompleta"
}
```

Al aprobar, los días se restan del `EmployeeLeaveBalance` y se limpian los pendientes. Estos datos se reflejan en las banderas del calendario de nómina.
