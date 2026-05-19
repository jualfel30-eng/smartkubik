# FASE 6 — Frontend Admin: Pantallas Académicas

## Prerequisito

Fases 0-5 completas: todos los endpoints backend operativos y probados.

## Rol del Ejecutor

Tienes experiencia en: React 18 con React Query (TanStack Query), MUI 7, Radix UI, Framer Motion, design systems OKLCH, UX mobile-first con neurociencia aplicada (progressive disclosure, cognitive load reduction, dopamine loops via feedback inmediato).

Conoces el codebase SmartKubik: el design system está en App.css + mobile-tokens.css, el hero de referencia es TodayDashboard.jsx, y todas las interacciones táctiles usan `haptics.tap()`.

---

## Objetivo de Esta Fase

Crear las 8+ pantallas del panel admin para directores, secretarias y docentes, siguiendo exactamente el design system de SmartKubik.

---

## Contexto del Codebase

**Repositorio:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

**LECTURA OBLIGATORIA antes de escribir cualquier componente:**

1. `food-inventory-admin/src/components/mobile/home/TodayDashboard.jsx` — hero de referencia, patrón de KPI cards, AlertCards, motion tokens
2. `food-inventory-admin/src/App.css` — todos los tokens CSS (OKLCH colors, radius, shadows)
3. `food-inventory-admin/src/styles/mobile-tokens.css` — touch targets, safe areas, z-index
4. `food-inventory-admin/src/lib/motion.js` — tokens de animación (STAGGER, DUR, EASE, listItem)
5. Un hook de React Query existente: `food-inventory-admin/src/hooks/use-appointments.js` o similar — patrón de query
6. El routing en `food-inventory-admin/src/App.jsx` — cómo se añaden rutas lazy
7. La nav config: `food-inventory-admin/src/config/navLinks.js` — cómo se añaden secciones con `requiresVertical`
8. Un componente de tabla existente como referencia: busca en `food-inventory-admin/src/components/`

---

## Archivos a Crear

### Hooks (en `food-inventory-admin/src/hooks/`)

```
use-edu-classrooms.js    — CRUD classrooms + roster
use-edu-grades.js        — CRUD notas + publish
use-edu-attendance.js    — registro asistencia + reportes
use-edu-tuition.js       — cuotas + morosos + generate batch
use-edu-schedules.js     — CRUD horarios semanales
use-edu-students.js      — CRUD alumnos + matrícula
use-edu-dashboard.js     — summary del dashboard
```

Patrón de hook con React Query:
```javascript
// use-edu-classrooms.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client'; // o el cliente HTTP del repo

export function useEduClassrooms(filters = {}) {
  return useQuery({
    queryKey: ['edu-classrooms', filters],
    queryFn: () => apiClient.get('/education/classrooms', { params: filters }),
    staleTime: 30_000,
  });
}

export function useCreateClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/education/classrooms', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu-classrooms'] }),
  });
}
```

Verifica cómo están hechos los hooks existentes en el repo y replica el patrón exacto (puede usar axios, fetch, o una instancia del cliente HTTP del repo).

---

### Componentes Desktop (en `food-inventory-admin/src/components/education/`)

#### 1. `EduDashboard.jsx` — Dashboard del Director

**Patrón:** exactamente igual a `TodayDashboard.jsx`. Usa los mismos primitivos.

Estructura visual (mobile-first, stack vertical):
```
┌─────────────────────────────────────────┐
│  Buenos días, [nombre] · [fecha]         │
├─────────────────────────────────────────┤
│  [AnimatedNumber]  [AnimatedNumber]      │
│  Alumnos Activos   Solventes             │
│  [AnimatedNumber]  [AnimatedNumber]      │
│  Morosos           Asistencia Hoy %      │
├─────────────────────────────────────────┤
│  AlertCard: "N cuotas vencidas >30d"    │  ← rojo, CTA "Ver morosos"
│  AlertCard: "N lapsos sin publicar"     │  ← azul, CTA "Ver calificaciones"
│  AlertCard: "N cuotas vencen esta sem"  │  ← amarillo
├─────────────────────────────────────────┤
│  Salones hoy (lista UpcomingCard style) │
│  ┌──────────────────────────────────┐   │
│  │ 3er Grado A · Prof. García       │   │
│  │ 21/24 presentes · 6 morosos      │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

Tokens a usar:
- `var(--glass-subtle)` para cards de salón
- `var(--gradient-primary)` para CTA principal
- `var(--ring-active-glow)` para el salón con mayor asistencia hoy
- Framer Motion con `listItem` variant del motion.js para las cards

#### 2. `ClassroomManagement.jsx` — Lista de Salones

Tabla con columnas:
- Salón (grade + section + academicYear)
- Tutor asignado
- Alumnos (total / activos)
- Solventes / Morosos (badges color)
- Acciones: Ver roster, Editar, Asignar materias

Filtros: por año académico (select), por nivel (grade).

#### 3. `ClassroomRoster.jsx` — Lista de Alumnos del Salón

Tabla por salón con:
- Avatar (iniciales), Nombre completo, N° matrícula
- Badge solvente (verde) / moroso (rojo)
- % asistencia del período
- Promedio de notas (si hay calificaciones publicadas)
- CTA: Ver expediente, Ver cuotas

#### 4. `ScheduleGrid.jsx` — Grilla de Horarios

**Patrón base:** lee `PayrollCalendarTimeline.jsx` o `ShiftManagement.jsx` para entender la estructura de grilla temporal existente.

Vista semanal:
```
        Lunes    Martes   Mié     Jue     Viernes
07:00   ┌──────┐
        │ Mat. │
08:00   │ P.G. │  ┌────┐
        └──────┘  │His.│
09:00             └────┘
...
```

Toggle entre "Vista por Salón" y "Vista por Docente". Click en un bloque → sheet de detalle.

#### 5. `GradesManager.jsx` — Gestión de Calificaciones

Selector sticky arriba: Salón → Materia → Período.

Tabla de alumnos con inline edit de nota:
```
Alumno          | L1      | L2      | L3      | Final
García, María   | [14/20] | [ _/20] | [ _/20] | --
López, Pedro    | [18/20] | [ _/20] | [ _/20] | --
```

- El valor se actualiza on blur (sin botón de guardar por fila)
- Badge automático "Aprobado/Reprobado" al lado del input
- Botón "Publicar Lapso 1" al fondo — con modal de confirmación
- Estado visual: draft (gris), publicado (verde con lock icon)

#### 6. `AttendanceSheet.jsx` — Pasar Lista (Desktop)

Lista de alumnos del salón con toggles de estado:
```
García, María    [ P ] [ A ] [ T ] [ J ]   ← Presente/Ausente/Tarde/Justificado
López, Pedro     [ P ] [ A ] [ T ] [ J ]
```

Estado inicial: todos en P (opt-out más rápido que opt-in).
Botón "Guardar Asistencia" al fondo con confirmación.
Mostrar: fecha, salón, docente.

#### 7. `TuitionManagement.jsx` — Gestión de Cuotas

Tabla con filtros por: estado (pending/paid/overdue), salón, mes, año.

Columnas: Alumno, Salón, Tipo, Período, Monto, Vencimiento, Estado, Acciones.
Acciones por fila: "Registrar pago", "Enviar WhatsApp", "Exonerar".

Summary cards arriba (3):
- Total recaudado (período)
- Pendiente de cobro
- Vencido (rojo, urgente)

#### 8. `StudentRegistration.jsx` — Matrícula de Alumno

Formulario en 3 pasos (Stepper):
1. **Datos personales:** nombre, email, password inicial, fecha nacimiento
2. **Datos académicos:** año académico, salón, fecha de matrícula, tipo de beca
3. **Datos del tutor:** nombre, teléfono, WhatsApp, email

Validación inline en cada campo. Preview del `enrollmentNumber` generado.

---

### Componentes Mobile (en `food-inventory-admin/src/components/mobile/education/`)

#### `MobileAttendanceSheet.jsx` — Optimizado para Tablet del Docente

```
┌──────────────────────────────┐
│ ← 3er Grado A · Lun 19/05   │  ← TopBar
├──────────────────────────────┤
│ García, María                │
│ [PRESENTE] [AUSENTE] [TARDE] │  ← 3 botones grandes (56px height)
├──────────────────────────────┤
│ López, Pedro                 │
│ [PRESENTE] [AUSENTE] [TARDE] │
├──────────────────────────────┤
│     [ Guardar Lista ]        │  ← FAB sticky abajo
└──────────────────────────────┘
```

- Haptics: `haptics.tap()` al cambiar estado de cada alumno
- Al guardar: animación de éxito (patrón Celebration si existe en el repo)
- Todos inician en "Presente" por defecto (opt-out)

#### `MobileGradeEntry.jsx` — Carga de Notas en Tablet

```
┌──────────────────────────────┐
│ ← Matemáticas · Lapso 1      │
├──────────────────────────────┤
│ García, María                │
│ Nota: [____] / 20  ✓ Aprobado│
├──────────────────────────────┤
│ López, Pedro                 │
│ Nota: [____] / 20            │
├──────────────────────────────┤
│ [Guardar Borrador] [Publicar]│
└──────────────────────────────┘
```

- Badge "Aprobado/Reprobado" calculado en tiempo real al ingresar la nota
- "Publicar" abre modal de confirmación: "Esta acción es irreversible. ¿Publicar?"

---

### Modificaciones a Archivos Existentes

#### `food-inventory-admin/src/App.jsx`

Añadir al bloque de lazy imports (sigue el patrón existente):
```javascript
const EduDashboard = lazy(() => import('@/components/education/EduDashboard'));
const ClassroomManagement = lazy(() => import('@/components/education/ClassroomManagement'));
// ... etc
```

Añadir rutas (dentro de `TenantLayout`, en el grupo de rutas protegidas):
```jsx
<Route path="education">
  <Route index element={<EduDashboard />} />
  <Route path="classrooms" element={<ClassroomManagement />} />
  <Route path="classrooms/:classroomId/roster" element={<ClassroomRoster />} />
  <Route path="schedules" element={<ScheduleGrid />} />
  <Route path="grades" element={<GradesManager />} />
  <Route path="attendance" element={<AttendanceSheet />} />
  <Route path="tuition" element={<TuitionManagement />} />
  <Route path="students/new" element={<StudentRegistration />} />
</Route>
```

#### `food-inventory-admin/src/config/navLinks.js`

Lee el archivo para entender la estructura exacta (puede ser array de objetos con `href`, `icon`, `permission`, `children`, `requiresVertical`).

Añadir sección EDUCATION:
```javascript
{
  name: 'Académico',
  href: '/education',
  icon: GraduationCap,  // de lucide-react
  permission: 'edu_dashboard_read',
  requiresVertical: ['EDUCATION'],
  children: [
    { name: 'Dashboard', href: '/education', icon: LayoutDashboard, permission: 'edu_dashboard_read' },
    { name: 'Salones', href: '/education/classrooms', icon: School, permission: 'edu_classrooms_read' },
    { name: 'Horarios', href: '/education/schedules', icon: CalendarDays, permission: 'edu_schedules_read' },
    { name: 'Calificaciones', href: '/education/grades', icon: BookOpen, permission: 'edu_grades_read' },
    { name: 'Asistencia', href: '/education/attendance', icon: CheckSquare, permission: 'edu_attendance_read' },
    { name: 'Cuotas', href: '/education/tuition', icon: Receipt, permission: 'edu_tuition_read' },
    { name: 'Alumnos', href: '/education/students/new', icon: UserPlus, permission: 'edu_students_write' },
  ]
}
```

#### `food-inventory-admin/src/hooks/use-mobile-vertical.js`

Añadir `isEducation` al objeto retornado:
```javascript
const isEducation = verticalKey === 'education' || tenant?.vertical === 'EDUCATION';
// Añadir a return { ..., isEducation }
```

---

## Checklist

- [ ] Leer `TodayDashboard.jsx` completo antes de escribir `EduDashboard.jsx`
- [ ] Leer `App.css` y `mobile-tokens.css` para conocer todos los tokens disponibles
- [ ] Leer `motion.js` para conocer los tokens de animación (listItem, STAGGER, DUR, EASE)
- [ ] Leer un hook de React Query existente y replicar el patrón
- [ ] Crear los 7 hooks en `src/hooks/`
- [ ] Crear `EduDashboard.jsx` con patrón de TodayDashboard (KPIs animados + AlertCards + lista salones)
- [ ] Crear `ClassroomManagement.jsx` con tabla y filtros
- [ ] Crear `ClassroomRoster.jsx` con badges solvente/moroso
- [ ] Crear `ScheduleGrid.jsx` basado en el componente temporal existente
- [ ] Crear `GradesManager.jsx` con inline edit + estado draft/published + botón publicar
- [ ] Crear `AttendanceSheet.jsx` con toggles P/A/T/J + submit
- [ ] Crear `TuitionManagement.jsx` con summary cards + tabla + acciones
- [ ] Crear `StudentRegistration.jsx` con stepper de 3 pasos
- [ ] Crear `MobileAttendanceSheet.jsx` con haptics + FAB
- [ ] Crear `MobileGradeEntry.jsx` con badge en tiempo real + confirmación publish
- [ ] Modificar `App.jsx`: lazy imports + rutas `education/*`
- [ ] Modificar `navLinks.js`: sección EDUCATION con `requiresVertical`
- [ ] Modificar `use-mobile-vertical.js`: añadir `isEducation`
- [ ] Verificar: las rutas `education/*` solo aparecen en tenants con `vertical: "EDUCATION"`
- [ ] Verificar: todos los componentes renderizan sin errores en consola
- [ ] Verificar: touch targets ≥ 44px en todos los botones interactivos (inspector devtools)
- [ ] `npm run build` en `food-inventory-admin/` — sin errores TypeScript/JSX

---

## Criterio de Done

1. El director puede ver `EduDashboard` con KPIs reales del API
2. Desde `ClassroomManagement`, hacer click en un salón navega al `ClassroomRoster` con la lista de alumnos
3. El profesor puede abrir `MobileAttendanceSheet`, marcar ausentes, y guardar — la lista se persiste
4. `GradesManager` permite cargar notas y el botón "Publicar" muestra confirmación y luego bloquea edición
5. `npm run build` pasa sin errores

---

## Anti-patrones a Evitar

- **No copies los tokens como strings hardcodeados** ("border-radius: 12px") — siempre usa las variables CSS (`var(--mobile-radius-xl)`)
- **No hagas fetch directo con `fetch()`** si el repo usa un cliente HTTP centralizado — usa el mismo patrón que otros hooks
- **No uses `useEffect` + `setState` para data fetching** — usa React Query como el resto del proyecto
- **No hagas el mobile layout como afterthought** — diseña primero mobile, luego adapta desktop
- **No renderices N componentes pesados sin virtualización** para listas largas de alumnos (>50 filas) — usa `@tanstack/react-virtual` si el repo ya lo tiene, o pagina
- **No uses inline styles** excepto cuando no hay otra forma — siempre CSS classes o tokens via Tailwind/MUI

---

## Referencia de Archivos

```
food-inventory-admin/
  src/
    App.jsx                                  ← MODIFICAR (rutas + lazy imports)
    config/navLinks.js                       ← MODIFICAR (sección EDUCATION)
    hooks/
      use-mobile-vertical.js                 ← MODIFICAR
      use-edu-*.js                           ← NUEVO (7 hooks)
    components/
      education/                             ← NUEVO
        EduDashboard.jsx
        ClassroomManagement.jsx
        ClassroomRoster.jsx
        ScheduleGrid.jsx
        GradesManager.jsx
        AttendanceSheet.jsx
        TuitionManagement.jsx
        StudentRegistration.jsx
      mobile/
        education/                           ← NUEVO
          MobileAttendanceSheet.jsx
          MobileGradeEntry.jsx
      mobile/home/TodayDashboard.jsx         ← LEER (no modificar)
    lib/motion.js                            ← LEER
    App.css                                  ← LEER
    styles/mobile-tokens.css                 ← LEER
```
