---
name: ux-audit
description: Análisis UX/A11y diagnóstico de un componente React. Lee el componente + tokens de App.css + system-map.md + extrae principios de los 25 PROMPT-*.md existentes para auditar con TU vara, no con una genérica. NO prescribe — solo identifica con severidad.
trigger: /ux-audit <componentPath|pageName>
---

# ux-audit

## Cuándo invocar

- Antes de redesignar una pantalla — quieres saber qué está mal antes de proponer fixes.
- Auditoría sistemática de un módulo (ej: "audita todas las pantallas de Compras").
- Code review de PR que toca UI — segunda opinión sistemática.
- Cuando un usuario reporta "no me gusta esta pantalla" pero no sabe por qué.

## Inputs

- **`componentPath`** (requerido): path absoluto o relativo al componente (ej: `food-inventory-admin/src/components/ComprasManagement.jsx`) o nombre de página (ej: `Login`, `Dashboard`).
- (opcional) `--screenshot <path>` — PNG/JPG de la pantalla en estado actual (mejora análisis visual).
- (opcional) `--platform desktop|mobile|both` — default `both`.
- (opcional) `--save` — guardar reporte en `food-inventory-admin/docs/audits/<screen>-<date>.md`.

## Lo que hace

1. Lee el componente y dependencias inmediatas (componentes hijos referenciados, hooks usados).
2. Lee `food-inventory-admin/src/App.css` y `motion.js` para tokens disponibles (colores, espaciados, durations).
3. Lee `docs/wiki/system-map.md` sección del módulo backend asociado para entender contratos de datos.
4. Lee 3-5 `food-inventory-admin/docs/PROMPT-*.md` similares (mismo verbo o contexto) para extraer **TUS principios** (Berridge salience, peak-end rule, welcome-back, variable ratio, role: senior product designer Notion/Linear/Stripe/Spotify).
5. Aplica el filtro:

### Categorías de análisis

| Categoría | Qué busca |
|---|---|
| **Design tokens** | Colores hardcoded en lugar de tokens, espaciados arbitrarios (no múltiplos de 4/8), tipografías fuera de escala |
| **Accesibilidad** | Contraste insuficiente, focus rings ausentes, ARIA labels faltantes, semantic HTML incorrecto, navegación por teclado rota |
| **Estados** | Loading sin skeleton, error states ausentes, empty states genéricos, success feedback inexistente |
| **Jerarquía** | Importancia visual no coincide con importancia funcional, CTAs no destacados, demasiados niveles de énfasis |
| **Cognitive load** | Demasiada información simultánea, falta de progressive disclosure, formularios largos sin chunking |
| **Consistencia** | Mismo concepto representado distinto vs flujos hermanos, micro-copy inconsistente, animations distintas |
| **Tus principios (PROMPT-*.md)** | Welcome-back recognition, peak-end rule en flows largos, salience en CTAs primarios, variable ratio en feedback positivo |
| **Performance percibido** | Layout shift, animations bloqueando interacción, no skeleton, FOUC |
| **Mobile-specific** (si aplica) | Touch targets < 44px, gestures no descubiertos, density excesiva en móvil |

6. Genera reporte estructurado con severidad.

## Outputs

```markdown
# UX Audit — ComprasManagement.jsx
**Fecha**: 2026-05-02 | **Plataforma**: desktop + mobile | **Auditor**: ux-audit v1

## Resumen
- 14 hallazgos: 3 críticos, 6 importantes, 5 menores
- Score estimado vs vara PROMPT-*.md: 6.2/10

## Críticos (bloquean UX correcta)

### 1. SearchableSelect para RIF disipa valor en blur
- **Línea**: 234
- **Pattern violado**: `searchable-pagination.md` anti-pattern
- **Impacto**: usuario tipea RIF, hace Tab → se borra. Frustration alta.
- **Sugerencia (no prescriptiva)**: usar `Input` plano + dropdown personalizado (ya documentado en convenciones).

### 2. ...

## Importantes

### 4. Tabla de proveedores sin paginación visible
...

## Menores

### 10. Espaciado entre acciones del header inconsistente (12px vs 16px)
...

## Aplicación de principios PROMPT-*.md

- ✗ **Welcome-back recognition**: no hay mensaje contextual cuando usuario regresa con compras pendientes.
- ✗ **Peak-end rule**: el flujo termina en una alerta seca, sin celebration.
- ✓ **Salience**: CTA "Crear OC" usa color primario correctamente.

## Contexto adicional

- Backend asociado: `purchase-orders.controller.ts`. Ver `docs/wiki/modules/purchase-orders.md`.
- Incidentes históricos relacionados: `2026-04-01-supplier-search-pagination.md`, `2026-04-06-multi-unit-transfer-orders.md`.

## Próximos pasos

- Si decides redesignar: `/ux-redesign ComprasManagement --audit-from <este-reporte>`.
```

Si `--save`: archivo en `food-inventory-admin/docs/audits/<screen>-<YYYY-MM-DD>.md`.

## Side effects

- Solo lectura del código.
- Crea archivo de reporte solo si `--save`.
- Log en `scripts/_skill-runs/ux-audit/<timestamp>.log`.

## Calibración (importante)

El skill **debe** leer al menos 3 `PROMPT-*.md` recientes para calibrar la vara antes de auditar. Sin esa calibración, los hallazgos serán genéricos. Sugerencia para la implementación: cachear las "rules extraídas" en `.claude/skills/ux-audit/rules-cache.json` y refrescar cuando cambien los PROMPT-*.md.

## Roadmap

- v1: análisis estático + reglas extraídas.
- v2: integrar screenshot analysis (visión multimodal del modelo) cuando se provee `--screenshot`.
- v3: comparar contra captures históricos para detectar regresiones visuales.
