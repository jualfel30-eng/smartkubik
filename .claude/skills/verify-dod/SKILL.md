---
name: verify-dod
description: Loop de autoverificación contra el Definition of Done del repo. Detecta qué proyectos toca el diff actual, corre el gate (typecheck + lint sin --fix + tests de los módulos tocados), y si algo falla lista la causa, corrige solo eso y vuelve a correr. Tope 5 iteraciones. Acotado al diff, NO corre la suite completa de 125 módulos. Úsalo antes de dar por terminada cualquier tarea de código.
trigger: /verify-dod [saas|admin|all]
---

# verify-dod

El cuarto paso "con dientes" del loop autoverificable, mapeado a los oráculos duros de SmartKubik. La fuente de verdad del estándar es la sección **"Definition of Done"** del `CLAUDE.md` raíz; este skill la ejecuta.

## Cuándo invocar

- Antes de declarar terminada **cualquier** tarea de código (feature, fix, refactor).
- Después de aplicar cambios que tocan `food-inventory-saas/` y/o `food-inventory-admin/`.
- NO para auditar el repo entero — para eso es un escaneo módulo por módulo, no este loop.

## Inputs

- (opcional) `saas` | `admin` | `all` — fuerza el alcance. Si se omite, se infiere del diff (`git status --porcelain`): si hay cambios bajo `food-inventory-saas/` corre el gate del backend; bajo `food-inventory-admin/` el de admin; ambos si ambos.

## El gate por proyecto

| Proyecto | Typecheck | Lint (no muta, solo cambios) | Tests |
|---|---|---|---|
| `food-inventory-saas` | `npm run typecheck` | `npm run lint:changed` | `npm test -- <specs de módulos tocados>` |
| `food-inventory-admin` | `npm run typecheck` | `npm run lint:changed` | `npm test -- <tests de archivos tocados>` |

- **Tests acotados al diff**: deriva los `*.spec.ts` / `*.test.*` de los módulos/carpetas que cambiaron y pásalos a jest/vitest por path. NO corras la suite completa salvo que el cambio sea transversal (auth, guards, interceptors, schemas compartidos). Justifica si la corres completa.
- Si un módulo tocado **no tiene test**, dilo explícito y escribe al menos uno (camino feliz + un caso de error) — eso es parte del DoD, no opcional.
- `typecheck` ya trae baseline de deuda conocida (billing / StorefrontSettings). Si tu cambio toca una de esas zonas y baja su deuda, **borra la entrada correspondiente de `scripts/typecheck.cjs`** para que el gate empiece a protegerla.

## El loop (procedimiento)

1. Infiere el alcance (o usa el argumento). Reporta qué proyectos vas a verificar.
2. Corre el gate completo del/los proyecto(s): typecheck → lint(check) → tests acotados.
3. **Si todo pasa**: reporta verde, resume qué se verificó (comandos exactos + specs corridos) y termina.
4. **Si algo falla**: lista cada fallo con su causa raíz (archivo:línea). Corrige **solo** lo que falló — no refactorices de paso, no toques módulos vecinos.
5. Vuelve al paso 2. No preguntes entre iteraciones.
6. **Tope: 5 iteraciones.** Si tras 5 sigue rojo, párate y muestra el estado actual con los fallos restantes y tu hipótesis de por qué no converge. No quemes más ciclos.

## Restricciones (no negociables)

- **Nunca** corras comandos destructivos dentro del loop: nada de `git push`, `npm run db:*`, `seed:*`, `clear-tenant`, `rm -rf`. El `settings.json` ya deniega los peores; aun así no los invoques.
- **Nunca** uses `npm run lint` del backend dentro del loop (tiene `--fix` y muta archivos en silencio). Usa `lint:changed`. El lint del gate es solo-archivos-cambiados: el repo tiene deuda de lint legacy masiva, así que lintear todo el repo NO es el estándar.
- **Nunca** uses `--no-verify` ni saltes hooks para "pasar" el gate.
- Si el gate sigue rojo por **deuda baseline preexistente** (no tu cambio), NO la arregles de pasada: anótala y sigue. Solo bloquea lo que TÚ introdujiste.

## Reporte final

- ✅/❌ por proyecto, con los comandos exactos corridos y su resultado.
- Specs/tests ejercidos (paths).
- Si escribiste tests nuevos: cuáles y qué cubren.
- Deuda baseline tocada (si aplica) y si removiste su entrada de `DEBT`.
- Nº de iteraciones usadas.
