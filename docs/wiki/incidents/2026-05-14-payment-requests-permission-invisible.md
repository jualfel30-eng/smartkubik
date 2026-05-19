# 2026-05-14 — `payment_requests_review` invisible en super-admin

**Severidad**: alta (feature no testeable post-deploy)
**Módulos afectados**: payment-requests, super-admin, permissions
**Tiempo a resolución**: ~30 min una vez identificado, pero **+18h perdidas** asumiendo que la feature estaba lista cuando no lo estaba

## Síntoma

Tras completar PR1 (backend) + PR2 (storefront) + PR3 (admin UI) del módulo Payment Requests, el super-admin no podía ver el permiso `payment_requests_review` en la pantalla de Tenant Configuration. El tenant tampoco podía otorgar el permiso a roles custom desde la UI. La feature parecía "no instalada" pese a tener:

- Backend deployed con el módulo
- Admin deployed con el sidebar entry, badge, sheet, etc.
- Storefront deployed con el portal
- Seed file modificado con el nuevo permiso
- Migración creada e idempotente
- Build green + 30/30 tests passing en los 3 repos

## Root cause

Los permisos en SmartKubik tienen **cuatro fuentes de verdad** complementarias. El permiso fue agregado en tres de ellas y omitido en una:

| # | Fuente | Estado tras PR1 |
|---|---|---|
| 1 | `src/modules/permissions/constants.ts` → `ALL_PERMISSIONS` | ❌ **OMITIDO** |
| 2 | `src/database/seeds/permissions.seed.ts` | ✓ Agregado |
| 3 | Migration `seed-payment-requests-review-permission.migration.ts` | ✓ Agregado |
| 4 | DB collection `permissions` (vía la migración) | Solo tras correr la migración |

La fuente (1) es la que **el endpoint público `GET /api/v1/permissions` devuelve** sin tocar la DB. El super-admin UI consume este endpoint vía el frontend en `TenantConfigurationEdit.jsx` (vía `/super-admin/tenants/:id/configuration` que retorna `allPermissions` desde la DB — pero solo si el permiso existe en DB, lo cual requería correr la migración primero).

Aún corriendo la migración, el endpoint público quedaba retornando una lista que excluía `payment_requests_review`, lo que generaba inconsistencias visibles en cualquier UI que consumiera ese endpoint.

## Cómo se descubrió

El usuario abrió super-admin con permisos completos, fue a Tenant Configuration, y no encontró el permiso en la lista. Después de varias rondas de "está completo" + "no aparece", el inspeccionar del código reveló la lista hardcoded en `constants.ts`.

## Por qué pasó

1. **Múltiples fuentes de verdad sin documentación**: la existencia de `ALL_PERMISSIONS` no estaba documentada en ningún pattern doc, README, ni CLAUDE.md. Solo aparecía leyendo el código del módulo permissions.
2. **El test suite no cubre la integración entre fuentes**: los unit tests del módulo de payment-requests verifican que el permiso se valida correctamente cuando está presente, pero no que esté presente en `ALL_PERMISSIONS`.
3. **El bug es silencioso**: el módulo funciona correctamente en todas las pruebas backend (los endpoints respetan `@Permissions("payment_requests_review")`), y el frontend renderiza correctamente cuando un JWT contiene el permiso. Solo falla en la pantalla de _otorgar el permiso_, que ningún test e2e cubría.
4. **Asunción incorrecta de mi parte**: asumí que la migración + el seed cubrían todo. No leí el código del super-admin antes de declarar "done".

## Archivos tocados (fix)

- `food-inventory-saas/src/modules/permissions/constants.ts` — agregado `"payment_requests_review"` al array `ALL_PERMISSIONS`
- `food-inventory-saas/scripts/bootstrap-payment-requests.ts` — script standalone idempotente que corre las dos migraciones sin necesidad de backend up ni JWT
- `food-inventory-saas/package.json` — entry `npm run db:bootstrap:payment-requests`

## Prevención

### Pattern doc obligatorio
- [`docs/wiki/patterns/adding-permissions-modules.md`](../patterns/adding-permissions-modules.md) — checklist con las 4 fuentes de verdad + verification path.

### Reglas en CLAUDE.md
- `food-inventory-saas/CLAUDE.md` actualizado con sección "Agregar permisos / módulos" linkeando al pattern.

### Standalone scripts como standard
Toda migración HTTP debe tener su gemelo standalone en `scripts/` + `package.json`. La fricción de "correr la migración" no debe requerir backend up + JWT en mano. Esto reduce el "deferred ops" — pasos operacionales que se olvidan y crean estados inconsistentes.

### Checklist de verificación final
Antes de declarar "feature complete":
1. Correr el bootstrap script localmente
2. Login fresh como super-admin → ver el permiso en Tenant Configuration
3. Otorgarlo a un role custom → guardar → recargar → permiso sigue ahí
4. Login fresh como usuario del tenant → ver el sidebar entry / botón

Sin estos 4 pasos verificados visualmente, no es "done".

## Notas

Lo que más costó no fue el bug — eran 10 LOC para arreglarlo. Lo que costó fueron las **18+ horas trabajando bajo la asunción incorrecta de que la feature estaba completa** porque "build green + tests passing" engaña cuando los tests no cubren la integración con surfaces de UI que no son del feature mismo.

**Lección operativa**: para features que tocan permisos / módulos / superficies del super-admin, no confiar nunca en CI green como señal de done. El verification path manual con super-admin + tenant logueado es el único señal real.
