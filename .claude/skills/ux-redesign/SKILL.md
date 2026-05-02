---
name: ux-redesign
description: Genera un PROMPT-*-REDESIGN.md blueprint en food-inventory-admin/docs/ siguiendo el patrón consistente de los 25 archivos existentes. Opcionalmente consume un reporte de /ux-audit como punto de partida. NO redesigna por sí solo — produce el blueprint que TÚ refinas e iteras.
trigger: /ux-redesign <screen> [--platform desktop|mobile] [--audit-from <path>]
---

# ux-redesign

## Cuándo invocar

- Tras decidir redesignar una pantalla (típicamente después de `/ux-audit`).
- Para arrancar un nuevo blueprint de pantalla que aún no existe.
- Para clonar el patrón de un PROMPT existente con un screen objetivo distinto.

## Inputs

- **`screen`** (requerido): nombre del screen (ej: `Login`, `Dashboard`, `ComprasManagement`).
- (opcional) `--platform desktop|mobile|both` — default `desktop`. Genera nombre de archivo correcto (`PROMPT-DESKTOP-LOGIN-REDESIGN.md` o `PROMPT-MOBILE-LOGIN-REDESIGN.md`).
- (opcional) `--audit-from <path>` — path a reporte de `/ux-audit`. Si se provee, los hallazgos del audit alimentan la sección "Current state analysis".
- (opcional) `--module-backend <name>` — módulo backend asociado (default: inferido del screen).
- (opcional) `--reference <slug>` — PROMPT existente a usar como referencia de tono y estructura (ej: `DESKTOP-LOGIN-REDESIGN`). Default: el más reciente con plataforma similar.

## Lo que hace

1. Verifica que `food-inventory-admin/docs/PROMPT-<PLATFORM>-<SCREEN>-REDESIGN.md` no existe ya.
2. Lee 2-3 PROMPT-*.md de referencia para extraer:
   - Voz y tono (1ra persona como product designer senior).
   - Estructura típica de secciones.
   - Principios aplicados (Berridge, peak-end, welcome-back, variable ratio).
   - Densidad de detalle.
3. Lee el componente actual (`food-inventory-admin/src/...`) si existe, para "Current state analysis".
4. Si `--audit-from`: incorpora los hallazgos del audit como base de "Issues identified".
5. Lee `docs/wiki/system-map.md` sección del módulo backend para entender contratos de datos relevantes.
6. Genera el archivo siguiendo la plantilla.

## Plantilla del archivo generado

```markdown
# PROMPT — <PLATFORM> — <SCREEN> — Redesign

## Role
You are a senior product designer with 25 years building high-conversion interfaces for Notion, Linear, Stripe, and Spotify. You apply behavioral psychology (Berridge salience theory, peak-end rule, welcome-back effect, variable ratio reinforcement) without ever making it feel manipulative.

## Context
<descripción del contexto: qué es esta pantalla, dónde encaja en el flujo, quién la usa, cuándo>

## Audience
- **Primary**: <tipo de usuario, contexto en el que llegan>
- **Secondary**: <usuarios edge case>

## Jobs to be done
1. <job principal>
2. <job secundario>
3. <job emergente>

## Current state analysis
(Si --audit-from, incorpora hallazgos del audit aquí)

### What works
- <fortalezas reales>

### What's broken (14 issues identified)
1. **<problema>** — <descripción + impacto>
2. ...

## Design layers

### Layer 1: STRUCTURE (40% del impacto)
<arquitectura informacional, jerarquía, layout breakpoints>

### Layer 2: INTERACTION
<motion, micro-animations, transiciones, feedback>

### Layer 3: CELEBRATION
<peak-end, success feedback, dopamina>

## Layout (breakpoints)
- **Desktop ≥ 1024px**: <descripción + sketch ASCII si ayuda>
- **Tablet 768-1023px**: <ajustes>
- **Mobile < 768px**: <ajustes específicos>

## Design tokens (from App.css)
- Colors: <lista de tokens a usar>
- Spacing: <escala>
- Typography: <escala + weights>
- Motion: <durations + easings>

## Components reused
- <ComponentName> (path) — qué responsabilidad cumple aquí
- ...

## Micro-interactions
1. <interacción + motion + duration + easing>
2. ...

## Acceptance criteria
- [ ] <criterio testable>
- [ ] ...

## Out of scope
- <qué explícitamente no resuelve este redesign>

## Related
- Backend module: docs/wiki/modules/<X>.md
- Audit: <path si --audit-from>
- Reference PROMPT: <slug>
```

## Outputs

- 1 archivo en `food-inventory-admin/docs/PROMPT-<PLATFORM>-<SCREEN>-REDESIGN.md`.
- Mensaje en stdout con path + recordatorio: "este es un punto de partida. Itera el archivo manualmente para añadir tu juicio."

## Side effects

- Crea archivo en `food-inventory-admin/docs/`.
- NO modifica el código del componente. El blueprint es para diseño/discusión, no implementación.
- Log en `scripts/_skill-runs/ux-redesign/<timestamp>.log`.

## Guardrails

- Refuse si el archivo destino ya existe (a menos que `--overwrite` con confirmación).
- Refuse si no encuentra al menos 1 PROMPT-*.md de referencia en `food-inventory-admin/docs/`.
- El archivo generado SIEMPRE incluye el disclaimer al final: "Generated as starting point — refine manually before implementation."

## Verificación

```bash
ls food-inventory-admin/docs/PROMPT-*-<SCREEN>-REDESIGN.md
# Abrir el archivo y verificar que las secciones están completas, no como placeholders genéricos.
```

## Roadmap

- v1: generación textual basada en lectura de PROMPTs referencia.
- v2: integrar audit automático si `--audit-from` no se provee (autoinvoca `/ux-audit`).
- v3: variantes A/B (genera dos blueprints con enfoques distintos para comparar).
