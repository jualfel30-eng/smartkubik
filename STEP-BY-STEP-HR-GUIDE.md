# Guía rápida: Estructuras → Empleados → Corrida de Nómina

Esta guía cubre el flujo end-to-end para crear la estructura de nómina, asignarla a los empleados y ejecutar una corrida con trazabilidad contable.

## 1. Crear/ajustar una estructura de nómina
1. Inicia sesión y ve a **Recursos Humanos → Estructuras** (`/payroll/structures`).
2. Haz clic en **Nueva estructura** si no existe una para el rol/departamento objetivo.
3. Completa los campos principales:
   - Nombre y descripción.
   - Frecuencia (mensual, quincenal, etc.).
   - Alcance (roles, departamentos, tipo de contrato).
   - Vigencia (`effectiveFrom`/`effectiveTo`).
4. Agrega reglas desde la tabla inferior
   - **Devengos** (salario base, bonos, horas extra) mediante monto fijo, porcentaje o fórmula JSON Logic.
   - **Deducciones** e **impuestos patronales**.
   - Usa referencias (`baseConceptCodes`) para cálculos en cascada y evita loops (el builder marca reglas auto-referenciadas).
5. Ejecuta el **Simulador** con un salario base realista:
   - La tarjeta de preview debe mostrar `Neto = Devengos – Deducciones`.
   - Si aparece un warning de desbalance o neto negativo, ajusta las reglas antes de guardar/activar.
6. Guarda la estructura. Si está activa, el backend valida balance e impedirá guardados inconsistentes.

## 2. Asignar estructuras a empleados
1. Ve a **Recursos Humanos → Empleados** (`/crm?tab=employee`).
2. Filtros útiles:
   - `Estructura = Sin estructura` para localizar pendientes.
   - `Departamento` o `Rol` para lotes más acotados.
3. Selecciona uno o varios empleados → **Acciones en lote → Asignar estructura**.
4. En el diálogo:
   - Escoge la estructura; el resumen indica cuántos empleados serán impactados y cuántos se omiten (por contrato inactivo o porque ya tienen esa versión).
   - Marca “solo contratos activos” u “omitir duplicados” según el caso.
5. Confirma. El CRM refresca automáticamente el dataset y guarda auditoría (quién aplicó la estructura y a cuántos empleados).
6. Para asignaciones individuales, abre el drawer del empleado y edita el contrato → `Estructura de nómina`.

## 3. Calendario de nómina, ausencias y corridas

### 3.1 Calendario y validaciones
1. Ve a **Recursos Humanos → Calendario de nómina** (`/payroll/calendar`).
2. Genera períodos (mensual/quincenal/semanal) con el generador; se crean recordatorios automáticos antes del corte.
3. El timeline muestra alertas operativas y bitácora de validaciones (runs pendientes, turnos sin clock-out, contratos vencidos, ausencias pendientes, cobertura, días pendientes/aprobados):
   - Si alguna alerta está en rojo, el cierre/publicación se bloquea y el motivo queda registrado en la bitácora (tooltip).
4. CTAs de drill-down:
   - “Revisar runs” abre `/payroll/runs?calendarId=...`.
   - “Revisar ausencias” abre `/payroll/absences?status=pending&calendarId=...`.
   - Desde runs/ausencias hay botón de regreso al calendario.

### 3.2 Gestionar ausencias y balances
1. Ve a **Recursos Humanos → Ausencias** (`/payroll/absences`).
2. Filtra por estado o `calendarId` si vienes desde el calendario.
3. Al aprobar una ausencia:
   - Se descuentan automáticamente los días de `EmployeeLeaveBalance` (takenDays) y se limpian los pendientes.
   - El calendario refleja días pendientes/aprobados en sus alertas.
4. Si rechazas, los días pendientes se liberan; si vuelves a “pendiente”, se recargan como pendientes de aprobación.

### 3.3 Ejecutar una corrida de nómina
1. Ve a **Recursos Humanos → Nómina** (`/payroll/runs`); si llegas desde el calendario, ya vendrá filtrado por `calendarId`.
2. En el historial:
   - Filtros por frecuencia/estado y badge con el calendario asociado (CTA para abrirlo).
   - Cada fila muestra cobertura de estructuras y acceso al builder.
3. Clic en **Nueva nómina**:
   - Define fechas (`periodStart`, `periodEnd`) y una etiqueta.
   - Activa “Simulación” si solo quieres validar reglas sin posteos contables.
4. Al crear la nómina:
   - Se elige estructura por contrato (fallback por rol/departamento) y se mezclan reglas legacy cuando falte cobertura.
   - Se genera `metadata.structureSummary` para auditoría.
5. En el drawer de detalles:
   - Revisa totales, deducciones, aportes y cobertura.
   - Descarga CSV/PDF o comparte por correo.
   - Verifica el ID del asiento contable cuando el estado sea `posted`.
6. Si todo es correcto, procede al pago (Payables → Payroll) y registra dispersión desde **Cuentas por pagar** o el módulo de pagos.

## 4. Troubleshooting rápido
- **Estructura no se activa:** revisa el simulador; debe balancear neto y no producir neto negativo.
- **Empleado omitido:** visible en el modal de asignación (contrato inactivo o ya asignado). Activa el contrato o elimina la condición.
- **Nómina con cobertura < 100 %:** en el historial la columna muestra cuántos empleados usaron reglas legacy; usa esa lista para crear nuevas estructuras o ampliar el alcance existente.
- **Asiento contable no aparece:** la corrida debe estar en estado `posted`. Si falla, revisa `Logs` en el drawer y corrige cuentas en conceptos sin cuenta contable.
- **Cierre bloqueado en calendario:** abre la bitácora (tooltip) y revisa runs pendientes, turnos sin clock-out, contratos vencidos, ausencias pendientes o cobertura <100 %. Sigue los CTAs para resolver y reintenta.

## 5. Release notes sugeridas
- Builder: simulador con balance rule obligatoria antes de activar estructuras.
- CRM: asignaciones masivas con filtros y resumen de impacto.
- Nómina: dashboard muestra cobertura por estructura y links de drill-down.
- Backend: `metadata.structureSummary` + unidad de pruebas del motor.
