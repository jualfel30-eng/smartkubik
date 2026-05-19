# Pattern: Agregar permisos y módulos nuevos

> **Doc interno de desarrollo. NO destinado al tenant.**
> Última actualización: 2026-05-14 (tras el [incident](../incidents/2026-05-14-payment-requests-permission-invisible.md))

---

## El problema

Permisos en SmartKubik tienen **cuatro fuentes de verdad** desincronizadas. Si añades un permiso nuevo y olvidas uno solo de los cuatro, el resultado puede ser:

- El permiso existe en código y en DB pero **no aparece en el super-admin UI** (el tenant no puede otorgarlo a sus roles custom).
- El permiso aparece en super-admin pero **no se respeta** porque los controllers no lo declaran.
- Los tenants existentes nunca lo reciben (solo los nuevos vía seed).
- O peor: aparece en super-admin pero al guardarlo se borra porque el endpoint de update no lo reconoce.

Esta clase de bug es **silenciosa** — pasa el code review, pasa la build, pasa los tests. Solo se descubre cuando alguien con super-admin abre la pantalla y dice "¿dónde está mi permiso?".

## Las cuatro fuentes de verdad

| # | Archivo | Para qué sirve | Cuándo se lee |
|---|---|---|---|
| 1 | [`src/modules/permissions/constants.ts`](../../../food-inventory-saas/src/modules/permissions/constants.ts) → `ALL_PERMISSIONS` | Lista plana usada por `GET /api/v1/permissions` (público) y por el super-admin UI para mostrar "permisos disponibles" | En tiempo de request, sin ir a DB |
| 2 | [`src/database/seeds/permissions.seed.ts`](../../../food-inventory-saas/src/database/seeds/permissions.seed.ts) | Seed inicial para DBs nuevas (skips si ya hay permisos) | Una vez por DB nueva, al startup |
| 3 | `src/database/migrations/seed-*-permission.migration.ts` | Migración idempotente para DBs existentes — inserta el permiso + opcionalmente lo otorga a roles existentes | Manualmente vía `POST /migrations/<name>` o script standalone |
| 4 | DB collection `permissions` | Source de verdad del super-admin: `getTenantConfiguration` hace `permissionModel.find()` | En cada apertura de la pantalla de configuración del tenant |

> Las cuatro son **complementarias**, no alternativas. (1) es para fetching rápido, (2) para fresh installs, (3) para upgrades, (4) es el estado real.
>
> Hay una quinta: `BASELINE_PERMISSIONS` en [`super-admin.service.ts`](../../../food-inventory-saas/src/super-admin/super-admin.service.ts). Es un fallback de 3 permisos hardcoded que se backfillean cada vez que se abre Tenant Configuration. **NO la uses para permisos nuevos** — su único propósito es garantizar que no falten unos pocos permisos críticos. Si la tocas, sumas otra fuente de verdad y empeoras el problema.

## Checklist para agregar un permiso nuevo

Asumamos que vamos a agregar `inventory_export`.

### Backend

- [ ] **Constants** — agregar el string al final de `ALL_PERMISSIONS` en `src/modules/permissions/constants.ts`. Sin esto, `GET /permissions` no lo devuelve y el super-admin UI no lo muestra. **Este fue el bug del incident del 2026-05-14.**
- [ ] **Seed** — agregar el objeto `{ name, description, module }` al array `permissions` en `src/database/seeds/permissions.seed.ts`. Esto cubre **tenants nuevos**.
- [ ] **Migration** — crear `src/database/migrations/seed-<name>-permission.migration.ts` siguiendo el patrón de [`seed-payment-requests-review-permission.migration.ts`](../../../food-inventory-saas/src/database/migrations/seed-payment-requests-review-permission.migration.ts):
  1. Insert idempotente del permiso (`findOne` antes de `insertOne`)
  2. `updateMany` con `$addToSet` para otorgar a los roles relevantes (`admin`, `employee`, custom)
- [ ] **Migration controller** — registrar el migration provider en `src/database/migrations/migrations.module.ts` y exponer el endpoint en `migrations.controller.ts`.
- [ ] **Standalone script** — agregar `scripts/bootstrap-<feature>.ts` que corre la lógica sin necesidad de backend up, y entrada `npm run db:bootstrap:<feature>` en `package.json`. Esto evita fricción para devs trabajando localmente (no más juggling de JWT en curl).
- [ ] **Controller decorators** — `@Permissions("inventory_export")` en cada endpoint que lo requiera. Sin decorator, el permiso es decorativo.

### Admin frontend

- [ ] **Sidebar entry** — si el módulo merece una entrada propia en el sidebar, añadir a `food-inventory-admin/src/config/navLinks.js` con `permission: 'inventory_export'`.
- [ ] **Sidebar group** — incluir el `href` en el grupo apropiado de `food-inventory-admin/src/config/sidebarNavGroups.js`.
- [ ] **Badge counter** (opcional) — si el módulo tiene "pending items" surfacing, agregar al `useSidebarBadges` hook.
- [ ] **Permission gating** — los componentes deben hacer `useAuth().hasPermission('inventory_export')` para mostrar/ocultar UI. **NO** confiar en que el sidebar gate sea suficiente; un usuario puede llegar al endpoint por deep-link.

### Verification path

Antes de declarar "done":

1. Correr `npm run db:bootstrap:<feature>` localmente
2. Reiniciar backend (`npm run start:dev` con nodemon hot-reloads)
3. **Logout + login** del usuario test (sin esto el JWT viejo no incluye el permiso)
4. Abrir super-admin → Tenant Configuration → verificar que el permiso aparece bajo su módulo
5. Otorgarlo a un role custom desde la UI del super-admin → guardar → verificar que persiste
6. Como usuario del tenant con ese role, verificar que el sidebar entry / botón aparece

## Agregar un módulo nuevo (completo)

Cuando se agrega un módulo completo (e.g. Payment Requests, Loyalty, Tips), seguir el checklist de **permisos** (arriba) más:

### Backend

- [ ] Schema(s) en `src/modules/<x>/schemas/`
- [ ] Module file `<x>.module.ts` registrado en `app.module.ts`
- [ ] Controllers + services
- [ ] Migration para schema changes si afectan colecciones existentes (e.g. agregar campos opcionales con defaults)
- [ ] Wiki: `docs/wiki/modules/<x>/{overview,data-model,api-reference,functions}.md`
- [ ] System map: nueva sección §1.X en `docs/wiki/system-map.md`
- [ ] Si emite eventos: documentar en §6 de system-map
- [ ] Si expone endpoints públicos: documentar en §5

### Admin frontend

- [ ] Sidebar entry + grupo (ver arriba)
- [ ] API client wrapper en `src/lib/<x>Api.js`
- [ ] Hooks en `src/hooks/use-<x>.js`
- [ ] Páginas / componentes en `src/components/<x>/`
- [ ] Wiki: `docs/wiki/modules/<x>/admin.md` describiendo los surfaces

### Storefront (si aplica)

- [ ] Ruta en `food-inventory-storefront/src/app/<route>/`
- [ ] Middleware exemption si la ruta NO debe ser reescrita bajo `[domain]`
- [ ] API client wrapper en `src/lib/<x>.ts`
- [ ] Wiki: `docs/wiki/modules/<x>/portal.md` (o equivalente)

## Anti-patrones

### ❌ No agregar a `ALL_PERMISSIONS`
El bug del 2026-05-14. Lo más invisible que pasa: pasan los tests, pasa el build, los endpoints funcionan, pero el tenant **no puede ver ni otorgar el permiso desde super-admin**.

### ❌ Confiar en el seed para upgrades
`permissions.seed.ts` solo corre cuando la collection está vacía (`existingCount === 0`). Para DBs existentes (todos los entornos staging/prod más allá del día 1) necesitás la migración.

### ❌ Hardcodear permisos en frontend
El admin **no debe** mantener su propia lista de permisos. Toda decisión de "¿qué permisos existen?" debe venir de `GET /permissions` o del backend en general. Si tenés que renderizar una lista, fetch from API.

### ❌ Crear migrations sin standalone script equivalente
Las migrations HTTP endpoints son útiles para prod (con super-admin JWT + auditoría). Pero para dev local, obligar al dev a tener el backend up + un JWT válido + correr curl es fricción que termina en "no la corrí". Siempre proveer también un `npm run db:bootstrap:<feature>` que toque la DB directo.

### ❌ Olvidar el "logout + login" en el playbook
El JWT contiene el snapshot de `role.permissions` al momento del login. Otorgar un permiso a un role NO actualiza JWTs ya emitidos. Siempre incluir "logout + login" en cualquier walkthrough de verificación.

## Referencias

- Incident original: [2026-05-14 — payment_requests_review invisible en super-admin](../incidents/2026-05-14-payment-requests-permission-invisible.md)
- Implementación de referencia: [Payment Requests module](../modules/payment-requests/overview.md)
- Endpoints del super-admin: [`src/super-admin/super-admin.service.ts → getTenantConfiguration`](../../../food-inventory-saas/src/super-admin/super-admin.service.ts)
- Permissions service: [`src/modules/permissions/permissions.service.ts`](../../../food-inventory-saas/src/modules/permissions/permissions.service.ts)
