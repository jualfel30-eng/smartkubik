# ROADMAP: Módulo de Comisiones y Bonos

## Contexto del Proyecto
**ERP:** Smartkubik - Sistema multivertical
**Módulo:** Compensación Variable (Comisiones + Bonos)
**Objetivo:** Implementar sistema completo de comisiones diferenciado del sistema de propinas existente

---

## ARQUITECTURA OBJETIVO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MÓDULO DE COMPENSACIÓN VARIABLE                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │    PROPINAS      │    │   COMISIONES     │    │    BONOS      │ │
│  │   (existente)    │    │   (NUEVO)        │    │   (NUEVO)     │ │
│  └────────┬─────────┘    └────────┬─────────┘    └───────┬───────┘ │
│           └───────────────────────┼──────────────────────┘         │
│                                   ▼                                 │
│                         EARNINGS ENGINE                             │
│                                   │                                 │
├───────────────────────────────────┼─────────────────────────────────┤
│           RRHH ◄──────────────────┼──────────────────► NÓMINA      │
│                                   │                                 │
│                            CONTABILIDAD                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: SCHEMAS Y MODELOS DE DATOS
**Prioridad:** CRÍTICA
**Estimación:** Base de todo el sistema

### 1.1 Nuevos Schemas MongoDB

#### [ ] CommissionPlan (Plan de Comisiones)
```typescript
{
  tenantId: ObjectId
  name: string                    // "Plan Vendedores Senior"
  description: string
  type: "percentage" | "tiered" | "fixed" | "mixed"

  // Configuración base
  defaultPercentage: number       // 5%

  // Para comisiones escalonadas
  tiers: [{
    from: number                  // 0
    to: number                    // 10000
    percentage: number            // 3%
  }]

  // Aplicabilidad
  applicableRoles: [ObjectId]     // Roles que pueden usar este plan
  applicableProducts: [ObjectId]  // Productos específicos (opcional)
  applicableCategories: [string]  // Categorías (opcional)

  // Configuración adicional
  includeDiscounts: boolean       // ¿Calcular sobre monto con descuento?
  includeTaxes: boolean           // ¿Incluir impuestos en base?
  minOrderAmount: number          // Monto mínimo para generar comisión

  isActive: boolean
  isDefault: boolean              // Plan por defecto del tenant

  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

#### [ ] EmployeeCommissionConfig (Configuración por Empleado)
```typescript
{
  tenantId: ObjectId
  employeeId: ObjectId            // User o EmployeeProfile
  commissionPlanId: ObjectId      // Plan asignado

  // Override individual
  overridePercentage: number      // Si tiene % especial
  overrideTiers: [{...}]          // Tiers personalizados

  effectiveDate: Date             // Desde cuándo aplica
  endDate: Date                   // Hasta cuándo (null = indefinido)

  isActive: boolean

  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

#### [ ] CommissionRecord (Registro de Comisión Individual)
```typescript
{
  tenantId: ObjectId
  employeeId: ObjectId
  orderId: ObjectId

  // Datos de la orden
  orderNumber: string
  orderDate: Date
  orderAmount: number             // Monto base de la venta
  orderAmountAfterDiscount: number

  // Cálculo de comisión
  commissionPlanId: ObjectId
  commissionPercentage: number    // % aplicado
  commissionAmount: number        // Monto calculado

  // Para tiers
  tierApplied: {
    from: number
    to: number
    percentage: number
  }

  // Estado y trazabilidad
  status: "pending" | "approved" | "rejected" | "paid"

  // Integración contable
  journalEntryId: ObjectId        // Asiento generado

  // Integración nómina
  payrollRunId: ObjectId          // Nómina donde se pagó
  paidAt: Date

  // Auditoría
  approvedBy: ObjectId
  approvedAt: Date
  rejectedBy: ObjectId
  rejectedAt: Date
  rejectionReason: string

  notes: string

  createdAt: Date
  updatedAt: Date
}
```

#### [ ] SalesGoal (Meta de Ventas)
```typescript
{
  tenantId: ObjectId
  name: string                    // "Meta Mensual $10,000"
  description: string

  // Tipo de meta
  targetType: "amount" | "units" | "orders" | "margin"
  targetValue: number             // Valor objetivo

  // Período
  periodType: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"

  // Para períodos personalizados
  customPeriodStart: Date
  customPeriodEnd: Date

  // Aplicabilidad
  applicableTo: "all" | "role" | "individual" | "team"
  employeeIds: [ObjectId]         // Si es individual
  roleIds: [ObjectId]             // Si es por rol
  teamId: ObjectId                // Si es por equipo

  // Bonificación
  bonusType: "fixed" | "percentage" | "tiered"
  bonusAmount: number             // Si es fijo
  bonusPercentage: number         // Si es % sobre meta
  bonusTiers: [{                  // Si es escalonado
    achievementPercentage: number // 100%, 110%, 120%
    bonusAmount: number
  }]

  // Configuración
  isRecurring: boolean            // ¿Se repite cada período?
  isActive: boolean

  // Productos/categorías específicas (opcional)
  applicableProducts: [ObjectId]
  applicableCategories: [string]

  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

#### [ ] GoalProgress (Progreso de Meta)
```typescript
{
  tenantId: ObjectId
  goalId: ObjectId
  employeeId: ObjectId

  // Período específico
  periodStart: Date
  periodEnd: Date

  // Progreso
  currentValue: number            // Valor actual
  targetValue: number             // Valor objetivo (snapshot)
  percentageComplete: number      // % completado

  // Estado
  achieved: boolean
  achievedAt: Date

  // Bono
  bonusAwarded: boolean
  bonusAmount: number
  bonusRecordId: ObjectId

  // Detalle de contribuciones
  contributions: [{
    orderId: ObjectId
    orderNumber: string
    date: Date
    amount: number                // Contribución a la meta
  }]

  // Snapshot del goal al momento
  goalSnapshot: {
    name: string
    targetType: string
    bonusType: string
    bonusAmount: number
  }

  createdAt: Date
  updatedAt: Date
}
```

#### [ ] BonusRecord (Registro de Bono)
```typescript
{
  tenantId: ObjectId
  employeeId: ObjectId

  // Tipo de bono
  type: "goal_achievement" | "special" | "retention" | "performance" | "referral"

  // Origen
  sourceGoalId: ObjectId          // Si viene de meta
  sourceGoalProgressId: ObjectId

  // Monto
  amount: number
  description: string

  // Estado
  status: "pending" | "approved" | "rejected" | "paid"

  // Integración contable
  journalEntryId: ObjectId

  // Integración nómina
  payrollRunId: ObjectId
  paidAt: Date

  // Auditoría
  approvedBy: ObjectId
  approvedAt: Date
  rejectedBy: ObjectId
  rejectedAt: Date
  rejectionReason: string

  notes: string

  createdAt: Date
  updatedAt: Date
}
```

### 1.2 Modificaciones a Schemas Existentes

#### [ ] Order Schema - Agregar campos
```typescript
{
  // ... campos existentes ...

  // NUEVO: Comisiones
  salesPersonId: ObjectId         // Vendedor asignado (puede ser diferente a assignedWaiterId)
  commissionCalculated: boolean   // ¿Ya se calculó comisión?
  commissionRecordId: ObjectId    // Referencia al registro de comisión
}
```

#### [ ] PayrollConcept - Nuevos conceptos
```typescript
// Conceptos a crear en seed/bootstrap
{
  code: "COMMISSION",
  name: "Comisiones sobre Ventas",
  conceptType: "earning",
  debitAccountId: "5301",         // Gasto de Comisiones (ya provisionado)
  creditAccountId: "2107"         // Comisiones por Pagar (reverso)
}

{
  code: "GOAL_BONUS",
  name: "Bonos por Metas",
  conceptType: "earning",
  debitAccountId: "5302",         // Gasto de Bonos (ya provisionado)
  creditAccountId: "2108"         // Bonos por Pagar (reverso)
}
```

---

## FASE 2: CUENTAS CONTABLES
**Prioridad:** CRÍTICA
**Dependencia:** Ninguna

### 2.1 Nuevas Cuentas del Sistema

#### [ ] Crear en chart-of-accounts seed
```typescript
const COMMISSION_SYSTEM_ACCOUNTS = [
  // PASIVOS
  { code: "2107", name: "Comisiones por Pagar", type: "Pasivo", isSystemAccount: true },
  { code: "2108", name: "Bonos por Pagar", type: "Pasivo", isSystemAccount: true },
  { code: "2109", name: "Propinas por Pagar", type: "Pasivo", isSystemAccount: true },

  // GASTOS
  { code: "5301", name: "Gasto de Comisiones sobre Ventas", type: "Gasto", isSystemAccount: true },
  { code: "5302", name: "Gasto de Bonos por Metas", type: "Gasto", isSystemAccount: true },
];
```

### 2.2 Script de Migración
#### [ ] Crear script para agregar cuentas a tenants existentes

---

## FASE 3: SERVICIOS BACKEND
**Prioridad:** CRÍTICA
**Dependencia:** Fase 1, Fase 2

### 3.1 CommissionService

#### [ ] Métodos CRUD de Planes
- `createCommissionPlan(dto, tenantId)`
- `updateCommissionPlan(planId, dto, tenantId)`
- `findAllCommissionPlans(tenantId)`
- `findCommissionPlanById(planId, tenantId)`
- `deleteCommissionPlan(planId, tenantId)`
- `setDefaultPlan(planId, tenantId)`

#### [ ] Métodos de Configuración por Empleado
- `assignPlanToEmployee(employeeId, planId, dto, tenantId)`
- `updateEmployeeCommissionConfig(configId, dto, tenantId)`
- `getEmployeeCommissionConfig(employeeId, tenantId)`
- `removeEmployeeFromPlan(configId, tenantId)`

#### [ ] Métodos de Cálculo
- `calculateCommission(orderId, tenantId)` - Calcula comisión para una orden
- `calculateTieredCommission(amount, tiers)` - Helper para tiers
- `getApplicablePlan(employeeId, tenantId)` - Obtiene plan aplicable

#### [ ] Métodos de Registro
- `createCommissionRecord(data, tenantId)` - Crea registro de comisión
- `approveCommission(recordId, userId, tenantId)`
- `rejectCommission(recordId, reason, userId, tenantId)`
- `getCommissionRecords(filters, tenantId)` - Lista con filtros

#### [ ] Métodos de Reporte
- `getEmployeeCommissions(employeeId, period, tenantId)`
- `getCommissionsSummary(period, tenantId)`
- `getPendingCommissions(tenantId)`

### 3.2 GoalService

#### [ ] Métodos CRUD de Metas
- `createGoal(dto, tenantId)`
- `updateGoal(goalId, dto, tenantId)`
- `findAllGoals(tenantId, filters)`
- `findGoalById(goalId, tenantId)`
- `deleteGoal(goalId, tenantId)`
- `activateGoal(goalId, tenantId)`
- `deactivateGoal(goalId, tenantId)`

#### [ ] Métodos de Progreso
- `initializeGoalProgress(goalId, employeeId, periodStart, periodEnd, tenantId)`
- `updateGoalProgress(orderId, tenantId)` - Actualiza progreso tras venta
- `checkGoalAchievement(progressId, tenantId)` - Verifica si se alcanzó
- `getGoalProgress(goalId, employeeId, period, tenantId)`
- `getAllEmployeeGoalProgress(employeeId, period, tenantId)`

#### [ ] Métodos de Reporte
- `getGoalsDashboard(tenantId, period)` - Dashboard general
- `getEmployeeGoalsDashboard(employeeId, tenantId, period)`
- `getTeamGoalsProgress(teamId, tenantId, period)`

### 3.3 BonusService

#### [ ] Métodos de Creación
- `awardGoalBonus(goalProgressId, tenantId)` - Otorga bono por meta
- `createManualBonus(dto, tenantId)` - Bono manual/especial
- `calculateBonusAmount(goal, achievement)` - Calcula monto

#### [ ] Métodos de Estado
- `approveBonus(bonusId, userId, tenantId)`
- `rejectBonus(bonusId, reason, userId, tenantId)`
- `getPendingBonuses(tenantId)`

#### [ ] Métodos de Reporte
- `getEmployeeBonuses(employeeId, period, tenantId)`
- `getBonusesSummary(period, tenantId)`

### 3.4 Extensión de AccountingService

#### [ ] Nuevos Métodos
- `createJournalEntryForCommission(commissionRecord, tenantId)`
- `createJournalEntryForBonus(bonusRecord, tenantId)`
- `reverseCommissionPayable(commissionRecordIds, payrollRunId, tenantId)`
- `reverseBonusPayable(bonusRecordIds, payrollRunId, tenantId)`

### 3.5 Extensión de PayrollRunsService

#### [ ] Modificaciones
- `loadEmployeeCommissions(employeeIds, periodStart, periodEnd, tenantId)`
- `loadEmployeeBonuses(employeeIds, periodStart, periodEnd, tenantId)`
- Integrar en `createRun()` para incluir comisiones y bonos como earnings

### 3.6 Jobs Automáticos

#### [ ] CommissionCalculationJob
- Trigger: Después de order.completed
- Acción: Calcular comisión, crear registro, generar asiento

#### [ ] GoalProgressJob
- Trigger: CRON diario o después de order.completed
- Acción: Actualizar progreso de metas, verificar logros, otorgar bonos

---

## FASE 4: CONTROLADORES Y DTOs
**Prioridad:** ALTA
**Dependencia:** Fase 3

### 4.1 CommissionController

#### [ ] Endpoints de Planes
```
POST   /commissions/plans                 - Crear plan
GET    /commissions/plans                 - Listar planes
GET    /commissions/plans/:id             - Obtener plan
PUT    /commissions/plans/:id             - Actualizar plan
DELETE /commissions/plans/:id             - Eliminar plan
PATCH  /commissions/plans/:id/default     - Establecer como default
```

#### [ ] Endpoints de Configuración Empleado
```
POST   /commissions/employees/:id/config  - Asignar plan a empleado
GET    /commissions/employees/:id/config  - Obtener config de empleado
PUT    /commissions/employees/:id/config  - Actualizar config
DELETE /commissions/employees/:id/config  - Remover de plan
```

#### [ ] Endpoints de Registros
```
GET    /commissions/records               - Listar registros (con filtros)
GET    /commissions/records/:id           - Obtener registro
PATCH  /commissions/records/:id/approve   - Aprobar comisión
PATCH  /commissions/records/:id/reject    - Rechazar comisión
```

#### [ ] Endpoints de Reportes
```
GET    /commissions/summary               - Resumen general
GET    /commissions/employees/:id/summary - Resumen por empleado
GET    /commissions/pending               - Pendientes de aprobación
```

### 4.2 GoalController

#### [ ] Endpoints de Metas
```
POST   /goals                             - Crear meta
GET    /goals                             - Listar metas
GET    /goals/:id                         - Obtener meta
PUT    /goals/:id                         - Actualizar meta
DELETE /goals/:id                         - Eliminar meta
PATCH  /goals/:id/activate                - Activar
PATCH  /goals/:id/deactivate              - Desactivar
```

#### [ ] Endpoints de Progreso
```
GET    /goals/:id/progress                - Progreso de una meta
GET    /goals/employees/:id/progress      - Progreso de empleado en todas las metas
GET    /goals/dashboard                   - Dashboard general
```

### 4.3 BonusController

#### [ ] Endpoints
```
POST   /bonuses                           - Crear bono manual
GET    /bonuses                           - Listar bonos
GET    /bonuses/:id                       - Obtener bono
PATCH  /bonuses/:id/approve               - Aprobar
PATCH  /bonuses/:id/reject                - Rechazar
GET    /bonuses/pending                   - Pendientes
GET    /bonuses/employees/:id/summary     - Por empleado
```

### 4.4 DTOs

#### [ ] Commission DTOs
- `CreateCommissionPlanDto`
- `UpdateCommissionPlanDto`
- `AssignCommissionPlanDto`
- `CommissionRecordFilterDto`
- `ApproveCommissionDto`
- `RejectCommissionDto`

#### [ ] Goal DTOs
- `CreateGoalDto`
- `UpdateGoalDto`
- `GoalFilterDto`
- `GoalProgressFilterDto`

#### [ ] Bonus DTOs
- `CreateManualBonusDto`
- `ApproveBonusDto`
- `RejectBonusDto`
- `BonusFilterDto`

---

## FASE 5: MÓDULO Y PERMISOS
**Prioridad:** ALTA
**Dependencia:** Fase 4

### 5.1 Módulo NestJS

#### [ ] CommissionsModule
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([...]),
    AccountingModule,
    PayrollModule,
    PermissionsModule,
  ],
  controllers: [
    CommissionController,
    GoalController,
    BonusController,
  ],
  providers: [
    CommissionService,
    GoalService,
    BonusService,
    CommissionCalculationJob,
    GoalProgressJob,
  ],
  exports: [
    CommissionService,
    GoalService,
    BonusService,
  ],
})
export class CommissionsModule {}
```

### 5.2 Permisos

#### [ ] Nuevos permisos a crear
```typescript
// Comisiones
{ name: "commissions_read", description: "Ver comisiones", module: "commissions" },
{ name: "commissions_write", description: "Gestionar planes de comisiones", module: "commissions" },
{ name: "commissions_approve", description: "Aprobar/rechazar comisiones", module: "commissions" },

// Metas
{ name: "goals_read", description: "Ver metas de ventas", module: "goals" },
{ name: "goals_write", description: "Gestionar metas de ventas", module: "goals" },

// Bonos
{ name: "bonuses_read", description: "Ver bonos", module: "bonuses" },
{ name: "bonuses_write", description: "Crear bonos manuales", module: "bonuses" },
{ name: "bonuses_approve", description: "Aprobar/rechazar bonos", module: "bonuses" },
```

#### [ ] Traducciones de permisos (frontend)

---

## FASE 6: INTEGRACIÓN CON ÓRDENES
**Prioridad:** CRÍTICA
**Dependencia:** Fase 3

### 6.1 Listener de Órdenes

#### [ ] CommissionOrderListener
```typescript
@OnEvent('order.completed')
async handleOrderCompleted(event: OrderCompletedEvent) {
  // 1. Verificar si la orden tiene vendedor asignado
  // 2. Obtener plan de comisión del vendedor
  // 3. Calcular comisión
  // 4. Crear CommissionRecord
  // 5. Generar asiento contable
  // 6. Actualizar progreso de metas
}
```

### 6.2 Modificación del Flujo de Órdenes

#### [ ] En OrderService o al completar orden
- Asignar `salesPersonId` si no está asignado
- Marcar `commissionCalculated = false`

---

## FASE 7: INTEGRACIÓN CON NÓMINA
**Prioridad:** CRÍTICA
**Dependencia:** Fase 3, Fase 6

### 7.1 Modificaciones a PayrollRunsService

#### [ ] En createRun()
```typescript
// Agregar después de cargar datos del empleado
const commissions = await this.commissionService.getApprovedCommissions(
  employeeId, periodStart, periodEnd, tenantId
);
const bonuses = await this.bonusService.getApprovedBonuses(
  employeeId, periodStart, periodEnd, tenantId
);

// Agregar a earnings
earnings.push({
  conceptCode: 'COMMISSION',
  conceptName: 'Comisiones sobre Ventas',
  amount: commissions.total,
  sourceRecords: commissions.recordIds,
});

earnings.push({
  conceptCode: 'GOAL_BONUS',
  conceptName: 'Bonos por Metas',
  amount: bonuses.total,
  sourceRecords: bonuses.recordIds,
});
```

#### [ ] En payPayroll()
```typescript
// Marcar comisiones y bonos como pagados
await this.commissionService.markAsPaid(commissionRecordIds, payrollRunId, tenantId);
await this.bonusService.markAsPaid(bonusRecordIds, payrollRunId, tenantId);

// Generar asientos de reverso de pasivos
await this.accountingService.reverseCommissionPayable(...);
await this.accountingService.reverseBonusPayable(...);
```

---

## FASE 8: COMPONENTES UI (FRONTEND)
**Prioridad:** ALTA
**Dependencia:** Fase 4

### 8.1 Componentes de Comisiones

#### [ ] CommissionPlansManager.jsx
- CRUD de planes de comisión
- Configuración de tiers
- Vista previa de cálculos

#### [ ] CommissionRecordsList.jsx
- Lista de comisiones con filtros
- Acciones de aprobar/rechazar
- Exportar a Excel

#### [ ] EmployeeCommissionConfig.jsx
- Asignar plan a empleado
- Override de porcentaje
- Historial de configuraciones

### 8.2 Componentes de Metas

#### [ ] GoalsManager.jsx
- CRUD de metas
- Configuración de períodos
- Configuración de bonos

#### [ ] GoalProgressDashboard.jsx
- Vista de progreso por meta
- Gráficos de avance
- Leaderboard de vendedores

#### [ ] EmployeeGoalsWidget.jsx
- Widget para perfil de empleado
- Metas activas y progreso
- Bonos ganados

### 8.3 Componentes de Bonos

#### [ ] BonusesList.jsx
- Lista de bonos con filtros
- Aprobar/rechazar
- Crear bono manual

### 8.4 Dashboard Integrado

#### [ ] CommissionsDashboard.jsx
- Resumen de comisiones del período
- Top vendedores
- Metas vs logros
- Gráficos de tendencia

### 8.5 Integración en HR

#### [ ] Modificar EmployeeDetailDrawer.jsx
- Tab de Comisiones
- Tab de Metas y Bonos
- Historial de compensación variable

### 8.6 Navegación

#### [ ] Agregar a HRNavigation.jsx
- Link a Comisiones
- Link a Metas
- Link a Bonos

---

## FASE 9: TESTING
**Prioridad:** MEDIA
**Dependencia:** Todas las fases anteriores

### 9.1 Unit Tests

#### [ ] Commission Service Tests
- Cálculo de comisiones simples
- Cálculo de comisiones con tiers
- Asignación de planes
- Aprobación/rechazo

#### [ ] Goal Service Tests
- Creación de metas
- Actualización de progreso
- Verificación de logros
- Cálculo de bonos

#### [ ] Accounting Integration Tests
- Generación de asientos de comisión
- Generación de asientos de bono
- Reverso de pasivos

### 9.2 E2E Tests

#### [ ] Flujo completo de comisión
1. Crear plan
2. Asignar a empleado
3. Crear orden con vendedor
4. Verificar comisión calculada
5. Aprobar comisión
6. Incluir en nómina
7. Verificar asientos contables

#### [ ] Flujo completo de meta/bono
1. Crear meta
2. Crear órdenes hasta alcanzar meta
3. Verificar bono otorgado
4. Aprobar bono
5. Incluir en nómina

---

## FASE 10: MIGRACIÓN Y SEEDS
**Prioridad:** ALTA
**Dependencia:** Fase 1, Fase 2

### 10.1 Scripts de Migración

#### [ ] migrate-commission-accounts.ts
- Agregar cuentas contables a tenants existentes

#### [ ] migrate-payroll-concepts.ts
- Agregar conceptos COMMISSION y GOAL_BONUS

### 10.2 Seeds

#### [ ] seed-commission-demo.ts
- Crear plan de comisión demo
- Crear metas demo
- Crear registros de ejemplo

---

## CHECKLIST DE EJECUCIÓN

### SPRINT 1: Fundamentos (Schemas + Cuentas)
- [ ] 1.1 Schema: CommissionPlan
- [ ] 1.2 Schema: EmployeeCommissionConfig
- [ ] 1.3 Schema: CommissionRecord
- [ ] 1.4 Schema: SalesGoal
- [ ] 1.5 Schema: GoalProgress
- [ ] 1.6 Schema: BonusRecord
- [ ] 1.7 Modificar Order Schema
- [ ] 2.1 Crear cuentas contables (seed)
- [ ] 2.2 Script migración cuentas

### SPRINT 2: Servicios Core
- [ ] 3.1 CommissionService (CRUD planes)
- [ ] 3.2 CommissionService (cálculo)
- [ ] 3.3 CommissionService (registros)
- [ ] 3.4 GoalService (CRUD metas)
- [ ] 3.5 GoalService (progreso)
- [ ] 3.6 BonusService
- [ ] 3.7 Extensión AccountingService

### SPRINT 3: APIs y Permisos
- [ ] 4.1 DTOs completos
- [ ] 4.2 CommissionController
- [ ] 4.3 GoalController
- [ ] 4.4 BonusController
- [ ] 5.1 CommissionsModule
- [ ] 5.2 Permisos nuevos
- [ ] 5.3 Traducciones permisos

### SPRINT 4: Integraciones
- [ ] 6.1 CommissionOrderListener
- [ ] 6.2 Modificación flujo órdenes
- [ ] 7.1 Integración PayrollRuns (crear)
- [ ] 7.2 Integración PayrollRuns (pagar)

### SPRINT 5: Frontend
- [ ] 8.1 CommissionPlansManager
- [ ] 8.2 CommissionRecordsList
- [ ] 8.3 GoalsManager
- [ ] 8.4 GoalProgressDashboard
- [ ] 8.5 BonusesList
- [ ] 8.6 CommissionsDashboard
- [ ] 8.7 Integración EmployeeDetailDrawer
- [ ] 8.8 Navegación HR

### SPRINT 6: Testing y Polish
- [ ] 9.1 Unit tests
- [ ] 9.2 E2E tests
- [ ] 10.1 Scripts migración
- [ ] 10.2 Seeds demo

---

## NOTAS TÉCNICAS

### Cuentas Contables Finales
```
PASIVOS:
2107 - Comisiones por Pagar
2108 - Bonos por Pagar
2109 - Propinas por Pagar (si no existe)

GASTOS:
5301 - Gasto de Comisiones sobre Ventas
5302 - Gasto de Bonos por Metas
```

### Flujo Contable de Comisión
```
Al completar venta:
  DR 5301 Gasto Comisiones    $XX
  CR 2107 Comisiones por Pagar     $XX

Al pagar nómina:
  DR 2107 Comisiones por Pagar  $XX
  CR 2103 Sueldos por Pagar          $XX
  (luego normal de nómina)
```

### Flujo Contable de Bono
```
Al otorgar bono:
  DR 5302 Gasto Bonos         $XX
  CR 2108 Bonos por Pagar          $XX

Al pagar nómina:
  DR 2108 Bonos por Pagar     $XX
  CR 2103 Sueldos por Pagar        $XX
```

---

## RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Conflicto con módulo Tips | Media | Alto | Mantener separación clara, no reutilizar schemas |
| Performance en cálculo masivo | Baja | Medio | Usar índices, cálculo async |
| Errores en asientos contables | Media | Alto | Validación estricta, tests exhaustivos |
| Duplicación de comisiones | Media | Alto | Flag `commissionCalculated` en orden |

---

**Documento creado:** 2024
**Última actualización:** [Fecha actual]
**Responsable:** Claude (Smartkubik Partner)
