# 2026-06-16 — `normalizeRolePermissions` vació un rol admin (166 → 1 permiso)

**Severidad**: crítica (un tenant quedó sin permisos en prod; recuperado en minutos)
**Módulos afectados**: permissions, roles, migrations
**Tiempo a resolución**: ~5 min (gracias al backup que el propio script hizo antes de mutar)

## Síntoma

Durante la limpieza de la única `roles.permissions` con entradas tipo `string` en prod, correr la lógica de normalización dejó el rol `admin` de un tenant real (`69c71e7a40187515237b825d`, tenant `69c71e7840187515237b821f`) con **1 permiso de los 166 originales**. El reporte del script lo delató:

```
✅ role 69c71e7a... (name=admin): 166 -> 1 | convertidos=[] huérfanos_descartados=[166 ids]
```

## Root cause

La corrupción de `roles.permissions` en SmartKubik **no son nombres de permiso** (`"orders_create"`) — son **ObjectIds-hex stringificados** (`"68daec7a603499605b4006d5"`), referencias a `permissions._id` guardadas como String en vez de ObjectId.

`normalizeRolePermissions` asumía que todo `string` es un NOMBRE y lo resolvía contra un mapa `byName`. Como esos hex no son nombres, `byName.get()` devolvía `undefined` → los clasificaba como **huérfanos** y los **descartaba todos**. El rol quedó con el único elemento que ya era ObjectId.

Detalle que reduce el daño real: el login tolera estos strings vía un fallback en [`token.service.ts`](../../../food-inventory-saas/src/auth/token.service.ts) (líneas ~106-124) que castea String→ObjectId cuando el populate devuelve 0. Es decir, el rol "corrupto" **funcionaba**; el intento de limpiarlo es lo que casi lo rompe de verdad.

## Cómo se recuperó

El script de limpieza hacía `mongodump`-equivalente (dump JSON de los roles afectados) **antes** de mutar → `roles-corrupt-affected_2026-06-16T05-00-14-297Z.json`. Se restauró desde ahí convirtiendo correctamente cada hex→ObjectId validado contra la colección `permissions`. Resultado: **165 permisos** (1 era duplicado, deduplicado), 0 perdidos, `payment_requests_review` presente, 0 entradas string en toda la DB.

## Archivos tocados (fix)

- `food-inventory-saas/src/database/migrations/normalize-role-permissions.ts` — resolver cada string primero por `_id` (si es hex de 24 y existe el Permission) y luego por nombre; descartar solo huérfanos reales.

## Commit / PR

- `306945b43` — fix(permissions): normalizar también ObjectIds-hex stringificados, no sólo nombres
- Backfill/recuperación: operación manual con scripts puntuales (no commiteados); backups en `deployer@178.156.182.177:/home/deployer/smartkubik/backups/`.

## Prevención

- Pattern: [adding-permissions-modules](../patterns/adding-permissions-modules.md) (4 fuentes de verdad de permisos).
- **Regla de oro**: backup del documento **antes** de cualquier `updateMany`/`updateOne` sobre `roles` en prod. mongodump no está en el box → usar script Node con el driver de `~/smartkubik/api` + dump JSON.
- **Antes de correr una migración destructiva**: inspeccionar qué *son* los datos a "arreglar". Acá los strings parecían corrupción-por-nombre pero eran ObjectIds; un `find().limit(1)` previo lo habría revelado.
- `normalizeRolePermissions` vive en `runMigrations()`, que hace **early-return en producción** (`NODE_ENV=production`) — sólo corre en dev/staging. Por eso la corrupción de prod no se auto-arregla y la limpieza se hizo a mano.

## Notas

Memoria asociada: `roles-permissions-corruption` (las entradas string son ObjectIds-hex, no nombres). Lección: una migración "idempotente y 1:1" puede ser destructiva si asume mal la forma del dato. El backup-first fue lo único que evitó un incidente real de pérdida de permisos en prod.
