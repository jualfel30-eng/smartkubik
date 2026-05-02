---
name: wiki-sync
description: Hook PostToolUse que tras commits que tocan food-inventory-saas/src/modules/** identifica el módulo, lee system-map.md y propone diff para mantener sincronizado el wiki. Extiende el wiki-change-detector.sh actual (que solo detecta) para que además sugiera el cambio.
trigger: hook PostToolUse Bash (git commit)
---

# wiki-sync

## Cuándo se invoca

Hook automático del harness, NO manualmente. Se dispara tras:

- `git commit` exitoso que modifica archivos en `food-inventory-saas/src/modules/**`.

## Qué hace

1. Identifica el módulo afectado a partir del diff del commit (`git show --stat HEAD`).
2. Para cada módulo afectado:
   a. Lee `food-inventory-saas/src/modules/<X>/<X>.controller.ts` y `<X>.service.ts`.
   b. Extrae endpoints (decoradores `@Get/@Post/@Put/@Delete/@Patch`), DTOs referenciados, métodos públicos del service.
   c. Lee `docs/wiki/system-map.md` y `docs/wiki/modules/<X>.md` (si existe).
   d. Detecta divergencias:
      - Endpoint nuevo no documentado.
      - DTO modificado (campos añadidos/eliminados).
      - Método de service público nuevo.
      - Schema modificado (campos nuevos, defaults cambiados, índices nuevos).
   e. Genera diff propuesto a los archivos del wiki.
3. Presenta al usuario el diff con opción "aplicar / editar / descartar".

## Outputs

Reporte estructurado:

```
📚 wiki-sync — cambios detectados en módulo `transfer-orders`:

Endpoints nuevos:
  + POST /api/v1/transfer-orders/:id/dispatch  (line 169)

Métodos service nuevos (públicos):
  + dispatch(id: string, tenantId: ObjectId, userId: ObjectId)

DTOs modificados:
  ~ TransferOrderItemDto: campos añadidos { selectedUnit, conversionFactor, unitOfMeasure }

Wiki diff propuesto (docs/wiki/modules/transfer-orders.md):
  + ## Dispatch
  + `POST /:id/dispatch` — despacha la orden, descuenta del almacén origen,
  +   crea movimientos de inventory. Requiere status `approved`.

Wiki diff propuesto (docs/wiki/system-map.md):
  ~ Sección 1.5 Transfers: añadir endpoint `/dispatch` y campos multi-unit en items.

Aplicar diffs? [s/n/editar]
```

## Side effects

- Lee archivos del wiki y del backend.
- Solo modifica el wiki si el usuario confirma.
- NO commitea automáticamente. Deja el cambio en working tree para que el usuario haga commit manual.
- Log en `scripts/_skill-runs/wiki-sync/<timestamp>.log`.

## Configuración (en `.claude/settings.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(git commit *)",
            "command": "node .claude/skills/wiki-sync/sync.js",
            "timeout": 30,
            "statusMessage": "Sincronizando wiki con cambios del commit..."
          }
        ]
      }
    ]
  }
}
```

## Relación con `wiki-change-detector.sh`

El script existente (`scripts/wiki-change-detector.sh`) **solo detecta** que hubo cambios en módulos y avisa al usuario. Esta skill **extiende** ese comportamiento: además de detectar, propone el diff específico.

Migración:

- Mantener el script bash como fallback (no romper hook actual).
- Esta skill llama internamente al script bash para detección, luego añade la capa de propuesta de diff.
- Cuando esta skill esté estable: deprecar el bash script.

## Implementación sugerida (`sync.js`)

Stub: usa `git show --stat HEAD` para detectar archivos modificados, parsea con regex simple los decoradores de endpoints y firmas de métodos públicos, lee wiki, hace diff textual, presenta al usuario.

Para v2: usar `ts-morph` para AST análisis preciso de cambios en signatures/DTOs.

## Verificación

Tras un commit que toca `transfer-orders.controller.ts`:

```bash
git log -1 --stat   # ver archivos modificados
ls scripts/_skill-runs/wiki-sync/ | tail -1   # último log
git status docs/wiki/   # debe mostrar diff propuesto si hubo divergencia
```
