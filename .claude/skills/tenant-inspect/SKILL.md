---
name: tenant-inspect
description: Snapshot de un tenant en MongoDB producción. Recibe identificador (id, email admin, slug o nombre) y devuelve documento del tenant + conteos por colección clave + warehouses + módulos habilitados + último login. Reemplaza scripts ad-hoc dispersos como check-earlyadopter-tenant.sh y find-tenant-by-email.js.
trigger: /tenant-inspect <id|email|slug|name>
---

# tenant-inspect

## Cuándo invocar

- Necesitas saber el estado de un tenant en producción.
- Debugging: usuario reporta problema, primero quieres confirmar configuración del tenant.
- Antes de aplicar una migración por tenant, validar conteos pre/post.
- Investigar duplicados (ej: dos tenants con mismo nombre).

## Inputs

- **Identificador requerido**: una de estas formas:
  - `_id` MongoDB (24 hex chars)
  - email del admin (ej: `broas.admon@gmail.com`)
  - slug (ej: `tiendas-broas`)
  - nombre exacto (último recurso, puede haber duplicados)
- (opcional) `--collections <list>` — colecciones específicas a contar (default: products, inventory, orders, customers, suppliers, warehouses, users).
- (opcional) `--snapshot` — guardar JSON completo en `scripts/_inspections/<slug>-<timestamp>.json`.
- (opcional) `--readonly` — explícito (default es solo lectura, jamás escribe).

## Lo que hace

1. Carga `MONGODB_URI` desde env (`.env` del backend o config local). Verifica que apunta a prod.
2. Conecta a Mongo (DB `test`, no `food-inventory-saas` — ver smartkubik_gotchas).
3. Resuelve identificador:
   - Hex de 24 chars → busca por `_id`
   - Contiene `@` → busca por email del admin (`users.email` con `users.tenantId`)
   - Slug → busca por `tenants.slug`
   - Otro → búsqueda por `tenants.name` con regex case-insensitive (warning si encuentra >1)
4. Imprime documento del tenant: nombre, slug, plan, módulos habilitados, fecha de creación, status, businessLocations, paymentConfig.
5. Cuenta documentos por colección clave para ese tenantId.
6. Lista warehouses con su estado (default, activo).
7. Reporta último login del admin (`users.lastLoginAt`).
8. Si `--snapshot`: serializa todo a JSON.

## Outputs

Reporte markdown a stdout:

```markdown
## Tenant: Tiendas Broas, C.A. (TIE)
- _id: 69b187062339e815ceba7487
- slug: tiendas-broas
- plan: pro
- created: 2025-09-04
- status: active
- modules: products, inventory, orders, suppliers, accounting, payroll
- locations: 2 (Caracas, Valencia)

### Counts (tenantId scoped)
| Collection | Count |
|---|---|
| products | 142 |
| inventory | 138 |
| orders | 1,238 |
| customers | 87 |
| suppliers | 27 |
| warehouses | 2 |
| users | 5 |

### Warehouses
- Broas Almacén (default, activo) — 69b34dd1eda70c9386a111d8
- Sucursal Valencia — 69c7...

### Last admin login
- broas.admon@gmail.com — 2026-04-30 17:42 UTC
```

Si `--snapshot`: archivo JSON en `scripts/_inspections/<slug>-<timestamp>.json`.

## Side effects

- **Solo lectura**. Nunca modifica datos.
- Crea archivo en `scripts/_inspections/` solo si `--snapshot`.
- Log de invocación en `scripts/_skill-runs/tenant-inspect/<timestamp>.log` (para auditoría).

## Guardrails

- Refuse explícito si `MONGODB_URI` no está configurado.
- Si encuentra >1 tenant matcheando, lista todos y pide al usuario disambiguar (no asume).
- Logs nunca incluyen connection string completo (sanitiza credenciales).

## Implementación sugerida

Script TS auxiliar en `.claude/skills/tenant-inspect/scripts/inspect.ts` que use `mongodb` driver directo (no el ORM de Nest, que requiere arrancar la app).

```ts
// stub
import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI required');
const client = await MongoClient.connect(uri);
const db = client.db('test');
// ... resolución de tenant + conteos + impresión
```

Ejecutado con `npx ts-node` o compilado a JS.
