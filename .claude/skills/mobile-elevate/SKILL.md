---
name: mobile-elevate
description: Genera un blueprint PROMPT-MOBILE-<Screen>-ELEVATE.md que diagnostica una pantalla móvil contra las 8 dimensiones del hero del dashboard (TodayDashboard.jsx) y propone transformaciones concretas. NO toca código — produce el blueprint que TÚ refinas e iteras antes de implementar. Más rápido y consistente que /ux-redesign cuando el objetivo es "hablar el lenguaje del hero".
trigger: /mobile-elevate <componentPath>
---

# mobile-elevate

## Cuándo invocar

- Quieres elevar una pantalla móvil específica al lenguaje de diseño premium del hero del dashboard.
- Después de `/mobile-elevate-audit`: tienes un backlog y vas a la pantalla #1.
- Como alternativa más enfocada que `/ux-redesign` cuando ya sabes el objetivo (replicar el hero) y no quieres redescubrir principios desde cero.

## Diferencia con `/ux-redesign`

- `/ux-redesign` genera principios desde cero por pantalla (más libre, más lento).
- `/mobile-elevate` **porta un patrón ya validado** (el hero) — más rápido, más consistente, menos creativo.
- Si quieres una pantalla con un lenguaje DIFERENTE al hero, usa `/ux-redesign`.
- Si quieres "que esto hable como el hero", usa `mobile-elevate`.

## Inputs

- **`componentPath`** (requerido): ruta al componente a elevar. Acepta:
  - Componentes mobile-only bajo `food-inventory-admin/src/components/mobile/**`
  - Componentes responsive con render mobile identificable (regex `useMediaQuery|isMobile|md:hidden|hidden md:block`)
  - Componentes con `Mobile` en el nombre (ej: `OrderCardMobile.jsx`)
- (opcional) `--overwrite` — sobrescribe el blueprint si ya existe.

## Lo que hace

1. Verifica que `componentPath` cumple uno de los criterios de Inputs. Si NO tiene rama mobile identificable y NO está bajo mobile/, aborta con: "este componente no tiene rama mobile detectable — usa /ux-redesign si quieres rediseñarlo desde cero".
2. Lee el componente target completo. Si es responsive, audita SOLO la rama mobile (lo que se renderiza cuando `isMobile === true` o dentro de `md:hidden`). Si renderiza componentes hijos mobile-only (ej: `OrderCardMobile`), léelos también.
3. Lee la **referencia canónica**: `food-inventory-admin/src/components/mobile/home/TodayDashboard.jsx`.
4. Lee tokens de motion: `food-inventory-admin/src/lib/motion.js` (SPRING, DUR, EASE, STAGGER, listItem).
5. Lee tokens CSS: `food-inventory-admin/src/App.css` (`--gradient-primary`, `--glass-subtle`, `--glass-medium`, `--glow-*`).
6. Lee 1-2 archivos `food-inventory-admin/docs/PROMPT-*.md` recientes para captar tono y estructura.
7. Audita el target contra las 7 dimensiones (ver abajo).
8. Genera el blueprint en `food-inventory-admin/docs/PROMPT-MOBILE-<Screen>-ELEVATE.md`.

## Las 8 dimensiones (orden fijo)

| # | Dimensión | Heurística (qué buscar) | Lo que el hero hace |
|---|---|---|---|
| 1 | **Tokens de superficie** | `var(--gradient-primary)`, `var(--glass-subtle)`, `var(--glass-medium)` vs `bg-card border-border` plano | TodayDashboard:74-79, 300, 329-330 |
| 2 | **Tipografía ceremonial** | display 22-32px + `tabular-nums` + `tracking-tight` vs `font-semibold` plano | TodayDashboard:238-243, 271-277 |
| 3 | **Personalización** | `ownerName`, `greeting` por hora, fecha capitalizada vs título estático | TodayDashboard:212-214, 238-243 |
| 4 | **Motion choreography** | `STAGGER(0.05)` + `listItem` variants + `AnimatedNumber` vs zero entrance | TodayDashboard:229-234, 272-276 |
| 5 | **Color expresivo** | `emerald-500`/`amber-500` semantic + 4-color gradients vs `bg-primary/10` monocromo | TodayDashboard:280-283, 414-416 |
| 6 | **Haptics ubicuos** | `haptics.tap()` en cada acción tappable vs solo en confirmaciones críticas | TodayDashboard:45, 248-251, 317, 432 |
| 7 | **KPI celebration** | sparse + números grandes con tabular-nums + semantic colors vs densidad transaccional | TodayDashboard:287-305 |
| 8 | **Gramática estructural** | radii consistentes (`--mobile-radius-xl` para hero/cards), padding rhythm (`p-5` hero, `p-4` items), wrapper `space-y-5`, **un único peak hierárquico** (NO grid de pares iguales), section header pattern (`glass-medium` icon + label) | TodayDashboard:230 (space-y-5), 263-267 (hero p-5 + radius-xl + elevation-raised), 287-305 (3 stat boxes nested DENTRO del hero card), 328-330 (section header glass icon) |

**Importante sobre dimensión 8 (la más sutil y la más impactante)**:
- Si el target tiene un grid de N KPI cards iguales (ej. 4 cards lado a lado), está en sistema "v1 paridad". El hero usa **jerarquía**: UN peak (la KPI emocional principal con display 32px) + 2-3 stat boxes pequeños nested dentro de la misma superficie.
- La transformación correcta NO es elevar cada card por separado — es **reestructurar** el grid en `hero-card-with-nested-stats` siguiendo el patrón [TodayDashboard.jsx:260-306](../../food-inventory-admin/src/components/mobile/home/TodayDashboard.jsx#L260-L306).
- Si pasas por alto la dimensión 8, el resultado tendrá tokens premium pero **gramática diferente** — y se notará visualmente.

## Plantilla del blueprint generado

```markdown
# PROMPT MOBILE <Screen> — ELEVATE

> Generated by `/mobile-elevate` — punto de partida para refinar a mano antes de implementar.

## Contexto
<1 línea: qué pantalla es y por qué importa elevarla al lenguaje del hero>

## Referencia canónica
- Hero: `food-inventory-admin/src/components/mobile/home/TodayDashboard.jsx`
- Tokens: `food-inventory-admin/src/App.css` (`--gradient-primary`, `--glass-*`)
- Motion: `food-inventory-admin/src/lib/motion.js`

## Diagnóstico por dimensión

| # | Dimensión | Estado | Severidad | Evidencia (file:line) |
|---|---|---|---|---|
| 1 | Tokens de superficie | <ok / falta / parcial> | <crítico/alto/medio/ok> | `<path>:<line>` — `<snippet 1-3 líneas>` |
| 2 | Tipografía ceremonial | ... | ... | ... |
| ... | ... | ... | ... | ... |

## Transformaciones propuestas

(Solo dimensiones NO-ok. Si todas están ok, omite esta sección.)

### N. <Nombre de la dimensión>

**Antes** (`<file>:<line>`):
```jsx
<código actual real, no genérico>
```

**Después**:
```jsx
<código propuesto que usa identificadores, props, hooks y handlers que YA existen en el componente target>
```

**Principio aplicado**: <Berridge salience / peak-end / welcome-back / variable reward / sensory feedback>

---

(repite por cada dimensión NO-ok)

## Acceptance criteria

- [ ] La pantalla tiene al menos un elemento con `var(--gradient-primary)` o `var(--glass-*)` en el viewport inicial.
- [ ] Hay jerarquía tipográfica explícita (label pequeño 11px + display ≥ 22px) en la sección hero.
- [ ] Si la pantalla representa estado del negocio, usa `AnimatedNumber` o equivalente para los KPIs principales.
- [ ] La entrada usa `STAGGER` con al menos 3 hijos animados.
- [ ] Cada acción tappable principal dispara `haptics.tap()`.
- [ ] Status colors (emerald/amber/destructive) reflejan semántica, no solo decoración.
- [ ] (Si aplica) Hay copy contextual al usuario o al estado del día.

## Notas de implementación

- **Imports a añadir**: <lista, ej: `import { motion } from 'framer-motion'; import { listItem, STAGGER } from '@/lib/motion';`>
- **Hooks a añadir**: <lista, ej: `useTenant` para `ownerName`>
- **Riesgos**: <breaking change en props públicas, dependencias circulares, side effects en mount>
- **Out of scope**: <qué explícitamente NO se rediseña aquí>

## Related
- Audit: `/mobile-elevate-audit` (si existe el reporte)
- Reference hero: `food-inventory-admin/src/components/mobile/home/TodayDashboard.jsx`
```

## Outputs

- 1 archivo: `food-inventory-admin/docs/PROMPT-MOBILE-<Screen>-ELEVATE.md`.
- Mensaje en stdout con path + recordatorio: "este es un punto de partida. Refina manualmente antes de tocar código."

## Side effects

- Crea archivo en `food-inventory-admin/docs/`.
- NO modifica código en `src/`. Solo el blueprint.
- (Opcional) Log en `scripts/_skill-runs/mobile-elevate/<timestamp>.log`.

## Guardrails

- Refuse si `componentPath` no está bajo `food-inventory-admin/src/components/mobile/` Y no tiene rama mobile detectable (regex `useMediaQuery|isMobile|md:hidden|hidden md:block`) Y no contiene `Mobile` en el nombre del archivo.
- Refuse si el archivo destino ya existe (a menos que `--overwrite`).
- Los snippets "Después" deben usar **identificadores reales** del componente target (variables, props, hooks, handlers que ya existen). Si necesitas algo nuevo, declárelo en "Notas de implementación" — no lo asumas en el snippet.
- Si una dimensión ya está bien aplicada, márcala "ok" y NO propongas cambios. No fuerces redesign donde no hace falta.
- Headers en español. Identificadores y código JSX en su idioma original.
- Severidad calibrada:
  - **Crítico**: la pantalla es entry point (Home, POS landing, Dashboard) y le falta tokens premium o motion.
  - **Alto**: dimensión completamente ausente en una pantalla de uso frecuente.
  - **Medio**: dimensión parcialmente aplicada o aplicada inconsistentemente.
  - **Ok**: ya implementada al nivel del hero.

## Verificación

```bash
ls food-inventory-admin/docs/PROMPT-MOBILE-*-ELEVATE.md
# Abrir el archivo generado y verificar:
# - Diagnóstico por dimensión completo (7 filas)
# - Snippets "antes" tienen file:line reales
# - Snippets "después" usan APIs existentes del componente
# - Acceptance criteria son testables
```

## Roadmap

- v1: lectura + diagnóstico + blueprint con snippets antes/después.
- v2: integración con `/mobile-elevate-audit` (auto-detecta prioridad y peso del screen).
- v3: opción `--apply` que genera diff propuesto en lugar de blueprint (saltarse el paso de refinar manualmente para casos triviales).
