# FASE 3 — Horarios con Conflictos + Calificaciones Draft/Publish

## Prerequisito

Fases 0, 1 y 2 completas: EduStudent funciona, rol TEACHER existe, módulos CRUD básicos operativos.

## Rol del Ejecutor

Tienes experiencia en: lógica de negocio compleja en NestJS services (validaciones de solapamiento temporal, flujos de estado), EventEmitter2 para eventos internos, y control de acceso basado en entidades (no solo roles).

---

## Objetivo de Esta Fase

1. Implementar la detección de conflictos de horario para profesores
2. Implementar el flujo draft→publish para calificaciones con control de quién puede publicar
3. Añadir validación de autorización a nivel de materia (solo el docente asignado puede cargar notas de SU materia)

---

## Contexto del Codebase

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

Lee antes de implementar:
- `food-inventory-saas/src/modules/edu-schedules/edu-schedules.service.ts` — tu propio código de Fase 1 (el stub)
- `food-inventory-saas/src/modules/edu-grades/edu-grades.service.ts` — tu propio código de Fase 1 (el stub)
- Busca cómo se usa EventEmitter2 en el repo: `grep -r "EventEmitter2" food-inventory-saas/src/modules/ --include="*.ts" -l`
- Busca cómo se emiten eventos: `grep -r "this.eventEmitter.emit" food-inventory-saas/src/modules/ --include="*.ts" -l | head -3`

---

## Parte 1: Detección de Conflictos en Horarios

### Lógica de conflicto de horario

Un conflicto existe cuando un profesor ya tiene una clase en el mismo `dayOfWeek` con solapamiento de horario.

El solapamiento temporal se detecta con:
```
nuevo bloque: [startTime_nuevo, endTime_nuevo]
bloque existente: [startTime_existente, endTime_existente]
Hay solapamiento si: startTime_nuevo < endTime_existente AND endTime_nuevo > startTime_existente
```

### Implementación en `edu-schedules.service.ts`

```typescript
async create(tenantId: string, dto: CreateScheduleDto, createdBy: string) {
  // 1. Verificar conflicto del profesor
  await this.validateNoTeacherConflict(tenantId, dto);
  
  // 2. Verificar conflicto del salón (el mismo salón no puede tener 2 clases al mismo tiempo)
  await this.validateNoClassroomConflict(tenantId, dto);
  
  // 3. Crear el horario
  return this.eduScheduleModel.create({
    ...dto,
    tenantId: new Types.ObjectId(tenantId),
    createdBy: new Types.ObjectId(createdBy),
  });
}

private async validateNoTeacherConflict(tenantId: string, dto: CreateScheduleDto) {
  const conflict = await this.eduScheduleModel.findOne({
    tenantId: new Types.ObjectId(tenantId),
    teacherId: new Types.ObjectId(dto.teacherId),
    dayOfWeek: dto.dayOfWeek,
    academicYear: dto.academicYear,
    isDeleted: { $ne: true },
    // Solapamiento: el nuevo bloque se solapa con alguno existente
    startTime: { $lt: dto.endTime },
    endTime: { $gt: dto.startTime },
    // Excluir el propio documento si es un update
    ...(dto._id ? { _id: { $ne: new Types.ObjectId(dto._id) } } : {}),
  });

  if (conflict) {
    throw new ConflictException(
      `El docente ya tiene clase el ${this.dayNames[dto.dayOfWeek]} de ${conflict.startTime} a ${conflict.endTime}`
    );
  }
}

private async validateNoClassroomConflict(tenantId: string, dto: CreateScheduleDto) {
  const conflict = await this.eduScheduleModel.findOne({
    tenantId: new Types.ObjectId(tenantId),
    classroomId: new Types.ObjectId(dto.classroomId),
    dayOfWeek: dto.dayOfWeek,
    academicYear: dto.academicYear,
    isDeleted: { $ne: true },
    startTime: { $lt: dto.endTime },
    endTime: { $gt: dto.startTime },
    ...(dto._id ? { _id: { $ne: new Types.ObjectId(dto._id) } } : {}),
  });

  if (conflict) {
    throw new ConflictException(
      `El salón ya tiene clase en ese horario (${conflict.startTime} - ${conflict.endTime})`
    );
  }
}

private dayNames = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes' };
```

### Endpoints de horarios (añadir a `edu-schedules.controller.ts`)

```typescript
// GET /education/schedules/teacher/:teacherId?academicYear=2025-2026
// Retorna todos los bloques horarios del profesor, agrupados por día de la semana
// Usado en el portal del docente para mostrar su horario semanal

// GET /education/schedules/classroom/:classroomId?academicYear=2025-2026
// Retorna el horario semanal del salón
// Usado en el panel admin para visualizar la grilla de horarios
```

---

## Parte 2: Calificaciones — Flujo Draft/Publish

### Estados de una calificación

```
isPublished: false = DRAFT
  - El docente puede crear y editar libremente
  - No visible en el portal del alumno
  - Solo visible en el panel admin para usuarios con edu_grades_read

isPublished: true = PUBLICADO
  - Visible en el portal del alumno (GET /education/grades/student/:id)
  - NO editable sin el permiso especial edu_grades_publish
  - Al publicar: se dispara evento edu.grades.published
```

### Validación de autorización por materia

Un docente solo puede crear/editar notas de **las materias que tiene asignadas**. Esto es control de acceso a nivel de entidad, más granular que los guards.

```typescript
// En edu-grades.service.ts
async create(tenantId: string, dto: CreateGradeDto, requesterId: string, requesterRole: string) {
  // Si el usuario es TEACHER (no admin), verificar que es el docente de la materia
  if (requesterRole === 'TEACHER') {
    const subject = await this.eduSubjectModel.findOne({
      _id: new Types.ObjectId(dto.subjectId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });
    
    if (!subject) throw new NotFoundException('Materia no encontrada');
    
    // Buscar el EmployeeProfile del teacher para comparar
    const employee = await this.employeeModel.findOne({
      userId: new Types.ObjectId(requesterId),
      tenantId: new Types.ObjectId(tenantId),
    });
    
    if (!employee || subject.teacherId.toString() !== employee._id.toString()) {
      throw new ForbiddenException('Solo el docente asignado puede cargar notas de esta materia');
    }
  }

  // Calcular isPassing basado en el gradeScale de la materia (snapshot)
  const subject = await this.eduSubjectModel.findById(dto.subjectId);
  const isPassing = dto.score >= subject.gradeScale.passing;

  return this.eduGradeModel.create({
    ...dto,
    tenantId: new Types.ObjectId(tenantId),
    teacherId: dto.teacherId,
    isPassing,
    isPublished: false,  // siempre inicia como draft
    createdBy: new Types.ObjectId(requesterId),
  });
}
```

### Endpoint de publicación de notas

```typescript
// POST /education/grades/publish
// Body: { gradeIds: string[], subjectId: string, period: string }
// Permisos requeridos: edu_grades_write (y opcionalmente edu_grades_publish para reversar)

async publishGrades(tenantId: string, dto: PublishGradesDto, publisherId: string) {
  const grades = await this.eduGradeModel.find({
    _id: { $in: dto.gradeIds.map(id => new Types.ObjectId(id)) },
    tenantId: new Types.ObjectId(tenantId),
    isDeleted: { $ne: true },
  });

  // Verificar que todas pertenecen al tenant (seguridad)
  if (grades.length !== dto.gradeIds.length) {
    throw new BadRequestException('Una o más calificaciones no pertenecen a este tenant');
  }

  // Actualizar a published
  await this.eduGradeModel.updateMany(
    { _id: { $in: grades.map(g => g._id) } },
    {
      $set: {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: new Types.ObjectId(publisherId),
      }
    }
  );

  // Emitir evento para notificaciones (Fase 4 lo escucha)
  this.eventEmitter.emit('edu.grades.published', {
    tenantId,
    subjectId: dto.subjectId,
    period: dto.period,
    gradeIds: dto.gradeIds,
    publishedBy: publisherId,
  });

  return { published: grades.length };
}
```

### Endpoint de update con control de estado

```typescript
async update(tenantId: string, gradeId: string, dto: UpdateGradeDto, requesterId: string, requesterPermissions: string[]) {
  const grade = await this.eduGradeModel.findOne({
    _id: new Types.ObjectId(gradeId),
    tenantId: new Types.ObjectId(tenantId),
    isDeleted: { $ne: true },
  });

  if (!grade) throw new NotFoundException();

  // Si ya está publicada, solo quien tiene edu_grades_publish puede editar
  if (grade.isPublished && !requesterPermissions.includes('edu_grades_publish')) {
    throw new ForbiddenException(
      'Las calificaciones publicadas no pueden editarse. Contacte al director para autorización.'
    );
  }

  const subject = await this.eduSubjectModel.findById(grade.subjectId);
  const isPassing = dto.score !== undefined ? dto.score >= subject.gradeScale.passing : grade.isPassing;

  return grade.set({ ...dto, isPassing }).save();
}
```

---

## Endpoints a Completar en Esta Fase

### `edu-schedules.controller.ts`
- `POST /education/schedules` — crear con validación de conflictos (→ 409 si conflicto)
- `PUT /education/schedules/:id` — actualizar con re-validación de conflictos
- `GET /education/schedules/teacher/:teacherId` — horario semanal del docente
- `GET /education/schedules/classroom/:classroomId` — horario semanal del salón
- `DELETE /education/schedules/:id` — soft-delete

### `edu-grades.controller.ts`
- `POST /education/grades` — crear nota (draft, con autorización por materia)
- `PUT /education/grades/:id` — editar nota (con guard de estado published)
- `POST /education/grades/publish` — bulk publish + evento
- `GET /education/grades/classroom/:classroomId` — notas del salón (admin)
- `GET /education/grades/student/:studentId` — notas del alumno (portal + admin)
- `GET /education/grades/subject/:subjectId` — notas por materia

---

## Checklist

- [ ] Leer código de `edu-schedules.service.ts` actual (Fase 1 stub)
- [ ] Implementar `validateNoTeacherConflict()` en schedules service
- [ ] Implementar `validateNoClassroomConflict()` en schedules service
- [ ] `POST /education/schedules` con double conflict validation
- [ ] `PUT /education/schedules/:id` re-valida conflictos excluyendo el propio documento
- [ ] `GET /education/schedules/teacher/:teacherId` retorna bloques agrupados por día
- [ ] `GET /education/schedules/classroom/:classroomId` retorna horario completo del salón
- [ ] Leer código de `edu-grades.service.ts` actual (Fase 1 stub)
- [ ] Implementar validación de autorización por materia en `edu-grades.service.ts`
- [ ] Implementar flujo draft: `isPublished: false` por defecto al crear
- [ ] Implementar `publishGrades()` con bulk update + EventEmitter2.emit
- [ ] Implementar guard de estado en `update()`: published sin permiso → 403
- [ ] Buscar cómo se usa EventEmitter2 en el repo y replicar el patrón exacto
- [ ] Test: crear 2 bloques horarios en conflicto → segundo retorna 409
- [ ] Test: actualizar bloque horario sin conflicto → funciona
- [ ] Test: docente A intenta cargar nota de materia asignada a docente B → 403
- [ ] Test: nota en draft → editable. Nota published → no editable sin permiso especial
- [ ] Test: `publishGrades()` emite evento `edu.grades.published`
- [ ] `npm run build` — sin errores TypeScript

---

## Criterio de Done

1. `POST /education/schedules` con conflicto de docente retorna 409 con mensaje descriptivo
2. Docente puede crear nota en draft y editarla. Al publicar, no puede editarla (403)
3. Docente B no puede cargar notas de materia asignada a docente A (403)
4. `POST /education/grades/publish` actualiza `isPublished: true` y emite el evento
5. `npm run build` pasa sin errores

---

## Anti-patrones a Evitar

- **No hagas la detección de conflictos en el controller** — va en el service, es lógica de negocio
- **No emitas eventos síncronamente si son lentos** — `eventEmitter.emit()` es async by default en NestJS con EventEmitter2; si el listener hace operaciones pesadas, úsalo con `this.eventEmitter.emitAsync()` y maneja el resultado
- **No hagas la validación de autorización por materia SOLO en el guard** — un guard de permissions verifica el permiso genérico `edu_grades_write`, pero la autorización específica (¿este docente tiene permiso sobre ESTA materia?) es lógica de negocio que va en el service
- **No uses fechas como strings** para comparar horarios — los tiempos `startTime`/`endTime` son strings HH:MM y la comparación lexicográfica funciona si siempre tienen el mismo formato. Documenta este supuesto.

---

## Referencia de Archivos

```
food-inventory-saas/
  src/
    modules/
      edu-schedules/
        edu-schedules.service.ts     ← MODIFICAR (añadir lógica de conflictos)
        edu-schedules.controller.ts  ← MODIFICAR (añadir endpoints faltantes)
        dto/create-schedule.dto.ts   ← verificar que tiene todos los campos
      edu-grades/
        edu-grades.service.ts        ← MODIFICAR (añadir draft/publish + auth por materia)
        edu-grades.controller.ts     ← MODIFICAR (añadir endpoints)
        dto/publish-grades.dto.ts    ← NUEVO
        dto/update-grade.dto.ts      ← verificar/crear
```
