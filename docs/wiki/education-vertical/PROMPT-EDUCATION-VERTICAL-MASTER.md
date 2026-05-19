# PROMPT MAESTRO — Vertical EDUCATION SmartKubik

## Rol y Perfil del Ejecutor

Tienes experiencia en:
- Arquitectura de sistemas multi-tenant en NestJS 10 con Mongoose/MongoDB
- Diseño de sistemas de información estudiantil (SIS) y LMS (Moodle, Canvas, SAP Education)
- React 18 + Vite con design systems mobile-first (MUI 7, Radix, Framer Motion)
- Next.js 15 App Router con autenticación dual y portales multi-rol
- Neurociencia aplicada a UX: carga cognitiva, dopamine loops, progressive disclosure
- Patrones de ERP modular: soft-delete, tenant isolation, sequential numbers atómicos, event-driven NestJS

Cuando generas código:
- Nunca hardcodeas lógica que debería ser configurable por tenant
- Nunca usas `countDocuments()` para secuencias (siempre MAX+1)
- Siempre incluyes `tenantId` explícito en cada query Mongoose
- Siempre aplicas soft-delete con `{ isDeleted: { $ne: true } }`
- Nunca omites guards (`JwtAuthGuard + TenantGuard + PermissionsGuard`) en endpoints protegidos
- Nunca generas código de UI sin verificar que sigue el design system existente

---

## Contexto del Sistema (SmartKubik SaaS)

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

**Stack:**
- Backend: NestJS 10 + Mongoose + BullMQ + Socket.io + EventEmitter2 (puerto 3000)
- Admin: React 18 + Vite + MUI 7 + Radix + React Query + Framer Motion (puerto 5173)
- Storefront: Next.js 15 App Router multi-tenant por subdomain (puerto 3001)

**Arquitectura multi-tenant:**
- Cada tenant tiene `vertical` (enum) y `enabledModules` (flags booleanos)
- Las verticales definen qué módulos están activos: `food-inventory-saas/src/config/vertical-features.config.ts`
- Los perfiles de vertical están en: `food-inventory-saas/src/config/vertical-profiles.ts`
- El schema del tenant: `food-inventory-saas/src/schemas/tenant.schema.ts`

**Patrones obligatorios del repo:**
- Tenant isolation: todo query lleva `tenantId` — ver `docs/wiki/patterns/tenant-isolation.md`
- ObjectId vs String: usar `$in: [str, new ObjectId(str)]` — ver `docs/wiki/patterns/objectid-vs-string.md`
- Soft delete: `{ isDeleted: { $ne: true } }` — ver `docs/wiki/patterns/soft-delete-conventions.md`
- Secuencias: MAX+1 atómico, nunca countDocuments — ver `docs/wiki/patterns/sequential-number-races.md`
- Permisos: 4 fuentes a actualizar — ver `docs/wiki/patterns/adding-permissions-modules.md`

**Design system (Admin):**
- Hero component de referencia: `food-inventory-admin/src/components/mobile/home/TodayDashboard.jsx`
- Tokens CSS: `food-inventory-admin/src/App.css` + `food-inventory-admin/src/styles/mobile-tokens.css`
- Motion tokens: `food-inventory-admin/src/lib/motion.js` (listItem, STAGGER, DUR, EASE)
- Tokens clave: `var(--glass-subtle)`, `var(--gradient-primary)`, `var(--mobile-radius-xl)`, `var(--ring-active-glow)`
- Touch targets: 44px mínimo HIG, 48px cómodo, 56px para acciones críticas
- Haptics: `haptics.tap()` en acciones táctiles importantes

---

## Qué se Reutiliza Sin Tocar

| Módulo existente | Ubicación | Uso en educación |
|---|---|---|
| `payroll/*` (11 módulos) | `food-inventory-saas/src/modules/payroll*/` | Nómina, ausencias, vacaciones de profesores |
| `accounting/` | `food-inventory-saas/src/modules/accounting/` | Contabilidad general |
| `payments/`, `payment-requests/` | `food-inventory-saas/src/modules/payments*/` | Registro de cuotas y matrículas |
| `payables/`, `recurring-payables/` | `food-inventory-saas/src/modules/payables*/` | Gastos institucionales |
| `customers/` | `food-inventory-saas/src/modules/customers/` | Tutores/padres como Customers (pagan cuotas) |
| `whapi/` | `food-inventory-saas/src/modules/whapi/` | Notificaciones WhatsApp a tutores |
| `roles/`, `permissions/` | `food-inventory-saas/src/modules/roles/` | Control de acceso granular |

**NUNCA modifiques Customer.schema.ts para estudiantes.** Un alumno es una relación académica, no comercial. Los estudiantes tienen su propia entidad `EduStudent`.

---

## Qué se Construye

### Vertical y Permisos
- Añadir `"EDUCATION"` al enum `vertical` en `tenant.schema.ts`
- Bloque `EDUCATION` en `vertical-features.config.ts`
- 14 permisos `edu_*` en `permissions/constants.ts`

### Nuevos Schemas Mongoose (en `food-inventory-saas/src/schemas/`)
1. `edu-student.schema.ts` — entidad propia del alumno con auth
2. `edu-classroom.schema.ts` — salones/grupos académicos
3. `edu-subject.schema.ts` — materias por salón
4. `edu-schedule.schema.ts` — horarios semanales recurrentes
5. `edu-grade.schema.ts` — calificaciones por lapso/período
6. `edu-attendance.schema.ts` — asistencia diaria por salón
7. `edu-tuition-fee.schema.ts` — cuotas y matrículas

### Nuevos Módulos NestJS (en `food-inventory-saas/src/modules/`)
1. `edu-students/` — CRUD + auth (`POST /education/auth/student/login`)
2. `edu-classrooms/` — CRUD salones + roster + métricas
3. `edu-subjects/` — CRUD materias
4. `edu-schedules/` — CRUD horarios + validación de conflictos
5. `edu-grades/` — CRUD notas + flujo draft→publish
6. `edu-attendance/` — registro diario + listeners WhatsApp
7. `edu-tuition/` — cuotas + cron recordatorios + integración payments
8. `edu-dashboard/` — agregación ejecutiva con `$facet`

### Nuevo Componente Frontend Admin (en `food-inventory-admin/src/components/education/`)
- `EduDashboard.jsx`, `ClassroomManagement.jsx`, `ClassroomRoster.jsx`
- `ScheduleGrid.jsx`, `GradesManager.jsx`, `AttendanceSheet.jsx`
- `TuitionManagement.jsx`, `StudentRegistration.jsx`
- Mobile: `MobileAttendanceSheet.jsx`, `MobileGradeEntry.jsx`

### Nuevo Template Storefront (en `food-inventory-storefront/src/`)
- Template `EducationPortal` con portal dual: estudiantes + profesores
- 12 nuevas rutas en `app/[domain]/education/`

---

## EduStudent Schema — Diseño Exacto

```typescript
// food-inventory-saas/src/schemas/edu-student.schema.ts
{
  tenantId: Types.ObjectId,           // required, ref: Tenant
  firstName: string,                  // required
  lastName: string,                   // required
  email: string,                      // required, unique por tenant
  passwordHash: string,               // bcrypt, para auth storefront
  enrollmentNumber: string,           // MAX+1 secuencial, unique por tenant
  enrollmentDate: Date,               // required
  status: "enrolled"|"active"|"graduated"|"withdrawn"|"suspended",
  classroomId?: Types.ObjectId,       // ref: EduClassroom — salón actual
  academicYear: string,               // "2025-2026"
  guardianCustomerId?: Types.ObjectId, // ref: Customer (padre/madre que paga)
  guardian: {                          // embedded para notificaciones directas
    name: string,
    phone?: string,
    whatsapp?: string,
    email?: string
  },
  medicalNotes?: string,
  scholarshipType?: "full"|"partial",
  scholarshipPct?: number,
  photo?: string,                     // base64, como en Customer
  isDeleted: boolean,                 // default: false
  createdBy: Types.ObjectId
}
// Índices:
// { tenantId: 1, email: 1 } unique
// { tenantId: 1, enrollmentNumber: 1 } unique
// { tenantId: 1, classroomId: 1 }
// { tenantId: 1, isDeleted: 1 }
```

---

## Decisiones de Arquitectura Fijas (no negociar)

| Decisión | Valor | Razón |
|---|---|---|
| Estudiantes | `EduStudent` entidad propia | Dominio académico ≠ comercial |
| Auth alumnos | `POST /education/auth/student/login` | JWT con `type: "edu_student"` |
| Auth profesores | `POST /auth/login` (admin existente) | Users con `role.name: "TEACHER"` |
| Escala de notas | 1-20 configurable por tenant | Default venezolano, `passing: 10` |
| Storefront | Template `education` en storefront existente | Puerto 3001, comparte middleware |
| Profesores en nómina | `EmployeeProfile` en módulo `payroll/` | Sin modificar payroll |

---

## Flujo de Auth Dual en el Storefront

### Alumno
1. `POST /education/auth/student/login` (body: `{ email, password, tenantDomain }`)
2. Backend valida `EduStudent.email` + `bcrypt.compare(password, passwordHash)` + tenant match
3. Retorna JWT: `{ type: "edu_student", studentId, tenantId, name, academicYear }`
4. Frontend: `EducationAuthContext` almacena en `edu_auth_token`
5. Middleware Next.js protege `/education/student/*`: verifica `type === "edu_student"`

### Profesor
1. `POST /auth/login` (el admin existente en `food-inventory-saas/src/modules/auth/`)
2. Backend retorna JWT con claims del usuario incluyendo `role.name`
3. Frontend: `EducationAuthContext` detecta `role.name === "TEACHER"` → `isTeacher: true`
4. Middleware Next.js protege `/education/teacher/*`: verifica `role === "TEACHER"`

---

## Checklist de Completitud por Fase

| Fase | Descripción | Duración estimada |
|---|---|---|
| 0 | Scaffolding: vertical, enabledModules, permisos | 1-2 días |
| 1 | Schemas (sin EduStudent) + módulos CRUD base | 3-4 días |
| 2 | EduStudent + auth + rol TEACHER | 2-3 días |
| 3 | Horarios (conflictos) + calificaciones (draft/publish) | 3-4 días |
| 4 | Asistencia diaria + WhatsApp automatizado | 3-4 días |
| 5 | Dashboard admin + cuentas por cobrar | 2-3 días |
| 6 | Frontend admin: 8 componentes + mobile | 4-5 días |
| 7 | Storefront: template educativo dual | 4-5 días |

**Total estimado: 22-30 días de desarrollo**

---

## Anti-patrones a Evitar (bugs históricos del repo)

1. **Comparación ObjectId vs String:** siempre usar `$in: [id, new Types.ObjectId(id)]` o convertir
2. **countDocuments() para secuencias:** usar `MAX+1` con `findOne({ tenantId }).sort({ field: -1 }).select('field')`
3. **Queries sin tenantId:** toda query debe tener `{ tenantId, isDeleted: { $ne: true }, ...resto }`
4. **Tokens de fecha sin normalizar:** al guardar fechas, usar mediodía UTC (`T12:00:00.000Z`) para evitar bugs de timezone
5. **Guards faltantes:** cada controller que no es público debe tener `@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)`
6. **Módulo no registrado en app.module.ts:** siempre verificar que el nuevo módulo aparece en `imports`
7. **Permisos en solo 1 de 4 fuentes:** actualizar constants.ts + seed + migration + DB (ver `docs/wiki/patterns/adding-permissions-modules.md`)
8. **Imágenes como URL:** siempre base64, tracked en `tenant.usage.currentStorage`

---

## Uso de Esta Documentación

Para implementar cada fase, abre el archivo de prompt correspondiente:
- [PHASE-0: Scaffolding](phases/PHASE-0-scaffolding.md)
- [PHASE-1: Schemas y CRUD](phases/PHASE-1-schemas-crud.md)
- [PHASE-2: EduStudent + TEACHER](phases/PHASE-2-students-teacher-role.md)
- [PHASE-3: Horarios y Calificaciones](phases/PHASE-3-schedules-grades.md)
- [PHASE-4: Asistencia y WhatsApp](phases/PHASE-4-attendance-whatsapp.md)
- [PHASE-5: Dashboard y AR](phases/PHASE-5-dashboard-ar.md)
- [PHASE-6: Frontend Admin](phases/PHASE-6-frontend-admin.md)
- [PHASE-7: Storefront Educativo](phases/PHASE-7-storefront.md)

Cada archivo de fase es autocontenido: incluye todo el contexto necesario para implementarla en una ventana de contexto separada sin necesidad de leer otras fases.
