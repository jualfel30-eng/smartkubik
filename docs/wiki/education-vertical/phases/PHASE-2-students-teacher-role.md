# FASE 2 — EduStudent + Auth + Rol TEACHER

## Prerequisito

Fases 0 y 1 completas: vertical EDUCATION registrada, permisos `edu_*` en el sistema, 6 schemas y 7 módulos CRUD básicos funcionando.

## Rol del Ejecutor

Tienes experiencia en: autenticación JWT con NestJS (bcrypt, JwtService, Guards), diseño de entidades de usuario con credenciales propias, y el codebase SmartKubik.

Conoces: el sistema de roles/permissions del repo, cómo funcionan los JWT guards, y el patrón de sequential numbers con MAX+1 atómico.

---

## Objetivo de Esta Fase

1. Crear la entidad `EduStudent` como módulo propio (no es un Customer)
2. Implementar auth de estudiantes: `POST /education/auth/student/login`
3. Crear el rol `TEACHER` en el sistema de roles admin con sus permisos
4. Asegurar que el JWT de usuarios admin incluye `role.name` para que el storefront detecte docentes

---

## Decisión Arquitectónica Importante

**Los estudiantes son `EduStudent`, NO `Customer`.** Un alumno tiene una relación académica con la institución, no comercial. El schema `Customer` está diseñado para relaciones de compra-venta.

- `Customer` = tutores/padres que pagan cuotas (opcional, referenciado desde `EduStudent.guardianCustomerId`)
- `EduStudent` = el alumno, con sus credenciales propias, expediente académico, asistencia y calificaciones

---

## Contexto del Codebase

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

Antes de crear código, lee:
- `food-inventory-saas/src/schemas/customer.schema.ts` — referencia de cómo está hecho un "usuario" con credenciales en el repo (tiene `passwordHash`)
- `food-inventory-saas/src/modules/customers/customers-auth.controller.ts` — referencia del patrón de auth de storefront (si existe)
- `food-inventory-saas/src/modules/auth/auth.service.ts` — para entender cómo se generan los JWT en el sistema admin
- `food-inventory-saas/src/modules/roles/` — para entender cómo crear un nuevo rol con permisos

---

## Schema a Crear: `edu-student.schema.ts`

```
Ruta: food-inventory-saas/src/schemas/edu-student.schema.ts

Campos:
  tenantId: Types.ObjectId — required, ref: 'Tenant'
  firstName: string — required
  lastName: string — required
  email: string — required, unique por tenant
  passwordHash: string — required (bcrypt, generado al crear el estudiante)
  enrollmentNumber: string — required, generado automáticamente (MAX+1 por tenant)
  enrollmentDate: Date — required
  status: enum ["enrolled", "active", "graduated", "withdrawn", "suspended"] — default: "enrolled"
  classroomId?: Types.ObjectId — ref: 'EduClassroom' — salón actual
  academicYear: string — required ("2025-2026")
  guardianCustomerId?: Types.ObjectId — ref: 'Customer' — padre/madre que paga (opcional)
  guardian: {
    name: string
    phone?: string
    whatsapp?: string   ← se usa para notificaciones WhatsApp
    email?: string
  }
  medicalNotes?: string
  scholarshipType?: "full" | "partial"
  scholarshipPct?: number — 0-100
  photo?: string — base64
  isDeleted: boolean — default: false
  createdBy: Types.ObjectId — ref: 'User'
  timestamps: true

Índices:
  { tenantId: 1, email: 1 } — unique
  { tenantId: 1, enrollmentNumber: 1 } — unique
  { tenantId: 1, classroomId: 1 }
  { tenantId: 1, status: 1 }
  { tenantId: 1, isDeleted: 1 }
```

---

## Módulo a Crear: `edu-students`

```
food-inventory-saas/src/modules/edu-students/
  edu-students.module.ts
  edu-students.controller.ts      ← CRUD admin (crear, listar, editar, soft-delete)
  edu-students.service.ts         ← lógica de negocio + generación enrollmentNumber
  edu-auth.controller.ts          ← auth storefront (login de alumnos)
  edu-auth.service.ts             ← validación de credenciales + emisión de JWT
  dto/
    create-student.dto.ts
    update-student.dto.ts
    student-login.dto.ts
    student-filters.dto.ts
```

### Service — Lógica de `enrollmentNumber`

El `enrollmentNumber` es un número secuencial único por tenant. Usa MAX+1:

```typescript
async generateEnrollmentNumber(tenantId: string): Promise<string> {
  const last = await this.eduStudentModel
    .findOne({ tenantId: new Types.ObjectId(tenantId), isDeleted: { $ne: true } })
    .sort({ enrollmentNumber: -1 })
    .select('enrollmentNumber')
    .lean();

  if (!last) return '0001';

  const lastNum = parseInt(last.enrollmentNumber, 10);
  return String(lastNum + 1).padStart(4, '0');
}
```

**NUNCA uses `countDocuments()` para generar el número secuencial** — si hay estudiantes con isDeleted: true, el count sería menor que el MAX y generaría duplicados.

### Service — Creación con password

```typescript
async create(tenantId: string, dto: CreateStudentDto, createdBy: string) {
  const enrollmentNumber = await this.generateEnrollmentNumber(tenantId);
  const passwordHash = await bcrypt.hash(dto.password, 10);
  
  return this.eduStudentModel.create({
    ...dto,
    tenantId: new Types.ObjectId(tenantId),
    enrollmentNumber,
    passwordHash,
    createdBy: new Types.ObjectId(createdBy),
  });
}
```

### Auth Controller — Login de Alumnos

```typescript
// POST /education/auth/student/login
@Post('auth/student/login')
@Public()  // sin guard — es el endpoint de login
async studentLogin(@Body() dto: StudentLoginDto) {
  // 1. Busca EduStudent por email + tenantId
  // 2. Verifica bcrypt.compare(dto.password, student.passwordHash)
  // 3. Si ok, emite JWT con claims:
  //    { type: "edu_student", studentId, tenantId, name, academicYear }
  // 4. Si no, lanza UnauthorizedException
}
```

El JWT de alumnos es independiente del JWT admin. Usa el mismo `JwtService` del sistema pero con claims diferentes que permiten al storefront distinguir el tipo de usuario.

**Importante:** verifica que el `EduStudent.tenantId` coincide con el tenant del subdomain (el middleware del storefront lo valida, pero el backend también debe validarlo como segunda línea de defensa).

---

## Rol TEACHER en el Sistema Admin

### Crear el rol en el seed

Busca el archivo de seed de roles: `food-inventory-saas/src/modules/roles/seed/roles.seed.ts` o similar.

Añadir el rol `TEACHER`:
```typescript
{
  name: 'TEACHER',
  label: 'Docente',
  description: 'Acceso al portal docente: calificaciones, asistencia y horarios',
  permissions: [
    'edu_grades_read',
    'edu_grades_write',
    'edu_attendance_read',
    'edu_attendance_write',
    'edu_schedules_read',
    'edu_classrooms_read',
    'edu_students_read',    // para ver la lista de alumnos de sus clases
  ]
}
```

Crear script de migration: `food-inventory-saas/src/scripts/migrations/seed-teacher-role.ts`

### JWT con `role.name` para el storefront

Modifica `food-inventory-saas/src/modules/auth/auth.service.ts` para incluir `role.name` en el payload del JWT (si no está ya incluido).

El storefront verifica `jwtPayload.role === "TEACHER"` para redirigir al portal docente. Lee el auth.service.ts primero para ver qué ya incluye el JWT antes de añadir campos.

---

## Endpoint: `POST /education/classrooms/:id/students`

Además del CRUD de EduStudent, el servicio de classrooms debe permitir asignar alumnos:

En `edu-classrooms.service.ts`:
```typescript
async assignStudents(tenantId: string, classroomId: string, studentIds: string[]) {
  // Verificar que todos los studentIds pertenecen al mismo tenant
  // Actualizar EduStudent.classroomId para cada alumno
  // Actualizar EduClassroom.studentIds (push los nuevos, sin duplicados)
  // Retornar el classroom actualizado con count de alumnos
}
```

---

## Checklist

- [ ] Leer `customer.schema.ts` para entender patrón de usuario con credenciales
- [ ] Crear `edu-student.schema.ts` con todos los campos e índices
- [ ] Registrar EduStudent schema en `app.module.ts` (en el módulo de edu-students)
- [ ] Crear `edu-students.module.ts` con imports correctos (JwtModule si aplica)
- [ ] Crear `edu-students.service.ts` con `generateEnrollmentNumber()` usando MAX+1
- [ ] Crear `edu-students.controller.ts` con CRUD protegido por guards
- [ ] Crear `edu-auth.controller.ts` con `POST /education/auth/student/login` (endpoint público)
- [ ] Crear `edu-auth.service.ts` con bcrypt.compare y JwtService.sign
- [ ] Crear DTOs: `create-student.dto.ts`, `student-login.dto.ts`
- [ ] Leer `roles/seed/roles.seed.ts` o equivalente
- [ ] Añadir rol `TEACHER` con permisos correctos en el seed de roles
- [ ] Crear script `seed-teacher-role.ts` y ejecutarlo
- [ ] Leer `auth/auth.service.ts` para verificar qué incluye el JWT actual
- [ ] Modificar `auth.service.ts` para incluir `role.name` en el JWT payload si no está
- [ ] Registrar `edu-students` en `app.module.ts`
- [ ] Implementar `POST /education/classrooms/:id/students` en edu-classrooms
- [ ] Test: crear EduStudent → `enrollmentNumber` es único y secuencial
- [ ] Test: login con credenciales correctas → JWT retornado con `type: "edu_student"`
- [ ] Test: login con password incorrecta → 401
- [ ] Test: EduStudent de Tenant A no aparece en lista de Tenant B
- [ ] `npm run build` — sin errores TypeScript

---

## Criterio de Done

1. `POST /education/students` crea un EduStudent con `enrollmentNumber: "0001"` para el primer alumno del tenant
2. `POST /education/auth/student/login` retorna JWT con `type: "edu_student"` cuando las credenciales son correctas
3. `POST /education/auth/student/login` retorna 401 con credenciales incorrectas
4. Usuario con rol `TEACHER` existe en el sistema y tiene los permisos correctos
5. `npm run build` pasa sin errores

---

## Anti-patrones a Evitar

- **No guardes la password en texto plano** — siempre `bcrypt.hash(password, 10)` antes de persistir
- **No retornes `passwordHash`** en ningún endpoint GET de EduStudent — excluirlo del select
- **No uses countDocuments()** para el enrollmentNumber — usa MAX+1 como se muestra arriba
- **No mezcles** el JWT de EduStudent con el JWT admin — son tokens con claims diferentes
- **No olvides** actualizar `app.module.ts` para registrar el nuevo módulo `edu-students`
- **No añadas** campos académicos al schema Customer — está explícitamente fuera del alcance

---

## Referencia de Archivos

```
food-inventory-saas/
  src/
    schemas/
      edu-student.schema.ts          ← NUEVO
    modules/
      edu-students/                  ← NUEVO
        edu-students.module.ts
        edu-students.controller.ts
        edu-students.service.ts
        edu-auth.controller.ts
        edu-auth.service.ts
        dto/...
      auth/auth.service.ts           ← MODIFICAR (añadir role.name al JWT)
      roles/seed/roles.seed.ts       ← MODIFICAR (añadir TEACHER)
    scripts/migrations/
      seed-teacher-role.ts           ← NUEVO
    app.module.ts                    ← MODIFICAR
  
  Lectura de referencia:
    src/schemas/customer.schema.ts
    src/modules/customers/customers-auth.controller.ts (si existe)
    src/modules/auth/auth.service.ts
    src/modules/roles/ (estructura completa)
```
