# Incidents log

Cada bug crítico resuelto se documenta aquí con: síntoma, root cause, archivos tocados, prevención (link a pattern + skill).

## 2026

### Junio
- [2026-06-16 — `normalizeRolePermissions` vació un rol admin (166 → 1)](./2026-06-16-normalize-role-permissions-wipeout.md)

### Mayo
- [2026-05-14 — `payment_requests_review` invisible en super-admin](./2026-05-14-payment-requests-permission-invisible.md)

### Abril
- [2026-04-06 — Multi-unit transfer orders](./2026-04-06-multi-unit-transfer-orders.md)
- [2026-04-02 — Transfer orders dispatch](./2026-04-02-transfer-orders-dispatch.md)
- [2026-04-01 — Supplier search pagination](./2026-04-01-supplier-search-pagination.md)
- [2026-04-01 — Missing customer record (Geomar Tarazona)](./2026-04-01-missing-customer-record.md)

### Marzo
- [2026-03-26 — Inventory warehouseId missing](./2026-03-26-inventory-warehouse-id-missing.md)
- [2026-03-26 — Legacy supplier update](./2026-03-26-legacy-supplier-update.md)
- [2026-03-26 — Supplier race condition (E11000)](./2026-03-26-supplier-race-condition.md)
- [2026-03-23 — Supplier-product linking](./2026-03-23-supplier-product-linking.md)
- [2026-03-14 — SKU "-VAR1" collision](./2026-03-14-sku-var1-collision.md)
- [2026-03-14 — Cross-product inventory contamination](./2026-03-14-cross-product-inventory.md)
- [2026-03-14 — Double stock on PO receipt](./2026-03-14-double-stock-decrement.md)

## Plantilla

```markdown
# YYYY-MM-DD — <título corto>

**Severidad**: crítica | alta | media
**Módulos afectados**: <lista>
**Tiempo a resolución**: <horas|días>

## Síntoma
<qué veía el usuario, qué error aparecía>

## Root cause
<causa real, no la apariencia>

## Archivos tocados
- `path/to/file.ts:LINE` — <qué cambió>

## Commit / PR
- <sha o link>

## Prevención
- Pattern: [<nombre>](../patterns/<slug>.md)
- Skill: [<nombre>](../../../.claude/skills/<slug>/SKILL.md)
- Test que evita regresión: <path>

## Notas
<contexto adicional, lecciones aprendidas>
```
