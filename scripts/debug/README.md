# scripts/debug/

Scripts de inspección y debugging ad-hoc — NO son parte de ningún flujo automatizado de deploy/CI.

## Cuándo usar

- Investigar un tenant específico en MongoDB producción
- Verificar integridad de datos (warehouses, inventory, products)
- Buscar tenants por email o criterio
- Aplicar fixes puntuales a un tenant corrupto

## Política

- Estos scripts **leen prod por default** — modifica solo si lo dice explícito el nombre (ej: `fix-tenant.js`).
- **Eventualmente serán reemplazados** por la skill `/tenant-inspect` (ver `.claude/skills/tenant-inspect/SKILL.md`).
- No los uses en CI ni los referencies desde código de producción.

## Inventario

| Script | Propósito |
|---|---|
| `check-warehouses.js` | Lista warehouses de un tenant |
| `check-all-savage-tenants.js` | Inspecciona todos los tenants "savage" (clientes early adopter) |
| `debug-pos-matching.js` | Debug del POS matching (productos, inventario) |
| `find-savage-tenant.js` | Busca tenant savage por criterios |
| `find-tenant-by-email.js` | Busca tenant por email del admin |
| `fix-tenant.js` | Repara límites/counters de tenant corruptos (one-off) |
| `verify-savage-inventory.js` | Verifica inventarios del tenant savage |
| `verify-savage-products.js` | Verifica productos del tenant savage |
| `verify-specific-products.js` | Verifica un producto específico (one-off) |

## Cómo ejecutar

Todos requieren `MONGODB_URI` en env. Ejemplos:

```bash
MONGODB_URI=<prod> node scripts/debug/check-warehouses.js <tenantId>
MONGODB_URI=<prod> node scripts/debug/find-tenant-by-email.js <email>
```
