---
name: beta-test
description: Invoca al agente `beta-tester` (API-only, contra staging) para hacer QA exploratorio de un feature, flujo o módulo. Diseña 3-7 escenarios cubriendo happy path, edge cases, side effects cross-módulo, tenant isolation y regresión de incidentes históricos. Reporta hallazgos accionables.
trigger: /beta-test <feature|flow|module> [--last-commit] [--readonly]
---

# beta-test

## Cuándo invocar

- Acabas de mergear un feature o fix y quieres validación exploratoria antes de deployar a prod.
- Sospechas que un cambio en módulo X afecta módulo Y (cross-module side effects).
- Quieres validar que un incidente reciente no se reabre.
- Necesitas medición de latencia en un flujo crítico bajo carga típica.

## Inputs

- **`target`** (requerido): nombre del feature, flow o módulo (ej: `multi-unit-transfers`, `purchase-orders`, `supplier-search`).
- (opcional) `--last-commit` — usar último commit como contexto (default si no se especifica nada más).
- (opcional) `--readonly` — el agente solo hace GET requests (no crea ni modifica entidades). Útil para audit de endpoints existentes sin generar data.
- (opcional) `--scenarios <N>` — número aproximado de escenarios (default: 5).
- (opcional) `--tenant <slug>` — tenant a usar (default: `beta-test-tenant` de staging).

## Lo que hace

1. Lee contexto:
   - Si `--last-commit`: `git show HEAD` para entender qué cambió.
   - Sino: busca por target en código y commits recientes.
   - `docs/wiki/system-map.md` (sección del módulo asociado).
   - `docs/wiki/incidents/` (incidentes pasados del módulo, para no repetir bugs).
   - `docs/wiki/patterns/` (patterns aplicables).
2. Verifica precondiciones:
   - Variables env: `BETA_TESTER_API_URL`, `BETA_TESTER_TENANT`, `BETA_TESTER_EMAIL`, `BETA_TESTER_PASSWORD`.
   - URL apunta a staging (NO prod). Si no, **abortar**.
3. Invoca al agente `beta-tester` (definido en `.claude/agents/beta-tester.md`) con el contexto compilado.
4. El agente diseña escenarios, ejecuta, reporta.
5. Recibe el reporte, lo guarda en `scripts/_skill-runs/beta-tester/<target>-<timestamp>.md`, lo presenta al usuario.

## Outputs

- Reporte en `scripts/_skill-runs/beta-tester/<target>-<timestamp>.md`.
- Resumen en stdout con conteo de pass/fail/observaciones.
- Si hay hallazgos críticos: sugerencia para crear `docs/wiki/incidents/<fecha>-<slug>.md` (con `/incident-archive new`).

## Side effects

- Crea entidades en staging con prefijo `BETA-TEST-<timestamp>-`. El agente intenta cleanup al final.
- Modifica datos de staging (NUNCA producción).
- Log en `scripts/_skill-runs/beta-tester/`.

## Guardrails

- **Refuse** si `BETA_TESTER_API_URL` no está configurado o apunta a producción.
- **Refuse** si no existe el tenant de staging especificado.
- En `--readonly`: el agente solo hace GETs.

## Configuración requerida (env vars en `.env.beta-tester`, gitignored)

```
BETA_TESTER_API_URL=https://api-staging.smartkubik.com
BETA_TESTER_TENANT=beta-test-tenant
BETA_TESTER_EMAIL=beta-tester@smartkubik.com
BETA_TESTER_PASSWORD=<vault>
```

## Setup inicial (precondición one-time)

Si esta es la primera vez que se invoca `/beta-test`:

1. **Tenant staging**: crear `beta-test-tenant` con datos seed predecibles (productos, customers, suppliers, warehouses).
2. **Usuario**: `beta-tester@smartkubik.com` con rol admin de ese tenant.
3. **Env vars**: rellenar `.env.beta-tester`.
4. **Cleanup script** (opcional pero recomendado): `scripts/beta-tester-reset.sh` que elimina entidades con prefijo `BETA-TEST-` y restaura seed.

Si falta cualquiera de estos, `/beta-test` aborta con instrucciones de setup.

## Verificación

```bash
# Tras una corrida exitosa
ls scripts/_skill-runs/beta-tester/ | tail -1
cat scripts/_skill-runs/beta-tester/<latest>.md | head -30
```

## Roadmap

- v1: API-only (modalidad actual).
- v2: añadir agente hermano `beta-tester-ui` con Playwright MCP para flujos visuales (forms complejos, SearchableSelect, redesigns).
- v3: integración con CI: `/beta-test` automático en PR a `main` que toca módulos críticos.
- v4: comparativo entre corridas — detectar regresiones de latencia o nuevos errores.
