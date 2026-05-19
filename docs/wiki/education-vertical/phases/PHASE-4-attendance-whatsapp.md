# FASE 4 — Asistencia Diaria + WhatsApp Automatizado

## Prerequisito

Fases 0-3 completas: EduStudent, schedules con conflictos, grades con draft/publish.

## Rol del Ejecutor

Tienes experiencia en: NestJS EventEmitter2 (listeners, eventos), @nestjs/schedule (CronJobs), integración con servicios externos de mensajería, y diseño de sistemas de notificación con rate limiting y anti-spam.

---

## Objetivo de Esta Fase

1. Implementar el registro de asistencia diaria por salón (bulk, un documento único por salón/día)
2. Crear listeners para notificaciones automáticas por WhatsApp:
   - Ausencia de alumno → notificación al tutor el mismo día
   - Cuota vencida → recordatorio diario (máx 3 por cuota)
   - Calificaciones publicadas → notificación al tutor
3. Implementar el Cron job diario de recordatorios de cuotas vencidas

---

## Contexto del Codebase

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

Lee antes de implementar:
- El módulo Whapi existente: `food-inventory-saas/src/modules/whapi/` — lee el service para entender cómo se envían mensajes
- Cómo se usan los templates de notificación: busca `notification-template.loader.ts` o similar en `food-inventory-saas/src/modules/notifications/`
- Cómo se registran CronJobs: busca `@Cron` en el repo: `grep -r "@Cron" food-inventory-saas/src/modules/ --include="*.ts" -l | head -5`
- Cómo se registran listeners de EventEmitter2: `grep -r "@OnEvent" food-inventory-saas/src/modules/ --include="*.ts" -l | head -5`
- Lee 1-2 listeners existentes para replicar el patrón exacto

---

## Parte 1: Registro de Asistencia

### Lógica de negocio

- Un registro de asistencia es único por `{ tenantId, classroomId, date }` (índice unique ya en schema)
- Si ya existe un registro para ese salón/fecha, la operación debe ser **upsert** (actualizar, no crear duplicado)
- La `date` siempre se normaliza a mediodía UTC: `new Date(dto.date).toISOString().split('T')[0] + 'T12:00:00.000Z'`
- Al registrar ausencias, se emite evento `edu.attendance.absence` para cada alumno ausente

### `edu-attendance.service.ts` — Método principal

```typescript
async recordAttendance(tenantId: string, dto: RecordAttendanceDto, createdBy: string) {
  // Normalizar fecha a mediodía UTC
  const normalizedDate = new Date(
    new Date(dto.date).toISOString().split('T')[0] + 'T12:00:00.000Z'
  );

  // Upsert: si ya existe el registro, actualizarlo; si no, crearlo
  const result = await this.eduAttendanceModel.findOneAndUpdate(
    {
      tenantId: new Types.ObjectId(tenantId),
      classroomId: new Types.ObjectId(dto.classroomId),
      date: normalizedDate,
    },
    {
      $set: {
        teacherId: new Types.ObjectId(dto.teacherId),
        subjectId: dto.subjectId ? new Types.ObjectId(dto.subjectId) : undefined,
        entries: dto.entries.map(e => ({
          studentId: new Types.ObjectId(e.studentId),
          status: e.status,
          notes: e.notes,
        })),
        createdBy: new Types.ObjectId(createdBy),
      },
    },
    { upsert: true, new: true }
  );

  // Emitir eventos para ausencias
  const absences = dto.entries.filter(e => e.status === 'absent');
  for (const absence of absences) {
    this.eventEmitter.emit('edu.attendance.absence', {
      tenantId,
      studentId: absence.studentId,
      classroomId: dto.classroomId,
      date: normalizedDate,
      teacherId: dto.teacherId,
    });
  }

  return result;
}
```

### Validaciones adicionales

```typescript
// No se puede registrar asistencia de una fecha futura
if (new Date(dto.date) > new Date()) {
  throw new BadRequestException('No se puede registrar asistencia de una fecha futura');
}

// El docente debe ser el asignado al salón (o tener permiso admin)
// (implementar si el requerimiento es estricto)
```

### Endpoints en `edu-attendance.controller.ts`

```typescript
// POST /education/attendance — registro bulk de asistencia de un salón
// GET /education/attendance/classroom/:classroomId?from=&to= — reporte histórico
// GET /education/attendance/student/:studentId?academicYear= — historial del alumno
// GET /education/attendance/classroom/:classroomId/summary — % asistencia por alumno
```

---

## Parte 2: Listeners de WhatsApp

### Cómo funciona WhatsApp en el repo

Lee `food-inventory-saas/src/modules/whapi/whapi.service.ts` para entender el método de envío de mensajes. Típicamente es algo como:

```typescript
await this.whapiService.sendMessage({
  tenantId,
  phone: phoneNumber,  // formato internacional sin +
  message: 'Texto del mensaje',
});
```

Verifica el método exacto y sus parámetros leyendo el archivo antes de usarlo.

### Templates de mensaje

Busca cómo se definen templates en el sistema (busca `notification-template.loader.ts` o similar). Si el sistema usa templates con variables, añade los templates edu-* ahí. Si no usa templates, define los mensajes directamente en los listeners.

**Mensajes a implementar:**

```
edu.payment_reminder:
"Estimado/a {{guardian.name}}, le recordamos que la {{type}} de {{month}} del alumno
 {{student.firstName}} {{student.lastName}} por {{currency}} {{amount}} venció el
 {{dueDate | format: 'DD/MM/YYYY'}}. Por favor regularice su situación a la brevedad.
 — {{tenant.name}}"

edu.grade_published:
"Hola {{guardian.name}}, las calificaciones del {{period}} de {{subject.name}}
 del alumno {{student.firstName}} {{student.lastName}} ya están disponibles en el portal.
 Acceda en: {{portalUrl}}/education/student/grades — {{tenant.name}}"

edu.attendance_alert:
"Estimado/a {{guardian.name}}, le informamos que {{student.firstName}} {{student.lastName}}
 estuvo AUSENTE el {{date | format: 'DD/MM/YYYY'}} en {{classroom.name}}.
 Si tiene alguna novedad, comuníquese con la institución. — {{tenant.name}}"
```

### Listener de ausencias

```typescript
// food-inventory-saas/src/modules/edu-attendance/listeners/edu-absence.listener.ts

@Injectable()
export class EduAbsenceListener {
  constructor(
    @InjectModel('EduStudent') private studentModel: Model<EduStudentDocument>,
    @InjectModel('EduClassroom') private classroomModel: Model<EduClassroomDocument>,
    private whapiService: WhapiService,
  ) {}

  @OnEvent('edu.attendance.absence')
  async handleAbsence(payload: EduAbsenceEvent) {
    const student = await this.studentModel
      .findOne({
        _id: new Types.ObjectId(payload.studentId),
        tenantId: new Types.ObjectId(payload.tenantId),
        isDeleted: { $ne: true },
      })
      .lean();

    if (!student || !student.guardian?.whatsapp) return; // sin tutor WhatsApp, skip

    const classroom = await this.classroomModel
      .findById(new Types.ObjectId(payload.classroomId))
      .lean();

    const phone = student.guardian.whatsapp.replace(/\D/g, ''); // solo dígitos

    await this.whapiService.sendMessage({
      tenantId: payload.tenantId,
      phone,
      message: this.buildAbsenceMessage(student, classroom, payload.date),
    });
  }

  private buildAbsenceMessage(student, classroom, date: Date): string {
    const dateStr = new Date(date).toLocaleDateString('es-VE', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    return `Estimado/a ${student.guardian.name}, le informamos que ${student.firstName} ${student.lastName} estuvo AUSENTE el ${dateStr} en ${classroom?.name ?? 'su salón'}. — SmartKubik Educación`;
  }
}
```

### Listener de calificaciones publicadas

```typescript
// food-inventory-saas/src/modules/edu-grades/listeners/grades-published.listener.ts

@OnEvent('edu.grades.published')
async handleGradesPublished(payload: GradesPublishedEvent) {
  // Obtener las notas publicadas
  const grades = await this.gradeModel.find({
    _id: { $in: payload.gradeIds.map(id => new Types.ObjectId(id)) },
    tenantId: new Types.ObjectId(payload.tenantId),
  }).lean();

  // Obtener estudiantes únicos
  const studentIds = [...new Set(grades.map(g => g.studentId.toString()))];

  for (const studentId of studentIds) {
    const student = await this.studentModel.findById(studentId).lean();
    if (!student?.guardian?.whatsapp) continue;

    const phone = student.guardian.whatsapp.replace(/\D/g, '');
    // Enviar mensaje de calificaciones disponibles
    await this.whapiService.sendMessage({
      tenantId: payload.tenantId,
      phone,
      message: `Hola ${student.guardian.name}, las calificaciones del ${payload.period} de su representado/a ${student.firstName} ${student.lastName} están disponibles en el portal estudiantil.`,
    });
  }
}
```

---

## Parte 3: CronJob de Recordatorios de Cuotas Vencidas

```typescript
// food-inventory-saas/src/modules/edu-tuition/edu-tuition.scheduler.ts

@Injectable()
export class EduTuitionScheduler {
  constructor(
    @InjectModel('EduTuitionFee') private tuitionModel: Model<EduTuitionFeeDocument>,
    @InjectModel('EduStudent') private studentModel: Model<EduStudentDocument>,
    private whapiService: WhapiService,
  ) {}

  // Corre todos los días a las 9:00 AM (horario del servidor)
  @Cron('0 9 * * *')
  async sendOverdueReminders() {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // normalizar a mediodía

    // Buscar cuotas vencidas con menos de 3 recordatorios enviados
    const overdueFees = await this.tuitionModel.find({
      status: 'overdue',
      notificationsCount: { $lt: 3 },
      isDeleted: { $ne: true },
    }).lean();

    for (const fee of overdueFees) {
      const student = await this.studentModel
        .findOne({ _id: fee.studentId, isDeleted: { $ne: true } })
        .lean();

      if (!student?.guardian?.whatsapp) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - new Date(fee.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const phone = student.guardian.whatsapp.replace(/\D/g, '');
      const message = `Estimado/a ${student.guardian.name}, la ${fee.description} de ${student.firstName} ${student.lastName} lleva ${daysOverdue} días vencida. Monto: ${fee.currency} ${fee.amount}. Por favor regularice cuanto antes.`;

      try {
        await this.whapiService.sendMessage({
          tenantId: fee.tenantId.toString(),
          phone,
          message,
        });

        // Actualizar contador
        await this.tuitionModel.updateOne(
          { _id: fee._id },
          {
            $inc: { notificationsCount: 1 },
            $set: { lastNotifiedAt: new Date() },
          }
        );
      } catch (error) {
        // No propagar el error — un fallo de WhatsApp no debe detener el batch
        console.error(`Error enviando recordatorio a ${phone}:`, error.message);
      }
    }
  }
}
```

**Registrar el scheduler en `edu-tuition.module.ts`:**
```typescript
// Añadir ScheduleModule.forRoot() en imports del AppModule si no está
// Añadir EduTuitionScheduler en providers de EduTuitionModule
```

---

## CronJob de Actualización de Estado de Cuotas a "overdue"

Además del recordatorio, necesitas un job que cambie el estado de `pending` a `overdue`:

```typescript
// Se puede añadir en el mismo scheduler o en uno separado
@Cron('0 1 * * *')  // 1 AM diariamente
async updateOverdueStatus() {
  const now = new Date();
  await this.tuitionModel.updateMany(
    {
      status: 'pending',
      dueDate: { $lt: now },
      isDeleted: { $ne: true },
    },
    { $set: { status: 'overdue' } }
  );
}
```

---

## Checklist

- [ ] Leer `whapi.service.ts` para entender el método de envío y sus parámetros exactos
- [ ] Buscar y leer 2 listeners `@OnEvent` existentes en el repo para replicar patrón
- [ ] Buscar y leer 1 CronJob `@Cron` existente en el repo para replicar patrón
- [ ] Implementar `recordAttendance()` con upsert + normalización de fecha + emisión de eventos
- [ ] Añadir validación: no se puede registrar asistencia de fecha futura
- [ ] Crear `edu-absence.listener.ts` que escucha `edu.attendance.absence`
- [ ] Registrar el listener en `edu-attendance.module.ts`
- [ ] Crear `grades-published.listener.ts` que escucha `edu.grades.published`
- [ ] Registrar el listener en `edu-grades.module.ts`
- [ ] Definir templates de mensaje (en el sistema de templates si existe, o inline)
- [ ] Crear `edu-tuition.scheduler.ts` con:
  - `@Cron('0 1 * * *')` para marcar cuotas como `overdue`
  - `@Cron('0 9 * * *')` para enviar recordatorios (máx 3 por cuota)
- [ ] Verificar que `ScheduleModule` está en `app.module.ts` (busca si ya está importado)
- [ ] Registrar `EduTuitionScheduler` en `edu-tuition.module.ts` providers
- [ ] Endpoints de asistencia: POST, GET classroom/histórico, GET student/historial
- [ ] Test: registrar asistencia con `absent` → evento `edu.attendance.absence` emitido
- [ ] Test: registrar asistencia dos veces el mismo día → upsert (no duplicado, sino update)
- [ ] Test: registrar asistencia de fecha futura → 400
- [ ] Test: cuota `pending` con `dueDate` pasado → el cron la cambia a `overdue`
- [ ] `npm run build` — sin errores TypeScript

---

## Criterio de Done

1. `POST /education/attendance` para un salón con 1 alumno ausente → el listener emite el WhatsApp (verificable en logs de staging o mock)
2. Dos POSTs al mismo salón/fecha → el segundo hace upsert, no crea documento duplicado (el índice unique lo garantiza con `findOneAndUpdate`)
3. El CronJob de overdue cambia correctamente `status: "pending"` → `"overdue"` para cuotas vencidas
4. `npm run build` pasa sin errores

---

## Anti-patrones a Evitar

- **No hagas `try/catch` que swalle silenciosamente** errores de WhatsApp — logea el error siempre aunque no propagues
- **No envíes WhatsApp síncrono** en el request de asistencia — usa el evento para que el listener lo maneje de forma desacoplada
- **No acumules mensajes indefinidamente** — el contador `notificationsCount < 3` es el throttle; respétalo
- **No uses `new Date()` sin normalizar** para la fecha de asistencia — siempre T12:00:00.000Z
- **No hagas una query por alumno** en el listener de grades-published — usa `$in` para los studentIds únicos

---

## Referencia de Archivos

```
food-inventory-saas/
  src/
    modules/
      edu-attendance/
        edu-attendance.service.ts          ← MODIFICAR (añadir recordAttendance con upsert)
        edu-attendance.controller.ts       ← MODIFICAR (endpoints)
        listeners/
          edu-absence.listener.ts          ← NUEVO
      edu-grades/
        listeners/
          grades-published.listener.ts     ← NUEVO
      edu-tuition/
        edu-tuition.scheduler.ts          ← NUEVO
      whapi/whapi.service.ts              ← LEER (no modificar)
      notifications/templates/            ← LEER y añadir templates si aplica
```
