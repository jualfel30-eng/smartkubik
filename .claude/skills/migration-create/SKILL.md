---
name: migration-create
description: Scaffolding de migration MongoDB idempotente con plantilla up/down + dry-run + scope global o per-tenant. Reemplaza el ciclo manual de crear TS file + endpoint HTTP + POST manual que hoy se hace para cada migración.
trigger: /migration-create <name> [--scope global|tenant] [--dry-run-only]
---

# migration-create

## Cuándo invocar

- Necesitas migrar datos en MongoDB (backfill de campos nuevos, conversión de tipos, normalización, cleanup de huérfanos).
- Antes de marcar un campo como `required: true` en un schema con datos preexistentes.
- Después de detectar inconsistencias (ej: 72 supplierIds como String en lugar de ObjectId).

## Inputs

- **`name`** (requerido) — slug del migration (ej: `convert-supplierids-to-objectid`, `backfill-warehouse-defaults`).
- (opcional) `--scope global` (default) o `--scope tenant` — si es per-tenant, pide `tenantId` al ejecutar.
- (opcional) `--description "..."` — descripción humana corta.
- (opcional) `--dry-run-only` — el script generado no permite ejecución sin `--apply`.

## Lo que hace

1. Genera `scripts/migrations/<YYYY-MM-DD-HHMM>-<name>.ts` desde plantilla.
2. Plantilla incluye:
   - Conexión a Mongo desde env (`MONGODB_URI`).
   - Función `up()` con `dry-run` por default (no escribe sin `--apply`).
   - Función `down()` (rollback) o stub explícito si no es reversible.
   - Logs detallados a `scripts/migrations/_runs/<name>-<timestamp>.log`.
   - Verificación de conteos antes/después.
   - Si `--scope tenant`: validación de `tenantId` requerido como arg.
3. Añade entrada en `scripts/migrations/_index.md` con: fecha, nombre, descripción, scope, estado (created|tested|applied).
4. Imprime comandos sugeridos:
   ```
   # Dry-run (default)
   npx ts-node scripts/migrations/<file>.ts

   # Aplicar a producción
   MONGODB_URI=<prod-uri> npx ts-node scripts/migrations/<file>.ts --apply

   # Per-tenant
   MONGODB_URI=<prod-uri> npx ts-node scripts/migrations/<file>.ts --apply --tenantId=<id>
   ```

## Plantilla del archivo generado

```ts
// scripts/migrations/2026-XX-XX-<name>.ts
import { MongoClient, ObjectId } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const TENANT_ID = process.argv.find(a => a.startsWith('--tenantId='))?.split('=')[1];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');

  const client = await MongoClient.connect(uri);
  const db = client.db('test');

  const filter: any = { /* TODO: completar */ };
  if (TENANT_ID) filter.tenantId = new ObjectId(TENANT_ID);

  const before = await db.collection('<col>').countDocuments(filter);
  console.log(`Matched documents: ${before}`);

  if (!APPLY) {
    console.log('DRY RUN. Re-run with --apply to commit changes.');
    process.exit(0);
  }

  // TODO: operación de escritura
  // const result = await db.collection('<col>').updateMany(filter, { $set: ... });

  const after = await db.collection('<col>').countDocuments(filter);
  console.log(`After migration: ${after} matched.`);

  await client.close();
}

run().catch((err) => { console.error(err); process.exit(1); });
```

## Outputs

- 1 archivo TS en `scripts/migrations/`.
- Entrada en `scripts/migrations/_index.md`.
- Comandos run sugeridos en stdout.

## Side effects

- Solo crea archivos. NO ejecuta la migration.
- Ejecución es paso explícito del usuario con `--apply`.

## Verificación

```bash
ls scripts/migrations/<YYYY-MM-DD>*<name>.ts
cat scripts/migrations/_index.md | tail -5
```

## Convenciones

- Migrations son **inmutables** una vez aplicadas. Si necesitas cambiar, crea otra.
- Si una migration no tiene `down()` reversible, documentar explícitamente por qué.
- Toda migration aplicada en producción debe tener su entrada en `_index.md` actualizada con fecha de aplicación + tenant (si scope tenant).
