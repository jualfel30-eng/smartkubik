# FASE 5 — Dashboard Ejecutivo + Cuentas por Cobrar

## Prerequisito

Fases 0-4 completas: asistencia funciona, WhatsApp envía, cuotas con cron operativo.

## Rol del Ejecutor

Tienes experiencia en: MongoDB aggregation pipeline con `$facet`, optimización de queries para dashboards de tiempo real (target < 500ms), diseño de APIs para visualización ejecutiva, y patrones de AR (Accounts Receivable) en ERPs.

---

## Objetivo de Esta Fase

1. Implementar `GET /education/dashboard/summary` como una sola agregación `$facet` (< 500ms)
2. Implementar la integración pagos → cuotas: cuando se registra un Payment, actualizar el EduTuitionFee
3. Completar los endpoints de gestión de cuotas (morosos, generación en batch, registro manual de pago)
4. Conectar el dashboard con datos reales de todas las entidades edu-*

---

## Contexto del Codebase

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

Lee antes de implementar:
- El dashboard existente: `food-inventory-saas/src/modules/dashboard/` — para entender el patrón de aggregation y response shape
- El módulo payments: `food-inventory-saas/src/modules/payments/` — para entender cómo se emite el evento `payment.confirmed`
- Busca listeners de `payment.confirmed`: `grep -r "payment.confirmed" food-inventory-saas/src/modules/ --include="*.ts" -l`
- Lee el service de `edu-tuition` que creaste en Fase 1 (stub)

---

## Parte 1: Dashboard Summary con `$facet`

### Diseño del endpoint

```
GET /education/dashboard/summary?academicYear=2025-2026
Headers: Authorization: Bearer <admin_jwt>
Permisos: edu_dashboard_read

Response:
{
  "totalStudents": 320,
  "activeStudents": 298,
  "solventCount": 245,         // tienen todas las cuotas al día
  "overdueCount": 53,          // tienen al menos 1 cuota overdue
  "overdueAmount": 15800.00,   // suma de deuda pendiente
  "attendanceTodayPct": 87.5,  // % presentes hoy vs total activos
  "unpublishedGrades": 12,     // notas en draft pendientes de publicar
  "classroomCount": 14,
  "byClassroom": [
    {
      "classroomId": "...",
      "name": "3er Grado A",
      "totalStudents": 24,
      "solventStudents": 18,
      "overdueStudents": 6,
      "presentToday": 21,
      "attendancePct": 87.5
    }
  ]
}
```

### Implementación con `$facet`

La clave es hacer una sola conexión a MongoDB con múltiples pipelines en paralelo:

```typescript
// edu-dashboard.service.ts
async getSummary(tenantId: string, academicYear: string) {
  const tenantObjId = new Types.ObjectId(tenantId);
  const today = new Date(new Date().toISOString().split('T')[0] + 'T12:00:00.000Z');

  const [result] = await this.eduStudentModel.aggregate([
    // Pipeline principal: todos los alumnos activos del tenant/año
    { $match: { tenantId: tenantObjId, academicYear, status: 'active', isDeleted: { $ne: true } } },
    {
      $facet: {
        totalActive: [{ $count: 'count' }],
        // Agrega más facets aquí
      }
    }
  ]);

  // Para los datos que requieren joins (tuition, attendance), usa lookups o queries separadas paralelas
  const [tuitionStats, attendanceToday, unpublishedGrades, classroomData] = await Promise.all([
    this.getTuitionStats(tenantObjId, academicYear),
    this.getAttendanceToday(tenantObjId, today),
    this.getUnpublishedGrades(tenantObjId, academicYear),
    this.getClassroomSummaries(tenantObjId, academicYear, today),
  ]);

  // Combinar resultados
  return {
    totalStudents: result.totalActive[0]?.count ?? 0,
    activeStudents: result.totalActive[0]?.count ?? 0,
    ...tuitionStats,
    ...attendanceToday,
    unpublishedGrades,
    classroomCount: classroomData.length,
    byClassroom: classroomData,
  };
}

private async getTuitionStats(tenantId: Types.ObjectId, academicYear: string) {
  const stats = await this.eduTuitionModel.aggregate([
    { $match: { tenantId, academicYear, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
      }
    }
  ]);

  // Procesar para extraer solvent/overdue counts y montos
  // Un alumno es solvente si tiene 0 cuotas en overdue
  // Simplificación: contar cuotas únicas de studentId con/sin overdue
  
  const overdueEntry = stats.find(s => s._id === 'overdue');
  return {
    overdueCount: overdueEntry?.count ?? 0,
    overdueAmount: overdueEntry?.amount ?? 0,
    solventCount: 0, // calcular como: activeStudents - (estudiantes con ≥1 overdue)
  };
}
```

**Nota de optimización:** Si las queries son lentas, añade un índice compuesto en `edu-tuition-fee` por `{ tenantId, academicYear, status }` (ya definido en Fase 1). Para el conteo de "alumnos morosos" (no cuotas morosas) necesitas un `$group` por `studentId` con `$addToSet` sobre status.

### Optimización de solventes vs morosos

Para calcular correctamente cuántos ALUMNOS son morosos (no cuántas cuotas):

```typescript
const studentSolvencyPipeline = await this.eduTuitionModel.aggregate([
  { $match: { tenantId, academicYear, isDeleted: { $ne: true } } },
  {
    $group: {
      _id: '$studentId',
      hasOverdue: { $max: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
    }
  },
  {
    $group: {
      _id: null,
      overdueStudents: { $sum: '$hasOverdue' },
      totalStudentsWithFees: { $sum: 1 },
    }
  }
]);
```

---

## Parte 2: Integración Payment → EduTuitionFee

### Listener de pagos confirmados

Cuando se registra un pago con `paymentType: "tuition"` y `metadata.tuitionFeeId`, el sistema debe actualizar el EduTuitionFee correspondiente.

```typescript
// food-inventory-saas/src/modules/edu-tuition/listeners/tuition-payment.listener.ts

@OnEvent('payment.confirmed')
async handlePaymentConfirmed(payload: PaymentConfirmedEvent) {
  // Solo procesar pagos de tipo tuition
  if (payload.paymentType !== 'tuition') return;
  if (!payload.metadata?.tuitionFeeId) return;

  await this.tuitionModel.updateOne(
    {
      _id: new Types.ObjectId(payload.metadata.tuitionFeeId),
      tenantId: new Types.ObjectId(payload.tenantId),
    },
    {
      $set: {
        status: 'paid',
        paymentId: new Types.ObjectId(payload.paymentId),
      }
    }
  );
}
```

**Verifica el shape exacto del evento `payment.confirmed`** leyendo los listeners existentes o el payments.service.ts antes de asumir los campos del payload.

---

## Parte 3: Endpoints de Cuotas (Completar en `edu-tuition`)

### Generación en batch de cuotas mensuales

```typescript
// POST /education/tuition/generate
// Body: { academicYear: "2025-2026", months: [1,2,3,...,12], classroomId?: string }
// Genera EduTuitionFee para todos los alumnos activos del tenant (o de un salón)

async generateTuitionBatch(tenantId: string, dto: GenerateTuitionDto) {
  const studentQuery: any = {
    tenantId: new Types.ObjectId(tenantId),
    status: 'active',
    isDeleted: { $ne: true },
    academicYear: dto.academicYear,
  };

  if (dto.classroomId) {
    studentQuery.classroomId = new Types.ObjectId(dto.classroomId);
  }

  const students = await this.studentModel.find(studentQuery).lean();

  const fees = [];
  for (const student of students) {
    for (const month of dto.months) {
      fees.push({
        tenantId: new Types.ObjectId(tenantId),
        studentId: student._id,
        classroomId: student.classroomId,
        type: 'monthly',
        academicYear: dto.academicYear,
        month,
        description: `Mensualidad ${this.monthName(month)} ${dto.academicYear.split('-')[0]}`,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        dueDate: new Date(`${dto.academicYear.split('-')[0]}-${String(month).padStart(2,'0')}-${dto.dueDay || 5}T12:00:00.000Z`),
        status: 'pending',
      });
    }
  }

  // insertMany con ordered: false para continuar si alguna ya existe (duplicate key)
  // El índice unique { tenantId, studentId, type, month, academicYear } previene duplicados
  try {
    await this.tuitionModel.insertMany(fees, { ordered: false });
  } catch (e) {
    // Ignorar errores de duplicate key (E11000) — son cuotas ya generadas
    if (e.code !== 11000) throw e;
  }

  return { generated: fees.length, note: 'Las cuotas ya existentes fueron ignoradas (idempotente)' };
}
```

### Endpoints completos de `edu-tuition`

```typescript
// POST /education/tuition/generate            — generación batch
// GET /education/tuition                       — lista con filtros (status, classroomId, month)
// GET /education/tuition/student/:studentId    — cuotas del alumno (portal)
// GET /education/tuition/overdue               — lista de morosos para dashboard
// POST /education/tuition/:id/pay              — registrar pago manual (crea Payment + actualiza TuitionFee)
// POST /education/tuition/:id/waive            — exonerar cuota
// POST /education/tuition/:id/notify           — enviar recordatorio manual WhatsApp
```

---

## Checklist

- [ ] Leer `dashboard/` existente para entender patrón de aggregation
- [ ] Leer `payments/` para entender evento `payment.confirmed` y su payload
- [ ] Implementar `EduDashboardService.getSummary()` con queries paralelas
- [ ] Verificar que la respuesta llega en < 500ms con datos reales (medir con console.time)
- [ ] Si > 500ms, añadir índices faltantes o simplificar la query del dashboard
- [ ] Implementar endpoint `GET /education/dashboard/summary` en `edu-dashboard.controller.ts`
- [ ] Crear `tuition-payment.listener.ts` que escucha `payment.confirmed`
- [ ] Registrar el listener en `edu-tuition.module.ts`
- [ ] Implementar `generateTuitionBatch()` idempotente (insertMany + ignora E11000)
- [ ] Implementar todos los endpoints de `edu-tuition` listados arriba
- [ ] Endpoint `GET /education/tuition/overdue` con el `studentId`, nombre, salón, y monto total de deuda
- [ ] Endpoint `POST /education/tuition/:id/pay` que crea un Payment con `paymentType: "tuition"` y `metadata.tuitionFeeId`
- [ ] Test: payment.confirmed con `paymentType=tuition` → EduTuitionFee se marca como `paid`
- [ ] Test: generateTuitionBatch idempotente → ejecutar 2 veces no crea duplicados
- [ ] Test: dashboard/summary retorna datos correctos con alumnos y cuotas de prueba
- [ ] Medir latencia de dashboard/summary y documentar (debe ser < 500ms)
- [ ] `npm run build` — sin errores TypeScript

---

## Criterio de Done

1. `GET /education/dashboard/summary` retorna en < 500ms con `totalStudents`, `solventCount`, `overdueCount`, `byClassroom`
2. `POST /education/tuition/generate` para 10 alumnos × 12 meses genera 120 cuotas. Ejecutarlo 2 veces → sigue siendo 120 (idempotente)
3. Registrar un Payment con `paymentType: "tuition"` y el `metadata.tuitionFeeId` correcto → la cuota cambia a `status: "paid"`
4. `GET /education/tuition/overdue` lista los alumnos morosos con deuda total correcta
5. `npm run build` pasa sin errores

---

## Anti-patrones a Evitar

- **No hagas N+1 queries** en el dashboard — un loop de queries por salón es inaceptable para latencia; usa aggregation `$lookup` o queries paralelas con `Promise.all()`
- **No uses `insertMany` con `ordered: true`** para la generación batch — si hay un duplicado en medio, aborta todo; necesitas `ordered: false` para ser idempotente
- **No asumas el shape del evento `payment.confirmed`** sin leerlo primero — podría diferir de lo que asumes
- **No hagas la integración payment→tuition en el payments service** (modificando código existente) — usa el listener del evento para no acoplar los módulos

---

## Referencia de Archivos

```
food-inventory-saas/
  src/
    modules/
      edu-dashboard/
        edu-dashboard.service.ts       ← IMPLEMENTAR (era stub en Fase 1)
        edu-dashboard.controller.ts    ← IMPLEMENTAR
      edu-tuition/
        edu-tuition.service.ts         ← COMPLETAR (generateBatch, endpoints)
        edu-tuition.controller.ts      ← COMPLETAR
        listeners/
          tuition-payment.listener.ts  ← NUEVO
      dashboard/                       ← LEER como referencia
      payments/                        ← LEER (evento payment.confirmed)
```
