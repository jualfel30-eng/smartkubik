# Domain 7: HR & Payroll (Recursos Humanos y Nómina)

## 📌 Visión General
Este dominio está diseñado para gestionar el ciclo de vida del empleado (Hire to Retire), su asistencia (Control de Turnos), y el cálculo automatizado de sus compensaciones (Nómina) incluyendo deducciones, bonos y leyes sociales.

## 🗄️ Data Layer (Esquemas de Base de Datos)
La arquitectura de datos refleja un motor de nómina flexible y parametrizable:

- **`EmployeeProfile`** (`employee-profile.schema.ts`): Ficha central del trabajador. Guarda datos de onboarding, fechas de contratación/terminación, manager asignado, y sorprendentemente asocia al empleado con un `Customer` (`customerId: Types.ObjectId`). Esto sugiere que los empleados también pueden comprar en el Storefront o ser tratados como entes B2B.
- **`EmployeeContract`** (`employee-contract.schema.ts`): Modela las condiciones laborales en el tiempo. Define si el pago es `hourly`, `salary` o `daily`, métodos de pago (cuenta bancaria) y guarda un histórico auditable de los cargos/aumentos (`status: active/expired/terminated`).
- **`Shift`** (`shift.schema.ts`): Sistema de control de asistencia. Registra `clockIn` y `clockOut`, calculando duraciones de turnos asíncronamente vía Mongoose Hooks (`pre('save')`). Diferencia entre turnos `scheduled` vs `adhoc`.
- **`PayrollRule`** (`payroll-rule.schema.ts`): Las fórmulas matemáticas de la nómina. Soporta cálculos condicionales por `fixed`, `percentage` o `formula` (ej. Bono nocturno = salario base * 30%). Se asocia a Estructuras de Nómina (`PayrollStructure`).
- **`PayrollRun`** (`payroll-run.schema.ts`): Generación quincenal o mensual del pago. Acumula todos los `earnings`, `deductions`, `employerCosts` calculando el Sueldo Bruto (`grossPay`) y Neto (`netPay`) de todos los empleados en un periodo de tiempo.

## ⚙️ Backend (API Layer)
Al revisar la estructura de directorios, surge un descubrimiento arquitectónico significativo:

- **Módulos Ausentes/Incompletos**:
  - No existe un directorio `/modules/hr/`.
  - El directorio `/modules/payroll/` existe, pero solo contiene `payroll-bootstrap.service.ts` (`5KB`) y el módulo principal.
  - No hay controladores visibles (`employees.controller`, `shifts.controller`, `payroll-run.controller`) en el escaneo estándar. O están alojados en carpetas atípicas, o el backend de HR/Payroll son "Phantom Schemas" construidos en previsión pero cuya lógica de negocio (CRUD) aún no está completada/expuesta al frontend admin.
  - El `payroll-bootstrap.service.ts` luce como un *seeder* que inyecta las reglas base (ej: IVSS, FAOV) cuando un Tenant se registra.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Phantom Domain (Dominio Fantasma)**: A diferencia de Ventas (Dominio 3) o Marketing (Dominio 4) gigantescos, HR & Payroll tiene una base de datos muy madura pero aparentemente carece de la API operativa que genere y simule las nóminas (`PayrollRun`) o permita a un empleado marcar su `Shift` (Reloj Biométrico/App).
2. **Duplicación de Identidad**: Un Empleado tiene un `customerId`, opcionalmente un `userId`, pero es a su vez un `EmployeeProfile`. Esto es normal en ERPs monolíticos, pero requiere un cuidado extremo al actualizar emails o teléfonos para no desincronizar el perfil del Storefront (`Customer`) con el del Trabajador (`EmployeeProfile`).
3. **Cálculo de Nómina Desconectado de `Payable`**: Idealmente, cuando un `PayrollRun` cambia a status `"approved"`, debería generar un `Payable` en el Dominio 6 (Invoicing & Accounting) tipo `"payroll"` para que tesorería lo pague. Dado que la API no se aprecia, esta integración contable crucial es riesgosa asumiendo que el código completo existe en algún helper externo.

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- Realizar un escaneo superficial global (`grep`) para ubicar dónde se están controlando los `EmployeeProfile` y `Shift`. Si la lógica no existe, este módulo debería marcarse como "En Construcción/Beta" en la documentación del usuario.
- Aislar el motor de cálculo matemático de los `PayrollRule` (que procesa strings "formulas") en un SandBox seguro si planea ejecutar código dinámico pre-guardado por el usuario.
