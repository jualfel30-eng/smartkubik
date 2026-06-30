# SmartKubik SaaS

Plataforma multi-tenant SaaS con 6 verticales (food inventory, restaurant, beauty, billing, payroll, marketing). Monorepo de 4 apps + CMS.

## Razonamiento obligatorio antes de cualquier tarea no trivial

**Este bloque tiene prioridad sobre todo lo demás. Sin excepción.**

Antes de proponer un enfoque, generar un blueprint, escribir código o ejecutar cualquier tarea que no sea trivial, debes escribir explícitamente:

1. **PROBLEMA REAL**: Qué necesita lograr el usuario — en sus términos, no en términos técnicos. Si no puedes articularlo con claridad, pregunta antes de continuar.
2. **ENFOQUE**: Cómo lo que vas a hacer resuelve ese problema específico. Conexión directa, no genérica.
3. **LO QUE NO VAS A HACER**: Qué estás descartando y por qué. Si un skill, template o herramienta genera output que no conecta directamente con el problema real, descártalo y replantea.
4. **RIESGO**: Qué podría salir mal o no resolver realmente el problema.

Luego **espera confirmación explícita** antes de ejecutar.

**Regla de corte**: Si no puedes conectar el punto 1 con el punto 2 de forma directa y honesta, NO ejecutes. Replantea primero y dilo.

**Por qué existe esta regla**: En el pasado se ejecutaron tareas de forma descerebrada — aceptando output de skills y blueprints sin evaluar si realmente resolvían lo que el usuario necesitaba. El resultado fue trabajo que parecía completo pero no resolvía el problema real. Esto no puede volver a ocurrir.

## Regla de evidencia y ejecución (la más dura — nace de un fallo real)

**Origen**: se afirmó que un módulo "faltaba" (comisiones por profesional) sin investigarlo, y se empezó a construir infraestructura paralela de algo que **ya existía y funcionaba** (`commission.service.ts` → `calculateServiceCommission`). El protocolo escrito no bastó. Estas reglas convierten "investiga antes" en algo exigible, no opcional.

1. **Sin prueba, no existe.** No puedes afirmar que algo "falta", "ya existe", "está roto", "no está cableado" o "hay que construirlo" sin pegar, en el MISMO mensaje, la evidencia que lo respalda: el `grep`, el `archivo:línea`, o el output del comando/query. Una afirmación sin su prueba pegada **es nula**. Si no tienes la prueba, no afirmes: investiga primero o di "no lo sé aún".
2. **Plan mode primero para lo no-trivial.** Antes de editar/crear código en una tarea no-trivial, entra en plan mode: entrega un informe **con evidencia (citas file:línea)** y el plan, y espera aprobación explícita antes de tocar código. En plan mode no se edita — es un freno físico, no una promesa.
3. **Una rebanada a la vez. Prohibidos los "epics" de un tirón.** Hecho verificado → cambio mínimo → verificar (DoD) → parar y reportar. Nunca encadenes una premisa sin verificar en una construcción de varios archivos. El daño máximo de un turno debe ser pequeño y reversible.
4. **Gate automático** (`.claude/hooks/evidence-gate.js`, PreToolUse): bloquea Edit/Write a código fuente si en el turno no hubo investigación (Read/Grep/Bash). Es un backstop crudo — NO juzga si investigaste lo *suficiente* (eso lo cubren 1-3). Si te bloquea, no lo rodees con un Read de adorno: investiga de verdad.

**Estas reglas aplican incluso cuando el usuario dice "hazlo ya" / "aplica todo": "ya" significa "investiga y muéstrame la evidencia, rápido" — nunca "sáltate la verificación".**

## Antes de tocar código (obligatorio)

1. **Lee [`docs/wiki/system-map.md`](docs/wiki/system-map.md)** — contratos frontend↔backend, gotchas de tipos (String vs ObjectId), mapa archivo→docs a actualizar. Es la fuente de verdad.
2. Si el módulo tiene historia de bugs, revisa [`docs/wiki/incidents/`](docs/wiki/incidents/README.md) y [`docs/wiki/patterns/`](docs/wiki/patterns/) antes de proponer cambios.

## La Wiki es contrato, no adorno (regla dura — nace de un fallo real)

**Origen**: se cambió el comportamiento de impresión de etiquetas (toggle de unidad de venta) y casi se da por terminado sin tocar el wiki. Si los cambios no se documentan, el wiki miente y la próxima persona (o IA) toma decisiones con información falsa.

**La regla, sin excepción:** *cualquier cambio que altere cómo funciona el software para el usuario debe reflejarse en el wiki, en el mismo PR.* No es opcional ni "para después". Esto incluye:

- **Backend** — cambios en `food-inventory-saas/src/modules/<X>/`: actualiza `docs/wiki/modules/<X>/` (functions/api-reference/flows/data-model según aplique) y `system-map.md`.
- **Frontend** — cambios de comportamiento, flujo o UI en `food-inventory-admin/` (o storefronts): documenta la función en el módulo del wiki al que pertenece la pantalla (ej. el Asistente de Etiquetas vive en `modules/inventory/functions.md` porque el componente está en `components/inventory/`). Si toca un patrón global, ver `docs/wiki/frontend/`.
- **Comportamiento nuevo o modificado** (un toggle, un default, una regla de negocio, un campo): describe qué hace, cuándo se usa, el paso a paso y el "por detrás" (archivos/endpoints). Si el cambio invierte el comportamiento anterior, dilo explícitamente (ej. "antes salía siempre; ahora oculto por default").

**Criterio de corte (forma parte del Definition of Done):** una tarea de código que cambió comportamiento **no está terminada** hasta que el wiki refleje ese comportamiento. Si no actualizaste el wiki, no reportes "listo". Si dudas de dónde va, busca el módulo más cercano al archivo tocado; si de verdad no existe lugar, créalo — nunca lo dejes sin documentar.

## Definition of Done — verificación obligatoria

**Una tarea de código NO está terminada hasta pasar el gate contra los oráculos duros del repo.** No reportes "listo" ni "verde" hasta que esto se cumpla y se haya corrido de verdad (no de memoria).

El gate, por proyecto:

| Proyecto | Typecheck | Lint (no muta, solo cambios) | Tests |
|---|---|---|---|
| `food-inventory-saas` | `npm run typecheck` | `npm run lint:changed` | `npm test` (de los módulos tocados) |
| `food-inventory-admin` | `npm run typecheck` | `npm run lint:changed` | `npm test` (vitest) |

Reglas:
- **Typecheck verde es innegociable.** `npm run typecheck` corre `tsc --noEmit` con baseline de deuda conocida (ver abajo). Cualquier error de tipos **nuevo, fuera de la deuda, bloquea** — exit ≠ 0.
- **Lint del gate es solo-archivos-cambiados, sin `--fix`.** `npm run lint:changed` corre eslint únicamente sobre los archivos que tocaste (diff vs HEAD + staged + nuevos) y NO muta. Motivo: el repo arrastra deuda de lint/formato legacy enorme (~17.000 problemas en backend, ~650 en admin), casi toda resoluble con `--fix`; lintear todo el repo como gate es inservible. El estándar es **"el archivo que tocaste queda limpio"**, no "todo el repo limpio". El `npm run lint` (backend, con `--fix`) reescribe archivos en silencio — NO lo uses dentro de un loop de verificación; sirve solo para auto-formatear a mano. `npm run lint:check` (backend) es el eslint repo-wide manual, está rojo por la deuda legacy y NO es gate.
- **Tests con honestidad de cobertura.** La cobertura es rala (55 specs / 125 módulos en backend). El estándar realista es: **todo módulo que toques debe tener su test verde**, y todo endpoint/función nuevo nace con al menos un test (camino feliz + un caso de error). No exijas "suite completa verde" como si la cobertura fuera total — no lo es.
- `nest build` (admin: `vite build`) **NO type-chequea** (transpila con webpack/esbuild). Por eso `npm run typecheck` es un gate aparte y necesario.

Si algo falla: NO reportes éxito. Lista cada fallo con su causa, corrige **solo** eso, y vuelve a correr el gate completo. Tope: **5 iteraciones**; si tras 5 sigue rojo, párate y muestra el estado con los fallos restantes (no quemes ciclos en círculos). El loop disparable a propósito está en el skill `/verify-dod`.

### Deuda de tipos baseline (conocida, rastreada — NO la "arregles" de pasada)

`npm run typecheck` ignora errores preexistentes en estas zonas para que el gate sea usable hoy. **Son deuda real que se arregla como tarea propia y con tests**, no ruido:

- Backend `food-inventory-saas/src/modules/billing/` (3 archivos, ~39 errores): drift tipo↔runtime en el módulo fiscal HKA (`withholding.service.ts`, `hka-document.mapper.ts`, `hka-factory.provider.ts`). La clase base `BaseImprentaProvider` quedó desfasada de los providers concretos.
- Admin `food-inventory-admin/src/components/StorefrontSettings/` (11 archivos, ~33 errores): tipos de tema sin `bannerUrl`/`videoUrl` + typing de `framer-motion` v11 (`Variants`/`Transition`).

La lista vive en `scripts/typecheck.cjs` de cada proyecto. Cuando arregles una zona, **borra su entrada de `DEBT`**: a partir de ahí el gate empieza a protegerla.

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
npm run build             # nest build (NO type-chequea)
npm run typecheck         # tsc --noEmit con baseline de deuda — gate del DoD
npm run lint:changed      # eslint (sin --fix) solo de archivos tocados — gate del DoD
npm run lint:check        # eslint repo-wide sin --fix — manual (rojo por deuda legacy, NO gate)
npm test                  # jest
npm run test:e2e          # jest E2E
npm run test:security     # 73 tests de seguridad
```

### Admin
```bash
cd food-inventory-admin
npm run dev               # vite en 5173
npm run build             # build prod (NO type-chequea)
npm run typecheck         # tsc --noEmit con baseline de deuda — gate del DoD
npm run lint:changed      # eslint solo de archivos tocados — gate del DoD
npm run lint              # eslint repo-wide — manual (rojo por deuda legacy, NO gate)
npm test                  # vitest
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
| `module-simplify` | `/module-simplify <moduleName>` | **Obligatorio antes de /ux-redesign.** Audita estructura, clasifica cada elemento en 3 capas (Esencial/Avanzado/Enterprise), produce plan de acción concreto |
| `ux-audit` | `/ux-audit <screenPath>` | Análisis UX/A11y de un componente |
| `ux-redesign` | `/ux-redesign <screen>` | Genera `PROMPT-*-REDESIGN.md` blueprint. Solo usar después de /module-simplify |
| `beta-test` | `/beta-test <feature\|flow>` | Invoca agente `beta-tester` (API-only) |
| `verify-dod` | `/verify-dod [saas\|admin\|all]` | Loop de autoverificación contra el Definition of Done: typecheck + lint + tests de módulos tocados, corrige y reitera (tope 5). Acotado al diff |

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
