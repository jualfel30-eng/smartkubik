# Pattern: Convenciones de soft-delete

## El problema

SmartKubik usa tres patrones distintos de soft-delete a través de los 118 módulos:

- `isActive: boolean` (default `true`)
- `isDeleted: boolean` (default `false`, a veces `undefined` en docs viejos)
- `status: 'active' | 'inactive' | 'archived' | ...`

Algunos módulos usan dos a la vez (ej: `isActive` + `status`). Las queries que filtran "elementos vivos" rompen silenciosamente: un filtro `{ isDeleted: false }` excluye docs con `isDeleted: undefined`.

## Patrón a aplicar

### Filtro seguro para "no eliminado"

```ts
// CORRECTO: matchea false Y undefined
{ isDeleted: { $ne: true } }

// INCORRECTO: solo matchea false explícito
{ isDeleted: false }
```

Lo mismo aplica al opuesto:

```ts
// CORRECTO: matchea true Y string truthy
{ isActive: { $ne: false } }
```

### Convención por nuevo módulo

Para módulos NUEVOS (post-2026-04), usar **un solo campo**:

```ts
@Prop({ default: false })
isDeleted: boolean;

@Prop({ default: Date.now })
deletedAt?: Date;
```

Y filtrar siempre con `$ne: true`. No mezclar con `status` (que debe reservarse para estados de negocio: `pending|approved|cancelled`).

### Tabla de convención por módulo

Mantener actualizada en [system-map.md sección 2.3](../system-map.md). Resumen:

| Módulo | Campo soft-delete |
|---|---|
| products | `isActive` |
| customers | `isActive` |
| suppliers | `isActive` |
| inventory | `isDeleted` (con fallback `$ne: true`) |
| orders | `status: 'cancelled'` |
| transfer-orders | `status` (no soft-delete propio) |
| beauty-services | `isActive` |

### Helper compartido

```ts
// food-inventory-saas/src/common/utils/soft-delete.ts
export const notDeleted = () => ({ isDeleted: { $ne: true } });
export const isActive = () => ({ isActive: { $ne: false } });
```

## Cuándo NO aplica

- Colecciones con hard-delete por diseño (logs, eventos efímeros).
- Tablas de auditoría (no se borran nunca).

## Detección automática

La skill [`preflight-tenant-safety`](../../../.claude/skills/preflight-tenant-safety/SKILL.md) advierte cuando ve `{ isDeleted: false }` o `{ isActive: true }` literal sin `$ne`.

## Incidentes relacionados

- [2026-04-02 — Transfer orders dispatch](../incidents/2026-04-02-transfer-orders-dispatch.md) (incluyó fix de `isDeleted: undefined`)
