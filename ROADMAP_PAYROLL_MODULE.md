# ROADMAP – Módulo de Nómina (Payroll) integrado con Contabilidad y Pagos

## 1. Estado actual del sistema

### 1.1 Plataforma multi-tenant, gating y UX
- El front mantiene sesión, tenant y módulos habilitados en `AuthContext`, lo que permite condicionar rutas/componentes según `enabledModules` y membresías activas (`food-inventory-admin/src/hooks/use-auth.jsx:10` y `food-inventory-admin/src/hooks/useModuleAccess.js:20`).  
- Las llamadas REST ya encapsulan token + tenant context mediante `fetchApi`, por lo que cualquier endpoint nuevo heredará autenticación y prevención de caché (`food-inventory-admin/src/lib/api.js:1`).  
- El layout principal filtra navegación según permisos/módulos, permitiendo insertar un menú de “Nómina” condicionado por `tenant.enabledModules.payroll` sin romper la experiencia existente (`food-inventory-admin/src/App.jsx:1` en adelante).

### 1.2 Cadena financiera vigente
- El flujo Compras → Payables → Pagos → Bancos → Libro diario está documentado y automatizado (documento `DOC-FLUJO-PAGOS-COMPRAS-CONTABILIDAD-CUENTAS-BANCARIAS.md:1`).  
- `PayablesService` ya soporta `type = "payroll"` y `payeeType = "employee"`, genera asientos GL y eventos de calendario al crear la obligación (`food-inventory-saas/src/modules/payables/payables.service.ts:46`).  
- `PaymentsService` reutiliza los mismos documentos de pago para ventas o cuentas por pagar, actualiza saldos bancarios y dispara movimientos de conciliación (`food-inventory-saas/src/modules/payments/payments.service.ts:30`).  
- `AccountingService` produce asientos automáticos para ventas, compras, payables y pagos, reutilizando cuentas sistemáticas (1101, 2101, etc.) (`food-inventory-saas/src/modules/accounting/accounting.service.ts:239`, `498`, `577`, `1070`).  
- Las cuentas bancarias guardan métodos aceptados, moneda y alertas, lo que facilita generar archivos de dispersión o pagos masivos (`food-inventory-saas/src/schemas/bank-account.schema.ts:8`).

### 1.3 Objetos reutilizables para nómina
- Los colaboradores se registran como `Customer` con `customerType = "employee"` al ser invitados al tenant (`food-inventory-saas/src/tenant.service.ts:295` y `food-inventory-saas/src/schemas/customer.schema.ts:156`).  
- Los `Payable` contemplan `type: "payroll"` y líneas con `accountId` obligatorio, permitiendo mapear devengos/deducciones a cuentas GL específicas (`food-inventory-saas/src/schemas/payable.schema.ts:45`).  
- `RecurringPayable` ya maneja plantillas frecuentes (mensual/trimestral/anual) con `type = "payroll"`, útil para programar ciclos de nómina (`food-inventory-saas/src/schemas/recurring-payable.schema.ts:8`).  
- En UI, `PayablesManagement` ya expone la opción “Nómina” y el `PaymentDialogV2` entiende métodos múltiples, IGTF y selección de cuentas bancarias (`food-inventory-admin/src/components/PayablesManagement.jsx:484` y `food-inventory-admin/src/components/orders/v2/PaymentDialogV2.jsx:13`).

### 1.4 Limitaciones y patrones a respetar
- `tenantId` vive como `string` en la mayoría de esquemas, pero los servicios convierten condicionalmente a `ObjectId`; cualquier nuevo modelo debe replicar ese patrón para evitar los bugs históricos de `string arrays vs objectId` (`food-inventory-saas/src/modules/payables/payables.service.ts:176`).  
- Todos los DTO usan `class-validator`/`class-transformer`; agregar campos sin DTO coherente genera errores de validación silenciosos.  
- Las automatizaciones financieras dependen de `AccountingService` (códigos fijos 1101/2101/4101, etc.); el plan debe contemplar nuevas cuentas sistemáticas (sueldos, prestaciones, impuestos) y migraciones de datos si faltan.  
- El flujo actual no guarda contratos, tipos de jornada, acumulados de vacaciones ni motor de reglas, por lo que hay un gap funcional frente al benchmark SAP/Oracle/Odoo.

## 2. Objetivos funcionales (resumen del informe)
1. Soportar múltiples tipos de contratación y frecuencia de pago (mensual, quincenal, semanal).  
2. Motor de reglas configurable para conceptos (salario base, horas extra, bonos, aguinaldos, deducciones).  
3. Gestión automática de impuestos/aportes y actualización ante cambios legales.  
4. Integración con vacaciones, ausencias, liquidaciones y aguinaldos fuera de la nómina regular.  
5. Liquidaciones/finiquitos parametrizables por jurisdicción.  
6. Integración contable automática (mapeo concepto ↔ cuenta) y con tesorería para dispersión y conciliación.  
7. Arquitectura adaptable por país (núcleo + localizaciones).  
8. UX de nivel ERP líder, minimizando retrabajos mediante investigación previa.

## 2.1 Semáforo de fases (estado vivo)
| Fase | Estado | Último entregable | Próximo foco |
| --- | --- | --- | --- |
| Fase 0 – Descubrimiento | ✅ Cerrada | Bootstrap de cuentas y settings base. | Sin pendientes. |
| Fase 1 – Maestro de empleados | ✅ Cerrada | CRM + contratos + dashboards. | Sin pendientes. |
| Fase 2 – Motor de estructuras | ✅ Cerrada | Builder + integración runs/contabilidad. | Sin pendientes. |
| Fase 3 – Calendarios/Ausencias | 🟡 En progreso | Calendario + ausencias + recordatorios/notifs + drill-down parcial. | Consolidar drill-down total y validaciones avanzadas de horas. |
| Fase 4 – Procesamiento de nómina | ⚪ No iniciado | N/A | Arrancar una vez terminada F3. |
| Fase 5 – Pagos/Dispersión | ⚪ No iniciado | N/A | Depende de F4. |
| Fase 6 – Integración contable avanzada | ⚪ No iniciado | N/A | Después de F5. |
| Fase 7 – Liquidaciones/localización | ⚪ No iniciado | N/A | Post F6. |
| Fase 8 – UX/Reporting | ⚪ Continuo | N/A | Se alimenta con entregables previos. |

## 3. Lineamientos de diseño
- **Reutilizar antes de crear:** contratos y pagos deben terminar en `Payable`/`Payment` para aprovechar asientos y conciliaciones ya implementadas.  
- **Motor declarativo:** representar reglas en colecciones (`payrollStructures`, `payrollRules`) en lugar de código hardcodeado, permitiendo actualizar tasas sin despliegues.  
- **Convergencia con Contabilidad:** cada concepto necesita `accountId` y `nature` (debit/credit) para generar asientos balanceados (aprendido de `createJournalEntryForPayable` y `createJournalEntryForPayablePayment`).  
- **Localización desacoplada:** seguir el patrón `TenantSettings` + overrides por país y feature flags, evitando forks de código.  
- **Compatibilidad UI:** un `PayrollManagement` debe usar dialogs/tablas ya conocidos (Cards, Tabs, DataTables) y contexts (AccountingContext para refresh).  
- **Evitar bug histórico:** siempre normalizar IDs a string antes de guardarlos y al exponerse al frontend, igual que hace `PayablesService`/`PaymentsService`.  
- **Observabilidad:** loggear cada paso crítico (como hoy se hace en `PaymentsService`) para depurar cálculos complejos.

## 4. Hoja de ruta propuesta

### Fase 0 – Descubrimiento y cimientos (1 sprint) ✅ Completado
1. Inventario de cuentas GL existentes + creación de cuentas sistémicas mínimas: Sueldos por pagar, Prestaciones, IVSS, Paro forzoso, Caja de Ahorro, etc. (`accounting.service.ts:239`). *(Listo: blueprint en `src/config/payroll-system-accounts.config.ts` + seeding/script `db:bootstrap:payroll` para todos los tenants).*  
2. Extender `tenant.enabledModules` con flags `payroll`, `hr_core`, `time_and_attendance`. *(Listo en schema/DTOs + defaults por vertical, habilitado para todos los tenants vía script + `PayrollBootstrapService` que auto-verifica en runtime).*  
3. Diseñar `PayrollSettings` en `TenantSettings` (moneda base, frecuencia default, política de aguinaldo, tasas activas). *(Listo: nuevos campos en `TenantSettings` y API de settings).*  
4. Documentar mapeo actual de `Payable.type = payroll` para no romper flujos existentes; crear migraciones si hay datos legacy. *(Listo: script Phase0 asegura cuentas/módulos sin tocar datos de payables existentes).*  

### Fase 1 – Maestro de empleados y contratos (2 sprints) ✅ Cerrada
1. **Modelado + API** – Nuevos esquemas `EmployeeProfile` y `EmployeeContract`, módulo `PayrollEmployees`, permisos dedicados y sincronización automática desde invitaciones. *(✅ Completado: servicios expuestos y hooks automáticos endurecidos con validaciones/reporting adicional.)*  
2. **Integración CRM & métricas** – Tab “Empleados” en `CRMManagement`, filtros por estado/departamento, dashboard resumen y tabla paginada conectada a la nueva API. *(✅ Completado: métricas, filtros y acciones abren drawer contextual.)*  
3. **Perfiles y contratos detallados** – Formularios dedicados, contratos múltiples, datos bancarios/documentos y workflows masivos con sincronización CRM. *(✅ Completado con validaciones avanzadas y reporting de contratos.)*  
4. **Ejecuciones de nómina (UI)** – Dashboard `PayrollRuns` con KPIs, tabla, simulador, exportes CSV/PDF y bitácora de auditoría. *(✅ Completado en frontend, integrado al motor.)*  

### Detalle Fase 1 (estado actual)
**Backend – Completado ✅**
- `EmployeeProfile` + `EmployeeContract` + `PayrollEmployeesModule` con permisos dedicados y auditoría básica.
- Hooks automáticos en `TenantService` para crear perfiles al invitar usuarios y APIs de resumen/listado.

**Frontend – Completado ✅**
- Vista CRM con tab “Empleados”, filtros, resumen y tabla *(listo)*.
- Drawer de detalle con acciones (suspender, terminar, re-invitar), formularios completos de perfil, contratos múltiples, documentos/bancos y sincronización automática con contactos *(nuevo ✅)*.
- Workflow masivo (selección múltiple y re-invitaciones desde CRM) *(nuevo ✅)*.
- Optimización de sincronización CRM ↔ Employees: `CrmContext` evita POST redundantes y recargas masivas al editar contactos, mejora de desempeño confirmada *(✅ Completado)*.
- Validaciones avanzadas por rol (perfil) y reglas condicionales en contratos, con alertas visuales en el drawer *(nuevo ✅)*.
- Reporting dedicado de contratos: métricas en `employeeSummary`, tableros KPI y tabla de vencimientos desde CRM *(nuevo ✅)*.
- Limpieza automática de perfiles duplicados con endpoint de reconciliación y botón en CRM *(nuevo ✅)*.
- Workflows masivos: menú de acciones (reinvitar, suspender/reactivar, notificar plantillas) con nuevo endpoint de batch notifications *(nuevo ✅)*.
- Motor de reglas y asientos para payroll runs: esquema `PayrollConcept`, servicio `PayrollRunsService` y auditoría automática (`payroll-audit-log`) + exportes CSV/PDF desde `POST/GET /payroll/runs` *(nuevo ✅ backend)*.
- Dashboard de ejecuciones de nómina en UI: KPIs, filtros, tabla paginada, creación/Simulación en tiempo real y botones de descarga *(nuevo ✅ frontend)*.
- Auditoría/exportaciones en UI: drawer con bitácora, descargas CSV/PDF con `fetchApi`, compartir vía email y surface del `metadata.journalEntryId` *(nuevo ✅ frontend)*.
- **Pendiente inmediato (fase 2 kickoff):**  
  1. Preparar constructor visual de estructuras/reglas (`PayrollStructure` + `PayrollRule`) según plan de Fase 2.  
  2. Definir KPIs avanzados (costos por departamento, forecasts) y QA e2e previo al arranque de Fase 2.  

### Fase 2 – Motor de estructuras y conceptos (2-3 sprints)
**Progreso actual (Sprint 1)**
- Backend base listo: esquemas `PayrollStructure` y `PayrollRule`, módulo `PayrollStructuresModule` con CRUD completo, vista previa declarativa (`json-logic-js`) y endpoints `/payroll/structures/*` protegidos por permisos.  
- Frontend base listo: `PayrollStructuresManager` lista estructuras, permite crear reglas con simulador en tiempo real y agrega navegación dedicada en Nómina.  
- Integración CRM/contratos: Drawer de empleados permite asignar estructura al contrato y CRM tiene acción masiva para aplicar/remover estructuras.  
- Validaciones iniciales: backend y builder controlan vigencias `effectiveFrom/effectiveTo` y alertan desequilibrios (neto ≠ devengos–deducciones o neto negativo).  

**Backlog detallado (pendiente)**

1. **Modelo y versionado**
   - [x] Versionado en esquema (`version`, `supersedesId`, `activatedAt/deactivatedAt`) + endpoints para duplicar/activar versiones.
   - [x] Migración/seed para actualizar estructuras existentes y mantener histórico (`scripts/migrate-payroll-structures-scope.ts`).
   - [x] Indexes que garanticen un único rango vigente por combinación tenant+rol+departamento (campos `scopeKey` + índices parciales).
   - [x] Seeder/migración para mapear estructuras básicas por defecto (`scripts/seed-default-payroll-structures.ts` + bootstrap automático).

2. **Motor de reglas**
   - [x] Compatibilidad con fórmulas multi‑base (referencias a otros conceptos, horas, beneficios).
   - [x] Evaluación incremental (prioridad, short‑circuit, logs por regla).
   - [x] Validaciones server‑side: impedir porcentajes sin base, detectar loops entre reglas, límites por tipo.
   - [x] Auditoría específica para previsualizaciones (inputs vs outputs, usuario).

3. **API / Servicios**
   - [x] CRUD extendido con versionado (endpoint `POST /:id/version` y `PATCH /:id/activate`).
   - [x] Endpoints para catálogo de conceptos reutilizable (`GET /payroll/concepts` con filtros por tipo, cuenta contable).
   - [x] Endpoint para sugerir estructuras según filtros (rol, departamento, contrato).
   - [x] Webhooks/eventos internos al activar estructuras (actualizar contratos afectados).
   - [x] Integración total con `PayrollRunsService`:
     - [x] Elegir estructura por contrato o fallback a default por rol/departamento.
     - [x] Mezclar reglas legacy (conceptos sueltos) con estructuras si no hay cobertura del 100 %.
     - [x] Persistir metadata de cálculo (estructura utilizada, versión, resultados por regla).
   - [x] Hook con `AccountingService`: generar asientos según cuentas definidas por reglas (debit/credit).  

4. **UI Builder**
   - [x] Editor avanzado de reglas: chips por tipo, campos dependientes, preview de fórmulas (JSON logic asistido).
   - [x] Drag & drop / orden de prioridad con indicadores de ejecución.
  - [x] Gestión de versionado: duplicar, programar vigencia futura, histórico de cambios.
   - [x] Herramientas de depuración (mostrar contexto usado, resultado por regla, razones de exclusión).
   - [x] Selección de cuentas contables desde plan de cuentas + advertencias cuando faltan cuentas.
   - [x] Control de alcance: filtros por rol, departamento, tipo de contrato, tags personalizados con chips y sugerencias.

5. **Integraciones UI**
   - [x] CRM: filtros por estructura asignada, badges en tabla y exportables.
   - [x] Drawer: sugerencias automáticas de estructura según rol/departamento, tooltip con vigencia (`EmployeeDetailDrawer.jsx` + endpoint `/payroll/structures/suggestions`).
   - [x] Acciones masivas: asignación condicionada (solo contratos activos/evitar duplicados) + resumen de impacto (`CRMManagement.jsx` bulk dialog).
   - [x] Payroll runs dashboard: mostrar estructura usada en cada run, permitir drill‑down al builder (`PayrollRunsDashboard.jsx` + metadata en `payroll-runs.service.ts`).

6. **Validaciones / QA**
   - [x] Regla de balance: no permitir publicar estructura con neto ≠ devengos–deducciones (servidor y cliente).
   - [x] Tests unitarios para motor (escenarios edge, loops, formulas complejas).
   - [x] Lint y cobertura en componentes nuevos (builder + CRM updates).
   - [x] Documentar ejemplos de reglas y estructuras (manual interno). Ver `payroll-structure-examples.md`.

7. **Documentación / Comunicación**
   - [x] Guía paso a paso para crear estructura, asignarla y correr nómina (`STEP-BY-STEP-HR-GUIDE.md`).
   - [x] Actualizar release notes con cambios relevantes (builder, motor, CRM) (`RELEASE-NOTES-PAYROLL-PHASE2.md`).
   - [x] Sección de troubleshooting (errores comunes de fórmulas, cómo depurar warnings) incluida en la guía rápida.

**Estado resumido**
- Completado: puntos descritos en “Progreso actual (Sprint 1)” más el backlog 1–7 arriba (todo marcado ✅).
- Pendiente: sin items abiertos en Fase 2; se avanza a Fase 3 según el plan actualizado.

### Fase 3 – Calendarios, ausencias y provisiones (2 sprints)
**Progreso sprint actual**
- Backend enlazado: `PayrollRun` acepta `calendarId`, valida fechas y bloquea períodos cerrados/posteados. Cada run actualiza el calendario con `structureSummary`, `runStats`, `lastRun*` y banderas `complianceFlags`. Intentos de cierre/publicación revisan automáticamente si existen ejecuciones pendientes.
- Timeline de calendario operativo en UI con generación de períodos, alertas y botones para saltar a runs/ausencias.
- Ausencias: API + vista `PayrollAbsencesManager` para registrar, aprobar y ajustar balances (`EmployeeAbsenceRequest`, `EmployeeLeaveBalance`).
- Recordatorios automáticos: cron diario crea evento/tarea, alerta en timeline y email (`payroll_cutoff_reminder`) con links a runs/absences.

**Checklist operativo (actualizado)**

_Calendario & validaciones_
- [x] CRUD completo (`/payroll/calendars`) con `close/reopen` y validación de períodos abiertos (`payroll-calendar.service.ts`).
- [x] Sincronización con `PayrollRunsService` para reflejar `structureSummary`, `runStats`, `lastRun*` y `complianceFlags.pendingRuns`.
- [x] Validaciones de cierre: runs pendientes, contratos vencidos, cobertura <100 %.
- [ ] Validar horas aprobadas (Shifts) y ausencias registradas antes de permitir `close/post`; persistir bitácora de excepciones.

_Ausencias & balances_
- [x] Schemas `EmployeeAbsenceRequest`/`EmployeeLeaveBalance` + API de aprobaciones/ajustes.
- [x] UI `PayrollAbsencesManager` con filtros por estado/empleado y acciones de aprobación.
- [ ] Integrar automáticamente los días aprobados a balances y reflejar el impacto directo en el calendario (badge + tooltip con motivo).

_UI y drill-down_
- [x] Timeline con generación automática, alerts y botones para abrir runs/ausencias.
- [x] Drawer CRM sugiere estructuras y expone vigencias; Payroll dashboard muestra estructura usada en cada run.
- [ ] Drill-down completo: desde alertas/timeline/runs poder abrir registros específicos (runs, ausencias pendientes, balances) con query params (`calendarId`, `absenceId`, etc.) y CTA inverso desde dashboards.
- [ ] Actualizar `PayrollRunsDashboard` con CTA directos a calendario, resumen de ausencias y logs (depende de los enlaces anteriores).

_Recordatorios & comunicación_
- [x] Job diario crea evento/tarea (EventsService) y correo usando `NotificationsService` y plantilla `payroll_cutoff_reminder`.
- [ ] Registrar bitácora de envíos (quién recibió, cuándo) y exponerla en `metadata.reminders` para evitar duplicados/manual overrides.

_Documentación / Release notes_
- [x] Roadmap actualizado con entregables de ausencias, recordatorios y UI (este documento).
- [ ] Release notes + guías rápidas deben incluir la nueva navegación (timeline + ausencias) y recomendaciones de operación diaria.

### Fase 4 – Procesamiento de nómina (3 sprints)
**Estado**: ⚪ No iniciado (depende de completar las validaciones de Fase 3).

**Checklist planificada**

_Backend_
- [ ] Evolucionar `PayrollRun` con workflow completo (draft → calculated → approved → paid) vinculado a calendario y subconjuntos de empleados.
- [ ] Crear `PayrollLine` por colaborador con snapshot de conceptos, fórmulas, referencias contables y validaciones por tipo de concepto.
- [ ] APIs para recalcular, congelar resultados (write-once), aplicar ajustes manuales y generar PDFs/recibos listos para firma digital.
- [ ] Generar `Payable` (uno agregado o uno por empleado, según setting) inmediatamente después de aprobar la run.

_Frontend_
- [ ] Wizard paso a paso: seleccionar período/calendario, filtrar empleados, ejecutar cálculo, comparar vs período previo y aprobar.
- [ ] Comparativos visuales (neto, impuestos, horas) y alertas (tope de horas extra, vacaciones pendientes).
- [ ] Integración del wizard con el timeline de calendario y con el CRM (desde empleado → runs asociados).

_Pre-work / dependencias_
- [ ] Analizar gaps en `PayrollRunsDashboard` para soportar wizard y comparativos (ver notas de Fase 3).
- [ ] Definir trazabilidad y logs para cada recalculo (aprovechar `EventsService` + auditoría existene).

### Fase 5 – Pagos y dispersión (2 sprints)
**Estado**: ⚪ No iniciado (bloqueado hasta que existan runs aprobadas y payables generados en F4).  

_Checklist_
- [ ] Integrar `PayrollRun` aprobado con `PaymentsService` para crear `PaymentBatch` con destino bancario, monto neto y referencia de calendario.
- [ ] Generar archivos bancarios TXT/CSV parametrizables usando `bankAccount.acceptedPaymentMethods` y plantillas por banco.
- [ ] Registrar movimientos inmediatamente en `BankTransactionsService` (conciliación automática) y enlazar con `PaymentDialogV2`.
- [ ] UI “Pagar nómina”: diálogo masivo con resumen por banco/moneda, IGTF y validaciones de cuentas activas.
- [ ] Hooks de notificación: confirmar pagos a RRHH/Finanzas y opcionalmente al empleado con recibo adjunto.

### Fase 6 – Integración contable avanzada (1-2 sprints)
**Estado**: ⚪ No iniciado (depende de runs pagadas y batches en producción).

- [ ] Servicio `PayrollAccountingMapper` que convierta resultados por concepto en asientos (devengos, aportes, retenciones) usando `ChartOfAccounts`.
- [ ] API para revisar/ajustar mapeos contables por concepto y validar balance (`CreateJournalEntryDto`).
- [ ] Reportes de variación de gasto vs presupuesto, provisiones (vacaciones, aguinaldos) y alertas de diferencias contables.

### Fase 7 – Liquidaciones, aguinaldos y localización (3+ sprints)
**Estado**: ⚪ No iniciado (requiere motor de runs estable).

- [ ] `SpecialPayrollRun` para aguinaldos/bonos/liquidaciones con estructuras dedicadas.
- [ ] Motor de liquidaciones por país: cálculo de prestaciones acumuladas, indemnizaciones, etc., versionable y auditable.
- [ ] Paquetes de localización (`payroll-ve`, `payroll-mx`, …) con tablas de tasas y reglas legales activables por tenant.
- [ ] Auto-actualizaciones: carga de nuevas tasas desde UI/CSV con versionado y aprobación.

### Fase 8 – UX, reporting y automatización (continuo)
**Estado**: ⚪ Plan continuo (se alimenta de entregables previos).

- [ ] Dashboards de nómina: costo por departamento, distribución de deducciones, KPIs de ausentismo con drill-down.
- [ ] Webhooks/API externos para bancos, beneficios y sistemas fiscales.
- [ ] Auditoría extendida (EventsService + AuditLog) para todo el journey de nómina.
- [ ] Documentos descargables: recibos individuales, cartas de trabajo, constancias fiscales con plantillas multi-idioma.

## 5. Riesgos y mitigaciones
| Riesgo | Mitigación |
| --- | --- |
| Inconsistencia `ObjectId` vs `string` en `tenantId` | Reutilizar helpers que convierten condicionalmente y exponer sólo strings al frontend (`payables.service.ts:176`). |
| Sobrecarga del `AccountingService` con cuentas inexistentes | Crear migración inicial (Fase 0) y validaciones que bloqueen payroll runs sin cuentas mapeadas. |
| Cambios legales frecuentes | Motor declarativo + localizaciones versionadas para actualizar tasas sin deploy. |
| Operación manual extensa | Automatizar plantillas (`RecurringPayable`), eventos de calendario y notificaciones usando `EventsService`. |
| UX compleja | Mantener componentes consistentes (Cards, Tabs, Dialogs, SearchableSelect) y soporte multi-módulo vía `useModuleAccess`. |
| Errores en dispersión bancaria | Validar campos obligatorios (cuenta, tipo, moneda) aprovechando `bankAccount.acceptedPaymentMethods`. Registrar todo en `BankTransactionsService` para trazabilidad. |

## 6. Estrategia de pruebas y QA
1. **Unit tests** del motor de reglas (cobertura por concepto, escenarios de edge).  
2. **Contract tests** para DTOs y serialización (usar `class-validator` + pipes globales).  
3. **E2E**:  
   - Crear contrato → configurar estructura → correr nómina → generar payable → pagar → conciliar → revisar asientos.  
   - Escenarios multi-divisa (USD/VES con IGTF) reutilizando `PaymentsService`.  
4. **Performance**: payroll runs con 1k empleados deben completar en <30s; usar colas Bull si se requiere asincronía.  
5. **Security**: respetar `TenantGuard`, permisos por rol, masking de datos sensibles (salarios, cuentas bancarias).  

## 7. Próximos pasos inmediatos
1. **Kick-off técnico**: validar scope y esfuerzos por fase con stakeholders.  
2. **Diseño detallado de datos**: diagramas de nuevas colecciones + relaciones con `Customer`, `Payable`, `Payment`, `JournalEntry`.  
3. **Prototipo UX**: wireframes de `PayrollManagement` (Empleados, Contratos, Estructuras, Runs).  
4. **Actualizar plan de cuentas y settings** como parte de la Fase 0 para habilitar pruebas tempranas.  
5. **Definir métricas de éxito** (tiempo de procesamiento, exactitud de cálculos, % conciliado automáticamente).

Con esta hoja de ruta, el módulo de nómina se construye respetando el funcionamiento actual del ERP, capitalizando las automatizaciones existentes y alineándose con las mejores prácticas de los ERPs líderes, evitando retrabajos por desconocimiento del sistema y posicionándonos para competir con soluciones de clase mundial.

## Guía rápida para RRHH
(Ver `STEP-BY-STEP-HR-GUIDE.md` en la raíz para el detalle end-to-end.)

**Troubleshooting express**
- Estructura inactiva: ejecuta simulación, corrige balance/neto positivo.
- Empleados omitidos: revisar modal de asignación (contrato inactivo/duplicado).
- Cobertura <100 % en runs: usar lista de legacy para crear nuevas estructuras.
- Asiento contable faltante: estado debe ser `posted`; revisar logs y cuentas contables.

**Release notes sugeridas**
- Builder: balance rule con simulador obligatorio.
- CRM: asignaciones masivas con filtros y resumen.
- Nómina: dashboard con cobertura y drill-down.
- Backend: metadata `structureSummary` + unit tests del motor.
