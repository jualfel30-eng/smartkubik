---
name: incident-archive
description: Migra historiales de bug-fixes desde el MEMORY.md auto-memory hacia docs/wiki/incidents/, generando un archivo por incidente con la plantilla estándar y linkeando al pattern correspondiente. También útil para registrar nuevos incidentes detectados durante una sesión.
trigger: /incident-archive [slug|all|new]
---

# incident-archive

## Cuándo invocar

- **`/incident-archive new`** — acabas de resolver un bug crítico y quieres documentarlo en `docs/wiki/incidents/` siguiendo la plantilla.
- **`/incident-archive <slug>`** — migrar un bloque de bug-fix concreto del MEMORY.md a wiki.
- **`/incident-archive all`** — barrido completo del MEMORY.md, archivar todo lo migrable.

## Inputs

- (opcional) `slug` — identificador del fix (ej: `transfer-orders-dispatch`).
- (opcional) `--date YYYY-MM-DD` — para `new` cuando el fix es de fecha distinta a hoy.
- (opcional) `--severity critical|alta|media|baja` — para `new`.

## Lo que hace

### Modo `all` o `<slug>`

1. Lee `~/.claude/projects/-Users-jualfelsantamaria/memory/MEMORY.md`.
2. Para cada bloque "Fix" identificado:
   a. Extrae fecha, título, síntoma, root cause, archivos tocados.
   b. Genera `docs/wiki/incidents/<YYYY-MM-DD>-<slug>.md` siguiendo plantilla en `incidents/README.md`.
   c. Identifica el pattern asociado (ObjectId-vs-string, race conditions, etc.) y linkea.
   d. Actualiza `incidents/README.md` con entrada en el índice.
   e. Elimina el bloque del MEMORY.md.
3. Verifica que MEMORY.md no excede 60 líneas tras la migración.

### Modo `new`

1. Pregunta al usuario (o infiere del contexto reciente):
   - Título del incidente
   - Síntoma observado
   - Root cause identificado
   - Archivos modificados (file:line si es posible)
   - Commit SHA si ya está committed
   - Pattern asociado (sugiere de la lista en `docs/wiki/patterns/`)
2. Crea el archivo `incidents/<YYYY-MM-DD>-<slug>.md`.
3. Actualiza `incidents/README.md`.

## Outputs

- N archivos `.md` creados/actualizados en `docs/wiki/incidents/`.
- `incidents/README.md` con entradas nuevas en el índice por fecha.
- Si modo `all`/`<slug>`: MEMORY.md trimmed (bloques eliminados).
- Reporte final en stdout: lista de incidents creados + tamaño nuevo del MEMORY.md.

## Plantilla del archivo de incidente

```markdown
# YYYY-MM-DD — <título>

**Severidad**: <crítica|alta|media|baja>
**Módulos afectados**: <lista>
**Tiempo a resolución**: <horas|días>

## Síntoma
<lo que veía el usuario>

## Root cause
<causa real>

## Archivos tocados
- `path/file.ts:LINE` — <qué cambió>

## Commit / PR
- <sha o link>

## Prevención
- Pattern: [<nombre>](../patterns/<slug>.md)
- Skill: [<nombre>](../../../.claude/skills/<slug>/SKILL.md)
- Test que evita regresión: <path>

## Notas
<contexto adicional>
```

## Side effects

- Crea archivos en `docs/wiki/incidents/`.
- Modifica `~/.claude/projects/-Users-jualfelsantamaria/memory/MEMORY.md` (modo `all`/`<slug>` solamente).
- NO commitea automáticamente. El usuario decide cuándo y cómo committear el cambio.

## Verificación

```bash
ls docs/wiki/incidents/*.md | wc -l   # debe coincidir con índice de README.md
wc -l ~/.claude/projects/-Users-jualfelsantamaria/memory/MEMORY.md  # < 60
```
