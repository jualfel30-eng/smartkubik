---
name: mobile-elevate-audit
description: Escanea food-inventory-admin/src/components/mobile/** y produce un backlog priorizado de qué pantallas necesitan ser elevadas al lenguaje del hero del dashboard (TodayDashboard.jsx). Usa heurísticas grep — rápido, no análisis profundo. Output: tabla markdown en chat con score 0-7 por dimensión + Top 5 priorizado. NO toca código.
trigger: /mobile-elevate-audit
---

# mobile-elevate-audit

## Cuándo invocar

- Antes de empezar una ronda de redesigns móviles, para saber por dónde atacar primero.
- Cada cierto tiempo (mensual/trimestral) para medir progreso de adopción del lenguaje premium.
- Tras añadir nuevas pantallas móviles, para verificar si están alineadas con el hero o quedaron en el sistema "v1".

## Inputs

- (sin argumentos) — siempre escanea `food-inventory-admin/src/components/mobile/**/*.jsx`.
- (opcional) `--save` — guarda el reporte en `food-inventory-admin/docs/audits/mobile-elevate-<YYYY-MM-DD>.md` además de imprimirlo en chat.

## Lo que hace

1. Lista todos los archivos `food-inventory-admin/src/components/mobile/**/*.jsx`.
2. Lee tokens de referencia:
   - `food-inventory-admin/src/components/mobile/home/TodayDashboard.jsx` (canon — siempre 7/7).
   - `food-inventory-admin/src/App.css` (nombres de tokens premium).
   - `food-inventory-admin/src/lib/motion.js` (nombres de tokens de motion).
3. Para cada archivo, aplica las **7 heurísticas grep** (abajo). Cada heurística: presente = +1, ausente = 0.
4. Calcula prioridad = (7 - score) × peso de pantalla.
5. Imprime tabla ordenada por prioridad descendente + Top 5 + observaciones.

## Heurísticas por dimensión

| # | Dimensión | Regex / patrón en el archivo |
|---|---|---|
| 1 | **Tokens superficie** | `var\(--gradient-primary\|var\(--glass-` |
| 2 | **Tipografía ceremonial** | `text-\[2[0-9]px\]\|text-\[3[0-9]px\]\|tabular-nums\|tracking-tight` |
| 3 | **Personalización** | `ownerName\|greeting\|Buenos d[íi]as\|Buenas tardes\|format\(.+EEEE` |
| 4 | **Motion choreography** | `STAGGER\(\|listItem\|AnimatedNumber` |
| 5 | **Color expresivo** | `emerald-[0-9]\|amber-[0-9]\|gradient:\s*\[` |
| 6 | **Haptics** | `haptics\.tap\(\|haptics\.select\(` (≥ 2 ocurrencias = ✓, 1 = parcial, 0 = ✗) |
| 7 | **KPI celebration** | `tabular-nums.+text-\[3\|<AnimatedNumber` |

Reglas:
- Marca ✓ si la regex matchea al menos 1 vez (excepto haptics: ≥ 2).
- Marca **parcial** solo en haptics si hay 1 ocurrencia.
- Marca ✗ si 0 matches.
- Score = #(✓). Las **parciales cuentan 0.5**.

## Pesos de pantalla

| Categoría | Peso | Identificación |
|---|---|---|
| Hero / entry | 3 | path contiene `/home/`, `/dashboard/`, o el archivo se llama `Mobile<Algo>Landing` |
| Listing / detalle frecuente | 2 | path contiene `/inventory/`, `/orders/`, `/clients/`, `/suppliers/`, `/products/` |
| Forms / sub-screens | 1 | resto |

Si no estás seguro, default = 1.

## Output (siempre en chat, opcionalmente en archivo)

```markdown
# Mobile Elevate Audit — <YYYY-MM-DD>

Total pantallas escaneadas: <N>
Promedio score: <X.Y> / 7

## Backlog priorizado

| Pantalla | Score | Tokens | Tipo | Pers | Motion | Color | Haptics | KPIs | Peso | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|
| TodayDashboard | 7/7 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 3 | — (referencia) |
| MobilePOS | 1/7 | ✗ | ✗ | ✗ | ✗ | ✗ | parcial | ✗ | 3 | 18 |
| MobileClientsList | 0/7 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 2 | 14 |
| ... | | | | | | | | | | |

(ordenada por prioridad descendente; TodayDashboard siempre 7/7 sin prioridad)

## Top 5 a elevar

1. **`<path>`** — score X/7, prioridad Y. Razón: <dimensión más débil>. Comando: `/mobile-elevate <path>`
2. **`<path>`** — score X/7, prioridad Y. Razón: <dimensión más débil>. Comando: `/mobile-elevate <path>`
3. ...

## Observaciones

- <patrón cruzado interesante: ej "ningún screen de inventory usa gradientes">
- <patrón cruzado: ej "los forms tienen 0/7 universalmente — sistema v1 sigue intacto ahí">
- <cualquier outlier: una pantalla inesperadamente alta o baja>

## Cómo proceder

- Para elevar la pantalla #1: `/mobile-elevate <path-de-la-pantalla>`
- El blueprint resultante queda en `food-inventory-admin/docs/PROMPT-MOBILE-<Screen>-ELEVATE.md`.
- Refina a mano y luego implementa.
```

## Side effects

- Solo lectura del código.
- Crea archivo solo si `--save`.
- (Opcional) Log en `scripts/_skill-runs/mobile-elevate-audit/<timestamp>.log`.

## Guardrails

- NO modifiques archivos del componente. Solo lectura + reporte.
- Omite cualquier archivo fuera de `food-inventory-admin/src/components/mobile/`.
- Omite archivos `*.test.jsx`, `*.spec.jsx`, `*.stories.jsx`.
- TodayDashboard siempre es 7/7 (es la referencia, no se puntúa contra sí mismo).
- Los símbolos ✓/✗/parcial deben coincidir con la heurística — **no opines, mide**. Si quieres una opinión cualitativa, usa `/mobile-elevate <path>` para una pantalla específica.
- Si un archivo tiene 0 ocurrencias en TODAS las dimensiones (score 0/7), márcalo en observaciones como "candidato a redesign completo, no solo elevate".

## Verificación

```bash
# El skill se invoca sin args y produce output en chat directamente.
# Si --save:
ls food-inventory-admin/docs/audits/mobile-elevate-*.md
```

## Roadmap

- v1: heurística grep + tabla + Top 5.
- v2: contar también ocurrencias por dimensión (no solo presencia) — captura mejor el "casi nada" vs "muy aplicado".
- v3: integración con git history — detectar pantallas que NUNCA han sido tocadas vs las activamente mantenidas (priorizar las activas).
- v4: comparar contra audit anterior (delta vs último reporte) para medir adopción del lenguaje premium en el tiempo.
