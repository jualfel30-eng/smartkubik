# FASE 1 — Schemas Mongoose y CRUD Base (sin EduStudent)

## Prerequisito

La Fase 0 debe estar completa: `"EDUCATION"` existe en el enum `vertical` del tenant, los 16 permisos `edu_*` están en el sistema.

## Rol del Ejecutor

Tienes experiencia en: diseño de schemas Mongoose con índices compuestos, NestJS modular con Dependency Injection, patrones de multi-tenant con soft-delete, y el codebase SmartKubik.

Conoces: `{ isDeleted: { $ne: true } }` en todos los finds, `tenantId` explícito en cada query, guards obligatorios en controllers, Mongoose `@Schema`, `@Prop`, `SchemaFactory.createForClass`.

---

## Objetivo de Esta Fase

Crear los 6 schemas Mongoose de entidades académicas (sin `EduStudent` — eso es Fase 2) y los 7 módulos NestJS con CRUD básico funcional.

Al terminar debes poder:
- `POST /education/classrooms` → crea un salón
- `GET /education/classrooms` → lista salones del tenant
- Soft-delete funciona: `DELETE /education/classrooms/:id` marca `isDeleted: true`
- Tenant B no puede leer datos de Tenant A

---

## Contexto del Codebase

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

Antes de crear código, lee estos archivos como referencia de patrón:
- Un schema existente complejo: `food-inventory-saas/src/schemas/customer.schema.ts`
- Un módulo completo como referencia: `food-inventory-saas/src/modules/payables/payables.service.ts`
- El app.module.ts para entender cómo se registran módulos: `food-inventory-saas/src/app.module.ts`
- Un controller con guards: busca en `food-inventory-saas/src/modules/` algún controller que use `@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)`

---

## Schemas a Crear

### Schema 1: `edu-classroom.schema.ts`

```
Ruta: food-inventory-saas/src/schemas/edu-classroom.schema.ts

Campos:
  tenantId: Types.ObjectId — required, ref: 'Tenant'
  name: string — required (ej: "3er Grado A")
  grade: string — required (nivel: "1er grado", "5to año")
  section: string — required ("A", "B", "C")
  academicYear: string — required ("2025-2026")
  capacity: number — default: 30
  tutorId?: Types.ObjectId — ref: EmployeeProfile (tutor principal del salón)
  studentIds: Types.ObjectId[] — ref: EduStudent (array, inicia vacío)
  subjectIds: Types.ObjectId[] — ref: EduSubject (array, inicia vacío)
  isDeleted: boolean — default: false
  createdBy: Types.ObjectId — ref: User
  timestamps: true

Índices:
  { tenantId: 1, academicYear: 1, grade: 1, section: 1 } — unique
  { tenantId: 1, tutorId: 1 }
  { tenantId: 1, isDeleted: 1 }
```

### Schema 2: `edu-subject.schema.ts`

```
Ruta: food-inventory-saas/src/schemas/edu-subject.schema.ts

Campos:
  tenantId: Types.ObjectId — required
  classroomId: Types.ObjectId — required, ref: EduClassroom
  teacherId: Types.ObjectId — required, ref: EmployeeProfile (docente responsable)
  name: string — required ("Matemáticas", "Historia")
  code: string — optional ("MAT-01")
  periodsPerWeek: number — default: 4
  gradeScale: {
    min: number — default: 1,
    max: number — default: 20,
    passing: number — default: 10
  }
  academicYear: string — required
  isDeleted: boolean — default: false
  createdBy: Types.ObjectId

Índices:
  { tenantId: 1, classroomId: 1, name: 1, academicYear: 1 } — unique
  { tenantId: 1, teacherId: 1 }
  { tenantId: 1, classroomId: 1 }
```

### Schema 3: `edu-schedule.schema.ts`

```
Ruta: food-inventory-saas/src/schemas/edu-schedule.schema.ts

Campos:
  tenantId: Types.ObjectId — required
  classroomId: Types.ObjectId — required, ref: EduClassroom
  subjectId: Types.ObjectId — required, ref: EduSubject
  teacherId: Types.ObjectId — required, ref: EmployeeProfile
  dayOfWeek: number — required, 1=Lunes, 2=Martes, ..., 5=Viernes
  startTime: string — required ("08:00", formato HH:MM)
  endTime: string — required ("09:00", formato HH:MM)
  academicYear: string — required
  effectiveFrom: Date — required
  effectiveUntil?: Date — optional (para horarios temporales/overrides)
  isDeleted: boolean — default: false
  createdBy: Types.ObjectId

Índices:
  { tenantId: 1, classroomId: 1, dayOfWeek: 1 }
  { tenantId: 1, teacherId: 1, dayOfWeek: 1 }
  { tenantId: 1, academicYear: 1 }
```

### Schema 4: `edu-grade.schema.ts`

```
Ruta: food-inventory-saas/src/schemas/edu-grade.schema.ts

Campos:
  tenantId: Types.ObjectId — required
  studentId: Types.ObjectId — required, ref: EduStudent
  subjectId: Types.ObjectId — required, ref: EduSubject
  classroomId: Types.ObjectId — required, ref: EduClassroom
  teacherId: Types.ObjectId — required, ref: EmployeeProfile (quien cargó la nota)
  period: string — required ("Lapso 1", "Lapso 2", "Lapso 3", "Final")
  academicYear: string — required
  score: number — required (el valor de la nota)
  maxScore: number — required (el máximo posible, snapshot de gradeScale.max al momento de cargar)
  isPassing: boolean — computed al guardar (score >= gradeScale.passing)
  notes?: string — comentario del docente
  isPublished: boolean — default: false (draft = false, visible en portal = true)
  publishedAt?: Date
  publishedBy?: Types.ObjectId — ref: User
  isDeleted: boolean — default: false
  createdBy: Types.ObjectId

Índices:
  { tenantId: 1, studentId: 1, subjectId: 1, period: 1, academicYear: 1 } — unique
  { tenantId: 1, classroomId: 1, period: 1 }
  { tenantId: 1, teacherId: 1, subjectId: 1 }
  { tenantId: 1, isPublished: 1 }
```

### Schema 5: `edu-attendance.schema.ts`

```
Ruta: food-inventory-saas/src/schemas/edu-attendance.schema.ts

Campos:
  tenantId: Types.ObjectId — required
  classroomId: Types.ObjectId — required, ref: EduClassroom
  subjectId?: Types.ObjectId — optional, ref: EduSubject (si se pasa lista por clase)
  teacherId: Types.ObjectId — required, ref: EmployeeProfile (quien tomó asistencia)
  date: Date — required (normalizar a mediodía UTC: T12:00:00.000Z)
  entries: [{
    studentId: Types.ObjectId — ref: EduStudent
    status: "present" | "absent" | "late" | "excused"
    notes?: string
  }]
  isDeleted: boolean — default: false
  createdBy: Types.ObjectId

Índices:
  { tenantId: 1, classroomId: 1, date: 1 } — unique (un registro por salón por día)
  { tenantId: 1, date: 1 }
  { tenantId: 1, "entries.studentId": 1 }
```

### Schema 6: `edu-tuition-fee.schema.ts`

```
Ruta: food-inventory-saas/src/schemas/edu-tuition-fee.schema.ts

Campos:
  tenantId: Types.ObjectId — required
  studentId: Types.ObjectId — required, ref: EduStudent
  classroomId: Types.ObjectId — required, ref: EduClassroom
  type: "enrollment" | "monthly" | "special" — required
  academicYear: string — required
  month?: number — 1-12, solo para type="monthly"
  description: string — ej: "Mensualidad Mayo 2026"
  amount: number — required
  currency: string — default: "USD"
  dueDate: Date — required
  status: "pending" | "paid" | "overdue" | "waived" — default: "pending"
  paymentId?: Types.ObjectId — ref: Payment (cuando se cobra, link al Payment)
  notificationsCount: number — default: 0 (cuántos recordatorios WhatsApp se enviaron)
  lastNotifiedAt?: Date
  isDeleted: boolean — default: false
  createdBy: Types.ObjectId

Índices:
  { tenantId: 1, studentId: 1, type: 1, month: 1, academicYear: 1 } — unique sparse
  { tenantId: 1, status: 1 }
  { tenantId: 1, dueDate: 1 }
  { tenantId: 1, classroomId: 1, status: 1 }
```

---

## Módulos NestJS a Crear

Para cada módulo, crea la estructura estándar:
```
food-inventory-saas/src/modules/edu-{name}/
  edu-{name}.module.ts
  edu-{name}.controller.ts
  edu-{name}.service.ts
  edu-{name}.service.spec.ts    ← tests básicos de tenant isolation
  dto/
    create-{name}.dto.ts
    update-{name}.dto.ts
    {name}-filters.dto.ts
```

Lee un módulo completo existente antes de crear (ej: `food-inventory-saas/src/modules/payables/`) para replicar el patrón exacto de estructura.

### Módulos a crear: `edu-classrooms`, `edu-subjects`, `edu-schedules`, `edu-grades`, `edu-attendance`, `edu-tuition`, `edu-dashboard`

**Invariantes obligatorios en cada service:**
```typescript
// Todo método de búsqueda incluye esto como base:
const baseFilter = { tenantId: new Types.ObjectId(tenantId), isDeleted: { $ne: true } };

// Paginación básica:
const items = await this.model.find({ ...baseFilter, ...filters })
  .skip(page * limit)
  .limit(limit)
  .sort({ createdAt: -1 });
```

**Invariantes obligatorios en cada controller:**
```typescript
@Controller('education/classrooms')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class EduClassroomsController {
  @Get()
  @RequiredPermissions('edu_classrooms_read')
  findAll(@TenantId() tenantId: string, @Query() filters: ClassroomFiltersDto) {
    return this.service.findAll(tenantId, filters);
  }
  // etc.
}
```

---

## Registro en `app.module.ts`

Al final de crear todos los módulos, añade los imports en `food-inventory-saas/src/app.module.ts`.

Lee el archivo primero para encontrar el patrón de cómo se importan módulos similares (como payroll-employees, payroll-runs, etc.). Sigue el mismo patrón de organización (los módulos edu-* deben ir agrupados).

---

## Tests de Tenant Isolation (obligatorios)

En `edu-classrooms.service.spec.ts`, crea al menos estos tests:

```typescript
describe('EduClassroomsService', () => {
  it('should not return classrooms from another tenant', async () => {
    // Crea un classroom con tenantId A
    // Busca con tenantId B
    // Espera array vacío
  });

  it('should not return soft-deleted classrooms', async () => {
    // Crea un classroom
    // Lo soft-delete (isDeleted: true)
    // Busca
    // Espera array vacío
  });

  it('should use MAX+1 for sequential fields if applicable', async () => {
    // No aplica en esta fase — aplica en Fase 2 para enrollmentNumber
  });
});
```

---

## Checklist

- [ ] Leer schema existente (`customer.schema.ts`) para replicar estructura
- [ ] Crear `edu-classroom.schema.ts` con índices correctos
- [ ] Crear `edu-subject.schema.ts` con índices correctos
- [ ] Crear `edu-schedule.schema.ts` con índices correctos
- [ ] Crear `edu-grade.schema.ts` con índices correctos
- [ ] Crear `edu-attendance.schema.ts` con índice unique por salón+fecha
- [ ] Crear `edu-tuition-fee.schema.ts` con índices correctos
- [ ] Leer módulo existente (`payables/`) para replicar patrón
- [ ] Crear módulo `edu-classrooms` completo (module, controller, service, dtos)
- [ ] Crear módulo `edu-subjects` completo
- [ ] Crear módulo `edu-schedules` completo (sin lógica de conflictos aún — eso es Fase 3)
- [ ] Crear módulo `edu-grades` completo (sin lógica de publish aún — eso es Fase 3)
- [ ] Crear módulo `edu-attendance` completo (sin listeners WhatsApp — eso es Fase 4)
- [ ] Crear módulo `edu-tuition` completo (sin cron scheduler — eso es Fase 4)
- [ ] Crear módulo `edu-dashboard` (stub vacío — se implementa en Fase 5)
- [ ] Registrar todos los módulos en `app.module.ts`
- [ ] Tests de tenant isolation para `edu-classrooms` como mínimo
- [ ] `npm run build` en `food-inventory-saas/` — sin errores TypeScript
- [ ] `POST /education/classrooms` crea un salón con los datos correctos
- [ ] `GET /education/classrooms` retorna los salones del tenant
- [ ] `DELETE /education/classrooms/:id` hace soft-delete (no elimina de DB)
- [ ] Tenant B haciendo `GET /education/classrooms` no ve datos de Tenant A

---

## Criterio de Done

1. 6 schemas existen en `food-inventory-saas/src/schemas/edu-*.schema.ts`
2. 7 módulos existen en `food-inventory-saas/src/modules/edu-*/`
3. `npm run build` pasa sin errores
4. CRUD básico de classrooms funciona vía curl/Postman con tenant isolation verificado

---

## Anti-patrones a Evitar

- **No uses `studentIds: [{ type: Schema.Types.ObjectId, ref: 'Customer' }]`** — ref: 'EduStudent' (entidad propia)
- **No importes módulos entre sí** con dependencias circulares — si un módulo necesita datos de otro, usa el Model directamente o inyecta el service correctamente
- **No omitas el índice unique** en `edu-attendance` `{ tenantId, classroomId, date }` — previene duplicados de asistencia
- **No uses `new Date()` sin normalizar** para el campo `date` de attendance — normaliza a T12:00:00.000Z
- **No hagas `isDeleted: false`** para el campo de soft-delete — usa `{ isDeleted: { $ne: true } }` en las queries para manejar documentos legacy sin ese campo

---

## Referencia de Archivos

```
food-inventory-saas/
  src/
    schemas/
      edu-classroom.schema.ts      ← NUEVO
      edu-subject.schema.ts        ← NUEVO
      edu-schedule.schema.ts       ← NUEVO
      edu-grade.schema.ts          ← NUEVO
      edu-attendance.schema.ts     ← NUEVO
      edu-tuition-fee.schema.ts    ← NUEVO
    modules/
      edu-classrooms/              ← NUEVO
      edu-subjects/                ← NUEVO
      edu-schedules/               ← NUEVO
      edu-grades/                  ← NUEVO
      edu-attendance/              ← NUEVO
      edu-tuition/                 ← NUEVO
      edu-dashboard/               ← NUEVO (stub)
      payables/                    ← LEER como referencia
    app.module.ts                  ← MODIFICAR (añadir imports)
  src/schemas/customer.schema.ts   ← LEER como referencia de schema
```
