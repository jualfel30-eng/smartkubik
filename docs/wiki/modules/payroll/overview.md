# RRHH y Nómina (Módulos Agrupados)

## ¿Qué es?

El grupo de módulos de RRHH/Nómina gestiona todo el ciclo de pago a empleados: perfiles y contratos laborales, estructuras de nómina (conceptos de devengos/deducciones/aportes), ejecución de corridas de nómina, comisiones por ventas, metas y bonos, propinas, turnos (clock in/out), calendario de nómina, ausencias, y reportes.

## Módulos Incluidos (9)

| Módulo | Endpoints | Función Principal |
|---|---|---|
| **Payroll Runs** | 20+ | Corridas de nómina: crear, calcular, aprobar, postear, pagar. Incluye runs especiales (aguinaldo, liquidación) |
| **Payroll Employees** | 15+ | Perfiles de empleados, contratos, documentos (carta laboral, constancia de ingreso) |
| **Payroll Structures** | 12 | Plantillas de nómina: qué conceptos aplican a cada tipo de empleado |
| **Payroll Calendar** | 6 | Calendarios de pago (mensual, quincenal, custom) |
| **Payroll Absences** | 3 | Solicitudes de ausencia (vacaciones, permisos, enfermedad) |
| **Commissions** | 30+ | Planes de comisión, cálculo por orden, aprobación, reportes |
| **Goals + Bonuses** | 25+ | Metas de ventas, tracking de progreso, bonos manuales y por logro |
| **Tips** | 10 | Distribución de propinas (equitativo, por horas, por ventas), integración con nómina |
| **Shifts** | 6 | Clock in/out, programación de turnos, roster |

## Lifecycle de una Corrida de Nómina

```
Draft → Calculating → Calculated → Approved → Posted → Paid
```

| Paso | Qué pasa |
|---|---|
| **Crear** | Selecciona período y empleados |
| **Calcular** | Carga estructuras, aplica reglas, suma tips+comisiones+bonos |
| **Aprobar** | Manager revisa y aprueba |
| **Postear** | Genera asientos contables |
| **Pagar** | Crea pagos en CxP, marca comisiones/bonos como pagados, genera archivo bancario |

## Sistema de Estructuras

Las estructuras definen QUÉ se le paga a cada empleado:
- **Conceptos**: Devengos (salario base, horas extra, bonos), Deducciones (IVSS, paro forzoso, ISLR), Aportes patronales (IVSS patronal, FAOV, INCE)
- **Reglas**: Condiciones para aplicar conceptos (ej: "solo si salary > $500", "solo para departamento X")
- **Matching automático**: Al crear una corrida, el sistema asigna la estructura correcta a cada empleado según su contrato/departamento/rol

## Comisiones y Metas

- **Planes de comisión**: Fijo, porcentaje de venta, escalonado (tiers)
- **Cálculo automático**: Se calcula al confirmar cada orden
- **Workflow**: Calculada → Pendiente → Aprobada → Pagada (en nómina)
- **Metas de ventas**: Se definen períodos con montos objetivo; el progreso se trackea automáticamente
- **Bonos**: Manuales (manager crea) o por logro de meta (automático)

## Propinas

- **Distribución configurable**: Equitativo, por horas trabajadas, por ventas, porcentaje fijo, monto fijo
- **Se registran en cada orden** (desde el POS)
- **Se exportan a nómina** como concepto de devengo
- **Cálculo de impuestos**: Retención sobre propinas separada

## Turnos

- **Clock in/out**: El empleado marca entrada y salida
- **Programación**: Manager crea turnos en borrador → los publica
- **Roster**: Vista calendario de turnos programados vs. trabajados
- **Integración**: Tips se distribuyen basado en horas del turno

## Permisos
- `payroll_employees_read`, `payroll_employees_write`
- `commissions_read`, `commissions_write`
- `tips_read`, `tips_write`
- `goals_read`, `goals_write`
- `bonuses_read`, `bonuses_write`

## Feature Flag
- Módulo `payroll` debe estar habilitado
- Módulos `commissions`, `tips` habilitables independientemente

---

*Última actualización: 2026-04-28*
*Archivos: `modules/payroll/`, `modules/payroll-employees/`, `modules/payroll-calendar/`, `modules/payroll-structures/`, `modules/payroll-localizations/`, `modules/payroll-reports/`, `modules/payroll-webhooks/`, `modules/commissions/`, `modules/tips/`, `modules/shifts/`*
