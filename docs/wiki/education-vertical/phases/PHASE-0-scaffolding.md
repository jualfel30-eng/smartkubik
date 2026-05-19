# FASE 0 — Scaffolding Vertical EDUCATION

## Rol del Ejecutor

Tienes experiencia en: NestJS 10 multi-tenant, Mongoose schema design, sistemas de permisos granulares, y el codebase SmartKubik (ERP SaaS con 118 módulos).

Conoces las reglas: toda extensión al enum de verticales es append-only, los permisos deben actualizarse en 4 fuentes (constants, seed, migration, DB), y los `enabledModules` son flags booleanos en el schema del tenant.

---

## Objetivo de Esta Fase

Registrar la vertical `EDUCATION` en el sistema multi-tenant. Al terminar, debes poder:
1. Crear un tenant con `vertical: "EDUCATION"` desde el super-admin
2. Ver los 14 permisos `edu_*` en la pantalla de gestión de roles
3. Verificar que `enabledModules` tiene los flags correctos para un tenant EDUCATION

No hay funcionalidad académica en esta fase — solo la infraestructura de configuración.

---

## Contexto del Codebase

**Repositorio base:** `/Users/jualfelsantamaria/Documents/Saas/smartkubik/`

### Archivos a modificar (lee cada uno antes de editar)

1. `food-inventory-saas/src/schemas/tenant.schema.ts`
   - Busca el `enum` del campo `vertical` (aprox línea 284-296)
   - Busca la sección `enabledModules` (aprox líneas 326-393)

2. `food-inventory-saas/src/config/vertical-features.config.ts`
   - Busca el objeto `VERTICAL_FEATURES` o equivalente — contiene qué módulos activa cada vertical

3. `food-inventory-saas/src/config/vertical-profiles.ts`
   - Busca `VerticalKey` type — añadir `"education"`
   - Busca `verticalProfiles` o `VERTICAL_PROFILES` — añadir entrada `"education"`

4. `food-inventory-saas/src/modules/permissions/constants.ts`
   - Busca `ALL_PERMISSIONS` array — aquí viven todos los permisos del sistema

5. `food-inventory-saas/src/app.module.ts`
   - No modificar en esta fase, solo verificar que conoces la estructura de imports

### Nuevo archivo a crear

- `food-inventory-saas/src/scripts/migrations/bootstrap-education-permissions.ts`

---

## Cambios Exactos a Implementar

### 1. `tenant.schema.ts` — Añadir `"EDUCATION"` al enum de vertical

Localiza el campo `vertical` que tiene un enum similar a:
```
["FOOD_SERVICE", "RETAIL", "SERVICES", "LOGISTICS", "MANUFACTURING", "HOSPITALITY"]
```
Añadir `"EDUCATION"` al final del array. No reordenar los valores existentes.

También en la sección `enabledModules` (objeto con flags booleanos), añadir al final:
```typescript
// Education vertical
eduStudents: { type: Boolean, default: false },
eduClassrooms: { type: Boolean, default: false },
eduSubjects: { type: Boolean, default: false },
eduSchedules: { type: Boolean, default: false },
eduGrades: { type: Boolean, default: false },
eduAttendance: { type: Boolean, default: false },
eduTuition: { type: Boolean, default: false },
eduDashboard: { type: Boolean, default: false },
```

### 2. `vertical-features.config.ts` — Bloque EDUCATION

Añadir al objeto principal de features el bloque para EDUCATION. Basa la estructura en cómo están definidos FOOD_SERVICE o SERVICES (lee el archivo primero para conocer la estructura exacta).

El bloque EDUCATION debe:
- Activar: `accounting`, `payroll`, `bankAccounts`, `reports`, `hrCore`, `chat` (para WhatsApp)
- Activar todos los edu-*: `eduStudents`, `eduClassrooms`, `eduSubjects`, `eduSchedules`, `eduGrades`, `eduAttendance`, `eduTuition`, `eduDashboard`
- Desactivar: `inventory`, `orders`, `pos`, `tables`, `recipes`, `kitchenDisplay`, `ecommerce`, `appointments`, `production`, `bom`, `loyaltyProgram`
- `customers: true` (para los tutores/padres como Customers que pagan)

### 3. `vertical-profiles.ts` — Perfil `"education"`

Añadir `"education"` al tipo `VerticalKey`. Añadir entrada en el objeto de perfiles:

```typescript
education: {
  label: "Institución Educativa",
  description: "Colegios, academias, universidades — gestión académica y administrativa",
  baseVertical: "EDUCATION",
  icon: "GraduationCap",
  defaultUnits: ["alumno", "materia", "lapso"],
  gradeScale: { min: 1, max: 20, passing: 10 },  // configurable por tenant
  attributeSchema: [],
  defaultEnabledModules: {
    // Leer la estructura de otros perfiles para replicar el patrón exacto
  }
}
```

Adapta el objeto según la estructura real del archivo (léelo antes de escribir).

### 4. `permissions/constants.ts` — 14 permisos edu-*

Añadir al array `ALL_PERMISSIONS`:

```typescript
// Education vertical permissions
"edu_students_read",
"edu_students_write",
"edu_classrooms_read",
"edu_classrooms_write",
"edu_subjects_read",
"edu_subjects_write",
"edu_schedules_read",
"edu_schedules_write",
"edu_grades_read",
"edu_grades_write",
"edu_grades_publish",      // permiso especial: publicar/despublicar notas
"edu_attendance_read",
"edu_attendance_write",
"edu_tuition_read",
"edu_tuition_write",
"edu_dashboard_read",
```

**CRÍTICO:** Los permisos tienen 4 fuentes de verdad. Lee `docs/wiki/patterns/adding-permissions-modules.md` antes de continuar. Además de `constants.ts`, debes actualizar:
- El seed de permisos (busca el archivo de seeding de permissions)
- Crear un script de migration para añadirlos a tenants existentes si aplica
- La DB (el script de migration lo hace)

### 5. Migration script — `bootstrap-education-permissions.ts`

Crea un script idempotente que:
1. Busca todos los documentos de `Permission` con `name: { $in: [...los 16 edu permisos] }`
2. Para los que no existan, los crea con `upsert`
3. Imprime un resumen: cuántos creados, cuántos ya existían

Sigue el patrón de otros scripts en `food-inventory-saas/src/scripts/migrations/`. Lee 2-3 scripts existentes antes de crear este para replicar el patrón exacto (conexión a Mongoose, estructura, cierre de conexión).

---

## Checklist

- [ ] Leer `tenant.schema.ts` completo para entender estructura de `enabledModules`
- [ ] Añadir `"EDUCATION"` al enum `vertical` en `tenant.schema.ts`
- [ ] Añadir 8 flags `edu-*` a `enabledModules` en `tenant.schema.ts`
- [ ] Leer `vertical-features.config.ts` completo para entender estructura
- [ ] Añadir bloque `EDUCATION` en `vertical-features.config.ts` con módulos correctos
- [ ] Leer `vertical-profiles.ts` completo para entender estructura
- [ ] Añadir tipo `"education"` y perfil completo en `vertical-profiles.ts`
- [ ] Leer `permissions/constants.ts` y verificar formato del array
- [ ] Añadir los 16 permisos `edu_*` a `ALL_PERMISSIONS`
- [ ] Leer `docs/wiki/patterns/adding-permissions-modules.md` para las 4 fuentes
- [ ] Actualizar seed de permisos con los nuevos `edu_*`
- [ ] Crear `bootstrap-education-permissions.ts` idempotente
- [ ] Compilar backend (`npm run build` en `food-inventory-saas/`) — sin errores de TypeScript
- [ ] Ejecutar el script de migration en entorno de desarrollo
- [ ] Verificar: crear tenant EDUCATION en super-admin → `enabledModules.eduClassrooms: true`
- [ ] Verificar: los 16 permisos `edu_*` aparecen en la pantalla de gestión de roles

---

## Criterio de Done

El criterio de done es verificable, no subjetivo:

1. `GET /super-admin/tenants/:id` de un tenant EDUCATION retorna `enabledModules.eduClassrooms: true`
2. `GET /permissions` retorna 16 permisos con `name` que empieza en `edu_`
3. `npm run build` en `food-inventory-saas/` pasa sin errores TypeScript
4. Ningún módulo existente fue modificado (solo los 4 archivos listados + el nuevo script)

---

## Anti-patrones a Evitar

- **No reordenar** los valores existentes del enum `vertical` — podría romper datos existentes
- **No hardcodear** `enabled: true` para todos los módulos en EDUCATION — desactiva explícitamente los que no aplican (food, pos, restaurant, etc.)
- **No olvidar** las 4 fuentes de permisos — si solo actualizas `constants.ts`, los tenants existentes no verán los permisos nuevos
- **No crear** ningún schema o módulo NestJS en esta fase — eso es Fase 1

---

## Referencia Rápida de Archivos

```
food-inventory-saas/
  src/
    schemas/tenant.schema.ts
    config/vertical-features.config.ts
    config/vertical-profiles.ts
    modules/permissions/constants.ts
    scripts/migrations/bootstrap-education-permissions.ts  ← NUEVO
docs/wiki/patterns/adding-permissions-modules.md           ← LEER PRIMERO
```
