---
name: module-simplify
description: Auditoría estructural de un módulo para eliminar ruido, reducir complejidad real y clasificar cada elemento en 3 capas (Esencial / Avanzado / Enterprise). Produce un plan de acción concreto — qué se elimina, qué se mueve, qué se simplifica — antes de tocar una línea de código. Obligatorio antes de /ux-redesign en cualquier módulo que no haya pasado por este proceso.
trigger: /module-simplify <moduleName> [--screenshot <path>]
---

# module-simplify

## Por qué existe este skill

El error que este skill previene: aplicar mejoras visuales y estructurales sobre un módulo que tiene demasiado — tabs sobrantes, funciones que nadie usa, redundancias, flujos innecesariamente complejos. El resultado de ese error es ruido cosmético encima de complejidad real. Este skill resuelve la estructura primero. Solo después tiene sentido /ux-redesign.

## Cuándo invocar

- Antes de redesignar cualquier módulo (obligatorio).
- Cuando un módulo se siente "abrumador" o "confuso" pero no sabes exactamente qué sobra.
- Cuando usuarios tech-resistant no logran completar tareas básicas.
- Cuando hay funciones que nadie usa y no sabes si eliminarlas o dónde ponerlas.

## Inputs

- **`moduleName`** (requerido): nombre del módulo (ej: `HR`, `Compras`, `Nóminas`, `Inventario`).
- (opcional) `--screenshot <path>` — captura de pantalla del estado actual para análisis visual.

## Las tres capas (columna vertebral del proceso)

Cada elemento del módulo vive exactamente en una de estas capas:

| Capa | Quién la usa | Visibilidad |
|---|---|---|
| **Esencial** | Cualquier usuario, cualquier tamaño de negocio, en el día a día | Siempre visible. Mobile-first. Cero fricción. |
| **Avanzado** | Pymes en crecimiento, usuarios con más experiencia | Accesible pero fuera del camino principal. Botón "⚙️ Avanzado" o sección colapsada. |
| **Enterprise** | Negocios grandes, configuración de sistema, integraciones | Detrás de permisos o configuración. Invisible para quien no lo necesita. |

La pregunta clave para clasificar cada elemento:
> *"¿Un dueño de negocio con 5 empleados, usando esto desde su teléfono un lunes por la mañana, necesita ver esto para hacer su trabajo?"*
- Sí, siempre → **Esencial**
- No hoy, pero sí cuando crezca → **Avanzado**
- Solo si tiene un equipo de administración/contabilidad → **Enterprise**
- Nunca, o duplica algo que ya existe → **Eliminar**

## Lo que hace el skill (proceso en orden estricto)

### Paso 1 — Entender el trabajo real del módulo

Antes de leer código, definir en UNA oración el trabajo real del módulo desde la perspectiva del usuario:

> *"Este módulo existe para que [tipo de usuario] pueda [acción concreta] sin necesitar [conocimiento técnico / ayuda externa]."*

Si no se puede escribir esa oración con claridad, el módulo tiene un problema de propósito, no solo de diseño. Documentarlo explícitamente.

### Paso 2 — Inventario completo

Leer y listar TODO lo que existe actualmente en el módulo:
- Rutas/páginas
- Tabs principales y anidados
- Formularios y campos
- Acciones (botones, CTAs)
- Modales, drawers, sheets
- Tablas y listas
- Widgets, cards, KPIs
- Configuraciones visibles al usuario

Ningún elemento se omite. Si existe en la UI, aparece en el inventario.

### Paso 3 — Clasificación por capa (la decisión más importante)

Para cada elemento del inventario, asignar:

| Decisión | Significado |
|---|---|
| **ESENCIAL** | Se queda en el flujo principal, visible siempre |
| **AVANZADO** | Se mueve fuera del flujo principal, accesible bajo demanda |
| **ENTERPRISE** | Se mueve detrás de permisos/configuración |
| **FUSIONAR** | Se combina con otro elemento que hace lo mismo o algo similar |
| **ELIMINAR** | No aporta valor real a ningún usuario en ninguna etapa |

Criterio de honestidad: si la clasificación genera duda, siempre preguntar al usuario antes de decidir. Él conoce a sus usuarios reales.

### Paso 4 — Plan de acción concreto

Producir una tabla con decisión, elemento, y razonamiento. Sin ambigüedad.

### Paso 5 — Flujo esencial mobile-first

Diseñar en texto (ASCII wireframe) cómo quedaría el módulo con solo los elementos ESENCIALES. Representar:
- Pantalla principal (mobile, 375px)
- El flujo de la tarea más común (máximo 3 pasos)
- Punto de entrada a los elementos AVANZADOS

### Paso 6 — Validación honesta

Responder explícitamente:
1. ¿El resultado es más simple que antes? ¿En qué porcentaje estimado?
2. ¿Qué funcionalidad real se pierde? (honesto, no optimista)
3. ¿Alguna decisión de clasificación es riesgosa y por qué?
4. ¿Está listo para /ux-redesign? Sí / No + razón

## Output

```markdown
# Module Simplify — [Nombre del Módulo]
**Fecha**: YYYY-MM-DD | **Versión**: v1

## Trabajo real del módulo
[Una oración. Si no es posible escribirla, documentar por qué.]

## Inventario completo
[Lista numerada de TODOS los elementos existentes]

## Clasificación por capa

| # | Elemento | Decisión | Razonamiento |
|---|---|---|---|
| 1 | Tab "Estructuras" | ENTERPRISE | Solo relevante con múltiples estructuras salariales. Pymes con 1-5 empleados nunca la tocan. |
| 2 | Botón "Fichar" en nav principal | ESENCIAL → mover a FAB | Acción más frecuente. Debe ser 1 tap desde cualquier pantalla. |
| 3 | Tab "Auditoría" | ENTERPRISE | Irrelevante para operación diaria. Solo para compliance en empresas grandes. |
| 4 | KpiCard "Costo bruto" | AVANZADO | Útil para análisis pero no para operación diaria. |
| ... | ... | ... | ... |

## Elementos a eliminar
[Lista con razonamiento para cada uno]

## Plan de fusiones
[Qué elementos se combinan y cómo]

## Flujo esencial — Mobile (375px)

[ASCII wireframe de la pantalla principal y flujo más común]

Ejemplo:
┌─────────────────────────────────┐
│ Buenos días, Ana        [⏱ Hoy] │
│                                 │
│  [● Fichar entrada]             │
│                                 │
│  PENDIENTE                      │
│  ⚠ 2 ausencias sin revisar      │
│  [Revisar →]                    │
│                                 │
│  [Empleados] [Turnos] [Nómina]  │
└─────────────────────────────────┘

## Punto de entrada a funciones Avanzadas
[Cómo accede el usuario a la capa Avanzada sin que interrumpa el flujo Esencial]

## Validación

| Criterio | Antes | Después | Veredicto |
|---|---|---|---|
| Elementos visibles en flujo principal | X | Y | ✅ / ⚠ / ❌ |
| Pasos para completar tarea principal | X | Y | ✅ / ⚠ / ❌ |
| Funcionalidad eliminada (real) | — | [lista] | ✅ / ⚠ / ❌ |
| Decisiones con riesgo | — | [lista] | ✅ / ⚠ / ❌ |

**¿Listo para /ux-redesign?**: [Sí / No] — [razón en una oración]

## Archivos afectados (estimado)
[Lista de componentes/páginas que cambiarán en la implementación]
```

## Side effects

- Solo lectura y análisis. NO modifica código.
- Guarda el reporte en `food-inventory-admin/docs/simplify/<module>-<YYYY-MM-DD>.md`.
- Log en `scripts/_skill-runs/module-simplify/<timestamp>.log`.

## Guardrails

- Si el Paso 1 (trabajo real) no se puede articular claramente, PARAR y preguntar al usuario antes de continuar.
- Si más del 40% de los elementos quedan como ENTERPRISE, advertir: el módulo puede tener un problema de audiencia, no solo de diseño.
- Si un elemento genera duda entre ESENCIAL y AVANZADO, preguntar al usuario. No decidir solo.
- NO producir código ni tocar archivos. Este skill es de análisis y decisión, no de implementación.
- NO continuar a implementación sin confirmación explícita del usuario sobre el plan de acción.

## Relación con otros skills

```
/module-simplify   →   (usuario revisa y confirma)   →   implementación   →   /ux-redesign
     ↑                                                                              ↑
  PRIMERO                                                                        DESPUÉS
  (estructura)                                                                  (pulido visual)
```

/ux-redesign aplicado sin /module-simplify previo = pulir una superficie sobre una base caótica.
/module-simplify no reemplaza /ux-redesign — los dos son necesarios, en ese orden.

## Roadmap

- v1: análisis manual + output estructurado.
- v2: cruzar con analytics de uso real si están disponibles (endpoints más llamados por tenant).
- v3: generar automáticamente los tickets de implementación por capa con estimados de esfuerzo.
