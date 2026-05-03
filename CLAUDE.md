# SmartKubik SaaS

Plataforma multi-tenant SaaS con 6 verticales (food inventory, restaurant, beauty, billing, payroll, marketing). Monorepo de 4 apps + CMS.

## Antes de tocar código (obligatorio)

1. **Lee [`docs/wiki/system-map.md`](docs/wiki/system-map.md)** — contratos frontend↔backend, gotchas de tipos (String vs ObjectId), mapa archivo→docs a actualizar. Es la fuente de verdad.
2. Si el módulo tiene historia de bugs, revisa [`docs/wiki/incidents/`](docs/wiki/incidents/README.md) y [`docs/wiki/patterns/`](docs/wiki/patterns/) antes de proponer cambios.
3. Cambios en `food-inventory-saas/src/modules/<X>/` exigen actualizar `docs/wiki/modules/<X>.md` y `system-map.md` en el mismo PR.

## Subproyectos

| Path | Stack | Puerto dev |
|---|---|---|
| [`food-inventory-saas/`](food-inventory-saas/) | NestJS 10 + Mongoose + BullMQ + Socket.io | 3000 |
| [`food-inventory-admin/`](food-inventory-admin/) | React 18 + Vite + MUI 7 + Radix + React Query | 5173 |
| [`food-inventory-storefront/`](food-inventory-storefront/) | Next.js 15 (App Router) | 3001 |
| [`restaurant-storefront/`](restaurant-storefront/) | Next.js 14 | 3002 |
| [`smartkubik-blog/`](smartkubik-blog/) | Next.js + Sanity v3 (frontend + studio internos) | 3003 |

Cada subproyecto tiene su propio `CLAUDE.md` con onboarding focal.

## Comandos clave

### Backend
```bash
cd food-inventory-saas
npm run start:dev         # nodemon en 3000
npm run build             # nest build
npm test                  # jest
npm run test:e2e          # jest E2E
npm run test:security     # 73 tests de seguridad
```

### Admin
```bash
cd food-inventory-admin
npm run dev               # vite en 5173
npm run build             # build prod
```

### Deploy (manual hoy, automatizado vía `/deploy-saas`)

```bash
# Backend
cd food-inventory-saas && npx nest build
rsync dist/ deployer@178.156.182.177:/home/deployer/smartkubik/api/dist/
ssh deployer@178.156.182.177 "pm2 reload smartkubik-api"

# Admin
cd food-inventory-admin && npm run build
rsync dist/ deployer@178.156.182.177:~/smartkubik/food-inventory-admin/dist/
```

**Path crítico PM2**: `/home/deployer/smartkubik/api/dist/main.js` — NO confundir con paths antiguos. Ver [`smartkubik_gotchas`](../../.claude/projects/-Users-jualfelsantamaria/memory/smartkubik_gotchas.md) en memoria.

## Skills disponibles

Definidas en [`.claude/skills/`](.claude/skills/) y agentes en [`.claude/agents/`](.claude/agents/).

| Skill | Trigger | Qué hace |
|---|---|---|
| `tenant-inspect` | `/tenant-inspect <id\|email\|slug>` | Snapshot de un tenant en prod |
| `migration-create` | `/migration-create <name>` | Scaffold migration MongoDB idempotente |
| `deploy-saas` | `/deploy-saas <admin\|saas\|all> [--dry-run]` | Deploy con pre/post checks + rollback |
| `incident-archive` | `/incident-archive [slug\|all]` | Migra bugs históricos del MEMORY.md a wiki |
| `ux-audit` | `/ux-audit <screenPath>` | Análisis UX/A11y de un componente |
| `ux-redesign` | `/ux-redesign <screen>` | Genera `PROMPT-*-REDESIGN.md` blueprint |
| `beta-test` | `/beta-test <feature\|flow>` | Invoca agente `beta-tester` (API-only) |

Hooks (automáticos):
- `preflight-tenant-safety` (PreToolUse Edit/Write sobre `*.service.ts`/`*.schema.ts`/`*.controller.ts`) — detecta queries sin `tenantId`, comparaciones ObjectId vs string, soft-delete inconsistente.
- `wiki-sync` (PostToolUse tras commits que tocan modules) — propone diff a system-map.md.

## Patterns conocidos (lectura obligada al tocar zonas relacionadas)

- [ObjectId vs String en queries](docs/wiki/patterns/objectid-vs-string.md) — usa `$in: [str, ObjectId]`
- [Generación segura de números secuenciales](docs/wiki/patterns/sequential-number-races.md) — MAX+1, no count+1
- [Búsqueda paginada server-side](docs/wiki/patterns/searchable-pagination.md) — async, no preload
- [Defaults defensivos para campos required añadidos](docs/wiki/patterns/legacy-required-fields.md)
- [Convenciones de soft-delete](docs/wiki/patterns/soft-delete-conventions.md) — `{ $ne: true }`
- [Multi-unit conversions](docs/wiki/patterns/multi-unit-conversions.md) — preservar `selectedUnit`/`conversionFactor`
- [Tenant isolation](docs/wiki/patterns/tenant-isolation.md) — todo query con `tenantId`

## Convenciones de commit

- Mensajes en español o inglés (consistencia con git log existente).
- Imperativo: "fix", "add", "update", "refactor", "chore", "docs".
- Subsistema cuando sea claro: `fix(suppliers): ...`, `feat(transfer-orders): ...`.
- NO `--no-verify` salvo petición explícita del usuario.

## Hooks activos

- `PostToolUse` Bash matcher `git commit *` → `scripts/wiki-change-detector.sh` (timeout 10s).
- (Próximamente) hooks de skills 4 y 5.

## Anchors del repo

- Server prod (Hetzner): `deployer@178.156.182.177`
- Mongo prod: connection string apunta a DB `test` (default), NO `food-inventory-saas`.
- Cloudflare WAF puede bloquear endpoints con nombres operativos sensibles (`/ship`, `/send`). Usar `/dispatch`, `/issue`, `/process`.
