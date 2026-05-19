# FASE 7 — Storefront Educativo: Portal Dual Estudiantes/Profesores

## Prerequisito

Fases 0-6 completas: todos los endpoints backend operativos, frontend admin funcional.

## Rol del Ejecutor

Tienes experiencia en: Next.js 15 App Router con layouts anidados, autenticación dual (múltiples tipos de usuario en el mismo frontend), Server Components vs Client Components, diseño de portales de autoservicio mobile-first con UX fluida.

Aplicas neurociencia UX: progressive disclosure (solo muestras lo necesario en cada pantalla), feedback inmediato (el usuario sabe que su acción funcionó en < 300ms), zero friction login (el flujo de autenticación tiene el menor número de pasos posible), y visual hierarchy que guía la atención sin esfuerzo.

---

## Objetivo de Esta Fase

Crear el portal web para estudiantes y profesores en el storefront existente como un nuevo template `education`. Al terminar:
- Un alumno puede loguearse y ver su horario, calificaciones, asistencia y cuotas
- Un profesor puede loguearse y ver su horario, pasar lista y cargar calificaciones
- La landing del portal muestra la identidad visual de la institución educativa

---

## Contexto del Codebase

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

**LECTURA OBLIGATORIA antes de escribir código:**

1. `food-inventory-storefront/src/middleware.ts` — cómo se resuelve el tenant por subdomain
2. `food-inventory-storefront/src/contexts/AuthContext.tsx` — patrón de auth existente para clientes
3. `food-inventory-storefront/src/app/[domain]/login/page.tsx` — patrón de página de login existente
4. `food-inventory-storefront/src/lib/templateFactory.ts` — cómo se registran templates multi-vertical
5. `food-inventory-storefront/src/app/[domain]/page.tsx` — cómo se selecciona el template según config del tenant
6. Busca un template existente (BeautyStorefront, ModernEcommerce) — lee su estructura para replicar el patrón

---

## Estructura de Rutas a Crear

```
food-inventory-storefront/src/app/[domain]/education/
  layout.tsx                          — layout del portal educativo (EducationAuthContext, nav)
  page.tsx                            — landing pública con CTAs de acceso
  login/
    page.tsx                          — login compartido, detecta rol post-login

  teacher/
    layout.tsx                        — protege rutas de docente (verificar role=TEACHER)
    page.tsx                          — dashboard del docente (mi horario hoy, acciones rápidas)
    schedule/
      page.tsx                        — horario semanal completo
    attendance/
      page.tsx                        — pasar lista (selecciona salón + fecha)
    grades/
      page.tsx                        — mis materias con estado de notas por lapso
      [classroomId]/[subjectId]/
        page.tsx                      — carga/visualización de notas de una materia

  student/
    layout.tsx                        — protege rutas de alumno (verificar type=edu_student)
    page.tsx                          — dashboard del alumno
    schedule/
      page.tsx                        — mi horario semanal
    grades/
      page.tsx                        — mis calificaciones por materia y lapso
    attendance/
      page.tsx                        — mi registro de asistencia
    payments/
      page.tsx                        — mis cuotas: estado, historial de pagos
```

---

## Auth Context Educativo

Crea `food-inventory-storefront/src/contexts/EducationAuthContext.tsx` siguiendo el patrón de `AuthContext.tsx` pero con soporte dual:

```typescript
interface EducationUser {
  type: 'edu_student' | 'teacher';
  id: string;           // studentId o userId
  name: string;
  tenantId: string;
  academicYear?: string;
  role?: string;        // para teachers: "TEACHER"
}

interface EducationAuthContextType {
  user: EducationUser | null;
  isAuthenticated: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  login: (email: string, password: string, userType: 'student' | 'teacher') => Promise<void>;
  logout: () => void;
  token: string | null;
}
```

**Flujo de login:**
- `userType: 'student'` → llama a `POST /education/auth/student/login` → JWT con `type: "edu_student"`
- `userType: 'teacher'` → llama a `POST /auth/login` (admin auth) → JWT con `role.name: "TEACHER"`

Almacenar el token en `localStorage` con key `edu_auth_token` (separado del token de cliente estándar).

Decodifica el JWT (sin necesidad de call al backend) para extraer `type` y `role` y determinar `isStudent` / `isTeacher`.

---

## Layouts con Protección de Rutas

### `teacher/layout.tsx` — Guard de Docentes

```typescript
'use client';
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { isTeacher, isAuthenticated } = useEducationAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthenticated) router.replace('./login');
    else if (!isTeacher) router.replace('./login'); // alumno intentando acceder a ruta de docente
  }, [isAuthenticated, isTeacher]);
  
  if (!isTeacher) return null; // evitar flash de contenido
  
  return <TeacherNav>{children}</TeacherNav>;
}
```

### `student/layout.tsx` — Guard de Alumnos

Idéntico pero verifica `isStudent`.

---

## Componentes del Template (en `src/templates/EducationPortal/`)

### `EducationPortal.tsx` — Componente raíz del template

Renderiza la landing pública con:
- Logo e identidad visual de la institución (config del tenant)
- Hero con nombre de la institución y tagline
- 2 CTAs prominentes: "Acceso Estudiantes" y "Acceso Docentes"
- Información de contacto (si está configurada)

### `components/EduLoginForm.tsx`

Formulario de login con toggle "Soy Estudiante / Soy Docente":
```
┌────────────────────────────────┐
│       Logo Institución          │
│                                 │
│  ┌──────────┐  ┌─────────────┐ │
│  │ Estudiante│  │   Docente   │ │  ← Tab toggle
│  └──────────┘  └─────────────┘ │
│                                 │
│  Email: [________________]      │
│  Contraseña: [____________]     │
│                                 │
│  [     Iniciar Sesión     ]     │
└────────────────────────────────┘
```

- Un solo formulario, el toggle cambia el endpoint que se llama
- Feedback de error inmediato (< 300ms) si las credenciales son incorrectas
- Loading state en el botón mientras autentica

### `components/WeeklySchedule.tsx`

Grilla de horario semanal (lunes-viernes, bloques de hora):
- Para docentes: muestra sus clases con nombre del salón + materia
- Para alumnos: muestra sus materias con nombre del docente
- Resalta el bloque de hora actual (si el usuario está en clases)
- Mobile: lista vertical por día (no grilla — la grilla en mobile no funciona)

### `components/GradeCard.tsx`

Card de calificación por materia:
```
┌─────────────────────────────┐
│ Matemáticas              14 │  ← score prominente
│ Prof. García           / 20 │  ← maxScore sutil
│ ██████████░░░░░░░░░░ 70%   │  ← progress bar visual
│ ✓ Aprobado                  │  ← badge color
└─────────────────────────────┘
```

### `components/AttendanceSummary.tsx`

Resumen de asistencia del alumno:
```
┌─────────────────────────────┐
│ Asistencia   92%            │
│ ████████████████░░ 46/50    │
│ Presentes: 46  Ausentes: 3  │
│ Tarde: 1   Justificados: 0  │
└─────────────────────────────┘
```

### `components/TuitionStatusCard.tsx`

Estado de cuotas del alumno:
```
┌─────────────────────────────┐
│ Mayo 2026         VENCIDA   │  ← badge rojo
│ USD 150                     │
│ Vencida hace 12 días        │
├─────────────────────────────┤
│ Junio 2026       PENDIENTE  │  ← badge gris
│ USD 150                     │
│ Vence el 05/06/2026         │
└─────────────────────────────┘
```

---

## Páginas de Contenido

### `education/page.tsx` — Landing Pública

Server Component. Hace fetch de `GET /education/public/config/:domain` (endpoint que retorna nombre de institución, logo, colores — sin auth).

Si el tenant tiene `templateType: 'education'`, esta es la página de inicio del subdomain (reemplaza el ecommerce).

### `education/student/page.tsx` — Dashboard del Alumno

Client Component. Muestra:
1. Saludo personalizado + fecha
2. Próximas materias hoy (del horario semanal)
3. Cuotas con estado (1-3 cards con la más urgente primero)
4. Calificaciones recientes publicadas
5. % de asistencia del período actual

Orden basado en urgencia: cuota vencida → arriba; cuota pendiente → segundo; calificaciones → tercero.

### `education/teacher/page.tsx` — Dashboard del Docente

Client Component. Muestra:
1. Saludo + fecha
2. Clases de hoy (del horario) con botón "Pasar lista" en cada una
3. Notas pendientes de publicar (cuántas materias/lapsos tiene en draft)
4. Últimas listas de asistencia registradas

### `education/teacher/attendance/page.tsx` — Pasar Lista

Client Component optimizado para tablet:
1. Selector de salón (dropdown) + fecha (date picker, default hoy)
2. Lista de alumnos del salón seleccionado
3. Toggle P/A/T/J por alumno (botones grandes, ≥ 48px)
4. Contador en tiempo real de "X presentes, Y ausentes"
5. Botón "Guardar Asistencia" sticky al fondo
6. Feedback: toast de éxito con número de asistencias guardadas

---

## Modificaciones a Archivos Existentes

### `food-inventory-storefront/src/lib/templateFactory.ts`

Añadir el template `education`:
```typescript
import { EducationPortal } from '@/templates/EducationPortal/EducationPortal';

// En el map/switch de templates:
case 'education':
  return <EducationPortal config={tenantConfig} />;
```

Lee el archivo primero para entender la estructura exacta del factory.

### `food-inventory-storefront/src/app/[domain]/page.tsx`

Añadir la condición para redirigir al portal educativo:
```typescript
if (tenantConfig.templateType === 'education') {
  redirect(`/${domain}/education`);
}
```

Lee el archivo primero para encontrar el lugar correcto de inserción.

---

## Endpoint Backend Requerido para Esta Fase

Necesitas un endpoint público (sin auth) que retorne la configuración visual del tenant educativo:

```typescript
// GET /education/public/config/:domain
// Sin auth, solo el tenantDomain como parámetro
// Retorna: { institutionName, logoUrl, primaryColor, tagline, contactInfo }
// Este endpoint lo lee el Server Component de la landing page
```

Si el tenant ya tiene una config de branding en otro lugar del backend, usa esa. Si no existe, créalo en `edu-dashboard.controller.ts` como endpoint público.

---

## Checklist

- [ ] Leer `middleware.ts` para entender cómo se resuelve el dominio del tenant
- [ ] Leer `AuthContext.tsx` para replicar el patrón en `EducationAuthContext.tsx`
- [ ] Leer `templateFactory.ts` para entender cómo registrar el template
- [ ] Leer un template existente (BeautyStorefront o similar) para entender la estructura
- [ ] Crear `EducationAuthContext.tsx` con soporte dual (student/teacher)
- [ ] Crear `useEducationAuth()` hook
- [ ] Crear estructura de carpetas `app/[domain]/education/` con todos los archivos
- [ ] Crear `education/layout.tsx` con EducationAuthContext provider
- [ ] Crear `education/page.tsx` landing pública
- [ ] Crear `education/login/page.tsx` con EduLoginForm (toggle student/teacher)
- [ ] Crear `teacher/layout.tsx` con guard de rol TEACHER
- [ ] Crear `teacher/page.tsx` dashboard docente
- [ ] Crear `teacher/schedule/page.tsx` con WeeklySchedule
- [ ] Crear `teacher/attendance/page.tsx` optimizado para tablet
- [ ] Crear `teacher/grades/page.tsx` lista de materias con estado
- [ ] Crear `student/layout.tsx` con guard de tipo edu_student
- [ ] Crear `student/page.tsx` dashboard alumno (urgencia-first)
- [ ] Crear `student/schedule/page.tsx` con WeeklySchedule
- [ ] Crear `student/grades/page.tsx` con GradeCards
- [ ] Crear `student/attendance/page.tsx` con AttendanceSummary
- [ ] Crear `student/payments/page.tsx` con TuitionStatusCards
- [ ] Crear todos los componentes en `templates/EducationPortal/components/`
- [ ] Crear endpoint backend `GET /education/public/config/:domain` si no existe
- [ ] Modificar `templateFactory.ts` para registrar `'education'`
- [ ] Modificar `app/[domain]/page.tsx` para redirigir si `templateType === 'education'`
- [ ] Test: alumno logueado ve sus calificaciones y cuotas correctas
- [ ] Test: profesor logueado ve su horario y puede navegar a pasar lista
- [ ] Test: alumno intentando acceder a `/education/teacher/*` → redirigido a login
- [ ] Test: token expirado → redirige a login (no queda en loop)
- [ ] Verificar: todas las páginas renderizan en mobile (375px) sin scroll horizontal
- [ ] `npm run build` en `food-inventory-storefront/` — sin errores TypeScript

---

## Criterio de Done

1. `<tenant>.smartkubik.com/education` muestra la landing pública con el nombre de la institución
2. Login como estudiante → redirige a `/education/student` con calificaciones y cuotas reales
3. Login como profesor → redirige a `/education/teacher` con horario y acceso a pasar lista
4. Estudiante intentando acceder a `/education/teacher/grades` → redirigido a login
5. En mobile (375px), todas las páginas son usables sin scroll horizontal
6. `npm run build` pasa sin errores

---

## Anti-patrones a Evitar

- **No uses `localStorage` directamente** en Server Components — solo en Client Components o en el context
- **No hagas fetch de datos sensibles** (calificaciones, cuotas) en Server Components sin verificar el token server-side — usa la verificación del JWT en el middleware o en el layout
- **No muestres información de un alumno a otro** — cada query al backend debe incluir el `studentId` del usuario autenticado en el JWT, no como param de URL sin validar
- **No uses `useEffect` para la navegación post-login** — usa `router.push()` directamente en el handler del form submit para evitar flashes
- **No crees un sistema de auth paralelo completo** — reutiliza `jose` o `jsonwebtoken` (lo que ya use el repo) para decodificar el JWT y extraer claims sin network call

---

## Referencia de Archivos

```
food-inventory-storefront/
  src/
    app/[domain]/
      page.tsx                               ← MODIFICAR
      education/
        layout.tsx                           ← NUEVO
        page.tsx                             ← NUEVO (landing pública)
        login/page.tsx                       ← NUEVO
        teacher/layout.tsx                   ← NUEVO
        teacher/page.tsx                     ← NUEVO
        teacher/schedule/page.tsx            ← NUEVO
        teacher/attendance/page.tsx          ← NUEVO
        teacher/grades/page.tsx              ← NUEVO
        student/layout.tsx                   ← NUEVO
        student/page.tsx                     ← NUEVO
        student/schedule/page.tsx            ← NUEVO
        student/grades/page.tsx              ← NUEVO
        student/attendance/page.tsx          ← NUEVO
        student/payments/page.tsx            ← NUEVO
    contexts/
      AuthContext.tsx                        ← LEER (patrón)
      EducationAuthContext.tsx               ← NUEVO
    lib/
      templateFactory.ts                     ← MODIFICAR
      educationApi.ts                        ← NUEVO (fetch wrapper para endpoints edu-*)
    templates/
      EducationPortal/
        EducationPortal.tsx                  ← NUEVO
        components/
          EduHero.tsx                        ← NUEVO
          EduLoginForm.tsx                   ← NUEVO
          WeeklySchedule.tsx                 ← NUEVO
          GradeCard.tsx                      ← NUEVO
          AttendanceSummary.tsx              ← NUEVO
          TuitionStatusCard.tsx              ← NUEVO
    middleware.ts                            ← LEER (no modificar)
```
